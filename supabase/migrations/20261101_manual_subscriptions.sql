-- AgreedLink: manual subscriptions (database only). Created by JNectar.
-- Run after 0001 to 0007. Run once.
--
-- How it works: a customer asks for Pro or Premium and pays by bank transfer using the instructions in
-- subscription_config. An authorised admin checks the payment and approves the request, which creates a dated
-- row in manual_subscriptions. Paid access is calculated from those dates every time it is checked, so it
-- ends the moment a subscription expires or is cancelled. Nothing here changes the app screens.
--
-- Existing objects this migration touches (nothing is deleted):
--   plans.saved_templates_limit   new column, existing agreement limits unchanged (3, 50, 200)
--   _plan_of(uuid)                now also counts manual subscriptions; results for everyone else are identical
--
-- To make yourself an admin, run this ONCE in the SQL Editor with your own login email:
--   insert into public.admin_users (user_id) select id from auth.users where email = 'YOUR_EMAIL_HERE' on conflict do nothing;

-- ============================================================ plan limits
alter table public.plans add column if not exists saved_templates_limit integer not null default 1 check (saved_templates_limit >= 0);
update public.plans set saved_templates_limit = case id when 'free' then 1 else 10 end;

-- ============================================================ admins
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon, authenticated;   -- no policies: invisible to every app user

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;
create or replace function public._require_admin() returns void
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'not_authorized'; end if;
end $$;

-- ============================================================ configuration (one row)
create table if not exists public.subscription_config (
  id boolean primary key default true check (id),
  currency text not null default 'USD' check (currency = 'USD'),
  price_pro_minor integer not null default 900 check (price_pro_minor > 0),
  price_premium_minor integer not null default 2400 check (price_premium_minor > 0),
  payment_instructions text not null default '' check (char_length(payment_instructions) <= 2000),
  support_email text not null default '' check (char_length(support_email) <= 254),
  support_whatsapp text not null default '' check (char_length(support_whatsapp) <= 30),
  automatic_payments_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
-- Payment instructions and the WhatsApp number are left empty on purpose: add the real ones with
-- admin_update_subscription_config. The support email is JNectar's confirmed address.
insert into public.subscription_config (id, support_email) values (true, 'JNectar.tech@gmail.com') on conflict (id) do nothing;

alter table public.subscription_config enable row level security;
revoke all on public.subscription_config from anon, authenticated;
grant select on public.subscription_config to authenticated;   -- holds nothing secret; edited only through admin functions
drop policy if exists subscription_config_read on public.subscription_config;
create policy subscription_config_read on public.subscription_config for select to authenticated using (true);

-- ============================================================ customer requests
create table if not exists public.subscription_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  requested_plan text not null check (requested_plan in ('pro', 'premium')),
  months integer not null default 1 check (months between 1 and 12),
  expected_amount_minor integer,
  currency text not null default 'USD' check (currency = 'USD'),
  payment_reference text not null default '' check (char_length(payment_reference) <= 120),
  customer_notes text not null default '' check (char_length(customer_notes) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscription_requests_one_pending on public.subscription_requests (user_id) where status = 'pending';
create index if not exists subscription_requests_status_idx on public.subscription_requests (status, created_at);

create or replace function public.subscription_requests_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
declare cfg public.subscription_config%rowtype;
begin
  if tg_op = 'INSERT' then
    select * into cfg from public.subscription_config where id;
    -- Whatever the browser sends, the price is copied from the server configuration and the request starts pending.
    new.expected_amount_minor := (case new.requested_plan when 'pro' then cfg.price_pro_minor else cfg.price_premium_minor end) * new.months;
    new.currency := cfg.currency;
    new.payment_reference := btrim(new.payment_reference);
    new.customer_notes := btrim(new.customer_notes);
    new.status := 'pending';
    new.rejection_reason := null; new.admin_notes := null; new.reviewed_by := null; new.reviewed_at := null;
    return new;
  elsif tg_op = 'UPDATE' then
    if old.status <> 'pending' then raise exception 'request_already_decided'; end if;
    if new.user_id <> old.user_id or new.requested_plan <> old.requested_plan or new.months <> old.months
       or new.expected_amount_minor is distinct from old.expected_amount_minor or new.created_at <> old.created_at then
      raise exception 'history_protected';
    end if;
    new.updated_at := now();
    return new;
  else  -- DELETE: allowed only when the whole account is being removed
    if exists (select 1 from public.profiles where id = old.user_id) then raise exception 'history_protected'; end if;
    return old;
  end if;
end $$;
drop trigger if exists subscription_requests_guard on public.subscription_requests;
create trigger subscription_requests_guard before insert or update or delete on public.subscription_requests
  for each row execute function public.subscription_requests_guard();

alter table public.subscription_requests enable row level security;
revoke all on public.subscription_requests from anon, authenticated;
-- Customers may create and read only their own requests. They can never set a status, price or reviewer,
-- and they cannot read the admin notes.
grant select (id, user_id, requested_plan, months, expected_amount_minor, currency, payment_reference, customer_notes,
              status, rejection_reason, reviewed_at, created_at, updated_at) on public.subscription_requests to authenticated;
grant insert (requested_plan, months, payment_reference, customer_notes) on public.subscription_requests to authenticated;
drop policy if exists subscription_requests_select_own on public.subscription_requests;
drop policy if exists subscription_requests_insert_own on public.subscription_requests;
create policy subscription_requests_select_own on public.subscription_requests for select to authenticated using (user_id = auth.uid());
create policy subscription_requests_insert_own on public.subscription_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');

-- ============================================================ verified manual subscriptions (history is kept)
create table if not exists public.manual_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  request_id uuid references public.subscription_requests (id) on delete set null,
  plan text not null check (plan in ('pro', 'premium')),
  kind text not null default 'payment' check (kind in ('payment', 'complimentary')),
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  payment_reference text,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  approved_by uuid not null,
  approved_at timestamptz not null default now(),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 500),
  created_at timestamptz not null default now(),
  check (expires_at > starts_at),
  -- A real payment needs an amount and a reference. A complimentary grant is labelled as such and has neither.
  check ((kind = 'payment' and amount_minor > 0 and char_length(btrim(coalesce(payment_reference, ''))) between 3 and 120)
      or (kind = 'complimentary' and amount_minor = 0 and payment_reference is null and char_length(btrim(coalesce(admin_notes, ''))) >= 3)),
  check ((status = 'cancelled') = (cancelled_at is not null))
);
create unique index if not exists manual_subscriptions_reference_once on public.manual_subscriptions (lower(payment_reference)) where kind = 'payment';
create index if not exists manual_subscriptions_user_idx on public.manual_subscriptions (user_id, expires_at desc);

create or replace function public.manual_subscriptions_guard() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if tg_op = 'DELETE' then raise exception 'history_protected'; end if;
  if tg_op = 'INSERT' then
    -- One lock per user so two admins approving at the same moment cannot create overlapping periods.
    perform pg_advisory_xact_lock(hashtext('manual_subscription:' || new.user_id::text));
    if new.status = 'active' and exists (
      select 1 from public.manual_subscriptions o
      where o.user_id = new.user_id and o.status = 'active'
        and tstzrange(o.starts_at, o.expires_at, '[)') && tstzrange(new.starts_at, new.expires_at, '[)')) then
      raise exception 'overlapping_subscription';
    end if;
    return new;
  end if;
  -- UPDATE: the only changes allowed are cancelling an active row and editing admin notes.
  if new.user_id <> old.user_id or new.request_id is distinct from old.request_id or new.plan <> old.plan or new.kind <> old.kind
     or new.amount_minor <> old.amount_minor or new.currency <> old.currency or new.payment_reference is distinct from old.payment_reference
     or new.starts_at <> old.starts_at or new.expires_at <> old.expires_at or new.approved_by <> old.approved_by
     or new.approved_at <> old.approved_at or new.created_at <> old.created_at then
    raise exception 'history_protected';
  end if;
  if old.status = 'cancelled' and (new.status <> 'cancelled' or new.cancelled_at is distinct from old.cancelled_at) then raise exception 'history_protected'; end if;
  return new;
end $$;
drop trigger if exists manual_subscriptions_guard on public.manual_subscriptions;
create trigger manual_subscriptions_guard before insert or update or delete on public.manual_subscriptions
  for each row execute function public.manual_subscriptions_guard();

alter table public.manual_subscriptions enable row level security;
revoke all on public.manual_subscriptions from anon, authenticated;
-- Customers read only their own rows, and not the admin notes or reviewer details. Nobody writes from the app.
grant select (id, user_id, request_id, plan, kind, amount_minor, currency, payment_reference, starts_at, expires_at,
              status, cancelled_at, created_at) on public.manual_subscriptions to authenticated;
drop policy if exists manual_subscriptions_select_own on public.manual_subscriptions;
create policy manual_subscriptions_select_own on public.manual_subscriptions for select to authenticated using (user_id = auth.uid());

-- ============================================================ effective plan (expiry is instant)
-- Access is worked out from the dates each time it is checked. There is no job to run: once expires_at
-- passes, or a row is cancelled, the next check returns Free.
create or replace function public._effective_plan(p_user uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select x.plan from (
      select ms.plan from public.manual_subscriptions ms
        where ms.user_id = p_user and ms.status = 'active' and ms.starts_at <= now() and now() < ms.expires_at
      union all
      select s.plan from public.subscriptions s
        where s.user_id = p_user and s.plan in ('pro', 'premium') and s.status in ('active', 'past_due')
          and (s.current_period_end is null or s.current_period_end > now())
    ) x
    order by case x.plan when 'premium' then 2 when 'pro' then 1 else 0 end desc
    limit 1), 'free')
$$;

-- Agreement limits already call _plan_of, so they now respect manual subscriptions automatically.
create or replace function public._plan_of(p_user uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select public._effective_plan(p_user)
$$;

-- ============================================================ what a customer can see about their own plan
create or replace function public.my_subscription() returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  eff text; pl public.plans%rowtype; cur public.manual_subscriptions%rowtype; lastexp timestamptz;
  has_cur boolean; req jsonb; hist jsonb;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  eff := public._effective_plan(uid);
  select * into pl from public.plans where id = eff;

  select * into cur from public.manual_subscriptions
    where user_id = uid and status = 'active' and starts_at <= now() and now() < expires_at order by expires_at desc limit 1;
  has_cur := found;
  select max(expires_at) into lastexp from public.manual_subscriptions where user_id = uid and status = 'active' and expires_at <= now();

  select jsonb_build_object('id', r.id, 'plan', r.requested_plan, 'months', r.months, 'status', r.status,
           'expected_amount_minor', r.expected_amount_minor, 'currency', r.currency,
           'rejection_reason', r.rejection_reason, 'created_at', r.created_at, 'reviewed_at', r.reviewed_at)
    into req from public.subscription_requests r where r.user_id = uid order by r.created_at desc limit 1;

  select coalesce(jsonb_agg(jsonb_build_object('plan', h.plan, 'kind', h.kind, 'amount_minor', h.amount_minor, 'currency', h.currency,
           'starts_at', h.starts_at, 'expires_at', h.expires_at, 'status', h.status, 'cancelled_at', h.cancelled_at) order by h.starts_at desc), '[]'::jsonb)
    into hist from (select * from public.manual_subscriptions where user_id = uid order by starts_at desc limit 50) h;

  return jsonb_build_object(
    'effective_plan', eff,
    'state', case when eff <> 'free' then 'active' when lastexp is not null then 'expired' else 'free' end,
    'source', case when has_cur then 'manual' when eff <> 'free' then 'other' else 'free' end,
    'limits', jsonb_build_object('active_agreements', pl.active_agreements_limit, 'saved_templates', pl.saved_templates_limit),
    'current', case when has_cur then jsonb_build_object('plan', cur.plan, 'kind', cur.kind, 'starts_at', cur.starts_at, 'expires_at', cur.expires_at) else null end,
    'last_expired_at', lastexp,
    'latest_request', req,
    'history', hist);
end $$;

create or replace function public.subscription_public_config() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'currency', c.currency,
    'prices', jsonb_build_object('free', 0, 'pro', c.price_pro_minor, 'premium', c.price_premium_minor),
    'limits', (select jsonb_object_agg(p.id, jsonb_build_object('active_agreements', p.active_agreements_limit, 'saved_templates', p.saved_templates_limit)) from public.plans p),
    'payment_instructions', c.payment_instructions, 'support_email', c.support_email,
    'support_whatsapp', c.support_whatsapp, 'automatic_payments_enabled', c.automatic_payments_enabled)
  from public.subscription_config c where c.id
$$;

-- ============================================================ admin actions (each one checks is_admin() itself)
create or replace function public.admin_list_requests(p_status text default 'pending') returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  perform public._require_admin();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'user_id', r.user_id, 'name', p.display_name, 'email', u.email, 'plan', r.requested_plan, 'months', r.months,
      'expected_amount_minor', r.expected_amount_minor, 'currency', r.currency, 'payment_reference', r.payment_reference,
      'customer_notes', r.customer_notes, 'status', r.status, 'rejection_reason', r.rejection_reason,
      'admin_notes', r.admin_notes, 'created_at', r.created_at, 'reviewed_at', r.reviewed_at) order by r.created_at), '[]'::jsonb)
    into result
    from public.subscription_requests r
    join public.profiles p on p.id = r.user_id
    join auth.users u on u.id = r.user_id
    where p_status is null or p_status = 'all' or r.status = p_status;
  return result;
end $$;

create or replace function public.admin_user_subscriptions(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare result jsonb;
begin
  perform public._require_admin();
  select coalesce(jsonb_agg(to_jsonb(m) order by m.starts_at desc), '[]'::jsonb) into result from public.manual_subscriptions m where m.user_id = p_user;
  return result;
end $$;

-- Shared by approve, renew and grant: finds when a new period should start, or refuses when the user is on a different active plan.
create or replace function public._next_start(p_user uuid, p_plan text) returns timestamptz
language plpgsql security definer set search_path = public, pg_temp as $$
declare cur public.manual_subscriptions%rowtype;
begin
  select * into cur from public.manual_subscriptions where user_id = p_user and status = 'active' and expires_at > now() order by expires_at desc limit 1;
  if not found then return now(); end if;
  if cur.plan <> p_plan then raise exception 'active_subscription_exists'; end if;  -- cancel the current plan first to switch plans
  return cur.expires_at;                                                          -- same plan: the new period follows the current one
end $$;

create or replace function public.admin_approve_request(
  p_request uuid, p_payment_reference text default null, p_amount_minor integer default null,
  p_months integer default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.subscription_requests%rowtype; ref text; amt integer; mths integer; start_ts timestamptz; sub_id uuid;
begin
  perform public._require_admin();
  select * into r from public.subscription_requests where id = p_request for update;
  if not found then raise exception 'not_found'; end if;
  if r.status <> 'pending' then raise exception 'request_already_decided'; end if;
  ref := coalesce(nullif(btrim(p_payment_reference), ''), nullif(btrim(r.payment_reference), ''));
  if ref is null or char_length(ref) < 3 then raise exception 'payment_reference_required'; end if;
  amt := coalesce(p_amount_minor, r.expected_amount_minor);
  mths := coalesce(p_months, r.months);
  if amt is null or amt <= 0 then raise exception 'invalid_amount'; end if;
  if mths < 1 or mths > 12 then raise exception 'invalid_months'; end if;
  if exists (select 1 from public.manual_subscriptions where kind = 'payment' and lower(payment_reference) = lower(ref)) then
    raise exception 'payment_reference_already_used';
  end if;
  start_ts := public._next_start(r.user_id, r.requested_plan);
  insert into public.manual_subscriptions (user_id, request_id, plan, kind, amount_minor, currency, payment_reference, starts_at, expires_at, approved_by, admin_notes)
    values (r.user_id, r.id, r.requested_plan, 'payment', amt, r.currency, ref, start_ts, start_ts + make_interval(months => mths), auth.uid(), p_notes)
    returning id into sub_id;
  update public.subscription_requests set status = 'approved', payment_reference = ref, reviewed_by = auth.uid(), reviewed_at = now(),
    admin_notes = coalesce(nullif(btrim(p_notes), ''), admin_notes) where id = r.id;
  perform public._notify(r.user_id, null, 'subscription', 'Subscription approved', 'Your ' || initcap(r.requested_plan) || ' plan is active.');
  return sub_id;
end $$;

create or replace function public.admin_reject_request(p_request uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.subscription_requests%rowtype;
begin
  perform public._require_admin();
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required'; end if;
  select * into r from public.subscription_requests where id = p_request for update;
  if not found then raise exception 'not_found'; end if;
  if r.status <> 'pending' then raise exception 'request_already_decided'; end if;
  update public.subscription_requests set status = 'rejected', rejection_reason = left(btrim(p_reason), 500), reviewed_by = auth.uid(), reviewed_at = now() where id = r.id;
  perform public._notify(r.user_id, null, 'subscription', 'Subscription request not approved', left(btrim(p_reason), 200));
end $$;

create or replace function public.admin_renew_subscription(
  p_subscription uuid, p_months integer, p_payment_reference text, p_amount_minor integer, p_notes text default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.manual_subscriptions%rowtype; start_ts timestamptz; sub_id uuid;
begin
  perform public._require_admin();
  if p_months is null or p_months < 1 or p_months > 12 then raise exception 'invalid_months'; end if;
  if p_amount_minor is null or p_amount_minor <= 0 then raise exception 'invalid_amount'; end if;
  if char_length(btrim(coalesce(p_payment_reference, ''))) < 3 then raise exception 'payment_reference_required'; end if;
  select * into s from public.manual_subscriptions where id = p_subscription;
  if not found then raise exception 'not_found'; end if;
  if exists (select 1 from public.manual_subscriptions where kind = 'payment' and lower(payment_reference) = lower(btrim(p_payment_reference))) then
    raise exception 'payment_reference_already_used';
  end if;
  start_ts := public._next_start(s.user_id, s.plan);
  insert into public.manual_subscriptions (user_id, plan, kind, amount_minor, currency, payment_reference, starts_at, expires_at, approved_by, admin_notes)
    values (s.user_id, s.plan, 'payment', p_amount_minor, s.currency, btrim(p_payment_reference), start_ts, start_ts + make_interval(months => p_months), auth.uid(), p_notes)
    returning id into sub_id;
  perform public._notify(s.user_id, null, 'subscription', 'Subscription renewed', 'Your ' || initcap(s.plan) || ' plan was renewed.');
  return sub_id;
end $$;

create or replace function public.admin_cancel_subscription(p_subscription uuid, p_reason text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare s public.manual_subscriptions%rowtype;
begin
  perform public._require_admin();
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required'; end if;
  select * into s from public.manual_subscriptions where id = p_subscription;
  if not found then raise exception 'not_found'; end if;
  if s.status <> 'active' or s.expires_at <= now() then raise exception 'not_active'; end if;
  -- Cancels this user's current period and any renewal already queued behind it. Rows are kept as history.
  update public.manual_subscriptions set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = left(btrim(p_reason), 500)
    where user_id = s.user_id and status = 'active' and expires_at > now();
  perform public._notify(s.user_id, null, 'subscription', 'Subscription cancelled', 'Your paid plan was cancelled. You are back on Free.');
end $$;

create or replace function public.admin_grant_complimentary(p_user uuid, p_plan text, p_months integer, p_reason text) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare start_ts timestamptz; sub_id uuid;
begin
  perform public._require_admin();
  if p_plan not in ('pro', 'premium') then raise exception 'invalid_plan'; end if;
  if p_months is null or p_months < 1 or p_months > 12 then raise exception 'invalid_months'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'reason_required'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'not_found'; end if;
  start_ts := public._next_start(p_user, p_plan);
  insert into public.manual_subscriptions (user_id, plan, kind, amount_minor, payment_reference, starts_at, expires_at, approved_by, admin_notes)
    values (p_user, p_plan, 'complimentary', 0, null, start_ts, start_ts + make_interval(months => p_months), auth.uid(), left(btrim(p_reason), 1000))
    returning id into sub_id;
  return sub_id;
end $$;

create or replace function public.admin_update_subscription_config(
  p_price_pro_minor integer default null, p_price_premium_minor integer default null, p_payment_instructions text default null,
  p_support_email text default null, p_support_whatsapp text default null, p_automatic_payments boolean default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform public._require_admin();
  update public.subscription_config set
    price_pro_minor = coalesce(p_price_pro_minor, price_pro_minor),
    price_premium_minor = coalesce(p_price_premium_minor, price_premium_minor),
    payment_instructions = coalesce(p_payment_instructions, payment_instructions),
    support_email = coalesce(p_support_email, support_email),
    support_whatsapp = coalesce(p_support_whatsapp, support_whatsapp),
    automatic_payments_enabled = coalesce(p_automatic_payments, automatic_payments_enabled),
    updated_at = now(), updated_by = auth.uid()
    where id;
end $$;

-- ============================================================ privileges
revoke execute on function public.is_admin() from public, anon, authenticated;
revoke execute on function public._require_admin() from public, anon, authenticated;
revoke execute on function public._effective_plan(uuid) from public, anon, authenticated;
revoke execute on function public._next_start(uuid, text) from public, anon, authenticated;
revoke execute on function public.my_subscription() from public, anon, authenticated;
revoke execute on function public.subscription_public_config() from public, anon, authenticated;
revoke execute on function public.admin_list_requests(text) from public, anon, authenticated;
revoke execute on function public.admin_user_subscriptions(uuid) from public, anon, authenticated;
revoke execute on function public.admin_approve_request(uuid, text, integer, integer, text) from public, anon, authenticated;
revoke execute on function public.admin_reject_request(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_renew_subscription(uuid, integer, text, integer, text) from public, anon, authenticated;
revoke execute on function public.admin_cancel_subscription(uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_grant_complimentary(uuid, text, integer, text) from public, anon, authenticated;
revoke execute on function public.admin_update_subscription_config(integer, integer, text, text, text, boolean) from public, anon, authenticated;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_subscription() to authenticated;
grant execute on function public.subscription_public_config() to authenticated;
-- Admin functions are callable by a signed-in user, but each one refuses unless that user is in admin_users.
grant execute on function public.admin_list_requests(text) to authenticated;
grant execute on function public.admin_user_subscriptions(uuid) to authenticated;
grant execute on function public.admin_approve_request(uuid, text, integer, integer, text) to authenticated;
grant execute on function public.admin_reject_request(uuid, text) to authenticated;
grant execute on function public.admin_renew_subscription(uuid, integer, text, integer, text) to authenticated;
grant execute on function public.admin_cancel_subscription(uuid, text) to authenticated;
grant execute on function public.admin_grant_complimentary(uuid, text, integer, text) to authenticated;
grant execute on function public.admin_update_subscription_config(integer, integer, text, text, text, boolean) to authenticated;
