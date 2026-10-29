import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { validate, EVENT } from '../shared/config.js';
// Supabase (Postgres) storage, accessed only from the server with the service-role key.
let sb;
export function getDb() {
  if (sb) return sb;
  const { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = process.env;
  if (!url || !key) throw new Error('Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return (sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }));
}
export async function listRegistrations(d = getDb()) {
  const out = []; for (let from = 0; ; from += 1000) {
    const { data, error } = await d.from('registrations').select('*').order('submitted_at', { ascending: false }).range(from, from + 999);
    if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) return out;
  }
}
const byKey = async (d, k) => { const { data, error } = await d.from('registrations').select('id').eq('submission_key', k).maybeSingle(); if (error) throw new Error(error.message); return data; };
// Saves one registration; resolves {id} only after the row is read back from the database.
// A retry with the same submission key returns the original ID instead of a second row.
export async function saveRegistration(c, key, d = getDb()) {
  const k = key || null;
  if (k) { const old = await byKey(d, k); if (old) return { id: old.id }; }
  const id = 'HACK-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const { error } = await d.from('registrations').insert({ id, submitted_at: new Date().toISOString(), team_name: c.teamName, team_size: c.teamSize,
    lead_name: c.leadName, lead_year: c.leadYear, team_members: c.teamMembers, lead_phone: c.leadPhone, utr: c.utrId, consent: 'Yes', submission_key: k });
  if (error) { if (error.code === '23505' && k) { const old = await byKey(d, k); if (old) return { id: old.id }; } throw new Error(error.message); }
  const { data, error: e2 } = await d.from('registrations').select('id').eq('id', id).maybeSingle();
  if (e2 || !data) throw new Error('Row not found after saving');
  return { id };
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
  catch (err) { console.error('[register]', err.message); return { status: 502, json: { error: 'We could not save your registration, and nothing was recorded. Try again in a moment.' } }; }
}
