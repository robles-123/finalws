-- Supabase schema for VPAA Seminar System
-- Run these statements in the Supabase SQL editor (SQL > New query)

-- seminars table: stores seminar definitions
create table if not exists seminars (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  duration int,
  speaker text,
  capacity int,
  date date,
  -- optional start/end datetimes (canonical) and human-readable times
  start_datetime timestamptz,
  end_datetime timestamptz,
  start_time text,
  end_time text,
  -- optional certificate template URL
  certificate_template_url text,
  questions jsonb,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- joined_participants: tracks users who joined seminars
create table if not exists joined_participants (
  id uuid default gen_random_uuid() primary key,
  seminar_id uuid references seminars(id) on delete cascade,
  participant_email text,
  participant_name text,
  metadata jsonb,
  joined_at timestamptz default now()
);

-- evaluations: stores evaluation responses per seminar / participant
create table if not exists evaluations (
  id uuid default gen_random_uuid() primary key,
  seminar_id uuid references seminars(id) on delete cascade,
  participant_email text,
  answers jsonb,
  created_at timestamptz default now()
);

-- Indexes for faster lookups
create index if not exists idx_seminars_date on seminars(date);
create index if not exists idx_joined_seminars on joined_participants(seminar_id);
create index if not exists idx_evaluations_seminar on evaluations(seminar_id);
