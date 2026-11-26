// Vercel serverless: sends the "bus leaves soon" web-push notifications. Call it every minute (see schema_v16_alerts.sql).
// Vercel env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Supabase > Settings > API, keep secret!), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
//             VAPID_SUBJECT (optional, mailto:you@mail.com), CRON_SECRET (any long random text)
const webpush = require('web-push');
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const f12 = t => { const [h, m] = String(t).split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` };
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
  const out = (c, o) => { res.statusCode = c; res.end(JSON.stringify(o)) };
  const secret = process.env.CRON_SECRET, key = (req.query && req.query.key) || req.headers['x-cron-secret'];
  if (!secret || key !== secret) return out(401, { error: 'unauthorized' });
  const base = process.env.SUPABASE_URL, sk = process.env.SUPABASE_SERVICE_ROLE_KEY, pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!base || !sk || !pub || !priv) return out(500, { error: 'env missing' });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:' + (process.env.ADMIN_EMAIL || 'admin@example.com').split(',')[0].trim(), pub, priv);
  const H = { apikey: sk, Authorization: 'Bearer ' + sk, 'Content-Type': 'application/json' };
  try {
    const ist = new Date(Date.now() + 19800000);                        // India time (UTC+5:30)
    const today = ist.toISOString().slice(0, 10), nowMin = ist.getUTCHours() * 60 + ist.getUTCMinutes(), dn = DAYS[ist.getUTCDay()];
    const q = `enabled=eq.true&or=(last_sent.is.null,last_sent.neq.${today})&select=*&limit=2000`;
    const ar = await fetch(`${base}/rest/v1/bus_alerts?${q}`, { headers: H, signal: AbortSignal.timeout(8000) });
    if (!ar.ok) return out(502, { error: 'alerts query failed' });
    const due = (await ar.json()).filter(a => {
      const days = String(a.days || 'Daily').toLowerCase();
      if (a.fire_on ? a.fire_on !== today : !(days.includes('daily') || days.includes(dn))) return false;
      const [h, m] = String(a.dep_time).split(':').map(Number), dep = h * 60 + m, trg = Math.max(0, dep - a.minutes_before);
      return nowMin >= trg && nowMin <= dep;                            // inside the window until the bus leaves
    });
    if (!due.length) return out(200, { due: 0, sent: 0 });
    const ids = [...new Set(due.map(a => a.user_id))];
    const sr = await fetch(`${base}/rest/v1/push_subscriptions?user_id=in.(${ids.join(',')})&select=*`, { headers: H, signal: AbortSignal.timeout(8000) });
    const subs = sr.ok ? await sr.json() : [];
    let sent = 0;
    for (const a of due) {
      const [h, m] = String(a.dep_time).split(':').map(Number), left = Math.max(0, h * 60 + m - nowMin);
      const payload = JSON.stringify({
        title: '🚌 ' + a.bus_name,
        body: `${a.place_name ? a.place_name + ' · ' : ''}${f12(a.dep_time)} — ${left ? left + ' நிமிடத்தில் புறப்படும் · leaves in ' + left + ' min' : 'இப்போது புறப்படுகிறது · leaving now'}`,
        tone: a.tone || 'default', tag: 'alert-' + a.id + '-' + today, url: '/'
      });
      for (const s of subs.filter(x => x.user_id === a.user_id)) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: 'high' }); sent++ }
        catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await fetch(`${base}/rest/v1/push_subscriptions?id=eq.${s.id}`, { method: 'DELETE', headers: H }).catch(() => {}) }
      }
      await fetch(`${base}/rest/v1/bus_alerts?id=eq.${a.id}`, { method: 'PATCH', headers: H, body: JSON.stringify(a.fire_on ? { last_sent: today, enabled: false } : { last_sent: today }) }).catch(() => {});
    }
    out(200, { due: due.length, sent });
  } catch (e) { out(500, { error: 'failed' }) }
};
