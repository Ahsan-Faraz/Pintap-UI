-- Rename legacy Shopify/Stripe schema to generic store/payout names.

-- stores
ALTER TABLE public.stores RENAME COLUMN shopify_connected TO connected;
ALTER TABLE public.stores RENAME COLUMN shopify_installed_at TO connected_at;
ALTER TABLE public.stores RENAME COLUMN shopify_myshopify_domain TO merchant_domain;
ALTER TABLE public.stores RENAME COLUMN shopify_numeric_id TO external_store_id;
ALTER TABLE public.stores RENAME COLUMN shopify_primary_domain TO primary_domain;
ALTER TABLE public.stores RENAME COLUMN shopify_uninstalled_at TO disconnected_at;

ALTER TABLE public.stores RENAME CONSTRAINT stores_shopify_myshopify_domain_key TO stores_merchant_domain_key;
ALTER TABLE public.stores RENAME CONSTRAINT stores_shopify_numeric_id_key TO stores_external_store_id_key;

-- merchant funding
ALTER TABLE public.merchant_funding_transactions RENAME COLUMN stripe_payment_intent_id TO payment_reference;
ALTER TABLE public.merchant_funding_transactions RENAME COLUMN stripe_checkout_session_id TO checkout_reference;

-- payout batches
ALTER TABLE public.payout_batches RENAME COLUMN stripe_transfer_id TO transfer_reference;

-- store orders (formerly shopify_orders)
ALTER TABLE public.shopify_orders RENAME COLUMN shopify_order_id TO external_order_id;
ALTER TABLE public.shopify_orders RENAME COLUMN shopify_order_number TO external_order_number;

ALTER TABLE public.link_order_attributions RENAME COLUMN shopify_order_id TO store_order_id;

ALTER INDEX idx_loa_shopify_order RENAME TO idx_loa_store_order;
ALTER TABLE public.link_order_attributions
  RENAME CONSTRAINT link_order_attributions_shopify_order_id_fkey TO link_order_attributions_store_order_id_fkey;
ALTER TABLE public.link_order_attributions
  RENAME CONSTRAINT link_order_attributions_link_id_shopify_order_id_discount_c_key TO link_order_attributions_link_id_store_order_id_discount_c_key;

ALTER TABLE public.shopify_orders RENAME TO store_orders;

ALTER TABLE public.store_orders RENAME CONSTRAINT shopify_orders_pkey TO store_orders_pkey;
ALTER TABLE public.store_orders RENAME CONSTRAINT shopify_orders_store_id_fkey TO store_orders_store_id_fkey;
ALTER TABLE public.store_orders
  RENAME CONSTRAINT shopify_orders_store_id_shopify_order_id_key TO store_orders_store_id_external_order_id_key;
ALTER INDEX idx_shopify_orders_store RENAME TO idx_store_orders_store;

ALTER POLICY shopify_orders_select_member_or_admin ON public.store_orders
  RENAME TO store_orders_select_member_or_admin;

-- store connections
ALTER TABLE public.shopify_connections RENAME COLUMN myshopify_domain TO merchant_domain;
ALTER TABLE public.shopify_connections RENAME TO store_connections;

ALTER TABLE public.store_connections RENAME CONSTRAINT shopify_connections_pkey TO store_connections_pkey;
ALTER TABLE public.store_connections RENAME CONSTRAINT shopify_connections_installed_by_fkey TO store_connections_installed_by_fkey;
ALTER TABLE public.store_connections RENAME CONSTRAINT shopify_connections_store_id_fkey TO store_connections_store_id_fkey;
ALTER TABLE public.store_connections RENAME CONSTRAINT shopify_connections_myshopify_domain_key TO store_connections_merchant_domain_key;
ALTER TABLE public.store_connections RENAME CONSTRAINT shopify_connections_numeric_id_key TO store_connections_numeric_id_key;
ALTER INDEX idx_shopify_connections_installed_by RENAME TO idx_store_connections_installed_by;
ALTER INDEX idx_shopify_connections_store RENAME TO idx_store_connections_store;

ALTER POLICY shopify_connections_admin_all ON public.store_connections
  RENAME TO store_connections_admin_all;

-- store domains
ALTER TABLE public.shopify_store_domains RENAME TO store_domains;

ALTER TABLE public.store_domains RENAME CONSTRAINT shopify_store_domains_pkey TO store_domains_pkey;
ALTER TABLE public.store_domains RENAME CONSTRAINT shopify_store_domains_domain_key TO store_domains_domain_key;
ALTER TABLE public.store_domains RENAME CONSTRAINT shopify_store_domains_store_id_fkey TO store_domains_store_id_fkey;
ALTER INDEX idx_shopify_store_domains_store RENAME TO idx_store_domains_store;

ALTER POLICY shopify_store_domains_select ON public.store_domains RENAME TO store_domains_select;
ALTER POLICY ssd_admin_delete ON public.store_domains RENAME TO store_domains_admin_delete;
ALTER POLICY ssd_admin_insert ON public.store_domains RENAME TO store_domains_admin_insert;
ALTER POLICY ssd_admin_update ON public.store_domains RENAME TO store_domains_admin_update;

-- payout accounts
ALTER TABLE public.stripe_connected_accounts RENAME COLUMN stripe_account_id TO external_account_id;
ALTER TABLE public.stripe_connected_accounts RENAME TO payout_accounts;

ALTER TABLE public.payout_accounts RENAME CONSTRAINT stripe_connected_accounts_pkey TO payout_accounts_pkey;
ALTER TABLE public.payout_accounts RENAME CONSTRAINT stripe_connected_accounts_stripe_account_id_key TO payout_accounts_external_account_id_key;
ALTER TABLE public.payout_accounts RENAME CONSTRAINT stripe_connected_accounts_user_id_fkey TO payout_accounts_user_id_fkey;
ALTER TABLE public.payout_accounts RENAME CONSTRAINT stripe_connected_accounts_user_id_key TO payout_accounts_user_id_key;

ALTER POLICY sca_select_own_or_admin ON public.payout_accounts
  RENAME TO payout_accounts_select_own_or_admin;
