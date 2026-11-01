-- Run once in Supabase > SQL Editor (after schema_v2_requests.sql, which creates is_admin())
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  rating int check (rating between 1 and 5),
  message text not null check (char_length(message) between 1 and 1000),
  user_id uuid not null default auth.uid(),
  user_email text default (auth.jwt() ->> 'email'),
  user_name text default (auth.jwt() -> 'user_metadata' ->> 'full_name'),
  status text not null default 'new' check (status in ('new','done')),
  created_at timestamptz default now()
);
alter table feedback enable row level security;

-- any Google-logged-in user can send feedback (only as themselves)
create policy "user sends feedback" on feedback for insert to authenticated
  with check (user_id = auth.uid() and status = 'new');
-- only the admin can read / update / delete
create policy "admin reads feedback"   on feedback for select to authenticated using (is_admin());
create policy "admin updates feedback" on feedback for update to authenticated using (is_admin()) with check (is_admin());
create policy "admin deletes feedback" on feedback for delete to authenticated using (is_admin());

-- spam guard: max 5 feedback per user per day
create or replace function feedback_limit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from feedback where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many feedback messages today. Please try tomorrow.';
  end if;
  return new;
end $$;
drop trigger if exists feedback_limit_trg on feedback;
create trigger feedback_limit_trg before insert on feedback for each row execute function feedback_limit();

create index if not exists feedback_created_idx on feedback(created_at desc);
notify pgrst, 'reload schema';
