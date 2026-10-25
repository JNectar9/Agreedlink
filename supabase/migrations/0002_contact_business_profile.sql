-- AgreedLink migration 0002. Created by JNectar.
-- Adds: business profile fields, Africa/Lagos default time zone, contact messages with
-- rate limiting, and an updated customer_get that returns the creator's business contact details.
-- Safe to run once on top of 0001_init.sql.

-- ---------------------------------------------------------------- business profile
alter table public.profiles
  add column if not exists business_email text not null default '' check (char_length(business_email) <= 254),
  add column if not exists business_phone text not null default '' check (char_length(business_phone) <= 40),
  add column if not exists business_website text not null default '' check (char_length(business_website) <= 200),
  add column if not exists business_address text not null default '' check (char_length(business_address) <= 300);

-- New accounts default to Lagos time. Existing accounts keep their saved zone (change it in Settings).
alter table public.profiles alter column timezone set default 'Africa/Lagos';

grant update (business_email, business_phone, business_website, business_address)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------- contact messages
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) between 3 and 254),
  subject text not null default '' check (char_length(subject) <= 150),
  message text not null check (char_length(message) between 10 and 3000),
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_email_idx on public.contact_messages (lower(email), created_at desc);

-- No policies on purpose: browsers can never read or write this table. Only the server
-- (service role) inserts, and you read messages in the Supabase Table Editor.
alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;

create or replace function public.submit_contact_message(
  p_name text, p_email text, p_subject text, p_message text
) returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare new_id uuid;
begin
  if (select count(*) from public.contact_messages
        where lower(email) = lower(p_email) and created_at > now() - interval '1 hour') >= 3 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;
  if (select count(*) from public.contact_messages where created_at > now() - interval '1 hour') >= 30 then
    return jsonb_build_object('ok', false, 'error', 'busy');
  end if;
  insert into public.contact_messages (name, email, subject, message)
    values (left(btrim(p_name), 100), left(btrim(p_email), 254), left(btrim(coalesce(p_subject, '')), 150), left(btrim(p_message), 3000))
    returning id into new_id;
  return jsonb_build_object('ok', true, 'id', new_id);
end $$;

revoke execute on function public.submit_contact_message(text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_contact_message(text, text, text, text) to service_role;

-- ---------------------------------------------------------------- customer_get with business details
create or replace function public.customer_get(p_token_hash text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  l public.share_links%rowtype;
  a public.agreements%rowtype;
  v public.agreement_versions%rowtype;
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
  select * into ap from public.version_approvals where agreement_id = a.id and version_number = a.current_version;
  if found then
    approval := jsonb_build_object('approved_at', ap.approved_at, 'approved_by_name', ap.approved_by_name);
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
    'approval', approval,
    'change', change);
end $$;
