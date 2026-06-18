# Configuration Reference

All environment variables used by Cert Command Center.

Set these in `.env.local` for local development and in the Vercel dashboard for production.
Never commit `.env.local` to git — it is listed in `.gitignore`.

---

## Required variables

### `VITE_SUPABASE_URL`

**What it does:** Points the frontend to your Supabase project's REST and Auth APIs.

**Where to find it:** Supabase dashboard → your project → Settings → API → Project URL

**Format:** `https://xxxxxxxxxxxx.supabase.co`

**What breaks if missing:** The app cannot connect to the database. All data operations fail.

---

### `VITE_SUPABASE_ANON_KEY`

**What it does:** Authenticates frontend requests to Supabase. The anon key enforces Row Level Security — users can only see their own data.

**Where to find it:** Supabase dashboard → Settings → API → `anon` / `public`

**Format:** A long JWT string starting with `eyJ`

**Safe to expose:** Yes — this key is designed to be public. RLS policies protect your data.

**What breaks if missing:** The app cannot read or write any data.

---

### `SUPABASE_SERVICE_ROLE_KEY`

**What it does:** Gives the migration and seed scripts full database access, bypassing RLS. Used only by scripts in the `scripts/` directory — never by the frontend or Vercel Functions.

**Where to find it:** Supabase dashboard → Settings → API → `service_role`

**Format:** A long JWT string starting with `eyJ`

**Keep this secret:** Yes. Never put this in a `VITE_` prefixed variable. Never commit it. Never expose it in frontend code.

**What breaks if missing:** `npm run migrate`, `npm run seed`, and `npm run setup` will not work.

---

### `ANTHROPIC_API_KEY`

**What it does:** Authenticates requests to the Anthropic API for all AI features: certification Q&A chat, study guide generation, study plan generation, exam debrief, and AI flashcard generation.

**Where to find it:** [console.anthropic.com](https://console.anthropic.com) → API Keys → Create Key

**Format:** Starts with `sk-ant-`

**IMPORTANT — no `VITE_` prefix:** This key must be named exactly `ANTHROPIC_API_KEY`, not `VITE_ANTHROPIC_API_KEY`. Variables prefixed with `VITE_` are embedded in the browser bundle and visible to anyone who inspects the page source. The Anthropic key is used server-side only via Vercel Functions in the `api/` directory.

**What breaks if missing:** All AI features return errors. The app still works without AI features.

---

## Optional variables

### `RESEND_API_KEY`

**What it does:** Authenticates requests to the Resend email API for the weekly study digest.

**Where to find it:** [resend.com](https://resend.com) → API Keys → Create API Key

**Format:** Starts with `re_`

**Required:** No. AI features, flashcards, mock exams, and all other features work without this.

**What breaks if missing:** The weekly email digest will fail to send. All other features are unaffected.

**Free tier note:** On Resend's free tier, emails can only be sent to the email address on your Resend account. To send to any address, verify a custom domain at resend.com.

---

## Dev-only variables

### `VITE_DEV_BYPASS_AUTH`

**What it does:** When set to `true`, bypasses the login screen in local development so you can test without signing in. Vite hardcodes `import.meta.env.DEV = false` in all production builds, making this bypass completely unreachable in deployed builds — it is not a security risk.

**Set in:** `.env.local` only. Never add this to Vercel environment variables (it has no effect there, but there's no reason to include it).

**Value:** `true`

---

## Summary table

| Variable | Required | Frontend | Server-side | Secret |
|---|---|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Yes | Yes (scripts) | No |
| `VITE_SUPABASE_ANON_KEY` | Yes | Yes | No | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (scripts) | **Never** | Yes (scripts only) | **Yes** |
| `ANTHROPIC_API_KEY` | Yes (AI features) | **Never** | Yes (Vercel Functions) | **Yes** |
| `RESEND_API_KEY` | No | **Never** | Yes (Vercel Functions) | **Yes** |
| `VITE_DEV_BYPASS_AUTH` | No | Dev only | No | No |
