-- AgreedLink migration 0006 (part 1 of 2): customer records and the customer portal. Created by JNectar.
-- Run after 0001 to 0005. Run this file first, then 0007. Nothing here deletes or changes existing data.

-- ============================================================ columns
alter table public.version_approvals
  add column if not exists auth_method text not null default 'secure_link' check (auth_method in ('secure_link', 'account')),
  add column if not exists approved_by_user_id uuid,
  add column if not exists verified_email text,
  add column if not exists email_matches_customer boolean;

alter table public.change_requests
  add column if not exists idempotency_key text,
  add column if not exists decided_auth_method text check (decided_auth_method is null or decided_auth_method in ('secure_link', 'account')),
  add column if not exists decided_by_user_id uuid,
  add column if not exists decided_verified_email text,
  add column if not exists decided_email_matches boolean;

create unique index if not exists change_requests_idem on public.change_requests (agreement_id, idempotency_key)
  where idempotency_key is not null;

-- ============================================================ customers
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 20),
  notes text not null default '' check (char_length(notes) <= 1000),
  claimed_by uuid references auth.users (id) on delete set null,
  claimed_at timestamptz,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists customers_owner_email on public.customers (owner_id, lower(email)) where email is not null;
create index if not exists customers_owner_name on public.customers (owner_id, lower(name));
create index if not exists customers_claimed_by on public.customers (claimed_by) where claimed_by is not null;

alter table public.agreements add column if not exists customer_id uuid references public.customers (id) on delete set null;
create index if not exists agreements_customer_idx on public.agreements (customer_id) where customer_id is not null;

-- Emails are stored lowercase. Changing a customer's email removes any earlier verification,
-- because the verified address would no longer be the one on the record.
create or replace function public.customers_before_write() returns trigger
language plpgsql as $$
begin
  new.email := nullif(lower(btrim(coalesce(new.email, ''))), '');
  new.updated_at := now();
  if tg_op = 'UPDATE' and new.email is distinct from old.email then
    new.claimed_by := null;
    new.claimed_at := null;
    new.email_verified_at := null;
  end if;
  return new;
end $$;
drop trigger if exists customers_before_write on public.customers;
create trigger customers_before_write before insert or update on public.customers
  for each row execute function public.customers_before_write();

-- Only the owning business can read or edit its customer records. Customers never read this table directly
-- (it holds the business's private notes); they use the portal functions below instead.
alter table public.customers enable row level security;
revoke all on public.customers from anon, authenticated;
grant select on public.customers to authenticated;
grant update (name, email, phone, notes) on public.customers to authenticated;
create policy customers_select_owner on public.customers for select to authenticated using (owner_id = auth.uid());
create policy customers_update_owner on public.customers for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ============================================================ customer linking
create or replace function public._ensure_customer(p_owner uuid, p_name text, p_email text)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare cid uuid; e text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if e is not null then
    select id into cid from public.customers where owner_id = p_owner and email = e;
  else
    select id into cid from public.customers where owner_id = p_owner and email is null and lower(name) = lower(btrim(p_name));
  end if;
  if cid is null then
    insert into public.customers (owner_id, name, email) values (p_owner, left(btrim(p_name), 120), e) returning id into cid;
  end if;
  return cid;
end $$;

create or replace function public.link_agreement_customer(p_agreement uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.agreements%rowtype; cid uuid;
begin
  select * into a from public.agreements where id = p_agreement and owner_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  cid := public._ensure_customer(a.owner_id, a.client_name, a.client_email);
  update public.agreements set customer_id = cid where id = a.id;
  return cid;
end $$;

-- Links every older agreement of the signed-in business to a customer record. Safe to run again.
create or replace function public.link_existing_customers()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare r record; n integer := 0;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  for r in select id, owner_id, client_name, client_email from public.agreements where owner_id = auth.uid() and customer_id is null loop
    update public.agreements set customer_id = public._ensure_customer(r.owner_id, r.client_name, r.client_email) where id = r.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- A signed-in user whose email is CONFIRMED can claim customer records that carry that email.
create or replace function public.claim_customer_records()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); em text; confirmed timestamptz; n integer;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select lower(btrim(email)), email_confirmed_at into em, confirmed from auth.users where id = uid;
  if em is null or confirmed is null then raise exception 'email_not_verified'; end if;
  update public.customers set claimed_by = uid, claimed_at = now(), email_verified_at = now()
    where email = em and claimed_by is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ============================================================ customer portal (read only)
create or replace function public.portal_overview()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); result jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select coalesce(jsonb_agg(x.j order by x.u desc), '[]'::jsonb) into result from (
    select a.updated_at as u, jsonb_build_object(
      'id', a.id, 'project_name', a.project_name,
      'business', coalesce(nullif(p.business_name, ''), nullif(p.display_name, ''), 'A business'),
      'status', a.status, 'currency', a.currency, 'amount_minor', a.current_amount_minor,
      'delivery_date', a.current_delivery_date, 'version', a.current_version, 'updated_at', a.updated_at,
      'open_change', exists (select 1 from public.change_requests c where c.agreement_id = a.id and c.status in ('pending', 'clarification_requested'))
    ) as j
    from public.agreements a
    join public.customers cu on cu.id = a.customer_id and cu.claimed_by = uid
    join public.profiles p on p.id = a.owner_id
    where a.status::text <> 'draft'
  ) x;
  return result;
end $$;

create or replace function public.portal_agreement(p_agreement uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); a public.agreements%rowtype; pr public.profiles%rowtype; v public.agreement_versions%rowtype;
        versions jsonb; changes jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select a2.* into a from public.agreements a2
    join public.customers cu on cu.id = a2.customer_id and cu.claimed_by = uid
    where a2.id = p_agreement and a2.status::text <> 'draft';
  if not found then return null; end if;
  select * into pr from public.profiles where id = a.owner_id;
  select * into v from public.agreement_versions where agreement_id = a.id and version_number = a.current_version;

  select coalesce(jsonb_agg(jsonb_build_object(
      'version', av.version_number, 'created_at', av.created_at, 'terms', av.terms,
      'approved_at', ap.approved_at, 'approved_by_name', ap.approved_by_name, 'auth_method', ap.auth_method,
      'verified_email', ap.verified_email, 'email_matches_customer', ap.email_matches_customer) order by av.version_number desc), '[]'::jsonb)
    into versions
    from public.agreement_versions av
    left join public.version_approvals ap on ap.agreement_id = av.agreement_id and ap.version_number = av.version_number
    where av.agreement_id = a.id;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'status', c.status, 'description', c.description, 'reason', c.reason,
      'price_delta_minor', c.price_delta_minor, 'new_amount_minor', (c.proposed_terms ->> 'amount_minor')::bigint,
      'new_delivery_date', c.proposed_terms ->> 'delivery_date', 'created_at', c.created_at,
      'decided_at', c.decided_at, 'decided_by_name', c.decided_by_name, 'auth_method', c.decided_auth_method,
      'verified_email', c.decided_verified_email, 'email_matches_customer', c.decided_email_matches) order by c.created_at desc), '[]'::jsonb)
    into changes from public.change_requests c where c.agreement_id = a.id;

  return jsonb_build_object(
    'id', a.id, 'project_name', a.project_name, 'status', a.status, 'currency', a.currency,
    'amount_minor', a.current_amount_minor, 'delivery_date', a.current_delivery_date, 'version', a.current_version,
    'business', jsonb_build_object(
      'name', coalesce(nullif(pr.business_name, ''), nullif(pr.display_name, ''), 'A business'),
      'email', nullif(pr.business_email, ''), 'phone', nullif(pr.business_phone, ''),
      'website', nullif(pr.business_website, ''), 'address', nullif(pr.business_address, '')),
    'terms', v.terms, 'versions', versions, 'changes', changes);
end $$;

-- ============================================================ privileges
revoke execute on function public._ensure_customer(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.link_agreement_customer(uuid) from public, anon, authenticated;
revoke execute on function public.link_existing_customers() from public, anon, authenticated;
revoke execute on function public.claim_customer_records() from public, anon, authenticated;
revoke execute on function public.portal_overview() from public, anon, authenticated;
revoke execute on function public.portal_agreement(uuid) from public, anon, authenticated;

grant execute on function public.link_agreement_customer(uuid) to authenticated;
grant execute on function public.link_existing_customers() to authenticated;
grant execute on function public.claim_customer_records() to authenticated;
grant execute on function public.portal_overview() to authenticated;
grant execute on function public.portal_agreement(uuid) to authenticated;
