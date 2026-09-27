import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock3, ShieldCheck, RefreshCw } from 'lucide-react';
import { useMemberData } from '../lib/memberContext';
import { MemberPhoto, PageHeading, StatusPill } from '../components/PortalUI';
import { formatCalendarDate } from '../lib/config';

const messages = { pending: 'Visit P-Fitness and complete your payment to activate this membership.', active: 'You are active and ready to train. Present your QR at reception.', expired: 'This membership has expired. Choose a plan to request renewal.', deactivated: 'Access is deactivated. Please speak with P-Fitness staff.' };
export default function MemberHomePage() {
  const { data } = useMemberData(); const m = data.currentMembership; const status = m?.status ?? 'expired'; const [qr, setQr] = useState('');
  useEffect(() => { QRCode.toDataURL(data.profile.qr_token, { width: 360, margin: 1, color: { dark: '#080808', light: '#ffffff' } }).then(setQr); }, [data.profile.qr_token]);
  return <div><PageHeading eyebrow="Digital membership" title={`Welcome, ${data.profile.full_name.split(' ')[0]}`} copy="Your membership and secure check-in pass in one place." />
    <div className="member-home-grid">
      <section className={`membership-hero hero-${status}`}>
        <div className="membership-hero-top"><MemberPhoto profile={data.profile}/><div><StatusPill status={status}/><h2>{data.profile.full_name}</h2><p className="member-id">{data.profile.member_id}</p></div></div>
        <div className="plan-display"><span>Current plan</span><strong>{m?.plan_name ?? 'No current plan'}</strong><p>{messages[status]}</p></div>
        <div className="date-grid"><div><CalendarDays/><span>Started</span><strong>{formatCalendarDate(m?.start_date, 'After payment')}</strong></div><div><Clock3/><span>Expires</span><strong>{formatCalendarDate(m?.end_date, 'Not active')}</strong></div></div>
        {status !== 'active' && <Link to="/member/membership" className="btn-primary"><RefreshCw size={17}/>Choose renewal plan</Link>}
      </section>
      <section className="app-card qr-card"><div className="card-title-row"><div><p className="eyebrow">Secure pass</p><h2>Scan at reception</h2></div><ShieldCheck className="text-red-500"/></div>{qr ? <img src={qr} alt="Secure membership QR code"/> : <div className="qr-placeholder"/>}<p>This QR contains only a secure identifier, never your personal details.</p><span className="member-id">{data.profile.member_id}</span></section>
    </div>
  </div>;
}
