import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { billingStatus } from "@/lib/billing";
import { useSubscription } from "@/lib/billing-queries";
import { SubscriptionLocked } from "@/components/SubscriptionLocked";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: sub, isLoading } = useSubscription();
  const status = billingStatus(sub);
  const allowed = pathname === "/billing" || pathname === "/settings";

  if (isLoading) return null;
  if (!status.active && !allowed) return <SubscriptionLocked />;

  return <Outlet />;
}
