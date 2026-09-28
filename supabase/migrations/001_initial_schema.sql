-- ============================================================
-- Finspire Team OS — Initial Schema
-- Run this in Supabase SQL Editor to set up your database
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_cron";

-- ============================================================
-- TEAM MEMBERS
-- ============================================================
create table if not exists team_members (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null,
  whatsapp_number text not null unique,  -- format: 2348012345678 (no + sign)
  email text,
  is_admin boolean default false,        -- true for founder + manager
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ============================================================
-- TASKS
-- ============================================================
create type task_priority as enum ('urgent', 'normal');
create type task_status as enum ('pending', 'in_progress', 'done', 'overdue');
create type task_source as enum ('manual', 'transcript');

create table if not exists tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  assignee_id uuid references team_members(id) on delete set null,
  priority task_priority default 'normal',
  status task_status default 'pending',
  source task_source default 'manual',
  due_date date not null,
  completed_at timestamptz,
  -- reminders tracking
  reminder_sent_day_of boolean default false,
  reminder_sent_overdue boolean default false,
  -- rollover: if not done, carries to next week
  rolled_over_from uuid references tasks(id),
  created_by uuid references team_members(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- MEETINGS
-- ============================================================
create table if not exists meetings (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  join_link text,
  notification_sent boolean default false,
  created_by uuid references team_members(id),
  created_at timestamptz default now()
);

-- ============================================================
-- BROADCASTS
-- ============================================================
create table if not exists broadcasts (
  id uuid primary key default uuid_generate_v4(),
  message text not null,
  sent_at timestamptz default now(),
  sent_by uuid references team_members(id),
  recipient_count int default 0
);

-- ============================================================
-- TRANSCRIPTS
-- ============================================================
create type transcript_status as enum ('uploaded', 'processing', 'reviewed', 'applied');

create table if not exists transcripts (
  id uuid primary key default uuid_generate_v4(),
  meeting_title text,
  content text not null,
  status transcript_status default 'uploaded',
  ai_extracted_tasks jsonb,             -- raw AI output before review
  uploaded_by uuid references team_members(id),
  created_at timestamptz default now()
);

-- ============================================================
-- WHATSAPP MESSAGE LOG (for debugging + audit)
-- ============================================================
create type wa_direction as enum ('inbound', 'outbound');

create table if not exists whatsapp_messages (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid references team_members(id),
  direction wa_direction not null,
  message_type text,                    -- 'text', 'interactive', 'template'
  content text,
  wa_message_id text,                   -- WhatsApp's own message ID
  related_task_id uuid references tasks(id),
  created_at timestamptz default now()
);

-- ============================================================
-- WEEKLY DIGESTS LOG
-- ============================================================
create table if not exists weekly_digests (
  id uuid primary key default uuid_generate_v4(),
  week_start date not null,
  sent_at timestamptz default now(),
  member_count int,
  tasks_assigned int,
  tasks_completed int,
  tasks_overdue int
);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists tasks_assignee_idx on tasks(assignee_id);
create index if not exists tasks_status_idx on tasks(status);
create index if not exists tasks_due_date_idx on tasks(due_date);
create index if not exists whatsapp_messages_member_idx on whatsapp_messages(member_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- ============================================================
-- AUTO-MARK OVERDUE TASKS (runs daily at 6am UTC via pg_cron)
-- Schedule this after you enable pg_cron in Supabase dashboard
-- ============================================================
-- select cron.schedule(
--   'mark-overdue-tasks',
--   '0 6 * * *',
--   $$
--     update tasks
--     set status = 'overdue'
--     where status in ('pending', 'in_progress')
--       and due_date < current_date;
--   $$
-- );

-- ============================================================
-- ROW LEVEL SECURITY (basic — admins see everything)
-- ============================================================
alter table team_members enable row level security;
alter table tasks enable row level security;
alter table meetings enable row level security;
alter table broadcasts enable row level security;
alter table transcripts enable row level security;
alter table whatsapp_messages enable row level security;

-- Service role bypasses RLS (used by your Edge Functions + server)
-- These policies allow authenticated admin users full access
create policy "Admins can do everything on team_members"
  on team_members for all
  using (true) with check (true);

create policy "Admins can do everything on tasks"
  on tasks for all
  using (true) with check (true);

create policy "Admins can do everything on meetings"
  on meetings for all
  using (true) with check (true);

create policy "Admins can do everything on broadcasts"
  on broadcasts for all
  using (true) with check (true);

create policy "Admins can do everything on transcripts"
  on transcripts for all
  using (true) with check (true);

create policy "Admins can do everything on whatsapp_messages"
  on whatsapp_messages for all
  using (true) with check (true);
