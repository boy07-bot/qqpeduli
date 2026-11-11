import { sql } from '../lib/db.js';
import { auth, body, allow, safe } from '../lib/util.js';

const STATUS = ['received', 'assigned', 'enroute', 'arrived', 'done'];
const hav = (a, b, c, d) => {
  const t = (x) => (x * Math.PI) / 180, u = t(c - a), v = t(d - b);
  const h = Math.sin(u / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(v / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
async function notify(text) {
  const k = process.env.TELEGRAM_BOT_TOKEN, c = process.env.TELEGRAM_CHAT_ID;
  if (!k || !c) return;
  try {
    await fetch(`https://api.telegram.org/bot${k}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: c, text }),
    });
  } catch { /* notifikasi gagal tidak boleh membatalkan permintaan */ }
}

export default safe(async (req, res) => {
  if (!allow(req, res, 'POST', 'GET', 'PATCH')) return;

  if (req.method === 'PATCH') { // dipanggil halaman relawan
    const vk = process.env.VOLUNTEER_KEY;
    if (!vk || req.headers['x-volunteer-key'] !== vk) return res.status(401).json({ error: 'Kunci relawan salah' });
    const b = body(req);
    if (b.status && !STATUS.includes(b.status)) return res.status(400).json({ error: 'Status tidak valid' });
    await sql`update ambulance_requests set
      status=coalesce(${b.status ?? null}::text,status),
      vol_name=coalesce(${b.vol_name ?? null}::text,vol_name),
      vol_lat=coalesce(${b.vol_lat ?? null}::float8,vol_lat),
      vol_lng=coalesce(${b.vol_lng ?? null}::float8,vol_lng),
      vol_updated=now() where id=${Number(b.id)}`;
    return res.json({ ok: true });
  }

  const u = auth(req);
  if (!u) return res.status(401).json({ error: 'Silakan masuk dulu' });

  if (req.method === 'POST') {
    const b = body(req);
    const address = String(b.address || '').trim();
    if (address.length < 5) return res.status(400).json({ error: 'Alamat wajib diisi' });
    const lat = b.lat != null && Number.isFinite(+b.lat) ? +b.lat : null;
    const lng = b.lng != null && Number.isFinite(+b.lng) ? +b.lng : null;
    const [r] = await sql`insert into ambulance_requests(user_id,address,note,lat,lng)
      values(${u.id},${address.slice(0, 200)},${String(b.note || '').slice(0, 200)},${lat},${lng}) returning id`;
    const maps = lat != null ? `\nPeta: https://www.google.com/maps?q=${lat},${lng}` : '';
    await notify(`🚑 Permintaan ambulans #${r.id}\nPemohon: ${u.name}\nAlamat: ${address}${maps}\nRelawan: https://${req.headers.host}/relawan.html?id=${r.id}`);
    return res.status(201).json({ id: r.id });
  }

  const [r] = await sql`select * from ambulance_requests where id=${Number(req.query.id)} and user_id=${u.id}`;
  if (!r) return res.status(404).json({ error: 'Permintaan tidak ditemukan' });
  const dist = r.lat != null && r.vol_lat != null ? hav(r.lat, r.lng, r.vol_lat, r.vol_lng) : null;
  res.json({
    status: r.status, vol_name: r.vol_name, vol_lat: r.vol_lat, vol_lng: r.vol_lng,
    dist_km: dist != null ? +dist.toFixed(1) : null,
    eta_min: dist != null ? Math.max(1, Math.round((dist / 40) * 60)) : null, // asumsi 40 km/jam
  });
});
