-- AgreedLink migration 0004. Created by JNectar. Run after 0001, 0002 and 0003.
-- Adds: profile phone, avatar and terms-acceptance fields; a safer new-user trigger;
-- subscription plans and per-plan active-agreement limits enforced in the database;
-- cancel_agreement; and a private avatars storage bucket with per-user access rules.
-- Nothing here deletes or rewrites existing customer data.

-- ------------------------------------------------------------ profile fields
alter table public.profiles
  add column if not exists phone text not null default '' check (char_length(phone) <= 20),
  add column if not exists avatar_path text check (avatar_path is null or char_length(avatar_path) <= 300),
  add column if not exists terms_accepted_at timestamptz;

-- A user can only point their avatar at a file inside their own folder.
alter table public.profiles
  add constraint profiles_avatar_own_folder check (avatar_path is null or starts_with(avatar_path, id::text || '/'));

grant update (phone, avatar_path) on public.profiles to authenticated;

-- New accounts: read full_name (and the older display_name), an optional valid phone, and terms
-- acceptance from the sign-up metadata. Never creates a duplicate profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare nm text; ph text;
begin
  nm := left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1)), 120);
  ph := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''), ''), 20);
  if ph !~ '^\+[1-9][0-9]{6,14}$' then ph := ''; end if;
  insert into public.profiles (id, display_name, phone, terms_accepted_at)
  values (new.id, nm, ph, case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end)
  on conflict (id) do nothing;
  return new;
end $$;

-- ------------------------------------------------------------ plans and subscriptions
create table if not exists public.plans (
  id text primary key check (id in ('free', 'pro', 'premium')),
  name text not null,
  active_agreements_limit integer not null check (active_agreements_limit > 0)
);
insert into public.plans (id, name, active_agreements_limit) values
  ('free', 'Free', 3), ('pro', 'Pro', 50), ('premium', 'Premium', 200)
on conflict (id) do update set name = excluded.name, active_agreements_limit = excluded.active_agreements_limit;

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  plan text not null default 'free' references public.plans (id),
  status text not null default 'active' check (status in ('active', 'pending', 'past_due', 'cancelled', 'expired')),
  source text not null default 'free' check (source in ('free', 'paystack', 'manual')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  paystack_customer_code text,
  paystack_subscription_code text,
  paystack_email_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
revoke all on public.plans, public.subscriptions from anon, authenticated;
grant select on public.plans, public.subscriptions to authenticated;
create policy plans_read on public.plans for select to authenticated using (true);
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (user_id = auth.uid());

-- Effective plan: a paid plan counts only while active (or past due until the period ends).
create or replace function public._plan_of(p_user uuid) returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce((
    select s.plan from public.subscriptions s
    where s.user_id = p_user and s.plan in ('pro', 'premium') and s.status in ('active', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now())
  ), 'free')
$$;

create or replace function public.my_plan() returns text
language sql stable security definer set search_path = public, pg_temp as $$
  select public._plan_of(auth.uid())
$$;

revoke execute on function public._plan_of(uuid) from public, anon, authenticated;
revoke execute on function public.my_plan() from public, anon, authenticated;
grant execute on function public.my_plan() to authenticated;

-- ------------------------------------------------------------ active agreement limit
-- Active means draft, awaiting approval, or approved. Completed, declined, expired and cancelled
-- agreements are kept and do not count. Replaces the earlier 3-per-month limit.
create or replace function public.create_agreement(
  p_terms jsonb, p_token_hash text, p_token_ciphertext text,
  p_expires_at timestamptz, p_idempotency_key text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  aid uuid;
  active_count integer;
  plan_limit integer;
  creator text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if p_idempotency_key is not null then
    select id into aid from public.agreements where owner_id = uid and idempotency_key = p_idempotency_key;
    if aid is not null then return aid; end if;
  end if;

  select active_agreements_limit into plan_limit from public.plans where id = public._plan_of(uid);
  select count(*) into active_count from public.agreements
    where owner_id = uid and status::text in ('draft', 'awaiting_approval', 'approved');
  if active_count >= coalesce(plan_limit, 3) then raise exception 'plan_limit'; end if;

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

-- ------------------------------------------------------------ cancel an agreement
create or replace function public.cancel_agreement(p_agreement uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare a public.agreements%rowtype;
begin
  select * into a from public.agreements where id = p_agreement and owner_id = auth.uid() for update;
  if not found then raise exception 'not_found'; end if;
  if a.status::text not in ('draft', 'awaiting_approval', 'approved') then raise exception 'invalid_state'; end if;
  if exists (select 1 from public.change_requests where agreement_id = a.id and status in ('pending', 'clarification_requested')) then
    raise exception 'change_already_pending';
  end if;
  update public.agreements set status = 'cancelled', updated_at = now() where id = a.id;
  update public.share_links set revoked_at = now() where agreement_id = a.id and revoked_at is null;
  perform public._event(a.id, null, a.current_version, 'cancelled', 'creator', null, 'recorded_by_app', 'Agreement cancelled by creator. The customer link no longer works.');
end $$;

revoke execute on function public.cancel_agreement(uuid) from public, anon, authenticated;
grant execute on function public.cancel_agreement(uuid) to authenticated;

-- create_agreement was replaced above, so restore its privileges to match 0001.
revoke execute on function public.create_agreement(jsonb, text, text, timestamptz, text) from public, anon, authenticated;
grant execute on function public.create_agreement(jsonb, text, text, timestamptz, text) to authenticated;

-- ------------------------------------------------------------ private avatars bucket
-- Storage itself enforces the 2 MB size limit and the allowed image types.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy avatars_select_own on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_own on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
