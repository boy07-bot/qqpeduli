import bcrypt from 'bcryptjs';
import { sql } from '../lib/db.js';
import { sign, body, allow, safe } from '../lib/util.js';

// POST /api/auth  { action: 'signup' | 'login', email, password, name? }
export default safe(async (req, res) => {
  if (!allow(req, res, 'POST')) return;
  const { action, password = '', name } = body(req);
  const email = String(body(req).email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Format email tidak valid' });
  if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

  if (action === 'signup') {
    const [exists] = await sql`select 1 from users where email=${email}`;
    if (exists) return res.status(409).json({ error: 'Email sudah terdaftar' });
    const hash = await bcrypt.hash(password, 10);
    const nm = String(name || email.split('@')[0]).slice(0, 60);
    const [u] = await sql`insert into users(email,name,pass_hash) values(${email},${nm},${hash}) returning id,email,name`;
    return res.status(201).json({ token: sign(u), user: u });
  }
  if (action === 'login') {
    const [u] = await sql`select id,email,name,pass_hash from users where email=${email}`;
    if (!u || !(await bcrypt.compare(password, u.pass_hash)))
      return res.status(401).json({ error: 'Email atau password salah' });
    return res.json({ token: sign(u), user: { id: u.id, email: u.email, name: u.name } });
  }
  res.status(400).json({ error: 'Aksi tidak dikenal' });
});
