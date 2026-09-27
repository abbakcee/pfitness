import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, staff, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  // Being logged in via Supabase Auth is NOT enough — the account must
  // also have a row in the `staff` table (checked server-side by RLS/RPCs
  // too, this is just the UI-level gate).
  if (!session || !staff) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}
