import { handleRegistration } from '../server/register.js';
export default async function handler(req, res) {
  const r = await handleRegistration({ method: req.method, body: req.body, ip: (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket?.remoteAddress || '' });
  res.status(r.status).json(r.json);
}
