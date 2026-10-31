-- Run this in Supabase > SQL Editor
create table buses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bus_no text,
  from_place text not null,
  to_place text not null,
  via text,
  bus_type text default 'Government',
  image_url text,
  fare text,
  notes text,
  active boolean default true,
  created_at timestamptz default now()
);
create table timings (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references buses(id) on delete cascade,
  departure_time time not null,
  days text not null default 'Daily',   -- 'Daily' or 'Mon,Wed,Fri'
  stop text,
  created_at timestamptz default now()
);
alter table buses enable row level security;
alter table timings enable row level security;
-- everyone can read
create policy "public read buses" on buses for select using (true);
create policy "public read timings" on timings for select using (true);
-- only logged-in admin can change
create policy "admin write buses" on buses for all to authenticated using (true) with check (true);
create policy "admin write timings" on timings for all to authenticated using (true) with check (true);
