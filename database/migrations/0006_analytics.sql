-- PRETAG AMIS - 0006_analytics.sql
-- Read-only analytics over membership_snapshots (build-plan Phase 4).
-- SECURITY INVOKER: the caller's RLS still applies, so a zone executive only
-- ever sees their own zone's figures.

begin;

-- Single period: member count per zone + region total.
create or replace function period_summary(p_period integer)
returns table (level text, zone_id integer, name text, members bigint)
language sql stable as $$
  select 'region'::text, null::integer, 'Ashanti Region'::text, count(*)
  from membership_snapshots where period_id = p_period
  union all
  select 'zone'::text, z.id, z.zone_name,
         count(s.id)
  from zones z
  left join membership_snapshots s on s.period_id = p_period and s.zone_id = z.id
  group by z.id, z.zone_name
  order by 4 desc nulls last;
$$;

-- Two periods: regional + per-zone movement.
--  added   = appears in current, was not in previous R20 at all
--  missing = was in previous, not in current R20 at all
--  transfers_in / _out = retained region-wide but changed zone
create or replace function compare_periods(p_prev integer, p_cur integer)
returns table (
  level text, zone_id integer, name text,
  previous bigint, current bigint,
  added bigint, missing bigint,
  transfers_in bigint, transfers_out bigint
)
language sql stable as $$
  with p as (select employee_no, zone_id from membership_snapshots where period_id = p_prev),
       c as (select employee_no, zone_id from membership_snapshots where period_id = p_cur)
  select 'region'::text, null::integer, 'Ashanti Region'::text,
    (select count(*) from p),
    (select count(*) from c),
    (select count(*) from c where not exists (select 1 from p where p.employee_no = c.employee_no)),
    (select count(*) from p where not exists (select 1 from c where c.employee_no = p.employee_no)),
    0::bigint, 0::bigint
  union all
  select 'zone'::text, z.id, z.zone_name,
    (select count(*) from p where p.zone_id = z.id),
    (select count(*) from c where c.zone_id = z.id),
    (select count(*) from c
       where c.zone_id = z.id
         and not exists (select 1 from p where p.employee_no = c.employee_no)),
    (select count(*) from p
       where p.zone_id = z.id
         and not exists (select 1 from c where c.employee_no = p.employee_no)),
    (select count(*) from c join p on p.employee_no = c.employee_no
       where c.zone_id = z.id and p.zone_id is distinct from z.id),
    (select count(*) from p join c on c.employee_no = p.employee_no
       where p.zone_id = z.id and c.zone_id is distinct from z.id)
  from zones z
  order by 1, 5 desc;
$$;

commit;
