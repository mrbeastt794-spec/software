// Adapters that run the same handlers as Vercel serverless functions.
import { handleRegistration } from './register.js';
import { handleAdmin } from './admin.js';
const ip = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '';
export async function registerFn(req, res) {
  const r = await handleRegistration({ method: req.method, body: req.body, ip: ip(req) });
  res.status(r.status).json(r.json);
}
export async function adminFn(req, res) {
  const r = await handleAdmin({ method: req.method, route: String(req.query.route || ''), body: req.body, year: String(req.query.year || ''), cookie: req.headers.cookie, ip: ip(req), secure: true });
  for (const [k, v] of Object.entries(r.headers || {})) res.setHeader(k, v);
  if (r.csv !== undefined) res.status(r.status).send(r.csv); else res.status(r.status).json(r.json);
}
