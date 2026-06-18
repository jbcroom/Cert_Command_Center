#!/usr/bin/env node
/**
 * Validates seed-data JSON files for format correctness before seeding.
 * Checks: required fields, domain name consistency, no duplicate questions.
 *
 * Run: npm run validate-content
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readJSON(relPath) {
  const full = resolve(root, relPath);
  if (!existsSync(full)) return null;
  try {
    return JSON.parse(readFileSync(full, 'utf8'));
  } catch (e) {
    return { __parseError: e.message };
  }
}

let errors = 0;
let warnings = 0;

function err(msg) { console.log(`  ✗ ${msg}`); errors++; }
function warn(msg) { console.log(`  ⚠ ${msg}`); warnings++; }
function ok(msg)   { console.log(`  ✓ ${msg}`); }

// ─── certifications.json ─────────────────────────────────────────────────────

function validateCertifications() {
  console.log('\nValidating seed-data/certifications.json...');
  const certs = readJSON('seed-data/certifications.json');
  if (!certs) { err('File not found'); return []; }
  if (certs.__parseError) { err(`JSON parse error: ${certs.__parseError}`); return []; }

  const REQUIRED = ['id', 'name', 'vendor', 'type', 'status', 'color'];
  const PERSONAL = ['target_date', 'personal_target_score', 'voucher_notes', 'completed_at', 'final_grade', 'registration_date'];
  const ids = new Set();

  for (const cert of certs) {
    for (const f of REQUIRED) {
      if (!cert[f]) err(`${cert.id || '?'}: missing required field "${f}"`);
    }

    if (cert.status && cert.status !== 'not_started') {
      err(`${cert.id}: status should be "not_started", got "${cert.status}"`);
    }
    if (cert.cost_paid !== 0 && cert.cost_paid != null) {
      err(`${cert.id}: cost_paid should be 0, got ${cert.cost_paid}`);
    }
    if (cert.registered !== false) {
      err(`${cert.id}: registered should be false`);
    }

    for (const f of PERSONAL) {
      if (cert[f]) err(`${cert.id}: personal field "${f}" should be null/empty`);
    }

    if (ids.has(cert.id)) err(`Duplicate id: ${cert.id}`);
    ids.add(cert.id);
  }

  ok(`${certs.length} certifications validated`);
  return certs;
}

// ─── MCQ banks ───────────────────────────────────────────────────────────────

function validateMCQ(file, certId, certDomains) {
  console.log(`\nValidating ${file}...`);
  const questions = readJSON(file);
  if (!questions) { warn('File not found — skipping'); return; }
  if (questions.__parseError) { err(`JSON parse error: ${questions.__parseError}`); return; }

  const REQUIRED_MCQ = ['domain_name', 'question', 'options', 'correct_index', 'explanation'];
  const questionTexts = new Set();
  const domainNames = new Set();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const prefix = `Q${i + 1}`;

    for (const f of REQUIRED_MCQ) {
      if (q[f] == null || q[f] === '') err(`${prefix}: missing "${f}"`);
    }

    if (!Array.isArray(q.options) || q.options.length < 2) {
      err(`${prefix}: "options" must be an array with at least 2 items`);
    } else if (q.options.length !== 4) {
      warn(`${prefix}: has ${q.options.length} options (expected 4)`);
    }

    if (typeof q.correct_index !== 'number' || q.correct_index < 0 || q.correct_index >= (q.options?.length || 0)) {
      err(`${prefix}: correct_index ${q.correct_index} is out of range`);
    }

    if (!q.explanation || q.explanation.trim().length < 10) {
      warn(`${prefix}: explanation is very short or missing`);
    }

    if (questionTexts.has(q.question)) {
      err(`${prefix}: duplicate question text`);
    }
    questionTexts.add(q.question);

    if (q.domain_name) domainNames.add(q.domain_name);

    if (q.cert_id && q.cert_id !== certId) {
      err(`${prefix}: cert_id "${q.cert_id}" doesn't match expected "${certId}"`);
    }
  }

  // Domain name check against certifications.json
  if (certDomains && certDomains.length > 0) {
    const validDomains = new Set(certDomains);
    for (const d of domainNames) {
      if (!validDomains.has(d)) {
        err(`Domain "${d}" not found in certifications.json domains for ${certId}`);
      }
    }
  }

  ok(`${questions.length} questions validated (${domainNames.size} domains)`);
}

// ─── Flashcard banks ─────────────────────────────────────────────────────────

function validateFlashcards(file, certId, certDomains) {
  console.log(`\nValidating ${file}...`);
  const cards = readJSON(file);
  if (!cards) { warn('File not found — skipping'); return; }
  if (cards.__parseError) { err(`JSON parse error: ${cards.__parseError}`); return; }
  if (cards.length === 0) { warn('Empty — no cards to validate'); return; }

  const REQUIRED_FC = ['domain_name', 'question', 'answer'];
  const questionTexts = new Set();
  const domainNames = new Set();
  const VALID_DIFFICULTY = new Set(['easy', 'medium', 'hard']);

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const prefix = `Card${i + 1}`;

    for (const f of REQUIRED_FC) {
      if (!c[f]) err(`${prefix}: missing "${f}"`);
    }

    if (c.difficulty && !VALID_DIFFICULTY.has(c.difficulty)) {
      err(`${prefix}: difficulty "${c.difficulty}" must be easy|medium|hard`);
    }

    if (questionTexts.has(c.question)) err(`${prefix}: duplicate question`);
    questionTexts.add(c.question);
    if (c.domain_name) domainNames.add(c.domain_name);
  }

  if (certDomains && certDomains.length > 0) {
    const validDomains = new Set(certDomains);
    for (const d of domainNames) {
      if (!validDomains.has(d)) {
        err(`Domain "${d}" not found in certifications.json domains for ${certId}`);
      }
    }
  }

  ok(`${cards.length} flashcards validated (${domainNames.size} domains)`);
}

// ─── main ────────────────────────────────────────────────────────────────────

const BANKS = [
  ['dp-700',           'seed-data/dp700_mcq.json',            'seed-data/flashcards/dp700_flashcards.json'],
  ['databricks-genai', 'seed-data/databricks_genai_mcq.json', 'seed-data/flashcards/databricks_genai_flashcards.json'],
  ['cdmp',             'seed-data/cdmp_mcq.json',             'seed-data/flashcards/cdmp_flashcards.json'],
];

console.log('\nCert Command Center — Content Validator\n');

const certs = validateCertifications();
const certMap = Object.fromEntries(
  (Array.isArray(certs) ? certs : []).map(c => [c.id, (c.domains || []).map(d => d.name)])
);

for (const [certId, mcqFile, fcFile] of BANKS) {
  const domains = certMap[certId] || [];
  validateMCQ(mcqFile, certId, domains);
  validateFlashcards(fcFile, certId, domains);
}

console.log('\n────────────────────────────────────────');
if (errors > 0) {
  console.log(`\n${errors} error(s), ${warnings} warning(s). Fix errors before seeding.\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n0 errors, ${warnings} warning(s). Content is seedable.\n`);
} else {
  console.log('\nAll content valid. Ready to seed.\n');
}
