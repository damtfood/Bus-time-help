-- schema_v12_places.sql
-- Run ONCE in Supabase > SQL Editor (after schema_v11_features.sql).
-- Adds: City & Village list (places), per-place timings, operator / class on buses.
-- Safe to run again (uses IF NOT EXISTS / ON CONFLICT).

-- 1) Places (cities & villages)
create table if not exists places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_ta text,
  kind text not null default 'village' check (kind in ('city','village')),
  sort_order int default 100,
  is_home boolean not null default false,   -- the default place shown first on the public page
  active boolean default true,
  created_at timestamptz default now()
);
create unique index if not exists places_name_uq  on places (lower(name));
create unique index if not exists places_one_home on places (is_home) where is_home;

alter table places enable row level security;
drop policy if exists "public read places"  on places;
drop policy if exists "admin insert places" on places;
drop policy if exists "admin update places" on places;
drop policy if exists "admin delete places" on places;
create policy "public read places"  on places for select using (true);
create policy "admin insert places" on places for insert to authenticated with check (is_admin());
create policy "admin update places" on places for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin delete places" on places for delete to authenticated using (is_admin());

-- 2) Seed places (Thanikkottagam = default). Edit / delete / add more later in admin > Cities & Villages.
insert into places (name, name_ta, kind, sort_order, is_home) values
  ('Thanikkottagam','தாணிக்கோட்டகம்','village',0,true),
  ('Vedaranyam','வேதாரண்யம்','city',1,false),
  ('Thulasiyapattinam','துளசியாப்பட்டினம்','village',2,false),
  ('Thiruthuraipoondi','திருத்துறைப்பூண்டி','city',3,false),
  ('Pattukkottai','பட்டுக்கோட்டை','city',10,false),
  ('Nagapattinam','நாகப்பட்டினம்','city',10,false),
  ('Mannargudi','மன்னார்குடி','city',10,false),
  ('Thanjavur','தஞ்சாவூர்','city',10,false),
  ('Trichy','திருச்சி','city',10,false),
  ('Madurai','மதுரை','city',10,false),
  ('Salem','சேலம்','city',10,false),
  ('Palani','பழனி','city',10,false),
  ('Thiruppur','திருப்பூர்','city',10,false),
  ('Rameswaram','இராமேஸ்வரம்','city',10,false),
  ('Thiruchendur','திருச்செந்தூர்','city',10,false),
  ('Thiruvarur','திருவாரூர்','city',10,false),
  ('Kodiyakkarai','கோடியக்கரை','village',10,false),
  ('Voimedu','வாய்மேடு','village',10,false),
  ('Idumbavanam','இடும்பாவனம்','village',10,false),
  ('Thondiyakkadu','தொண்டியக்காடு','village',10,false),
  ('Panchanathikulam','பஞ்சநதிக்குளம்','village',10,false),
  ('Siruthalaikkadu','சிறுதலைக்காடு','village',10,false),
  ('Avarikkadu','ஆவாரிக்காடு','village',10,false),
  ('Thennambulam','தென்னம்புலம்','village',10,false),
  ('Ayakkaranpulam','ஆயக்காரன்புலம்','village',10,false)
on conflict do nothing;

-- 3) Each timing now belongs to a place (the stop where that time is valid)
alter table timings add column if not exists place_id uuid references places(id) on delete cascade;
create index if not exists timings_place_idx on timings(place_id);

-- old timings (entered before this update) belong to the default place
update timings set place_id = (select id from places where is_home limit 1) where place_id is null;

-- new timings without a place automatically go to the default place
create or replace function timings_default_place() returns trigger
language plpgsql as $$
begin
  if new.place_id is null then
    select id into new.place_id from places where is_home limit 1;
  end if;
  return new;
end $$;
drop trigger if exists timings_default_place_trg on timings;
create trigger timings_default_place_trg before insert on timings
  for each row execute function timings_default_place();

-- 4) Extra bus details
alter table buses add column if not exists operator      text;   -- e.g. TNSTC Vedaranyam, Ganesa
alter table buses add column if not exists service_class text;   -- Ordinary / Express / SF Express / Town

-- 5) Public correction requests remember the place
alter table requests add column if not exists place_id uuid references places(id) on delete set null;

-- 6) Atomic "make this the default place" (admin only)
create or replace function set_home_place(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not admin'; end if;
  update places set is_home = false where is_home and id <> p_id;
  update places set is_home = true  where id = p_id;
end $$;
revoke all on function set_home_place(uuid) from public, anon;
grant execute on function set_home_place(uuid) to authenticated;

notify pgrst, 'reload schema';
