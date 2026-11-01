// One cached endpoint for all public data. Vercel CDN serves it, so 1000 visitors do NOT hit Supabase 1000 times.
// Admin changes show on the public page within ~30 seconds.
const Q = [
  ['buses',     'select=*,timings(*)&active=eq.true&order=name'],
  ['ads',       'select=*&active=eq.true&order=sort_order'],
  ['notices',   'select=*&active=eq.true&order=sort_order'],
  ['settings',  'select=*&key=eq.ad_scroll_min'],
  ['helpers',   'select=*&active=eq.true&order=sort_order,name'],
  ['shops',     'select=*&active=eq.true&order=sort_order,name'],
  ['emergency', 'select=*&active=eq.true&order=sort_order,name'],
  ['temples',   'select=*&active=eq.true&order=sort_order,name'],
  ['app_links', 'select=*&active=eq.true&order=sort_order,created_at']
];
module.exports = async (req, res) => {
  const base = process.env.SUPABASE_URL, key = process.env.SUPABASE_ANON_KEY;
  try {
    if (!base || !key) throw new Error('env missing');
    const out = { v: process.env.VILLAGE_NAME || 'Your Village', t: Date.now() };
    await Promise.all(Q.map(async ([t, q]) => {
      try {
        const r = await fetch(`${base}/rest/v1/${t}?${q}`, { headers: { apikey: key }, signal: AbortSignal.timeout(8000) });
        out[t] = r.ok ? await r.json() : [];
        if (t === 'buses' && !r.ok) throw new Error('buses failed');
      } catch (e) { if (t === 'buses') throw e; out[t] = []; }
    }));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=600');
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 500;
    res.setHeader('Cache-Control', 'no-store');
    res.end('{"error":"load failed"}');
  }
};
