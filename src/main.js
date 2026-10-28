import './style.css';
import { EVENT, validate } from '../shared/config.js';
const $ = s => document.querySelector(s), form = $('#form');
document.querySelectorAll('[data-name]').forEach(e => e.textContent = EVENT.name);
document.querySelectorAll('[data-f]').forEach(e => e.textContent = EVENT[e.dataset.f] || e.textContent);
$('#contact').textContent = [EVENT.contactEmail, EVENT.contactPhone].filter(Boolean).join('  ');
const yrs = ['<option value="">Year group</option>', ...EVENT.yearGroups.map(y => `<option>${y}</option>`)].join('');
$('#members').innerHTML = [0, 1, 2].map(k => `<fieldset class="f mem" data-k="${k}" ${k ? 'hidden' : ''}><legend>${k ? 'Teammate ' + (k + 1) : 'Team lead'}</legend>
<label class="f">${k ? 'Name' : 'Team lead name'}<input name="name${k}" autocomplete="${k ? 'off' : 'name'}" maxlength="80"></label><p class="err" data-e="name${k}"></p>
<label class="f">Year group<select name="year${k}" autocomplete="off">${yrs}</select></label><p class="err" data-e="year${k}"></p></fieldset>`).join('');
const key = crypto.randomUUID?.() || String(Math.random()).slice(2);
const get = () => { const d = new FormData(form); return { teamName: d.get('teamName'), teamSize: d.get('teamSize'), members: [0, 1, 2, 3].map(k => ({ name: d.get('name' + k), year: d.get('year' + k) })), teamMembers: d.get('teamMembers'), leadPhone: d.get('leadPhone'), utrId: d.get('utrId'), consent: form.consent.checked, website: d.get('website'), submissionKey: key }; };
const fieldOf = n => form.elements[n] || form.querySelector(`[name="${n}"]`);
function show(errors) {
  document.querySelectorAll('.err').forEach(p => p.textContent = '');
  form.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
  let first;
  for (const [n, m] of Object.entries(errors)) { const p = document.querySelector(`[data-e="${n}"]`) || (() => { const f = fieldOf(n); const p = document.createElement('p'); p.className = 'err'; p.dataset.e = n; f.closest('label').after(p); return p; })();
    p.textContent = m; p.id = 'e-' + n; const f = fieldOf(n); const t = f?.length ? f[0] : f; if (t) { t.setAttribute('aria-invalid', 'true'); t.setAttribute('aria-describedby', p.id); first ||= t; } }
  first?.focus({ preventScroll: false }); first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
const sync = () => { const n = +(form.teamSize.value || 0); form.querySelectorAll('.mem').forEach(f => { const on = +f.dataset.k < Math.max(n, 1); f.hidden = !on; f.querySelectorAll('input,select').forEach(i => i.disabled = !on); }); };
form.addEventListener('change', e => e.target.name === 'teamSize' && sync()); sync();
const banner = $('#banner'), go = $('#go');
form.addEventListener('submit', async e => {
  e.preventDefault(); banner.hidden = true;
  const data = get(), { errors } = validate(data); if (Object.keys(errors).length) { show(errors); banner.textContent = 'Some answers need fixing. Check the highlighted fields.'; banner.hidden = false; return; }
  show({}); go.disabled = true; go.classList.add('busy'); go.firstChild.textContent = 'Saving your registration…';
  const ac = new AbortController(), to = setTimeout(() => ac.abort(), 25000);
  try {
    const r = await fetch('/api/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data), signal: ac.signal });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok && j.registrationId) { form.hidden = true; $('#rid').textContent = j.registrationId; $('#done').hidden = false; $('#done').focus(); return; }
    if (j.fields) show(j.fields);
    banner.textContent = j.error || 'We could not save your registration. Try again.'; banner.hidden = false; if (!j.fields) banner.scrollIntoView({ block: 'center' });
  } catch { banner.textContent = ac.signal.aborted ? 'The request took too long. Your registration may not be saved. Try again; resubmitting is safe.' : 'No connection. Check your network and try again.'; banner.hidden = false; banner.scrollIntoView({ block: 'center' }); }
  finally { clearTimeout(to); go.disabled = false; go.classList.remove('busy'); go.firstChild.textContent = 'Submit registration'; }
});
const ok = (() => { try { return !!document.createElement('canvas').getContext('webgl2') || !!document.createElement('canvas').getContext('webgl'); } catch { return false; } })();
if (ok) import('./scene.js').catch(() => document.body.classList.add('nogl')); else document.body.classList.add('nogl');
