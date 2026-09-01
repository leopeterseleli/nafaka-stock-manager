import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
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
import { inRange } from "@/lib/business";
import { useCashTxns, useExpenses, useSales, useStockClosures } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/cashflow")({
  head: () => ({
    meta: [
      { title: "Cash Flow & Income — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Record revenues, expenses, loans and owner capital. Cash in, cash out and net position are calculated automatically in TZS.",
      },
      { property: "og:title", content: "Cash Flow & Income — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Track money in and out of your nafaka business with automatic totals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CashFlow,
});

const KINDS = [
  { value: "revenue", label: "Revenue / Mapato", flow: 1 },
  { value: "loan_in", label: "Loan received (institution or person) / Mkopo", flow: 1 },
  { value: "capital", label: "Owner capital / Mtaji", flow: 1 },
  { value: "expense", label: "Expense / Matumizi", flow: -1 },
  { value: "loan_repayment", label: "Loan repayment / Marejesho ya mkopo", flow: -1 },
  { value: "drawing", label: "Owner drawing / Matumizi binafsi", flow: -1 },
] as const;

const LOAN_SOURCES = [
  "bank",
  "microfinance",
  "sacco",
  "mobile loan",
  "individual lender",
  "family",
  "friend",
  "other",
];

const CATEGORIES: Record<string, string[]> = {
  revenue: ["sales", "commission", "transport charge", "other"],
  loan_in: LOAN_SOURCES,
  capital: ["cash injection", "other"],
  expense: ["rent", "fuel", "salaries", "electricity", "transport", "offloading", "other"],
  loan_repayment: LOAN_SOURCES,
  drawing: ["personal", "other"],
};


const flowOf = (kind: string) => KINDS.find((k) => k.value === kind)?.flow ?? 1;

function CashFlow() {
  const qc = useQueryClient();
  const { data: txns = [] } = useCashTxns();
  const { data: sales = [] } = useSales();
  const { data: expenses = [] } = useExpenses();
  const { data: closures = [] } = useStockClosures();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [kind, setKind] = useState<string>("revenue");
  const [category, setCategory] = useState("sales");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      if (!(Number(amount) > 0)) throw new Error("Enter an amount");
      const { error } = await supabase.from("cash_transactions").insert({
        user_id: userId,
        kind,
        category,
        amount: Number(amount),
        txn_date: date,
        note: note || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Recorded");
      setAmount("");
      setNote("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cash_transactions").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () => txns.filter((t) => inRange(t.txn_date, from, to)),
    [txns, from, to],
  );

  const totals = useMemo(() => {
    const by = (k: string) =>
      filtered.filter((t) => t.kind === k).reduce((a, t) => a + Number(t.amount), 0);
    const cashIn = filtered
      .filter((t) => flowOf(t.kind) > 0)
      .reduce((a, t) => a + Number(t.amount), 0);
    const cashOut = filtered
      .filter((t) => flowOf(t.kind) < 0)
      .reduce((a, t) => a + Number(t.amount), 0);

    const rangeSales = sales.filter((s) => inRange(s.sale_date, from, to));
    const commission = rangeSales.reduce((a, s) => a + Number(s.commission_amount), 0);
    const extra = rangeSales.reduce((a, s) => a + Number(s.extra_profit), 0);
    const shopExpenses = expenses
      .filter((e) => inRange(e.expense_date, from, to))
      .reduce((a, e) => a + Number(e.amount), 0);
    const sampleLoss = closures
      .filter((c) => inRange(c.closed_on, from, to))
      .reduce((a, c) => a + Number(c.loss_cost), 0);

    return {
      cashIn,
      cashOut,
      net: cashIn - cashOut,
      loansIn: by("loan_in"),
      loansRepaid: by("loan_repayment"),
      loansOutstanding: by("loan_in") - by("loan_repayment"),

      commission,
      extra,
      shopExpenses,
      sampleLoss,
      income: commission + extra + by("revenue"),
      netIncome:
        commission + extra + by("revenue") - shopExpenses - by("expense") - sampleLoss,
    };
  }, [filtered, sales, expenses, closures, from, to]);

  const loanRows = useMemo(() => {
    const map = new Map<string, { source: string; received: number; repaid: number; balance: number }>();
    for (const t of filtered) {
      if (t.kind !== "loan_in" && t.kind !== "loan_repayment") continue;
      const source = t.category || "other";
      const row = map.get(source) ?? { source, received: 0, repaid: 0, balance: 0 };
      if (t.kind === "loan_in") row.received += Number(t.amount);
      else row.repaid += Number(t.amount);
      row.balance = row.received - row.repaid;
      map.set(source, row);
    }
    return [...map.values()].sort((a, b) => b.balance - a.balance);
  }, [filtered]);


  return (
    <AppShell title="Cash Flow / Mtiririko wa Fedha" subtitle="Revenues, expenses, loans and income">
      <Panel title="Filter" hint="Chuja kwa tarehe">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldWrap label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FieldWrap>
        </div>
      </Panel>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cash in / Fedha zilizoingia" value={TZS(totals.cashIn)} tone="success" />
        <Stat label="Cash out / Fedha zilizotoka" value={TZS(totals.cashOut)} tone="destructive" />
        <Stat label="Net cash flow" value={TZS(totals.net)} />
        <Stat label="Loans outstanding" value={TZS(totals.loansOutstanding)} tone="destructive" />
      </div>

      <Panel className="mt-3" title="Loans / Mikopo" hint="Taasisi za fedha na watu binafsi">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Loans received" value={TZS(totals.loansIn)} tone="success" />
          <Stat label="Loans repaid" value={TZS(totals.loansRepaid)} tone="destructive" />
          <Stat label="Balance owed" value={TZS(totals.loansOutstanding)} />
        </div>
        {loanRows.length === 0 ? (
          <Empty text="No loans recorded yet." />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Source</th>
                  <th className="py-2 text-right">Received</th>
                  <th className="py-2 text-right">Repaid</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loanRows.map((r) => (
                  <tr key={r.source} className="border-t border-border">
                    <td className="py-2 capitalize">{r.source}</td>
                    <td className="py-2 text-right">{TZS(r.received)}</td>
                    <td className="py-2 text-right">{TZS(r.repaid)}</td>
                    <td
                      className={`py-2 text-right font-semibold ${
                        r.balance > 0 ? "text-destructive" : "text-success"
                      }`}
                    >
                      {TZS(r.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Record money" hint="Ingiza mapato au matumizi">

          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label="Type / Aina">
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v);
                  setCategory(CATEGORIES[v]?.[0] ?? "other");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
            <FieldWrap label="Category">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(CATEGORIES[kind] ?? ["other"]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Note">
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </FieldWrap>
          </div>
          <Button className="mt-3" onClick={() => add.mutate()} disabled={add.isPending}>
            <Plus className="size-4" /> Record
          </Button>
        </Panel>

        <Panel title="Income statement" hint="Hesabu ya faida (auto)">
          <ul className="divide-y divide-border text-sm">
            <LineItem label="Commission earned" value={TZS(totals.commission)} />
            <LineItem label="Extra profit" value={TZS(totals.extra)} />
            <LineItem label="Other recorded revenue" value={TZS(totals.income - totals.commission - totals.extra)} />
            <LineItem label="Shop expenses" value={`- ${TZS(totals.shopExpenses)}`} />
            <LineItem
              label="Cash-book expenses"
              value={`- ${TZS(filteredExpense(filtered))}`}
            />
            <LineItem label="Sample loss (owner)" value={`- ${TZS(totals.sampleLoss)}`} />
            <li className="flex justify-between py-2 font-semibold">
              <span>Net income / Faida halisi</span>
              <span className={totals.netIncome >= 0 ? "text-success" : "text-destructive"}>
                {TZS(totals.netIncome)}
              </span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel className="mt-3" title="Cash book" hint="Daftari la fedha">
        {filtered.length === 0 ? (
          <Empty text="No cash entries yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Date</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Category</th>
                  <th className="py-2">Note</th>
                  <th className="py-2 text-right">Amount</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-2">{fmtDate(t.txn_date)}</td>
                    <td className="py-2">
                      {KINDS.find((k) => k.value === t.kind)?.label ?? t.kind}
                    </td>
                    <td className="py-2 capitalize">{t.category}</td>
                    <td className="py-2 text-muted-foreground">{t.note ?? "-"}</td>
                    <td
                      className={`py-2 text-right font-semibold ${
                        flowOf(t.kind) > 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {flowOf(t.kind) > 0 ? "+" : "-"} {TZS(t.amount)}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => remove.mutate(t.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete entry"
                      >
                        <Trash2 className="size-4" />
                      </button>
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

function filteredExpense(rows: Array<{ kind: string; amount: number }>) {
  return rows
    .filter((t) => t.kind === "expense" || t.kind === "drawing")
    .reduce((a, t) => a + Number(t.amount), 0);
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex justify-between py-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          tone === "success" ? "text-success" : tone === "destructive" ? "text-destructive" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
