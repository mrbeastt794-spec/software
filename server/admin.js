import crypto from 'node:crypto';
import { listRegistrations } from './register.js';
import { EVENT } from '../shared/config.js';
// Admin API. Disabled unless ADMIN_PASSWORD (8+ chars) is set. Session = signed HttpOnly cookie.
const TTL = 8 * 3600, sha = s => crypto.createHash('sha256').update(s).digest();
const secret = () => process.env.ADMIN_SESSION_SECRET || sha('adm:' + process.env.ADMIN_PASSWORD);
const sign = exp => `${exp}.${crypto.createHmac('sha256', secret()).update(String(exp)).digest('hex')}`;
function authed(cookie = '') {
  const v = /(?:^|;\s*)adm=([^;]+)/.exec(cookie)?.[1]; if (!v) return false;
  const [exp] = v.split('.'), good = sign(exp);
  return v.length === good.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(good)) && Number(exp) > Date.now() / 1000;
}
const fails = new Map();
export const HEAD = ['Registration ID', 'Submitted at (UTC)', 'Team name', 'Team size', 'Team lead name', 'Team lead year', 'Team members', 'Team lead phone', 'Payment UTR', 'Contact consent'];
const cells = r => [r.id, r.submitted_at, r.team_name, r.team_size, r.lead_name, r.lead_year, r.team_members, r.lead_phone, r.utr, r.consent];
const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s) && !/^\+?[\d\s()-]+$/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = rows => '\ufeff' + [HEAD, ...rows.map(cells)].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
export async function handleAdmin({ method, route, body, cookie, ip, secure, year }, list = listRegistrations) {
  const H = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }, json = (status, j, h = {}) => ({ status, json: j, headers: { ...H, ...h } });
  const pw = process.env.ADMIN_PASSWORD || '';
  if (pw.length < 8) return json(503, { error: 'Admin is disabled. Set ADMIN_PASSWORD (8+ characters) on the server.' });
  const ck = v => `adm=${v}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${v ? TTL : 0}${secure ? '; Secure' : ''}`;
  if (route === 'login' && method === 'POST') {
    const now = Date.now(), f = (fails.get(ip) || []).filter(t => now - t < 600000);
    if (f.length >= 5) return json(429, { error: 'Too many attempts. Try again in 10 minutes.' });
    if (!body || typeof body.password !== 'string' || !crypto.timingSafeEqual(sha(body.password), sha(pw))) { fails.set(ip, [...f, now]); return json(401, { error: 'Wrong password.' }); }
    fails.delete(ip); return json(200, { ok: true }, { 'set-cookie': ck(sign(Math.floor(now / 1000) + TTL)) });
  }
  if (route === 'logout' && method === 'POST') return json(200, { ok: true }, { 'set-cookie': ck('') });
  if (!authed(cookie)) return json(401, { error: 'Not signed in.' });
  if (method !== 'GET') return json(405, { error: 'Use GET.' });
  try {
    const rows = await list(), filtered = year ? rows.filter(r => r.lead_year === year) : rows;
    if (route === 'registrations') return json(200, { registrations: filtered.map(r => ({ ...r, submission_key: undefined })), yearGroups: EVENT.yearGroups });
    if (route === 'export.csv') return { status: 200, csv: toCsv(filtered), headers: { ...H, 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="registrations-${new Date().toISOString().slice(0, 10)}.csv"` } };
  } catch (e) { console.error('[admin]', e.message); return json(500, { error: 'Could not read registrations.' }); }
  return json(404, { error: 'Not found.' });
}
