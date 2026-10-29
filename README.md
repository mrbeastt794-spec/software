# Department Software Hackathon: registration site

Mobile-first, scroll-led 3D site (Vite + three.js). Registrations are saved to **Supabase** (Postgres) by server-side functions, and organizers view and download them on a password-protected admin page. Each of the three batches receives a different problem statement at the venue on event day; the statements are not published on the site.

## 1. Set up Supabase
1. Create a project at supabase.com.
2. SQL Editor > New query > paste `supabase/schema.sql` > Run. This creates the `registrations` table and locks it (RLS on, no public access).
3. Project Settings > API: copy the **Project URL** and the **service_role** key. The service_role key is secret: use it only in server env vars, never in client code, and never commit it.

## 2. Environment variables
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` (8+ characters), `ADMIN_SESSION_SECRET` (any long random string). Locally: copy `.env.example` to `.env`. On Vercel: Project Settings > Environment Variables (then redeploy).

## 3. Deploy on Vercel
Import the repo (Vite is auto-detected; output `dist`). `api/register.js` and `api/admin.js` become serverless functions, and `vercel.json` routes `/api/admin/*`. After deploying, open `https://your-site.vercel.app/admin.html`.

## Admin page
Sign in with `ADMIN_PASSWORD` to search registrations, filter by team lead year, and **Download CSV** (opens in Excel or Google Sheets; the year filter applies to the download). Sessions last 8 hours (HttpOnly cookie); repeated wrong passwords are blocked for 10 minutes (best-effort per server instance). You can also view or export the table directly in the Supabase dashboard (Table Editor).

## Run locally
```
npm install
cp .env.example .env     # fill in the values
npm run dev              # site + API at http://localhost:5173, admin at /admin.html
npm run build && npm start   # production build at http://localhost:3000
npm test                 # logic tests (fake Supabase client)
```
Success is shown to a student only after the row is read back from Supabase. A retry with the same submission key returns the original ID instead of a duplicate.

## Update event details
Edit the marked block at the top of `shared/config.js`.
