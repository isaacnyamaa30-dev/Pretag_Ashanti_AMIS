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
