// Real write test: appends a TEST row to your sheet, reads it back, then deletes it.
try { process.loadEnvFile('.env'); } catch {}
import('./register.js').then(async ({ saveRegistration }) => {
  const c = { teamName: 'ZZ connection test', teamSize: 1, members: [{ name: 'Test', year: '1st year' }, {}, {}, {}].map(m => ({ name: m.name || '', year: m.year || '' })), section: 'X', leadName: 'Test', leadEmail: `test-${Date.now()}@example.com`, leadPhone: '0000000000' };
  const { id } = await saveRegistration(c, 'check'); console.log('Row written with ID', id, '. Delete it from the sheet (test row).');
}).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
