import React, { useMemo, useState } from 'react';
import { Search, Eye, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';
import type { Member } from '../../lib/types';
import { MEMBERSHIP_PLANS, formatNaira } from '../../lib/config';
import StatusBadge from './StatusBadge';

type FilterKey = 'all' | 'active' | 'pending' | 'expired' | 'paid' | 'unpaid';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'expired', label: 'Expired' },
  { key: 'paid', label: 'Paid' },
  { key: 'unpaid', label: 'Unpaid' },
];

export default function MembersTable({
  members,
  onView,
  onMarkPaid,
  onRenew,
  busyId,
}: {
  members: Member[];
  onView: (m: Member) => void;
  onMarkPaid: (m: Member) => void;
  onRenew: (m: Member) => void;
  busyId: string | null;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  const filtered = useMemo(() => {
    let list = members;
    if (filter === 'active' || filter === 'pending' || filter === 'expired') {
      list = list.filter((m) => m.computed_status === filter);
    } else if (filter === 'paid') {
      list = list.filter((m) => m.payment_status === 'paid');
    } else if (filter === 'unpaid') {
      list = list.filter((m) => m.payment_status === 'pending');
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.member_id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [members, filter, query]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, or Member ID"
            className="w-full bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[var(--brand-primary)]"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${
                filter === f.key ? 'bg-[var(--brand-primary)] text-white' : 'bg-[var(--brand-surface)] border border-[var(--brand-border)] text-gray-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-16 border border-dashed border-[var(--brand-border)] rounded-xl">No members match this view.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="sm:hidden space-y-3">
            {filtered.map((m) => (
              <div key={m.id} className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-bold">{m.full_name}</div>
                    <div className="text-xs text-gray-500 font-mono">{m.member_id}</div>
                  </div>
                  <StatusBadge status={m.computed_status ?? m.membership_status} />
                </div>
                <div className="text-xs text-gray-400 space-y-0.5 mb-3">
                  <div>{MEMBERSHIP_PLANS[m.membership_plan]?.label ?? m.membership_plan} &middot; {formatNaira(m.membership_price)}</div>
                  <div>{m.phone}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={m.payment_status} />
                  </div>
                </div>
                <RowActions member={m} onView={onView} onMarkPaid={onMarkPaid} onRenew={onRenew} busy={busyId === m.id} />
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl border border-[var(--brand-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--brand-surface)] text-left text-gray-500 uppercase text-xs tracking-widest">
                  <th className="px-4 py-3">Member ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-t border-[var(--brand-border)] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs">{m.member_id}</td>
                    <td className="px-4 py-3 font-medium">{m.full_name}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      <div>{m.email}</div>
                      <div>{m.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{MEMBERSHIP_PLANS[m.membership_plan]?.label ?? m.membership_plan}</td>
                    <td className="px-4 py-3"><StatusBadge status={m.payment_status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={m.computed_status ?? m.membership_status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{m.end_date ?? '—'}</td>
                    <td className="px-4 py-3">
                      <RowActions member={m} onView={onView} onMarkPaid={onMarkPaid} onRenew={onRenew} busy={busyId === m.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function RowActions({
  member,
  onView,
  onMarkPaid,
  onRenew,
  busy,
}: {
  member: Member;
  onView: (m: Member) => void;
  onMarkPaid: (m: Member) => void;
  onRenew: (m: Member) => void;
  busy: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={() => onView(member)} className="p-1.5 rounded border border-[var(--brand-border)] hover:border-white/40 text-gray-300" title="View">
        <Eye size={14} />
      </button>
      {member.payment_status === 'pending' && (
        <button
          onClick={() => onMarkPaid(member)}
          disabled={busy}
          className="flex items-center gap-1 px-2 py-1.5 rounded bg-green-600/20 border border-green-600/40 text-green-400 text-xs font-bold uppercase disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Mark Paid
        </button>
      )}
      <button
        onClick={() => onRenew(member)}
        disabled={busy}
        className="flex items-center gap-1 px-2 py-1.5 rounded bg-white/5 border border-white/20 text-gray-200 text-xs font-bold uppercase disabled:opacity-50"
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Renew
      </button>
    </div>
  );
}
