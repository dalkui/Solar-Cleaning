-- Dedupe any duplicate customer rows from the same Stripe subscription
-- Keeps the newest row per stripe_subscription_id
delete from customers
where id in (
  select id from (
    select id, row_number() over (partition by stripe_subscription_id order by subscribed_at desc) as rn
    from customers
    where stripe_subscription_id is not null
  ) t
  where rn > 1
);

-- Unique constraint so upsert in webhook actually works
create unique index if not exists customers_stripe_sub_unique on customers(stripe_subscription_id);

-- Due month column for pending bookings
alter table bookings add column if not exists due_month date;

-- Allow scheduled_at to be null for pending (due but unscheduled) bookings
alter table bookings alter column scheduled_at drop not null;

-- Index for filtering pending bookings by due month
create index if not exists idx_bookings_due_month on bookings(due_month);
create index if not exists idx_bookings_status on bookings(status);
