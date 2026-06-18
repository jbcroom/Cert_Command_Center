-- Migration: 009_feature_roadmap
-- Description: Feature roadmap table — populated by seed script, displayed in System screen
-- Depends on: (none)
-- Safe to re-run: yes

create table if not exists feature_roadmap (
  id          uuid        primary key default gen_random_uuid(),
  phase       text        not null,
  feature_id  integer     not null unique,
  name        text        not null,
  description text,
  status      text        not null default 'planned'
                          check (status in ('planned', 'in_progress', 'complete', 'skipped')),
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

drop trigger if exists feature_roadmap_updated_at on feature_roadmap;
create trigger feature_roadmap_updated_at
  before update on feature_roadmap
  for each row execute function update_updated_at();

alter table feature_roadmap enable row level security;
create policy "allow_all" on feature_roadmap for all using (true) with check (true);
