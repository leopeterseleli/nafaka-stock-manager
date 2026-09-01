import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TZS } from "@/lib/format";
import { MONTHLY_PRICE, TRIAL_DAYS } from "@/lib/billing";

export function SubscriptionLocked() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-card">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="text-xl font-bold">Subscription needed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your {TRIAL_DAYS}-day free trial has ended. Pay {TZS(MONTHLY_PRICE)} per month to keep
          using the app.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Muda wa majaribio umeisha. Lipa {TZS(MONTHLY_PRICE)} kila mwezi kuendelea.
        </p>
        <Button asChild className="mt-4 w-full">
          <Link to="/billing">Pay now / Lipa sasa</Link>
        </Button>
      </div>
    </div>
  );
}
