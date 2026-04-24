-- =========================================
-- FluroSolar Worker Management System — Supabase Setup
-- Run this entire file in Supabase SQL Editor
-- =========================================

-- Workers table
create table if not exists workers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  pin text not null,
  color text not null default '#F5C518',
  status text default 'active',
  created_at timestamptz default now()
);

-- Worker availability (per worker, per day of week)
create table if not exists worker_availability (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(id) on delete cascade,
  day_of_week int not null,
  is_active boolean default true,
  start_time text default '08:00',
  end_time text default '16:00'
);

-- Worker day-off overrides
create table if not exists worker_unavailable_dates (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid references workers(id) on delete cascade,
  date date not null,
  reason text
);

-- Add worker_id to bookings (safe if column already exists)
alter table bookings add column if not exists worker_id uuid references workers(id);

-- Job updates log
create table if not exists job_updates (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  worker_id uuid references workers(id),
  type text not null,
  note text,
  created_at timestamptz default now()
);

-- Job photos
create table if not exists job_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  worker_id uuid references workers(id),
  url text not null,
  type text default 'after',
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_bookings_worker on bookings(worker_id);
create index if not exists idx_job_updates_booking on job_updates(booking_id);
create index if not exists idx_job_updates_worker on job_updates(worker_id);
create index if not exists idx_job_photos_booking on job_photos(booking_id);
create index if not exists idx_worker_availability_worker on worker_availability(worker_id);
create index if not exists idx_worker_unavailable_worker on worker_unavailable_dates(worker_id);

-- =========================================
-- STORAGE BUCKET SETUP
-- Go to Storage tab → New Bucket:
--   Name: job-photos
--   Public bucket: YES (toggle on)
-- =========================================
