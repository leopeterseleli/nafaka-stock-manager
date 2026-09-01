import { KG, TZS, fmtDate } from "@/lib/format";
import { useBrands, useSales } from "@/lib/queries";

type Level = {
  key: string;
  supplierPrice: number;
  sellingPrice: number;
  commissionRate: number;
  kg: number;
  revenue: number;
  supplierAmount: number;
  commission: number;
  extra: number;
  firstDate: string;
  lastDate: string;
};

/**
 * Groups every sale of a brand by the price level it was sold at
 * (supplier price / selling price / commission), so the owner can see
 * how much KG and money belongs to the supplier at each price change.
 */
export function PriceLevelBreakdown({ supplierId }: { supplierId?: string | undefined }) {
  const { data: brands = [] } = useBrands();
  const { data: sales = [] } = useSales();

  const visibleBrands = brands.filter(
    (b) => !supplierId || b.supplier_id === supplierId,
  );

  const groups = visibleBrands
    .map((brand) => {
      const map = new Map<string, Level>();
      for (const s of sales) {
        if (s.brand_id !== brand.id) continue;
        const sp = Number(s.supplier_price);
        const sell = Number(s.selling_price);
        const rate = Number(s.commission_rate);
        const key = `${sp}|${sell}|${rate}`;
        const row =
          map.get(key) ??
          ({
            key,
            supplierPrice: sp,
            sellingPrice: sell,
            commissionRate: rate,
            kg: 0,
            revenue: 0,
            supplierAmount: 0,
            commission: 0,
            extra: 0,
            firstDate: s.sale_date,
            lastDate: s.sale_date,
          } satisfies Level);
        row.kg += Number(s.kg_sold);
        row.revenue += Number(s.total_amount);
        row.supplierAmount += Number(s.supplier_amount);
        row.commission += Number(s.commission_amount);
        row.extra += Number(s.extra_profit);
        if (s.sale_date < row.firstDate) row.firstDate = s.sale_date;
        if (s.sale_date > row.lastDate) row.lastDate = s.sale_date;
        map.set(key, row);
      }
      const levels = [...map.values()].sort((a, b) => a.firstDate.localeCompare(b.firstDate));
      return { brand, levels };
    })
    .filter((g) => g.levels.length > 0);

  if (groups.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No sales recorded yet / Hakuna mauzo bado.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Every price change creates a new level. Pay the supplier the KG sold at each level times
        that level&apos;s buying price / Lipa msambazaji kwa kila kiwango cha bei.
      </p>

      {groups.map(({ brand, levels }) => {
        const totKg = levels.reduce((a, l) => a + l.kg, 0);
        const totSupplier = levels.reduce((a, l) => a + l.supplierAmount, 0);
        const totRevenue = levels.reduce((a, l) => a + l.revenue, 0);
        const totCommission = levels.reduce((a, l) => a + l.commission, 0);
        const totExtra = levels.reduce((a, l) => a + l.extra, 0);
        return (
          <div key={brand.id} className="rounded-xl border border-border p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{brand.name}</p>
              <span className="text-[11px] text-muted-foreground">
                {levels.length} price level{levels.length > 1 ? "s" : ""} · Sold {KG(totKg)}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-muted-foreground uppercase">
                    <th className="py-1 pr-2">Period</th>
                    <th className="py-1 pr-2">Buy /kg</th>
                    <th className="py-1 pr-2">Sell /kg</th>
                    <th className="py-1 pr-2 text-right">KG sold</th>
                    <th className="py-1 pr-2 text-right">Income</th>
                    <th className="py-1 pr-2 text-right">Supplier due</th>
                    <th className="py-1 pr-2 text-right">Commission</th>
                    <th className="py-1 text-right">Extra profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {levels.map((l) => (
                    <tr key={l.key}>
                      <td className="py-1.5 pr-2 whitespace-nowrap text-muted-foreground">
                        {fmtDate(l.firstDate)}
                        {l.lastDate !== l.firstDate ? ` – ${fmtDate(l.lastDate)}` : ""}
                      </td>
                      <td className="py-1.5 pr-2">{TZS(l.supplierPrice)}</td>
                      <td className="py-1.5 pr-2">{TZS(l.sellingPrice)}</td>
                      <td className="py-1.5 pr-2 text-right font-medium">{KG(l.kg)}</td>
                      <td className="py-1.5 pr-2 text-right">{TZS(l.revenue)}</td>
                      <td className="py-1.5 pr-2 text-right font-semibold">
                        {TZS(l.supplierAmount)}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-accent-foreground">
                        {TZS(l.commission)}
                      </td>
                      <td className="py-1.5 text-right text-success">{TZS(l.extra)}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className="py-1.5 pr-2" colSpan={3}>
                      Total / Jumla
                    </td>
                    <td className="py-1.5 pr-2 text-right">{KG(totKg)}</td>
                    <td className="py-1.5 pr-2 text-right">{TZS(totRevenue)}</td>
                    <td className="py-1.5 pr-2 text-right">{TZS(totSupplier)}</td>
                    <td className="py-1.5 pr-2 text-right text-accent-foreground">
                      {TZS(totCommission)}
                    </td>
                    <td className="py-1.5 text-right text-success">{TZS(totExtra)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
