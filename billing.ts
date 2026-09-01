export const MONTHLY_PRICE = 30000;
export const TRIAL_DAYS = 14;

export type Subscription = {
  user_id: string;
  trial_ends_at: string;
  paid_until: string | null;
};

export type PaymentSubmission = {
  id: string;
  user_id: string;
  amount: number;
  months: number;
  method: string;
  reference: string;
  payer_name: string | null;
  note: string | null;
  status: string;
  reviewed_at: string | null;
  created_at: string;
};

export type PaymentMethod = {
  id: string;
  label: string;
  details: string;
  kind: string;
  active: boolean;
  sort_order: number;
};

export type BillingState = "trial" | "active" | "expired" | "none";

export type BillingStatus = {
  state: BillingState;
  active: boolean;
  expiresAt: Date | null;
  daysLeft: number;
};

export function billingStatus(sub: Subscription | null | undefined): BillingStatus {
  if (!sub) return { state: "none", active: false, expiresAt: null, daysLeft: 0 };
  const now = Date.now();
  const paid = sub.paid_until ? new Date(sub.paid_until) : null;
  const trial = new Date(sub.trial_ends_at);
  const best = paid && paid.getTime() > trial.getTime() ? paid : trial;
  const active = best.getTime() > now;
  const daysLeft = Math.max(0, Math.ceil((best.getTime() - now) / 86_400_000));
  const state: BillingState = !active
    ? "expired"
    : paid && paid.getTime() > now
      ? "active"
      : "trial";
  return { state, active, expiresAt: best, daysLeft };
}

/** New paid_until when an admin approves `months` of payment. */
export function extendedPaidUntil(sub: Subscription, months: number): string {
  const now = new Date();
  const current = sub.paid_until ? new Date(sub.paid_until) : null;
  const trial = new Date(sub.trial_ends_at);
  const base = [now, current, trial]
    .filter(Boolean)
    .reduce<Date>((a, b) => (b! > a ? (b as Date) : a), now);
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next.toISOString();
}
