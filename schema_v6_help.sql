-- Run in Supabase > SQL Editor AFTER schema_v5_settings.sql
create table helpers  (id uuid primary key default gen_random_uuid(), active boolean default true, sort_order int default 1, created_at timestamptz default now(),
  name text not null, kind text default 'Auto', phone text, area text, rate text, night_available boolean default false, night_extra text, notes text, image_url text);
create table shops    (id uuid primary key default gen_random_uuid(), active boolean default true, sort_order int default 1, created_at timestamptz default now(),
  name text not null, category text, phone text, address text, hours text, notes text, image_url text);
create table emergency(id uuid primary key default gen_random_uuid(), active boolean default true, sort_order int default 1, created_at timestamptz default now(),
  name text not null, category text, phone text, notes text);
create table temples  (id uuid primary key default gen_random_uuid(), active boolean default true, sort_order int default 1, created_at timestamptz default now(),
  name text not null, morning_time text, evening_time text, notes text, map_url text, image_url text);
do $$ declare t text; begin
foreach t in array array['helpers','shops','emergency','temples'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy "public read %1$s" on %1$I for select using (true)', t);
  execute format('create policy "admin insert %1$s" on %1$I for insert to authenticated with check (is_admin())', t);
  execute format('create policy "admin update %1$s" on %1$I for update to authenticated using (is_admin()) with check (is_admin())', t);
  execute format('create policy "admin delete %1$s" on %1$I for delete to authenticated using (is_admin())', t);
end loop; end $$;
