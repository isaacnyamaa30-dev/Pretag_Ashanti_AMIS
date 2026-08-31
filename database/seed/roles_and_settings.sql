-- PRETAG AMIS - roles and default settings (blueprint sections 8.2, 27, 48)
-- Load this BEFORE ../../seed/seed.sql (which seeds regions, zones, districts, aliases).

insert into roles (role_name, description) values
  ('Super Administrator',   'Full control of the entire system.'),
  ('Regional Administrator', 'Upload, import, edit mappings, manage users, all analytics and reports.'),
  ('Regional Executive',     'View regional / zone / district analytics; generate permitted reports.'),
  ('Regional Data Officer',  'Upload, validate, resolve errors, import approved files, generate exports.'),
  ('Zone Executive',         'View own zone, its districts and permitted member records only.'),
  ('District Executive',     'View own district only.'),
  ('Viewer',                 'Read-only access.')
on conflict (role_name) do nothing;

insert into settings (key, value) values
  ('performance_bands', '{"growing_above": 0.5, "declining_below": -0.5}'::jsonb),
  ('growth_when_previous_zero', '"n/a"'::jsonb),
  ('region_default', '"Ashanti"'::jsonb)
on conflict (key) do nothing;
