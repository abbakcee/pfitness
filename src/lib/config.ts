/**
 * Frontend copy of the membership plans, kept in sync with the
 * `plan_price()` function in supabase/migrations/0002_functions.sql.
 *
 * IMPORTANT: this is for DISPLAY only. The actual price charged and
 * the actual DEMO_MODE behavior are decided server-side (Postgres),
 * so a modified/replayed request from the browser can never change
 * the price or bypass demo/real-mode logic.
 */

export type PlanKey = '1_month' | '3_months' | '1_year';

export interface PlanDefinition {
  key: PlanKey;
  label: string;
  price: number; // NGN
  durationLabel: string;
}

export const MEMBERSHIP_PLANS: Record<PlanKey, PlanDefinition> = {
  '1_month': { key: '1_month', label: '1 Month', price: 30000, durationLabel: 'Per Month' },
  '3_months': { key: '3_months', label: '3 Months', price: 80000, durationLabel: 'Quarterly' },
  '1_year': { key: '1_year', label: '1 Year', price: 140000, durationLabel: 'Per Year' },
};

export const PLAN_ORDER: PlanKey[] = ['1_month', '3_months', '1_year'];

export const WHATSAPP_NUMBER = '2347069931000';
export const WHATSAPP_BASE_URL = `https://wa.me/${WHATSAPP_NUMBER}`;

export function whatsappRegisterLink(plan?: PlanKey) {
  const base = 'Hello P-Fitness, I would like to register for a gym membership.';
  const withPlan = plan ? `${base} I am interested in the ${MEMBERSHIP_PLANS[plan].label} plan.` : base;
  return `${WHATSAPP_BASE_URL}?text=${encodeURIComponent(withPlan)}`;
}

export function formatNaira(amount: number) {
  return `\u20A6${amount.toLocaleString('en-NG')}`;
}

// Display-only hint shown in the UI (e.g. a small "Demo Mode" badge).
// The database's app_settings.demo_mode row is the real switch.
export const DEMO_MODE_DISPLAY_HINT = true;

export const CONFIRMATION_SCREEN_SECONDS = 5 * 60; // five minutes

/**
 * Formats a Postgres date-only value ("YYYY-MM-DD", e.g. start_date/end_date)
 * for display, WITHOUT letting the browser's local timezone shift the day.
 *
 * `new Date("2026-09-09")` parses as UTC midnight; formatting that with
 * `toLocaleDateString` then renders it in the viewer's local timezone, which
 * rolls the calendar day back by one for any timezone behind UTC. Since these
 * fields have no time component in the database, we parse the Y/M/D parts
 * ourselves and format in UTC so the displayed date always matches the
 * database's calendar date, everywhere.
 */
export function formatCalendarDate(value: string | null | undefined, fallback = 'N/A') {
  if (!value) return fallback;
  const [year, month, day] = value.split('T')[0].split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}
