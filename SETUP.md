# P-Fitness Supabase setup

The site runs in an in-browser local demo when Supabase is not configured. Use these steps for real authentication, private photo storage and persistent membership data.

## 1. Environment

Copy `.env.example` to `.env.local` and set:

```env
VITE_SUPABASE_URL="https://YOUR-PROJECT-REF.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR-ANON-PUBLIC-KEY"
```

These two values are designed to be public. Do not expose the service-role key in frontend code.

## 2. Database migrations

Run the SQL files in order in Supabase SQL Editor:

1. `supabase/migrations/0001_schema.sql`
2. `supabase/migrations/0002_functions.sql`
3. `supabase/migrations/0003_rls.sql`
4. `supabase/migrations/0004_member_portal_v1.sql`

Migration 0004 is additive. It keeps the legacy V0 registration tables intact while adding authenticated profiles, plan history, check-ins, photo approvals, private storage policies and V1 RPCs.

For the intended immediate-login registration flow, set **Authentication → Providers → Email → Confirm email** to off. If email confirmation must remain on, registration needs a small server-side onboarding function before production because a newly created browser session is not available until confirmation.

## 3. Staff account

Create a user under **Authentication → Users**, copy its UUID, then run:

```sql
insert into staff (user_id, email, role)
values ('USER-UUID', 'owner@example.com', 'owner');
```

Staff and owners intentionally have the same permissions in V1. A normal authenticated account is not staff unless it also has a `staff` row.

## 4. Local verification

```bash
npm install
npm run lint
npm run build
npm run dev
```

Test in this order:

1. Register at `/register` with a new email, photo and plan.
2. Confirm the member portal shows `pending` and the QR remains visible.
3. Sign in as staff at `/admin/login` and open the pending member.
4. Choose **Confirm payment & activate**; today becomes `payment_date` and `start_date`, with `end_date` calculated from the plan.
5. Scan the QR or enter the member ID at `/admin/scanner`. Confirm the photo/status are visible and an active check-in is recorded.
6. Request renewal from `/member/membership`. Confirm the active plan remains current while the new request is pending.
7. Test Extend, Deactivate, Reactivate, Renew and photo approval from the member detail panel.
8. Check Today / This Week / This Month totals at `/admin/checkins`.

Calendar-only membership dates are formatted without timezone conversion, so the stored day does not shift in browsers west or east of UTC.
