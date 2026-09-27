import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, CreditCard, History, UserRound, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { getMemberOverview } from '../lib/membershipApi';
import type { MemberOverview } from '../lib/types';
import type { MemberContext } from '../lib/memberContext';

const items = [{ to: '/member', label: 'Home', icon: Home, end: true }, { to: '/member/membership', label: 'Membership', icon: CreditCard }, { to: '/member/history', label: 'History', icon: History }, { to: '/member/profile', label: 'Profile', icon: UserRound }];
export default function MemberLayout() {
  const { userId, isDemo } = useAuth(); const [data, setData] = useState<MemberOverview | null>(null); const [error, setError] = useState('');
  const refresh = useCallback(async () => { if (!userId) return; setError(''); try { setData(await getMemberOverview(userId)); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your membership.'); } }, [userId]);
  useEffect(() => { refresh(); const handler = () => refresh(); window.addEventListener('pfitness-demo-change', handler); return () => window.removeEventListener('pfitness-demo-change', handler); }, [refresh]);
  return <div className="portal-shell min-h-screen text-white">
    <aside className="portal-sidebar">
      <img src="/pfitnesslogo.png" alt="P-Fitness" className="h-10 sm:h-12 w-auto max-w-full object-contain mb-10" />
      <nav className="space-y-2">{items.map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} className={({isActive}) => `portal-nav-item ${isActive ? 'active' : ''}`}><Icon size={20}/><span>{label}</span></NavLink>)}</nav>
      {isDemo && <div className="demo-chip mt-auto">Local demo</div>}
    </aside>
    <div className="portal-main">
      <header className="portal-topbar"><img src="/pfitnesslogo.png" alt="P-Fitness" className="h-10 sm:h-12 w-auto max-w-full object-contain md:hidden"/><div className="ml-auto text-xs uppercase tracking-[.2em] text-zinc-500">Member portal</div></header>
      <main className="portal-content">{!data && !error ? <div className="state-panel"><Loader2 className="animate-spin text-red-500"/><p>Loading your membership...</p></div> : error ? <div className="state-panel"><p className="text-red-300">{error}</p><button className="btn-secondary" onClick={refresh}><RefreshCw size={16}/>Try again</button></div> : <Outlet context={{ data: data!, refresh } satisfies MemberContext}/>}</main>
      <nav className="portal-bottom-nav">{items.map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} className={({isActive}) => isActive ? 'active' : ''}><Icon size={20}/><span>{label}</span></NavLink>)}</nav>
    </div>
  </div>;
}
