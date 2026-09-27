import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import { completePendingRegistrationPhoto } from './membershipApi';

type AppRole = 'member' | 'staff' | null;
interface StaffInfo { role: 'owner' | 'manager' | 'staff'; email: string }
interface DemoSession { role: Exclude<AppRole, null>; email: string; profileId?: string; expiresAt: number }
interface AuthContextValue { session: Session | null; staff: StaffInfo | null; role: AppRole; userId: string | null; loading: boolean; isDemo: boolean; signIn: (email: string, password: string) => Promise<{ error: string | null; role: AppRole }>; signOut: () => Promise<void>; startDemoMemberSession: (profileId: string, email: string) => void }
const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const DEMO_KEY = 'pfitness-demo-session';
const SESSION_DAYS = 14;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [staff, setStaff] = useState<StaffInfo | null>(null);
  const [role, setRole] = useState<AppRole>(null);
  const [demo, setDemo] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(true);
  async function resolveRole(currentSession: Session | null) {
    if (!currentSession) { setStaff(null); setRole(null); return; }
    const [{ data: staffRow }, { data: profileRow }] = await Promise.all([
      supabase.from('staff').select('role, email').eq('user_id', currentSession.user.id).maybeSingle(),
      supabase.from('profiles').select('id').eq('id', currentSession.user.id).maybeSingle(),
    ]);
    if (staffRow) { setStaff(staffRow as StaffInfo); setRole('staff'); }
    else if (profileRow) { setStaff(null); setRole('member'); }
    else { setStaff(null); setRole(null); }
  }
  useEffect(() => {
    if (!isSupabaseConfigured) {
      const saved = localStorage.getItem(DEMO_KEY);
      if (saved) { const parsed = JSON.parse(saved) as DemoSession; if (parsed.expiresAt > Date.now()) { setDemo(parsed); setRole(parsed.role); if (parsed.role === 'staff') setStaff({ role: 'owner', email: parsed.email }); } else localStorage.removeItem(DEMO_KEY); }
      setLoading(false); return;
    }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); resolveRole(data.session).finally(() => setLoading(false)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(true); resolveRole(next).finally(() => setLoading(false)); });
    return () => listener.subscription.unsubscribe();
  }, []);
  function persistDemo(next: DemoSession) { localStorage.setItem(DEMO_KEY, JSON.stringify(next)); setDemo(next); setRole(next.role); setStaff(next.role === 'staff' ? { role: 'owner', email: next.email } : null); }
  function startDemoMemberSession(profileId: string, email: string) { persistDemo({ role: 'member', profileId, email, expiresAt: Date.now() + SESSION_DAYS * 86_400_000 }); }
  async function signIn(email: string, password: string) {
    if (!isSupabaseConfigured) {
      const normalized = email.toLowerCase();
      if (normalized === 'member@pfitness.test' && password === 'Member123!') { startDemoMemberSession('demo-member', normalized); return { error: null, role: 'member' as const }; }
      if (normalized === 'staff@pfitness.test' && password === 'Staff123!') { persistDemo({ role: 'staff', email: normalized, expiresAt: Date.now() + SESSION_DAYS * 86_400_000 }); return { error: null, role: 'staff' as const }; }
      return { error: 'Invalid demo credentials.', role: null };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return { error: error?.message ?? 'Could not sign in.', role: null };
    const [{ data: staffRow }, { data: profileRow }] = await Promise.all([supabase.from('staff').select('role').eq('user_id', data.session.user.id).maybeSingle(), supabase.from('profiles').select('id').eq('id', data.session.user.id).maybeSingle()]);
    const nextRole: AppRole = staffRow ? 'staff' : profileRow ? 'member' : null;
    if (nextRole === 'member') await completePendingRegistrationPhoto(email, data.session.user.id);
    await resolveRole(data.session);
    return { error: nextRole ? null : 'This account is not connected to a member or staff profile.', role: nextRole };
  }
  async function signOut() { localStorage.removeItem(DEMO_KEY); setDemo(null); setStaff(null); setRole(null); if (isSupabaseConfigured) await supabase.auth.signOut(); }
  const userId = isSupabaseConfigured ? session?.user.id ?? null : demo?.profileId ?? (demo?.role === 'staff' ? 'demo-staff' : null);
  return <AuthContext.Provider value={{ session, staff, role, userId, loading, isDemo: !isSupabaseConfigured, signIn, signOut, startDemoMemberSession }}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value; }
