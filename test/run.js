// Logic tests with an in-memory fake of the Supabase client and the real admin handler.
import assert from 'node:assert'; import { saveRegistration, listRegistrations, handleRegistration } from '../server/register.js';
import { handleAdmin, toCsv } from '../server/admin.js';
function fakeDb(failInsert) {
  const rows = [];
  return { from: () => { const f = []; const api = {
    select: () => api, order: () => api, eq: (c, v) => (f.push([c, v]), api),
    range: async (a, b) => ({ data: [...rows].reverse().slice(a, b + 1), error: null }),
    maybeSingle: async () => ({ data: rows.find(r => f.every(([c, v]) => r[c] === v)) ?? null, error: null }),
    insert: async r => failInsert ? { error: { message: 'db down' } } : rows.some(x => r.submission_key && x.submission_key === r.submission_key) ? { error: { code: '23505', message: 'dup' } } : (rows.push(r), { error: null }) }; return api; } };
}
const d = fakeDb(), save = (c, k) => saveRegistration(c, k, d);
const body = (k = 'k1') => ({ teamName: 'Team A', teamSize: 2, leadName: 'Asha K', leadYear: '2nd year', teamMembers: 'Ravi S', leadPhone: '+91 98765 43210', utrId: 'UTR123456', consent: true, submissionKey: k });
let r = await handleRegistration({ method: 'POST', body: body(), ip: '1' }, save); assert.equal(r.status, 200); assert.match(r.json.registrationId, /^HACK-/);
const id = r.json.registrationId; r = await handleRegistration({ method: 'POST', body: body(), ip: '2' }, save); assert.equal(r.json.registrationId, id, 'same key is idempotent');
const all = await listRegistrations(d); assert.equal(all.length, 1); assert.equal(all[0].lead_name, 'Asha K'); assert.equal(all[0].lead_year, '2nd year'); assert.equal(all[0].team_members, 'Ravi S');
r = await handleRegistration({ method: 'POST', body: { ...body('k2'), leadPhone: '1' }, ip: '3' }, save); assert.equal(r.status, 400); assert.equal((await listRegistrations(d)).length, 1);
r = await handleRegistration({ method: 'POST', body: { ...body('k4'), teamMembers: 'Ravi S, Maya P' }, ip: '5' }, save); assert.equal(r.status, 400);
r = await handleRegistration({ method: 'POST', body: body('k3'), ip: '4' }, (c, k) => saveRegistration(c, k, fakeDb(true))); assert.equal(r.status, 502); assert.ok(!r.json.ok, 'DB failure never reports success');
r = await handleRegistration({ method: 'POST', body: body('k5'), ip: '6' }); assert.equal(r.status, 502, 'unconfigured Supabase -> error, never success');
const a = x => handleAdmin(x, async () => listRegistrations(d));
delete process.env.ADMIN_PASSWORD; assert.equal((await a({ method: 'GET', route: 'registrations', ip: 'a' })).status, 503);
process.env.ADMIN_PASSWORD = 'correct horse';
assert.equal((await a({ method: 'GET', route: 'registrations', ip: 'a' })).status, 401);
assert.equal((await a({ method: 'POST', route: 'login', body: { password: 'nope' }, ip: 'a' })).status, 401);
const ok = (await a({ method: 'POST', route: 'login', body: { password: 'correct horse' }, ip: 'b' })); assert.equal(ok.status, 200);
const ck = ok.headers['set-cookie'].split(';')[0]; assert.match(ok.headers['set-cookie'], /HttpOnly.*SameSite=Strict/);
assert.equal((await a({ method: 'GET', route: 'registrations', cookie: ck + 'x', ip: 'b' })).status, 401);
assert.equal((await a({ method: 'GET', route: 'registrations', cookie: ck, ip: 'b' })).json.registrations.length, 1);
assert.equal((await a({ method: 'GET', route: 'registrations', cookie: ck, ip: 'b', year: '1st year' })).json.registrations.length, 0);
assert.equal((await a({ method: 'GET', route: 'registrations', cookie: ck, ip: 'b', year: '2nd year' })).json.registrations.length, 1);
const csv = (await a({ method: 'GET', route: 'export.csv', cookie: ck, ip: 'b' })); assert.match(csv.headers['content-disposition'], /attachment/); assert.match(csv.csv, /Asha K/);
assert.match((await a({ method: 'GET', route: 'export.csv', cookie: ck, ip: 'b', year: '2nd year' })).csv, /Ravi S/);
assert.ok(!JSON.stringify((await a({ method: 'GET', route: 'registrations', cookie: ck, ip: 'b' })).json).includes('k1'), 'submission key not exposed');
assert.match(toCsv([{ id: 'x', team_name: '=SUM(1)', lead_phone: '+91 98765 43210' }]), /'=SUM\(1\).*\+91 98765 43210/);
for (let i = 0; i < 5; i++) (await a({ method: 'POST', route: 'login', body: { password: 'x' }, ip: 'z' })); assert.equal((await a({ method: 'POST', route: 'login', body: { password: 'correct horse' }, ip: 'z' })).status, 429);
console.log('all tests passed');
