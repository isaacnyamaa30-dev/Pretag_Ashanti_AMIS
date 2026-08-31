-- PRETAG AMIS - 0013_v3.sql
-- Version 3 groundwork: membership targets, management-unit drill-down.

begin;

create table if not exists membership_targets (
  id           serial primary key,
  zone_id      integer references zones(id) on delete cascade,  -- null => regional target
  year         smallint not null,
  target_members integer not null check (target_members >= 0),
  note         text,
  created_by   uuid references users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (zone_id, year)
);
create trigger membership_targets_set_updated_at before update on membership_targets
  for each row execute function set_updated_at();

alter table membership_targets enable row level security;
create policy targets_read on membership_targets for select to authenticated using (true);
create policy targets_write on membership_targets for all to authenticated
  using (app_is_staff()) with check (app_is_staff());

-- members per management unit for a district in a period (blueprint: management unit report)
create or replace function management_unit_breakdown(p_period integer, p_district integer)
returns table (management_unit text, members bigint)
language sql stable as $$
  select coalesce(nullif(trim(s.management_unit), ''), '(unnamed)') as mu, count(*)
  from membership_snapshots s
  where s.period_id = p_period and s.district_id = p_district
  group by 1
  order by 2 desc, 1;
$$;

commit;
