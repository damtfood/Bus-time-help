-- Run this in Supabase > SQL Editor AFTER schema.sql
-- 1) Real admin check (Google users must NOT get write access)
create table admins (email text primary key);
insert into admins values ('YOUR-ADMIN-EMAIL');   -- << change to your admin login email

create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from admins where email = (auth.jwt() ->> 'email')) $$;
alter table admins enable row level security;     -- no policies = nobody can read it directly

drop policy "admin write buses" on buses;
drop policy "admin write timings" on timings;
create policy "admin insert buses"  on buses   for insert to authenticated with check (is_admin());
create policy "admin update buses"  on buses   for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete buses"  on buses   for delete to authenticated using (is_admin());
create policy "admin insert timings" on timings for insert to authenticated with check (is_admin());
create policy "admin update timings" on timings for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete timings" on timings for delete to authenticated using (is_admin());

-- 2) Correction requests from public users
create table requests (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references buses(id) on delete cascade,
  timing_id uuid references timings(id) on delete set null,
  type text not null check (type in ('wrong_time','add_time','remove_time','other')),
  proposed_time time,
  proposed_days text,
  message text check (char_length(message) <= 300),
  user_id uuid not null default auth.uid(),
  user_email text default (auth.jwt() ->> 'email'),
  user_name text default (auth.jwt() -> 'user_metadata' ->> 'full_name'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);
alter table requests enable row level security;
create policy "user sends request" on requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "user or admin reads" on requests for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy "admin updates requests" on requests for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin deletes requests" on requests for delete to authenticated using (is_admin());
