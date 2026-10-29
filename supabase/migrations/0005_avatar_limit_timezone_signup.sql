-- AgreedLink migration 0005. Created by JNectar. Run after 0004.
-- 1) Raises the profile photo limit to 5 MB (the app compresses photos before upload).
-- 2) New accounts use the time zone detected on the sign-up device (falling back to Africa/Lagos).
--    Users in Lagos start with NGN as their default currency, everyone else with USD.
-- Existing profiles, agreements and amounts are not changed.

update storage.buckets set file_size_limit = 5242880 where id = 'avatars';

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare nm text; ph text; tz text; cur text;
begin
  nm := left(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    split_part(new.email, '@', 1)), 120);
  ph := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''), ''), 20);
  if ph !~ '^\+[1-9][0-9]{6,14}$' then ph := ''; end if;

  tz := nullif(btrim(new.raw_user_meta_data ->> 'timezone'), '');
  if tz is null or not exists (select 1 from pg_timezone_names where name = tz) then tz := 'Africa/Lagos'; end if;
  cur := case when tz = 'Africa/Lagos' then 'NGN' else 'USD' end;

  insert into public.profiles (id, display_name, phone, terms_accepted_at, timezone, default_currency)
  values (new.id, nm, ph,
          case when new.raw_user_meta_data ->> 'terms_accepted' = 'true' then now() else null end,
          tz, cur)
  on conflict (id) do nothing;
  return new;
end $$;
