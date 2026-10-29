-- Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists public.registrations (
  id text primary key,
  submitted_at timestamptz not null default now(),
  team_name text not null,
  team_size integer not null,
  lead_name text not null,
  lead_year text not null,
  team_members text not null default '',
  lead_phone text not null,
  utr text not null,
  consent text not null,
  submission_key text unique
);
-- Lock the table: with RLS on and no policies, the public anon key can read/write nothing.
-- Only the server's service-role key (never sent to browsers) can access it.
alter table public.registrations enable row level security;
revoke all on public.registrations from anon, authenticated;
create index if not exists registrations_submitted_at_idx on public.registrations (submitted_at desc);
