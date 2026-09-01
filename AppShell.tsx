import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  TruckIcon,
  ShoppingCart,
  FileBarChart,
  Users,
  Settings,
  LogOut,
  Wallet,
  Banknote,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/queries";
import { useIsAdmin } from "@/lib/billing-queries";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", sw: "Dashibodi", icon: LayoutDashboard },
  { to: "/stock-in", label: "Stock In", sw: "Ingiza", icon: TruckIcon },
  { to: "/stock-out", label: "Sales", sw: "Mauzo", icon: ShoppingCart },
  { to: "/credit", label: "Credit", sw: "Mikopo", icon: Wallet },
  { to: "/cashflow", label: "Cash", sw: "Fedha", icon: Banknote },
  { to: "/suppliers", label: "Suppliers", sw: "Wasambazaji", icon: Users },
  { to: "/reports", label: "Reports", sw: "Ripoti", icon: FileBarChart },
  { to: "/billing", label: "Billing", sw: "Malipo", icon: CreditCard },
  { to: "/settings", label: "Settings", sw: "Mipangilio", icon: Settings },
] as const;

const ADMIN_NAV = {
  to: "/admin-payments",
  label: "Approvals",
  sw: "Idhini",
  icon: ShieldCheck,
} as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const nav = isAdmin ? [...NAV, ADMIN_NAV] : [...NAV];

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <div className="px-2 py-3">
          <p className="font-display text-lg leading-tight font-bold text-primary">Nafaka</p>
          <p className="text-xs text-muted-foreground">
            {profile?.shop_name ?? "Stock Manager"}
          </p>
        </div>
        <nav className="mt-4 flex flex-1 flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.to
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent",
              )}
            >
              <item.icon className="size-4" />
              <span>{item.label}</span>
              <span className="ml-auto text-[10px] opacity-60">{item.sw}</span>
            </Link>
          ))}
        </nav>
        <button
          onClick={signOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </aside>

      <div className="lg:pl-60">
        <header className="no-print sticky top-0 z-20 border-b border-border bg-background/85 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{title}</h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          </div>
        </header>
        <main className="px-4 pt-4 pb-28 lg:pb-10">{children}</main>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-card lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 px-0.5 py-2 text-[9px] font-medium",
              pathname === item.to ? "text-primary" : "text-muted-foreground",
            )}
          >
            <item.icon className="size-4" />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
