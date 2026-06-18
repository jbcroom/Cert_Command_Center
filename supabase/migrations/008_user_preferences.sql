-- Migration: 008_user_preferences
-- Description: Extends user_preferences with digest, calendar, and study target columns
-- Depends on: 001_initial_schema
-- Safe to re-run: yes

alter table user_preferences
  add column if not exists digest_enabled       boolean default true,
  add column if not exists digest_day_of_week   integer default 0
    check (digest_day_of_week between 0 and 6),
  add column if not exists digest_hour          integer default 8
    check (digest_hour between 0 and 23),
  add column if not exists digest_timezone      text    default 'America/New_York',
  add column if not exists digest_email         text,
  add column if not exists digest_sections      jsonb   default
    '["upcoming_dates","streak","flashcard_queue","verification_reminders","weekly_hours","priority_domains"]'::jsonb,
  add column if not exists calendar_view        text    default 'week'
    check (calendar_view in ('week', 'month')),
  add column if not exists calendar_sync_token  text    default gen_random_uuid()::text;
