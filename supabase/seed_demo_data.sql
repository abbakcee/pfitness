-- =========================================================
-- OPTIONAL demo data — clearly fictional, safe to run or skip.
-- To remove later: delete from members where email like '%@example.com';
-- =========================================================

select register_member('Demo User', 'demo.active@example.com', '+2348010000001', '3_months');
select register_member('Demo Expired', 'demo.expired@example.com', '+2348010000002', '1_month');

-- Force the second one into the past so you can see "Expired" in the dashboard.
update members
  set start_date = current_date - interval '2 months',
      end_date = current_date - interval '1 month'
  where email = 'demo.expired@example.com';

select register_member('Demo Pending', 'demo.pending@example.com', '+2348010000003', '1_year');
-- To see the PENDING (real-mode) path, flip app_settings.demo_mode to false
-- before running this line, or just manually set the row:
update members
  set payment_status = 'pending', membership_status = 'pending', start_date = null, end_date = null
  where email = 'demo.pending@example.com';
