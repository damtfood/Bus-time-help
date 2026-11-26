-- v18: App update control (Admin > "App update" tab). Run once in Supabase > SQL Editor.
-- Needs the settings table (schema_v5) and app_links table (schema_v10).
-- Everything is edited from the admin page; these are just the default values.
insert into settings (key, value) values
  ('upd_mode', 'optional'),   -- off | optional | force
  ('upd_target', 'both'),     -- both | old | below | all
  ('upd_min_code', '0'),
  ('upd_snooze_h', '3'),
  ('upd_show_web', '1'),
  ('upd_epoch', '0')
on conflict (key) do nothing;
notify pgrst, 'reload schema';
