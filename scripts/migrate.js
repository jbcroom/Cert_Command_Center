#!/usr/bin/env node
/**
 * Migration runner — applies pending SQL migrations from supabase/migrations/
 * Uses a _migrations tracking table so each file runs exactly once.
 *
 * Run: npm run migrate
 *
 * Preferred alternative: supabase db push (if Supabase CLI is installed)
 * This script is a fallback for users who don't want to install the CLI.
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env.local');
  if (!existsSync(envPath)) {
    console.error('\n✗ .env.local not found. Run npm run validate-env first.\n');
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

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('✗ VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
  process.exit(1);
}

const headers = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

async function sql(query) {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });
  // Supabase REST doesn't expose raw SQL execution — use the pg endpoint
  // which is available via the management API. For self-hosted runners
  // without CLI access, we use the pg_execute workaround below.
  return res;
}

// Supabase exposes SQL execution via the pg endpoint on the pooler
async function execSQL(sqlText) {
  const pgUrl = supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.supabase.co');
  const res = await fetch(`${pgUrl}/rest/v1/rpc/exec_migration`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ sql_text: sqlText }),
  });

  if (!res.ok) {
    // Fall back to direct pg connection hint
    const body = await res.text();
    throw new Error(`SQL execution failed (${res.status}): ${body}\n\nNote: For best results, use the Supabase CLI:\n  supabase db push\n  See docs/installation.md for details.`);
  }
  return res;
}

// Create the migrations tracking table via Supabase REST (creates a regular table)
async function ensureMigrationsTable() {
  // Check if _migrations table exists by querying it
  const check = await fetch(
    `${supabaseUrl}/rest/v1/_migrations?select=filename&limit=1`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );

  if (check.status === 404 || check.status === 400) {
    // Table doesn't exist — create it via the SQL API
    // This requires the exec_migration RPC to exist, which is created by 001_initial_schema.sql
    // Bootstrap: create _migrations directly via the management API
    console.log('  Creating _migrations tracking table...');
    const createRes = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_migration`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sql_text: `
          CREATE TABLE IF NOT EXISTS _migrations (
            filename   text primary key,
            applied_at timestamptz default now()
          );
        `,
      }),
    });
    if (!createRes.ok) {
      const body = await createRes.text();
      // If exec_migration RPC doesn't exist yet, we need the Supabase CLI
      if (body.includes('does not exist') || createRes.status === 404) {
        console.error(`
✗ Cannot create migrations table via REST API.

The exec_migration RPC function hasn't been created yet (it's part of 001_initial_schema.sql),
and the REST API can't execute raw SQL without it.

Please use the Supabase CLI for the initial setup:
  1. Install: npm install -g supabase
  2. Run: supabase db push --project-ref YOUR_PROJECT_REF

Or run migrations manually in the Supabase SQL editor:
  → supabase.com → your project → SQL editor → paste each file

See docs/installation.md for step-by-step instructions.
`);
        process.exit(1);
      }
      throw new Error(`Failed to create _migrations table: ${body}`);
    }
  }
}

async function getApplied() {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/_migrations?select=filename&order=filename`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return new Set();
  const rows = await res.json();
  return new Set(rows.map(r => r.filename));
}

async function recordMigration(filename) {
  await fetch(`${supabaseUrl}/rest/v1/_migrations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ filename }),
  });
}

async function main() {
  console.log('\nCert Command Center — Migration Runner\n');

  const migrationsDir = resolve(root, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found in supabase/migrations/\n');
    return;
  }

  await ensureMigrationsTable();
  const applied = await getApplied();

  const pending = files.filter(f => !applied.has(f));
  const alreadyDone = files.length - pending.length;

  if (pending.length === 0) {
    console.log(`Already up to date. ${alreadyDone} migration(s) previously applied.\n`);
    return;
  }

  console.log(`Pending: ${pending.length} migration(s). Already applied: ${alreadyDone}.\n`);

  let ran = 0;
  for (const file of pending) {
    process.stdout.write(`  Running ${file}... `);
    const sqlText = readFileSync(resolve(migrationsDir, file), 'utf8');
    try {
      await execSQL(sqlText);
      await recordMigration(file);
      console.log('✓');
      ran++;
    } catch (err) {
      console.log('✗');
      console.error(`\n${err.message}\n`);
      process.exit(1);
    }
  }

  console.log(`\n${ran} migration(s) applied successfully.\n`);
}

main().catch(err => {
  console.error('\n✗', err.message, '\n');
  process.exit(1);
});
