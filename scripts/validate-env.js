#!/usr/bin/env node
/**
 * Validates all required environment variables and tests connectivity.
 * Run: npm run validate-env
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// Load .env.local manually (dotenv may not be installed yet)
function loadEnv() {
  const envPath = resolve(root, '.env.local');
  if (!existsSync(envPath)) {
    console.error('\n✗ .env.local not found. Copy .env.example to .env.local and fill in your values.\n');
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

const VARS = [
  {
    key: 'VITE_SUPABASE_URL',
    description: 'Supabase project URL',
    required: true,
    validate: v => v.startsWith('https://') && v.includes('.supabase.co'),
    hint: 'Should look like https://xxxx.supabase.co',
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    description: 'Supabase anon key',
    required: true,
    validate: v => v.length > 20,
  },
  {
    key: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase service role key (server-side only)',
    required: true,
    validate: v => v.length > 20,
  },
  {
    key: 'ANTHROPIC_API_KEY',
    description: 'Anthropic API key',
    required: true,
    validate: v => v.startsWith('sk-ant-'),
    hint: 'Should start with sk-ant-',
  },
  {
    key: 'RESEND_API_KEY',
    description: 'Resend API key (email digest)',
    required: false,
    validate: v => v.startsWith('re_'),
    hint: 'Should start with re_ — optional, only needed for email digest',
  },
];

let warnings = 0;
let errors = 0;

console.log('\nValidating environment variables...\n');

for (const v of VARS) {
  const val = process.env[v.key];
  const label = v.key.padEnd(30);

  if (!val || val.includes('your-') || val.includes('YOUR_')) {
    if (v.required) {
      console.log(`✗ ${label} missing or placeholder${v.hint ? ` — ${v.hint}` : ''}`);
      errors++;
    } else {
      console.log(`⚠ ${label} missing — ${v.description} (optional)`);
      warnings++;
    }
    continue;
  }

  if (v.validate && !v.validate(val)) {
    console.log(`✗ ${label} present but looks malformed${v.hint ? ` — ${v.hint}` : ''}`);
    if (v.required) errors++; else warnings++;
    continue;
  }

  console.log(`✓ ${label} present`);
}

// Connectivity checks
if (errors === 0) {
  console.log('\nTesting connectivity...\n');

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(`${supabaseUrl}/rest/v1/certifications?select=id&limit=1`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
    });
    if (res.ok || res.status === 406) {
      console.log('✓ Supabase connection        reachable');
    } else {
      console.log(`✗ Supabase connection        HTTP ${res.status} — check your URL and service role key`);
      errors++;
    }
  } catch {
    console.log('✗ Supabase connection        unreachable — check VITE_SUPABASE_URL');
    errors++;
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    });
    if (res.ok || res.status === 403) {
      console.log('✓ Anthropic API              reachable');
    } else if (res.status === 401) {
      console.log('✗ Anthropic API              invalid key (401)');
      errors++;
    } else {
      console.log(`⚠ Anthropic API              HTTP ${res.status}`);
      warnings++;
    }
  } catch {
    console.log('⚠ Anthropic API              unreachable — check network');
    warnings++;
  }
}

console.log('');
if (errors > 0) {
  console.log(`${errors} error(s) found. Fix the above before running setup.\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`${warnings} warning(s). Core setup is ready. Run \`npm run setup\` to continue.\n`);
} else {
  console.log('All checks passed. Run `npm run setup` to continue.\n');
}
