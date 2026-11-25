-- Run once in Supabase > SQL Editor (after schema_v14_submissions.sql)
-- Every auto / car / tractor / other vehicle now belongs to a city or village (places table).
alter table helpers add column if not exists place_id uuid references places(id) on delete set null;
create index if not exists helpers_place_idx on helpers(place_id);

-- old entries belong to the default place (Thanikkottagam)
update helpers set place_id = (select id from places where is_home limit 1) where place_id is null;

-- new entries without a place automatically go to the default place
create or replace function helpers_default_place() returns trigger
language plpgsql as $$
begin
  if new.place_id is null then
    select id into new.place_id from places where is_home limit 1;
  end if;
  return new;
end $$;
drop trigger if exists helpers_default_place_trg on helpers;
create trigger helpers_default_place_trg before insert on helpers
  for each row execute function helpers_default_place();

notify pgrst, 'reload schema';
