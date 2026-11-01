// Vercel serverless: values come from Vercel > Settings > Environment Variables (not stored in GitHub)
module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=86400, stale-while-revalidate=604800');
  const j = v => JSON.stringify(v || '');
  res.end(`const SUPABASE_URL=${j(process.env.SUPABASE_URL)};const SUPABASE_ANON_KEY=${j(process.env.SUPABASE_ANON_KEY)};const VILLAGE_NAME=${j(process.env.VILLAGE_NAME || 'Your Village')};`);
};
