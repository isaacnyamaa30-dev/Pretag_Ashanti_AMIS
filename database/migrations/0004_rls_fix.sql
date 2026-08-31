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
