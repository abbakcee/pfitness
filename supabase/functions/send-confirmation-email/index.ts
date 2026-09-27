// Supabase Edge Function: send-confirmation-email
//
// Called from the frontend as:
//   supabase.functions.invoke('send-confirmation-email', { body: { confirmation_token } })
//
// Secrets used here (set with `supabase secrets set ...`, NEVER in frontend code):
//   RESEND_API_KEY
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase injects this automatically for edge functions)
//   SUPABASE_URL               (also auto-injected)
//
// This function looks the member up itself (by token) rather than trusting
// whatever the client sends about the member, so a caller can't ask us to
// email arbitrary content to arbitrary addresses.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FROM_ADDRESS = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'P-Fitness <onboarding@resend.dev>';
const SITE_URL = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://pfitness-website.vercel.app';

const PLAN_LABELS: Record<string, string> = {
  '1_month': '1 Month',
  '3_months': '3 Months',
  '1_year': '1 Year',
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const { confirmation_token } = await req.json();
    if (!confirmation_token || typeof confirmation_token !== 'string') {
      return new Response(JSON.stringify({ error: 'missing_token' }), {
        status: 400,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: member, error } = await admin
      .from('members')
      .select('member_id, full_name, email, membership_plan, payment_status, membership_status, registration_date, start_date, end_date, confirmation_token')
      .eq('confirmation_token', confirmation_token)
      .single();

    if (error || !member) {
      return new Response(JSON.stringify({ error: 'not_found' }), {
        status: 404,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      // Fail honestly instead of pretending we sent an email.
      return new Response(
        JSON.stringify({ error: 'email_not_configured', message: 'RESEND_API_KEY is not set for this Supabase project.' }),
        { status: 503, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }

    const recoveryLink = `${SITE_URL}/registration/confirmation/${member.confirmation_token}`;
    const planLabel = PLAN_LABELS[member.membership_plan] ?? member.membership_plan;

    const html = `
      <div style="font-family:Arial,sans-serif;background:#0B0B0B;color:#fff;padding:32px;">
        <h1 style="color:#C1121F;text-transform:uppercase;letter-spacing:1px;">P-Fitness Registration Confirmation</h1>
        <p>Hi ${escapeHtml(member.full_name)},</p>
        <p>Thanks for registering with P-Fitness. Here are your membership details:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 0;color:#999;">Member ID</td><td style="padding:6px 0;font-weight:bold;">${member.member_id}</td></tr>
          <tr><td style="padding:6px 0;color:#999;">Plan</td><td style="padding:6px 0;">${planLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#999;">Registration Date</td><td style="padding:6px 0;">${formatDate(member.registration_date)}</td></tr>
          <tr><td style="padding:6px 0;color:#999;">Status</td><td style="padding:6px 0;">${member.membership_status}</td></tr>
          <tr><td style="padding:6px 0;color:#999;">Start Date</td><td style="padding:6px 0;">${member.start_date ?? 'Confirmed at gym'}</td></tr>
          <tr><td style="padding:6px 0;color:#999;">End Date</td><td style="padding:6px 0;">${member.end_date ?? 'Calculated once payment is confirmed'}</td></tr>
        </table>
        <p>Please save this email. If your confirmation screen closed or your device restarted,
           you can recover your registration and QR code any time at:</p>
        <p><a href="${recoveryLink}" style="color:#C1121F;">${recoveryLink}</a></p>
        <p style="color:#999;font-size:13px;margin-top:32px;">P-Fitness &mdash; One More Rep.</p>
      </div>
    `;

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [member.email],
        subject: 'Your P-Fitness Membership Confirmation',
        html,
      }),
    });

    if (!resendResp.ok) {
      const errBody = await resendResp.text();
      return new Response(JSON.stringify({ error: 'resend_failed', detail: errBody }), {
        status: 502,
        headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ status: 'sent' }), {
      status: 200,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unexpected', detail: String(e) }), {
      status: 500,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });
  }
});

function formatDate(d: string | null) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
