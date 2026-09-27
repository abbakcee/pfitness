import type { PlanKey } from './config';

export type PaymentStatus = 'pending' | 'paid';
export type MembershipStatus = 'pending' | 'active' | 'expired' | 'deactivated';
export type StaffRole = 'owner' | 'manager' | 'staff';

export interface MembershipPlan { id: string; key: PlanKey; name: string; price: number; duration_months: number; active: boolean }
export interface Profile { id: string; member_id: string; full_name: string; email: string; phone: string; photo_path: string | null; photo_url?: string | null; qr_token: string; created_at: string; updated_at?: string }
export interface Membership { id: string; profile_id: string; plan_key: PlanKey; plan_name: string; price: number; status: MembershipStatus; payment_status: PaymentStatus; requested_at: string; payment_date: string | null; start_date: string | null; end_date: string | null; created_at: string; notes?: string | null }
export interface CheckIn { id: string; profile_id: string; membership_id: string | null; scanned_at: string; scan_status: MembershipStatus; profile?: Pick<Profile, 'full_name' | 'member_id'> }
export interface PhotoChangeRequest { id: string; profile_id: string; requested_photo_path: string; requested_photo_url?: string | null; status: 'pending' | 'approved' | 'rejected'; created_at: string }
export interface MemberOverview { profile: Profile; currentMembership: Membership | null; history: Membership[]; photoRequest: PhotoChangeRequest | null; checkIns?: CheckIn[] }
export interface AdminMember extends MemberOverview {}
export interface ScanResult { result: 'active' | 'pending' | 'expired' | 'deactivated' | 'not_found'; check_in_recorded: boolean; profile?: Profile; membership?: Membership | null }
export interface CheckInMetric { label: 'Today' | 'This Week' | 'This Month'; uniqueMembers: number; totalScans: number }

// Legacy shapes kept for the original confirmation page and V0 migration.
export interface RegisterCreatedResult { status: 'created'; member_id: string; confirmation_token: string; full_name: string; membership_plan: PlanKey; membership_price: number; payment_status: PaymentStatus; membership_status: MembershipStatus; registration_date: string; start_date: string | null; end_date: string | null }
export interface RegisterDuplicateResult { status: 'duplicate'; membership_plan: PlanKey; membership_status: MembershipStatus; payment_status: PaymentStatus; end_date: string | null; message: string }
export type RegisterResult = RegisterCreatedResult | RegisterDuplicateResult;
export interface ConfirmationData { member_id: string; full_name: string; membership_plan: PlanKey; membership_price: number; payment_status: PaymentStatus; membership_status: MembershipStatus; registration_date: string; start_date: string | null; end_date: string | null; qr_identifier: string }
export interface Member { id: string; member_id: string; full_name: string; email: string; phone: string; membership_plan: PlanKey; membership_price: number; registration_date: string; payment_status: PaymentStatus; membership_status: MembershipStatus; computed_status?: MembershipStatus; start_date: string | null; end_date: string | null; qr_identifier: string; created_at: string; updated_at: string }
export interface QRVerifyResult { result: 'verified' | 'expired' | 'not_found' | 'payment_pending' | 'not_active'; member_id?: string; full_name?: string; membership_plan?: PlanKey; membership_status?: MembershipStatus; start_date?: string | null; end_date?: string | null }
