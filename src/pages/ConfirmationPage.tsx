import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { CheckCircle2, Loader2, AlertTriangle, Camera, Mail, RotateCcw } from 'lucide-react';
import SimpleHeader from '../components/SimpleHeader';
import { supabase } from '../lib/supabaseClient';
import { MEMBERSHIP_PLANS, formatNaira, CONFIRMATION_SCREEN_SECONDS, formatCalendarDate } from '../lib/config';
import type { ConfirmationData } from '../lib/types';

type LoadState = 'loading' | 'found' | 'not_found' | 'error';
type EmailState = 'idle' | 'sending' | 'sent' | 'failed';

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function formatDate(d: string | null) {
  return formatCalendarDate(d, 'Confirmed at the gym');
}

export default function ConfirmationPage() {
  const { token } = useParams<{ token: string }>();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [data, setData] = useState<ConfirmationData | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  const [remaining, setRemaining] = useState(CONFIRMATION_SCREEN_SECONDS);
  const [screenExpired, setScreenExpired] = useState(false);

  const [emailState, setEmailState] = useState<EmailState>('idle');
  const emailAttempted = useRef(false);

  // ---- Fetch the registration by its (unguessable) confirmation token ----
  useEffect(() => {
    if (!token) {
      setLoadState('not_found');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: result, error } = await supabase.rpc('get_registration_by_token', { p_token: token });
        if (cancelled) return;
        if (error || !result) {
          setLoadState('not_found');
          return;
        }
        setData(result as ConfirmationData);
        setLoadState('found');
      } catch {
        if (!cancelled) setLoadState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ---- Countdown: persisted per-token in sessionStorage so a refresh
  // doesn't restart the five minutes indefinitely (and correctly shows
  // "expired" immediately if the person comes back after 5+ minutes). ----
  useEffect(() => {
    if (!token) return;
    const key = `pf_confirmation_started_${token}`;
    let startedAt = Number(sessionStorage.getItem(key));
    if (!startedAt) {
      startedAt = Date.now();
      sessionStorage.setItem(key, String(startedAt));
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = CONFIRMATION_SCREEN_SECONDS - elapsed;
      if (left <= 0) {
        setRemaining(0);
        setScreenExpired(true);
      } else {
        setRemaining(left);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [token]);

  // ---- Generate the QR code client-side from the non-sensitive qr_identifier ----
  useEffect(() => {
    if (!data?.qr_identifier) return;
    QRCode.toDataURL(data.qr_identifier, { width: 320, margin: 2, color: { dark: '#0B0B0B', light: '#FFFFFF' } })
      .then(setQrDataUrl)
      .catch(() => setQrError(true));
  }, [data?.qr_identifier]);

  // ---- Send the confirmation email once per token (persisted so refresh doesn't resend) ----
  const sendEmail = React.useCallback(async () => {
    if (!token) return;
    setEmailState('sending');
    try {
      const { error } = await supabase.functions.invoke('send-confirmation-email', {
        body: { confirmation_token: token },
      });
      if (error) {
        setEmailState('failed');
      } else {
        setEmailState('sent');
        sessionStorage.setItem(`pf_email_sent_${token}`, '1');
      }
    } catch {
      setEmailState('failed');
    }
  }, [token]);

  useEffect(() => {
    if (loadState !== 'found' || !token || emailAttempted.current) return;
    emailAttempted.current = true;
    if (sessionStorage.getItem(`pf_email_sent_${token}`)) {
      setEmailState('sent');
      return;
    }
    sendEmail();
  }, [loadState, token, sendEmail]);

  if (loadState === 'loading') {
    return (
      <PageShell>
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Loader2 className="animate-spin mb-4" size={32} />
          Loading your confirmation...
        </div>
      </PageShell>
    );
  }

  if (loadState === 'not_found' || loadState === 'error') {
    return (
      <PageShell>
        <div className="text-center py-16">
          <AlertTriangle className="mx-auto mb-4 text-[var(--brand-primary)]" size={40} />
          <h1 className="text-2xl font-black uppercase mb-2">Confirmation Not Found</h1>
          <p className="text-gray-400 max-w-md mx-auto mb-8">
            We couldn't find a registration for this link. If you registered recently, check your email
            for your confirmation, or contact P-Fitness directly.
          </p>
          <Link to="/register" className="inline-block bg-[var(--brand-primary)] px-6 py-3 rounded-lg font-bold uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-colors">
            Register Again
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!data) return null;
  const planDef = MEMBERSHIP_PLANS[data.membership_plan];

  return (
    <PageShell>
      <div className="text-center mb-8">
        <CheckCircle2 className="mx-auto mb-3 text-green-500" size={44} />
        <h1 className="text-3xl font-black uppercase tracking-tight">Registration Successful</h1>
        <p className="text-gray-400 mt-1">Welcome to P-Fitness, {data.full_name.split(' ')[0]}.</p>
      </div>

      <div className="bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-2xl p-6 sm:p-8 mb-6">
        <dl className="grid grid-cols-2 gap-y-4 text-sm mb-6">
          <Field label="Member ID"><span className="font-mono font-bold text-[var(--brand-primary)]">{data.member_id}</span></Field>
          <Field label="Status"><span className="font-bold capitalize">{data.membership_status}{data.membership_status === 'active' ? ' (Demo Mode)' : ''}</span></Field>
          <Field label="Name">{data.full_name}</Field>
          <Field label="Plan">{planDef ? `${planDef.label} \u2014 ${formatNaira(planDef.price)}` : data.membership_plan}</Field>
          <Field label="Start Date">{formatDate(data.start_date)}</Field>
          <Field label="End Date">{formatDate(data.end_date)}</Field>
        </dl>

        {/* ---- QR / expiry area ---- */}
        {screenExpired ? (
          <div className="bg-[var(--brand-bg)] border border-[var(--brand-border)] rounded-xl p-6 text-center">
            <AlertTriangle className="mx-auto mb-2 text-gray-500" size={28} />
            <p className="text-gray-300 font-medium">
              For security and convenience, this confirmation screen has expired. Your registration is
              still saved. Please use your confirmation email or contact P-Fitness if you need to recover
              your registration information.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl mb-4">
              {qrError ? (
                <div className="w-64 h-64 flex items-center justify-center text-black text-sm text-center px-4">
                  Your registration was saved, but we couldn't generate the QR code. Please refresh, or
                  present your Member ID at the gym.
                </div>
              ) : qrDataUrl ? (
                <img src={qrDataUrl} alt="Membership QR code" className="w-64 h-64 sm:w-72 sm:h-72" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                  <Loader2 className="animate-spin" />
                </div>
              )}
            </div>

            <div className="bg-[var(--brand-primary)]/10 border border-[var(--brand-primary)]/40 rounded-lg px-4 py-3 text-sm text-center font-medium mb-4">
              Screenshot and save your QR code. You can present it at the gym for membership verification.
            </div>

            <div className="text-center text-sm text-gray-400">
              Keep this confirmation screen available for five minutes.
              <div className="text-2xl font-black text-white mt-1 tabular-nums">{formatTime(remaining)} remaining</div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Email status ---- */}
      <div className="flex items-center gap-3 bg-[var(--brand-surface)] border border-[var(--brand-border)] rounded-xl p-4 text-sm">
        <Mail size={18} className="shrink-0 text-gray-400" />
        {emailState === 'sending' && <span className="text-gray-400">Sending confirmation email...</span>}
        {emailState === 'sent' && <span className="text-green-400">Confirmation email sent to your inbox.</span>}
        {emailState === 'failed' && (
          <span className="text-amber-400 flex-1">
            Your registration was saved, but we couldn't send the confirmation email. Please save your
            Member ID ({data.member_id}) or contact P-Fitness.
          </span>
        )}
        {emailState === 'failed' && (
          <button onClick={sendEmail} className="flex items-center gap-1 text-xs uppercase tracking-widest font-bold text-white border border-white/20 rounded px-3 py-1.5 hover:bg-white hover:text-black transition-colors shrink-0">
            <RotateCcw size={14} /> Retry
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 mt-8 flex items-center justify-center gap-2">
        <Camera size={14} /> This link is unique to your registration &mdash; save it or your confirmation email to recover this page anytime.
      </p>
    </PageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-gray-500 uppercase text-xs tracking-widest mb-1">{label}</dt>
      <dd className="font-bold">{children}</dd>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--brand-bg)] text-white font-sans">
      <SimpleHeader subtitle="Registration Confirmation" />
      <main className="max-w-xl mx-auto px-4 sm:px-6 py-10">{children}</main>
    </div>
  );
}
