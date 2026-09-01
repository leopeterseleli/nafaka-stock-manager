import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, HandCoins } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
import { FieldWrap } from "./stock-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { TZS, KG, fmtDate, today } from "@/lib/format";
import { printDocument } from "@/lib/exports";
import { OVERDUE_DAYS, buildCustomerLedger } from "@/lib/business";
import { useBrands, usePayments, useProfile, useSales } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/credit")({
  head: () => ({
    meta: [
      { title: "Customer Credit — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Track credit customers, payments, remaining balances and debts unpaid for more than 21 days.",
      },
      { property: "og:title", content: "Customer Credit — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Credit book with payment history and printable customer statements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreditPage,
});

function CreditPage() {
  const qc = useQueryClient();
  const { data: sales = [] } = useSales();
  const { data: payments = [] } = usePayments();
  const { data: brands = [] } = useBrands();
  const { data: profile } = useProfile();

  const customers = buildCustomerLedger(sales, payments);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState("");

  const addPayment = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      if (!name.trim()) throw new Error("Choose a customer");
      if (!(Number(amount) > 0)) throw new Error("Enter an amount");
      const { error } = await supabase.from("customer_payments").insert({
        user_id: userId,
        customer_name: name.trim(),
        amount: Number(amount),
        paid_on: paidOn,
        note: note || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setAmount("");
      setNote("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function statement(customerName: string) {
    const row = customers.find((c) => c.customer_name === customerName);
    if (!row) return;
    const pays = payments.filter((p) => p.customer_name.trim() === customerName);
    printDocument(
      `Statement ${customerName}`,
      `<h1>${profile?.shop_name ?? "Nafaka Shop"}</h1>
       <p class="muted">Customer statement / Taarifa ya mteja · ${fmtDate(today())}</p>
       <h2>${customerName}</h2>
       <h2>Credit sales</h2>
       <table><thead><tr><th>Date</th><th>Brand</th><th class="num">KG</th><th class="num">Amount</th><th class="num">Paid at sale</th></tr></thead><tbody>
       ${row.sales
         .map(
           (s) =>
             `<tr><td>${fmtDate(s.sale_date)}</td><td>${brands.find((b) => b.id === s.brand_id)?.name ?? ""}</td><td class="num">${Number(s.kg_sold)}</td><td class="num">${TZS(s.total_amount)}</td><td class="num">${TZS(s.amount_paid)}</td></tr>`,
         )
         .join("")}
       </tbody></table>
       <h2>Payments</h2>
       <table><thead><tr><th>Date</th><th>Note</th><th class="num">Amount</th></tr></thead><tbody>
       ${pays.map((p) => `<tr><td>${fmtDate(p.paid_on)}</td><td>${p.note ?? ""}</td><td class="num">${TZS(p.amount)}</td></tr>`).join("")}
       </tbody></table>
       <table><tbody>
         <tr><td>Total credit given</td><td class="num">${TZS(row.totalCredit)}</td></tr>
         <tr><td>Total payments</td><td class="num">${TZS(row.totalPaid)}</td></tr>
         <tr class="total"><td>Balance due / Deni</td><td class="num">${TZS(row.balance)}</td></tr>
       </tbody></table>`,
    );
  }

  return (
    <AppShell title="Credit / Mikopo" subtitle="Customer debts and payments">
      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Record payment" hint="Lipa deni">
          <div className="grid gap-3">
            <FieldWrap label="Customer / Mteja">
              <Input list="cust-list" value={name} onChange={(e) => setName(e.target.value)} />
              <datalist id="cust-list">
                {customers.map((c) => (
                  <option key={c.customer_name} value={c.customer_name} />
                ))}
              </datalist>
            </FieldWrap>
            <FieldWrap label="Amount (TZS)">
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label="Date">
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Note">
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </FieldWrap>
            <Button onClick={() => addPayment.mutate()} disabled={addPayment.isPending}>
              <HandCoins className="size-4" /> Save payment
            </Button>
          </div>
        </Panel>

        <Panel title="Credit book" hint={`Red = unpaid more than ${OVERDUE_DAYS} days`}>
          {customers.length === 0 ? (
            <Empty text="No credit sales yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase">
                    <th className="py-2">Customer</th>
                    <th className="py-2 text-right">Credit</th>
                    <th className="py-2 text-right">Paid</th>
                    <th className="py-2 text-right">Balance</th>
                    <th className="py-2 text-right">Age</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const flag = c.balance > 0 && c.daysOverdue > OVERDUE_DAYS;
                    return (
                      <tr
                        key={c.customer_name}
                        className={`border-t border-border ${flag ? "bg-destructive/5 text-destructive" : ""}`}
                      >
                        <td className="py-2 font-medium">{c.customer_name}</td>
                        <td className="py-2 text-right">{TZS(c.totalCredit)}</td>
                        <td className="py-2 text-right">{TZS(c.totalPaid)}</td>
                        <td className="py-2 text-right font-semibold">{TZS(c.balance)}</td>
                        <td className="py-2 text-right">
                          {c.balance > 0 ? `${c.daysOverdue}d` : "-"}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => statement(c.customer_name)}
                            className="text-muted-foreground hover:text-primary"
                            aria-label="Print statement"
                          >
                            <FileText className="size-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel className="mt-3" title="Payment history" hint="Malipo yote">
        {payments.length === 0 ? (
          <Empty text="No payments recorded." />
        ) : (
          <ul className="divide-y divide-border">
            {payments.slice(0, 30).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {p.customer_name}
                  {p.note ? <span className="text-muted-foreground"> · {p.note}</span> : null}
                </span>
                <span className="text-muted-foreground">
                  {fmtDate(p.paid_on)} · <strong className="text-foreground">{TZS(p.amount)}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="mt-3" title="Credit sales detail" hint="Mauzo ya mkopo">
        {sales.filter((s) => s.is_credit).length === 0 ? (
          <Empty text="No credit sales." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {sales
              .filter((s) => s.is_credit)
              .slice(0, 30)
              .map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <span>
                    {s.customer_name} · {brands.find((b) => b.id === s.brand_id)?.name} ·{" "}
                    {KG(s.kg_sold)}
                  </span>
                  <span className="text-muted-foreground">
                    {fmtDate(s.sale_date)} ·{" "}
                    <strong className="text-foreground">{TZS(s.total_amount)}</strong>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Panel>
    </AppShell>
  );
}
