-- ============================================================
-- HORIZON FARM — Migration Phases 2 + 3 + 4
-- Exécuter UNE FOIS dans Supabase SQL Editor
-- Idempotent : safe à re-exécuter
-- ============================================================

-- ============================================================
-- PHASE 2 — Infrastructure événements, alertes, WhatsApp
-- ============================================================

-- 2.1.1 business_events
CREATE TABLE IF NOT EXISTS business_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  module_source text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric,
  event_date timestamptz DEFAULT now(),
  linked_document_id text,
  linked_transaction_id text,
  linked_sale_id text,
  severity text DEFAULT 'info',
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE business_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS business_events_owner ON business_events;
CREATE POLICY business_events_owner ON business_events
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_business_events_entity ON business_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_business_events_date ON business_events(event_date DESC);

-- 2.1.2 documents (nouvelle table avec entity linking)
CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  title text NOT NULL,
  file_url text,
  file_type text,
  module_source text,
  entity_type text,
  entity_id text,
  document_category text DEFAULT 'autre',
  notes text,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_owner ON documents;
CREATE POLICY documents_owner ON documents
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- 2.1.3 alertes_center
CREATE TABLE IF NOT EXISTS alertes_center (
  id text PRIMARY KEY,
  title text NOT NULL,
  message text,
  module_source text,
  entity_type text,
  entity_id text,
  severity text DEFAULT 'info',
  status text DEFAULT 'nouvelle',
  action_recommandee text,
  send_whatsapp boolean DEFAULT false,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE alertes_center ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alertes_owner ON alertes_center;
CREATE POLICY alertes_owner ON alertes_center
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- 2.1.4 whatsapp_templates
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id text PRIMARY KEY,
  key text UNIQUE NOT NULL,
  title text,
  message_template text NOT NULL,
  category text,
  severity text,
  active boolean DEFAULT true,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_templates_owner ON whatsapp_templates;
CREATE POLICY whatsapp_templates_owner ON whatsapp_templates
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- 2.1.5 whatsapp_logs
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id text PRIMARY KEY,
  alert_id text,
  recipient text,
  message text,
  status text DEFAULT 'simule',
  provider text DEFAULT 'simulation',
  sent_at timestamptz DEFAULT now(),
  error_message text,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_logs_owner ON whatsapp_logs;
CREATE POLICY whatsapp_logs_owner ON whatsapp_logs
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- ============================================================
-- PHASE 3 — Ventes & Commandes complet
-- ============================================================

CREATE TABLE IF NOT EXISTS sales_orders (
  id text PRIMARY KEY,
  date date NOT NULL,
  client_id text,
  type_document text DEFAULT 'commande',
  statut_commande text DEFAULT 'brouillon',
  statut_paiement text DEFAULT 'non_paye',
  statut_livraison text DEFAULT 'a_livrer',
  montant_ht numeric DEFAULT 0,
  remise numeric DEFAULT 0,
  montant_total numeric DEFAULT 0,
  montant_paye numeric DEFAULT 0,
  reste_a_payer numeric DEFAULT 0,
  moyen_paiement text,
  notes text,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'unite',
  unit_price numeric DEFAULT 0,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  cost_estimated numeric DEFAULT 0,
  margin_estimated numeric DEFAULT 0,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deliveries (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  date_livraison date,
  statut text DEFAULT 'prevue',
  destinataire text,
  adresse text,
  notes text,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id text PRIMARY KEY,
  order_id text NOT NULL,
  numero_facture text,
  date_facture date DEFAULT now(),
  montant_total numeric DEFAULT 0,
  pdf_url text,
  statut text DEFAULT 'emise',
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id text PRIMARY KEY,
  order_id text,
  invoice_id text,
  date_paiement date NOT NULL,
  montant numeric NOT NULL DEFAULT 0,
  moyen_paiement text,
  reference text,
  notes text,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales_opportunities (
  id text PRIMARY KEY,
  opportunity_type text NOT NULL,
  source_type text NOT NULL,
  source_id text,
  title text NOT NULL,
  description text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'unite',
  estimated_value numeric DEFAULT 0,
  estimated_margin numeric DEFAULT 0,
  score numeric DEFAULT 0,
  reason text,
  suggested_clients jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'a_traiter',
  detected_at timestamptz DEFAULT now(),
  converted_sale_id text,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sales_orders_owner ON sales_orders;
CREATE POLICY sales_orders_owner ON sales_orders USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS sales_order_items_owner ON sales_order_items;
CREATE POLICY sales_order_items_owner ON sales_order_items USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS deliveries_owner ON deliveries;
CREATE POLICY deliveries_owner ON deliveries USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS invoices_owner ON invoices;
CREATE POLICY invoices_owner ON invoices USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS payments_owner ON payments;
CREATE POLICY payments_owner ON payments USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());
DROP POLICY IF EXISTS sales_opportunities_owner ON sales_opportunities;
CREATE POLICY sales_opportunities_owner ON sales_opportunities USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- ============================================================
-- PHASE 4 — Colonnes animals & lots pour vente
-- ============================================================

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS poids_objectif numeric,
  ADD COLUMN IF NOT EXISTS date_objectif_vente date,
  ADD COLUMN IF NOT EXISTS sale_readiness_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_readiness_status text DEFAULT 'non_pret',
  ADD COLUMN IF NOT EXISTS pret_vente_recommande boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pret_vente_confirme boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_pret_vente_recommande date,
  ADD COLUMN IF NOT EXISTS date_pret_vente_confirme date,
  ADD COLUMN IF NOT EXISTS raison_pret_vente text;

ALTER TABLE lots
  ADD COLUMN IF NOT EXISTS poids_objectif numeric,
  ADD COLUMN IF NOT EXISTS effectif_vendable integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_readiness_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_readiness_status text DEFAULT 'non_pret',
  ADD COLUMN IF NOT EXISTS pret_vente_recommande boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pret_vente_confirme boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_pret_vente_recommande date,
  ADD COLUMN IF NOT EXISTS date_pret_vente_confirme date,
  ADD COLUMN IF NOT EXISTS raison_pret_vente text;

NOTIFY pgrst, 'reload schema';
