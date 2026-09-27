import React from 'react';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  expired: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
  paid: 'bg-green-500/15 text-green-400 border-green-500/30',
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? 'bg-white/10 text-gray-300 border-white/20';
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${style}`}>
      {status}
    </span>
  );
}
