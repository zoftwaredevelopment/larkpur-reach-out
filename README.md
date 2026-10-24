# larkpur reach out

WhatsApp outreach CRM for Nigerian SME recruitment leads. Built like job-app-hq: real lead ingestion, AI-generated messages, click-to-chat WhatsApp, and full pipeline tracking.

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind
- Supabase (shared project `zd-outreach-ng`, tables prefixed `larkspur_`)
- Groq (free tier) for AI message generation
- Google Places API for real company data
- Vercel deployment

## Setup

### 1. Supabase
No new project needed — this shares `zd-outreach-ng` (`pplpwdufxfioqyzmirwc`) with job-app-hq. All tables are prefixed `larkspur_`.

Run the migration:
```sh
supabase db push
```

### 2. Environment
Copy `.env.local.example` to `.env.local` and fill in:

| Variable | Source |
|----------|--------|
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console → Places API |
| `GROQ_API_KEY` | https://console.groq.com/keys (reuse from job-app-hq) |
| `CRON_SECRET` | Random string: `openssl rand -hex 32` |

Supabase URL/keys are already set from the shared project.

### 3. Install & Run
```sh
pnpm install
pnpm dev
```

Visit `http://localhost:3000`, sign in with magic link.

### 4. Seed Saved Searches
```sh
pnpm tsx scripts/seed.ts
```

### 5. Ingest Leads
```sh
curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/ingest
```

Or trigger via Vercel cron (daily at 8am UTC).

## How It Works

1. **Triage** (`/triage`) — Companies from Google Places appear here. Approve to create a lead, discard to remove.
2. **Leads** (`/leads`) — Your pipeline. Filter by stage, click through to any lead.
3. **Lead Detail** (`/leads/[id]`) — Click "Open WhatsApp" to start a chat with a pre-filled number. Generate AI-tailored messages per stage. Update stage with one click.
4. **Settings** (`/settings`) — Manage saved searches and view ingestion history.

## Database Schema

All tables prefixed `larkspur_`:
- `larkspur_companies` — Real companies from Google Places
- `larkspur_contacts` — Decision-makers at each company
- `larkspur_leads` — Main tracking table (stage, source, follow-up dates)
- `larkspur_interactions` — Auto-logged WhatsApp/call/email history
- `larkspur_messages` — AI-generated messages per stage
- `larkspur_saved_searches` — Google Places search configurations
- `larkspur_ingestion_runs` — Cron job logging