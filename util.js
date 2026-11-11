import jwt from 'jsonwebtoken';

export const sign = (u) =>
  jwt.sign({ id: u.id, email: u.email, name: u.name }, process.env.JWT_SECRET, { expiresIn: '30d' });

export function auth(req) {
  const t = (req.headers.authorization || '').replace('Bearer ', '');
  try { return jwt.verify(t, process.env.JWT_SECRET); } catch { return null; }
}

export const body = (req) =>
  typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

export function allow(req, res, ...methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader('Allow', methods.join(', '));
  res.status(405).json({ error: 'Metode tidak diizinkan' });
  return false;
}

// Bungkus handler agar error tidak membocorkan detail internal
export const safe = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Terjadi kesalahan server' }); }
};
