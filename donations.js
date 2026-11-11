import { sql } from '../lib/db.js';
import { auth, body, allow, safe } from '../lib/util.js';

const SNAP = () => process.env.MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://app.midtrans.com/snap/v1/transactions'
  : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

export default safe(async (req, res) => {
  if (!allow(req, res, 'GET', 'POST')) return;
  const u = auth(req);
  if (!u) return res.status(401).json({ error: 'Silakan masuk dulu' });

  if (req.method === 'GET') {
    const donations = await sql`
      select title, amount::float8 as amount, status, created_at
      from donations where user_id=${u.id} order by created_at desc limit 50`;
    const [t] = await sql`
      select coalesce(sum(amount) filter (where status='paid'),0)::float8 as total
      from donations where user_id=${u.id}`;
    const [p] = await sql`select points from users where id=${u.id}`;
    return res.json({ donations, total: t.total, points: p?.points ?? 0 });
  }

  // POST: buat donasi + transaksi Midtrans Snap
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) return res.status(501).json({ error: 'Payment gateway belum dikonfigurasi' });
  const b = body(req);
  const amount = Math.floor(Number(b.amount));
  if (!(amount >= 10000)) return res.status(400).json({ error: 'Minimal donasi Rp 10.000' });
  const title = String(b.title || 'Donasi').slice(0, 100);
  const cid = b.campaign_id ? Number(b.campaign_id) : null;
  const orderId = `QQ-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  await sql`insert into donations(order_id,user_id,campaign_id,title,amount,method)
            values(${orderId},${u.id},${cid},${title},${amount},${b.method || null})`;

  const r = await fetch(SNAP(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'),
    },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [{ id: String(cid || 'umum'), price: amount, quantity: 1, name: title.slice(0, 50) }],
      customer_details: { first_name: u.name, email: u.email },
    }),
  });
  const d = await r.json();
  if (!r.ok) return res.status(502).json({ error: 'Gagal membuat transaksi pembayaran' });
  res.json({ order_id: orderId, token: d.token, redirect_url: d.redirect_url });
});
