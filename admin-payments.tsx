import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
import { StatusPill } from "./billing";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TZS, fmtDate } from "@/lib/format";
import { extendedPaidUntil, type PaymentSubmission, type Subscription } from "@/lib/billing";
import { useIsAdmin } from "@/lib/billing-queries";

export const Route = createFileRoute("/_authenticated/admin-payments")({
  head: () => ({
    meta: [
      { title: "Approve payments — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Admin review of monthly subscription payments submitted by shops through M-Pesa or bank transfer.",
      },
      { property: "og:title", content: "Approve payments — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Review and approve shop subscription payments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPaymentsPage,
});

function AdminPaymentsPage() {
  const qc = useQueryClient();
  const { data: isAdmin, isLoading } = useIsAdmin();

  const { data: rows = [] } = useQuery({
    queryKey: ["admin-payments"],
    enabled: !!isAdmin,
    queryFn: async (): Promise<PaymentSubmission[]> => {
      const { data, error } = await supabase
        .from("payment_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as PaymentSubmission[];
    },
  });

  const review = useMutation({
    mutationFn: async ({ row, approve }: { row: PaymentSubmission; approve: boolean }) => {
      const { data: me } = await supabase.auth.getUser();
      if (approve) {
        const { data: sub, error: sErr } = await supabase
          .from("subscriptions")
          .select("user_id, trial_ends_at, paid_until")
          .eq("user_id", row.user_id)
          .maybeSingle();
        if (sErr) throw new Error(sErr.message);
        if (!sub) throw new Error("Shop has no subscription record yet.");
        const { error: uErr } = await supabase
          .from("subscriptions")
          .update({ paid_until: extendedPaidUntil(sub as Subscription, row.months) })
          .eq("user_id", row.user_id);
        if (uErr) throw new Error(uErr.message);
      }
      const { error } = await supabase
        .from("payment_submissions")
        .update({
          status: approve ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: me.user?.id ?? null,
        })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Payment updated");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return null;

  if (!isAdmin) {
    return (
      <AppShell title="Approve payments" subtitle="Admin only">
        <Panel title="No access" hint="Hauna ruhusa">
          <Empty text="This page is only for the app administrator." />
        </Panel>
      </AppShell>
    );
  }

  const pending = rows.filter((r) => r.status === "pending");
  const done = rows.filter((r) => r.status !== "pending");

  return (
    <AppShell title="Approve payments / Thibitisha malipo" subtitle="Subscription payments from shops">
      <Panel title="Pending" hint={`${pending.length} waiting`}>
        {pending.length === 0 ? (
          <Empty text="No pending payments." />
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      {r.payer_name ?? "Unnamed"} — {TZS(r.amount)} ({r.months} month
                      {r.months > 1 ? "s" : ""})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.method.toUpperCase()} · ref {r.reference} · {fmtDate(r.created_at)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">shop id: {r.user_id.slice(0, 8)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review.mutate({ row: r, approve: true })}>
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => review.mutate({ row: r, approve: false })}
                    >
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel className="mt-3" title="Reviewed" hint="Yaliyoshughulikiwa">
        {done.length === 0 ? (
          <Empty text="Nothing reviewed yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Date</th>
                  <th className="py-2">Payer</th>
                  <th className="py-2">Reference</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {done.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2">{fmtDate(r.reviewed_at ?? r.created_at)}</td>
                    <td className="py-2">{r.payer_name ?? "-"}</td>
                    <td className="py-2">{r.reference}</td>
                    <td className="py-2 text-right">{TZS(r.amount)}</td>
                    <td className="py-2 text-right">
                      <StatusPill status={r.status} />
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
