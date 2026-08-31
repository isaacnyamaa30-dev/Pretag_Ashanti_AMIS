-- PRETAG AMIS - 0007_reset.sql
-- One deliberate, Super-Administrator-only action to clear all membership
-- HISTORY before go-live, keeping the organisational structure (zones,
-- districts, aliases, roles, users, settings).

begin;

create or replace function reset_membership_data(p_keep_aliases boolean default true)
returns table (cleared_snapshots bigint, cleared_members bigint, cleared_uploads bigint)
language plpgsql security definer set search_path = public as $$
declare
  v_snaps   bigint;
  v_members bigint;
  v_uploads bigint;
begin
  if app_role() <> 'Super Administrator' then
    raise exception 'only a Super Administrator can reset membership data';
  end if;

  select count(*) into v_snaps   from membership_snapshots;
  select count(*) into v_members from members;
  select count(*) into v_uploads from r20_uploads;

  truncate table
    membership_movement_reasons,
    membership_snapshots,
    members,
    r20_staging_rows,
    r20_uploads,
    reporting_periods
  restart identity cascade;

  if not p_keep_aliases then
    -- keep only the aliases that came from the original seed (sheet-name /
    -- workbook-column spellings); drop ones added by hand during trials
    delete from district_aliases where created_at > (select min(created_at) from district_aliases) + interval '1 minute';
  end if;

  insert into audit_logs (user_id, action, resource_type, details)
  values ((select id from app_current_user()), 'membership.reset', 'system',
          jsonb_build_object('snapshots', v_snaps, 'members', v_members,
                             'uploads', v_uploads, 'kept_aliases', p_keep_aliases));

  return query select v_snaps, v_members, v_uploads;
end;
$$;

commit;
