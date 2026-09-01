import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Empty, Panel } from "./dashboard";
import { FieldWrap } from "./stock-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { TZS, fmtDate } from "@/lib/format";
import { displayPhone } from "@/lib/phone";
import { useBrands, usePriceHistory, useProfile, useSuppliers } from "@/lib/queries";
import { useServerFn } from "@tanstack/react-start";
import { saveSecurityQuestion } from "@/lib/password-reset.functions";

const QUESTIONS = {
  place_of_birth: "Place of birth / Mahali ulipozaliwa",
  year_of_birth: "Year of birth / Mwaka wa kuzaliwa",
} as const;
type QuestionKey = keyof typeof QUESTIONS;

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Nafaka Stock Manager" },
      {
        name: "description",
        content:
          "Manage shop details, brands, suppliers and prices with full price history for your nafaka shop.",
      },
      { property: "og:title", content: "Settings — Nafaka Stock Manager" },
      {
        property: "og:description",
        content: "Brands, suppliers and prices for your nafaka shop.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: brands = [] } = useBrands();
  const { data: suppliers = [] } = useSuppliers();
  const { data: history = [] } = usePriceHistory();


  const [shopName, setShopName] = useState("");
  const [fullName, setFullName] = useState("");
  const [question, setQuestion] = useState<QuestionKey>("place_of_birth");
  const [answer, setAnswer] = useState("");
  const saveQuestionFn = useServerFn(saveSecurityQuestion);

  const saveQuestion = useMutation({
    mutationFn: async () => {
      await saveQuestionFn({ data: { question, answer } });
    },
    onSuccess: () => {
      setAnswer("");
      toast.success("Security question saved");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          shop_name: shopName || profile?.shop_name || "Nafaka Shop",
          full_name: fullName || profile?.full_name || null,
        })
        .eq("id", profile!.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Shop details saved");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updatePrices = useMutation({
    mutationFn: async (payload: {
      id: string;
      supplier_price: number;
      selling_price: number;
      commission_rate: number;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id;
      const { error } = await supabase
        .from("brands")
        .update({
          supplier_price: payload.supplier_price,
          selling_price: payload.selling_price,
          commission_rate: payload.commission_rate,
        })
        .eq("id", payload.id);
      if (error) throw new Error(error.message);
      await supabase.from("price_history").insert({
        user_id: userId!,
        brand_id: payload.id,
        supplier_price: payload.supplier_price,
        selling_price: payload.selling_price,
        commission_rate: payload.commission_rate,
      });
    },
    onSuccess: () => {
      toast.success("Prices updated");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="Settings / Mipangilio" subtitle="Shop, brands and prices">

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Shop details" hint="Taarifa za duka">
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label="Shop name">
              <Input
                value={shopName}
                placeholder={profile?.shop_name ?? ""}
                onChange={(e) => setShopName(e.target.value)}
              />
            </FieldWrap>
            <FieldWrap label="Owner name">
              <Input
                value={fullName}
                placeholder={profile?.full_name ?? ""}
                onChange={(e) => setFullName(e.target.value)}
              />
            </FieldWrap>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Login phone: {profile?.phone ? displayPhone(profile.phone) : "-"}
          </p>
          <Button className="mt-3" onClick={() => saveProfile.mutate()} disabled={!profile}>
            <Save className="size-4" /> Save
          </Button>
        </Panel>

        <Panel title="Security question" hint="Swali la kurejesha neno la siri">
          <p className="mb-3 text-xs text-muted-foreground">
            Used to reset your password without SMS. / Hutumika kubadili neno la siri bila SMS.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldWrap label="Question / Swali">
              <select
                value={question}
                onChange={(e) => setQuestion(e.target.value as QuestionKey)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="place_of_birth">{QUESTIONS.place_of_birth}</option>
                <option value="year_of_birth">{QUESTIONS.year_of_birth}</option>
              </select>
            </FieldWrap>
            <FieldWrap label="Answer / Jibu">
              <Input value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </FieldWrap>
          </div>
          <Button
            className="mt-3"
            onClick={() => saveQuestion.mutate()}
            disabled={answer.trim().length < 2}
          >
            <Save className="size-4" /> Save answer
          </Button>
        </Panel>

        <Panel title="Suppliers" hint="Wasambazaji">
          {suppliers.length === 0 ? (
            <Empty text="No suppliers yet." />
          ) : (
            <ul className="divide-y divide-border text-sm">
              {suppliers.map((s) => (
                <li key={s.id} className="flex justify-between py-2">
                  <span>{s.name}</span>
                  <span className="text-muted-foreground">{s.phone ?? "-"}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Expenses are now recorded on the Cash page / Gharama sasa ziko ukurasa wa Fedha.
          </p>
        </Panel>

      </div>

      <Panel className="mt-3" title="Brands & prices" hint="Bei zinaweza kubadilishwa muda wowote">
        {brands.length === 0 ? (
          <Empty text="No brands yet." />
        ) : (
          <div className="space-y-3">
            {brands.map((b) => (
              <BrandPriceRow
                key={b.id}
                brand={b}
                supplierName={suppliers.find((s) => s.id === b.supplier_id)?.name ?? "-"}
                onSave={(v) => updatePrices.mutate({ id: b.id, ...v })}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel className="mt-3" title="Price history" hint="Historia ya bei">
        {history.length === 0 ? (
          <Empty text="No price changes recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2">Date</th>
                  <th className="py-2">Brand</th>
                  <th className="py-2 text-right">Buy /kg</th>
                  <th className="py-2 text-right">Sell /kg</th>
                  <th className="py-2 text-right">Comm /kg</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 40).map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="py-2">{fmtDate(h.changed_at)}</td>
                    <td className="py-2">{brands.find((b) => b.id === h.brand_id)?.name ?? "-"}</td>
                    <td className="py-2 text-right">{TZS(h.supplier_price)}</td>
                    <td className="py-2 text-right">{TZS(h.selling_price)}</td>
                    <td className="py-2 text-right">{TZS(h.commission_rate)}</td>
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

function BrandPriceRow({
  brand,
  supplierName,
  onSave,
}: {
  brand: {
    id: string;
    name: string;
    supplier_price: number;
    selling_price: number;
    commission_rate: number;
  };
  supplierName: string;
  onSave: (v: {
    supplier_price: number;
    selling_price: number;
    commission_rate: number;
  }) => void;
}) {
  const [buy, setBuy] = useState(String(brand.supplier_price));
  const [sell, setSell] = useState(String(brand.selling_price));
  const [comm, setComm] = useState(String(brand.commission_rate));

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{brand.name}</p>
        <span className="text-[11px] text-muted-foreground">{supplierName}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <FieldWrap label="Supplier price /kg">
          <Input inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} />
        </FieldWrap>
        <FieldWrap label="Selling price /kg">
          <Input inputMode="decimal" value={sell} onChange={(e) => setSell(e.target.value)} />
        </FieldWrap>
        <FieldWrap label="Commission /kg">
          <Input inputMode="decimal" value={comm} onChange={(e) => setComm(e.target.value)} />
        </FieldWrap>
        <div className="flex items-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              onSave({
                supplier_price: Number(buy) || 0,
                selling_price: Number(sell) || Number(buy) || 0,
                commission_rate: Number(comm) || 50,
              })
            }
          >
            <Save className="size-4" /> Update
          </Button>
        </div>
      </div>
    </div>
  );
}
