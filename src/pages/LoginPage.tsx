import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, LockKeyhole } from 'lucide-react';
import SimpleHeader from '../components/SimpleHeader';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const auth = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const registrationEmail = (location.state as { registrationEmail?: string } | null)?.registrationEmail;
  const emailConfirmed = (location.state as { emailConfirmed?: boolean } | null)?.emailConfirmed;
  const [email, setEmail] = useState(registrationEmail ?? (auth.isDemo ? 'member@pfitness.test' : ''));
  const [password, setPassword] = useState(auth.isDemo ? 'Member123!' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [notice, setNotice] = useState('');

  if (!auth.loading && auth.role === 'member') return <Navigate to="/member" replace />;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await auth.signIn(email.trim(), password);
      if (result.error || result.role !== 'member') {
        const message = result.role === 'staff' ? 'Use the staff login for this account.' : result.error ?? 'This is not a member account.';
        setError(message);
        setNeedsConfirmation(message.toLowerCase().includes('email not confirmed'));
        return;
      }
      nav('/member');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    setBusy(true);
    setError('');
    setNotice('');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setBusy(false);
    if (resendError) setError(resendError.message);
    else setNotice('A new confirmation email was sent. Open the newest message and click its confirmation button.');
  }

  return <div className="auth-page"><SimpleHeader subtitle="Member login" /><main className="login-wrap"><section className="login-card"><div className="login-icon"><LockKeyhole /></div><p className="eyebrow">Welcome back</p><h1>Member login</h1><p className="page-copy">Access your membership card, QR, plan and history.</p>{registrationEmail && <p className="form-notice">Your pending membership was created. Check <strong>{registrationEmail}</strong> and confirm your email, then log in here.</p>}{emailConfirmed && <p className="form-notice">Your email is confirmed. Log in to open your member portal.</p>}{auth.isDemo && <div className="demo-credentials"><strong>Demo account</strong><span>member@pfitness.test</span><span>Member123!</span></div>}<form onSubmit={submit} className="form-card"><label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>{error && <p className="form-error">{error}</p>}{notice && <p className="form-notice">{notice}</p>}<button className="btn-primary" disabled={busy}>{busy ? <Loader2 className="animate-spin" size={18} /> : <>Log in<ArrowRight size={17} /></>}</button>{needsConfirmation && <button type="button" className="btn-secondary resend-confirmation" disabled={busy || !email.trim()} onClick={resendConfirmation}>Resend confirmation email</button>}</form><p className="auth-switch">New to P-Fitness? <Link to="/register">Create an account</Link></p><p className="auth-switch"><Link to="/">Back to the main P-Fitness website</Link></p></section></main></div>;
}
