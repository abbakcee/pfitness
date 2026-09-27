import React from 'react';
import { Link } from 'react-router-dom';

export default function SimpleHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="border-b border-[var(--brand-border)] bg-[var(--brand-bg)]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/pfitnesslogo.png" alt="P Fitness Logo" className="h-10 sm:h-12 w-auto max-w-full object-contain" draggable="false" />
        </Link>
        {subtitle && (
          <span className="text-xs uppercase tracking-widest text-gray-400 font-bold">{subtitle}</span>
        )}
      </div>
    </header>
  );
}
