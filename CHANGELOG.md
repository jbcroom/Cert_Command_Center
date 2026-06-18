# Changelog

All notable changes to this template are documented here.

Format: each release includes **Added / Changed / Fixed** sections and mandatory **Upgrade steps** for existing installers.

---

## [Unreleased]
<!-- Staging area for the next release -->

---

## [1.0.0] — 2026-06-17

Initial release.

### Added

**Core app**
- Dashboard with streak tracking, study hours, topic confidence heatmap
- Certification registry (10 certs: Microsoft, Databricks, DAMA, AWS, MIT, Wharton)
- Certification detail pages with tabbed navigation
- Archived certifications view

**Flashcards**
- Flashcard review with SM-2 spaced repetition algorithm
- AI flashcard generation targeting weak domains
- Bulk CSV import
- FlashcardManager tab for full CRUD

**Mock exams**
- Timed mock exam engine with configurable domain weights
- Drill mode (accuracy²-weighted question selection for weak domains)
- AI exam debrief — post-exam analysis with weak area identification
- Exam readiness Go/No-Go signal

**Study planning**
- AI study plan generation (personalised week-by-week plan)
- Study guide generation per domain
- Post-exam reflection (domain ratings + notes)

**Tracking and visibility**
- Calendar view with iCal export (target dates, study sessions, flashcard due dates, mock exams)
- In-app notification centre (readiness alerts, exam reminders, reflection prompts)
- Weekly email digest (configurable via Resend)
- API usage tracking (Anthropic token consumption + cost estimate)

**Infrastructure**
- 9 numbered SQL migrations (001–009)
- Interactive setup wizard (`npm run setup`)
- Migration runner (`npm run migrate`)
- Seed script with domain-name verification and `--certs` flag (`npm run seed`)
- Content validator (`npm run validate-content`)
- Environment validator (`npm run validate-env`)
- FirstRunScreen for zero-cert detection
- PWA support (installable on iOS and Android)
- Dev auth bypass for local development

**Included content banks**
- DP-700: 45 MCQs + 30 flashcards (4 domains)
- Databricks Generative AI Engineer: 45 MCQs + 45 flashcards (6 domains)
- CDMP Fundamentals: 56 MCQs + 38 flashcards (14 domains)

### Upgrade steps for existing installers

This is the initial release — no upgrade steps required.

---

## How to upgrade your instance

When a new release is published:

```bash
# Pull the latest changes
git fetch upstream
git merge upstream/main

# Apply new migrations (only runs files not yet applied)
npm run migrate

# Apply new seed data if content was added (idempotent)
npm run seed

# Add any new environment variables to .env.local and Vercel dashboard
# (listed explicitly in each release's Upgrade steps)
```
