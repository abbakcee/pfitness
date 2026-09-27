import { useEffect, useState } from 'react';
import type { EmailOtpType } from '@supabase/supabase-js';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import SimpleHeader from '../components/SimpleHeader';
import { supabase } from '../lib/supabaseClient';

type ConfirmationState = 'checking' | 'confirmed' | 'error';

export default function EmailConfirmationPage() {
  const [params] = useSearchParams();
  const [state, setState] = useState<ConfirmationState>('checking');
  const [message, setMessage] = useState('Confirming your email address…');

  useEffect(() => {
    const tokenHash = params.get('token_hash');
    const type = params.get('type') as EmailOtpType | null;
    if (!tokenHash || !type) {
      setState('error');
      setMessage('This confirmation link is incomplete. Request a new link from the member login page.');
      return;
    }
    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (error) {
        setState('error');
        setMessage(error.message.toLowerCase().includes('expired') ? 'This confirmation link has expired or was already used. Request a new link from the member login page.' : error.message);
        return;
      }
      setState('confirmed');
      setMessage('Your email has been confirmed. You can now open your member portal.');
    });
  }, [params]);

  return <div className="auth-page"><SimpleHeader subtitle="Email confirmation" /><main className="login-wrap"><section className="login-card confirmation-card">{state === 'checking' && <Loader2 className="animate-spin confirmation-icon" />}{state === 'confirmed' && <CheckCircle2 className="confirmation-icon success" />}{state === 'error' && <XCircle className="confirmation-icon error" />}<p className="eyebrow">P-Fitness membership</p><h1>{state === 'checking' ? 'Please wait' : state === 'confirmed' ? 'Email confirmed' : 'Link problem'}</h1><p className="page-copy">{message}</p>{state !== 'checking' && <Link className="btn-primary" to="/login" state={state === 'confirmed' ? { emailConfirmed: true } : undefined}>{state === 'confirmed' ? 'Continue to member login' : 'Return to member login'}</Link>}</section></main></div>;
}
