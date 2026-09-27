-- Make public registration safe when Supabase email confirmation is enabled.
create or replace function public.handle_new_member_signup()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_plan_id uuid;
  v_full_name text := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  v_phone text := trim(coalesce(new.raw_user_meta_data ->> 'phone', ''));
  v_plan_key text := coalesce(new.raw_user_meta_data ->> 'membership_plan', '');
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') <> 'pfitness_member'
     or v_full_name = '' or v_phone = '' or v_plan_key = '' then return new; end if;
  select id into v_plan_id from public.membership_plans where key = v_plan_key and active = true;
  if v_plan_id is null then raise exception 'invalid_membership_plan'; end if;
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, v_full_name, lower(new.email), v_phone) on conflict (id) do nothing;
  insert into public.memberships (profile_id, plan_id, status, payment_status)
  select new.id, v_plan_id, 'pending', 'pending'
  where not exists (select 1 from public.memberships where profile_id = new.id);
  return new;
end $$;

drop trigger if exists on_auth_member_signup on auth.users;
create trigger on_auth_member_signup after insert on auth.users
for each row execute function public.handle_new_member_signup();

create or replace function public.member_set_initial_photo(p_photo_path text)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_photo_path is null or split_part(p_photo_path, '/', 1) <> v_uid::text then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  update public.profiles set photo_path = p_photo_path where id = v_uid and photo_path is null;
  if not found then raise exception 'initial_photo_not_available'; end if;
end $$;

grant execute on function public.member_set_initial_photo(text) to authenticated;
