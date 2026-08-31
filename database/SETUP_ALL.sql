-- PRETAG AMIS - complete database setup. Paste into Supabase SQL Editor and Run.
-- (Already applied to the current dev project; kept for fresh environments.)

-- ===== database/migrations/0001_init.sql =====
-- PRETAG Ashanti Membership Intelligence System
-- 0001_init.sql  -  full schema (blueprint sections 8-13, 39, 50, 51)
--
-- Run in the Supabase SQL editor, or:  supabase db push
-- Then load reference data:  psql < ../seed/seed.sql   (or npm run db:seed)

begin;

-- ============================================================ enums
create type user_scope        as enum ('region', 'zone', 'district');
create type upload_status      as enum
  ('uploaded','validating','needs_review','validated','approved','imported','failed','archived');
create type period_lock_state  as enum ('open','locked');
create type row_validation     as enum ('valid','warning','error');
create type movement_type      as enum ('added','missing','transfer_in','transfer_out','internal');
create type movement_reason    as enum
  ('retirement','transfer','union_switch','payroll_correction','termination',
   'death','duplicate_correction','unknown','other');

-- ============================================================ reference / master
create table regions (
  id            serial primary key,
  region_name   text not null unique,
  region_code   text not null unique
);

create table roles (
  id            serial primary key,
  role_name     text not null unique,
  description   text
);

create table zones (
  id            serial primary key,
  zone_name     text not null unique,
  zone_code     text not null,
  region_id     integer not null references regions(id),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table districts (
  id            serial primary key,
  district_name text not null unique,
  district_code text not null,
  zone_id       integer not null references zones(id),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index districts_zone_idx on districts(zone_id);

-- inconsistent R20 spellings resolve here (blueprint section 8.6, 18, 19)
create table district_aliases (
  id               serial primary key,
  district_id      integer not null references districts(id) on delete cascade,
  alias            text not null,
  normalized_alias text not null unique,
  created_by       uuid,
  created_at       timestamptz not null default now()
);

-- ============================================================ users
create table users (
  id            uuid primary key default gen_random_uuid(),
  auth_id       uuid unique references auth.users(id) on delete set null,
  full_name     text not null,
  email         text not null unique,
  role_id       integer not null references roles(id),
  scope         user_scope not null default 'region',
  zone_id       integer references zones(id),
  district_id   integer references districts(id),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint users_scope_zone     check (scope <> 'zone'     or zone_id is not null),
  constraint users_scope_district check (scope <> 'district' or district_id is not null)
);

-- ============================================================ periods & uploads
create table reporting_periods (
  id            serial primary key,
  month         smallint not null check (month between 1 and 12),
  year          smallint not null,
  label         text not null,
  period_start  date,
  period_end    date,
  lock_state    period_lock_state not null default 'open',
  locked_by     uuid references users(id),
  locked_at     timestamptz,
  created_at    timestamptz not null default now(),
  unique (year, month)
);

create table r20_uploads (
  id                serial primary key,
  period_id         integer references reporting_periods(id),
  original_filename text not null,
  storage_path      text,
  file_hash         text not null,
  status            upload_status not null default 'uploaded',
  uploaded_by       uuid references users(id),
  uploaded_at       timestamptz not null default now(),
  total_rows        integer default 0,
  valid_rows        integer default 0,
  invalid_rows      integer default 0,
  duplicate_rows    integer default 0,
  unmapped_rows     integer default 0,
  blank_rows        integer default 0,
  processing_notes  text,
  approved_by       uuid references users(id),
  approved_at       timestamptz
);
create index r20_uploads_period_idx on r20_uploads(period_id);
create index r20_uploads_hash_idx   on r20_uploads(file_hash);

-- raw rows land here first; nothing reaches history unreviewed (blueprint section 13)
create table r20_staging_rows (
  id                   bigserial primary key,
  upload_id            integer not null references r20_uploads(id) on delete cascade,
  sheet_name           text,
  row_number           integer,
  employee_no_raw      text,
  employee_name_raw    text,
  management_unit_raw  text,
  district_raw         text,
  region_raw           text,
  normalized_employee_no text,
  normalized_district    text,
  mapped_district_id   integer references districts(id),
  mapped_zone_id       integer references zones(id),
  validation_status    row_validation not null default 'valid',
  validation_message   text
);
create index r20_staging_upload_idx on r20_staging_rows(upload_id);

-- ============================================================ membership history
create table members (
  id                      bigserial primary key,
  employee_no             text not null unique,
  current_name            text,
  current_management_unit text,
  current_district_id     integer references districts(id),
  current_zone_id         integer references zones(id),
  current_region_id       integer references regions(id),
  first_seen_period       integer references reporting_periods(id),
  last_seen_period        integer references reporting_periods(id),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- one immutable row per member per period (blueprint section 12) - never updated
create table membership_snapshots (
  id               bigserial primary key,
  period_id        integer not null references reporting_periods(id),
  member_id        bigint  not null references members(id),
  employee_no      text not null,
  employee_name    text,
  management_unit  text,
  raw_district     text,
  district_id      integer references districts(id),
  zone_id          integer references zones(id),
  region_id        integer references regions(id),
  source_upload_id integer references r20_uploads(id),
  created_at       timestamptz not null default now(),
  unique (period_id, member_id)
);
create index snapshots_period_idx on membership_snapshots(period_id);
create index snapshots_zone_idx   on membership_snapshots(period_id, zone_id);
create index snapshots_emp_idx    on membership_snapshots(employee_no);

-- optional verified explanation for an appearance / disappearance (blueprint section 39)
create table membership_movement_reasons (
  id            bigserial primary key,
  member_id     bigint not null references members(id),
  period_id     integer not null references reporting_periods(id),
  movement_type movement_type not null,
  reason        movement_reason,
  notes         text,
  entered_by    uuid references users(id),
  entered_at    timestamptz not null default now(),
  unique (member_id, period_id, movement_type)
);

-- ============================================================ audit & settings
create table audit_logs (
  id            bigserial primary key,
  user_id       uuid references users(id),
  action        text not null,
  resource_type text,
  resource_id   text,
  details       jsonb,
  ip_address    inet,
  created_at    timestamptz not null default now()
);
create index audit_logs_user_idx on audit_logs(user_id, created_at desc);

create table settings (
  key           text primary key,
  value         jsonb not null,
  updated_by    uuid references users(id),
  updated_at    timestamptz not null default now()
);

-- ============================================================ updated_at triggers
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['zones','districts','users','members'] loop
    execute format(
      'create trigger %I_set_updated_at before update on %I
         for each row execute function set_updated_at()', t, t);
  end loop;
end $$;

commit;


-- ===== database/migrations/0002_rls.sql =====
-- PRETAG AMIS - 0002_rls.sql
-- Row-level security. Access is enforced here in the database, not just in the UI
-- (blueprint section 49: "Users must never receive wider data access merely by
-- manipulating a browser URL").
--
-- Model:
--   * reference data (regions/zones/districts/aliases/roles) - any authenticated user reads
--   * membership data - scoped to the signed-in user's zone / district
--   * writes to reference, uploads, periods, users - admin roles only
--
-- Role names come from ../seed/seed.sql: Super Administrator, Regional Administrator,
-- Regional Executive, Regional Data Officer, Zone Executive, District Executive, Viewer.

begin;

-- -------------------------------------------------- helpers
create or replace function app_current_user()
returns users language sql stable security definer set search_path = public as $$
  select * from users where auth_id = auth.uid() and is_active limit 1;
$$;

create or replace function app_role() returns text language sql stable as $$
  select r.role_name from users u join roles r on r.id = u.role_id
  where u.auth_id = auth.uid() and u.is_active limit 1;
$$;

create or replace function app_is_admin() returns boolean language sql stable as $$
  select app_role() in ('Super Administrator','Regional Administrator');
$$;

create or replace function app_is_staff() returns boolean language sql stable as $$
  select app_role() in
    ('Super Administrator','Regional Administrator','Regional Executive','Regional Data Officer');
$$;

-- can the signed-in user see membership rows for this zone / district?
create or replace function app_can_see(p_zone_id int, p_district_id int)
returns boolean language sql stable as $$
  select case
    when app_is_staff() then true
    when app_role() = 'Zone Executive'
      then p_zone_id = (select zone_id from app_current_user())
    when app_role() = 'District Executive'
      then p_district_id = (select district_id from app_current_user())
    when app_role() = 'Viewer' then true
    else false
  end;
$$;

-- -------------------------------------------------- enable RLS everywhere
do $$
declare t text;
begin
  foreach t in array array[
    'regions','roles','zones','districts','district_aliases','users',
    'reporting_periods','r20_uploads','r20_staging_rows','members',
    'membership_snapshots','membership_movement_reasons','audit_logs','settings'
  ] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- -------------------------------------------------- reference data: read for all, write for admin
do $$
declare t text;
begin
  foreach t in array array['regions','roles','zones','districts','district_aliases','settings'] loop
    execute format($p$
      create policy %1$s_read on %1$I for select to authenticated using (true);
      create policy %1$s_write on %1$I for all to authenticated
        using (app_is_admin()) with check (app_is_admin());
    $p$, t);
  end loop;
end $$;

-- district_aliases may also be added by data officers resolving the mapping queue
create policy district_aliases_officer_insert on district_aliases
  for insert to authenticated with check (app_is_staff());

-- -------------------------------------------------- users
create policy users_self_read on users for select to authenticated
  using (auth_id = auth.uid() or app_is_admin());
create policy users_admin_write on users for all to authenticated
  using (app_is_admin()) with check (app_is_admin());

-- -------------------------------------------------- periods & uploads (staff only)
do $$
declare t text;
begin
  foreach t in array array['reporting_periods','r20_uploads','r20_staging_rows'] loop
    execute format($p$
      create policy %1$s_staff_read on %1$I for select to authenticated using (app_is_staff());
      create policy %1$s_staff_write on %1$I for all to authenticated
        using (app_is_staff()) with check (app_is_staff());
    $p$, t);
  end loop;
end $$;

-- -------------------------------------------------- membership history (scoped)
create policy members_scoped_read on members for select to authenticated
  using (app_can_see(current_zone_id, current_district_id));
create policy members_staff_write on members for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

create policy snapshots_scoped_read on membership_snapshots for select to authenticated
  using (app_can_see(zone_id, district_id));
create policy snapshots_staff_write on membership_snapshots for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

create policy movement_scoped_read on membership_movement_reasons for select to authenticated
  using (exists (
    select 1 from members m
    where m.id = member_id and app_can_see(m.current_zone_id, m.current_district_id)
  ));
create policy movement_staff_write on membership_movement_reasons for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

-- -------------------------------------------------- audit log: admin reads, anyone appends
create policy audit_admin_read on audit_logs for select to authenticated using (app_is_admin());
create policy audit_insert on audit_logs for insert to authenticated with check (true);

commit;


-- ===== database/migrations/0003_storage.sql =====
-- PRETAG AMIS - 0003_storage.sql
-- Access control for the private `r20` bucket that holds original uploaded files.
-- Only staff (admins, executives, data officers) may read or write; the bucket
-- itself is not public.

begin;

create policy "r20 staff read" on storage.objects
  for select to authenticated
  using (bucket_id = 'r20' and app_is_staff());

create policy "r20 staff write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'r20' and app_is_staff());

create policy "r20 staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'r20' and app_is_staff());

commit;


-- ===== database/migrations/0004_rls_fix.sql =====
-- PRETAG AMIS - 0004_rls_fix.sql
-- The app_* helper functions read from `users`, and the `users` RLS policy calls
-- them -> infinite recursion ("stack depth limit exceeded"). Marking them
-- SECURITY DEFINER makes them execute as the table owner, which bypasses RLS
-- (the tables use ENABLE, not FORCE, row level security), breaking the cycle.

begin;

create or replace function app_role() returns text
  language sql stable security definer set search_path = public as $$
  select r.role_name from users u join roles r on r.id = u.role_id
  where u.auth_id = auth.uid() and u.is_active limit 1;
$$;

create or replace function app_is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in ('Super Administrator','Regional Administrator'), false);
$$;

create or replace function app_is_staff() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(app_role() in
    ('Super Administrator','Regional Administrator','Regional Executive','Regional Data Officer'),
    false);
$$;

create or replace function app_can_see(p_zone_id int, p_district_id int) returns boolean
  language sql stable security definer set search_path = public as $$
  select case
    when app_is_staff() then true
    when app_role() = 'Zone Executive'
      then p_zone_id = (select zone_id from users where auth_id = auth.uid())
    when app_role() = 'District Executive'
      then p_district_id = (select district_id from users where auth_id = auth.uid())
    when app_role() = 'Viewer' then true
    else false
  end;
$$;

commit;


-- ===== database/seed/roles_and_settings.sql =====
-- PRETAG AMIS - roles and default settings (blueprint sections 8.2, 27, 48)
-- Load this BEFORE ../../seed/seed.sql (which seeds regions, zones, districts, aliases).

insert into roles (role_name, description) values
  ('Super Administrator',   'Full control of the entire system.'),
  ('Regional Administrator', 'Upload, import, edit mappings, manage users, all analytics and reports.'),
  ('Regional Executive',     'View regional / zone / district analytics; generate permitted reports.'),
  ('Regional Data Officer',  'Upload, validate, resolve errors, import approved files, generate exports.'),
  ('Zone Executive',         'View own zone, its districts and permitted member records only.'),
  ('District Executive',     'View own district only.'),
  ('Viewer',                 'Read-only access.')
on conflict (role_name) do nothing;

insert into settings (key, value) values
  ('performance_bands', '{"growing_above": 0.5, "declining_below": -0.5}'::jsonb),
  ('growth_when_previous_zero', '"n/a"'::jsonb),
  ('region_default', '"Ashanti"'::jsonb)
on conflict (key) do nothing;


