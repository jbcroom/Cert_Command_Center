# Contributing to Cert Command Center

Thanks for your interest in contributing. This project accepts two types of contributions:

1. **Certification content** — MCQ banks and flashcard banks for new certifications
2. **Code** — bug fixes and features

Content contributions are especially valued — a quality question bank for a popular cert is immediately useful to every user of the template.

---

## Content contributions

The most impactful way to contribute is adding a verified MCQ or flashcard bank for a certification not yet covered.

**Full guide:** [docs/contributing-content.md](docs/contributing-content.md)

**Short version:**
1. Fork → `git checkout -b content/<cert-id>`
2. Create JSON files in `seed-data/` following the existing format
3. Run `npm run validate-content` — all checks must pass
4. Update `scripts/seed.js` with the new files
5. Update the README "Included content" table
6. Open a PR using the content contribution template

**Content quality bar:**
- Every correct answer must be verifiable against an official source
- No AI-generated question-answer pairs without source verification
- Domain names must match the official exam blueprint exactly
- `correct_index` verified against official documentation

---

## Code contributions

### Reporting bugs

Open an issue using the **bug report** template. Include steps to reproduce and any relevant error output.

### Submitting fixes or features

1. Fork the repository
2. Branch naming: `fix/short-description` or `feat/short-description`
3. Make your change, test it locally (`npm run dev`)
4. Open a PR with a clear description of what changed and why
5. Include a test plan — what did you test, what edge cases did you check?

### Code style

- Follow the existing patterns (React functional components, Tailwind classes, Supabase REST)
- No new dependencies without discussion in the issue first
- Server-side secrets stay in `api/` — never in `src/`

---

## What we don't accept

- AI-generated question banks without source verification
- Personal data of any kind
- API keys or credentials in any form
- Changes that break the existing install flow

---

## Questions?

Open an issue with your question before starting significant work — saves everyone time if the direction needs discussion first.
