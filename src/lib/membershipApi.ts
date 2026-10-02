import { isSupabaseConfigured, supabase } from './supabaseClient';
import { demoAdminAction, demoPhotoRequest, demoRegister, demoRequestRenewal, demoScan, demoUpdateProfile, getDemoAdminMembers, getDemoCheckIns, getDemoMember } from './demoStore';
import type { AdminMember, CheckIn, MemberOverview, Membership, PhotoChangeRequest, Profile, ScanResult } from './types';
import type { PlanKey } from './config';
import { getPendingPhoto, removePendingPhoto, savePendingPhoto } from './pendingRegistration';
import { ensureCompressedProfilePhoto } from './profilePhoto';

async function signedPhoto(path?: string | null) { if (!path) return null; const { data } = await supabase.storage.from('member-photos').createSignedUrl(path, 3600); return data?.signedUrl ?? null; }
function currentDateKey(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function normalizeMembership(row: Membership): Membership { return row.status==='active'&&row.end_date&&row.end_date<currentDateKey()?{...row,status:'expired'}:row }
export async function registerMember(input: { fullName: string; email: string; phone: string; password: string; plan: PlanKey; photo: File | null; preview: string | null }) {
  if (!isSupabaseConfigured) return demoRegister({ ...input, photoUrl: input.preview });
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) await supabase.auth.signOut({ scope: 'local' });
  if (input.photo) await savePendingPhoto(input.email, await ensureCompressedProfilePhoto(input.photo));
  const { data, error } = await supabase.auth.signUp({ email: input.email, password: input.password, options: { data: { full_name: input.fullName, phone: input.phone, membership_plan: input.plan, account_type: 'pfitness_member' } } });
  if (error || !data.user) throw new Error(error?.message ?? 'Could not create account.');
  if (data.session) await completePendingRegistrationPhoto(input.email, data.user.id);
  return { id: data.user.id, email: input.email, requiresEmailConfirmation: !data.session };
}

export async function completePendingRegistrationPhoto(email: string, userId?: string) {
  if (!isSupabaseConfigured) return;
  const photo = await getPendingPhoto(email);
  if (!photo) return;
  const id = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!id) return;
  const compressedPhoto = await ensureCompressedProfilePhoto(photo);
  const extension = compressedPhoto.type === 'image/webp' ? 'webp' : 'jpg';
  const photoPath = `${id}/verified-${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from('member-photos').upload(photoPath, compressedPhoto, { contentType: compressedPhoto.type, upsert: false });
  if (upload.error) throw new Error('Your account is ready, but the photo upload failed. Please try again from your profile.');
  const { error } = await supabase.rpc('member_set_initial_photo', { p_photo_path: photoPath });
  if (error) throw new Error(error.message);
  await removePendingPhoto(email);
}
export async function getMemberOverview(userId: string): Promise<MemberOverview> {
  if (!isSupabaseConfigured) return getDemoMember(userId);
  const [{ data: profile, error }, { data: memberships }, { data: requests }, { data: checkIns }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('memberships').select('*, membership_plans(key,name,price)').eq('profile_id', userId).order('created_at', { ascending: false }),
    supabase.from('photo_change_requests').select('*').eq('profile_id', userId).eq('status', 'pending').order('created_at', { ascending: false }).limit(1),
    supabase.from('check_ins').select('*').eq('profile_id', userId).order('scanned_at', { ascending: false }).limit(20),
  ]);
  if (error || !profile) throw new Error('Could not load your membership.');
  const p = profile as Profile; p.photo_url = await signedPhoto(p.photo_path);
  const rows = (memberships ?? []).map((row: any) => normalizeMembership({ ...row, plan_key: row.membership_plans.key, plan_name: row.membership_plans.name, price: row.membership_plans.price } as Membership));
  const currentMembership = rows.find(m => m.status === 'active') ?? rows.find(m => m.status === 'deactivated') ?? rows.find(m => m.status === 'pending') ?? rows[0] ?? null;
  return { profile: p, currentMembership, history: rows.filter(m => m.id !== currentMembership?.id), photoRequest: ((requests ?? [])[0] ?? null) as PhotoChangeRequest | null, checkIns: (checkIns ?? []) as CheckIn[] };
}
export async function requestRenewal(profileId: string, plan: PlanKey) { if (!isSupabaseConfigured) return demoRequestRenewal(profileId, plan); const { error } = await supabase.rpc('member_request_renewal', { p_plan_key: plan }); if (error) throw error; }
export async function requestPhoto(profileId: string, file: File, preview: string) { if (!isSupabaseConfigured) return demoPhotoRequest(profileId, preview); const compressedPhoto = await ensureCompressedProfilePhoto(file); const extension = compressedPhoto.type === 'image/webp' ? 'webp' : 'jpg'; const path = `${profileId}/requests/${crypto.randomUUID()}.${extension}`; const upload = await supabase.storage.from('member-photos').upload(path, compressedPhoto, { contentType: compressedPhoto.type, upsert: false }); if (upload.error) throw upload.error; const { error } = await supabase.from('photo_change_requests').insert({ profile_id: profileId, requested_photo_path: path }); if (error) throw error; }
export async function updateProfile(profileId: string, input: { full_name: string; phone: string }) { if (!isSupabaseConfigured) return demoUpdateProfile(profileId,input); const { error } = await supabase.from('profiles').update(input).eq('id', profileId); if (error) throw error; }
export async function updatePassword(password: string) { if (password.length < 8) throw new Error('Use at least 8 characters.'); if (!isSupabaseConfigured) return; const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; }
export async function getAdminMembers(): Promise<AdminMember[]> {
  if (!isSupabaseConfigured) return getDemoAdminMembers();
  const { data, error } = await supabase.from('profiles').select('*, memberships(*, membership_plans(key,name,price)), photo_change_requests(*), check_ins(*)').order('created_at', { ascending: false }); if (error) throw error;
  return Promise.all((data ?? []).map(async (row: any) => { const profile: Profile = { ...row, photo_url: await signedPhoto(row.photo_path) }; const memberships: Membership[] = row.memberships.map((m: any) => normalizeMembership({ ...m, plan_key: m.membership_plans.key, plan_name: m.membership_plans.name, price: m.membership_plans.price } as Membership)).sort((a: Membership,b: Membership) => b.created_at.localeCompare(a.created_at)); const currentMembership = memberships.find(m => m.status === 'active') ?? memberships.find(m => m.status === 'deactivated') ?? memberships.find(m => m.status === 'pending') ?? memberships[0] ?? null; const request = row.photo_change_requests.filter((r: PhotoChangeRequest) => r.status === 'pending').sort((a: PhotoChangeRequest,b: PhotoChangeRequest) => b.created_at.localeCompare(a.created_at))[0] ?? null; if (request) request.requested_photo_url = await signedPhoto(request.requested_photo_path); return { profile, currentMembership, history: memberships.filter(m => m.id !== currentMembership?.id), photoRequest: request, checkIns: (row.check_ins ?? []).sort((a: CheckIn,b: CheckIn) => b.scanned_at.localeCompare(a.scanned_at)) }; }));
}
export async function adminAction(profileId: string, action: 'activate'|'renew'|'deactivate'|'reactivate'|'extend'|'approve_photo', plan?: PlanKey) { if (!isSupabaseConfigured) return demoAdminAction(profileId, action, plan); const map = { activate: 'admin_activate_membership', renew: 'admin_renew_member', deactivate: 'admin_deactivate_member', reactivate: 'admin_reactivate_member', extend: 'admin_extend_membership', approve_photo: 'admin_approve_photo' } as const; const args: Record<string, unknown> = { p_profile_id: profileId }; if (action === 'extend') args.p_months = 1; if ((action === 'activate'||action==='renew') && plan) args.p_plan_key = plan; const { error } = await supabase.rpc(map[action], args); if (error) throw error; }
export async function scanMember(identifier: string): Promise<ScanResult> { if (!isSupabaseConfigured) return demoScan(identifier); const { data, error } = await supabase.rpc('staff_scan_member', { p_identifier: identifier }); if (error) throw error; const result = data as ScanResult; if (result.profile?.photo_path) result.profile.photo_url = await signedPhoto(result.profile.photo_path); return result; }
export async function getCheckIns() { if (!isSupabaseConfigured) return getDemoCheckIns(); const { data, error } = await supabase.from('check_ins').select('*, profile:profiles(full_name,member_id)').order('scanned_at', { ascending: false }).limit(500); if (error) throw error; return data as CheckIn[]; }
