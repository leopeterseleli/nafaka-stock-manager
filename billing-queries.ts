import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PaymentMethod, PaymentSubmission, Subscription } from "@/lib/billing";

export const useSubscription = () =>
  useQuery({
    queryKey: ["subscription"],
    queryFn: async (): Promise<Subscription | null> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("user_id, trial_ends_at, paid_until")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return data as Subscription;
      const { data: created, error: insErr } = await supabase
        .from("subscriptions")
        .insert({ user_id: uid })
        .select("user_id, trial_ends_at, paid_until")
        .single();
      if (insErr) throw new Error(insErr.message);
      return created as Subscription;
    },
  });

export const useIsAdmin = () =>
  useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return !!data;
    },
  });

export const usePaymentMethods = () =>
  useQuery({
    queryKey: ["payment-methods"],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("*")
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as PaymentMethod[];
    },
  });

export const useMyPayments = () =>
  useQuery({
    queryKey: ["my-payments"],
    queryFn: async (): Promise<PaymentSubmission[]> => {
      const { data, error } = await supabase
        .from("payment_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as PaymentSubmission[];
    },
  });
