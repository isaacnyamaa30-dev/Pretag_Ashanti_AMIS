-- PRETAG AMIS - 0011_zone_series.sql
-- Per-zone membership count for every imported period (feeds the scorecard's
-- consistency component and per-zone trend charts).

begin;

create or replace function zone_series()
returns table (zone_id integer, zone_name text, period_id integer, label text,
               year smallint, month smallint, members bigint)
language sql stable as $$
  select z.id, z.zone_name, rp.id, rp.label, rp.year, rp.month,
         count(s.id)
  from zones z
  cross join reporting_periods rp
  left join membership_snapshots s
    on s.period_id = rp.id and s.zone_id = z.id
  where exists (select 1 from r20_uploads u where u.period_id = rp.id and u.status = 'imported')
  group by z.id, z.zone_name, rp.id, rp.label, rp.year, rp.month
  order by z.zone_name, rp.year, rp.month;
$$;

commit;
