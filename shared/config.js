// ===== EVENT SETTINGS: organizers edit this block only =====
export const EVENT = {
  name: 'Department-Level Software Hackathon',
  department: 'Department name: to be announced',
  date: '31st October 2026',
  venue: 'ECS DEPARTMENT',
  contactEmail: '',   // e.g. 'hackathon@yourdept.edu' (hidden when empty)
  contactPhone: '',
  yearGroups: ['1st year', '2nd year', '3rd year'],
  phoneDigits: [10, 15],
  registrationOpen: true,
};
// ===== end of settings =====
const clean = s => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
export function validate(i = {}) {
  const e = {}, c = {};
  c.teamName = clean(i.teamName);
  if (c.teamName.length < 2 || c.teamName.length > 60) e.teamName = 'Enter a team name (2 to 60 characters).';
  c.teamSize = Number(i.teamSize);
  if (!Number.isInteger(c.teamSize) || c.teamSize < 2 || c.teamSize > 3) e.teamSize = 'Choose a team size from 2 to 3.';
  const n = e.teamSize ? 0 : c.teamSize; c.members = [];
  for (let k = 0; k < 4; k++) {
    const m = i.members?.[k] || {}, name = clean(m.name), year = clean(m.year);
    if (k < n) {
      if (name.length < 2 || name.length > 80) e['name' + k] = k ? 'Enter this teammate’s full name.' : 'Enter the team lead’s full name.';
      if (!EVENT.yearGroups.includes(year)) e['year' + k] = 'Choose a year group.';
    }
    c.members.push(k < n ? { name, year } : { name: '', year: '' });
  }
  const submittedNames = clean(i.teamMembers).split(',').map(clean);
  if (!e.teamSize && (submittedNames.length !== n || submittedNames.some((name, k) => name.toLowerCase() !== c.members[k].name.toLowerCase()))) {
    e.teamMembers = `Enter the same ${n} member names shown above, separated by commas.`;
  }
  c.section = '';
  c.leadName = c.members[0].name;
  c.leadPhone = clean(i.leadPhone);
  const d = c.leadPhone.replace(/\D/g, '').length;
  if (!/^\+?[\d\s()-]+$/.test(c.leadPhone) || d < EVENT.phoneDigits[0] || d > EVENT.phoneDigits[1]) e.leadPhone = `Enter a phone number with ${EVENT.phoneDigits[0]} to ${EVENT.phoneDigits[1]} digits.`;
  c.utrId = clean(i.utrId);
  if (c.utrId.length < 4 || c.utrId.length > 50) e.utrId = 'Enter a UTR / transaction ID (4 to 50 characters).';
  c.consent = i.consent === true;
  if (!c.consent) e.consent = 'Tick this box so we can contact you about the event.';
  return { errors: e, clean: c };
}
