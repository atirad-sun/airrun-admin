# airrun admin

Desktop-only admin dashboard for the airrun ops team. Talks to the same Supabase project as the LIFF app via a dedicated `admin-api` Edge Function.

Sibling repos:

- [`run-and-dust-app`](https://github.com/atirad-sun/run-and-dust-app) — LIFF runner app + Supabase schema/edge functions.
- [`airrun-shared`](https://github.com/atirad-sun/airrun-shared) — shared types/utils, installed via git.

## Stack

- Vite + React 19 + TypeScript
- React Router v7
- Tailwind v4 + shadcn/ui (new-york, neutral)
- Supabase JS (magic-link auth)
- lucide-react, recharts

## Local dev

```bash
cp .env.example .env.local
# Fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (Supabase Dashboard → Settings → API)
npm install
npm run dev
```

→ http://localhost:5173

Sign in with the email of an admin row (see `app/supabase/016_admin_auth.sql` and the bootstrap step in `app/supabase/DEPLOY_CHECKLIST.md`). The magic-link redirects back to `/auth/callback`.

## What's wired up vs. stubbed

- Magic-link auth + auth-gated routes — wired.
- Sidebar shell with all 7 sections — wired.
- Each section page — placeholder, real content comes in follow-up phases once the `admin-api` Edge Function lands.

## Deploy

Separate Vercel project pointed at this repo. Production URL: **https://admin.airrunth.com** (CNAME → `cname.vercel-dns.com` via GoDaddy DNS). The default `airrun-admin.vercel.app` URL also still works during the rollover.

CSP in `vercel.json` is admin-only — does not allow `liff.line.me` / `static.line-scdn.net`.

Every admin SPA origin must appear in the `ALLOWED_ADMIN_ORIGINS` Supabase secret (comma-separated, with scheme, no trailing slash). Adding a new origin without updating that secret breaks CORS preflight on every admin-api call.
