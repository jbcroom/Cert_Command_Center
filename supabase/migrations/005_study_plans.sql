-- Migration: 005_study_plans
-- Description: AI-generated study plans per cert (one current plan at a time)
-- Depends on: 001_initial_schema
-- Safe to re-run: yes

create table if not exists study_plans (
  id             uuid        primary key default gen_random_uuid(),
  cert_id        text        not null references certifications(id),
  created_at     timestamptz default now(),
  valid_from     date        not null,
  content        text        not null,
  input_snapshot jsonb       not null,
  is_current     boolean     default true
);

create index if not exists idx_study_plans_current
  on study_plans(cert_id, is_current);

alter table study_plans enable row level security;
create policy "allow_all" on study_plans for all using (true) with check (true);
