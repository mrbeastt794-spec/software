// Production/local server: serves dist/, POST /api/register and the password-protected /api/admin/*
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { handleRegistration } from './register.js';
import { handleAdmin } from './admin.js';
export async function readJson(req) { let s = ''; for await (const c of req) { s += c; if (s.length > 20000) throw new Error('big'); } return JSON.parse(s || '{}'); }
export async function adminRequest(req, route) {
  let body = null; try { if (req.method === 'POST') body = await readJson(req); } catch {}
  const url = new URL(req.url, 'http://localhost');
  return handleAdmin({ method: req.method, route, body, year: url.searchParams.get('year') || '', cookie: req.headers.cookie, ip: req.socket.remoteAddress, secure: req.headers['x-forwarded-proto'] === 'https' });
}
export function sendAdmin(res, r) { res.writeHead(r.status, { 'content-type': 'application/json', ...r.headers }); res.end(r.csv ?? JSON.stringify(r.json)); }
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
export function createServer(save) {
  return http.createServer(async (req, res) => {
    const send = (s, j) => { res.writeHead(s, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
    if (req.url.startsWith('/api/register')) {
      let body; try { body = req.method === 'POST' ? await readJson(req) : null; } catch { return send(400, { error: 'Invalid request.' }); }
      const r = await handleRegistration({ method: req.method, body, ip: req.socket.remoteAddress }, save); return send(r.status, r.json);
    }
    if (req.url.startsWith('/api/admin/')) return sendAdmin(res, await adminRequest(req, req.url.slice(11).split('?')[0]));
    let f = path.join('dist', path.normalize(req.url.split('?')[0]).replace(/^(\.\.[/\\])+/, ''));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = 'dist/index.html';
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
}
if (import.meta.url === `file://${process.argv[1]}`) { try { process.loadEnvFile?.('.env'); } catch {} createServer().listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000))); }
