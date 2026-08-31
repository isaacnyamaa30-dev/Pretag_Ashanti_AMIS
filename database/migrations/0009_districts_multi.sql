-- PRETAG AMIS - 0009_districts_multi.sql
-- District-level comparison and a multi-period membership series.

begin;

create or replace function compare_districts(p_prev integer, p_cur integer)
returns table (
  district_id integer, name text, zone_name text,
  previous bigint, current bigint,
  added bigint, missing bigint,
  transfers_in bigint, transfers_out bigint
)
language sql stable as $$
  with p as (select employee_no, district_id from membership_snapshots where period_id = p_prev),
       c as (select employee_no, district_id from membership_snapshots where period_id = p_cur)
  select d.id, d.district_name, z.zone_name,
    (select count(*) from p where p.district_id = d.id),
    (select count(*) from c where c.district_id = d.id),
    (select count(*) from c
       where c.district_id = d.id
         and not exists (select 1 from p where p.employee_no = c.employee_no)),
    (select count(*) from p
       where p.district_id = d.id
         and not exists (select 1 from c where c.employee_no = p.employee_no)),
    (select count(*) from c join p on p.employee_no = c.employee_no
       where c.district_id = d.id and p.district_id is distinct from d.id),
    (select count(*) from p join c on c.employee_no = p.employee_no
       where p.district_id = d.id and c.district_id is distinct from d.id)
  from districts d join zones z on z.id = d.zone_id
  order by z.zone_name, 5 desc;
$$;

-- One number per imported period, plus per-zone if p_zone given.
create or replace function membership_series(p_zone integer default null)
returns table (period_id integer, label text, month smallint, year smallint, members bigint)
language sql stable as $$
  select rp.id, rp.label, rp.month, rp.year,
    (select count(*) from membership_snapshots s
      where s.period_id = rp.id and (p_zone is null or s.zone_id = p_zone))
  from reporting_periods rp
  where exists (select 1 from r20_uploads u where u.period_id = rp.id and u.status = 'imported')
  order by rp.year, rp.month;
$$;

commit;
