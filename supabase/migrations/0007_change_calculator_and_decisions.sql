-- AgreedLink migration 0007 (part 2 of 2): change request calculator and honest approval identity. Created by JNectar.
-- Run after 0006. It replaces propose_change, customer_decide_agreement, customer_decide_change and customer_get with
-- versions that add the server-side calculator, duplicate protection and identity recording. Existing data is untouched.

-- ============================================================ propose_change with the server-side calculator
drop function if exists public.propose_change(uuid, text, text, text, jsonb);
create or replace function public.propose_change(
  p_agreement uuid, p_description text, p_reason text, p_notes text, p_proposed jsonb,
  p_delta bigint, p_base_version integer, p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.agreements%rowtype;
  open_cr public.change_requests%rowtype;
  new_id uuid;
  new_amount bigint;
  proposed jsonb;
begin
  select * into a from public.agreements where id = p_agreement and owner_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;

  -- The same form submitted twice returns the first proposal instead of creating another.
  if p_idempotency_key is not null then
    select id into new_id from public.change_requests where agreement_id = a.id and idempotency_key = p_idempotency_key;
    if new_id is not null then return new_id; end if;
  end if;

  if a.status::text <> 'approved' then raise exception 'invalid_state'; end if;
  if p_base_version is distinct from a.current_version then raise exception 'version_mismatch'; end if;
  if p_proposed ->> 'currency' <> a.currency then raise exception 'currency_mismatch'; end if;

  -- The revised total is always calculated here from the current approved total, never trusted from the browser.
  new_amount := a.current_amount_minor + p_delta;
  if new_amount <= 0 then raise exception 'invalid_amount'; end if;
  proposed := jsonb_set(p_proposed, '{amount_minor}', to_jsonb(new_amount));

  select * into open_cr from public.change_requests
    where agreement_id = a.id and status in ('pending', 'clarification_requested') for update;
  if found then
    if open_cr.status = 'pending' then raise exception 'change_already_pending'; end if;
    update public.change_requests set status = 'superseded' where id = open_cr.id;
    perform public._event(a.id, open_cr.id, a.current_version, 'change_superseded', 'creator', null, 'recorded_by_app', 'Replaced by a revised proposal');
  end if;

  insert into public.change_requests
    (agreement_id, base_version, description, reason, notes_for_customer, proposed_terms, price_delta_minor, created_by, idempotency_key)
  values (a.id, a.current_version, p_description, p_reason, coalesce(p_notes, ''), proposed, p_delta, auth.uid(), p_idempotency_key)
  returning id into new_id;
  perform public._event(a.id, new_id, a.current_version, 'change_proposed', 'creator', null, 'recorded_by_app', p_description);
  return new_id;
end $$;

-- ============================================================ customer decisions record identity honestly
drop function if exists public.customer_decide_agreement(text, text, text, text, text, integer);
create or replace function public.customer_decide_agreement(
  p_token_hash text, p_decision text, p_name text, p_email text, p_message text, p_version integer,
  p_user_id uuid default null, p_verified_email text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  l public.share_links%rowtype;
  a public.agreements%rowtype;
  acct boolean := (p_user_id is not null and nullif(btrim(coalesce(p_verified_email, '')), '') is not null);
  matches boolean;
begin
  if p_decision not in ('approve', 'decline', 'clarify') then
    return jsonb_build_object('ok', false, 'error', 'invalid_decision');
  end if;
  if coalesce(btrim(p_name), '') = '' then return jsonb_build_object('ok', false, 'error', 'name_required'); end if;
  if p_decision = 'clarify' and coalesce(btrim(p_message), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'message_required');
  end if;

  select * into l from public.share_links where token_hash = p_token_hash and revoked_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_link'); end if;
  select * into a from public.agreements where id = l.agreement_id for update;

  if public._link_expired(l.expires_at) then
    if a.status = 'awaiting_approval' then
      update public.agreements set status = 'expired', updated_at = now() where id = a.id;
      perform public._event(a.id, null, a.current_version, 'expired', 'system', null, 'recorded_by_app', 'Link expired before a decision');
    end if;
    return jsonb_build_object('ok', false, 'error', 'expired');
  end if;
  if a.status <> 'awaiting_approval' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;
  if a.current_version <> p_version then return jsonb_build_object('ok', false, 'error', 'version_mismatch'); end if;

  matches := case when acct and a.client_email is not null
                  then lower(btrim(p_verified_email)) = lower(btrim(a.client_email)) else null end;

  if p_decision = 'approve' then
    insert into public.version_approvals
      (agreement_id, version_number, approved_by_name, approved_by_email, auth_method, approved_by_user_id, verified_email, email_matches_customer)
    values (a.id, a.current_version, left(btrim(p_name), 120), nullif(left(btrim(coalesce(p_email, '')), 254), ''),
            case when acct then 'account' else 'secure_link' end,
            case when acct then p_user_id else null end,
            case when acct then lower(btrim(p_verified_email)) else null end, matches);
    update public.agreements set status = 'approved', updated_at = now() where id = a.id;
    perform public._event(a.id, null, a.current_version, 'customer_approved', 'customer', left(btrim(p_name), 120), 'recorded_by_app',
      case when acct then 'Approved while signed in with a verified email' || case when matches then ' that matches the client email' when matches is false then ' that differs from the client email on the agreement' else ' (the agreement has no client email to compare)' end
           else 'Approved through the secure link with a typed name. Identity not verified.' end);
    perform public._notify(a.owner_id, a.id, 'approved', 'Agreement approved', a.project_name || ' was approved by ' || left(btrim(p_name), 120));
  elsif p_decision = 'decline' then
    update public.agreements set status = 'declined', updated_at = now() where id = a.id;
    perform public._event(a.id, null, a.current_version, 'customer_declined', 'customer', left(btrim(p_name), 120), 'customer_entered', p_message);
    perform public._notify(a.owner_id, a.id, 'declined', 'Agreement declined', a.project_name || ' was declined by ' || left(btrim(p_name), 120));
  else
    insert into public.customer_messages (agreement_id, body, author_name)
      values (a.id, left(btrim(p_message), 2000), left(btrim(p_name), 120));
    update public.agreements set updated_at = now() where id = a.id;
    perform public._event(a.id, null, a.current_version, 'clarification_requested', 'customer', left(btrim(p_name), 120), 'customer_entered', p_message);
    perform public._notify(a.owner_id, a.id, 'clarification', 'Clarification requested', a.project_name || ': ' || left(btrim(p_message), 200));
  end if;
  return jsonb_build_object('ok', true, 'decision', p_decision);
end $$;

drop function if exists public.customer_decide_change(text, uuid, text, text, text, text);
create or replace function public.customer_decide_change(
  p_token_hash text, p_change uuid, p_decision text, p_name text, p_email text, p_message text,
  p_user_id uuid default null, p_verified_email text default null
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  l public.share_links%rowtype;
  a public.agreements%rowtype;
  cr public.change_requests%rowtype;
  new_v integer;
  acct boolean := (p_user_id is not null and nullif(btrim(coalesce(p_verified_email, '')), '') is not null);
  matches boolean;
  method text;
begin
  if p_decision not in ('approve', 'reject', 'clarify') then
    return jsonb_build_object('ok', false, 'error', 'invalid_decision');
  end if;
  if coalesce(btrim(p_name), '') = '' then return jsonb_build_object('ok', false, 'error', 'name_required'); end if;
  if p_decision = 'clarify' and coalesce(btrim(p_message), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'message_required');
  end if;

  select * into l from public.share_links where token_hash = p_token_hash and revoked_at is null;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid_link'); end if;
  select * into a from public.agreements where id = l.agreement_id for update;
  if public._link_expired(l.expires_at) then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  if a.status <> 'approved' then return jsonb_build_object('ok', false, 'error', 'not_pending'); end if;

  select * into cr from public.change_requests where id = p_change and agreement_id = a.id for update;
  if not found or cr.status not in ('pending', 'clarification_requested') then
    return jsonb_build_object('ok', false, 'error', 'not_pending');
  end if;
  if cr.base_version <> a.current_version then return jsonb_build_object('ok', false, 'error', 'version_mismatch'); end if;

  matches := case when acct and a.client_email is not null
                  then lower(btrim(p_verified_email)) = lower(btrim(a.client_email)) else null end;
  method := case when acct then 'account' else 'secure_link' end;

  if p_decision = 'approve' then
    new_v := a.current_version + 1;
    insert into public.agreement_versions (agreement_id, version_number, terms, change_request_id)
      values (a.id, new_v, cr.proposed_terms, cr.id);
    insert into public.version_approvals
      (agreement_id, version_number, approved_by_name, approved_by_email, auth_method, approved_by_user_id, verified_email, email_matches_customer)
    values (a.id, new_v, left(btrim(p_name), 120), nullif(left(btrim(coalesce(p_email, '')), 254), ''), method,
            case when acct then p_user_id else null end, case when acct then lower(btrim(p_verified_email)) else null end, matches);
    update public.agreements set
      current_version = new_v,
      current_amount_minor = (cr.proposed_terms ->> 'amount_minor')::bigint,
      current_delivery_date = (cr.proposed_terms ->> 'delivery_date')::date,
      updated_at = now()
      where id = a.id;
    update public.change_requests set status = 'approved', decided_at = now(),
      decided_by_name = left(btrim(p_name), 120), decision_note = nullif(left(coalesce(p_message, ''), 2000), ''),
      decided_auth_method = method, decided_by_user_id = case when acct then p_user_id else null end,
      decided_verified_email = case when acct then lower(btrim(p_verified_email)) else null end, decided_email_matches = matches
      where id = cr.id;
    perform public._event(a.id, cr.id, new_v, 'change_approved', 'customer', left(btrim(p_name), 120), 'recorded_by_app',
      'Change approved; version ' || new_v || ' is now current. ' ||
      case when acct then 'Signed-in verified email.' else 'Secure link with a typed name, identity not verified.' end);
    perform public._notify(a.owner_id, a.id, 'change_approved', 'Change approved', a.project_name || ' is now at version ' || new_v);
  elsif p_decision = 'reject' then
    update public.change_requests set status = 'rejected', decided_at = now(),
      decided_by_name = left(btrim(p_name), 120), decision_note = nullif(left(coalesce(p_message, ''), 2000), ''),
      decided_auth_method = method, decided_by_user_id = case when acct then p_user_id else null end,
      decided_verified_email = case when acct then lower(btrim(p_verified_email)) else null end, decided_email_matches = matches
      where id = cr.id;
    perform public._event(a.id, cr.id, a.current_version, 'change_rejected', 'customer', left(btrim(p_name), 120), 'customer_entered', p_message);
    perform public._notify(a.owner_id, a.id, 'change_rejected', 'Change rejected', a.project_name || ': existing terms stay in place');
  else
    insert into public.customer_messages (agreement_id, change_request_id, body, author_name)
      values (a.id, cr.id, left(btrim(p_message), 2000), left(btrim(p_name), 120));
    update public.change_requests set status = 'clarification_requested' where id = cr.id;
    perform public._event(a.id, cr.id, a.current_version, 'change_clarification_requested', 'customer', left(btrim(p_name), 120), 'customer_entered', p_message);
    perform public._notify(a.owner_id, a.id, 'clarification', 'Clarification on a change', a.project_name || ': ' || left(btrim(p_message), 200));
  end if;
  return jsonb_build_object('ok', true, 'decision', p_decision);
end $$;

-- ============================================================ customer_get: original terms and approval identity
create or replace function public.customer_get(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  l public.share_links%rowtype;
  a public.agreements%rowtype;
  v public.agreement_versions%rowtype;
  v1 public.agreement_versions%rowtype;
  cr public.change_requests%rowtype;
  ap public.version_approvals%rowtype;
  pr public.profiles%rowtype;
  creator text;
  change jsonb := null;
  approval jsonb := null;
begin
  select * into l from public.share_links where token_hash = p_token_hash;
  if not found then return jsonb_build_object('link_state', 'invalid'); end if;
  if l.revoked_at is not null then return jsonb_build_object('link_state', 'revoked'); end if;
  if public._link_expired(l.expires_at) then return jsonb_build_object('link_state', 'expired'); end if;

  select * into a from public.agreements where id = l.agreement_id;
  select * into pr from public.profiles where id = a.owner_id;
  creator := coalesce(nullif(pr.business_name, ''), nullif(pr.display_name, ''), 'The creator');
  select * into v from public.agreement_versions where agreement_id = a.id and version_number = a.current_version;
  select * into v1 from public.agreement_versions where agreement_id = a.id and version_number = 1;
  select * into ap from public.version_approvals where agreement_id = a.id and version_number = a.current_version;
  if found then
    approval := jsonb_build_object('approved_at', ap.approved_at, 'approved_by_name', ap.approved_by_name,
      'auth_method', ap.auth_method, 'verified_email', ap.verified_email, 'email_matches_customer', ap.email_matches_customer);
  end if;
  select * into cr from public.change_requests
    where agreement_id = a.id and status in ('pending', 'clarification_requested') limit 1;
  if found then
    change := jsonb_build_object(
      'id', cr.id, 'status', cr.status, 'description', cr.description, 'reason', cr.reason,
      'notes_for_customer', cr.notes_for_customer, 'proposed_terms', cr.proposed_terms,
      'price_delta_minor', cr.price_delta_minor, 'base_version', cr.base_version);
  end if;

  return jsonb_build_object(
    'link_state', 'ok',
    'creator_name', creator,
    'business', jsonb_build_object(
      'email', nullif(pr.business_email, ''), 'phone', nullif(pr.business_phone, ''),
      'website', nullif(pr.business_website, ''), 'address', nullif(pr.business_address, '')),
    'status', a.status,
    'version', a.current_version,
    'terms', v.terms,
    'original_terms', v1.terms,
    'approval', approval,
    'change', change);
end $$;

-- ============================================================ privileges
revoke execute on function public.propose_change(uuid, text, text, text, jsonb, bigint, integer, text) from public, anon, authenticated;
revoke execute on function public.customer_decide_agreement(text, text, text, text, text, integer, uuid, text) from public, anon, authenticated;
revoke execute on function public.customer_decide_change(text, uuid, text, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.customer_get(text) from public, anon, authenticated;

grant execute on function public.propose_change(uuid, text, text, text, jsonb, bigint, integer, text) to authenticated;
grant execute on function public.customer_decide_agreement(text, text, text, text, text, integer, uuid, text) to service_role;
grant execute on function public.customer_decide_change(text, uuid, text, text, text, text, uuid, text) to service_role;
grant execute on function public.customer_get(text) to service_role;
