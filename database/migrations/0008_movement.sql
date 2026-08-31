-- PRETAG AMIS - 0008_movement.sql
-- The member lists behind every number on the analytics screens
-- (blueprint success criterion 12: "see the actual members responsible for changes").
-- SECURITY INVOKER so a scoped user only sees members in their own zone / district.

begin;

-- kind: 'added' | 'missing' | 'transfer'
create or replace function period_movers(p_prev integer, p_cur integer, p_kind text)
returns table (
  employee_no text,
  name text,
  management_unit text,
  from_zone text,
  to_zone text,
  from_district text,
  to_district text
)
language sql stable as $$
  with p as (
    select s.employee_no, s.employee_name, s.management_unit,
           z.zone_name as zn, d.district_name as dn
    from membership_snapshots s
    left join zones z on z.id = s.zone_id
    left join districts d on d.id = s.district_id
    where s.period_id = p_prev
  ),
  c as (
    select s.employee_no, s.employee_name, s.management_unit,
           z.zone_name as zn, d.district_name as dn
    from membership_snapshots s
    left join zones z on z.id = s.zone_id
    left join districts d on d.id = s.district_id
    where s.period_id = p_cur
  )
  select c.employee_no, c.employee_name, c.management_unit,
         null::text, c.zn, null::text, c.dn
  from c where p_kind = 'added'
    and not exists (select 1 from p where p.employee_no = c.employee_no)

  union all
  select p.employee_no, p.employee_name, p.management_unit,
         p.zn, null::text, p.dn, null::text
  from p where p_kind = 'missing'
    and not exists (select 1 from c where c.employee_no = p.employee_no)

  union all
  select c.employee_no, c.employee_name, c.management_unit,
         p.zn, c.zn, p.dn, c.dn
  from c join p on p.employee_no = c.employee_no
  where p_kind = 'transfer'
    and (p.zn is distinct from c.zn or p.dn is distinct from c.dn)

  order by 2;
$$;

commit;
