-- PRETAG AMIS - 0012_notify_on_import.sql
-- Raise an in-app notification when an R20 is imported.

begin;

create or replace function import_upload(p_upload_id integer)
returns table (imported_members integer, snapshot_rows integer, excluded_rows integer)
language plpgsql security definer set search_path = public as $$
declare
  v_period_id integer;
  v_region_id integer;
  v_status    upload_status;
  v_locked    period_lock_state;
  v_label     text;
begin
  if not app_is_staff() then
    raise exception 'not authorised';
  end if;

  select u.period_id, u.status into v_period_id, v_status
  from r20_uploads u where u.id = p_upload_id;
  if v_period_id is null then
    raise exception 'upload % not found or has no period', p_upload_id;
  end if;
  if v_status = 'imported' then
    raise exception 'upload % is already imported', p_upload_id;
  end if;

  select lock_state, label into v_locked, v_label from reporting_periods where id = v_period_id;
  if v_locked = 'locked' then
    raise exception 'that reporting period is locked';
  end if;

  select id into v_region_id from regions where region_name = 'Ashanti';

  with src as (
    select distinct on (s.employee_no_raw)
      s.employee_no_raw as emp, s.employee_name_raw as nm, s.management_unit_raw as mu,
      s.district_raw as raw_d, s.mapped_district_id as did, s.mapped_zone_id as zid
    from r20_staging_rows s
    where s.upload_id = p_upload_id and s.validation_status = 'valid'
      and s.employee_no_raw is not null and s.mapped_zone_id is not null
    order by s.employee_no_raw, s.id
  ),
  upserted as (
    insert into members (
      employee_no, current_name, current_management_unit,
      current_district_id, current_zone_id, current_region_id,
      first_seen_period, last_seen_period
    )
    select emp, nm, mu, did, zid, v_region_id, v_period_id, v_period_id from src
    on conflict (employee_no) do update set
      current_name = excluded.current_name,
      current_management_unit = excluded.current_management_unit,
      current_district_id = excluded.current_district_id,
      current_zone_id = excluded.current_zone_id,
      current_region_id = excluded.current_region_id,
      first_seen_period = coalesce(members.first_seen_period, excluded.first_seen_period),
      last_seen_period = excluded.last_seen_period,
      updated_at = now()
    returning id, employee_no
  ),
  snaps as (
    insert into membership_snapshots (
      period_id, member_id, employee_no, employee_name, management_unit,
      raw_district, district_id, zone_id, region_id, source_upload_id
    )
    select v_period_id, m.id, s.emp, s.nm, s.mu, s.raw_d, s.did, s.zid, v_region_id, p_upload_id
    from src s join upserted m on m.employee_no = s.emp
    on conflict (period_id, member_id) do update set
      employee_name = excluded.employee_name,
      management_unit = excluded.management_unit,
      raw_district = excluded.raw_district,
      district_id = excluded.district_id,
      zone_id = excluded.zone_id,
      source_upload_id = excluded.source_upload_id
    returning 1
  )
  select
    (select count(*) from upserted)::int,
    (select count(*) from snaps)::int,
    (select count(*) from r20_staging_rows
      where upload_id = p_upload_id
        and (validation_status <> 'valid' or employee_no_raw is null or mapped_zone_id is null))::int
  into imported_members, snapshot_rows, excluded_rows;

  update r20_uploads
    set status = 'imported', approved_by = (select id from app_current_user()), approved_at = now()
    where id = p_upload_id;

  perform notify('import',
    v_label || ' R20 imported',
    imported_members || ' members recorded' ||
      case when excluded_rows > 0 then ', ' || excluded_rows || ' rows excluded' else '' end,
    '/analytics/regional');

  return next;
end;
$$;

commit;
