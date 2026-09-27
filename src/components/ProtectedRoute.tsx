import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
export default function ProtectedRoute({ role, children }: { role: 'member' | 'staff'; children: React.ReactNode }) { const auth = useAuth(); const location = useLocation(); if (auth.loading) return <div className="min-h-screen grid place-items-center bg-[#080808] text-white"><Loader2 className="animate-spin" /></div>; if (auth.role !== role) return <Navigate to={role === 'staff' ? '/admin/login' : '/login'} state={{ from: location.pathname }} replace />; return <>{children}</>; }
