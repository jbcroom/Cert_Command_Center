-- Migration: 002_spaced_repetition
-- Description: Adds SM-2 spaced repetition columns to flashcards and a review queue index
-- Depends on: 001_initial_schema
-- Safe to re-run: yes

alter table flashcards
  add column if not exists ease_factor      numeric     not null default 2.5,
  add column if not exists interval_days    integer     not null default 1,
  add column if not exists next_review_at   date        not null default current_date,
  add column if not exists review_count     integer     not null default 0,
  add column if not exists last_reviewed_at timestamptz,
  add column if not exists personal_notes   text;

-- Daily review queue: all due cards for a cert, ordered by most overdue first
create index if not exists idx_flashcards_review_queue
  on flashcards(next_review_at, cert_id);
