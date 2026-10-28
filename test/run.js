// Logic tests against an in-memory fake of the Sheets API (NOT a real Google write).
import assert from 'node:assert'; import { saveRegistration, handleRegistration, HEADERS } from '../server/register.js';
const data = [];
const api = { spreadsheets: { values: {
  get: async ({ range }) => { const r = range.split('!')[1]; const all = [HEADERS, ...data];
    return { data: { values: r === 'A1:S1' ? [all[0]] : r === 'A:A' ? all.map(x => [x[0]]) : all.slice(1) } }; },
  update: async () => {}, append: async ({ requestBody }) => { await new Promise(r => setTimeout(r, 5)); data.push(requestBody.values[0]); } },
  get: async () => ({ data: { sheets: [{ properties: { title: 'T', sheetId: 1 } }] } }),
  batchUpdate: async ({ requestBody }) => { const s = requestBody.requests[0].deleteDimension.range.startIndex; data.splice(s - 1, 1); } } };
const g = { api, id: 'x', tab: 'T' };
const body = (e, k = 'k1') => ({ teamName: 'Team A', teamSize: 2, members: [{ name: 'Asha K', year: '2nd year' }, { name: 'Ravi S', year: '3rd year' }, {}, {}], teamMembers: 'Asha K, Ravi S', leadPhone: '+91 98765 43210', utrId: 'UTR12345678', consent: true, submissionKey: k });
const save = (c, k) => saveRegistration(c, k, g);
let r = await handleRegistration({ method: 'POST', body: body('A@x.com'), ip: '1' }, save); assert.equal(r.status, 200); assert.match(r.json.registrationId, /^HACK-/);
assert.equal(data[0].length, 19);
assert.equal(data[0][12], '', 'the retained class/section sheet column is left blank');
assert.equal(data[0][14], '', 'email column remains blank for sheet compatibility');
assert.equal(data[0][18], 'UTR12345678');
r = await handleRegistration({ method: 'POST', body: { ...body('three@x.com'), teamSize: 3, members: [{ name: 'Asha K', year: '2nd year' }, { name: 'Ravi S', year: '3rd year' }, { name: 'Neha R', year: '1st year' }], teamMembers: 'Asha K, Ravi S, Neha R' }, ip: '1b' }, save); assert.equal(r.status, 200, 'three-member teams are allowed');
r = await handleRegistration({ method: 'POST', body: { ...body('mismatch@x.com'), teamMembers: 'Asha K, Other' }, ip: '1e' }, save); assert.equal(r.status, 400); assert.ok(r.json.fields.teamMembers, 'comma-separated names must match the member entries');
r = await handleRegistration({ method: 'POST', body: { ...body('one@x.com'), teamSize: 1 }, ip: '1c' }, save); assert.equal(r.status, 400); assert.ok(r.json.fields.teamSize, 'single-member teams are rejected');
r = await handleRegistration({ method: 'POST', body: body('a@x.com', 'other'), ip: '2' }, save); assert.equal(r.status, 200, 'registrations no longer require unique email addresses');
r = await handleRegistration({ method: 'POST', body: body('a@x.com'), ip: '3' }, save); assert.equal(r.status, 200, 'retry with same key is idempotent'); assert.equal(data.filter(x => x[17] === 'k1').length, 1);
r = await handleRegistration({ method: 'POST', body: { ...body('bad'), leadPhone: '12' }, ip: '4' }, save); assert.equal(r.status, 400); assert.ok(r.json.fields.leadPhone);
r = await handleRegistration({ method: 'POST', body: { ...body('no-utr'), utrId: '' }, ip: '4c' }, save); assert.equal(r.status, 400); assert.ok(r.json.fields.utrId, 'UTR is required');
r = await handleRegistration({ method: 'POST', body: { ...body('too-large'), teamSize: 4 }, ip: '4b' }, save); assert.equal(r.status, 400); assert.ok(r.json.fields.teamSize);
r = await handleRegistration({ method: 'POST', body: body('c@x.com'), ip: '5' }, async () => { throw new Error('google down'); }); assert.equal(r.status, 502); assert.ok(!r.json.ok);
r = await handleRegistration({ method: 'POST', body: body('d@x.com'), ip: '6' }); assert.equal(r.status, 503, 'unconfigured -> error, never success');
const rs = await Promise.all([1, 2, 3].map(i => handleRegistration({ method: 'POST', body: body('unused', 'race-key'), ip: 'r' + i }, save)));
assert.deepEqual(rs.map(x => x.status), [200, 200, 200]); assert.equal(data.filter(x => x[17] === 'race-key').length, 1);
console.log('all tests passed');
