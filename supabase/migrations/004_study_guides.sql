-- Migration: 004_study_guides
-- Description: Per-domain study guide sections (static Tier 1 + AI-generated Tier 2)
-- Depends on: 001_initial_schema
-- Safe to re-run: yes

create table if not exists study_guide_sections (
  id               uuid        primary key default gen_random_uuid(),
  cert_id          text        not null references certifications(id),
  domain_name      text        not null,
  section_type     text        not null check (section_type in (
                     'overview',
                     'exam_focus',
                     'key_concepts',
                     'ai_explanation',
                     'common_pitfalls'
                   )),
  content          text        not null,
  is_ai_generated  boolean     not null default false,
  generated_at     timestamptz,
  last_reviewed_at timestamptz,
  created_at       timestamptz not null default now(),
  unique(cert_id, domain_name, section_type)
);

create index if not exists idx_study_guide_lookup
  on study_guide_sections(cert_id, domain_name);

alter table study_guide_sections enable row level security;
create policy "allow_all" on study_guide_sections for all using (true) with check (true);
