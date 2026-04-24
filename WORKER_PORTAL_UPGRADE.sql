alter table worker_unavailable_dates add column if not exists end_date date;
update worker_unavailable_dates set end_date = date where end_date is null;

alter table workers add column if not exists pay_per_job numeric default 0;
alter table workers add column if not exists hourly_rate numeric default 0;
