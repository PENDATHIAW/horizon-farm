-- ============================================================
-- REPAIR HORIZON FARM: colonnes manquantes + reload schema cache
-- A executer dans Supabase SQL Editor si les CRUD affichent:
-- "Could not find the ... column ... in the schema cache"
-- ============================================================

do $$
declare
  r record;
begin
  for r in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and connamespace = 'public'::regnamespace
  loop
    execute format('alter table %s drop constraint if exists %I', r.table_name, r.conname);
  end loop;
end $$;

create or replace function public.hf_ensure_text_column(p_table text, p_column text)
returns void
language plpgsql
as $$
declare
  v_type text;
begin
  if to_regclass(format('public.%I', p_table)) is null then
    return;
  end if;

  select format_type(a.atttypid, a.atttypmod) into v_type
  from pg_attribute a
  where a.attrelid = format('public.%I', p_table)::regclass
    and a.attname = p_column
    and not a.attisdropped;

  if v_type is null then
    execute format('alter table public.%I add column %I text', p_table, p_column);
  elsif v_type <> 'text' then
    execute format('alter table public.%I alter column %I drop default', p_table, p_column);
    execute format('alter table public.%I alter column %I type text using %I::text', p_table, p_column, p_column);
  end if;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  if to_jsonb(new) ? 'updated_at' then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

do $$
declare
  t text;
  id_tables text[] := array[
    'animals','lots','clients','fournisseurs','transactions','investissements','cultures','vaccins','veterinaires','tracabilite',
    'stocks','treasury_movements','accounting_documents','alimentation_logs','production_oeufs_logs','animal_purchases','veterinary_rounds','veterinary_interventions','veterinary_intervention_targets','animal_health_records','animal_weight_records','intervention_medications','veterinary_intervention_templates','reproduction_events','sensor_devices','sensor_readings',
    'camera_devices','business_plans','bp_investment_lines','bp_recurring_costs','bp_revenue_projections','bp_funding_sources','bp_links','bp_risks','price_catalog','bp_versions','bp_lines_history','alertes_center','alertes_history','alertes_settings','whatsapp_notifications','whatsapp_templates','whatsapp_logs'
  ];
begin
  foreach t in array id_tables loop
    if to_regclass(format('public.%I', t)) is not null then
      perform public.hf_ensure_text_column(t, 'id');
      execute format('alter table public.%I alter column id drop default', t);
    end if;
  end loop;

  perform public.hf_ensure_text_column('treasury_movements', 'transaction_id');
  perform public.hf_ensure_text_column('treasury_movements', 'account_id');
  perform public.hf_ensure_text_column('accounting_documents', 'transaction_id');
  perform public.hf_ensure_text_column('accounting_documents', 'entry_id');
  perform public.hf_ensure_text_column('transactions', 'client_id');
  perform public.hf_ensure_text_column('transactions', 'fournisseur_id');
  perform public.hf_ensure_text_column('transactions', 'related_id');
  perform public.hf_ensure_text_column('alimentation_logs', 'animal_id');
  perform public.hf_ensure_text_column('alimentation_logs', 'lot_id');
  perform public.hf_ensure_text_column('alimentation_logs', 'cible_id');
  perform public.hf_ensure_text_column('alimentation_logs', 'fournisseur_id');
  perform public.hf_ensure_text_column('production_oeufs_logs', 'lot_id');
  perform public.hf_ensure_text_column('veterinary_interventions', 'round_id');
  perform public.hf_ensure_text_column('veterinary_interventions', 'veterinaire_id');
  perform public.hf_ensure_text_column('veterinary_intervention_targets', 'intervention_id');
  perform public.hf_ensure_text_column('veterinary_intervention_targets', 'target_id');
  perform public.hf_ensure_text_column('animal_health_records', 'animal_id');
  perform public.hf_ensure_text_column('animal_health_records', 'veterinaire_id');
  perform public.hf_ensure_text_column('animal_health_records', 'intervention_id');
  perform public.hf_ensure_text_column('animal_weight_records', 'animal_id');
  perform public.hf_ensure_text_column('intervention_medications', 'intervention_id');
  perform public.hf_ensure_text_column('intervention_medications', 'stock_id');
  perform public.hf_ensure_text_column('reproduction_events', 'femelle_id');
  perform public.hf_ensure_text_column('reproduction_events', 'male_id');
  perform public.hf_ensure_text_column('sensor_readings', 'device_id');
end $$;

alter table public.lots add column if not exists photo_url text;
alter table public.lots add column if not exists name text;
alter table public.lots add column if not exists type text;
alter table public.lots add column if not exists phase text;
alter table public.lots add column if not exists initial_count integer default 0;
alter table public.lots add column if not exists current_count integer default 0;
alter table public.lots add column if not exists mortality integer default 0;
alter table public.lots add column if not exists malades integer default 0;
alter table public.lots add column if not exists vols integer default 0;
alter table public.lots add column if not exists vendus integer default 0;
alter table public.lots add column if not exists reformes integer default 0;
alter table public.lots add column if not exists sorties integer default 0;
alter table public.lots add column if not exists oeufs_casses integer default 0;
alter table public.lots add column if not exists taux_ponte numeric default 0;
alter table public.lots add column if not exists productionjour integer default 0;
alter table public.lots add column if not exists weight_avg numeric default 0;
alter table public.lots add column if not exists ic numeric default 0;
alter table public.lots add column if not exists revenu_estime numeric default 0;
alter table public.lots add column if not exists marge numeric default 0;
alter table public.lots add column if not exists scores_sante numeric default 0;
alter table public.lots add column if not exists frais_sante numeric default 0;
alter table public.lots add column if not exists health_status text default 'sain';
alter table public.lots add column if not exists status text default 'actif';
alter table public.lots add column if not exists autres_frais numeric default 0;
alter table public.lots add column if not exists prix_vente_prevu numeric default 0;
alter table public.lots add column if not exists prix_vente_reel numeric default 0;
alter table public.lots add column if not exists cout_poussins numeric default 0;
alter table public.lots add column if not exists date_debut date;
alter table public.lots add column if not exists date_fin_prevue date;
alter table public.lots add column if not exists date_fin_reelle date;
alter table public.lots add column if not exists duree_cycle_valeur numeric;
alter table public.lots add column if not exists duree_cycle_unite text;
alter table public.lots add column if not exists age_lot_jours numeric;

alter table public.animals add column if not exists tag text;
alter table public.animals add column if not exists photo_url text;
alter table public.animals add column if not exists race text;
alter table public.animals add column if not exists qr_url text;
alter table public.animals add column if not exists historique_poids jsonb default '[]'::jsonb;
alter table public.animals add column if not exists historique_sante jsonb default '[]'::jsonb;
alter table public.animals add column if not exists traitements jsonb default '[]'::jsonb;
alter table public.animals add column if not exists score_sante numeric default 0;
alter table public.animals add column if not exists health_status text default 'sain';
alter table public.animals add column if not exists status text default 'actif';
alter table public.animals add column if not exists mode_acquisition text default 'achat';
alter table public.animals add column if not exists date_achat date;
alter table public.animals add column if not exists date_naissance date;
alter table public.animals add column if not exists date_entree_ferme date;
alter table public.animals add column if not exists fournisseur_vendeur text;
alter table public.animals add column if not exists mere_id text;
alter table public.animals add column if not exists pere_id text;
alter table public.animals add column if not exists portee_id text;
alter table public.animals add column if not exists notes_reproduction text;
alter table public.animals add column if not exists en_gestation boolean default false;
alter table public.animals add column if not exists date_debut_gestation date;
alter table public.animals add column if not exists date_prevue_mise_bas date;
alter table public.animals add column if not exists male_reproducteur_id text;
alter table public.animals add column if not exists statut_reproduction text default 'inconnu';
alter table public.animals add column if not exists traitements_notes text;

alter table public.animals add column if not exists frais_sante numeric default 0;
alter table public.animals add column if not exists autres_frais numeric default 0;
alter table public.animals add column if not exists date_vente date;
alter table public.animals add column if not exists prix_vente_reel numeric default 0;
alter table public.animals add column if not exists client_id text;
alter table public.animals add column if not exists moyen_paiement text;
alter table public.animals add column if not exists commentaire_vente text;
alter table public.animals add column if not exists date_deces date;
alter table public.animals add column if not exists cause_deces text;
alter table public.animals add column if not exists valeur_perte_estimee numeric default 0;
alter table public.animals add column if not exists commentaire_deces text;
alter table public.animals add column if not exists date_vol_detecte date;
alter table public.animals add column if not exists lieu_vol text;
alter table public.animals add column if not exists commentaire_vol text;
alter table public.animals add column if not exists date_reforme date;
alter table public.animals add column if not exists motif_reforme text;
alter table public.animals add column if not exists valeur_residuelle numeric default 0;
alter table public.animals add column if not exists commentaire_reforme text;
alter table public.animals add column if not exists date_detection_maladie date;
alter table public.animals add column if not exists symptomes text;
alter table public.animals add column if not exists traitement_prevu text;
alter table public.animals add column if not exists veterinaire_id text;
alter table public.animals add column if not exists cout_traitement_estime numeric default 0;
alter table public.animals add column if not exists date_debut_traitement date;
alter table public.animals add column if not exists date_fin_traitement_prevue date;
alter table public.animals add column if not exists traitement_en_cours text;
alter table public.animals add column if not exists cout_traitement numeric default 0;
alter table public.animals add column if not exists raison_surveillance text;
alter table public.animals add column if not exists date_prochaine_verification date;
alter table public.animals add column if not exists ras_veterinaire text;
alter table public.animals add column if not exists source text default 'manuel';
update public.animals set frais_sante = sante where coalesce(frais_sante, 0) = 0 and coalesce(sante, 0) > 0;
update public.animals set prix_vente_reel = sale_price where coalesce(prix_vente_reel, 0) = 0 and coalesce(sale_price, 0) > 0;
update public.animals set health_status = 'sain', status = 'actif' where status = 'sain';


update public.animals set date_naissance = naissance where date_naissance is null and naissance is not null;
update public.animals set mode_acquisition = 'achat' where mode_acquisition is null;
update public.animals set statut_reproduction = case when sexe = 'F' then coalesce(statut_reproduction, 'inconnu') else coalesce(statut_reproduction, 'non_reproductrice') end where statut_reproduction is null;

update public.animals
set health_status = status
where status in ('sain','malade','blesse','sous_traitement','a_surveiller')
  and (health_status is null or health_status = '' or health_status = 'sain');

update public.animals
set status = 'actif'
where status is null or status in ('sain','malade','blesse','sous_traitement','a_surveiller');

alter table public.clients add column if not exists photo_url text;
alter table public.clients add column if not exists nom text;
alter table public.clients add column if not exists tel text;
alter table public.clients add column if not exists whatsapp text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists adresse text;
alter table public.clients add column if not exists gps text;
alter table public.clients add column if not exists type text;
alter table public.clients add column if not exists statut text default 'actif';
alter table public.clients add column if not exists score numeric default 0;
alter table public.clients add column if not exists totalachats numeric default 0;
alter table public.clients add column if not exists dernierecommande date;
alter table public.clients add column if not exists prefs text;
alter table public.clients add column if not exists historique_achats text;
alter table public.clients add column if not exists historique_communications text;
alter table public.clients add column if not exists notes_internes text;

alter table public.transactions add column if not exists module_lie text;
alter table public.transactions add column if not exists related_id text;
alter table public.transactions add column if not exists client_id text;
alter table public.transactions add column if not exists fournisseur_id text;
alter table public.transactions add column if not exists statut text default 'paye';
alter table public.transactions add column if not exists justificatif_url text;
alter table public.transactions add column if not exists treasury_account_id text;
alter table public.transactions add column if not exists accounting_entry_id text;

alter table public.stocks add column if not exists photo_url text;
alter table public.stocks add column if not exists prixunit numeric default 0;

alter table public.fournisseurs add column if not exists photo_url text;
alter table public.fournisseurs add column if not exists nom text;
alter table public.fournisseurs add column if not exists tel text;
alter table public.fournisseurs add column if not exists whatsapp text;
alter table public.fournisseurs add column if not exists email text;
alter table public.fournisseurs add column if not exists categorie text;
alter table public.fournisseurs add column if not exists statut text default 'actif';
alter table public.fournisseurs add column if not exists contact text;
alter table public.fournisseurs add column if not exists note numeric default 0;
alter table public.fournisseurs add column if not exists dettes numeric default 0;
alter table public.fournisseurs add column if not exists livraisons integer default 0;
alter table public.fournisseurs add column if not exists source text default 'manuel';

alter table public.cultures add column if not exists photo_url text;
alter table public.cultures add column if not exists rendement numeric default 0;
alter table public.cultures add column if not exists cout_total numeric default 0;
alter table public.cultures add column if not exists marge_estimee numeric default 0;
alter table public.cultures add column if not exists marge_reelle numeric default 0;
alter table public.cultures add column if not exists historique text;

create table if not exists public.sales (
  id text primary key,
  date date default current_date,
  client_id text,
  type text,
  produit text,
  quantite numeric default 0,
  montant numeric default 0,
  statut text default 'brouillon',
  paiement text,
  livraison_date date,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.erp_documents (
  id text primary key,
  title text,
  document_type text,
  module_lie text,
  related_id text,
  file_url text,
  status text default 'actif',
  tags text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  title text,
  module_lie text,
  assigned_to text,
  due_date date,
  priority text default 'normale',
  status text default 'a_faire',
  checklist text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id text primary key,
  title text,
  report_type text,
  period text,
  status text default 'programme',
  channel text,
  file_url text,
  summary text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id text primary key,
  name text,
  type text,
  status text default 'operationnel',
  purchase_date date,
  purchase_cost numeric default 0,
  maintenance_due date,
  fuel_cost numeric default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  actor text,
  action text,
  module text,
  record_id text,
  device text,
  metadata jsonb default '{}'::jsonb,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alimentation_logs (
  id text primary key,
  date date not null default current_date,
  categorie text not null,
  type_cible text not null,
  cible_id text,
  animal_id text,
  lot_id text,
  quantite numeric default 0,
  unite text,
  montant_total numeric default 0,
  duree_jours integer default 30,
  fournisseur_id text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.animal_purchases (
  id text primary key,
  date date default current_date,
  categorie text,
  total_animaux integer default 0,
  montant_total numeric default 0,
  cout_moyen_par_tete numeric generated always as (case when total_animaux > 0 then montant_total / total_animaux else 0 end) stored,
  fournisseur_id text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sensor_devices (
  id text primary key,
  name text,
  type text,
  zone text,
  location text,
  status text default 'simulation',
  last_seen_at timestamptz,
  battery_level numeric,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sensor_readings (
  id text primary key,
  device_id text,
  metric text,
  value numeric,
  unit text,
  payload jsonb default '{}'::jsonb,
  recorded_at timestamptz default now(),
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists public.camera_devices (
  id text primary key,
  name text,
  zone text,
  type text,
  stream_url text,
  snapshot_url text,
  status text default 'simulation',
  last_seen_at timestamptz,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alertes_center (
  id text primary key,
  title text not null,
  message text,
  module text,
  severity text default 'info',
  status text default 'nouveau',
  source text,
  action_recommandee text,
  send_whatsapp boolean default false,
  recipients text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alertes_history (
  id text primary key,
  alert_id text,
  event_type text,
  message text,
  created_by text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alertes_settings (
  id text primary key,
  key text not null unique,
  label text,
  enabled boolean default true,
  severity text default 'warning',
  frequency text default 'immediate',
  recipients text,
  send_whatsapp boolean default false,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.whatsapp_notifications (
  id text primary key,
  alert_id text,
  recipient text,
  message text,
  status text default 'simulation',
  simulation boolean default true,
  scheduled_at timestamptz,
  sent_at timestamptz,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.whatsapp_templates (
  id text primary key,
  key text not null unique,
  label text,
  module text,
  severity text,
  body text,
  enabled boolean default true,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.whatsapp_logs (
  id text primary key,
  notification_id text,
  recipient text,
  status text default 'simulation',
  provider_response jsonb default '{}'::jsonb,
  error_message text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);





-- BUSINESS PLANS MULTI-ACTIVITES
create table if not exists public.business_plans (
  id text primary key,
  nom text not null,
  activity_type text not null,
  description text,
  localisation text,
  date_debut date,
  date_fin_prevue date,
  duree_cycle_mois numeric,
  capacite_initiale numeric,
  unite_capacite text,
  objectif_production text,
  statut text default 'planifie',
  apport_personnel numeric default 0,
  financement_recherche numeric default 0,
  apport_total numeric generated always as (coalesce(apport_personnel, 0) + coalesce(financement_recherche, 0)) stored,
  taux_remboursement_pct numeric default 15,
  unite_calcul_cout text,
  nombre_tetes_prevu numeric default 0,
  nombre_tetes_reel numeric default 0,
  quantite_production_prevue numeric default 0,
  quantite_production_reelle numeric default 0,
  prix_vente_prevu_unitaire numeric default 0,
  prix_vente_reel_unitaire numeric default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_investment_lines (
  id text primary key,
  business_plan_id text not null,
  designation text not null,
  categorie text not null,
  quantite numeric default 1,
  unite text,
  prix_unitaire numeric default 0,
  total numeric generated always as (coalesce(quantite, 0) * coalesce(prix_unitaire, 0)) stored,
  ordre integer default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_recurring_costs (
  id text primary key,
  business_plan_id text not null,
  designation text not null,
  categorie text not null,
  montant_mensuel numeric default 0,
  frequence text default 'mensuelle',
  date_debut date,
  date_fin date,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_revenue_projections (
  id text primary key,
  business_plan_id text not null,
  mois_index integer not null,
  date_mois date,
  capacite_active numeric default 0,
  production_estimee numeric default 0,
  unite_production text,
  prix_unitaire_estime numeric default 0,
  ca_estime numeric generated always as (coalesce(production_estimee, 0) * coalesce(prix_unitaire_estime, 0)) stored,
  charges_estimees numeric default 0,
  marge_estimee numeric generated always as (coalesce(production_estimee, 0) * coalesce(prix_unitaire_estime, 0) - coalesce(charges_estimees, 0)) stored,
  remboursement_prevu numeric default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_funding_sources (
  id text primary key,
  business_plan_id text not null,
  source_type text not null,
  nom_source text,
  montant numeric default 0,
  taux_interet_pct numeric,
  duree_remboursement_mois integer,
  date_obtention date,
  conditions text,
  statut text default 'demande',
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_links (
  id text primary key,
  business_plan_id text not null,
  entity_type text not null,
  entity_id text not null,
  link_type text default 'execution',
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_risks (
  id text primary key,
  business_plan_id text not null,
  categorie text not null,
  titre text not null,
  description text,
  probabilite text default 'moyenne',
  impact text default 'moyen',
  mesure_attenuation text,
  cout_attenuation numeric default 0,
  statut text default 'identifie',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.price_catalog (
  id text primary key,
  item_name text not null,
  categorie text,
  unite text,
  prix_unitaire numeric default 0,
  fournisseur_id text,
  source text default 'manuel',
  date_releve date default current_date,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_versions (
  id text primary key,
  business_plan_id text not null,
  version_label text,
  snapshot jsonb default '{}'::jsonb,
  validated_at timestamptz,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.bp_lines_history (
  id text primary key,
  business_plan_id text,
  line_table text,
  line_id text,
  old_value jsonb default '{}'::jsonb,
  new_value jsonb default '{}'::jsonb,
  reason text,
  changed_by text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.investissements add column if not exists business_plan_id text;

alter table public.veterinaires add column if not exists latitude numeric;
alter table public.veterinaires add column if not exists longitude numeric;
alter table public.veterinaires add column if not exists distance_km numeric;
alter table public.veterinaires add column if not exists source text default 'manuel';
alter table public.veterinaires add column if not exists external_id text;
alter table public.veterinaires add column if not exists verified boolean default false;
alter table public.veterinaires add column if not exists favorite boolean default false;
alter table public.veterinaires add column if not exists notes text;

alter table public.fournisseurs add column if not exists latitude numeric;
alter table public.fournisseurs add column if not exists longitude numeric;
alter table public.fournisseurs add column if not exists distance_km numeric;
alter table public.fournisseurs add column if not exists source text default 'manuel';
alter table public.fournisseurs add column if not exists external_id text;
alter table public.fournisseurs add column if not exists verified boolean default false;
alter table public.fournisseurs add column if not exists favorite boolean default false;
alter table public.fournisseurs add column if not exists notes text;

create index if not exists idx_bp_invest_lines_bp on public.bp_investment_lines(business_plan_id);
create index if not exists idx_bp_recurring_bp on public.bp_recurring_costs(business_plan_id);
create index if not exists idx_bp_projections_bp_mois on public.bp_revenue_projections(business_plan_id, mois_index);
create index if not exists idx_bp_links_bp on public.bp_links(business_plan_id);
create index if not exists idx_bp_links_entity on public.bp_links(entity_type, entity_id);

-- Migration safe Business Plans si tables deja existantes
alter table public.business_plans add column if not exists nom text;
alter table public.business_plans add column if not exists activity_type text;
alter table public.business_plans add column if not exists description text;
alter table public.business_plans add column if not exists localisation text;
alter table public.business_plans add column if not exists date_debut date;
alter table public.business_plans add column if not exists date_fin_prevue date;
alter table public.business_plans add column if not exists duree_cycle_mois numeric;
alter table public.business_plans add column if not exists mode_projection text default 'manuel';
alter table public.business_plans add column if not exists capacite_initiale numeric;
alter table public.business_plans add column if not exists unite_capacite text;
alter table public.business_plans add column if not exists objectif_production text;
alter table public.business_plans add column if not exists statut text default 'planifie';
alter table public.business_plans add column if not exists apport_personnel numeric default 0;
alter table public.business_plans add column if not exists financement_recherche numeric default 0;
alter table public.business_plans add column if not exists taux_remboursement_pct numeric default 15;
alter table public.business_plans add column if not exists unite_calcul_cout text;
alter table public.business_plans add column if not exists nombre_tetes_prevu numeric default 0;
alter table public.business_plans add column if not exists nombre_tetes_reel numeric default 0;
alter table public.business_plans add column if not exists quantite_production_prevue numeric default 0;
alter table public.business_plans add column if not exists quantite_production_reelle numeric default 0;
alter table public.business_plans add column if not exists prix_vente_prevu_unitaire numeric default 0;
alter table public.business_plans add column if not exists prix_vente_reel_unitaire numeric default 0;
alter table public.business_plans add column if not exists notes text;

alter table public.bp_investment_lines add column if not exists business_plan_id text;
alter table public.bp_investment_lines add column if not exists designation text;
alter table public.bp_investment_lines add column if not exists categorie text;
alter table public.bp_investment_lines add column if not exists quantite numeric default 1;
alter table public.bp_investment_lines add column if not exists unite text;
alter table public.bp_investment_lines add column if not exists prix_unitaire numeric default 0;
alter table public.bp_investment_lines add column if not exists ordre integer default 0;
alter table public.bp_investment_lines add column if not exists notes text;

alter table public.bp_recurring_costs add column if not exists business_plan_id text;
alter table public.bp_recurring_costs add column if not exists designation text;
alter table public.bp_recurring_costs add column if not exists categorie text;
alter table public.bp_recurring_costs add column if not exists montant_mensuel numeric default 0;
alter table public.bp_recurring_costs add column if not exists frequence text default 'mensuelle';
alter table public.bp_recurring_costs add column if not exists date_debut date;
alter table public.bp_recurring_costs add column if not exists date_fin date;
alter table public.bp_recurring_costs add column if not exists notes text;



create table if not exists public.veterinary_rounds (
  id text primary key,
  date date default current_date,
  titre text,
  veterinaire_id text,
  cout_deplacement numeric default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.veterinary_interventions (
  id text primary key,
  round_id text,
  date date default current_date,
  intervention_type text,
  titre text,
  veterinaire_id text,
  veterinaire_nom text,
  numero_ordre text,
  diagnostic text,
  ras boolean default false,
  ras_message text default 'Consultation effectuee, RAS selon le veterinaire',
  cout_total numeric default 0,
  cout_reparti numeric default 0,
  prochaine_visite date,
  next_action_date date,
  signature_url text,
  cachet_photo_url text,
  photo_avant_url text,
  photo_apres_url text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.veterinary_intervention_targets (
  id text primary key,
  intervention_id text,
  target_type text,
  target_id text,
  categorie text,
  cout_reparti numeric default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.animal_health_records (
  id text primary key,
  animal_id text,
  date date default current_date,
  health_status text default 'sain',
  record_type text,
  diagnostic text,
  symptomes text,
  traitement text,
  ras boolean default false,
  veterinaire_id text,
  intervention_id text,
  next_action_date date,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.animal_weight_records (
  id text primary key,
  animal_id text,
  date date default current_date,
  poids numeric default 0,
  tendance text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.intervention_medications (
  id text primary key,
  intervention_id text,
  stock_id text,
  produit text,
  posologie text,
  duree_jours integer default 0,
  delai_attente_jours integer default 0,
  delai_attente_produit text,
  quantite_utilisee numeric default 0,
  unite text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.veterinary_intervention_templates (
  id text primary key,
  title text,
  intervention_type text,
  target_type text,
  frequence text,
  checklist text,
  active boolean default true,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.production_oeufs_logs (
  id text primary key,
  lot_id text not null,
  date date not null default current_date,
  oeufs_produits integer default 0,
  oeufs_casses integer default 0,
  taux_ponte numeric default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.reproduction_events (
  id text primary key,
  femelle_id text,
  male_id text,
  date_saillie date,
  date_debut_gestation date,
  date_prevue_mise_bas date,
  date_mise_bas_reelle date,
  resultat text default 'inconnu',
  nombre_petits integer default 0,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
declare
  table_name text;
  admin_user_id uuid;
  tables text[] := array[
    'animals','lots','vaccins','transactions','stocks','clients','fournisseurs',
    'investissements','tracabilite','cultures','veterinaires','automation_settings',
    'sales','erp_documents','tasks','reports','equipment','audit_logs',
    'alimentation_logs','production_oeufs_logs','animal_purchases','veterinary_rounds','veterinary_interventions','veterinary_intervention_targets','animal_health_records','animal_weight_records','intervention_medications','veterinary_intervention_templates','reproduction_events','sensor_devices','sensor_readings','camera_devices','business_plans','bp_investment_lines','bp_recurring_costs','bp_revenue_projections','bp_funding_sources','bp_links','bp_risks','price_catalog','bp_versions','bp_lines_history',
    'alertes_center','alertes_history','alertes_settings','whatsapp_notifications','whatsapp_templates','whatsapp_logs'
  ];
begin
  select id into admin_user_id from auth.users where email = 'penda@horizonfarm.app' limit 1;

  foreach table_name in array tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('alter table public.%I add column if not exists owner_user_id uuid default auth.uid()', table_name);
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', table_name);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', table_name);
    if admin_user_id is not null then
      execute format('update public.%I set owner_user_id = %L::uuid where owner_user_id is null', table_name, admin_user_id);
    end if;

    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated, service_role', table_name);
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);

    execute format('drop policy if exists %I on public.%I', table_name || '_select_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_delete_own', table_name);

    execute format('create policy %I on public.%I for select to authenticated using (owner_user_id = auth.uid())', table_name || '_select_own', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (owner_user_id = auth.uid())', table_name || '_insert_own', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid())', table_name || '_update_own', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (owner_user_id = auth.uid())', table_name || '_delete_own', table_name);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from public.animals where id = 'BV-001') and not exists (select 1 from public.animals where id = 'BOV001') then update public.animals set id = 'BOV001', tag = 'BOV001' where id = 'BV-001'; end if;
  if exists (select 1 from public.animals where id = 'BV-002') and not exists (select 1 from public.animals where id = 'BOV002') then update public.animals set id = 'BOV002', tag = 'BOV002' where id = 'BV-002'; end if;
  if exists (select 1 from public.animals where id = 'BV-003') and not exists (select 1 from public.animals where id = 'BOV003') then update public.animals set id = 'BOV003', tag = 'BOV003' where id = 'BV-003'; end if;
  if exists (select 1 from public.animals where id = 'OV-001') and not exists (select 1 from public.animals where id = 'OV001') then update public.animals set id = 'OV001', tag = 'OV001' where id = 'OV-001'; end if;
  if exists (select 1 from public.animals where id = 'OV-002') and not exists (select 1 from public.animals where id = 'OV002') then update public.animals set id = 'OV002', tag = 'OV002' where id = 'OV-002'; end if;
  if exists (select 1 from public.animals where id = 'CA-001') and not exists (select 1 from public.animals where id = 'CAP001') then update public.animals set id = 'CAP001', tag = 'CAP001' where id = 'CA-001'; end if;

  if exists (select 1 from public.lots where id = 'LOT-001') and not exists (select 1 from public.lots where id = 'LOTPO001') then update public.lots set id = 'LOTPO001', name = replace(coalesce(name, 'LOT-001'), 'LOT-001', 'LOTPO001') where id = 'LOT-001'; end if;
  if exists (select 1 from public.lots where id = 'LOT-002') and not exists (select 1 from public.lots where id = 'LOTCH001') then update public.lots set id = 'LOTCH001', name = replace(coalesce(name, 'LOT-002'), 'LOT-002', 'LOTCH001') where id = 'LOT-002'; end if;
  if exists (select 1 from public.lots where id = 'LOT-003') and not exists (select 1 from public.lots where id = 'LOTPO002') then update public.lots set id = 'LOTPO002', name = replace(coalesce(name, 'LOT-003'), 'LOT-003', 'LOTPO002') where id = 'LOT-003'; end if;

  update public.transactions set related_id = replace(replace(replace(replace(replace(replace(replace(replace(replace(coalesce(related_id, ''), 'BV-001', 'BOV001'), 'BV-002', 'BOV002'), 'BV-003', 'BOV003'), 'OV-001', 'OV001'), 'OV-002', 'OV002'), 'CA-001', 'CAP001'), 'LOT-001', 'LOTPO001'), 'LOT-002', 'LOTCH001'), 'LOT-003', 'LOTPO002') where related_id is not null;
  update public.vaccins set animal = replace(replace(replace(replace(replace(replace(replace(replace(replace(coalesce(animal, ''), 'BV-001', 'BOV001'), 'BV-002', 'BOV002'), 'BV-003', 'BOV003'), 'OV-001', 'OV001'), 'OV-002', 'OV002'), 'CA-001', 'CAP001'), 'LOT-001', 'LOTPO001'), 'LOT-002', 'LOTCH001'), 'LOT-003', 'LOTPO002') where animal is not null;
  update public.tracabilite set animal = replace(coalesce(animal, ''), 'BV-003', 'BOV003') where animal is not null;
end $$;


-- ============================================================
-- PHASES 2 + 3 + 4: evenements metier, documents, alertes WhatsApp, ventes
-- Idempotent: safe a rejouer plusieurs fois
-- ============================================================

create table if not exists public.business_events (
  id text primary key,
  event_type text not null,
  module_source text not null,
  entity_type text not null,
  entity_id text not null,
  title text not null,
  description text,
  amount numeric,
  event_date timestamptz default now(),
  linked_document_id text,
  linked_transaction_id text,
  linked_sale_id text,
  severity text default 'info',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.documents (
  id text primary key,
  title text not null,
  file_url text,
  file_type text,
  module_source text,
  entity_type text,
  entity_id text,
  document_category text default 'autre',
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_orders (
  id text primary key,
  date date not null default current_date,
  client_id text,
  type_document text default 'commande',
  statut_commande text default 'brouillon',
  statut_paiement text default 'non_paye',
  statut_livraison text default 'a_livrer',
  montant_ht numeric default 0,
  remise numeric default 0,
  montant_total numeric default 0,
  montant_paye numeric default 0,
  reste_a_payer numeric default 0,
  moyen_paiement text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_order_items (
  id text primary key,
  order_id text not null,
  source_type text not null,
  source_id text,
  product_name text not null,
  quantity numeric not null default 1,
  unit text default 'unite',
  unit_price numeric default 0,
  discount numeric default 0,
  total numeric default 0,
  cost_estimated numeric default 0,
  margin_estimated numeric default 0,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.deliveries (
  id text primary key,
  order_id text not null,
  date_livraison date,
  statut text default 'prevue',
  destinataire text,
  adresse text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.invoices (
  id text primary key,
  order_id text not null,
  numero_facture text,
  date_facture date default current_date,
  montant_total numeric default 0,
  pdf_url text,
  statut text default 'emise',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payments (
  id text primary key,
  order_id text,
  invoice_id text,
  date_paiement date not null default current_date,
  montant numeric not null default 0,
  moyen_paiement text,
  reference text,
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales_opportunities (
  id text primary key,
  opportunity_type text not null,
  source_type text not null,
  source_id text,
  title text not null,
  description text,
  quantity numeric default 0,
  unit text default 'unite',
  estimated_value numeric default 0,
  estimated_margin numeric default 0,
  score numeric default 0,
  reason text,
  suggested_clients jsonb default '[]'::jsonb,
  status text default 'a_traiter',
  detected_at timestamptz default now(),
  converted_sale_id text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.alertes_center (
  id text primary key,
  title text not null,
  message text,
  module_source text,
  entity_type text,
  entity_id text,
  severity text default 'info',
  status text default 'nouvelle',
  action_recommandee text,
  send_whatsapp boolean default false,
  recipients text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.whatsapp_templates (
  id text primary key,
  key text,
  title text,
  label text,
  message_template text,
  body text,
  category text,
  module text,
  severity text,
  active boolean default true,
  enabled boolean default true,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.whatsapp_logs (
  id text primary key,
  alert_id text,
  notification_id text,
  recipient text,
  message text,
  status text default 'simule',
  provider text default 'simulation',
  provider_response jsonb default '{}'::jsonb,
  sent_at timestamptz,
  error_message text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz default now()
);

alter table public.alertes_center add column if not exists module text;
alter table public.alertes_center add column if not exists module_source text;
alter table public.alertes_center add column if not exists entity_type text;
alter table public.alertes_center add column if not exists entity_id text;
alter table public.alertes_center add column if not exists recipients text;
update public.alertes_center set module_source = coalesce(module_source, module) where module_source is null;
update public.alertes_center set status = 'nouvelle' where status = 'nouveau';

alter table public.whatsapp_templates add column if not exists key text;
alter table public.whatsapp_templates add column if not exists title text;
alter table public.whatsapp_templates add column if not exists message_template text;
alter table public.whatsapp_templates add column if not exists category text;
alter table public.whatsapp_templates add column if not exists active boolean default true;
alter table public.whatsapp_templates add column if not exists label text;
alter table public.whatsapp_templates add column if not exists module text;
alter table public.whatsapp_templates add column if not exists body text;
alter table public.whatsapp_templates add column if not exists enabled boolean default true;
alter table public.whatsapp_templates add column if not exists updated_at timestamptz default now();
update public.whatsapp_templates set message_template = coalesce(message_template, body, label, title, key) where message_template is null;
update public.whatsapp_templates set title = coalesce(title, label, key) where title is null;
update public.whatsapp_templates set active = coalesce(active, enabled, true);

alter table public.whatsapp_logs add column if not exists alert_id text;
alter table public.whatsapp_logs add column if not exists notification_id text;
alter table public.whatsapp_logs add column if not exists recipient text;
alter table public.whatsapp_logs add column if not exists message text;
alter table public.whatsapp_logs add column if not exists status text default 'simule';
alter table public.whatsapp_logs add column if not exists provider text default 'simulation';
alter table public.whatsapp_logs add column if not exists provider_response jsonb default '{}'::jsonb;
alter table public.whatsapp_logs add column if not exists sent_at timestamptz;
alter table public.whatsapp_logs add column if not exists error_message text;
update public.whatsapp_logs set status = 'simule' where status = 'simulation';

alter table public.animals add column if not exists fournisseur_id text;
alter table public.animals add column if not exists provenance text;
alter table public.animals add column if not exists poids_objectif numeric;
alter table public.animals add column if not exists date_objectif_vente date;
alter table public.animals add column if not exists sale_readiness_score numeric default 0;
alter table public.animals add column if not exists sale_readiness_status text default 'non_pret';
alter table public.animals add column if not exists pret_vente_recommande boolean default false;
alter table public.animals add column if not exists pret_vente_confirme boolean default false;
alter table public.animals add column if not exists date_pret_vente_recommande date;
alter table public.animals add column if not exists date_pret_vente_confirme date;
alter table public.animals add column if not exists raison_pret_vente text;

alter table public.lots add column if not exists poids_objectif numeric;
alter table public.lots add column if not exists duree_cycle_valeur numeric;
alter table public.lots add column if not exists duree_cycle_unite text;
alter table public.lots add column if not exists age_lot_jours numeric;
alter table public.lots add column if not exists effectif_vendable integer default 0;
alter table public.lots add column if not exists sale_readiness_score numeric default 0;
alter table public.lots add column if not exists sale_readiness_status text default 'non_pret';
alter table public.lots add column if not exists pret_vente_recommande boolean default false;
alter table public.lots add column if not exists pret_vente_confirme boolean default false;
alter table public.lots add column if not exists date_pret_vente_recommande date;
alter table public.lots add column if not exists date_pret_vente_confirme date;
alter table public.lots add column if not exists raison_pret_vente text;

WITH seed(id, key, title, label, message_template, body, category, module, severity, active, enabled) AS (
  VALUES
    ('WTP-STOCK-CRITIQUE', 'stock_critique', 'Stock critique', 'Stock critique', 'Horizon Farm - Stock critique: le stock {produit} est bas. Quantite restante: {quantite} {unite}. Action: {action}.', 'Horizon Farm - Stock critique: le stock {produit} est bas. Quantite restante: {quantite} {unite}. Action: {action}.', 'stock', 'stock', 'critique', true, true),
    ('WTP-AVICOLE-MORTALITE', 'mortalite_lot', 'Alerte avicole', 'Alerte avicole', 'Horizon Farm - Alerte avicole: mortalite elevee dans {lot}. Morts: {morts}. Action: isoler et contacter un veterinaire.', 'Horizon Farm - Alerte avicole: mortalite elevee dans {lot}. Morts: {morts}. Action: isoler et contacter un veterinaire.', 'avicole', 'avicole', 'critique', true, true),
    ('WTP-CULTURES-HUMIDITE', 'alerte_cultures', 'Alerte cultures', 'Alerte cultures', 'Horizon Farm - Alerte cultures: humidite elevee. Risque fongique sur {culture}. Action: surveiller les feuilles.', 'Horizon Farm - Alerte cultures: humidite elevee. Risque fongique sur {culture}. Action: surveiller les feuilles.', 'cultures', 'cultures', 'warning', true, true),
    ('WTP-FINANCES-TRESO', 'tresorerie_faible', 'Tresorerie faible', 'Tresorerie faible', 'Horizon Farm - Alerte tresorerie: solde sous seuil. Solde actuel: {solde} FCFA. Action: verifier les encaissements.', 'Horizon Farm - Alerte tresorerie: solde sous seuil. Solde actuel: {solde} FCFA. Action: verifier les encaissements.', 'finances', 'finances', 'critique', true, true),
    ('WTP-CLIENT-RELANCE', 'relance_client', 'Relance client', 'Relance client', 'Horizon Farm - Relance client: {client} a une facture impayee de {montant} FCFA. Action: envoyer une relance.', 'Horizon Farm - Relance client: {client} a une facture impayee de {montant} FCFA. Action: envoyer une relance.', 'clients', 'clients', 'warning', true, true),
    ('WTP-SMARTFARM-CAPTEUR', 'capteur_offline', 'Capteur offline', 'Capteur offline', 'Horizon Farm - Capteur offline: {capteur} ne repond plus depuis {duree}. Zone: {zone}. Action: verifier batterie ou connexion.', 'Horizon Farm - Capteur offline: {capteur} ne repond plus depuis {duree}. Zone: {zone}. Action: verifier batterie ou connexion.', 'smartfarm', 'smartfarm', 'warning', true, true)
)
UPDATE public.whatsapp_templates w
SET
  title = seed.title,
  label = seed.label,
  message_template = seed.message_template,
  body = seed.body,
  category = seed.category,
  module = seed.module,
  severity = seed.severity,
  active = seed.active,
  enabled = seed.enabled,
  updated_at = now()
FROM seed
WHERE w.key = seed.key;

WITH seed(id, key, title, label, message_template, body, category, module, severity, active, enabled) AS (
  VALUES
    ('WTP-STOCK-CRITIQUE', 'stock_critique', 'Stock critique', 'Stock critique', 'Horizon Farm - Stock critique: le stock {produit} est bas. Quantite restante: {quantite} {unite}. Action: {action}.', 'Horizon Farm - Stock critique: le stock {produit} est bas. Quantite restante: {quantite} {unite}. Action: {action}.', 'stock', 'stock', 'critique', true, true),
    ('WTP-AVICOLE-MORTALITE', 'mortalite_lot', 'Alerte avicole', 'Alerte avicole', 'Horizon Farm - Alerte avicole: mortalite elevee dans {lot}. Morts: {morts}. Action: isoler et contacter un veterinaire.', 'Horizon Farm - Alerte avicole: mortalite elevee dans {lot}. Morts: {morts}. Action: isoler et contacter un veterinaire.', 'avicole', 'avicole', 'critique', true, true),
    ('WTP-CULTURES-HUMIDITE', 'alerte_cultures', 'Alerte cultures', 'Alerte cultures', 'Horizon Farm - Alerte cultures: humidite elevee. Risque fongique sur {culture}. Action: surveiller les feuilles.', 'Horizon Farm - Alerte cultures: humidite elevee. Risque fongique sur {culture}. Action: surveiller les feuilles.', 'cultures', 'cultures', 'warning', true, true),
    ('WTP-FINANCES-TRESO', 'tresorerie_faible', 'Tresorerie faible', 'Tresorerie faible', 'Horizon Farm - Alerte tresorerie: solde sous seuil. Solde actuel: {solde} FCFA. Action: verifier les encaissements.', 'Horizon Farm - Alerte tresorerie: solde sous seuil. Solde actuel: {solde} FCFA. Action: verifier les encaissements.', 'finances', 'finances', 'critique', true, true),
    ('WTP-CLIENT-RELANCE', 'relance_client', 'Relance client', 'Relance client', 'Horizon Farm - Relance client: {client} a une facture impayee de {montant} FCFA. Action: envoyer une relance.', 'Horizon Farm - Relance client: {client} a une facture impayee de {montant} FCFA. Action: envoyer une relance.', 'clients', 'clients', 'warning', true, true),
    ('WTP-SMARTFARM-CAPTEUR', 'capteur_offline', 'Capteur offline', 'Capteur offline', 'Horizon Farm - Capteur offline: {capteur} ne repond plus depuis {duree}. Zone: {zone}. Action: verifier batterie ou connexion.', 'Horizon Farm - Capteur offline: {capteur} ne repond plus depuis {duree}. Zone: {zone}. Action: verifier batterie ou connexion.', 'smartfarm', 'smartfarm', 'warning', true, true)
)
INSERT INTO public.whatsapp_templates (id, key, title, label, message_template, body, category, module, severity, active, enabled)
SELECT seed.id, seed.key, seed.title, seed.label, seed.message_template, seed.body, seed.category, seed.module, seed.severity, seed.active, seed.enabled
FROM seed
WHERE NOT EXISTS (
  SELECT 1 FROM public.whatsapp_templates w WHERE w.key = seed.key
);
DO $$
BEGIN
  IF to_regclass('public.erp_documents') IS NOT NULL THEN
    EXECUTE $copy_documents$
      INSERT INTO public.documents (id, title, file_url, file_type, module_source, entity_type, entity_id, document_category, notes, owner_user_id, created_at, updated_at)
      SELECT id, title, file_url, NULL, module_lie, NULL, related_id, COALESCE(document_type, 'autre'), tags, owner_user_id, created_at, updated_at
      FROM public.erp_documents
      WHERE NOT EXISTS (SELECT 1 FROM public.documents d WHERE d.id = public.erp_documents.id)
    $copy_documents$;
  END IF;
END $$;

create index if not exists idx_business_events_entity on public.business_events(entity_type, entity_id);
create index if not exists idx_business_events_date on public.business_events(event_date desc);
create index if not exists idx_documents_entity on public.documents(entity_type, entity_id);
create index if not exists idx_sales_order_items_order on public.sales_order_items(order_id);
create index if not exists idx_sales_opportunities_source on public.sales_opportunities(source_type, source_id);

-- RLS + updated_at pour les nouvelles tables centrales
DO $$
DECLARE
  t text;
  tables text[] := array[
    'business_events','documents','sales_orders','sales_order_items','deliveries','invoices','payments','sales_opportunities',
    'alertes_center','whatsapp_templates','whatsapp_logs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('alter table public.%I add column if not exists owner_user_id uuid default auth.uid()', t);
    EXECUTE format('alter table public.%I add column if not exists created_at timestamptz default now()', t);
    IF t <> 'whatsapp_logs' THEN
      EXECUTE format('alter table public.%I add column if not exists updated_at timestamptz default now()', t);
      EXECUTE format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
      EXECUTE format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    END IF;

    EXECUTE format('alter table public.%I enable row level security', t);
    EXECUTE format('grant select, insert, update, delete on table public.%I to authenticated, service_role', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_owner', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_select_own', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_update_own', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    EXECUTE format('create policy %I on public.%I for select to authenticated using (owner_user_id = auth.uid())', t || '_select_own', t);
    EXECUTE format('create policy %I on public.%I for insert to authenticated with check (owner_user_id = auth.uid())', t || '_insert_own', t);
    EXECUTE format('create policy %I on public.%I for update to authenticated using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid())', t || '_update_own', t);
    EXECUTE format('create policy %I on public.%I for delete to authenticated using (owner_user_id = auth.uid())', t || '_delete_own', t);
  END LOOP;
END $$;
-- Colonne cout pour interventions sante / vaccinations
alter table public.vaccins add column if not exists cout bigint default 0;

-- Colonnes ventes : source de la vente et traçabilité inter-modules
alter table public.sales_orders add column if not exists source_type text;
alter table public.sales_orders add column if not exists source_id text;
alter table public.sales_orders add column if not exists source_label text;
alter table public.sales_order_items add column if not exists item_type text;
alter table public.sales_order_items add column if not exists label text;
alter table public.sales_order_items add column if not exists available_quantity_snapshot numeric;
alter table public.sales_order_items add column if not exists cost_snapshot numeric;
alter table public.sales_order_items add column if not exists margin_snapshot numeric;

notify pgrst, 'reload schema';
select 'schema cache reload demande - recharge la page Horizon Farm dans 5 a 10 secondes' as message;
