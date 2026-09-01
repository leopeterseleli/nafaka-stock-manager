import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Clock, Send, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
import { FieldWrap } from "./stock-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { TZS, fmtDate } from "@/lib/format";
import { MONTHLY_PRICE, TRIAL_DAYS, billingStatus } from "@/lib/billing";
import { useMyPayments, usePaymentMethods, useSubscription } from "@/lib/billing-queries";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Subscription — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "14-day free trial, then 30,000 TZS each month. Pay by M-Pesa or bank transfer and submit your reference for approval.",
      },
      { property: "og:title", content: "Subscription — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Monthly plan for Tanzanian nafaka shops: 14 days free, then 30,000 TZS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const qc = useQueryClient();
  const { data: sub } = useSubscription();
  const { data: methods = [] } = usePaymentMethods();
  const { data: payments = [] } = useMyPayments();
  const status = billingStatus(sub);

  const [method, setMethod] = useState("bank");
  const [reference, setReference] = useState("");
  const [payerName, setPayerName] = useState("");
  const [months, setMonths] = useState("1");

  const submit = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      const m = Math.max(1, Number(months) || 1);
      const { error } = await supabase.from("payment_submissions").insert({
        user_id: uid!,
        method,
        reference: reference.trim(),
        payer_name: payerName.trim() || null,
        months: m,
        amount: m * MONTHLY_PRICE,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setReference("");
      toast.success("Payment sent for approval / Malipo yamewasilishwa");
      qc.invalidateQueries({ queryKey: ["my-payments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Subscription / Malipo ya mwezi" subtitle="14 days free, then 30,000 TZS a month">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Your plan" hint="Mpango wako">
          <div className="flex items-start gap-3">
            <div
              className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                status.active ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive"
              }`}
            >
              {status.state === "active" ? (
                <BadgeCheck className="size-5" />
              ) : status.state === "trial" ? (
                <Clock className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>
            <div>
              <p className="text-base font-semibold">
                {status.state === "active"
                  ? "Monthly plan active"
                  : status.state === "trial"
                    ? `Free trial (${TRIAL_DAYS} days)`
                    : "Subscription expired"}
              </p>
              <p className="text-sm text-muted-foreground">
                {status.expiresAt
                  ? status.active
                    ? `${status.daysLeft} day(s) left — until ${fmtDate(status.expiresAt.toISOString())}`
                    : `Ended ${fmtDate(status.expiresAt.toISOString())}`
                  : "-"}
              </p>
              <p className="mt-2 text-sm">
                Price / Bei: <span className="font-semibold">{TZS(MONTHLY_PRICE)}</span> kwa mwezi
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Where to pay" hint="Namna ya kulipa">
          {methods.length === 0 ? (
            <Empty text="No payment details published yet." />
          ) : (
            <ul className="space-y-3 text-sm">
              {methods.map((m) => (
                <li key={m.id} className="rounded-xl border border-border p-3">
                  <p className="font-semibold">{m.label}</p>
                  <pre className="mt-1 font-sans text-xs whitespace-pre-wrap text-muted-foreground">
                    {m.details}
                  </pre>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            After paying, submit the transaction reference below. Access opens once it is approved.
          </p>
        </Panel>
      </div>

      <Panel className="mt-3" title="Submit payment" hint="Tuma uthibitisho wa malipo">
        <div className="grid gap-3 sm:grid-cols-4">
          <FieldWrap label="Method / Njia">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="bank">Bank / Benki</option>
              <option value="mpesa">M-Pesa</option>
              <option value="other">Other / Nyingine</option>
            </select>
          </FieldWrap>
          <FieldWrap label="Months / Miezi">
            <Input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Reference / Namba ya muamala">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Payer name / Jina la mlipaji">
            <Input value={payerName} onChange={(e) => setPayerName(e.target.value)} />
          </FieldWrap>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Amount / Kiasi: {TZS((Number(months) || 1) * MONTHLY_PRICE)}
        </p>
        <Button
          className="mt-3"
          onClick={() => submit.mutate()}
          disabled={reference.trim().length < 4 || submit.isPending}
        >
          <Send className="size-4" /> Send for approval
        </Button>
      </Panel>

      <Panel className="mt-3" title="Payment history" hint="Historia ya malipo">
        {payments.length === 0 ? (
          <Empty text="No payments submitted yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Date</th>
                  <th className="py-2">Method</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-border">
                    <td className="py-2">{fmtDate(p.created_at)}</td>
                    <td className="py-2 uppercase">{p.method}</td>
                    <td className="py-2">{p.reference}</td>
                    <td className="py-2 text-right">{TZS(p.amount)}</td>
                    <td className="py-2 text-right">
                      <StatusPill status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </AppShell>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-primary/10 text-primary"
      : status === "rejected"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${cls}`}>{status}</span>;
}
