# Village Bus Timings

Static site (HTML + Supabase). No server needed.

1. Supabase: create project. SQL Editor: run `schema.sql`, then `schema_v2_requests.sql`, then `schema_v3_ads.sql`, then `schema_v4_notices.sql`, then `schema_v5_settings.sql`
   (change YOUR-ADMIN-EMAIL in it first).
2. Authentication > Users > Add user: your admin email + password.
3. Keep "Allow new users to sign up" ON (public users join with Google).
   Safe: only emails listed in the `admins` table can change data.
4. Google login:
   - Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web).
     Authorized redirect URI: https://YOUR-PROJECT.supabase.co/auth/v1/callback
   - Supabase > Authentication > Providers > Google: enable, paste Client ID + Secret.
   - Supabase > Authentication > URL Configuration: Site URL = your Vercel URL,
     add the same URL under Redirect URLs.
5. Edit `config.js` (Project URL, anon key, village name).
6. Push to GitHub, import in Vercel, Deploy.
7. Public page: `/`   Admin page: `/admin.html`

## v6: Help tabs (Auto & Car, Shops, Emergency, Temples)
- Run `schema_v6_help.sql` in Supabase SQL Editor.
- Public page: `/` (tab "ஆட்டோ & உதவி", link `/#help`)   Admin page: `/admin-help.html`
- New tab later: add one object in `sections.js` + one table in SQL.

## Keys not in GitHub (Vercel)
- Vercel > Settings > Environment Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VILLAGE_NAME`. Redeploy.
- Pages now load `/api/config` (api/config.js) instead of config.js.
- The anon key is public by design (browser needs it). Real protection = RLS + `admins` table.
- Never put the `service_role` key anywhere in this project.
