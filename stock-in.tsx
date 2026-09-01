import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { KG, TZS, fmtDate, today } from "@/lib/format";
import { useBrands, useGrnItems, useGrns, useSuppliers } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/stock-in")({
  head: () => ({
    meta: [
      { title: "Stock In (GRN) — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Record a Goods Received Note when a lorry arrives: supplier, lorry details, brands, bags, weight per bag and prices.",
      },
      { property: "og:title", content: "Stock In (GRN) — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Receive nafaka stock by brand, bags and KG.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StockIn,
});

type Line = {
  brandName: string;
  bags: string;
  weightPerBag: string;
  supplierPrice: string;
  sellingPrice: string;
  commission: string;
};

const emptyLine = (): Line => ({
  brandName: "",
  bags: "",
  weightPerBag: "",
  supplierPrice: "",
  sellingPrice: "",
  commission: "50",
});

function StockIn() {
  const qc = useQueryClient();
  const { data: grns = [] } = useGrns();
  const { data: items = [] } = useGrnItems();
  const { data: brands = [] } = useBrands();
  const { data: suppliers = [] } = useSuppliers();

  const [supplierName, setSupplierName] = useState("");
  const [receivedDate, setReceivedDate] = useState(today());
  const [lorry, setLorry] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const save = useMutation({
    mutationFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      if (!userId) throw new Error("Not signed in");
      if (!supplierName.trim()) throw new Error("Supplier name is required");
      const valid = lines.filter((l) => l.brandName.trim() && Number(l.bags) > 0);
      if (!valid.length) throw new Error("Add at least one brand line");

      let supplier = suppliers.find(
        (s) => s.name.toLowerCase() === supplierName.trim().toLowerCase(),
      );
      if (!supplier) {
        const { data, error } = await supabase
          .from("suppliers")
          .insert({ user_id: userId, name: supplierName.trim() })
          .select()
          .single();
        if (error) throw new Error(error.message);
        supplier = data as never;
      }

      const { data: grn, error: grnErr } = await supabase
        .from("grns")
        .insert({
          user_id: userId,
          supplier_id: supplier!.id,
          supplier_name: supplierName.trim(),
          received_date: receivedDate,
          lorry_details: lorry || null,
          notes: notes || null,
        })
        .select()
        .single();
      if (grnErr) throw new Error(grnErr.message);

      for (const l of valid) {
        const supplierPrice = Number(l.supplierPrice) || 0;
        const sellingPrice = Number(l.sellingPrice) || supplierPrice;
        const commission = Number(l.commission) || 50;
        const totalKg = (Number(l.bags) || 0) * (Number(l.weightPerBag) || 0);

        let brand = brands.find(
          (b) =>
            b.name.toLowerCase() === l.brandName.trim().toLowerCase() &&
            b.supplier_id === supplier!.id,
        );
        if (!brand) {
          const { data, error } = await supabase
            .from("brands")
            .insert({
              user_id: userId,
              supplier_id: supplier!.id,
              name: l.brandName.trim(),
              supplier_price: supplierPrice,
              selling_price: sellingPrice,
              commission_rate: commission,
            })
            .select()
            .single();
          if (error) throw new Error(error.message);
          brand = data as never;
        } else {
          await supabase
            .from("brands")
            .update({
              supplier_price: supplierPrice,
              selling_price: sellingPrice,
              commission_rate: commission,
            })
            .eq("id", brand.id);
        }

        await supabase.from("price_history").insert({
          user_id: userId,
          brand_id: brand!.id,
          supplier_price: supplierPrice,
          selling_price: sellingPrice,
          commission_rate: commission,
        });

        const { error: itemErr } = await supabase.from("grn_items").insert({
          user_id: userId,
          grn_id: grn.id,
          brand_id: brand!.id,
          bags: Number(l.bags) || 0,
          weight_per_bag: Number(l.weightPerBag) || 0,
          total_kg: totalKg,
          supplier_price: supplierPrice,
          selling_price: sellingPrice,
          commission_rate: commission,
        });
        if (itemErr) throw new Error(itemErr.message);
      }
    },
    onSuccess: () => {
      toast.success("Goods Received Note saved");
      setSupplierName("");
      setLorry("");
      setNotes("");
      setLines([emptyLine()]);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grandKg = lines.reduce(
    (a, l) => a + (Number(l.bags) || 0) * (Number(l.weightPerBag) || 0),
    0,
  );

  return (
    <AppShell title="Stock In / Ingiza mzigo" subtitle="Goods Received Note (GRN)">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="New GRN" hint="Lorry arrival details">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label="Supplier / Msambazaji">
              <Input
                list="supplier-list"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Mbeya Rice Traders"
              />
              <datalist id="supplier-list">
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </FieldWrap>
            <FieldWrap label="Date received / Tarehe">
              <Input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label="Lorry details / Lori">
              <Input
                value={lorry}
                onChange={(e) => setLorry(e.target.value)}
                placeholder="T123 ABC · driver Juma"
              />
            </FieldWrap>
            <FieldWrap label="Notes">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </FieldWrap>
          </div>

          <div className="mt-5 space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground">Brand {i + 1}</p>
                  {lines.length > 1 && (
                    <button
                      onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FieldWrap label="Brand name">
                    <Input
                      list="brand-list"
                      value={l.brandName}
                      onChange={(e) => setLine(i, { brandName: e.target.value })}
                      placeholder="e.g. Mbeya Kilombero"
                    />
                  </FieldWrap>
                  <FieldWrap label="Bags / Magunia">
                    <Input
                      inputMode="numeric"
                      value={l.bags}
                      onChange={(e) => setLine(i, { bags: e.target.value })}
                    />
                  </FieldWrap>
                  <FieldWrap label="Weight per bag (kg)">
                    <Input
                      inputMode="decimal"
                      value={l.weightPerBag}
                      onChange={(e) => setLine(i, { weightPerBag: e.target.value })}
                    />
                  </FieldWrap>
                  <FieldWrap label="Supplier price /kg">
                    <Input
                      inputMode="decimal"
                      value={l.supplierPrice}
                      onChange={(e) =>
                        setLine(i, {
                          supplierPrice: e.target.value,
                          sellingPrice: l.sellingPrice || e.target.value,
                        })
                      }
                    />
                  </FieldWrap>
                  <FieldWrap label="Selling price /kg">
                    <Input
                      inputMode="decimal"
                      value={l.sellingPrice}
                      onChange={(e) => setLine(i, { sellingPrice: e.target.value })}
                    />
                  </FieldWrap>
                  <FieldWrap label="Commission /kg">
                    <Input
                      inputMode="decimal"
                      value={l.commission}
                      onChange={(e) => setLine(i, { commission: e.target.value })}
                    />
                  </FieldWrap>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Total ={" "}
                  <span className="font-semibold text-foreground">
                    {KG((Number(l.bags) || 0) * (Number(l.weightPerBag) || 0))}
                  </span>
                </p>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((ls) => [...ls, emptyLine()])}
            >
              <Plus className="size-4" /> Add brand
            </Button>
            <span className="text-sm text-muted-foreground">
              Lorry total: <strong className="text-foreground">{KG(grandKg)}</strong>
            </span>
            <Button
              className="ml-auto"
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              <Truck className="size-4" /> Save GRN
            </Button>
          </div>
        </Panel>

        <Panel title="Recent GRNs" hint="Mizigo iliyopokelewa">
          {grns.length === 0 ? (
            <Empty text="No goods received yet." />
          ) : (
            <ul className="space-y-3">
              {grns.slice(0, 12).map((g) => {
                const gi = items.filter((i) => i.grn_id === g.id);
                return (
                  <li key={g.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{g.supplier_name}</p>
                      <span className="text-xs text-muted-foreground">
                        {fmtDate(g.received_date)}
                      </span>
                    </div>
                    {g.lorry_details ? (
                      <p className="text-xs text-muted-foreground">{g.lorry_details}</p>
                    ) : null}
                    <ul className="mt-2 space-y-1 text-xs">
                      {gi.map((it) => {
                        const brand = brands.find((b) => b.id === it.brand_id);
                        return (
                          <li key={it.id} className="flex justify-between">
                            <span>
                              {brand?.name ?? "Brand"} · {it.bags} × {it.weight_per_bag}kg
                            </span>
                            <span className="text-muted-foreground">
                              {KG(it.total_kg)} @ {TZS(it.supplier_price)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <datalist id="brand-list">
        {brands.map((b) => (
          <option key={b.id} value={b.name} />
        ))}
      </datalist>
    </AppShell>
  );
}

export function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
