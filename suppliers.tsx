import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
import { PriceLevelBreakdown } from "@/components/PriceLevelBreakdown";
import { FieldWrap } from "./stock-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { TZS, fmtDate, today } from "@/lib/format";
import { printDocument } from "@/lib/exports";
import {
  useBrands,
  useProfile,
  useSales,
  useSupplierTxns,
  useSuppliers,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "Supplier Ledger — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Per-supplier cash flow: money received from sales, payments made, transport and offloading costs, and the running balance.",
      },
      { property: "og:title", content: "Supplier Ledger — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Know exactly how much you owe each nafaka supplier.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuppliersPage,
});

const TXN_TYPES = [
  { value: "payment", label: "Payment to supplier / Malipo" },
  { value: "transport", label: "Transport cost / Usafiri" },
  { value: "offloading", label: "Offloading cost / Upakuaji" },
  { value: "other", label: "Other expense / Nyingine" },
];

function SuppliersPage() {
  const qc = useQueryClient();
  const { data: suppliers = [] } = useSuppliers();
  const { data: brands = [] } = useBrands();
  const { data: sales = [] } = useSales();
  const { data: txns = [] } = useSupplierTxns();
  const { data: profile } = useProfile();

  const [supplierId, setSupplierId] = useState("");
  const [txnType, setTxnType] = useState("payment");
  const [amount, setAmount] = useState("");
  const [txnDate, setTxnDate] = useState(today());
  const [note, setNote] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const salesForSupplier = (sid: string) => {
    const ids = brands.filter((b) => b.supplier_id === sid).map((b) => b.id);
    return sales.filter((s) => ids.includes(s.brand_id));
  };

  const ledger = suppliers.map((s) => {
    const ss = salesForSupplier(s.id);
    const received = ss.reduce((a, x) => a + Number(x.supplier_amount), 0);
    const t = txns.filter((x) => x.supplier_id === s.id);
    const paid = t
      .filter((x) => x.txn_type === "payment")
      .reduce((a, x) => a + Number(x.amount), 0);
    const costs = t
      .filter((x) => x.txn_type !== "payment")
      .reduce((a, x) => a + Number(x.amount), 0);
    return { supplier: s, received, paid, costs, balance: received - paid - costs, txns: t, sales: ss };
  });

  const addTxn = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      if (!supplierId) throw new Error("Choose a supplier");
      if (!(Number(amount) > 0)) throw new Error("Enter an amount");
      const { error } = await supabase.from("supplier_transactions").insert({
        user_id: userId,
        supplier_id: supplierId,
        txn_type: txnType,
        amount: Number(amount),
        txn_date: txnDate,
        note: note || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Transaction saved");
      setAmount("");
      setNote("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSupplier = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      if (!newSupplier.trim()) throw new Error("Enter a supplier name");
      const { error } = await supabase
        .from("suppliers")
        .insert({ user_id: userId, name: newSupplier.trim(), phone: newPhone || null });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Supplier added");
      setNewSupplier("");
      setNewPhone("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function statement(sid: string) {
    const row = ledger.find((l) => l.supplier.id === sid);
    if (!row) return;
    printDocument(
      `Supplier statement ${row.supplier.name}`,
      `<h1>${profile?.shop_name ?? "Nafaka Shop"}</h1>
       <p class="muted">Supplier statement / Taarifa ya msambazaji · ${fmtDate(today())}</p>
       <h2>${row.supplier.name}</h2>
       <h2>Sales collected on their behalf</h2>
       <table><thead><tr><th>Date</th><th>Brand</th><th class="num">KG</th><th class="num">Supplier amount</th></tr></thead><tbody>
       ${row.sales
         .map(
           (s) =>
             `<tr><td>${fmtDate(s.sale_date)}</td><td>${brands.find((b) => b.id === s.brand_id)?.name ?? ""}</td><td class="num">${Number(s.kg_sold)}</td><td class="num">${TZS(s.supplier_amount)}</td></tr>`,
         )
         .join("")}
       </tbody></table>
       <h2>Payments & costs</h2>
       <table><thead><tr><th>Date</th><th>Type</th><th>Note</th><th class="num">Amount</th></tr></thead><tbody>
       ${row.txns.map((t) => `<tr><td>${fmtDate(t.txn_date)}</td><td>${t.txn_type}</td><td>${t.note ?? ""}</td><td class="num">${TZS(t.amount)}</td></tr>`).join("")}
       </tbody></table>
       <table><tbody>
         <tr><td>Money received from sales</td><td class="num">${TZS(row.received)}</td></tr>
         <tr><td>Paid to supplier</td><td class="num">${TZS(row.paid)}</td></tr>
         <tr><td>Transport / offloading / other</td><td class="num">${TZS(row.costs)}</td></tr>
         <tr class="total"><td>Balance owed to supplier</td><td class="num">${TZS(row.balance)}</td></tr>
       </tbody></table>`,
    );
  }

  return (
    <AppShell title="Suppliers / Wasambazaji" subtitle="Cash flow and running balances">
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Record transaction" hint="Malipo au gharama">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label="Supplier">
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
            <FieldWrap label="Type">
              <Select value={txnType} onValueChange={setTxnType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TXN_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
            <FieldWrap label="Amount (TZS)">
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label="Date">
              <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
            </FieldWrap>
            <div className="sm:col-span-2">
              <FieldWrap label="Note">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </FieldWrap>
            </div>
          </div>
          <Button className="mt-3 w-full" onClick={() => addTxn.mutate()} disabled={addTxn.isPending}>
            Save transaction
          </Button>
        </Panel>

        <Panel title="Add supplier" hint="Ongeza msambazaji">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label="Name">
              <Input value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Phone">
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
            </FieldWrap>
          </div>
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => addSupplier.mutate()}
            disabled={addSupplier.isPending}
          >
            <Plus className="size-4" /> Add supplier
          </Button>
        </Panel>
      </div>

      <Panel className="mt-3" title="Supplier balances" hint="Salio la kila msambazaji">
        {ledger.length === 0 ? (
          <Empty text="No suppliers yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Supplier</th>
                  <th className="py-2 text-right">Received</th>
                  <th className="py-2 text-right">Paid</th>
                  <th className="py-2 text-right">Costs</th>
                  <th className="py-2 text-right">Balance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.supplier.id} className="border-t border-border">
                    <td className="py-2 font-medium">{l.supplier.name}</td>
                    <td className="py-2 text-right">{TZS(l.received)}</td>
                    <td className="py-2 text-right">{TZS(l.paid)}</td>
                    <td className="py-2 text-right">{TZS(l.costs)}</td>
                    <td
                      className={`py-2 text-right font-semibold ${l.balance > 0 ? "text-destructive" : "text-success"}`}
                    >
                      {TZS(Math.abs(l.balance))}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        {l.balance > 0 ? "we owe" : "settled"}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => statement(l.supplier.id)}
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Print statement"
                      >
                        <FileText className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        className="mt-3"
        title="Sold quantity & income per price level"
        hint="Kiasi na mapato kwa kila bei"
      >
        <PriceLevelBreakdown supplierId={supplierId || undefined} />
      </Panel>

      <Panel className="mt-3" title="Transaction history" hint="Miamala">
        {txns.length === 0 ? (
          <Empty text="No transactions." />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {txns.slice(0, 40).map((t) => (
              <li key={t.id} className="flex justify-between py-2">
                <span>
                  {suppliers.find((s) => s.id === t.supplier_id)?.name} ·{" "}
                  <span className="text-muted-foreground">{t.txn_type}</span>
                  {t.note ? <span className="text-muted-foreground"> · {t.note}</span> : null}
                </span>
                <span className="text-muted-foreground">
                  {fmtDate(t.txn_date)} ·{" "}
                  <strong className="text-foreground">{TZS(t.amount)}</strong>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </AppShell>
  );
}
