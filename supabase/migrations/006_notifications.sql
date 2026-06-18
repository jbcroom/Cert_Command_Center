-- Migration: 006_notifications
-- Description: In-app notification center
-- Depends on: 001_initial_schema
-- Safe to re-run: yes

create table if not exists notifications (
  id         uuid        primary key default gen_random_uuid(),
  type       text        not null check (type in (
               'readiness_alert', 'exam_reminder', 'reflection_prompt',
               'streak_warning', 'milestone', 'study_plan_updated', 'digest_sent'
             )),
  cert_id    text        references certifications(id),
  message    text        not null,
  action_url text,
  read       boolean     default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_unread
  on notifications(read, created_at desc);

alter table notifications enable row level security;
create policy "allow_all" on notifications for all using (true) with check (true);
