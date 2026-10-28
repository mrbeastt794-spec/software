# Department-Level Software Hackathon: registration site

Mobile-first, scroll-led 3D site (Vite + three.js) with a serverless-style registration API that appends each registration to a Google Sheet. Each of the three batches receives a different problem statement at the venue on event day; the statements are not published on the site.

## Run locally
```
npm install
cp .env.example .env     # fill in the values (see below)
npm run dev              # site + /api/register at http://localhost:5173
npm run build && npm start   # production build at http://localhost:3000
npm test                 # logic tests (fake Sheets API, not a real write)
```
Without `.env`, submitting shows an error and nothing is saved. Success appears only after the row is confirmed in the sheet.

## Update event details
Edit the marked block at the top of `shared/config.js`: date, venue, department, contact, year-group options. Fields left as "To be announced" are not invented.

## Connect Google Sheets
1. Google Cloud Console: create a project, enable the **Google Sheets API**.
2. IAM > Service Accounts: create one, then Keys > Add key > JSON. Keep the file private; never commit it.
3. Create the Google Sheet, rename a tab to `Registrations`, and **Share** the sheet with the service account's `client_email` as **Editor**. Keep it private otherwise.
4. Set env vars: `GOOGLE_SHEET_ID` (from the sheet URL), `GOOGLE_SHEET_TAB`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (the JSON `private_key`, quoted, `\n` kept).
5. `npm run check:sheet` writes one test row for real and reports the ID. Delete that row after.

The header row is created automatically. Columns: Registration ID, Submitted at (UTC), Team name, Team size, Member 1 to 4 name and year, Class or section (blank; retained for sheet compatibility), Team lead name/email/phone (email blank; retained for sheet compatibility), Contact consent, Submission key, Payment UTR. Teams must have two or three members; the fourth member columns remain for sheet compatibility. The team lead is Member 1. The comma-separated names field must match the individual member names. A required UTR / transaction ID is stored with each registration. Existing sheets are extended with a Payment UTR column. The submission key lets a retry after a timeout succeed without a false duplicate error.

Email addresses are not collected, and registrations are no longer deduplicated by email. A retry with the same submission key returns the existing registration ID.

## Deploy
- **Vercel**: import the repo, add the four env vars in Project Settings, deploy. `api/register.js` is the function.
- **Any Node host** (Render, Railway): build `npm run build`, start `npm start`, set the env vars as secrets.
Rate limiting is in-memory and best-effort. Never expose the sheet publicly.
