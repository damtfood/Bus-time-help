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

## v12 + v13: Cities & Villages, place-wise timings, government bus import
1. Supabase > SQL Editor: run `schema_v12_places.sql` (places table, place_id on timings, operator / class on buses).
2. Then run `schema_v13_govt_buses.sql` (all buses from the Excel + timetable pictures). Safe to run twice.
3. Deploy the new `index.html`, `admin.html`, `api/data.js`.
4. Public page: default = Thanikkottagam. Pick another place from the dropdown or type 2 letters in the search box.
5. Admin > "Cities & Villages": add / edit / delete places, "Make default". In the bus list, every timing is added with its place.

## v14: Customer "Add bus / vehicle", Control center, Control APK
**1. Database:** Supabase > SQL Editor > run `schema_v14_submissions.sql`.

**2. Auto tab:** `index.html` now shows All / Auto / Car / Tractor / Other chips inside the Auto tab (uses the `Type` field of each entry; "Van" and "Other" show under Other).

**3. Customer page `/add`:** Google login is mandatory. Customers send a bus (with timings) or a vehicle. Nothing is published until the admin approves. Max 5 waiting requests per customer.

**4. Control center `/control`:** admin email + password login (same admin as before). Approve = auto-publish to buses/timings or to the Auto tab. Reject can carry a reason the customer sees.

**5. Mail to admin when a request arrives** (Vercel > Settings > Environment Variables, then redeploy):
- `RESEND_API_KEY` (free key from resend.com)  - `ADMIN_EMAIL` (your mail)
- optional `MAIL_FROM` (needs a domain verified in Resend; default `onboarding@resend.dev` can only mail the Resend account owner's email) and `SITE_URL`.
If these are missing the request still saves; only the mail is skipped.

**6. Control APK (admin only):** folder `android-control/`.
- Easiest: push to GitHub > Settings > Secrets and variables > Actions > Variables > add `SITE_URL` = `https://your-site.vercel.app` > Actions tab > "Build Control APK" > Run workflow > download `BusControl-apk`.
- Or Android Studio: open `android-control`, set `SITE_URL` in `app/build.gradle` (or `-PSITE_URL=...`), Build > Build APK.
- It is a debug-signed APK (fine for installing on your own phone). For Play Store you need a release keystore.

## v15: City / village for vehicles
Run `schema_v15_helpers_city.sql` once in Supabase (after v14). Every auto / car / tractor / other vehicle now has a city or village (default Thanikkottagam).
- Index > Auto tab: city dropdown + search, then All / Auto / Car / Tractor / Other chips for that city.
- `add.html` and `admin-help.html`: choose the city when adding. Control approve copies the city to the public list.
- Cities come from the same `places` list used by buses (admin > Cities & Villages).
