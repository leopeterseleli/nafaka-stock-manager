import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, PackageX, TrendingUp, Coins, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TZS, KG, fmtDate, daysBetween } from "@/lib/format";
import { AGING_DAYS, OVERDUE_DAYS, buildCustomerLedger } from "@/lib/business";
import {
  useBrands,
  useExpenses,
  usePayments,
  useProfile,
  useSales,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Live view of stock levels, commission, extra profit, expenses and overdue credit customers.",
      },
      { property: "og:title", content: "Dashboard — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Stock, commission, profit and credit at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: profile } = useProfile();
  const { data: brands = [] } = useBrands();
  const { data: sales = [] } = useSales();
  const { data: payments = [] } = usePayments();
  const { data: expenses = [] } = useExpenses();

  const commission = sales.reduce((a, s) => a + Number(s.commission_amount), 0);
  const extraProfit = sales.reduce((a, s) => a + Number(s.extra_profit), 0);
  const supplierAmount = sales.reduce((a, s) => a + Number(s.supplier_amount), 0);
  const totalExpenses = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const netProfit = commission + extraProfit - totalExpenses;
  const stockKg = brands.reduce((a, b) => a + Number(b.current_kg), 0);
  const stockValue = brands.reduce((a, b) => a + Number(b.current_kg) * Number(b.selling_price), 0);

  const outOfStock = brands.filter((b) => Number(b.current_kg) <= 0);
  const aging = brands.filter(
    (b) =>
      Number(b.current_kg) > 0 &&
      b.last_stock_in_date &&
      daysBetween(b.last_stock_in_date) > AGING_DAYS,
  );
  const customers = buildCustomerLedger(sales, payments);
  const overdue = customers.filter((c) => c.balance > 0 && c.daysOverdue > OVERDUE_DAYS);
  const owing = customers.filter((c) => c.balance > 0);

  return (
    <AppShell
      title={profile?.shop_name ?? "Dashboard"}
      subtitle="Muhtasari wa biashara — business overview"
      actions={
        <Button asChild size="sm">
          <Link to="/stock-out">New sale</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Stock in hand / Hisa" value={KG(stockKg)} sub={TZS(stockValue)} icon={Wallet} />
        <Stat label="Commission / Kamisheni" value={TZS(commission)} icon={Coins} tone="accent" />
        <Stat label="Extra profit / Faida ya ziada" value={TZS(extraProfit)} icon={TrendingUp} />
        <Stat
          label="Net profit / Faida halisi"
          value={TZS(netProfit)}
          sub={`Expenses ${TZS(totalExpenses)}`}
          icon={TrendingUp}
          tone={netProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Supplier money held" hint="Money belonging to suppliers from sales">
          <p className="text-2xl font-bold">{TZS(supplierAmount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Keep this separate from your commission and profit.
          </p>
        </Panel>
        <Panel title="Customer debt / Madeni" hint={`${owing.length} customers owing`}>
          <p className="text-2xl font-bold">
            {TZS(owing.reduce((a, c) => a + c.balance, 0))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {overdue.length} overdue more than {OVERDUE_DAYS} days.
          </p>
        </Panel>
      </div>

      {overdue.length > 0 && (
        <Panel
          className="mt-3 border-destructive/40"
          title="Red flag — overdue debts"
          hint={`Unpaid over ${OVERDUE_DAYS} days`}
        >
          <ul className="divide-y divide-border">
            {overdue.map((c) => (
              <li key={c.customer_name} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-destructive">{c.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Since {fmtDate(c.oldestUnpaid)} · {c.daysOverdue} days
                  </p>
                </div>
                <span className="font-semibold text-destructive">{TZS(c.balance)}</span>
              </li>
            ))}
          </ul>
          <Button asChild size="sm" variant="outline" className="mt-3">
            <Link to="/credit">Open credit book</Link>
          </Button>
        </Panel>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Out of stock / Hakuna hisa" hint={`${outOfStock.length} brands`}>
          {outOfStock.length === 0 ? (
            <Empty text="All brands have stock." />
          ) : (
            <ul className="space-y-2">
              {outOfStock.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <PackageX className="size-4 text-destructive" />
                    {b.name}
                  </span>
                  <Badge variant="destructive">
                    Sample loss {KG(b.total_sample_loss_kg)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Aging stock" hint={`Last stock-in over ${AGING_DAYS} days ago`}>
          {aging.length === 0 ? (
            <Empty text="No aging stock." />
          ) : (
            <ul className="space-y-2">
              {aging.map((b) => (
                <li key={b.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Clock className="size-4 text-warning" />
                    {b.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {KG(b.current_kg)} since {fmtDate(b.last_stock_in_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mt-3" title="Stock by brand" hint="Hisa kwa kila chapa">
        {brands.length === 0 ? (
          <Empty text="No brands yet — record a Goods Received Note first." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Brand</th>
                  <th className="py-2 text-right">Stock</th>
                  <th className="py-2 text-right">Buy /kg</th>
                  <th className="py-2 text-right">Sell /kg</th>
                  <th className="py-2 text-right">Comm /kg</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="py-2 font-medium">{b.name}</td>
                    <td className="py-2 text-right">
                      {Number(b.current_kg) <= 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                          <AlertTriangle className="size-3" /> OUT OF STOCK
                        </span>
                      ) : (
                        KG(b.current_kg)
                      )}
                    </td>
                    <td className="py-2 text-right">{TZS(b.supplier_price)}</td>
                    <td className="py-2 text-right">{TZS(b.selling_price)}</td>
                    <td className="py-2 text-right">{TZS(b.commission_rate)}</td>
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

function Stat({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "accent" | "success" | "danger";
}) {
  const toneClass =
    tone === "accent"
      ? "text-accent-foreground"
      : tone === "success"
        ? "text-success"
        : tone === "danger"
          ? "text-destructive"
          : "text-primary";
  return (
    <div className="stat-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${toneClass}`} />
      </div>
      <p className={`mt-2 text-lg font-bold ${toneClass}`}>{value}</p>
      {sub ? <p className="text-[11px] text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`stat-card p-4 ${className}`}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{text}</p>;
}
