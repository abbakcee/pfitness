import React from 'react';
import type { Member } from '../../lib/types';

export default function StatsCards({ members, renewalsCount }: { members: Member[]; renewalsCount: number }) {
  const today = new Date().toISOString().slice(0, 10);

  const total = members.length;
  const active = members.filter((m) => m.computed_status === 'active').length;
  const pendingPayments = members.filter((m) => m.payment_status === 'pending').length;
  const expired = members.filter((m) => m.computed_status === 'expired').length;
  const newToday = members.filter((m) => m.registration_date?.slice(0, 10) === today).length;

  const stats = [
    { label: 'Total Members', value: total },
    { label: 'Active Members', value: active },
    { label: 'Pending Payments', value: pendingPayments },
    { label: 'Expired Members', value: expired },
    { label: 'New Registrations (Today)', value: newToday },
    { label: 'Renewals', value: renewalsCount },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {stats.map((s) => (
        <div key={s.label} className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl p-4">
          <div className="text-2xl font-black">{s.value}</div>
          <div className="text-[11px] uppercase tracking-widest text-gray-500 font-bold mt-1 leading-tight">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
