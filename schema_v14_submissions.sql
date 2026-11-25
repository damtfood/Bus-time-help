-- Run once in Supabase > SQL Editor (after schema_v13_govt_buses.sql)
-- Customer "Add my bus / vehicle" requests. Customers must be logged in. Only admin can approve.
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bus','vehicle')),
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 8000),
  user_id uuid not null default auth.uid(),
  user_email text default (auth.jwt() ->> 'email'),
  user_name text default (auth.jwt() -> 'user_metadata' ->> 'full_name'),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);
create index if not exists submissions_status_idx on submissions (status, created_at);

alter table submissions enable row level security;
drop policy if exists "user adds submission"   on submissions;
drop policy if exists "user or admin reads"    on submissions;
drop policy if exists "admin updates submission" on submissions;
drop policy if exists "admin deletes submission" on submissions;
create policy "user adds submission" on submissions for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy "user or admin reads submission" on submissions for select to authenticated
  using (user_id = auth.uid() or is_admin());
create policy "admin updates submission" on submissions for update to authenticated
  using (is_admin()) with check (is_admin());
create policy "admin deletes submission" on submissions for delete to authenticated
  using (is_admin());

-- spam guard: max 5 waiting + max 15 per day per customer
create or replace function submissions_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from submissions where user_id = new.user_id and status = 'pending') >= 5 then
    raise exception 'You already have 5 requests waiting for the admin. Please wait for approval.';
  end if;
  if (select count(*) from submissions where user_id = new.user_id and created_at > now() - interval '1 day') >= 15 then
    raise exception 'Daily limit reached. Please try again tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists submissions_limit_trg on submissions;
create trigger submissions_limit_trg before insert on submissions
  for each row execute function submissions_limit();

notify pgrst, 'reload schema';
