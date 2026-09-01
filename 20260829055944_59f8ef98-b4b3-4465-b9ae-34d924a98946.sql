CREATE TABLE public.stock_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  closed_on date NOT NULL DEFAULT CURRENT_DATE,
  received_kg numeric NOT NULL DEFAULT 0,
  sold_kg numeric NOT NULL DEFAULT 0,
  sample_loss_kg numeric NOT NULL DEFAULT 0,
  loss_cost numeric NOT NULL DEFAULT 0,
  lost_revenue numeric NOT NULL DEFAULT 0,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_closures TO authenticated;
GRANT ALL ON public.stock_closures TO service_role;
ALTER TABLE public.stock_closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own stock closures" ON public.stock_closures FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.cash_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'revenue',
  category text NOT NULL DEFAULT 'other',
  amount numeric NOT NULL DEFAULT 0,
  txn_date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_transactions TO authenticated;
GRANT ALL ON public.cash_transactions TO service_role;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cash transactions" ON public.cash_transactions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_stock_closures_updated_at BEFORE UPDATE ON public.stock_closures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cash_transactions_updated_at BEFORE UPDATE ON public.cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.apply_stock_closure()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.brands
      SET current_kg = 0,
          total_sample_loss_kg = total_sample_loss_kg + NEW.sample_loss_kg
      WHERE id = NEW.brand_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.brands
      SET current_kg = current_kg + OLD.sample_loss_kg,
          total_sample_loss_kg = total_sample_loss_kg - OLD.sample_loss_kg
      WHERE id = OLD.brand_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END; $$;

REVOKE EXECUTE ON FUNCTION public.apply_stock_closure() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;

CREATE TRIGGER trg_stock_closure AFTER INSERT OR DELETE ON public.stock_closures
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_closure();