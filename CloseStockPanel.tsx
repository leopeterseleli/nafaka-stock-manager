import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { KG, TZS, fmtDate, today } from "@/lib/format";
import {
  useBrands,
  useGrnItems,
  useSales,
  useStockClosures,
  type Brand,
} from "@/lib/queries";

type Calc = {
  brand: Brand;
  receivedKg: number;
  soldKg: number;
  recordedLossKg: number;
  leftoverKg: number;
  lossCost: number;
  lostRevenue: number;
};

export function CloseStockPanel() {
  const qc = useQueryClient();
  const { data: brands = [] } = useBrands();
  const { data: sales = [] } = useSales();
  const { data: grnItems = [] } = useGrnItems();
  const { data: closures = [] } = useStockClosures();

  const rows: Calc[] = brands.map((brand) => {
    const receivedKg = grnItems
      .filter((g) => g.brand_id === brand.id)
      .reduce((a, g) => a + Number(g.total_kg), 0);
    const brandSales = sales.filter((s) => s.brand_id === brand.id);
    const soldKg = brandSales.reduce((a, s) => a + Number(s.kg_sold), 0);
    const recordedLossKg = brandSales.reduce((a, s) => a + Number(s.sample_loss_kg), 0);
    const leftoverKg = Math.max(Number(brand.current_kg), 0);
    return {
      brand,
      receivedKg,
      soldKg,
      recordedLossKg,
      leftoverKg,
      lossCost: leftoverKg * Number(brand.supplier_price),
      lostRevenue: leftoverKg * Number(brand.selling_price),
    };
  });

  const close = useMutation({
    mutationFn: async (r: Calc) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("stock_closures").insert({
        user_id: userId,
        brand_id: r.brand.id,
        closed_on: today(),
        received_kg: r.receivedKg,
        sold_kg: r.soldKg,
        sample_loss_kg: r.leftoverKg,
        loss_cost: r.lossCost,
        lost_revenue: r.lostRevenue,
        note: "Auto-detected on stock close",
      });
      if (error) throw new Error(error.message);
      return r;
    },
    onSuccess: (r) => {
      toast.success(
        `${r.brand.name} closed — loss ${TZS(r.lossCost)} = ${KG(kgFromCost(r.lossCost, r.brand.supplier_price))} charged to the shop owner`,
      );
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openRows = rows.filter((r) => r.receivedKg > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        When a brand is finished, confirm below. Registered stock minus total sales for that brand
        is booked automatically as sample loss — carried by the shop owner, never by the supplier.
      </p>

      {openRows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No brands received yet / Hakuna chapa bado.
        </p>
      ) : (
        <div className="space-y-2">
          {openRows.map((r) => (
            <div key={r.brand.id} className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{r.brand.name}</p>
                <span className="text-[11px] text-muted-foreground">
                  Received {KG(r.receivedKg)} · Sold {KG(r.soldKg)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                <Cell label="Remaining / Iliyobaki" value={KG(r.leftoverKg)} />
                <Cell label="Loss already logged" value={KG(r.recordedLossKg)} />
                <Cell
                  label="Owner loss cost"
                  value={TZS(r.lossCost)}
                  hint={`= ${KG(kgFromCost(r.lossCost, r.brand.supplier_price))} at ${TZS(r.brand.supplier_price)}/kg`}
                  tone="destructive"
                />
                <Cell
                  label="Revenue lost"
                  value={TZS(r.lostRevenue)}
                  hint={`= ${KG(kgFromCost(r.lostRevenue, r.brand.selling_price))} at ${TZS(r.brand.selling_price)}/kg`}
                  tone="destructive"
                />
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    disabled={close.isPending || r.leftoverKg <= 0}
                  >
                    <PackageCheck className="size-4" /> Confirm stock finished
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close {r.brand.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Registered {KG(r.receivedKg)}, sold {KG(r.soldKg)}. The remaining{" "}
                      {KG(r.leftoverKg)} will be recorded as sample loss for the shop owner
                      (cost {TZS(r.lossCost)} = {KG(kgFromCost(r.lossCost, r.brand.supplier_price))}{" "}
                      at {TZS(r.brand.supplier_price)}/kg; lost revenue {TZS(r.lostRevenue)} ={" "}
                      {KG(kgFromCost(r.lostRevenue, r.brand.selling_price))} at{" "}
                      {TZS(r.brand.selling_price)}/kg), and this brand&apos;s stock will be set to
                      zero.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => close.mutate(r)}>
                      Confirm & book loss
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              {r.leftoverKg <= 0 ? (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="size-3" /> Nothing left to write off.
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {closures.length > 0 ? (
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
            Closed batches / Historia
          </p>
          <ul className="divide-y divide-border text-sm">
            {closures.slice(0, 10).map((c) => {
              const b = brands.find((x) => x.id === c.brand_id);
              const costPerKg = Number(b?.supplier_price ?? 0);
              const revPerKg = Number(b?.selling_price ?? 0);
              return (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {b?.name ?? "-"}
                    <span className="text-muted-foreground"> · {fmtDate(c.closed_on)}</span>
                  </span>
                  <span className="text-right text-muted-foreground">
                    <span className="block">
                      Loss {KG(c.sample_loss_kg)} ·{" "}
                      <strong className="text-destructive">{TZS(c.loss_cost)}</strong>
                    </span>
                    <span className="block text-[11px]">
                      {TZS(c.loss_cost)} ÷ {TZS(costPerKg)}/kg ={" "}
                      {KG(kgFromCost(c.loss_cost, costPerKg))} · Revenue {TZS(c.lost_revenue)} ÷{" "}
                      {TZS(revPerKg)}/kg = {KG(kgFromCost(c.lost_revenue, revPerKg))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function kgFromCost(amount: number | string, pricePerKg: number | string) {
  const price = Number(pricePerKg) || 0;
  if (price <= 0) return 0;
  return Number(amount) / price;
}

function Cell({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "destructive";
}) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`font-semibold ${tone === "destructive" ? "text-destructive" : ""}`}>
        {value}
      </p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
