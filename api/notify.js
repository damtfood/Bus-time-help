// Vercel serverless: emails the admin when a customer sends a new "add bus / vehicle" request.
// Vercel > Settings > Environment Variables:
//   RESEND_API_KEY  (free account at resend.com)    ADMIN_EMAIL  (where the mail goes; comma separated allowed)
//   MAIL_FROM  (optional, default "Bus Timings <onboarding@resend.dev>")    SITE_URL (optional, https://your-site.vercel.app)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const one = s => String(s ?? '').replace(/[\r\n]+/g, ' ').slice(0, 120);
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.statusCode = 405; return res.end('{"error":"POST only"}'); }
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  const rk = process.env.RESEND_API_KEY, to = (process.env.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
  const auth = req.headers.authorization || '';
  let id = req.body && req.body.id;
  if (typeof req.body === 'string') { try { id = JSON.parse(req.body).id } catch (e) {} }
  const fail = (c, m) => { res.statusCode = c; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: m })) };
  if (!base || !key || !rk || !to.length) return fail(500, 'mail not configured');
  if (!/^Bearer \S+$/.test(auth) || !/^[0-9a-f-]{36}$/i.test(id || '')) return fail(400, 'bad request');
  try {
    // RLS lets a customer read only their own row, so this also proves the caller owns it
    const r = await fetch(`${base}/rest/v1/submissions?id=eq.${id}&select=*`, { headers: { apikey: key, Authorization: auth }, signal: AbortSignal.timeout(8000) });
    const rows = r.ok ? await r.json() : [];
    const s = rows[0];
    if (!s) return fail(404, 'not found');
    if (s.status !== 'pending' || Date.now() - new Date(s.created_at).getTime() > 10 * 60 * 1000) return fail(409, 'too old');
    const d = s.data || {};
    const site = process.env.SITE_URL || `https://${req.headers.host}`;
    const title = s.kind === 'bus' ? `🚌 ${d.name || ''} (${d.from_place || ''} → ${d.to_place || ''})` : `🛺 ${d.kind || ''} · ${d.name || ''}`;
    const lines = Object.entries(d).filter(([k, v]) => k !== 'timings' && k !== 'place_id' && v !== '' && v != null && v !== false)
      .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#6b7c80">${esc(k)}</td><td><b>${esc(v === true ? 'Yes' : v)}</b></td></tr>`).join('');
    const tm = Array.isArray(d.timings) && d.timings.length ? `<p><b>Timings:</b> ${d.timings.map(t => esc(`${t.time} ${t.days || ''} ${t.place ? '@ ' + t.place : ''}`)).join(' · ')}</p>` : '';
    const html = `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e3a92b;border-radius:14px;overflow:hidden">
<div style="background:#0B1B20;color:#E3A92B;padding:16px 20px;font-size:18px"><b>New ${esc(s.kind)} request</b></div>
<div style="padding:16px 20px"><h3 style="margin:0 0 8px">${esc(title)}</h3><table>${lines}</table>${tm}
<p style="color:#6b7c80">From: ${esc(s.user_name || '')} &lt;${esc(s.user_email || '')}&gt;</p>
<a href="${esc(site)}/control" style="display:inline-block;background:#E3A92B;color:#1a1200;padding:10px 20px;border-radius:99px;text-decoration:none;font-weight:700">Open Control · Approve / Reject</a></div></div>`;
    const m = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${rk}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ from: process.env.MAIL_FROM || 'Bus Timings <onboarding@resend.dev>', to, subject: one(`New request: ${title}`), html, reply_to: s.user_email || undefined })
    });
    if (!m.ok) return fail(502, 'mail failed');
    res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true}');
  } catch (e) { fail(500, 'failed') }
};
