import { loadEnv } from 'vite';
import { handleRegistration } from './server/register.js';
import { readJson, adminRequest, sendAdmin } from './server/node.js';
export default ({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [{ name: 'api', configureServer(s) {
    s.middlewares.use('/api/register', async (req, res) => {
      let body = null; try { if (req.method === 'POST') body = await readJson(req); } catch {}
      const r = await handleRegistration({ method: req.method, body, ip: req.socket.remoteAddress }); res.statusCode = r.status; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(r.json)); });
    s.middlewares.use('/api/admin', async (req, res) => sendAdmin(res, await adminRequest(req, req.url.slice(1).split('?')[0])));
  } }] };
};
