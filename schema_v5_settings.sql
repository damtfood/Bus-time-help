-- Run in Supabase > SQL Editor AFTER schema_v4_notices.sql
create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table settings enable row level security;
create policy "public read settings" on settings for select using (true);
create policy "admin insert settings" on settings for insert to authenticated with check (is_admin());
create policy "admin update settings" on settings for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete settings" on settings for delete to authenticated using (is_admin());
insert into settings (key, value) values ('ad_scroll_min', '1') on conflict do nothing;
