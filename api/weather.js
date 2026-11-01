// Cached weather + rain nowcast. Vercel CDN serves it for 5 min, so visitors do NOT hit Open-Meteo each time.
// Optional Vercel env vars: WEATHER_LAT, WEATHER_LON (default is near Thanikkottagam).
module.exports = async (req, res) => {
  const lat = process.env.WEATHER_LAT || '10.44', lon = process.env.WEATHER_LON || '79.68';
  try {
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,precipitation,is_day&minutely_15=precipitation&forecast_minutely_15=8&timezone=Asia%2FKolkata`;
    const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error('weather failed');
    const j = await r.json(), c = j.current || {}, m = j.minutely_15 || {};
    const IST = 19800000, now = Date.now();
    // each 15-min value = rain in the 15 min BEFORE that time, so rain can start up to 15 min earlier
    let rainAt = null, mm = 0;
    (m.time || []).forEach((t, i) => {
      const p = (m.precipitation || [])[i] || 0, end = Date.parse(t + ':00Z') - IST;
      if (rainAt === null && p >= 0.1 && end > now) { rainAt = Math.max(now, end - 900000); mm = p }
    });
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=900');
    res.end(JSON.stringify({ temp: c.temperature_2m, code: c.weather_code, day: c.is_day, rainNow: (c.precipitation || 0) >= 0.1, rainAt, mm, t: now }));
  } catch (e) {
    res.statusCode = 500; res.setHeader('Cache-Control', 'no-store'); res.end('{"error":"weather failed"}');
  }
};
