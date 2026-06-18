# Installation Guide

Complete step-by-step setup for Cert Command Center.

**Time required:** ~15 minutes

---

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **A Supabase account** — free tier works fine — [supabase.com](https://supabase.com)
- **An Anthropic API key** — for AI features — [console.anthropic.com](https://console.anthropic.com)
- **A Vercel account** — free tier works fine — [vercel.com](https://vercel.com)
- **A Resend account** *(optional)* — for the weekly email digest — [resend.com](https://resend.com)

---

## Step 1 — Create your instance from the template

1. On the repository homepage, click **"Use this template"** → **"Create a new repository"**
2. Name it whatever you like (e.g. `my-cert-hub`). Set it to **Private** — this is your personal instance.
3. Clone the new repository to your machine:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
cd YOUR_REPO_NAME
npm install
```

---

## Step 2 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **"New project"**
3. Choose an organization, give the project a name (e.g. `cert-command-center`), pick the region closest to you, and set a database password
4. Wait ~2 minutes for the project to provision
5. Go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public** key
   - **service_role** key (click the eye icon to reveal — keep this secret)

---

## Step 3 — Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign in and go to **API Keys**
3. Click **"Create Key"** and copy the key (starts with `sk-ant-`)

---

## Step 4 — Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` in your editor and fill in your values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-api-key
RESEND_API_KEY=your-resend-api-key   # optional
VITE_DEV_BYPASS_AUTH=true            # local dev only
```

`.env.local` is listed in `.gitignore` and will never be committed.

See [configuration.md](configuration.md) for a full description of every variable.

---

## Step 5 — Run validation

```bash
npm run validate-env
```

This checks that all required variables are present and tests connectivity to Supabase and Anthropic. Fix any errors before continuing.

---

## Step 6 — Run setup

```bash
npm run setup
```

The interactive wizard will:
1. Re-validate your environment
2. Run all 9 database migrations
3. Ask which certifications to install
4. Seed the content banks (MCQs, flashcards)
5. Create your account and disable public signups

If the migration step fails (it requires a Supabase RPC function created in migration 001), use the **Supabase CLI** instead:

```bash
# Install Supabase CLI (once)
npm install -g supabase

# Run all migrations
supabase db push --project-ref YOUR_PROJECT_REF
```

Your project ref is the string in your Supabase project URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

Alternatively, paste each file from `supabase/migrations/` into the **Supabase SQL Editor** (Project → SQL Editor → New query).

---

## Step 7 — Run the app locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Sign in with the account you created in Step 6.

---

## Step 8 — Deploy to Vercel

### Option A — Vercel button (quickest)

Click the Deploy button in the README. Vercel will clone your repo and prompt for environment variables.

### Option B — Manual deploy

```bash
# Install Vercel CLI (once)
npm install -g vercel

# Deploy
vercel deploy
```

Follow the prompts to link to your Vercel account and project.

---

## Step 9 — Add environment variables in Vercel

In the Vercel dashboard → your project → **Settings → Environment Variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | your project URL | |
| `VITE_SUPABASE_ANON_KEY` | your anon key | |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key | |
| `ANTHROPIC_API_KEY` | your Anthropic key | **Do NOT add `VITE_` prefix** |
| `RESEND_API_KEY` | your Resend key | optional |

> **Do not add `VITE_DEV_BYPASS_AUTH`** — this is local development only. It has no effect in production builds but there's no reason to include it.

Redeploy after adding variables: **Deployments → your latest deployment → Redeploy**.

---

## Step 10 — Verify the deployment

Open your Vercel URL. You should see the login screen. Sign in with the account from Step 6.

If you see the "Setup isn't complete yet" screen instead of the login page, the database migrations haven't run against your production Supabase project. Re-run `npm run setup` pointing at the same Supabase project your Vercel deployment uses.

---

## Optional: Email digest (Resend)

1. Create a free account at [resend.com](https://resend.com)
2. Go to **API Keys → Create API Key**
3. Add `RESEND_API_KEY` to `.env.local` and to Vercel environment variables
4. In the app, go to **System → Digest Settings**, enable the digest, and set your email

On the free Resend tier, emails can only be sent to the email address on your Resend account until you verify a custom domain. This is fine for personal use.

---

## Optional: PWA installation

The app is installable as a Progressive Web App on iOS and Android:

- **iOS (Safari):** tap the Share icon → "Add to Home Screen"
- **Android (Chrome):** tap the three-dot menu → "Add to Home Screen"

---

## Troubleshooting

**"VITE_SUPABASE_URL missing or placeholder"**
Make sure you copied `.env.example` to `.env.local` (not `.env`) and that the file is in the project root.

**Migration fails with "exec_migration does not exist"**
Use `supabase db push` or paste migrations manually in the Supabase SQL editor. See Step 6 above.

**"Account creation failed: User already registered"**
An account with that email already exists in your Supabase project. Sign in at the Supabase dashboard → Authentication → Users to check. If you want to reset, delete the user there and re-run `npm run setup`.

**AI features return errors in the deployed app**
Check that `ANTHROPIC_API_KEY` is set in Vercel environment variables without a `VITE_` prefix. The `VITE_` prefix exposes variables to the browser — the Anthropic key must stay server-side.

**Email digest sends but I don't receive it**
On the Resend free tier, emails only deliver to the email address on your Resend account. Verify your domain at resend.com to send to any address.

**The app is empty after deploying (no certs showing)**
Run `npm run setup` or `npm run seed` to populate the database. The app shows a setup screen if the certifications table is empty.
