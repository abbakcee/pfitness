import React from 'react';
import { X } from 'lucide-react';
import type { Member } from '../../lib/types';
import { MEMBERSHIP_PLANS, formatNaira } from '../../lib/config';
import StatusBadge from './StatusBadge';

export default function MemberDetailDrawer({ member, onClose }: { member: Member; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-[var(--brand-surface)] border-l border-[var(--brand-border)] p-6 overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-black uppercase tracking-tight">Member Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <Row label="Member ID" value={<span className="font-mono font-bold text-[var(--brand-primary)]">{member.member_id}</span>} />
          <Row label="Name" value={member.full_name} />
          <Row label="Email" value={member.email} />
          <Row label="Phone" value={member.phone} />
          <Row label="Plan" value={`${MEMBERSHIP_PLANS[member.membership_plan]?.label ?? member.membership_plan} — ${formatNaira(member.membership_price)}`} />
          <Row label="Registration Date" value={new Date(member.registration_date).toLocaleString('en-NG')} />
          <Row label="Payment Status" value={<StatusBadge status={member.payment_status} />} />
          <Row label="Membership Status" value={<StatusBadge status={member.computed_status ?? member.membership_status} />} />
          <Row label="Start Date" value={member.start_date ?? '—'} />
          <Row label="End Date" value={member.end_date ?? '—'} />
          <Row label="QR / Verification ID" value={<span className="font-mono text-xs break-all">{member.qr_identifier}</span>} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center gap-4 border-b border-[var(--brand-border)] pb-3">
      <span className="text-gray-500 uppercase text-xs tracking-widest">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
