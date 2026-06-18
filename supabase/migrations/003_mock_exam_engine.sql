-- Migration: 003_mock_exam_engine
-- Description: Mock exam question bank, session tracking, and per-question responses
-- Depends on: 001_initial_schema
-- Safe to re-run: yes

-- ── Question bank ─────────────────────────────────────────────────────────────

create table if not exists mock_exam_questions (
  id            uuid        primary key default gen_random_uuid(),
  cert_id       text        not null references certifications(id),
  domain_name   text        not null,
  question      text        not null,
  options       jsonb       not null,  -- array of exactly 4 strings
  correct_index integer     not null check (correct_index between 0 and 3),
  explanation   text,
  difficulty    text        check (difficulty in ('easy', 'medium', 'hard')),
  created_at    timestamptz default now()
);

create index if not exists idx_mock_exam_questions_cert_domain
  on mock_exam_questions(cert_id, domain_name);

-- ── Exam configuration per cert ───────────────────────────────────────────────

create table if not exists mock_exam_configs (
  cert_id             text    primary key references certifications(id),
  question_count      integer not null,
  time_limit_seconds  integer not null
);

insert into mock_exam_configs (cert_id, question_count, time_limit_seconds) values
  ('dp-700',           50,  6600),
  ('databricks-genai', 45,  5400),
  ('cdmp',            100,  5400)
on conflict (cert_id) do nothing;

-- ── Active exam sessions ──────────────────────────────────────────────────────

create table if not exists mock_exam_sessions (
  id                  uuid        primary key default gen_random_uuid(),
  cert_id             text        not null references certifications(id),
  started_at          timestamptz default now(),
  completed_at        timestamptz,
  question_ids        jsonb       not null,  -- ordered array of question IDs drawn for this session
  time_limit_seconds  integer     not null,
  is_practice_mode    boolean     not null default false,
  status              text        not null default 'in_progress'
                                  check (status in ('in_progress', 'completed', 'abandoned')),
  ai_debrief          text        -- AI-generated insights stored after session completion
);

-- ── Per-question responses ────────────────────────────────────────────────────

create table if not exists mock_exam_responses (
  id               uuid        primary key default gen_random_uuid(),
  session_id       uuid        not null references mock_exam_sessions(id) on delete cascade,
  question_id      uuid        not null references mock_exam_questions(id),
  selected_index   integer     check (selected_index between 0 and 3),
  is_correct       boolean,
  time_spent_seconds integer,
  created_at       timestamptz default now()
);

create index if not exists idx_mock_exam_responses_session
  on mock_exam_responses(session_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table mock_exam_questions  enable row level security;
alter table mock_exam_configs    enable row level security;
alter table mock_exam_sessions   enable row level security;
alter table mock_exam_responses  enable row level security;

create policy "allow_all" on mock_exam_questions  for all using (true) with check (true);
create policy "allow_all" on mock_exam_configs    for all using (true) with check (true);
create policy "allow_all" on mock_exam_sessions   for all using (true) with check (true);
create policy "allow_all" on mock_exam_responses  for all using (true) with check (true);
