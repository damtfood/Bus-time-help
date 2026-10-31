-- Run in Supabase > SQL Editor AFTER schema_v2_requests.sql
create table ads (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  image_url text,
  link_url text,
  phone text,
  start_date date,
  end_date date,
  sort_order int default 1,
  active boolean default true,
  created_at timestamptz default now()
);
alter table ads enable row level security;
create policy "public read ads" on ads for select using (true);
create policy "admin insert ads" on ads for insert to authenticated with check (is_admin());
create policy "admin update ads" on ads for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete ads" on ads for delete to authenticated using (is_admin());
