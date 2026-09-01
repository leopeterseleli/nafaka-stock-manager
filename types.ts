export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          commission_rate: number
          created_at: string
          current_kg: number
          id: string
          last_stock_in_date: string | null
          name: string
          selling_price: number
          supplier_id: string | null
          supplier_price: number
          total_sample_loss_kg: number
          user_id: string
        }
        Insert: {
          commission_rate?: number
          created_at?: string
          current_kg?: number
          id?: string
          last_stock_in_date?: string | null
          name: string
          selling_price?: number
          supplier_id?: string | null
          supplier_price?: number
          total_sample_loss_kg?: number
          user_id: string
        }
        Update: {
          commission_rate?: number
          created_at?: string
          current_kg?: number
          id?: string
          last_stock_in_date?: string | null
          name?: string
          selling_price?: number
          supplier_id?: string | null
          supplier_price?: number
          total_sample_loss_kg?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cash_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          kind: string
          note: string | null
          txn_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          txn_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          kind?: string
          note?: string | null
          txn_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          customer_name: string
          id: string
          note: string | null
          paid_on: string
          sale_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_name: string
          id?: string
          note?: string | null
          paid_on?: string
          sale_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_name?: string
          id?: string
          note?: string | null
          paid_on?: string
          sale_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          bags: number
          brand_id: string
          commission_rate: number
          created_at: string
          grn_id: string
          id: string
          selling_price: number
          supplier_price: number
          total_kg: number
          user_id: string
          weight_per_bag: number
        }
        Insert: {
          bags?: number
          brand_id: string
          commission_rate?: number
          created_at?: string
          grn_id: string
          id?: string
          selling_price?: number
          supplier_price?: number
          total_kg?: number
          user_id: string
          weight_per_bag?: number
        }
        Update: {
          bags?: number
          brand_id?: string
          commission_rate?: number
          created_at?: string
          grn_id?: string
          id?: string
          selling_price?: number
          supplier_price?: number
          total_kg?: number
          user_id?: string
          weight_per_bag?: number
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "grns"
            referencedColumns: ["id"]
          },
        ]
      }
      grns: {
        Row: {
          created_at: string
          id: string
          lorry_details: string | null
          notes: string | null
          received_date: string
          supplier_id: string | null
          supplier_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lorry_details?: string | null
          notes?: string | null
          received_date?: string
          supplier_id?: string | null
          supplier_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lorry_details?: string | null
          notes?: string | null
          received_date?: string
          supplier_id?: string | null
          supplier_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          used: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          used?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          used?: boolean
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          active: boolean
          created_at: string
          details: string
          id: string
          kind: string
          label: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          details: string
          id?: string
          kind?: string
          label: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          details?: string
          id?: string
          kind?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      payment_submissions: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          months: number
          note: string | null
          payer_name: string | null
          reference: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          months?: number
          note?: string | null
          payer_name?: string | null
          reference: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          months?: number
          note?: string | null
          payer_name?: string | null
          reference?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: {
        Row: {
          brand_id: string
          changed_at: string
          commission_rate: number
          id: string
          selling_price: number
          supplier_price: number
          user_id: string
        }
        Insert: {
          brand_id: string
          changed_at?: string
          commission_rate?: number
          id?: string
          selling_price: number
          supplier_price: number
          user_id: string
        }
        Update: {
          brand_id?: string
          changed_at?: string
          commission_rate?: number
          id?: string
          selling_price?: number
          supplier_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string
          security_answer_hash: string | null
          security_question: string | null
          shop_name: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone: string
          security_answer_hash?: string | null
          security_question?: string | null
          shop_name?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string
          security_answer_hash?: string | null
          security_question?: string | null
          shop_name?: string
        }
        Relationships: []
      }
      sales: {
        Row: {
          amount_paid: number
          brand_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          customer_name: string
          customer_phone: string | null
          extra_profit: number
          id: string
          is_credit: boolean
          kg_sold: number
          sale_date: string
          sample_loss_kg: number
          selling_price: number
          supplier_amount: number
          supplier_price: number
          total_amount: number
          user_id: string
        }
        Insert: {
          amount_paid?: number
          brand_id: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          extra_profit?: number
          id?: string
          is_credit?: boolean
          kg_sold?: number
          sale_date?: string
          sample_loss_kg?: number
          selling_price?: number
          supplier_amount?: number
          supplier_price?: number
          total_amount?: number
          user_id: string
        }
        Update: {
          amount_paid?: number
          brand_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          extra_profit?: number
          id?: string
          is_credit?: boolean
          kg_sold?: number
          sale_date?: string
          sample_loss_kg?: number
          selling_price?: number
          supplier_amount?: number
          supplier_price?: number
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_closures: {
        Row: {
          brand_id: string
          closed_on: string
          created_at: string
          id: string
          loss_cost: number
          lost_revenue: number
          note: string | null
          received_kg: number
          sample_loss_kg: number
          sold_kg: number
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id: string
          closed_on?: string
          created_at?: string
          id?: string
          loss_cost?: number
          lost_revenue?: number
          note?: string | null
          received_kg?: number
          sample_loss_kg?: number
          sold_kg?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string
          closed_on?: string
          created_at?: string
          id?: string
          loss_cost?: number
          lost_revenue?: number
          note?: string | null
          received_kg?: number
          sample_loss_kg?: number
          sold_kg?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_closures_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          paid_until: string | null
          trial_ends_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          paid_until?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          paid_until?: string | null
          trial_ends_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          supplier_id: string
          txn_date: string
          txn_type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          supplier_id: string
          txn_date?: string
          txn_type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          supplier_id?: string
          txn_date?: string
          txn_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
