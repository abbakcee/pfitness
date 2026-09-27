import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, LogOut, Users, QrCode } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import StatsCards from '../../components/admin/StatsCards';
import MembersTable from '../../components/admin/MembersTable';
import MemberDetailDrawer from '../../components/admin/MemberDetailDrawer';
import QRVerifyPanel from '../../components/admin/QRVerifyPanel';
import type { Member } from '../../lib/types';

type Tab = 'members' | 'verify';

export default function AdminDashboardPage() {
  const { staff, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('members');

  const [members, setMembers] = useState<Member[]>([]);
  const [renewalsCount, setRenewalsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Member | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: memberRows, error: membersErr }, { count }] = await Promise.all([
      supabase.from('members_view').select('*').order('created_at', { ascending: false }),
      supabase.from('membership_history').select('id', { count: 'exact', head: true }).eq('action', 'renewal'),
    ]);
    if (membersErr) {
      setError('Could not load members. Please refresh.');
    } else {
      setMembers((memberRows ?? []) as Member[]);
      setRenewalsCount(count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  async function handleMarkPaid(member: Member) {
    setActionError(null);
    setBusyId(member.id);
    const { error } = await supabase.rpc('admin_mark_paid', { p_member_uuid: member.id });
    setBusyId(null);
    if (error) {
      setActionError('Could not update payment status. Please try again.');
      return;
    }
    loadMembers();
  }

  async function handleRenew(member: Member) {
    setActionError(null);
    setBusyId(member.id);
    const { error } = await supabase.rpc('admin_renew_membership', { p_member_uuid: member.id, p_plan: null });
    setBusyId(null);
    if (error) {
      setActionError('Could not renew this membership. Please try again.');
      return;
    }
    loadMembers();
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-white font-sans">
      <header className="border-b border-[var(--brand-border)] bg-[var(--brand-surface)]/60 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/pfitnesslogo.png" alt="P Fitness" className="h-8 w-auto" />
            <div>
              <div className="font-black uppercase tracking-widest text-sm">P-Fitness Admin</div>
              <div className="text-xs text-gray-500">{staff?.email} &middot; {staff?.role}</div>
            </div>
          </div>
          <button onClick={signOut} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-white border border-white/10 rounded-lg px-3 py-2">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-2 mb-6">
          <TabButton active={tab === 'members'} onClick={() => setTab('members')} icon={<Users size={14} />} label="Members" />
          <TabButton active={tab === 'verify'} onClick={() => setTab('verify')} icon={<QrCode size={14} />} label="Verify QR" />
        </div>

        {tab === 'members' ? (
          loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-16 justify-center">
              <Loader2 className="animate-spin" size={20} /> Loading members...
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-16">{error}</div>
          ) : (
            <>
              <StatsCards members={members} renewalsCount={renewalsCount} />
              {actionError && <p className="text-red-400 text-sm mb-4">{actionError}</p>}
              <MembersTable members={members} onView={setSelected} onMarkPaid={handleMarkPaid} onRenew={handleRenew} busyId={busyId} />
            </>
          )
        ) : (
          <QRVerifyPanel />
        )}
      </main>

      {selected && <MemberDetailDrawer member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
        active ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--brand-surface)] border border-[var(--brand-border)] text-gray-400 hover:text-white'
      }`}
    >
      {icon} {label}
    </button>
  );
}
