-- Run once in Supabase > SQL Editor
alter table buses     add column if not exists phone   text;
alter table temples   add column if not exists phone   text;
alter table helpers   add column if not exists map_url text;
alter table shops     add column if not exists map_url text;
alter table emergency add column if not exists map_url text;

create index if not exists timings_bus_id_idx on timings(bus_id);
create index if not exists buses_active_name_idx on buses(active, name);
create index if not exists helpers_active_sort_idx   on helpers(active, sort_order);
create index if not exists shops_active_sort_idx     on shops(active, sort_order);
create index if not exists emergency_active_sort_idx on emergency(active, sort_order);
create index if not exists temples_active_sort_idx   on temples(active, sort_order);

notify pgrst, 'reload schema';
