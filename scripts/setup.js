#!/usr/bin/env node
/**
 * Interactive first-run setup wizard.
 * Validates env → runs migrations → selects certs → seeds content → creates account.
 *
 * Run: npm run setup
 * Requires: @inquirer/prompts  (npm install --save-dev @inquirer/prompts)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ─── env loader ──────────────────────────────────────────────────────────────

function loadEnv() {
  const envPath = resolve(root, '.env.local');
  if (!existsSync(envPath)) {
    console.error('\n✗ .env.local not found.\n  Copy .env.example to .env.local and fill in your values, then re-run setup.\n');
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}

// ─── dependency check ────────────────────────────────────────────────────────

async function ensureDeps() {
  try {
    await import('@inquirer/prompts');
  } catch {
    console.log('\nInstalling required setup dependency (@inquirer/prompts)...');
    execSync('npm install --save-dev @inquirer/prompts', { cwd: root, stdio: 'inherit' });
    console.log('');
  }
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

function makeHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=minimal',
  };
}

async function supabaseGet(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function supabasePost(url, key, path, body) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: 'POST',
    headers: makeHeaders(key),
    body: JSON.stringify(body),
  });
  return res;
}

// ─── validate env step ───────────────────────────────────────────────────────

async function stepValidate() {
  console.log('Step 1/5 — Validating environment...');

  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'ANTHROPIC_API_KEY'];
  const missing = required.filter(k => !process.env[k] || process.env[k].includes('your-'));

  if (missing.length > 0) {
    console.error(`\n  ✗ Missing required variables: ${missing.join(', ')}`);
    console.error('  Edit .env.local and re-run npm run setup.\n');
    process.exit(1);
  }

  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const res = await fetch(`${url}/rest/v1/certifications?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok && res.status !== 406) throw new Error(`HTTP ${res.status}`);
    console.log('  ✓ All required variables present');
    console.log('  ✓ Supabase connection reachable');
  } catch (err) {
    console.error(`  ✗ Supabase connection failed: ${err.message}`);
    console.error('  Check VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.\n');
    process.exit(1);
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    });
    if (res.status === 401) {
      console.error('  ✗ Anthropic API key is invalid (401).');
      process.exit(1);
    }
    console.log('  ✓ Anthropic API reachable');
  } catch {
    console.log('  ⚠ Anthropic API unreachable — AI features may not work (check network)');
  }

  console.log('');
}

// ─── migrations step ─────────────────────────────────────────────────────────

async function stepMigrate() {
  console.log('Step 2/5 — Running database migrations...');
  console.log('  Tip: If this fails, use `supabase db push` instead (see docs/installation.md)');
  console.log('');

  try {
    // Dynamically run migrate.js
    const { default: runMigrate } = await import('./migrate.js').catch(() => null) || {};
    // migrate.js is a standalone script — run it as a child process to capture output cleanly
    execSync('node scripts/migrate.js', { cwd: root, stdio: 'inherit' });
  } catch {
    console.error('\n  Migration step failed. See error above.');
    console.error('  Alternative: paste each file from supabase/migrations/ into the Supabase SQL editor.\n');
    process.exit(1);
  }
}

// ─── cert selection step ─────────────────────────────────────────────────────

async function stepSelectCerts() {
  const { checkbox } = await import('@inquirer/prompts');

  const allCerts = JSON.parse(readFileSync(resolve(root, 'seed-data/certifications.json'), 'utf8'));

  // Determine which certs have content banks available
  const CONTENT_CERTS = new Set(['dp-700', 'databricks-genai', 'cdmp']);

  console.log('Step 3/5 — Choose certifications to install');
  console.log('  (You can add more later via `npm run seed -- --certs <id>`)\n');

  const choices = allCerts.map(c => ({
    name: `${c.id.padEnd(25)} ${c.name}${CONTENT_CERTS.has(c.id) ? '' : ' (registry only — no content bank yet)'}`,
    value: c.id,
    checked: CONTENT_CERTS.has(c.id),
  }));

  const selected = await checkbox({
    message: 'Select certifications to include:',
    choices,
    validate: v => v.length > 0 || 'Select at least one certification.',
  });

  console.log('');
  return selected;
}

// ─── seed step ───────────────────────────────────────────────────────────────

async function stepSeed(selectedCerts) {
  console.log('Step 4/5 — Seeding content...\n');
  const certsArg = selectedCerts.join(',');
  execSync(`node scripts/seed.js --certs=${certsArg}`, { cwd: root, stdio: 'inherit' });
}

// ─── account creation step ───────────────────────────────────────────────────

async function stepCreateAccount() {
  const { input, password, confirm } = await import('@inquirer/prompts');

  console.log('Step 5/5 — Create your account\n');
  console.log('  This creates the only account that can access your instance.');
  console.log('  Public signups will be disabled after this step.\n');

  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const email = await input({
    message: 'Email:',
    validate: v => v.includes('@') || 'Enter a valid email address.',
  });

  const pwd = await password({
    message: 'Password (min 8 characters):',
    validate: v => v.length >= 8 || 'Password must be at least 8 characters.',
  });

  const confirmed = await password({
    message: 'Confirm password:',
    validate: v => v === pwd || 'Passwords do not match.',
  });

  if (pwd !== confirmed) {
    console.error('  ✗ Passwords do not match.');
    process.exit(1);
  }

  // Create user via Supabase Admin API
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password: pwd,
      email_confirm: true,
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.json().catch(() => ({}));
    if (body.message?.includes('already been registered')) {
      console.log('  ⚠ An account with this email already exists — skipping account creation.');
    } else {
      console.error(`  ✗ Account creation failed: ${body.message || createRes.status}`);
      process.exit(1);
    }
  } else {
    console.log(`  ✓ Account created for ${email}`);
  }

  // Disable public signups
  const configRes = await fetch(`${url}/auth/v1/admin/config`, {
    method: 'PUT',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ disable_signup: true }),
  });

  if (configRes.ok) {
    console.log('  ✓ Public signups disabled — only your account can access this instance.');
  } else {
    console.log('  ⚠ Could not disable public signups automatically.');
    console.log('  Disable manually: Supabase dashboard → Authentication → Providers → disable "Enable Sign Ups"');
  }

  console.log('');
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   Cert Command Center — First Run Setup ║');
  console.log('╚════════════════════════════════════════╝\n');

  loadEnv();
  await ensureDeps();

  await stepValidate();
  await stepMigrate();
  const selectedCerts = await stepSelectCerts();
  await stepSeed(selectedCerts);
  await stepCreateAccount();

  const repoUrl = 'https://github.com/YOUR_USERNAME/cert-command-center';

  console.log('════════════════════════════════════════');
  console.log('Setup complete!\n');
  console.log('Next steps:');
  console.log('  1. Deploy to Vercel:  vercel deploy');
  console.log('  2. Add environment variables in the Vercel dashboard');
  console.log('     (same keys as your .env.local, minus VITE_DEV_BYPASS_AUTH)');
  console.log('  3. Open your app and start studying\n');
  console.log(`  Docs: ${repoUrl}/blob/main/docs/installation.md`);
  console.log('════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n✗', err.message, '\n');
  process.exit(1);
});
