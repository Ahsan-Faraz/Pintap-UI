/**
 * Generated Supabase database types — DO NOT EDIT BY HAND.
 *
 * Regenerate after any schema change with the Supabase MCP
 * `generate_typescript_types` tool (project `hudtnxauwaranhddjakn`) or
 * `supabase gen types typescript --project-id hudtnxauwaranhddjakn`.
 */
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
      activity_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          event_data: Json
          event_type: string
          id: string
          scope_id: string | null
          scope_type: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          scope_id?: string | null
          scope_type: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          scope_id?: string | null
          scope_type?: string
        }
        Relationships: []
      }
      campaign_discount_codes: {
        Row: {
          campaign_id: string
          claimed_by_link_id: string | null
          code: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          campaign_id: string
          claimed_by_link_id?: string | null
          code: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          campaign_id?: string
          claimed_by_link_id?: string | null
          code?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_discount_codes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_discount_codes_claimed_by_link_id_fkey"
            columns: ["claimed_by_link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          commission_percent: number | null
          created_at: string
          created_by: string | null
          destination_url: string | null
          discount_percent: number | null
          end_at: string | null
          id: string
          is_active: boolean
          name: string
          product_handle: string | null
          product_id: string | null
          start_at: string
          status: string
          store_id: string
          terms: string
          updated_at: string
        }
        Insert: {
          commission_percent?: number | null
          created_at?: string
          created_by?: string | null
          destination_url?: string | null
          discount_percent?: number | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_handle?: string | null
          product_id?: string | null
          start_at?: string
          status?: string
          store_id: string
          terms?: string
          updated_at?: string
        }
        Update: {
          commission_percent?: number | null
          created_at?: string
          created_by?: string | null
          destination_url?: string | null
          discount_percent?: number | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_handle?: string | null
          product_id?: string | null
          start_at?: string
          status?: string
          store_id?: string
          terms?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_ledger_entries: {
        Row: {
          amount_minor: number
          attribution_id: string | null
          available_at: string | null
          created_at: string
          currency: string
          id: string
          link_id: string | null
          metadata: Json
          status: string
          store_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_minor?: number
          attribution_id?: string | null
          available_at?: string | null
          created_at?: string
          currency: string
          id?: string
          link_id?: string | null
          metadata?: Json
          status?: string
          store_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          attribution_id?: string | null
          available_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          link_id?: string | null
          metadata?: Json
          status?: string
          store_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_ledger_entries_attribution_id_fkey"
            columns: ["attribution_id"]
            isOneToOne: false
            referencedRelation: "link_order_attributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_entries_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_entries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_ledger_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_clicks: {
        Row: {
          clicked_at: string
          country_code: string | null
          id: string
          link_id: string
          source: string | null
          user_agent: string | null
          visitor_hash: string | null
        }
        Insert: {
          clicked_at?: string
          country_code?: string | null
          id?: string
          link_id: string
          source?: string | null
          user_agent?: string | null
          visitor_hash?: string | null
        }
        Update: {
          clicked_at?: string
          country_code?: string | null
          id?: string
          link_id?: string
          source?: string | null
          user_agent?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
        ]
      }
      link_order_attributions: {
        Row: {
          campaign_id: string
          commission_amount_minor: number
          created_at: string
          currency: string
          discount_code_id: string
          id: string
          link_id: string
          order_amount_minor: number
          store_order_id: string
          source: string
          status: string
        }
        Insert: {
          campaign_id: string
          commission_amount_minor?: number
          created_at?: string
          currency: string
          discount_code_id: string
          id?: string
          link_id: string
          order_amount_minor?: number
          store_order_id: string
          source?: string
          status?: string
        }
        Update: {
          campaign_id?: string
          commission_amount_minor?: number
          created_at?: string
          currency?: string
          discount_code_id?: string
          id?: string
          link_id?: string
          order_amount_minor?: number
          store_order_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_order_attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_order_attributions_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "campaign_discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_order_attributions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_order_attributions_store_order_id_fkey"
            columns: ["store_order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          brand: string | null
          campaign_id: string | null
          created_at: string
          deleted_at: string | null
          destination_url: string
          discount_code_id: string | null
          id: string
          image_url: string | null
          is_verified: boolean
          name: string
          short_code: string
          short_url: string
          source_host: string
          status: string
          store_id: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          campaign_id?: string | null
          created_at?: string
          deleted_at?: string | null
          destination_url: string
          discount_code_id?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean
          name: string
          short_code: string
          short_url?: string
          source_host?: string
          status?: string
          store_id?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          campaign_id?: string | null
          created_at?: string
          deleted_at?: string | null
          destination_url?: string
          discount_code_id?: string | null
          id?: string
          image_url?: string | null
          is_verified?: boolean
          name?: string
          short_code?: string
          short_url?: string
          source_host?: string
          status?: string
          store_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "campaign_discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_funding_transactions: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          status: string
          store_id: string
          checkout_reference: string | null
          payment_reference: string | null
        }
        Insert: {
          amount_minor?: number
          created_at?: string
          currency: string
          id?: string
          status?: string
          store_id: string
          checkout_reference?: string | null
          payment_reference?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          status?: string
          store_id?: string
          checkout_reference?: string | null
          payment_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchant_funding_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      og_image_cache: {
        Row: {
          fetched_at: string
          image_url: string | null
          page_url: string
          title: string | null
          url_hash: string
        }
        Insert: {
          fetched_at?: string
          image_url?: string | null
          page_url: string
          title?: string | null
          url_hash: string
        }
        Update: {
          fetched_at?: string
          image_url?: string | null
          page_url?: string
          title?: string | null
          url_hash?: string
        }
        Relationships: []
      }
      payout_batches: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          paid_at: string | null
          status: string
          transfer_reference: string | null
          user_id: string
        }
        Insert: {
          amount_minor?: number
          created_at?: string
          currency: string
          id?: string
          paid_at?: string | null
          status?: string
          transfer_reference?: string | null
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          paid_at?: string | null
          status?: string
          transfer_reference?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accepted_terms: boolean
          avatar_url: string | null
          country: string | null
          created_at: string
          deleted_at: string | null
          email: string
          first_name: string
          gender: string | null
          id: string
          last_name: string
          phone: string | null
          social_profiles: Json
          updated_at: string
        }
        Insert: {
          accepted_terms?: boolean
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          first_name?: string
          gender?: string | null
          id: string
          last_name?: string
          phone?: string | null
          social_profiles?: Json
          updated_at?: string
        }
        Update: {
          accepted_terms?: boolean
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string
          phone?: string | null
          social_profiles?: Json
          updated_at?: string
        }
        Relationships: []
      }
      store_connections: {
        Row: {
          access_token_encrypted: string | null
          id: string
          installed_at: string
          installed_by: string | null
          is_active: boolean
          merchant_domain: string
          numeric_id: string | null
          primary_domain: string | null
          scopes: string[]
          store_id: string
          uninstalled_at: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          id?: string
          installed_at?: string
          installed_by?: string | null
          is_active?: boolean
          merchant_domain: string
          numeric_id?: string | null
          primary_domain?: string | null
          scopes?: string[]
          store_id: string
          uninstalled_at?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          id?: string
          installed_at?: string
          installed_by?: string | null
          is_active?: boolean
          merchant_domain?: string
          numeric_id?: string | null
          primary_domain?: string | null
          scopes?: string[]
          store_id?: string
          uninstalled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_connections_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_connections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          created_at: string
          currency: string
          external_order_id: string
          external_order_number: string
          id: string
          processed_at: string
          raw_payload: Json | null
          store_id: string
          total_amount_minor: number
        }
        Insert: {
          created_at?: string
          currency: string
          external_order_id: string
          external_order_number?: string
          id?: string
          processed_at?: string
          raw_payload?: Json | null
          store_id: string
          total_amount_minor?: number
        }
        Update: {
          created_at?: string
          currency?: string
          external_order_id?: string
          external_order_number?: string
          id?: string
          processed_at?: string
          raw_payload?: Json | null
          store_id?: string
          total_amount_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_domains: {
        Row: {
          domain: string
          id: string
          is_active: boolean
          is_primary: boolean
          store_id: string
        }
        Insert: {
          domain: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          store_id: string
        }
        Update: {
          domain?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          id: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          category: string | null
          connected: boolean
          connected_at: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          disconnected_at: string | null
          external_store_id: string | null
          id: string
          logo_url: string | null
          merchant_domain: string | null
          name: string
          primary_domain: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          connected?: boolean
          connected_at?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          disconnected_at?: string | null
          external_store_id?: string | null
          id?: string
          logo_url?: string | null
          merchant_domain?: string | null
          name: string
          primary_domain?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          connected?: boolean
          connected_at?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          disconnected_at?: string | null
          external_store_id?: string | null
          id?: string
          logo_url?: string | null
          merchant_domain?: string | null
          name?: string
          primary_domain?: string | null
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payout_accounts: {
        Row: {
          account_holder: string | null
          bank_name: string | null
          bic: string | null
          charges_enabled: boolean
          created_at: string
          details_submitted: boolean
          external_account_id: string | null
          iban: string | null
          id: string
          method: string
          payouts_enabled: boolean
          requirements_currently_due: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          bank_name?: string | null
          bic?: string | null
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          external_account_id?: string | null
          iban?: string | null
          id?: string
          method?: string
          payouts_enabled?: boolean
          requirements_currently_due?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          bank_name?: string | null
          bic?: string | null
          charges_enabled?: boolean
          created_at?: string
          details_submitted?: boolean
          external_account_id?: string | null
          iban?: string | null
          id?: string
          method?: string
          payouts_enabled?: boolean
          requirements_currently_due?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payout_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_cancel_payout: { Args: { p_batch_id: string }; Returns: undefined }
      admin_kpis: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_campaigns: number
          clicks: number
          commission_owed_minor: number
          connected_stores: number
          currency: string
          links: number
          orders: number
          payout_pending_minor: number
          users: number
        }[]
      }
      admin_mark_payout_paid: {
        Args: { p_batch_id: string; p_reference?: string }
        Returns: undefined
      }
      admin_payable_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          account_holder: string | null
          account_id: string | null
          available_minor: number
          bank_name: string | null
          bic: string | null
          currency: string
          email: string
          first_name: string
          iban: string | null
          last_name: string
          payouts_enabled: boolean
          pending_minor: number
          user_id: string
        }[]
      }
      admin_queue_payout: { Args: { p_user_id: string }; Returns: string }
      admin_set_attribution_status: {
        Args: { p_attribution_id: string; p_status: string }
        Returns: undefined
      }
      campaign_code_counts: {
        Args: { p_campaign_ids: string[] }
        Returns: {
          campaign_id: string
          codes_available: number
          codes_claimed: number
          codes_total: number
        }[]
      }
      has_role: { Args: { _role: string }; Returns: boolean }
      is_campaign_store_member: {
        Args: { _campaign_id: string }
        Returns: boolean
      }
      is_store_member: { Args: { _store_id: string }; Returns: boolean }
      link_click_counts: {
        Args: { p_link_ids: string[] }
        Returns: {
          clicks: number
          link_id: string
        }[]
      }
      owns_link: { Args: { _link_id: string }; Returns: boolean }
      claim_discount_code_for_link: {
        Args: { p_campaign_id: string; p_link_id: string }
        Returns: string
      }
      release_discount_code_for_link: {
        Args: { p_link_id: string }
        Returns: undefined
      }
      request_payout: { Args: Record<PropertyKey, never>; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
