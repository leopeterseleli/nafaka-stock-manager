import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
import { FieldWrap } from "./stock-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KG, TZS, fmtDate, daysBetween, today } from "@/lib/format";
import { AGING_DAYS, inRange } from "@/lib/business";
import { exportToExcel, printDocument, type Row } from "@/lib/exports";
import {
  useBrands,
  useExpenses,
  useGrnItems,
  useGrns,
  useProfile,
  useSales,
  useSuppliers,
} from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Stock, sales, profit, supplier and loss reports filtered by date range and brand, exportable to PDF and Excel.",
      },
      { property: "og:title", content: "Reports — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Filterable nafaka business reports with PDF and Excel export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { data: brands = [] } = useBrands();
  const { data: suppliers = [] } = useSuppliers();
  const { data: sales = [] } = useSales();
  const { data: grns = [] } = useGrns();
  const { data: grnItems = [] } = useGrnItems();
  const { data: expenses = [] } = useExpenses();
  const { data: profile } = useProfile();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const [brandId, setBrandId] = useState("all");
  const [supplierId, setSupplierId] = useState("all");

  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "-";
  const brandIdsForSupplier =
    supplierId === "all" ? null : brands.filter((b) => b.supplier_id === supplierId).map((b) => b.id);

  const filteredBrands = brands.filter(
    (b) =>
      (brandId === "all" || b.id === brandId) &&
      (!brandIdsForSupplier || brandIdsForSupplier.includes(b.id)),
  );

  const filteredSales = sales.filter(
    (s) =>
      inRange(s.sale_date, from, to) &&
      (brandId === "all" || s.brand_id === brandId) &&
      (!brandIdsForSupplier || brandIdsForSupplier.includes(s.brand_id)),
  );

  const filteredGrnItems = grnItems.filter((it) => {
    const grn = grns.find((g) => g.id === it.grn_id);
    if (!grn || !inRange(grn.received_date, from, to)) return false;
    if (brandId !== "all" && it.brand_id !== brandId) return false;
    if (brandIdsForSupplier && !brandIdsForSupplier.includes(it.brand_id)) return false;
    return true;
  });

  const filteredExpenses = expenses.filter((e) => inRange(e.expense_date, from, to));

  const totals = {
    kg: filteredSales.reduce((a, s) => a + Number(s.kg_sold), 0),
    revenue: filteredSales.reduce((a, s) => a + Number(s.total_amount), 0),
    supplier: filteredSales.reduce((a, s) => a + Number(s.supplier_amount), 0),
    commission: filteredSales.reduce((a, s) => a + Number(s.commission_amount), 0),
    extra: filteredSales.reduce((a, s) => a + Number(s.extra_profit), 0),
    loss: filteredSales.reduce((a, s) => a + Number(s.sample_loss_kg), 0),
    expenses: filteredExpenses.reduce((a, e) => a + Number(e.amount), 0),
  };
  const netProfit = totals.commission + totals.extra - totals.expenses;

  const period = `${from ? fmtDate(from) : "start"} → ${fmtDate(to)}`;

  function pdf(title: string, rows: Row[], extraHtml = "") {
    if (!rows.length && !extraHtml) return;
    const headers = rows.length ? Object.keys(rows[0]!) : [];
    printDocument(
      title,
      `<h1>${profile?.shop_name ?? "Nafaka Shop"}</h1>
       <p class="muted">${title} · ${period}</p>
       ${
         rows.length
           ? `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
              <tbody>${rows
                .map(
                  (r) =>
                    `<tr>${headers.map((h) => `<td>${r[h] ?? ""}</td>`).join("")}</tr>`,
                )
                .join("")}</tbody></table>`
           : ""
       }
       ${extraHtml}`,
    );
  }

  const stockRows: Row[] = filteredBrands.map((b) => ({
    Brand: b.name,
    Supplier: suppliers.find((s) => s.id === b.supplier_id)?.name ?? "-",
    "Stock KG": Number(b.current_kg),
    "Buy /kg": Number(b.supplier_price),
    "Sell /kg": Number(b.selling_price),
    "Stock value TZS": Number(b.current_kg) * Number(b.selling_price),
    "Last stock in": b.last_stock_in_date ?? "-",
    Status: Number(b.current_kg) <= 0 ? "OUT OF STOCK" : "OK",
  }));

  const salesRows: Row[] = filteredSales.map((s) => ({
    Date: s.sale_date,
    Customer: s.customer_name,
    Brand: brandName(s.brand_id),
    KG: Number(s.kg_sold),
    "Sample KG": Number(s.sample_loss_kg),
    "Price /kg": Number(s.selling_price),
    Total: Number(s.total_amount),
    Credit: s.is_credit ? "YES" : "NO",
  }));

  const profitRows: Row[] = filteredSales.map((s) => ({
    Date: s.sale_date,
    Brand: brandName(s.brand_id),
    KG: Number(s.kg_sold),
    "Supplier amount": Number(s.supplier_amount),
    Commission: Number(s.commission_amount),
    "Extra profit": Number(s.extra_profit),
  }));

  const supplierRows: Row[] = suppliers
    .filter((s) => supplierId === "all" || s.id === supplierId)
    .map((s) => {
      const ids = brands.filter((b) => b.supplier_id === s.id).map((b) => b.id);
      const ss = filteredSales.filter((x) => ids.includes(x.brand_id));
      const received = ss.reduce((a, x) => a + Number(x.supplier_amount), 0);
      const kgIn = filteredGrnItems
        .filter((i) => ids.includes(i.brand_id))
        .reduce((a, i) => a + Number(i.total_kg), 0);
      return {
        Supplier: s.name,
        "KG received": kgIn,
        "KG sold": ss.reduce((a, x) => a + Number(x.kg_sold), 0),
        "Supplier amount": received,
      };
    });

  const lossRows: Row[] = filteredBrands.map((b) => {
    const bs = filteredSales.filter((s) => s.brand_id === b.id);
    return {
      Brand: b.name,
      "Sample loss KG (period)": bs.reduce((a, s) => a + Number(s.sample_loss_kg), 0),
      "Sample loss KG (all time)": Number(b.total_sample_loss_kg),
      "Loss value TZS": Number(b.total_sample_loss_kg) * Number(b.selling_price),
      Status: Number(b.current_kg) <= 0 ? "OUT OF STOCK — final loss" : "In stock",
    };
  });

  const agingRows: Row[] = brands
    .filter(
      (b) =>
        Number(b.current_kg) > 0 &&
        b.last_stock_in_date &&
        daysBetween(b.last_stock_in_date) > AGING_DAYS,
    )
    .map((b) => ({
      Brand: b.name,
      "Stock KG": Number(b.current_kg),
      "Last stock in": b.last_stock_in_date ?? "-",
      "Days old": b.last_stock_in_date ? daysBetween(b.last_stock_in_date) : 0,
    }));

  return (
    <AppShell title="Reports / Ripoti" subtitle={`Period: ${period}`}>
      <Panel title="Filters" hint="Chuja kwa tarehe, chapa au msambazaji">
        <div className="grid gap-3 sm:grid-cols-4">
          <FieldWrap label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Brand">
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWrap>
          <FieldWrap label="Supplier">
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWrap>
        </div>
      </Panel>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Mini label="KG sold" value={KG(totals.kg)} />
        <Mini label="Revenue" value={TZS(totals.revenue)} />
        <Mini label="Commission" value={TZS(totals.commission)} />
        <Mini label="Extra profit" value={TZS(totals.extra)} />
      </div>

      <Tabs defaultValue="stock" className="mt-3">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
          <TabsTrigger value="supplier">Supplier</TabsTrigger>
          <TabsTrigger value="loss">Loss</TabsTrigger>
          <TabsTrigger value="aging">Aging</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <ReportTable
            title="Stock Report"
            rows={stockRows}
            onPdf={() => pdf("Stock Report", stockRows)}
          />
        </TabsContent>
        <TabsContent value="sales">
          <ReportTable
            title="Sales Report"
            rows={salesRows}
            onPdf={() =>
              pdf(
                "Sales Report",
                salesRows,
                `<table><tbody><tr class="total"><td>Total revenue</td><td class="num">${TZS(totals.revenue)}</td></tr></tbody></table>`,
              )
            }
          />
        </TabsContent>
        <TabsContent value="profit">
          <ReportTable
            title="Profit Report"
            rows={profitRows}
            onPdf={() =>
              pdf(
                "Profit Report",
                profitRows,
                `<h2>Owner P&amp;L</h2><table><tbody>
                 <tr><td>Total commission earned</td><td class="num">${TZS(totals.commission)}</td></tr>
                 <tr><td>Total extra profit</td><td class="num">${TZS(totals.extra)}</td></tr>
                 <tr><td>Total business expenses</td><td class="num">${TZS(totals.expenses)}</td></tr>
                 <tr class="total"><td>Net profit</td><td class="num">${TZS(netProfit)}</td></tr>
                 </tbody></table>`,
              )
            }
          >
            <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Mini label="Commission" value={TZS(totals.commission)} />
              <Mini label="Extra profit" value={TZS(totals.extra)} />
              <Mini label="Expenses" value={TZS(totals.expenses)} />
              <Mini label="Net profit" value={TZS(netProfit)} />
            </div>
          </ReportTable>
        </TabsContent>
        <TabsContent value="supplier">
          <ReportTable
            title="Supplier Statement"
            rows={supplierRows}
            onPdf={() => pdf("Supplier Statement", supplierRows)}
          />
        </TabsContent>
        <TabsContent value="loss">
          <ReportTable
            title="Loss Report"
            rows={lossRows}
            onPdf={() => pdf("Loss Report", lossRows)}
          />
        </TabsContent>
        <TabsContent value="aging">
          <ReportTable
            title="Aging Stock Alert"
            rows={agingRows}
            onPdf={() => pdf("Aging Stock Alert", agingRows)}
          />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-base font-bold">{value}</p>
    </div>
  );
}

function ReportTable({
  title,
  rows,
  onPdf,
  children,
}: {
  title: string;
  rows: Row[];
  onPdf: () => void;
  children?: React.ReactNode;
}) {
  const headers = rows.length ? Object.keys(rows[0]!) : [];
  return (
    <Panel
      className="mt-3"
      title={title}
      hint={`${rows.length} rows`}
    >
      {children}
      <div className="mb-3 flex gap-2">
        <Button size="sm" variant="outline" onClick={onPdf} disabled={!rows.length}>
          <Printer className="size-4" /> PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => exportToExcel(title.replace(/\s+/g, "-").toLowerCase(), rows)}
          disabled={!rows.length}
        >
          <Download className="size-4" /> Excel
        </Button>
      </div>
      {rows.length === 0 ? (
        <Empty text="Nothing to show for these filters." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground uppercase">
                {headers.map((h) => (
                  <th key={h} className="py-2 pr-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {headers.map((h) => (
                    <td key={h} className="py-2 pr-3 whitespace-nowrap">
                      {typeof r[h] === "number" ? Number(r[h]).toLocaleString() : (r[h] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
