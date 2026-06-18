## What this changes

<!-- Describe what this PR does and why -->

## Type of change
- [ ] Bug fix
- [ ] New feature
- [ ] Content bank (MCQs / flashcards for a certification)
- [ ] Documentation
- [ ] Other

## Checklist

### For all PRs
- [ ] The change works locally (`npm run dev`)
- [ ] No real API keys, credentials, or personal data in any committed file

### For content PRs
- [ ] `npm run validate-content` passes with no errors
- [ ] Domain names match the official exam guide exactly (source URL included below)
- [ ] No duplicate question text within the bank
- [ ] All MCQs have `explanation` text
- [ ] `correct_index` verified against official source
- [ ] No AI-hallucinated answers — every answer is verifiable against official documentation
- [ ] `scripts/seed.js` updated with the new content file(s)
- [ ] README "Included content" table updated with cert name and counts

**Official source URL:**
<!-- Required for content PRs -->
