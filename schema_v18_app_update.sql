-- v18: Android app update prompt. Run once in Supabase > SQL Editor.
-- 1) Apps whose versionCode is below this number are asked to install the new APK.
--    (Apps that have no AndroidBridge.syncAlerts are always treated as old.)
insert into settings (key, value) values ('app_min_code', '0') on conflict (key) do nothing;
-- When you release a new APK: update settings set value = '2' where key = 'app_min_code';

-- 2) The "Install update" button opens the FIRST active Android link in app_links.
--    Add it here (or in Admin > app links), replacing the URL with your hosted APK:
-- insert into app_links (label, url, platform, sort_order)
-- values ('Thanikkottagam Bus App (new)', 'https://YOUR-SITE.vercel.app/BusTimings.apk', 'android', 1);
notify pgrst, 'reload schema';
