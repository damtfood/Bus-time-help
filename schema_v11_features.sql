-- Run once in Supabase > SQL Editor (after schema_v10_app_links.sql)

-- 1) Ad views / clicks counter (one row per ad per day)
create table if not exists ad_stats (
  ad_id uuid not null references ads(id) on delete cascade,
  day date not null,
  views int not null default 0,
  clicks int not null default 0,
  primary key (ad_id, day)
);
alter table ad_stats enable row level security;
create policy "admin reads ad_stats"   on ad_stats for select to authenticated using (is_admin());
create policy "admin deletes ad_stats" on ad_stats for delete to authenticated using (is_admin());

create or replace function ad_hit(p_id uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('v','c') then return; end if;
  if not exists (select 1 from ads where id = p_id) then return; end if;
  insert into ad_stats (ad_id, day, views, clicks)
  values (p_id, (now() at time zone 'Asia/Kolkata')::date, case when p_kind='v' then 1 else 0 end, case when p_kind='c' then 1 else 0 end)
  on conflict (ad_id, day) do update
    set views = ad_stats.views + excluded.views, clicks = ad_stats.clicks + excluded.clicks;
end $$;
grant execute on function ad_hit(uuid, text) to anon, authenticated;

-- 2) Festival / special buses
create table if not exists special_buses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  route text,
  bus_date date,
  dep_time text,
  notes text,
  phone text,
  sort_order int default 1,
  active boolean default true,
  created_at timestamptz default now()
);
alter table special_buses enable row level security;
create policy "public read special_buses"  on special_buses for select using (true);
create policy "admin insert special_buses" on special_buses for insert to authenticated with check (is_admin());
create policy "admin update special_buses" on special_buses for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete special_buses" on special_buses for delete to authenticated using (is_admin());

-- 3) Village news tab (water cut, power cut, ration, school, market rate...)
create table if not exists local_news (
  id uuid primary key default gen_random_uuid(),
  active boolean default true,
  sort_order int default 1,
  created_at timestamptz default now(),
  title text not null,
  category text,
  news_date text,
  details text,
  phone text,
  image_url text
);
alter table local_news enable row level security;
create policy "public read local_news"  on local_news for select using (true);
create policy "admin insert local_news" on local_news for insert to authenticated with check (is_admin());
create policy "admin update local_news" on local_news for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete local_news" on local_news for delete to authenticated using (is_admin());

notify pgrst, 'reload schema';
