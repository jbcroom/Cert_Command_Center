#!/usr/bin/env node
/**
 * Seeds the database with certifications registry and content banks.
 * All operations are idempotent (upsert) — safe to re-run.
 *
 * Run: npm run seed
 * Run (selective): npm run seed -- --certs dp-700,cdmp
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
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
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

// Parse --certs flag
const certsArg = process.argv.find(a => a.startsWith('--certs=')) ||
  (process.argv.includes('--certs') ? `--certs=${process.argv[process.argv.indexOf('--certs') + 1]}` : null);
const filterCerts = certsArg ? certsArg.replace('--certs=', '').split(',').map(s => s.trim()) : null;

function readJSON(relPath) {
  const fullPath = resolve(root, relPath);
  if (!existsSync(fullPath)) return null;
  return JSON.parse(readFileSync(fullPath, 'utf8'));
}

async function upsert(table, rows) {
  if (rows.length === 0) return;
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upsert to ${table} failed (${res.status}): ${body}`);
  }
}

async function getCertDomains(certId) {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/certifications?select=domains&id=eq.${certId}`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length || !rows[0].domains) return null;
  return rows[0].domains.map(d => d.name);
}

async function validateDomains(certId, items, label) {
  const liveDomains = await getCertDomains(certId);
  if (!liveDomains) return; // cert not yet seeded or no domains — skip check

  const itemDomains = [...new Set(items.map(i => i.domain_name).filter(Boolean))];
  const mismatches = itemDomains.filter(d => !liveDomains.includes(d));

  if (mismatches.length > 0) {
    console.error(`\n✗ Domain name mismatch in ${label}:`);
    console.error(`  Unknown domains: ${mismatches.join(', ')}`);
    console.error(`  Valid domains for ${certId}: ${liveDomains.join(', ')}`);
    process.exit(1);
  }
}

async function main() {
  console.log('\nCert Command Center — Seed Script\n');

  // 1. Certifications registry
  const allCerts = readJSON('seed-data/certifications.json');
  if (!allCerts) {
    console.error('✗ seed-data/certifications.json not found.');
    process.exit(1);
  }

  const certs = filterCerts ? allCerts.filter(c => filterCerts.includes(c.id)) : allCerts;
  if (filterCerts && certs.length === 0) {
    console.error(`✗ No certifications matched: ${filterCerts.join(', ')}`);
    console.error(`  Available IDs: ${allCerts.map(c => c.id).join(', ')}`);
    process.exit(1);
  }

  process.stdout.write(`Seeding certifications... `);
  await upsert('certifications', certs);
  console.log(`${certs.length} records upserted.`);

  // Content bank manifest — [ certId, mcqFile, flashcardFile ]
  const BANKS = [
    ['dp-700',           'seed-data/dp700_mcq.json',             'seed-data/flashcards/dp700_flashcards.json'],
    ['databricks-genai', 'seed-data/databricks_genai_mcq.json',  'seed-data/flashcards/databricks_genai_flashcards.json'],
    ['cdmp',             'seed-data/cdmp_mcq.json',              'seed-data/flashcards/cdmp_flashcards.json'],
  ];

  const activeBanks = filterCerts
    ? BANKS.filter(([id]) => filterCerts.includes(id))
    : BANKS;

  // 2. MCQ banks
  for (const [certId, mcqFile] of activeBanks) {
    const questions = readJSON(mcqFile);
    if (!questions) {
      console.log(`⚠ ${mcqFile} not found — skipping.`);
      continue;
    }
    await validateDomains(certId, questions, mcqFile);
    const rows = questions.map(q => ({ ...q, cert_id: certId }));
    process.stdout.write(`Seeding ${mcqFile}... `);
    await upsert('mock_exam_questions', rows);
    console.log(`${rows.length} questions upserted.`);
  }

  // 3. Flashcard banks
  for (const [certId, , fcFile] of activeBanks) {
    const cards = readJSON(fcFile);
    if (!cards || cards.length === 0) {
      console.log(`⚠ ${fcFile} not found or empty — skipping.`);
      continue;
    }
    await validateDomains(certId, cards, fcFile);
    const rows = cards.map(c => ({ ...c, cert_id: certId, active: true }));
    process.stdout.write(`Seeding ${fcFile}... `);
    await upsert('flashcards', rows);
    console.log(`${rows.length} cards upserted.`);
  }

  console.log('\nDone. ✓\n');
}

main().catch(err => {
  console.error('\n✗', err.message, '\n');
  process.exit(1);
});
