import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import HomePage from './pages/HomePage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import EmailConfirmationPage from './pages/EmailConfirmationPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute from './components/ProtectedRoute';

const MemberLayout = lazy(() => import('./components/MemberLayout'));
const MemberHomePage = lazy(() => import('./pages/MemberHomePage'));
const MemberMembershipPage = lazy(() => import('./pages/MemberMembershipPage'));
const MemberHistoryPage = lazy(() => import('./pages/MemberHistoryPage'));
const MemberProfilePage = lazy(() => import('./pages/MemberProfilePage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboardV1'));
const AdminMembers = lazy(() => import('./pages/admin/AdminMembersPage'));
const AdminScanner = lazy(() => import('./pages/admin/AdminScannerPage'));
const AdminCheckins = lazy(() => import('./pages/admin/AdminCheckinsPage'));

function Fallback() {
  return <div className="min-h-screen grid place-items-center bg-[#080808] text-white"><Loader2 className="animate-spin text-red-500" /></div>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'auto' }); }, [pathname]);
  return null;
}

export default function App() {
  return <Suspense fallback={<Fallback />}><ScrollToTop /><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/confirm" element={<EmailConfirmationPage />} />
    <Route path="/member" element={<ProtectedRoute role="member"><MemberLayout /></ProtectedRoute>}>
      <Route index element={<MemberHomePage />} />
      <Route path="membership" element={<MemberMembershipPage />} />
      <Route path="history" element={<MemberHistoryPage />} />
      <Route path="profile" element={<MemberProfilePage />} />
    </Route>
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route path="/admin" element={<ProtectedRoute role="staff"><AdminLayout /></ProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="members" element={<AdminMembers />} />
      <Route path="scanner" element={<AdminScanner />} />
      <Route path="checkins" element={<AdminCheckins />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense>;
}
