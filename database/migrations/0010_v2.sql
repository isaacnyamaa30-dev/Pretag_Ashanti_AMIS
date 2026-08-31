-- PRETAG AMIS - 0010_v2.sql
-- Version 2 groundwork: member search, notifications, movement reasons access,
-- scorecard weights.

begin;

-- ---- member name search (trigram) ----
create extension if not exists pg_trgm;
create index if not exists members_name_trgm on members using gin (current_name gin_trgm_ops);
create index if not exists members_emp_idx on members (employee_no text_pattern_ops);

-- ---- in-app notifications ----
create table if not exists notifications (
  id          bigserial primary key,
  kind        text not null,            -- import | data_quality | decline | system
  title       text not null,
  body        text,
  link        text,
  created_at  timestamptz not null default now()
);
create table if not exists notification_reads (
  notification_id bigint not null references notifications(id) on delete cascade,
  user_id         uuid   not null references users(id) on delete cascade,
  read_at         timestamptz not null default now(),
  primary key (notification_id, user_id)
);
alter table notifications enable row level security;
alter table notification_reads enable row level security;
create policy notifications_read on notifications for select to authenticated using (true);
create policy notifications_write on notifications for all to authenticated
  using (app_is_staff()) with check (app_is_staff());
create policy notification_reads_own on notification_reads for all to authenticated
  using (user_id = (select id from app_current_user()))
  with check (user_id = (select id from app_current_user()));

-- helper: raise a notification (called from import_upload etc.)
create or replace function notify(p_kind text, p_title text, p_body text default null, p_link text default null)
returns void language sql security definer set search_path = public as $$
  insert into notifications (kind, title, body, link) values (p_kind, p_title, p_body, p_link);
$$;

-- ---- movement reasons: allow staff to record, scoped users to read their own ----
-- (table + policies already exist from 0002; make sure staff can write for any member)
drop policy if exists movement_staff_write on membership_movement_reasons;
create policy movement_staff_write on membership_movement_reasons for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

-- ---- default zone-scorecard weights ----
insert into settings (key, value) values
  ('scorecard_weights', '{"growth": 0.35, "retention": 0.30, "acquisition": 0.20, "consistency": 0.15}'::jsonb)
on conflict (key) do nothing;

commit;
