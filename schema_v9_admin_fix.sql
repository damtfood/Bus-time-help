-- Run once in Supabase > SQL Editor
-- Makes the admin email check case-insensitive (Dhinesh@gmail.com = dhinesh@gmail.com)
create or replace function is_admin() returns boolean
language sql security definer stable set search_path = public as
$$ select exists (select 1 from admins where lower(email) = lower(auth.jwt() ->> 'email')) $$;
update admins set email = lower(email);
