-- Run in Supabase > SQL Editor AFTER schema_v3_ads.sql
create table notices (
  id uuid primary key default gen_random_uuid(),
  kind text default 'wish' check (kind in ('wish','news')),
  emoji text,
  title text not null,
  body text,
  start_date date,
  end_date date,
  sort_order int default 1,
  active boolean default true,
  created_at timestamptz default now()
);
alter table notices enable row level security;
create policy "public read notices" on notices for select using (true);
create policy "admin insert notices" on notices for insert to authenticated with check (is_admin());
create policy "admin update notices" on notices for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete notices" on notices for delete to authenticated using (is_admin());
