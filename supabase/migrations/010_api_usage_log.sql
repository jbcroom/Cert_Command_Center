-- Migration: 010_api_usage_log
-- Description: Tracks Anthropic API token usage per feature call for cost monitoring
-- Depends on: 001_initial_schema (certifications table)
-- Safe to re-run: yes

create table if not exists api_usage_log (
  id           uuid        primary key default gen_random_uuid(),
  feature      text        not null check (feature in (
                 'chat', 'exam_debrief', 'guide_gen', 'flashcard_gen', 'study_plan'
               )),
  cert_id      text        references certifications(id),
  input_tokens  int        not null default 0,
  output_tokens int        not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_api_usage_monthly
  on api_usage_log(created_at, feature);

alter table api_usage_log enable row level security;
create policy "allow_all" on api_usage_log for all using (true) with check (true);
