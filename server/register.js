import crypto from 'node:crypto';
import { sheets as gsheets, auth as gauth } from '@googleapis/sheets';
import { validate, EVENT } from '../shared/config.js';
export const HEADERS = ['Registration ID','Submitted at (UTC)','Team name','Team size','Member 1 name','Member 1 year','Member 2 name','Member 2 year','Member 3 name','Member 3 year','Member 4 name','Member 4 year','Class or section','Team lead name','Team lead email','Team lead phone','Contact consent','Submission key','Payment UTR'];
const LEGACY_HEADERS = HEADERS.slice(0, -1), KEY = 17, LAST = 'S';
let client, chain = Promise.resolve(); const tabIds = {};
export function getClient() {
  if (client) return client;
  const { GOOGLE_SHEET_ID: id, GOOGLE_SERVICE_ACCOUNT_EMAIL: email } = process.env;
  const pk = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!id || !email || !pk) throw Object.assign(new Error('Google Sheets is not configured'), { code: 'CONFIG' });
  const api = gsheets({ version: 'v4', auth: new gauth.GoogleAuth({ credentials: { client_email: email, private_key: pk }, scopes: ['https://www.googleapis.com/auth/spreadsheets'] }) });
  return (client = { api, id, tab: process.env.GOOGLE_SHEET_TAB || 'Registrations' });
}
const lock = fn => { const r = chain.then(fn, fn); chain = r.catch(() => {}); return r; };
const rows = async (g, range) => (await g.api.spreadsheets.values.get({ spreadsheetId: g.id, range: `${g.tab}!${range}` })).data.values || [];
async function ensureHeader(g) {
  const h = (await rows(g, `A1:${LAST}1`))[0];
  if (!h) return g.api.spreadsheets.values.update({ spreadsheetId: g.id, range: `${g.tab}!A1:${LAST}1`, valueInputOption: 'RAW', requestBody: { values: [HEADERS] } });
  if (h.length === LEGACY_HEADERS.length && LEGACY_HEADERS.every((header, i) => h[i] === header)) {
    return g.api.spreadsheets.values.update({ spreadsheetId: g.id, range: `${g.tab}!S1:S1`, valueInputOption: 'RAW', requestBody: { values: [['Payment UTR']] } });
  }
  if (h.length !== HEADERS.length || !HEADERS.every((header, i) => h[i] === header)) throw Object.assign(new Error('Sheet header row does not match'), { code: 'CONFIG' });
}
async function deleteRowById(g, regId) {
  const idx = (await rows(g, 'A:A')).findIndex(r => r[0] === regId);
  if (idx < 1) return;
  if (tabIds[g.tab] == null) tabIds[g.tab] = (await g.api.spreadsheets.get({ spreadsheetId: g.id, fields: 'sheets.properties' })).data.sheets.find(s => s.properties.title === g.tab).properties.sheetId;
  await g.api.spreadsheets.batchUpdate({ spreadsheetId: g.id, requestBody: { requests: [{ deleteDimension: { range: { sheetId: tabIds[g.tab], dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 } } }] } });
}
// Saves one registration. Resolves {id} only after the row is confirmed in the sheet.
export function saveRegistration(c, key, g = getClient()) {
  return lock(async () => {
    await ensureHeader(g);
    const all = await rows(g, `A2:${LAST}`);
    const hit = key && all.find(r => r[KEY] === key);
    if (hit) return { id: hit[0] };
    const id = 'HACK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const row = [id, new Date().toISOString(), c.teamName, c.teamSize, ...c.members.flatMap(m => [m.name, m.year]), c.section, c.leadName, '', c.leadPhone, 'Yes', key, c.utrId];
    await g.api.spreadsheets.values.append({ spreadsheetId: g.id, range: `${g.tab}!A:${LAST}`, valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', requestBody: { values: [row] } });
    // Keep retries with the same submission key idempotent across server instances.
    const after = await rows(g, `A2:${LAST}`);
    const first = key && after.find(r => r[KEY] === key);
    if (!first) throw new Error('Row not found after saving');
    if (first[0] !== id) { await deleteRowById(g, id); return { id: first[0] }; }
    return { id };
  });
}
const hits = new Map();
export async function handleRegistration({ method, body, ip }, save = saveRegistration) {
  if (method !== 'POST') return { status: 405, json: { error: 'Use POST.' } };
  if (!EVENT.registrationOpen) return { status: 403, json: { error: 'Registration is closed.' } };
  const now = Date.now(), h = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (h.length >= 8) return { status: 429, json: { error: 'Too many attempts. Wait a minute and try again.' } };
  hits.set(ip, [...h, now]);
  if (!body || typeof body !== 'object' || body.website) return { status: 400, json: { error: 'Invalid request.' } };
  const { errors, clean } = validate(body);
  if (Object.keys(errors).length) return { status: 400, json: { error: 'Please fix the highlighted fields.', fields: errors } };
  const key = String(body.submissionKey || '').slice(0, 64);
  try { return { status: 200, json: { ok: true, registrationId: (await save(clean, key)).id } }; }
  catch (err) {
    console.error('[register]', err.code || '', err.message);
    return { status: err.code === 'CONFIG' ? 503 : 502, json: { error: 'We could not save your registration, and nothing was recorded. Try again in a moment.' } };
  }
}
