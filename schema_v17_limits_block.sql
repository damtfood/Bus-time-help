-- Run once in Supabase > SQL Editor (after schema_v16_alerts.sql)
-- Admin-controlled request limits + blocking users.
create table if not exists app_limits (
  id int primary key default 1 check (id = 1),
  max_pending int not null default 20 check (max_pending between 1 and 1000),
  max_per_day int not null default 50 check (max_per_day between 1 and 5000),
  updated_at timestamptz default now()
);
insert into app_limits (id) values (1) on conflict do nothing;
alter table app_limits enable row level security;
drop policy if exists "admin reads limits" on app_limits;
drop policy if exists "admin updates limits" on app_limits;
create policy "admin reads limits" on app_limits for select to authenticated using (is_admin());
create policy "admin updates limits" on app_limits for update to authenticated using (is_admin()) with check (is_admin());

create table if not exists blocked_users (
  email text primary key,
  reason text,
  created_at timestamptz default now()
);
alter table blocked_users enable row level security;
drop policy if exists "admin manages blocked" on blocked_users;
create policy "admin manages blocked" on blocked_users for all to authenticated using (is_admin()) with check (is_admin());

-- is the logged-in person blocked?  (used by the website to show the "blocked" screen)
create or replace function is_blocked() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from blocked_users where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;
grant execute on function is_blocked() to authenticated;

-- replaces the old fixed limits (5 waiting / 15 per day) with the numbers set by the admin
create or replace function submissions_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare mp int; md int;
begin
  if exists (select 1 from blocked_users where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'Your account is blocked by the admin.';
  end if;
  select max_pending, max_per_day into mp, md from app_limits where id = 1;
  mp := coalesce(mp, 20); md := coalesce(md, 50);
  if (select count(*) from submissions where user_id = new.user_id and status = 'pending') >= mp then
    raise exception 'You already have % requests waiting for the admin. Please wait for approval.', mp;
  end if;
  if (select count(*) from submissions where user_id = new.user_id and created_at > now() - interval '1 day') >= md then
    raise exception 'Daily limit reached. Please try again tomorrow.';
  end if;
  return new;
end $$;

notify pgrst, 'reload schema';
