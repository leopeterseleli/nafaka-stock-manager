import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Wheat, PackageCheck, Receipt, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nafaka Stock Manager — Stock, Sales & Commission for Nafaka Shops" },
      {
        name: "description",
        content:
          "Track rice, beans and maize by brand and KG. Record goods received, sales, commission, extra profit, supplier ledgers and customer credit in TZS.",
      },
      {
        property: "og:title",
        content: "Nafaka Stock Manager — Stock, Sales & Commission",
      },
      {
        property: "og:description",
        content:
          "Inventory and financial management for Tanzanian wholesale nafaka shops. Brands, KG, commission, credit and reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wheat className="size-5" />
          </span>
          <span className="font-display text-lg font-bold">Nafaka</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-5xl px-5 pt-8 pb-16">
        <p className="text-xs font-semibold tracking-widest text-accent-foreground uppercase">
          Kwa maduka ya jumla ya nafaka
        </p>
        <h1 className="mt-3 max-w-2xl text-4xl leading-tight font-bold sm:text-5xl">
          Every bag, every kilo, every shilingi — tracked.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Record lorries as Goods Received Notes, sell by brand and KG, and keep supplier money,
          your commission and your extra profit completely separate.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Anza sasa — Get started</Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: PackageCheck,
              title: "Stock by brand & KG",
              body: "GRN per lorry, bags × weight per bag, out-of-stock and 60-day aging alerts.",
            },
            {
              icon: Receipt,
              title: "Commission vs profit",
              body: "50 TZS/kg commission and selling-price margin reported separately, never mixed.",
            },
            {
              icon: TrendingUp,
              title: "Credit & ledgers",
              body: "Supplier balances, customer debts and a red flag after 21 unpaid days.",
            },
          ].map((f) => (
            <div key={f.title} className="stat-card p-5">
              <f.icon className="size-5 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
