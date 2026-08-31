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
