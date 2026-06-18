---
name: Content contribution
about: Add or update certification content (MCQs, flashcards)
labels: content
---

**Certification:** <!-- Full name + official exam code, e.g. "AWS Certified Cloud Practitioner CLF-C02" -->

**Content type:**
- [ ] MCQs
- [ ] Flashcards
- [ ] Both

**Number of items:** <!-- e.g. "65 questions / 40 cards" -->

**Official source URL:** <!-- The exam guide or skills outline you used as the primary source -->

**Domain names source:** <!-- Where did you get the domain names? Link to official exam blueprint if possible -->

**Checklist:**
- [ ] `npm run validate-content` passes with no errors
- [ ] Domain names match the official exam guide exactly (case and punctuation)
- [ ] No duplicate question text within the bank
- [ ] All MCQs have an `explanation` field
- [ ] `correct_index` verified against the official source (include source link in explanation where possible)
- [ ] No AI-generated answers — all answers verifiable against official documentation
