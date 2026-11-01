// Counts ad views/clicks. The browser calls this; the Supabase key stays on the server.
module.exports = async (req, res) => {
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' || !base || !key) { res.statusCode = 405; return res.end(); }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  const k = b.k === 'c' ? 'c' : 'v';
  const ids = (Array.isArray(b.ids) ? b.ids : []).slice(0, 20).filter(i => /^[0-9a-f-]{36}$/i.test(String(i)));
  await Promise.all(ids.map(id => fetch(`${base}/rest/v1/rpc/ad_hit`, {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_id: id, p_kind: k }),
    signal: AbortSignal.timeout(6000)
  }).catch(() => {})));
  res.statusCode = 204; res.end();
};
