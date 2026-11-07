-- Bank transfer payment references: AGL-YYYYMMDD-XXXXX. Run AFTER 20261101_manual_subscriptions.sql. Safe to run more than once.
--
-- Additive only. This does NOT change: Paystack payments, existing subscription requests, existing manual_subscriptions rows,
-- admin approval, bank details, prices or plan limits.
--
-- How it works
--   * Each user gets one unused reference at a time (get_my_transfer_reference). They write it in their bank transfer.
--   * When they submit a subscription request, a trigger attaches that reference to the request and marks it used.
--     If the request fails for any reason, the whole statement rolls back and the reference stays unused.
--   * A used reference is never handed out again, and rows are never deleted, so a reference is never reused.
--   * subscription_requests.payment_reference keeps its old meaning: the customer's own bank transaction ID.

-- 1. Every reference ever issued. No foreign keys, so history survives even if an account or request is removed.
create table if not exists public.bank_transfer_references (
  reference text primary key check (reference ~ '^AGL-[0-9]{8}-[A-Z0-9]{5}$'),
  user_id uuid not null,
  issued_at timestamptz not null default now(),
  used_at timestamptz,
  request_id uuid
);
create index if not exists bank_transfer_references_unused_idx on public.bank_transfer_references (user_id, issued_at desc) where used_at is null;
create unique index if not exists bank_transfer_references_request_once on public.bank_transfer_references (request_id) where request_id is not null;

alter table public.bank_transfer_references enable row level security;
revoke all on public.bank_transfer_references from anon, authenticated;
grant select on public.bank_transfer_references to authenticated;
drop policy if exists bank_transfer_references_select_own on public.bank_transfer_references;
create policy bank_transfer_references_select_own on public.bank_transfer_references for select to authenticated using (user_id = auth.uid());
-- No insert, update or delete grants: references are created and used only by the functions below.

-- 2. The reference on the request itself. Old requests keep an empty value; nothing existing is touched.
alter table public.subscription_requests add column if not exists transfer_reference text;
alter table public.subscription_requests drop constraint if exists subscription_requests_transfer_reference_format;
alter table public.subscription_requests add constraint subscription_requests_transfer_reference_format
  check (transfer_reference is null or transfer_reference ~ '^AGL-[0-9]{8}-[A-Z0-9]{5}$');
create unique index if not exists subscription_requests_transfer_reference_once on public.subscription_requests (transfer_reference) where transfer_reference is not null;
-- Customers may read the reference on their own requests (the existing row policy already limits rows to their own).
grant select (transfer_reference) on public.subscription_requests to authenticated;

-- 3. Makes a new, unique reference. The date is the UTC date. The 5 characters avoid look-alikes (no 0, O, 1, I).
create or replace function public._issue_transfer_reference(p_user uuid) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  ref text; code text; i integer; attempts integer := 0;
begin
  loop
    attempts := attempts + 1;
    code := '';
    for i in 1..5 loop code := code || substr(alphabet, 1 + floor(random() * 32)::integer, 1); end loop;
    ref := 'AGL-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' || code;
    begin
      insert into public.bank_transfer_references (reference, user_id) values (ref, p_user);
      return ref;
    exception when unique_violation then
      if attempts >= 25 then raise exception 'reference_generation_failed'; end if;
    end;
  end loop;
end $$;

-- 4. The signed-in user's current unused reference. Creates one if they have none.
create or replace function public.get_my_transfer_reference() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); ref text; issued timestamptz;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  perform pg_advisory_xact_lock(hashtextextended('agl-ref:' || uid::text, 0));
  select r.reference, r.issued_at into ref, issued
    from public.bank_transfer_references r where r.user_id = uid and r.used_at is null order by r.issued_at desc limit 1;
  if ref is null then
    ref := public._issue_transfer_reference(uid);
    select r.issued_at into issued from public.bank_transfer_references r where r.reference = ref;
  end if;
  return jsonb_build_object('reference', ref, 'issued_at', issued);
end $$;

-- 5. Attaches the reference to a new request and keeps it from ever being changed afterwards.
create or replace function public.subscription_requests_assign_reference() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare ref text;
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended('agl-ref:' || new.user_id::text, 0));
    select r.reference into ref from public.bank_transfer_references r
      where r.user_id = new.user_id and r.used_at is null order by r.issued_at desc limit 1 for update;
    if ref is null then ref := public._issue_transfer_reference(new.user_id); end if;
    update public.bank_transfer_references set used_at = now(), request_id = new.id where reference = ref;
    new.transfer_reference := ref;
    return new;
  end if;
  if old.transfer_reference is not null and new.transfer_reference is distinct from old.transfer_reference then
    raise exception 'history_protected';
  end if;
  return new;
end $$;
drop trigger if exists subscription_requests_assign_reference on public.subscription_requests;
create trigger subscription_requests_assign_reference before insert or update on public.subscription_requests
  for each row execute function public.subscription_requests_assign_reference();

-- 6. Admin lookup: request id -> reference. A separate function, so admin_list_requests is left exactly as it is.
create or replace function public.admin_request_references(p_ids uuid[]) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  perform public._require_admin();
  select coalesce(jsonb_object_agg(r.id::text, r.transfer_reference), '{}'::jsonb) into result
    from public.subscription_requests r where r.id = any(p_ids) and r.transfer_reference is not null;
  return result;
end $$;

revoke execute on function public._issue_transfer_reference(uuid) from public, anon, authenticated;
revoke execute on function public.get_my_transfer_reference() from public, anon, authenticated;
revoke execute on function public.admin_request_references(uuid[]) from public, anon, authenticated;
revoke execute on function public.subscription_requests_assign_reference() from public, anon, authenticated;
grant execute on function public.get_my_transfer_reference() to authenticated;
grant execute on function public.admin_request_references(uuid[]) to authenticated;
