-- Migration: 001_initial_schema
-- Description: Core tables — certifications, flashcards, exam_attempts, cert_sittings,
--              topic_confidence, study_sessions, deliverables, user_preferences
-- Depends on: (none)
-- Safe to re-run: yes

-- ── Certifications registry ───────────────────────────────────────────────────

create table if not exists certifications (
  id                   text        primary key,
  name                 text        not null,
  vendor               text        not null,
  exam_code            text,
  type                 text        not null check (type in ('exam', 'coursework')),
  status               text        not null default 'planned'
                                   check (status in ('planned', 'in_progress', 'complete', 'failed')),
  passing_score        numeric,
  score_max            numeric,
  personal_target_score numeric,
  target_date          date,
  target_date_history  jsonb       default '[]',
  year                 integer,
  color                text,
  cost                 numeric,
  cost_paid            numeric     default 0,
  domains              jsonb       default '[]',
  modules              jsonb       default '[]',
  notes                text,
  archived             boolean     default false,
  exam_url             text,
  last_verified_date   date,
  changelog            jsonb       default '[]',
  registered           boolean     default false,
  registration_date    date,
  voucher_notes        text,
  resources            jsonb       default '[]',
  completed_at         date,
  final_grade          text,
  exam_day_checklist   jsonb       default '[]',
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists certifications_updated_at on certifications;
create trigger certifications_updated_at
  before update on certifications
  for each row execute function update_updated_at();

-- ── Real exam sittings ────────────────────────────────────────────────────────

create table if not exists cert_sittings (
  id                         uuid        primary key default gen_random_uuid(),
  cert_id                    text        references certifications(id) on delete cascade,
  sitting_date               date        not null,
  result                     text        not null check (result in ('pass', 'fail')),
  score                      numeric,
  score_max                  numeric,
  attempt_number             integer     not null default 1,
  notes                      text,
  reflection_domain_ratings  jsonb,
  reflection_what_worked     text,
  reflection_what_didnt      text,
  reflection_retake_focus    text,
  reflection_completed_at    timestamptz,
  created_at                 timestamptz default now()
);

-- ── Mock exam attempts (legacy score tracking) ────────────────────────────────

create table if not exists exam_attempts (
  id                 uuid        primary key default gen_random_uuid(),
  cert_id            text        references certifications(id) on delete cascade,
  attempt_date       date        not null default current_date,
  score              numeric     not null,
  score_max          numeric     not null,
  score_pct          numeric     generated always as (round((score / score_max) * 100, 1)) stored,
  time_taken_minutes integer,
  domain_scores      jsonb       default '{}',
  notes              text,
  created_at         timestamptz default now()
);

-- ── Study sessions ────────────────────────────────────────────────────────────

create table if not exists study_sessions (
  id              uuid        primary key default gen_random_uuid(),
  cert_id         text        references certifications(id) on delete cascade,
  session_date    date        not null default current_date,
  duration_minutes integer    not null,
  activity_type   text        check (activity_type in (
                    'flashcards', 'mock_exam', 'reading', 'video',
                    'practice', 'review', 'other')),
  notes           text,
  created_at      timestamptz default now()
);

-- ── Topic confidence ratings ──────────────────────────────────────────────────

create table if not exists topic_confidence (
  id          uuid        primary key default gen_random_uuid(),
  cert_id     text        references certifications(id) on delete cascade,
  domain_name text        not null,
  confidence  integer     check (confidence between 1 and 5),
  rated_at    timestamptz default now(),
  unique(cert_id, domain_name)
);

-- ── Deliverables / modules (coursework track) ─────────────────────────────────

create table if not exists deliverables (
  id             uuid        primary key default gen_random_uuid(),
  cert_id        text        references certifications(id) on delete cascade,
  title          text        not null,
  module_number  integer,
  due_date       date,
  status         text        default 'not_started'
                             check (status in ('not_started', 'in_progress', 'submitted', 'complete')),
  grade          text,
  notes          text,
  completed_at   timestamptz,
  created_at     timestamptz default now()
);

-- ── Flashcards ────────────────────────────────────────────────────────────────

create table if not exists flashcards (
  id          uuid        primary key default gen_random_uuid(),
  cert_id     text        references certifications(id) on delete cascade,
  domain_name text,
  question    text        not null,
  answer      text        not null,
  difficulty  text        default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  active      boolean     default true,
  created_at  timestamptz default now()
);

-- ── User preferences (single-row settings table) ──────────────────────────────

create table if not exists user_preferences (
  id                        integer     primary key default 1,
  weekly_study_target_hours numeric     not null default 10,
  check (id = 1)
);

insert into user_preferences default values
  on conflict (id) do nothing;

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table certifications    enable row level security;
alter table cert_sittings     enable row level security;
alter table exam_attempts     enable row level security;
alter table study_sessions    enable row level security;
alter table topic_confidence  enable row level security;
alter table deliverables      enable row level security;
alter table flashcards        enable row level security;
alter table user_preferences  enable row level security;

create policy "allow_all" on certifications    for all using (true) with check (true);
create policy "allow_all" on cert_sittings     for all using (true) with check (true);
create policy "allow_all" on exam_attempts     for all using (true) with check (true);
create policy "allow_all" on study_sessions    for all using (true) with check (true);
create policy "allow_all" on topic_confidence  for all using (true) with check (true);
create policy "allow_all" on deliverables      for all using (true) with check (true);
create policy "allow_all" on flashcards        for all using (true) with check (true);
create policy "allow_all" on user_preferences  for all using (true) with check (true);
