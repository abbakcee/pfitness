-- P-Fitness member portal V1 (additive upgrade; legacy V0 tables remain intact)
create extension if not exists pgcrypto;

do $$ begin create type membership_state as enum ('pending','active','expired','deactivated'); exception when duplicate_object then null; end $$;
do $$ begin create type photo_request_state as enum ('pending','approved','rejected'); exception when duplicate_object then null; end $$;

create table if not exists membership_plans (
  id uuid primary key default gen_random_uuid(), key text not null unique check (key in ('1_month','3_months','1_year')),
  name text not null, price integer not null check (price >= 0), duration_months integer not null check (duration_months > 0), active boolean not null default true
);
insert into membership_plans (key,name,price,duration_months) values
  ('1_month','1 Month',30000,1),('3_months','3 Months',80000,3),('1_year','1 Year',140000,12)
on conflict (key) do update set name=excluded.name,price=excluded.price,duration_months=excluded.duration_months;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  member_id text not null unique default ('PF-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8))),
  full_name text not null, email text not null, phone text not null,
  photo_path text, qr_token text not null unique default encode(gen_random_bytes(32),'hex'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists profiles_email_uidx on profiles(lower(email));
create index if not exists profiles_search_idx on profiles using gin (to_tsvector('simple',full_name||' '||email||' '||phone||' '||member_id));

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete restrict,
  plan_id uuid not null references membership_plans(id), status membership_state not null default 'pending',
  payment_status payment_status not null default 'pending', requested_at timestamptz not null default now(),
  payment_date date, start_date date, end_date date, notes text, activated_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint membership_dates_valid check (end_date is null or start_date is null or end_date >= start_date)
);
create index if not exists memberships_profile_idx on memberships(profile_id,created_at desc);
create index if not exists memberships_status_idx on memberships(status);
create unique index if not exists memberships_one_pending_idx on memberships(profile_id) where status='pending';
create unique index if not exists memberships_one_active_idx on memberships(profile_id) where status in ('active','deactivated');

create table if not exists check_ins (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete restrict,
  membership_id uuid references memberships(id) on delete set null, scanned_at timestamptz not null default now(),
  scan_status membership_state not null, scanned_by uuid references auth.users(id)
);
create index if not exists check_ins_scanned_idx on check_ins(scanned_at desc);
create index if not exists check_ins_profile_idx on check_ins(profile_id,scanned_at desc);

create table if not exists photo_change_requests (
  id uuid primary key default gen_random_uuid(), profile_id uuid not null references profiles(id) on delete restrict,
  requested_photo_path text not null, status photo_request_state not null default 'pending', reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz, created_at timestamptz not null default now()
);
create unique index if not exists photo_one_pending_idx on photo_change_requests(profile_id) where status='pending';

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles for each row execute function set_updated_at();
drop trigger if exists memberships_set_updated_at on memberships;
create trigger memberships_set_updated_at before update on memberships for each row execute function set_updated_at();

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('member-photos','member-photos',false,5000000,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5000000,allowed_mime_types=excluded.allowed_mime_types;

create or replace function member_create_registration(p_full_name text,p_phone text,p_plan_key text,p_photo_path text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_plan uuid; v_membership uuid;
begin
  if v_uid is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if length(trim(p_full_name))<2 or length(regexp_replace(p_phone,'\D','','g'))<7 then raise exception 'invalid_profile'; end if;
  select id into v_plan from membership_plans where key=p_plan_key and active=true;
  if v_plan is null then raise exception 'invalid_plan'; end if;
  insert into profiles(id,full_name,email,phone,photo_path) values(v_uid,trim(p_full_name),lower(auth.jwt()->>'email'),trim(p_phone),p_photo_path)
  on conflict(id) do update set full_name=excluded.full_name,phone=excluded.phone,photo_path=coalesce(excluded.photo_path,profiles.photo_path);
  if exists(select 1 from memberships where profile_id=v_uid) then raise exception 'membership_already_exists'; end if;
  insert into memberships(profile_id,plan_id) values(v_uid,v_plan) returning id into v_membership;
  return v_membership;
end $$;

create or replace function member_request_renewal(p_plan_key text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_plan uuid; v_id uuid;
begin
  if v_uid is null or not exists(select 1 from profiles where id=v_uid) then raise exception 'member_required' using errcode='42501'; end if;
  if exists(select 1 from memberships where profile_id=v_uid and status='pending') then raise exception 'renewal_already_pending'; end if;
  select id into v_plan from membership_plans where key=p_plan_key and active=true;
  if v_plan is null then raise exception 'invalid_plan'; end if;
  insert into memberships(profile_id,plan_id,status,payment_status) values(v_uid,v_plan,'pending','pending') returning id into v_id;
  return v_id;
end $$;

create or replace function admin_activate_membership(p_profile_id uuid,p_plan_key text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_row memberships%rowtype; v_plan membership_plans%rowtype; v_start date:=current_date;
begin
  if not is_staff() then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into v_row from memberships where profile_id=p_profile_id and status='pending' order by created_at desc limit 1 for update;
  if not found then raise exception 'no_pending_membership'; end if;
  if p_plan_key is not null then select * into v_plan from membership_plans where key=p_plan_key and active=true; else select * into v_plan from membership_plans where id=v_row.plan_id; end if;
  update memberships set status='expired',updated_at=now() where profile_id=p_profile_id and status in ('active','deactivated');
  update memberships set plan_id=v_plan.id,status='active',payment_status='paid',payment_date=v_start,start_date=v_start,end_date=(v_start+make_interval(months=>v_plan.duration_months))::date,activated_by=auth.uid() where id=v_row.id;
  return v_row.id;
end $$;

create or replace function admin_renew_member(p_profile_id uuid,p_plan_key text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_plan membership_plans%rowtype; v_id uuid; v_pending uuid; v_start date:=current_date;
begin
  if not is_staff() then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_plan_key is null then
    select mp.* into v_plan from memberships m join membership_plans mp on mp.id=m.plan_id where m.profile_id=p_profile_id order by m.created_at desc limit 1;
  else select * into v_plan from membership_plans where key=p_plan_key and active=true; end if;
  if not found then raise exception 'invalid_plan'; end if;
  select id into v_pending from memberships where profile_id=p_profile_id and status='pending' order by created_at desc limit 1;
  update memberships set status='expired',updated_at=now() where profile_id=p_profile_id and status in ('active','deactivated');
  if v_pending is not null then
    update memberships set plan_id=v_plan.id,status='active',payment_status='paid',payment_date=v_start,start_date=v_start,end_date=(v_start+make_interval(months=>v_plan.duration_months))::date,activated_by=auth.uid() where id=v_pending returning id into v_id;
  else
    insert into memberships(profile_id,plan_id,status,payment_status,requested_at,payment_date,start_date,end_date,activated_by)
    values(p_profile_id,v_plan.id,'active','paid',now(),v_start,v_start,(v_start+make_interval(months=>v_plan.duration_months))::date,auth.uid()) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function admin_deactivate_member(p_profile_id uuid)
returns void language plpgsql security definer set search_path=public as $$ begin if not is_staff() then raise exception 'not_authorized' using errcode='42501'; end if; update memberships set status='deactivated' where profile_id=p_profile_id and status='active'; if not found then raise exception 'no_active_membership'; end if; end $$;
create or replace function admin_reactivate_member(p_profile_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_row memberships%rowtype; v_months integer;
begin if not is_staff() then raise exception 'not_authorized' using errcode='42501'; end if; select * into v_row from memberships where profile_id=p_profile_id and status='deactivated' order by created_at desc limit 1 for update; if not found then raise exception 'not_deactivated'; end if; select duration_months into v_months from membership_plans where id=v_row.plan_id; update memberships set status='active',end_date=case when end_date is null or end_date<current_date then (current_date+make_interval(months=>v_months))::date else end_date end where id=v_row.id; end $$;
create or replace function admin_extend_membership(p_profile_id uuid,p_months integer default 1)
returns void language plpgsql security definer set search_path=public as $$ begin if not is_staff() then raise exception 'not_authorized' using errcode='42501'; end if; if p_months<1 or p_months>24 then raise exception 'invalid_extension'; end if; update memberships set end_date=(greatest(coalesce(end_date,current_date),current_date)+make_interval(months=>p_months))::date where id=(select id from memberships where profile_id=p_profile_id and status in('active','deactivated') order by created_at desc limit 1); if not found then raise exception 'no_current_membership'; end if; end $$;
create or replace function admin_approve_photo(p_profile_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_req photo_change_requests%rowtype;
begin if not is_staff() then raise exception 'not_authorized' using errcode='42501'; end if; select * into v_req from photo_change_requests where profile_id=p_profile_id and status='pending' order by created_at desc limit 1 for update; if not found then raise exception 'no_pending_photo'; end if; update profiles set photo_path=v_req.requested_photo_path where id=p_profile_id; update photo_change_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=v_req.id; end $$;

create or replace function staff_scan_member(p_identifier text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_profile profiles%rowtype; v_membership memberships%rowtype; v_plan membership_plans%rowtype; v_result membership_state; v_checked boolean:=false;
begin
  if not is_staff() then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into v_profile from profiles where qr_token=p_identifier or member_id=upper(p_identifier) limit 1;
  if not found then return jsonb_build_object('result','not_found','check_in_recorded',false); end if;
  update memberships set status='expired' where profile_id=v_profile.id and status='active' and end_date<current_date;
  select * into v_membership from memberships where profile_id=v_profile.id order by case status when 'active' then 1 when 'deactivated' then 2 when 'pending' then 3 else 4 end,created_at desc limit 1;
  if not found then v_result:='expired'; else v_result:=v_membership.status; select * into v_plan from membership_plans where id=v_membership.plan_id; end if;
  if v_result='active' then insert into check_ins(profile_id,membership_id,scan_status,scanned_by) values(v_profile.id,v_membership.id,'active',auth.uid()); v_checked:=true; end if;
  return jsonb_build_object('result',v_result,'check_in_recorded',v_checked,'profile',jsonb_build_object('id',v_profile.id,'member_id',v_profile.member_id,'full_name',v_profile.full_name,'email',v_profile.email,'phone',v_profile.phone,'photo_path',v_profile.photo_path,'qr_token',v_profile.qr_token,'created_at',v_profile.created_at),'membership',case when v_membership.id is null then null else jsonb_build_object('id',v_membership.id,'profile_id',v_profile.id,'plan_key',v_plan.key,'plan_name',v_plan.name,'price',v_plan.price,'status',v_result,'payment_status',v_membership.payment_status,'requested_at',v_membership.requested_at,'payment_date',v_membership.payment_date,'start_date',v_membership.start_date,'end_date',v_membership.end_date,'created_at',v_membership.created_at) end);
end $$;

alter table profiles enable row level security; alter table membership_plans enable row level security; alter table memberships enable row level security; alter table check_ins enable row level security; alter table photo_change_requests enable row level security;
create policy plans_read on membership_plans for select using(true);
create policy profile_self_read on profiles for select using(auth.uid()=id or is_staff());
create policy profile_self_update on profiles for update using(auth.uid()=id or is_staff()) with check(auth.uid()=id or is_staff());
create policy memberships_self_read on memberships for select using(auth.uid()=profile_id or is_staff());
create policy checkins_self_read on check_ins for select using(auth.uid()=profile_id or is_staff());
create policy photo_self_read on photo_change_requests for select using(auth.uid()=profile_id or is_staff());
create policy photo_self_insert on photo_change_requests for insert with check(auth.uid()=profile_id);
create policy photo_staff_update on photo_change_requests for update using(is_staff());

drop policy if exists member_photos_read on storage.objects;
create policy member_photos_read on storage.objects for select using(bucket_id='member-photos' and ((storage.foldername(name))[1]=auth.uid()::text or is_staff()));
drop policy if exists member_photos_insert on storage.objects;
create policy member_photos_insert on storage.objects for insert with check(bucket_id='member-photos' and (storage.foldername(name))[1]=auth.uid()::text);

grant select on membership_plans,profiles,memberships,check_ins,photo_change_requests to authenticated;
grant update(full_name,phone) on profiles to authenticated;
grant insert on photo_change_requests to authenticated;
grant execute on function member_create_registration(text,text,text,text),member_request_renewal(text),admin_activate_membership(uuid,text),admin_renew_member(uuid,text),admin_deactivate_member(uuid),admin_reactivate_member(uuid),admin_extend_membership(uuid,integer),admin_approve_photo(uuid),staff_scan_member(text) to authenticated;
