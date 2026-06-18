# Cert Command Center

A personal certification study hub — flashcards with spaced repetition, mock exams, AI-generated study guides and study plans, progress tracking, and a weekly email digest. Built for serious multi-cert study.

> **This is a GitHub Template Repository.** Click "Use this template" to create your own private instance with no prior commit history.

---

## ✨ Features

- **Flashcards with spaced repetition** — SM-2 algorithm schedules reviews at optimal intervals
- **Mock exam engine** — timed exams with configurable domain weights, question bank per cert
- **AI study guide generation** — per-domain guides generated from your weak areas using Claude
- **AI exam debrief** — post-exam analysis highlighting what to study based on your answers
- **AI study plan generation** — personalised week-by-week plan based on your timeline and accuracy
- **AI flashcard generation** — generates new cards targeting your lowest-accuracy domains
- **Drill mode** — focused practice on weak domains using accuracy-weighted question selection
- **Exam readiness go/no-go** — data-driven signal on whether you're ready to sit the exam
- **Progress dashboard** — streak tracking, topic confidence heatmap, study hours
- **Calendar view** — all target dates, study sessions, and review queues in one view with iCal export
- **Weekly email digest** — configurable summary of upcoming dates, flashcard queue, and priority domains
- **In-app notifications** — readiness alerts, exam reminders, reflection prompts
- **Post-exam reflection** — domain-by-domain rating and notes after each sitting
- **Bulk CSV import** — import flashcards from a spreadsheet
- **PWA support** — installable on iOS and Android, works offline
- **API usage tracking** — see your Anthropic token consumption and estimated cost

---

## 📚 Included content

| Certification | MCQs | Flashcards | Domains |
|---|---|---|---|
| DP-700: Microsoft Fabric Data Engineer Associate | 45 | 30 | 4 |
| Databricks Generative AI Engineer Associate | 45 | 45 | 6 |
| CDMP Fundamentals (DAMA International) | 56 | 38 | 14 |

**Registry only** (no content bank yet — community contributions welcome):
AWS Generative AI, AWS Solutions Architect Professional, Databricks Data Engineer Associate, Wharton Neuroscience for Business, Wharton Executive Presence, MIT Applied Agentic AI, MIT CTO Program

---

## 🚀 Quick start

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier)
- An [Anthropic](https://console.anthropic.com) API key
- A [Vercel](https://vercel.com) account (free tier)
- A [Resend](https://resend.com) account for email digest *(optional, free tier)*

### 1. Create your instance

Click **"Use this template"** at the top of this page → **"Create a new repository"**.
Set it to **Private** — this is your personal instance.

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME
cd YOUR_REPO_NAME
npm install
```

### 2. Set up Supabase

Create a new project at [supabase.com](https://supabase.com). Copy your **Project URL**, **anon key**, and **service_role key** from Settings → API.

### 3. Configure environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your keys
```

See [docs/configuration.md](docs/configuration.md) for a full description of every variable.

### 4. Run setup

```bash
npm run setup
```

The wizard validates your environment, runs migrations, lets you choose which certs to install, seeds content, and creates your account.

### 5. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO_NAME&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,ANTHROPIC_API_KEY,RESEND_API_KEY&envDescription=Required%20API%20keys%20%E2%80%94%20see%20docs/configuration.md&envLink=https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/blob/main/docs/configuration.md)

Or manually:

```bash
vercel deploy
```

Add the same environment variables in the Vercel dashboard after deploying.

---

## 📖 Documentation

- [Installation guide](docs/installation.md) — complete step-by-step setup
- [Configuration reference](docs/configuration.md) — all environment variables explained
- [Adding certifications](docs/adding-certifications.md) — add a cert not in the shared registry
- [Contributing content](docs/contributing-content.md) — contribute MCQs/flashcards via PR

---

## 🤝 Contributing

Content contributions (MCQ banks, flashcard banks for new certifications) are especially welcome.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide. The short version:
1. Fork → branch (`content/<cert-id>`) → add JSON files
2. Run `npm run validate-content` — all checks must pass
3. Open a PR using the content contribution template

---

## 🔄 Keeping your instance up to date

When this template receives updates (new cert banks, bug fixes):

```bash
# In your personal instance repo
git remote add upstream https://github.com/YOUR_USERNAME/cert-command-center
git fetch upstream
git merge upstream/main

# Apply any new migrations
npm run migrate

# Apply any new seed data
npm run seed
```

See [CHANGELOG.md](CHANGELOG.md) for what changed in each release and exactly what steps to run.

---

## License

MIT — see [LICENSE](LICENSE)
