-- AgreedLink initial schema. Created by JNectar.
-- Design: browsers only READ their own rows (Row Level Security). Every write goes through
-- SECURITY DEFINER functions that check ownership/state. Customer functions are callable
-- only by the server (service_role) and receive a SHA-256 hash of the share token.

create type public.agreement_status as enum
  ('draft', 'awaiting_approval', 'approved', 'declined', 'completed', 'expired');
create type public.change_status as enum
  ('pending', 'clarification_requested', 'approved', 'rejected', 'withdrawn', 'superseded');

-- ---------------------------------------------------------------- tables
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  business_name text not null default '' check (char_length(business_name) <= 120),
  timezone text not null default 'UTC',
  default_currency text not null default 'USD' check (default_currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  project_name text not null check (char_length(project_name) between 2 and 120),
  client_name text not null check (char_length(client_name) between 1 and 120),
  client_email text check (client_email is null or char_length(client_email) <= 254),
  status public.agreement_status not null default 'awaiting_approval',
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  original_amount_minor bigint not null check (original_amount_minor > 0),
  current_amount_minor bigint not null check (current_amount_minor > 0),
  current_delivery_date date not null,
  current_version integer not null default 1,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create unique index agreements_owner_idem on public.agreements (owner_id, idempotency_key)
  where idempotency_key is not null;
create index agreements_owner_idx on public.agreements (owner_id, updated_at desc);

create table public.agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  version_number integer not null,
  terms jsonb not null,
  change_request_id uuid,
  created_at timestamptz not null default now(),
  unique (agreement_id, version_number)
);

create table public.version_approvals (
  agreement_id uuid not null,
  version_number integer not null,
  approved_at timestamptz not null default now(),
  approved_by_name text not null check (char_length(approved_by_name) between 1 and 120),
  approved_by_email text check (approved_by_email is null or char_length(approved_by_email) <= 254),
  primary key (agreement_id, version_number),
  foreign key (agreement_id, version_number)
    references public.agreement_versions (agreement_id, version_number) on delete cascade
);

create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  token_hash text not null unique,
  token_ciphertext text not null,
  expires_at timestamptz,
  revoked_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index share_links_one_active on public.share_links (agreement_id) where revoked_at is null;

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  base_version integer not null,
  status public.change_status not null default 'pending',
  description text not null check (char_length(description) between 1 and 2000),
  reason text not null check (char_length(reason) between 1 and 2000),
  notes_for_customer text not null default '' check (char_length(notes_for_customer) <= 2000),
  proposed_terms jsonb not null,
  price_delta_minor bigint not null,
  decided_at timestamptz,
  decided_by_name text,
  decision_note text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
-- Only one open proposal per agreement; this also stops two conflicting open proposals.
create unique index change_requests_one_open on public.change_requests (agreement_id)
  where status in ('pending', 'clarification_requested');

create table public.agreement_events (
  id bigint generated always as identity primary key,
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  change_request_id uuid,
  version_number integer,
  event_type text not null,
  actor_type text not null check (actor_type in ('creator', 'customer', 'system')),
  actor_name text,
  source_label text not null check (source_label in ('recorded_by_app', 'creator_reported', 'customer_entered')),
  message text,
  created_at timestamptz not null default now()
);
create index agreement_events_idx on public.agreement_events (agreement_id, id);

create table public.customer_messages (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  change_request_id uuid,
  body text not null check (char_length(body) between 1 and 2000),
  author_name text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_owner_idx on public.notifications (owner_id, created_at desc);

-- ------------------------------------------------- immutability triggers
-- Versions, approvals, events and customer messages can never be updated. Rows can only be
-- deleted when their parent agreement is already gone (cascade from a full account removal).
create or replace function public.block_mutation() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'append_only: % rows cannot be updated', tg_table_name;
  end if;
  if tg_op = 'DELETE' and exists (select 1 from public.agreements where id = old.agreement_id) then
    raise exception 'append_only: % rows cannot be deleted', tg_table_name;
  end if;
  return old;
end $$;

create trigger agreement_versions_append_only before update or delete on public.agreement_versions
  for each row execute function public.block_mutation();
create trigger version_approvals_append_only before update or delete on public.version_approvals
  for each row execute function public.block_mutation();
create trigger agreement_events_append_only before update or delete on public.agreement_events
  for each row execute function public.block_mutation();
create trigger customer_messages_append_only before update or delete on public.customer_messages
  for each row execute function public.block_mutation();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Create a profile for every new auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)), 120));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- --------------------------------------------------------------- internal helpers
create or replace function public._event(
  p_agreement uuid, p_change uuid, p_version integer, p_type text,
  p_actor_type text, p_actor_name text, p_source text, p_message text
) returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.agreement_events
    (agreement_id, change_request_id, version_number, event_type, actor_type, actor_name, source_label, message)
  values (p_agreement, p_change, p_version, p_type, p_actor_type, p_actor_name, p_source, left(p_message, 2000));
$$;

create or replace function public._notify(
  p_owner uuid, p_agreement uuid, p_type text, p_title text, p_body text
) returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.notifications (owner_id, agreement_id, type, title, body)
  values (p_owner, p_agreement, p_type, left(p_title, 200), left(p_body, 500));
$$;

create or replace function public._link_expired(p_expires timestamptz) returns boolean
language sql stable as $$ select p_expires is not null and p_expires < now() $$;

-- ------------------------------------------------------ creator functions (signed-in user)
-- Free plan limit is a fixed 3 new agreements per calendar month until billing exists.
create or replace function public.create_agreement(
  p_terms jsonb, p_token_hash text, p_token_ciphertext text,
  p_expires_at timestamptz, p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  aid uuid;
  month_count integer;
  creator text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_idempotency_key is not null then
    select id into aid from public.agreements where owner_id = uid and idempotency_key = p_idempotency_key;
    if aid is not null then return aid; end if;
  end if;
  select count(*) into month_count from public.agreements
    where owner_id = uid and created_at >= date_trunc('month', now());
  if month_count >= 3 then raise exception 'free_plan_limit'; end if;

  insert into public.agreements
    (owner_id, project_name, client_name, client_email, currency,
     original_amount_minor, current_amount_minor, current_delivery_date, idempotency_key)
  values
    (uid, p_terms ->> 'project_name', p_terms ->> 'client_name', nullif(p_terms ->> 'client_email', ''),
     p_terms ->> 'currency', (p_terms ->> 'amount_minor')::bigint, (p_terms ->> 'amount_minor')::bigint,
     (p_terms ->> 'delivery_date')::date, p_idempotency_key)
  returning id into aid;

  insert into public.agreement_versions (agreement_id, version_number, terms) values (aid, 1, p_terms);
  insert into public.share_links (agreement_id, token_hash, token_ciphertext, expires_at)
    values (aid, p_token_hash, p_token_ciphertext, p_expires_at);

  select display_name into creator from public.profiles where id = uid;
  perform public._event(aid, null, 1, 'created', 'creator', creator, 'recorded_by_app', 'Agreement created and link generated');
  return aid;
end $$;

create or replace function public.regenerate_link(
  p_agreement uuid, p_token_hash text, p_token_ciphertext text, p_expires_at timestamptz
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.agreements%rowtype;
begin
  select * into a from public.agreements where id = p_agreement and owner_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  update public.share_links set revoked_at = now() where agreement_id = a.id and revoked_at is null;
  insert into public.share_links (agreement_id, token_hash, token_ciphertext, expires_at)
    values (a.id, p_token_hash, p_token_ciphertext, p_expires_at);
  perform public._event(a.id, null, a.current_version, 'link_regenerated', 'creator', null, 'recorded_by_app', 'Previous link revoked; new link issued');
end $$;

create or replace function public.revoke_link(p_agreement uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.agreements%rowtype;
begin
  select * into a from public.agreements where id = p_agreement and owner_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  update public.share_links set revoked_at = now() where agreement_id = a.id and revoked_at is null;
  perform public._event(a.id, null, a.current_version, 'link_revoked', 'creator', null, 'recorded_by_app', 'Customer link revoked');
end $$;

create or replace function public.propose_change(
  p_agreement uuid, p_description text, p_reason text, p_notes text, p_proposed jsonb
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  a public.agreements%rowtype;
  open_cr public.change_requests%rowtype;
  new_id uuid;
  delta bigint;
begin
  select * into a from public.agreements where id = p_agreement and owner_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if a.status <> 'approved' then raise exception 'invalid_state'; end if;
  if p_proposed ->> 'currency' <> a.currency then raise exception 'currency_mismatch'; end if;
  if (p_proposed ->> 'amount_minor')::bigint <= 0 then raise exception 'invalid_amount'; end if;

  select * into open_cr from public.change_requests
    where agreement_id = a.id and status in ('pending', 'clarification_requested') for update;
  if found then
    if open_cr.status = 'pending' then raise exception 'change_already_pending'; end if;
    update public.change_requests set status = 'superseded' where id = open_cr.id;
    perform public._event(a.id, open_cr.id, a.current_version, 'change_superseded', 'creator', null, 'recorded_by_app', 'Replaced by a revised proposal');
  end if;

  delta := (p_proposed ->> 'amount_minor')::bigint - a.current_amount_minor;
  insert into public.change_requests
    (agreement_id, base_version, description, reason, notes_for_customer, proposed_terms, price_delta_minor, created_by)
  values (a.id, a.current_version, p_description, p_reason, coalesce(p_notes, ''), p_proposed, delta, auth.uid())
  returning id into new_id;
  perform public._event(a.id, new_id, a.current_version, 'change_proposed', 'creator', null, 'recorded_by_app', p_description);
  return new_id;
end $$;

create or replace function public.withdraw_change(p_change uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.agreements%rowtype; cr public.change_requests%rowtype;
begin
  select * into cr from public.change_requests where id = p_change;
  if not found then raise exception 'not_found'; end if;
  select * into a from public.agreements where id = cr.agreement_id and owner_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  select * into cr from public.change_requests where id = p_change for update;
  if cr.status not in ('pending', 'clarification_requested') then raise exception 'not_pending'; end if;
  update public.change_requests set status = 'withdrawn' where id = cr.id;
  perform public._event(a.id, cr.id, a.current_version, 'change_withdrawn', 'creator', null, 'recorded_by_app', 'Proposal withdrawn by creator');
end $$;

create or replace function public.mark_completed(p_agreement uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.agreements%rowtype;
begin
  select * into a from public.agreements where id = p_agreement and owner_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if a.status <> 'approved' then raise exception 'invalid_state'; end if;
  if exists (select 1 from public.change_requests where agreement_id = a.id and status in ('pending', 'clarification_requested')) then
    raise exception 'change_already_pending';
  end if;
  update public.agreements set status = 'completed', completed_at = now(), updated_at = now() where id = a.id;
  perform public._event(a.id, null, a.current_version, 'completed', 'creator', null, 'creator_reported', 'Marked completed by creator (not confirmed by the customer)');
end $$;

