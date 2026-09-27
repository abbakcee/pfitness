-- =========================================================
-- P-Fitness Membership System — 0003_rls.sql
-- Run this THIRD. Locks down direct table access; all access
-- goes through the SECURITY DEFINER functions from 0002, except
-- for staff reading the members list/dashboard directly.
-- =========================================================

alter table members enable row level security;
alter table membership_history enable row level security;
alter table staff enable row level security;
alter table app_settings enable row level security;

-- Revoke the broad defaults so nothing is accidentally public.
revoke all on members from anon, authenticated;
revoke all on membership_history from anon, authenticated;
revoke all on staff from anon, authenticated;
revoke all on app_settings from anon, authenticated;

-- ---------- members: staff can read; nobody writes directly ----------
drop policy if exists members_staff_select on members;
create policy members_staff_select on members
  for select
  using (is_staff());

grant select on members to authenticated;
grant select on members_view to authenticated; -- computed "expired" status view

-- ---------- membership_history: staff can read ----------
drop policy if exists history_staff_select on membership_history;
create policy history_staff_select on membership_history
  for select
  using (is_staff());

grant select on membership_history to authenticated;

-- ---------- staff table: staff can see the staff list (for future staff mgmt) ----------
drop policy if exists staff_staff_select on staff;
create policy staff_staff_select on staff
  for select
  using (is_staff());

grant select on staff to authenticated;

-- ---------- app_settings: staff can read (e.g. show DEMO_MODE badge in dashboard) ----------
drop policy if exists settings_staff_select on app_settings;
create policy settings_staff_select on app_settings
  for select
  using (is_staff());

grant select on app_settings to authenticated;

-- ---------- RPC execute grants ----------
-- Public (anon) visitors may only ever call these two functions:
grant execute on function register_member(text, text, text, membership_plan) to anon, authenticated;
grant execute on function get_registration_by_token(text) to anon, authenticated;

-- Everything else is staff-only (the functions themselves also check is_staff()
-- internally, so this grant is a second layer, not the only one):
grant execute on function admin_mark_paid(uuid) to authenticated;
grant execute on function admin_renew_membership(uuid, membership_plan) to authenticated;
grant execute on function admin_cancel_membership(uuid) to authenticated;
grant execute on function verify_member_qr(text) to authenticated;
grant execute on function is_staff() to authenticated;

-- =========================================================
-- ONE-TIME MANUAL STEP (do this after running all 3 migration files):
--
-- 1. In Supabase Dashboard -> Authentication -> Users, click
--    "Add user" and create the owner account with email
--    abdulkachallah@gmail.com and a password you choose.
--    DO NOT put the password in this file or anywhere in the repo.
--
-- 2. Copy the new user's UUID from that screen, then run:
--
--    insert into staff (user_id, email, role)
--    values ('PASTE-USER-UUID-HERE', 'abdulkachallah@gmail.com', 'owner');
--
-- That row is what makes this account an admin — being able to log in
-- via Supabase Auth alone does NOT grant dashboard access.
-- =========================================================
