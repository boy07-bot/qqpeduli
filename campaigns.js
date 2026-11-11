import { sql } from '../lib/db.js';
import { allow, safe } from '../lib/util.js';

export default safe(async (req, res) => {
  if (!allow(req, res, 'GET')) return;
  const campaigns = await sql`
    select id, emoji as e, title as t, description as d, category as k,
           goal::float8 as g, raised::float8 as r,
           greatest(0, coalesce(ends_at - current_date, 0)) as days
    from campaigns order by id`;
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  res.json({ campaigns });
});
