# Adding Certifications to Your Instance

How to add a certification that isn't in the shared registry.

---

## Option A — Add via the app UI (simplest)

In the app, click the **+** button next to "CERTIFICATIONS" in the sidebar. Fill in the cert details. This creates a cert in your Supabase database directly — no files to edit.

Use this for certifications you want to track but don't need MCQ/flashcard content for (coursework, personal goals, etc.).

---

## Option B — Add via seed JSON (for certs with content banks)

Use this when you also have MCQs or flashcards to import.

### 1. Add the cert to the registry

Create a new entry in `seed-data/certifications.json`:

```json
{
  "id": "your-cert-id",
  "name": "Your Certification Name",
  "vendor": "Vendor Name",
  "exam_code": "EXAM-CODE",
  "exam_url": "https://official-exam-page.com",
  "type": "exam",
  "passing_score": 700,
  "score_max": 1000,
  "status": "not_started",
  "year": 2026,
  "color": "#4F46E5",
  "cost": 165,
  "cost_paid": 0,
  "registered": false,
  "registration_date": null,
  "target_date": null,
  "personal_target_score": null,
  "voucher_notes": null,
  "completed_at": null,
  "final_grade": null,
  "exam_day_checklist": [],
  "target_date_history": [],
  "resources": [
    {
      "title": "Official Exam Guide",
      "url": "https://official-exam-page.com",
      "type": "official"
    }
  ],
  "domains": [
    { "name": "Domain One", "weight": 40 },
    { "name": "Domain Two", "weight": 35 },
    { "name": "Domain Three", "weight": 25 }
  ],
  "modules": []
}
```

**`type`** is either `"exam"` or `"coursework"`.

**`domains`** must match the official exam guide exactly — these names are used to validate MCQ and flashcard imports.

**`color`** is a hex colour shown in the sidebar and calendar.

### 2. Create MCQ and flashcard files (optional)

Create files in `seed-data/`:

**`seed-data/yourcert_mcq.json`:**

```json
[
  {
    "domain_name": "Domain One",
    "question": "What does X mean?",
    "options": ["Answer A", "Answer B", "Answer C", "Answer D"],
    "correct_index": 0,
    "explanation": "A is correct because...",
    "difficulty": "medium"
  }
]
```

**`seed-data/flashcards/yourcert_flashcards.json`:**

```json
[
  {
    "domain_name": "Domain One",
    "question": "What is X?",
    "answer": "X is...",
    "difficulty": "easy"
  }
]
```

**Difficulty** must be `"easy"`, `"medium"`, or `"hard"`.

**Domain names** must match `certifications.json` exactly (case-sensitive).

### 3. Validate the content

```bash
npm run validate-content
```

Fix any errors before seeding. Common issues:
- Domain name doesn't match exactly (check capitalisation and punctuation)
- `correct_index` is out of range (must be 0–3 for a 4-option question)
- Missing `explanation` field

### 4. Seed into your instance

```bash
npm run seed -- --certs your-cert-id
```

This is idempotent — safe to re-run if you add more questions later.

### 5. Wire up the seed script (if adding content files)

If you created new MCQ or flashcard files, add them to the `BANKS` array in `scripts/seed.js`:

```js
const BANKS = [
  ['dp-700', 'seed-data/dp700_mcq.json', 'seed-data/flashcards/dp700_flashcards.json'],
  // ... existing entries ...
  ['your-cert-id', 'seed-data/yourcert_mcq.json', 'seed-data/flashcards/yourcert_flashcards.json'],
];
```

---

## Sharing your content with others

If you've built a quality MCQ or flashcard bank for a cert that others might study, consider contributing it back to the template. See [contributing-content.md](contributing-content.md).
