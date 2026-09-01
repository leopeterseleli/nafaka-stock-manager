import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Printer, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { CloseStockPanel } from "@/components/CloseStockPanel";
import { Empty, Panel } from "./dashboard";
import { FieldWrap } from "./stock-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { KG, TZS, fmtDate, today } from "@/lib/format";
import { printDocument } from "@/lib/exports";
import { useBrands, useProfile, useSales, type Sale } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/stock-out")({
  head: () => ({
    meta: [
      { title: "Sales / Stock Out — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Record nafaka sales by brand and KG, track sample losses, credit customers and print invoices in TZS.",
      },
      { property: "og:title", content: "Sales / Stock Out — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Sell by KG, split supplier money, commission and extra profit.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StockOut,
});

function StockOut() {
  const qc = useQueryClient();
  const { data: brands = [] } = useBrands();
  const { data: sales = [] } = useSales();
  const { data: profile } = useProfile();

  const [brandId, setBrandId] = useState("");
  const [saleDate, setSaleDate] = useState(today());
  const [customer, setCustomer] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [isCredit, setIsCredit] = useState(false);
  const [kg, setKg] = useState("");
  const [sampleLoss, setSampleLoss] = useState("");
  const [priceOverride, setPriceOverride] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  const brand = brands.find((b) => b.id === brandId);
  const kgNum = Number(kg) || 0;
  const lossNum = Number(sampleLoss) || 0;
  const sellPrice = Number(priceOverride) || Number(brand?.selling_price ?? 0);
  const buyPrice = Number(brand?.supplier_price ?? 0);
  const rate = Number(brand?.commission_rate ?? 50);
  const total = kgNum * sellPrice;
  const supplierAmount = kgNum * buyPrice;
  const commission = kgNum * rate;
  const extra = kgNum * (sellPrice - buyPrice);
  const remaining = Number(brand?.current_kg ?? 0) - kgNum - lossNum;

  const save = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      if (!brand) throw new Error("Select a brand");
      if (!customer.trim()) throw new Error("Customer name is required");
      if (kgNum <= 0) throw new Error("Enter the KG sold");
      if (remaining < 0) throw new Error("Not enough stock for this brand");

      const paid = isCredit ? Number(amountPaid) || 0 : total;
      const { data, error } = await supabase
        .from("sales")
        .insert({
          user_id: userId,
          brand_id: brand.id,
          sale_date: saleDate,
          customer_name: customer.trim(),
          customer_phone: customerPhone || null,
          is_credit: isCredit,
          kg_sold: kgNum,
          sample_loss_kg: lossNum,
          supplier_price: buyPrice,
          selling_price: sellPrice,
          commission_rate: rate,
          total_amount: total,
          supplier_amount: supplierAmount,
          commission_amount: commission,
          extra_profit: extra,
          amount_paid: paid,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Sale;
    },
    onSuccess: (sale) => {
      toast.success("Sale recorded");
      if (remaining <= 0) toast.warning(`${brand?.name} is now OUT OF STOCK`);
      invoice(sale);
      setKg("");
      setSampleLoss("");
      setAmountPaid("");
      setPriceOverride("");
      setCustomer("");
      setCustomerPhone("");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function invoice(sale: Sale) {
    const b = brands.find((x) => x.id === sale.brand_id);
    printDocument(
      `Invoice ${sale.id.slice(0, 8)}`,
      `<h1>${profile?.shop_name ?? "Nafaka Shop"}</h1>
       <p class="muted">Invoice / Ankara #${sale.id.slice(0, 8).toUpperCase()} · ${fmtDate(sale.sale_date)}</p>
       <h2>Customer / Mteja</h2>
       <p>${sale.customer_name}${sale.customer_phone ? ` · ${sale.customer_phone}` : ""}${sale.is_credit ? " · CREDIT / MKOPO" : ""}</p>
       <table>
         <thead><tr><th>Brand</th><th class="num">KG</th><th class="num">Price/kg</th><th class="num">Amount</th></tr></thead>
         <tbody>
           <tr><td>${b?.name ?? ""}</td><td class="num">${Number(sale.kg_sold)}</td><td class="num">${TZS(sale.selling_price)}</td><td class="num">${TZS(sale.total_amount)}</td></tr>
           ${Number(sale.sample_loss_kg) > 0 ? `<tr><td>Sample (free)</td><td class="num">${Number(sale.sample_loss_kg)}</td><td class="num">-</td><td class="num">TZS 0</td></tr>` : ""}
           <tr class="total"><td colspan="3">Total</td><td class="num">${TZS(sale.total_amount)}</td></tr>
           <tr><td colspan="3">Paid</td><td class="num">${TZS(sale.amount_paid)}</td></tr>
           <tr class="total"><td colspan="3">Balance</td><td class="num">${TZS(Number(sale.total_amount) - Number(sale.amount_paid))}</td></tr>
         </tbody>
       </table>
       <p class="muted">Asante kwa biashara! / Thank you for your business.</p>`,
    );
  }

  return (
    <AppShell title="Sales / Mauzo" subtitle="Stock out and invoices">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Panel title="New sale" hint="Uza nafaka">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label="Brand / Chapa">
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id} disabled={Number(b.current_kg) <= 0}>
                      {b.name} — {Number(b.current_kg) <= 0 ? "OUT OF STOCK" : KG(b.current_kg)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrap>
            <FieldWrap label="Date / Tarehe">
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Customer / Mteja">
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Customer phone">
              <Input
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label="KG sold / Kilo zilizouzwa">
              <Input inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} />
            </FieldWrap>
            <FieldWrap label="Sample loss KG / Sampuli">
              <Input
                inputMode="decimal"
                value={sampleLoss}
                onChange={(e) => setSampleLoss(e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label={`Selling price /kg (default ${TZS(brand?.selling_price ?? 0)})`}>
              <Input
                inputMode="decimal"
                value={priceOverride}
                onChange={(e) => setPriceOverride(e.target.value)}
                placeholder={String(brand?.selling_price ?? "")}
              />
            </FieldWrap>
            <div className="flex items-end gap-3 pb-1">
              <Switch id="credit" checked={isCredit} onCheckedChange={setIsCredit} />
              <Label htmlFor="credit" className="text-sm">
                Credit customer / Mkopo
              </Label>
            </div>
            {isCredit && (
              <FieldWrap label="Amount paid now">
                <Input
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </FieldWrap>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/50 p-3 text-sm">
            <Row label="Total sale" value={TZS(total)} />
            <Row label="Stock remaining" value={KG(Math.max(remaining, 0))} />
            <Row label="Supplier amount" value={TZS(supplierAmount)} />
            <Row label={`Commission (${TZS(rate)}/kg)`} value={TZS(commission)} tone="accent" />
            <Row label="Extra profit" value={TZS(extra)} tone="success" />
            <Row label="Sample loss" value={KG(lossNum)} />
          </div>

          <Button className="mt-4 w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            <ShoppingCart className="size-4" /> Record sale & print invoice
          </Button>
        </Panel>

        <Panel title="Recent sales" hint="Mauzo ya karibuni">
          {sales.length === 0 ? (
            <Empty text="No sales yet." />
          ) : (
            <ul className="divide-y divide-border">
              {sales.slice(0, 20).map((s) => {
                const b = brands.find((x) => x.id === s.brand_id);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {s.customer_name}
                        {s.is_credit ? (
                          <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                            CREDIT
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {b?.name} · {KG(s.kg_sold)} · {fmtDate(s.sale_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{TZS(s.total_amount)}</span>
                      <button
                        onClick={() => invoice(s)}
                        className="text-muted-foreground hover:text-primary"
                        aria-label="Print invoice"
                      >
                        <Printer className="size-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        className="mt-3"
        title="Close stock & sample loss"
        hint="Thibitisha stock imeisha"
      >
        <CloseStockPanel />
      </Panel>
    </AppShell>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent" | "success";
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={`font-semibold ${tone === "accent" ? "text-accent-foreground" : tone === "success" ? "text-success" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}
