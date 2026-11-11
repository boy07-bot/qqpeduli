import crypto from 'node:crypto';
import { sql } from '../lib/db.js';
import { body, allow, safe } from '../lib/util.js';

// Midtrans memanggil URL ini setiap status pembayaran berubah.
export default safe(async (req, res) => {
  if (!allow(req, res, 'POST')) return;
  const n = body(req);
  const key = process.env.MIDTRANS_SERVER_KEY || '';
  const expected = crypto.createHash('sha512')
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${key}`).digest('hex');
  if (!key || n.signature_key !== expected) return res.status(403).json({ error: 'Signature tidak valid' });

  const paid = n.transaction_status === 'settlement' ||
    (n.transaction_status === 'capture' && n.fraud_status === 'accept');
  const failed = ['deny', 'cancel', 'expire', 'failure'].includes(n.transaction_status);

  if (paid) {
    // hanya diproses sekali (idempoten) walau Midtrans mengirim notifikasi berulang
    const [d] = await sql`update donations set status='paid'
      where order_id=${n.order_id} and status<>'paid' returning user_id,campaign_id,amount`;
    if (d) {
      if (d.campaign_id) await sql`update campaigns set raised=raised+${d.amount} where id=${d.campaign_id}`;
      await sql`update users set points=points+${Math.floor(Number(d.amount) / 1000)} where id=${d.user_id}`;
    }
  } else if (failed) {
    await sql`update donations set status='failed' where order_id=${n.order_id} and status='pending'`;
  }
  res.json({ ok: true });
});
