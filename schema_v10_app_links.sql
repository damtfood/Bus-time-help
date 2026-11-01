-- Run once in Supabase > SQL Editor (after schema_v2_requests.sql, which creates is_admin())
create table if not exists app_links (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null check (url ~* '^https?://'),
  platform text not null default 'android' check (platform in ('android','windows','ios','other')),
  sort_order int default 1,
  active boolean default true,
  created_at timestamptz default now()
);
alter table app_links enable row level security;
create policy "public read app_links" on app_links for select using (true);
create policy "admin insert app_links" on app_links for insert to authenticated with check (is_admin());
create policy "admin update app_links" on app_links for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete app_links" on app_links for delete to authenticated using (is_admin());
notify pgrst, 'reload schema';
