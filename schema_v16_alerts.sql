-- Run once in Supabase > SQL Editor (after schema_v15_helpers_city.sql)
-- Bus alerts (notify me before a bus leaves) + web-push subscriptions.
create table if not exists bus_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bus_id uuid references buses(id) on delete cascade,
  bus_name text not null,
  place_name text,
  dep_time time not null,                       -- bus departure time (IST)
  days text not null default 'Daily',           -- same text as the timing's days
  minutes_before int not null default 10 check (minutes_before between 0 and 180),
  tone text not null default 'default',         -- default | chime | bell | horn | alarm | soft | phone
  fire_on date,                                 -- null = repeat on its days; a date = only once on that day
  enabled boolean not null default true,
  last_sent date,
  created_at timestamptz default now()
);
create index if not exists bus_alerts_due_idx on bus_alerts (enabled, last_sent);
create index if not exists bus_alerts_user_idx on bus_alerts (user_id);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  created_at timestamptz default now()
);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table bus_alerts enable row level security;
alter table push_subscriptions enable row level security;
drop policy if exists "own alerts" on bus_alerts;
drop policy if exists "own push subs" on push_subscriptions;
create policy "own alerts" on bus_alerts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own push subs" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- max 30 alerts per person
create or replace function bus_alerts_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from bus_alerts where user_id = new.user_id) >= 30 then
    raise exception 'You can set up to 30 alerts. Please delete some old ones.';
  end if;
  return new;
end $$;
drop trigger if exists bus_alerts_limit_trg on bus_alerts;
create trigger bus_alerts_limit_trg before insert on bus_alerts
  for each row execute function bus_alerts_limit();

notify pgrst, 'reload schema';

-- ------------------------------------------------------------------
-- OPTIONAL (free, no extra website): let Supabase call the sender every minute.
-- 1) Dashboard > Database > Extensions: enable  pg_cron  and  pg_net
-- 2) Replace YOUR-SITE and YOUR-CRON-SECRET (same value as the CRON_SECRET env in Vercel), then run:
--
-- select cron.schedule('bus-alerts', '* * * * *',
--   $$ select net.http_get(url := 'https://YOUR-SITE.vercel.app/api/send-alerts?key=YOUR-CRON-SECRET') $$);
--
-- To stop it later:  select cron.unschedule('bus-alerts');
-- ------------------------------------------------------------------
