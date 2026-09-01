import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

export type Brand = {
  id: string;
  name: string;
  supplier_id: string | null;
  supplier_price: number;
  selling_price: number;
  commission_rate: number;
  current_kg: number;
  total_sample_loss_kg: number;
  last_stock_in_date: string | null;
};

export type Supplier = { id: string; name: string; phone: string | null; notes: string | null };

export type Sale = {
  id: string;
  brand_id: string;
  sale_date: string;
  customer_name: string;
  customer_phone: string | null;
  is_credit: boolean;
  kg_sold: number;
  sample_loss_kg: number;
  supplier_price: number;
  selling_price: number;
  commission_rate: number;
  total_amount: number;
  supplier_amount: number;
  commission_amount: number;
  extra_profit: number;
  amount_paid: number;
};

export const useProfile = () =>
  useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

export const useBrands = () =>
  useQuery({
    queryKey: ["brands"],
    queryFn: () =>
      unwrap<Brand[]>(supabase.from("brands").select("*").order("name") as never),
  });

export const useSuppliers = () =>
  useQuery({
    queryKey: ["suppliers"],
    queryFn: () =>
      unwrap<Supplier[]>(supabase.from("suppliers").select("*").order("name") as never),
  });

export const useSales = () =>
  useQuery({
    queryKey: ["sales"],
    queryFn: () =>
      unwrap<Sale[]>(
        supabase.from("sales").select("*").order("sale_date", { ascending: false }) as never,
      ),
  });

export const useGrns = () =>
  useQuery({
    queryKey: ["grns"],
    queryFn: () =>
      unwrap<
        Array<{
          id: string;
          supplier_name: string;
          received_date: string;
          lorry_details: string | null;
          notes: string | null;
          supplier_id: string | null;
        }>
      >(supabase.from("grns").select("*").order("received_date", { ascending: false }) as never),
  });

export const useGrnItems = () =>
  useQuery({
    queryKey: ["grn_items"],
    queryFn: () =>
      unwrap<
        Array<{
          id: string;
          grn_id: string;
          brand_id: string;
          bags: number;
          weight_per_bag: number;
          total_kg: number;
          supplier_price: number;
          selling_price: number;
          commission_rate: number;
        }>
      >(supabase.from("grn_items").select("*") as never),
  });

export const usePayments = () =>
  useQuery({
    queryKey: ["customer_payments"],
    queryFn: () =>
      unwrap<
        Array<{
          id: string;
          customer_name: string;
          amount: number;
          paid_on: string;
          note: string | null;
        }>
      >(
        supabase
          .from("customer_payments")
          .select("*")
          .order("paid_on", { ascending: false }) as never,
      ),
  });

export const useSupplierTxns = () =>
  useQuery({
    queryKey: ["supplier_transactions"],
    queryFn: () =>
      unwrap<
        Array<{
          id: string;
          supplier_id: string;
          txn_type: string;
          amount: number;
          txn_date: string;
          note: string | null;
        }>
      >(
        supabase
          .from("supplier_transactions")
          .select("*")
          .order("txn_date", { ascending: false }) as never,
      ),
  });

export const useExpenses = () =>
  useQuery({
    queryKey: ["business_expenses"],
    queryFn: () =>
      unwrap<
        Array<{
          id: string;
          category: string;
          amount: number;
          expense_date: string;
          note: string | null;
        }>
      >(
        supabase
          .from("business_expenses")
          .select("*")
          .order("expense_date", { ascending: false }) as never,
      ),
  });

export const usePriceHistory = () =>
  useQuery({
    queryKey: ["price_history"],
    queryFn: () =>
      unwrap<
        Array<{
          id: string;
          brand_id: string;
          supplier_price: number;
          selling_price: number;
          commission_rate: number;
          changed_at: string;
        }>
      >(
        supabase
          .from("price_history")
          .select("*")
          .order("changed_at", { ascending: false }) as never,
      ),
  });

export type StockClosure = {
  id: string;
  brand_id: string;
  closed_on: string;
  received_kg: number;
  sold_kg: number;
  sample_loss_kg: number;
  loss_cost: number;
  lost_revenue: number;
  note: string | null;
};

export const useStockClosures = () =>
  useQuery({
    queryKey: ["stock_closures"],
    queryFn: () =>
      unwrap<StockClosure[]>(
        supabase
          .from("stock_closures")
          .select("*")
          .order("closed_on", { ascending: false }) as never,
      ),
  });

export type CashTxn = {
  id: string;
  kind: string;
  category: string;
  amount: number;
  txn_date: string;
  note: string | null;
};

export const useCashTxns = () =>
  useQuery({
    queryKey: ["cash_transactions"],
    queryFn: () =>
      unwrap<CashTxn[]>(
        supabase
          .from("cash_transactions")
          .select("*")
          .order("txn_date", { ascending: false }) as never,
      ),
  });
