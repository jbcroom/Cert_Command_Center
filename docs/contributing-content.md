# Contributing Certification Content

How to contribute MCQs, flashcards, or a new certification registry entry to the template so other users can benefit.

---

## Content quality standards

All contributed content must meet these standards before a PR will be merged:

1. **No AI-hallucinated answers.** Every correct answer must be verifiable against an official source (official exam guide, vendor documentation, or the exam body's published materials).
2. **Source URL required.** Include the official source URL for the certification as a comment at the top of each JSON file.
3. **Domain names must match the official exam guide exactly.** If the vendor publishes an exam skills outline or blueprint, use those domain names verbatim — case, punctuation, and all.
4. **No duplicate questions.** Run `npm run validate-content` — it will catch duplicates.
5. **Explanations are required for MCQs.** A question without an explanation is not useful for learning.

---

## Contribution workflow

### 1. Fork the template repository

Click **Fork** on the repository homepage, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/cert-command-center
cd cert-command-center
npm install
```

### 2. Create a feature branch

```bash
git checkout -b content/aws-clf-c02
```

Use the naming convention `content/<cert-id>`.

### 3. Create the content files

Follow the format in [adding-certifications.md](adding-certifications.md).

Add a source comment at the top of each JSON file:

```json
[
  {
    "_source": "https://aws.amazon.com/certification/certified-cloud-practitioner/",
    "domain_name": "Cloud Concepts",
    ...
  }
]
```

### 4. Run validation — all checks must pass

```bash
npm run validate-content
```

Do not open a PR if `validate-content` reports errors.

### 5. Update `scripts/seed.js`

Add your cert's files to the `BANKS` array so the seed script knows about them.

### 6. Update the README

Add your cert to the "Included content" section with the correct counts:

```
- AWS Cloud Practitioner CLF-C02 (65 MCQs + 30 flashcards across 4 domains)
```

Get the counts from your JSON files or from `validate-content` output.

### 7. Open a pull request

Use the **content contribution** PR template. Fill in all checklist items. Include the official source URL for the certification in the PR description.

---

## What happens after you open a PR

The maintainer will:
1. Run `npm run validate-content` against your files
2. Spot-check a sample of questions against the official source
3. Verify domain names match the official exam blueprint
4. Merge or request changes

Content PRs are usually reviewed within a week.

---

## Contributing bug fixes or app features

For code contributions (bug fixes, new features):

1. Fork and branch from `main`
2. Branch naming: `fix/description` or `feat/description`
3. Open a PR with a clear description of what changed and why
4. Include a test plan in the PR description

See [CONTRIBUTING.md](../CONTRIBUTING.md) for the full code contribution guide.
