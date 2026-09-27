import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-white flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-5xl font-black uppercase tracking-tight mb-4 text-[var(--brand-primary)]">404</h1>
      <p className="text-gray-400 mb-8">Page not found.</p>
      <Link to="/" className="bg-[var(--brand-primary)] px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-colors">
        Back to Home
      </Link>
    </div>
  );
}
