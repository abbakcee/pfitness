-- =========================================================
-- P-Fitness Membership System — 0002_functions.sql
-- Run this SECOND. All functions are SECURITY DEFINER and
-- own the entire read/write surface — the anon/public role
-- never touches the `members` table directly.
-- =========================================================

-- ---------- is_staff() — used by every privileged function ----------
create or replace function is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from staff where user_id = auth.uid());
$$;

-- ---------- effective membership status (auto-expiry, computed not stored) ----------
create or replace function effective_status(p_status membership_status, p_end_date date)
returns membership_status
language sql
immutable
as $$
  select case
    when p_status = 'active' and p_end_date is not null and p_end_date < current_date
      then 'expired'::membership_status
    else p_status
  end;
$$;

-- A view the admin dashboard reads from, so "expired" is always accurate
-- even if a cron/job hasn't touched the row yet.
create or replace view members_view as
  select
    m.*,
    effective_status(m.membership_status, m.end_date) as computed_status
  from members m;

-- ---------- member_id generator: PF-XXXXXXXX ----------
create or replace function generate_member_id()
returns text
language plpgsql
as $$
declare
  candidate text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I ambiguity
  i int;
begin
  loop
    candidate := 'PF-';
    for i in 1..8 loop
      candidate := candidate || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from members where member_id = candidate);
  end loop;
  return candidate;
end;
$$;

-- ---------- plan -> price lookup (server is the ONLY source of truth for price) ----------
create or replace function plan_price(p_plan membership_plan)
returns integer
language sql
immutable
as $$
  select case p_plan
    when '1_month' then 30000
    when '3_months' then 80000
    when '1_year' then 140000
  end;
$$;

create or replace function plan_interval(p_plan membership_plan)
returns interval
language sql
immutable
as $$
  select case p_plan
    when '1_month' then interval '1 month'
    when '3_months' then interval '3 months'
    when '1_year' then interval '1 year'
  end;
$$;

-- =========================================================
-- register_member — the ONLY way a public visitor can create a row.
-- Validates plan, enforces duplicate prevention, applies DEMO_MODE
-- logic, and returns a JSON payload the confirmation page can render.
-- =========================================================
create or replace function register_member(
  p_full_name text,
  p_email text,
  p_phone text,
  p_plan membership_plan
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo boolean;
  v_existing record;
  v_member_id text;
  v_price integer;
  v_start date;
  v_end date;
  v_payment payment_status;
  v_status membership_status;
  v_row members%rowtype;
begin
  -- basic server-side validation (defense in depth; frontend also validates)
  if p_full_name is null or length(trim(p_full_name)) < 2 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if p_email is null or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if p_phone is null or length(regexp_replace(p_phone, '\D', '', 'g')) < 7 then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  -- p_plan is already constrained to the enum type by Postgres itself,
  -- so an arbitrary/unknown plan string is rejected before we get here.

  select demo_mode into v_demo from app_settings where id = true;

  -- duplicate check: any PENDING or ACTIVE membership on this email or phone?
  select m.member_id, m.membership_plan, m.membership_status, m.end_date, m.payment_status
    into v_existing
    from members m
    where (lower(m.email) = lower(p_email) or m.phone = p_phone)
      and effective_status(m.membership_status, m.end_date) in ('pending', 'active')
    limit 1;

  if found then
    return jsonb_build_object(
      'status', 'duplicate',
      'membership_plan', v_existing.membership_plan,
      'membership_status', effective_status(v_existing.membership_status, v_existing.end_date),
      'payment_status', v_existing.payment_status,
      'end_date', v_existing.end_date,
      'message', 'You already have a P-Fitness membership registration. Please visit the gym to confirm and activate your membership.'
    );
  end if;

  v_member_id := generate_member_id();
  v_price := plan_price(p_plan);

  if v_demo then
    v_payment := 'paid';
    v_status := 'active';
    v_start := current_date;
    v_end := (current_date + plan_interval(p_plan))::date;
  else
    v_payment := 'pending';
    v_status := 'pending';
    v_start := null;
    v_end := null;
  end if;

  begin
    insert into members (
      member_id, full_name, email, phone, membership_plan, membership_price,
      payment_status, membership_status, start_date, end_date
    ) values (
      v_member_id, trim(p_full_name), lower(trim(p_email)), trim(p_phone), p_plan, v_price,
      v_payment, v_status, v_start, v_end
    )
    returning * into v_row;
  exception when unique_violation then
    -- race condition: someone else registered with the same email/phone
    -- between our check above and this insert. Re-check and report duplicate.
    select m.membership_plan, m.membership_status, m.end_date, m.payment_status
      into v_existing
      from members m
      where (lower(m.email) = lower(p_email) or m.phone = p_phone)
        and effective_status(m.membership_status, m.end_date) in ('pending', 'active')
      limit 1;
    return jsonb_build_object(
      'status', 'duplicate',
      'membership_plan', v_existing.membership_plan,
      'membership_status', effective_status(v_existing.membership_status, v_existing.end_date),
      'payment_status', v_existing.payment_status,
      'end_date', v_existing.end_date,
      'message', 'You already have a P-Fitness membership registration. Please visit the gym to confirm and activate your membership.'
    );
  end;

  insert into membership_history (
    member_uuid, action, membership_plan, membership_price, payment_status, start_date, end_date
  ) values (
    v_row.id, 'registration', v_row.membership_plan, v_row.membership_price, v_row.payment_status, v_row.start_date, v_row.end_date
  );

  return jsonb_build_object(
    'status', 'created',
    'member_id', v_row.member_id,
    'confirmation_token', v_row.confirmation_token,
    'full_name', v_row.full_name,
    'membership_plan', v_row.membership_plan,
    'membership_price', v_row.membership_price,
    'payment_status', v_row.payment_status,
    'membership_status', v_row.membership_status,
    'registration_date', v_row.registration_date,
    'start_date', v_row.start_date,
    'end_date', v_row.end_date
  );
end;
$$;

-- =========================================================
-- get_registration_by_token — powers the confirmation/recovery page.
-- The token is a 24-byte random hex value: effectively unguessable,
-- so this is safe to expose to anon without further auth.
-- =========================================================
create or replace function get_registration_by_token(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select case when m.id is null then null else
    jsonb_build_object(
      'member_id', m.member_id,
      'full_name', m.full_name,
      'membership_plan', m.membership_plan,
      'membership_price', m.membership_price,
      'payment_status', m.payment_status,
      'membership_status', effective_status(m.membership_status, m.end_date),
      'registration_date', m.registration_date,
      'start_date', m.start_date,
      'end_date', m.end_date,
      'qr_identifier', m.qr_identifier
    )
  end
  from members m
  where m.confirmation_token = p_token;
$$;

-- =========================================================
-- ADMIN-ONLY functions below. Every one starts by checking is_staff().
-- =========================================================

create or replace function admin_mark_paid(p_member_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo boolean;
  v_row members%rowtype;
begin
  if not is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select demo_mode into v_demo from app_settings where id = true;

  select * into v_row from members where id = p_member_uuid;
  if not found then
    raise exception 'member_not_found';
  end if;

  update members
    set payment_status = 'paid',
        membership_status = 'active',
        start_date = current_date,
        end_date = (current_date + plan_interval(membership_plan))::date
    where id = p_member_uuid
    returning * into v_row;

  insert into membership_history (member_uuid, action, membership_plan, membership_price, payment_status, start_date, end_date, performed_by)
    values (v_row.id, 'payment_confirmed', v_row.membership_plan, v_row.membership_price, v_row.payment_status, v_row.start_date, v_row.end_date, auth.uid());

  return jsonb_build_object('status', 'ok', 'member_id', v_row.member_id);
end;
$$;

-- Renew: if currently active & not yet expired, new period starts the day
-- AFTER the current end_date (no lost time). If expired/pending, new period
-- starts today.
create or replace function admin_renew_membership(p_member_uuid uuid, p_plan membership_plan default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row members%rowtype;
  v_plan membership_plan;
  v_start date;
  v_end date;
begin
  if not is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_row from members where id = p_member_uuid;
  if not found then
    raise exception 'member_not_found';
  end if;

  v_plan := coalesce(p_plan, v_row.membership_plan);

  if effective_status(v_row.membership_status, v_row.end_date) = 'active' and v_row.end_date >= current_date then
    v_start := v_row.end_date + 1;
  else
    v_start := current_date;
  end if;
  v_end := (v_start + plan_interval(v_plan))::date;

  update members
    set membership_plan = v_plan,
        membership_price = plan_price(v_plan),
        payment_status = 'paid',
        membership_status = 'active',
        start_date = v_start,
        end_date = v_end
    where id = p_member_uuid
    returning * into v_row;

  insert into membership_history (member_uuid, action, membership_plan, membership_price, payment_status, start_date, end_date, performed_by)
    values (v_row.id, 'renewal', v_row.membership_plan, v_row.membership_price, v_row.payment_status, v_row.start_date, v_row.end_date, auth.uid());

  return jsonb_build_object('status', 'ok', 'member_id', v_row.member_id, 'start_date', v_start, 'end_date', v_end);
end;
$$;

create or replace function admin_cancel_membership(p_member_uuid uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row members%rowtype;
begin
  if not is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  update members set membership_status = 'cancelled'
    where id = p_member_uuid
    returning * into v_row;
  if not found then
    raise exception 'member_not_found';
  end if;

  insert into membership_history (member_uuid, action, membership_plan, membership_price, payment_status, start_date, end_date, performed_by)
    values (v_row.id, 'cancellation', v_row.membership_plan, v_row.membership_price, v_row.payment_status, v_row.start_date, v_row.end_date, auth.uid());

  return jsonb_build_object('status', 'ok');
end;
$$;

-- =========================================================
-- verify_member_qr — staff scans a QR / types a Member ID.
-- Returns only the fields needed to make a verification decision.
-- =========================================================
create or replace function verify_member_qr(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row members%rowtype;
  v_status membership_status;
begin
  if not is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_row
    from members
    where qr_identifier = p_identifier or member_id = upper(p_identifier)
    limit 1;

  if not found then
    return jsonb_build_object('result', 'not_found');
  end if;

  v_status := effective_status(v_row.membership_status, v_row.end_date);

  if v_row.payment_status = 'pending' and v_status = 'pending' then
    return jsonb_build_object(
      'result', 'payment_pending',
      'member_id', v_row.member_id,
      'full_name', v_row.full_name,
      'membership_plan', v_row.membership_plan
    );
  elsif v_status = 'expired' then
    return jsonb_build_object(
      'result', 'expired',
      'member_id', v_row.member_id,
      'full_name', v_row.full_name,
      'membership_plan', v_row.membership_plan,
      'end_date', v_row.end_date
    );
  elsif v_status = 'active' then
    return jsonb_build_object(
      'result', 'verified',
      'member_id', v_row.member_id,
      'full_name', v_row.full_name,
      'membership_plan', v_row.membership_plan,
      'membership_status', v_status,
      'start_date', v_row.start_date,
      'end_date', v_row.end_date
    );
  else
    return jsonb_build_object('result', 'not_active', 'member_id', v_row.member_id, 'membership_status', v_status);
  end if;
end;
$$;
