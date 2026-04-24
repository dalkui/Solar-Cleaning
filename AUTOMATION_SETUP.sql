-- FluroSolar automation upgrade migration
-- Run this in Supabase SQL Editor

alter table customers add column if not exists auto_schedule boolean default true;
alter table customers add column if not exists preferred_time_of_day text default 'any';
alter table customers add column if not exists last_worker_id uuid references workers(id);
alter table customers add column if not exists sms_opt_out boolean default false;
alter table customers add column if not exists google_review_sent boolean default false;
alter table customers add column if not exists payment_status text default 'active';
alter table customers add column if not exists review_prompted_at timestamptz;

create table if not exists customer_login_tokens (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  token text unique not null,
  used boolean default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists idx_customer_tokens_token on customer_login_tokens(token);

create table if not exists customer_messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  direction text not null, -- 'outbound' | 'inbound'
  channel text not null,   -- 'email' | 'sms'
  subject text,
  body text not null,
  purpose text,            -- 'confirmation' | 'reminder' | 'review' | 'payment' | 'login' | 'reschedule_request' | 'general'
  created_at timestamptz default now()
);
create index if not exists idx_customer_messages_customer on customer_messages(customer_id);

-- Note: After running this, also go to Stripe Dashboard → Settings → Billing → Customer Portal
-- and enable it so the portal allows customers to manage their subscription.
