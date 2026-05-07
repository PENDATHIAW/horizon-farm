create extension if not exists "pgcrypto";

do $$
declare
  app_user_id uuid;
  app_email text := 'penda@horizonfarm.app';
  app_password text := 'Mariemediatta10#';
begin
  select id into app_user_id from auth.users where lower(email) = lower(app_email);

  if app_user_id is null then
    app_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change,
      email_change_token_new
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      app_user_id,
      'authenticated',
      'authenticated',
      app_email,
      crypt(app_password, gen_salt('bf', 10)),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"login":"penda","role":"admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set encrypted_password = crypt(app_password, gen_salt('bf', 10)),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
        raw_user_meta_data = '{"login":"penda","role":"admin"}'::jsonb,
        updated_at = now()
    where id = app_user_id;
  end if;

  delete from auth.identities where provider = 'email' and user_id = app_user_id;

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    app_user_id::text,
    app_user_id,
    jsonb_build_object('sub', app_user_id::text, 'email', app_email, 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );
end $$;

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

-- ============================================================
-- SAFETY: IDs metier Horizon Farm doivent rester en TEXT.
-- On retire les FK publiques avant conversion pour eviter:
-- text -> uuid ou uuid -> text incompatible.
-- Les donnees ne sont pas supprimees.
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

do $$
declare
  t text;
  id_tables text[] := array[
    'animals','lots','clients','fournisseurs','transactions','investissements','cultures','vaccins','veterinaires','tracabilite',
    'stocks','automation_settings','treasury_accounts','treasury_movements','accounting_accounts','accounting_entries','accounting_entry_lines',
    'accounting_budgets','accounting_closures','accounting_documents','alert_rules','alert_events','sales','erp_documents','tasks','reports',
    'equipment','audit_logs','offline_queue','api_webhooks','security_events','alimentation_logs','production_oeufs_logs','animal_purchases','veterinary_rounds','veterinary_interventions','veterinary_intervention_targets','animal_health_records','animal_weight_records','intervention_medications','veterinary_intervention_templates','reproduction_events','sensor_devices',
    'sensor_readings','camera_devices','business_plans','bp_investment_lines','bp_recurring_costs','bp_revenue_projections','bp_funding_sources','bp_links','bp_risks','price_catalog','bp_versions','bp_lines_history','alertes_center','alertes_history','alertes_settings','whatsapp_notifications','whatsapp_templates','whatsapp_logs'
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
  perform public.hf_ensure_text_column('accounting_entry_lines', 'entry_id');
  perform public.hf_ensure_text_column('accounting_entry_lines', 'account_id');
  perform public.hf_ensure_text_column('transactions', 'client_id');
  perform public.hf_ensure_text_column('transactions', 'fournisseur_id');
  perform public.hf_ensure_text_column('transactions', 'related_id');
  perform public.hf_ensure_text_column('transactions', 'treasury_account_id');
  perform public.hf_ensure_text_column('transactions', 'accounting_entry_id');
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
  perform public.hf_ensure_text_column('animal_purchases', 'fournisseur_id');
  perform public.hf_ensure_text_column('reproduction_events', 'femelle_id');
  perform public.hf_ensure_text_column('reproduction_events', 'male_id');
  perform public.hf_ensure_text_column('sensor_readings', 'device_id');
end $$;

create table if not exists public.animals (
  id text primary key,
  tag text,
  name text not null,
  type text,
  sexe text,
  poids numeric default 0,
  purchase_cost bigint default 0,
  alimentation bigint default 0,
  sante bigint default 0,
  frais_sante numeric default 0,
  autres_frais numeric default 0,
  sale_price bigint default 0,
  prix_vente_reel numeric default 0,
  health_status text default 'sain',
  status text default 'actif',
  naissance date,
  mode_acquisition text default 'achat',
  date_achat date,
  date_naissance date,
  date_entree_ferme date,
  fournisseur_vendeur text,
  mere_id text,
  pere_id text,
  portee_id text,
  notes_reproduction text,
  en_gestation boolean default false,
  date_debut_gestation date,
  date_prevue_mise_bas date,
  male_reproducteur_id text,
  statut_reproduction text default 'inconnu',
  traitements_notes text,
  ras_veterinaire text,
  date_vente date,
  client_id text,
  moyen_paiement text,
  commentaire_vente text,
  date_deces date,
  cause_deces text,
  valeur_perte_estimee numeric default 0,
  commentaire_deces text,
  date_vol_detecte date,
  lieu_vol text,
  commentaire_vol text,
  date_reforme date,
  motif_reforme text,
  valeur_residuelle numeric default 0,
  commentaire_reforme text,
  date_detection_maladie date,
  symptomes text,
  traitement_prevu text,
  veterinaire_id text,
  cout_traitement_estime numeric default 0,
  date_debut_traitement date,
  date_fin_traitement_prevue date,
  traitement_en_cours text,
  cout_traitement numeric default 0,
  raison_surveillance text,
  date_prochaine_verification date,
  source text default 'manuel',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lots (
  id text primary key,
  name text not null,
  type text,
  phase text,
  initial_count integer default 0,
  current_count integer default 0,
  mortality integer default 0,
  malades integer default 0,
  vols integer default 0,
  vendus integer default 0,
  reformes integer default 0,
  sorties integer default 0,
  oeufs_casses integer default 0,
  taux_ponte numeric default 0,
  productionjour integer default 0,
  weight_avg numeric default 0,
  ic numeric default 0,
  revenu_estime numeric default 0,
  marge numeric default 0,
  scores_sante numeric default 0,
  frais_sante numeric default 0,
  health_status text default 'sain',
  status text default 'actif',
  autres_frais numeric default 0,
  prix_vente_prevu numeric default 0,
  prix_vente_reel numeric default 0,
  cout_poussins numeric default 0,
  date_debut date,
  date_fin_prevue date,
  date_fin_reelle date,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vaccins (
  id text primary key,
  nom text not null,
  animal text,
  prevue date,
  effectuee date,
  vet text,
  statut text default 'a_faire',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  type text not null check (type in ('entree','sortie')),
  libelle text not null,
  montant bigint not null default 0,
  date date,
  categorie text,
  paiement text,
  justif boolean default false,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stocks (
  id text primary key,
  produit text not null,
  categorie text,
  quantite numeric default 0,
  unite text,
  seuil numeric default 0,
  prixunit numeric default 0,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id text primary key,
  nom text not null,
  tel text,
  type text,
  score numeric default 0,
  totalachats numeric default 0,
  dernierecommande date,
  prefs text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fournisseurs (
  id text primary key,
  nom text not null,
  tel text,
  whatsapp text,
  email text,
  categorie text,
  statut text default 'actif',
  contact text,
  note numeric default 0,
  dettes numeric default 0,
  livraisons integer default 0,
  source text default 'manuel',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.investissements (
  id text primary key,
  type text,
  libelle text not null,
  montant numeric default 0,
  roi numeric default 0,
  objectif text,
  statut text default 'actif',
  gain numeric default 0,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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



create table if not exists public.tracabilite (
  id text primary key,
  animal text not null,
  type text,
  etapes jsonb default '[]'::jsonb,
  margefinale numeric default 0,
  roi numeric default 0,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cultures (
  id text primary key,
  nom text not null,
  type text,
  variete text,
  parcelle text,
  surface numeric default 0,
  date_semis date,
  date_repiquage date,
  date_recolte_prevue date,
  date_recolte_reelle date,
  quantite_prevue numeric default 0,
  quantite_recoltee numeric default 0,
  pertes numeric default 0,
  rendement numeric default 0,
  cout_semences numeric default 0,
  cout_engrais numeric default 0,
  cout_eau numeric default 0,
  cout_main_oeuvre numeric default 0,
  cout_traitement numeric default 0,
  cout_total numeric default 0,
  revenu_estime numeric default 0,
  revenu_reel numeric default 0,
  marge_estimee numeric default 0,
  marge_reelle numeric default 0,
  statut text default 'semis',
  score_sante numeric default 0,
  historique text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.automation_settings (
  id text primary key,
  key text not null unique,
  label text not null,
  description text,
  enabled boolean not null default false,
  category text not null default 'whatsapp',
  frequency text,
  message_template text,
  audience text,
  last_run_at timestamptz,
  next_run_at timestamptz,
  history jsonb default '[]'::jsonb,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.veterinaires (
  id text primary key,
  nom text not null,
  specialite text,
  tel text,
  whatsapp text,
  email text,
  gps text,
  adresse text,
  note numeric default 0,
  source text default 'manuel',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.treasury_accounts (
  id text primary key,
  label text not null,
  type text,
  provider text,
  solde_initial numeric default 0,
  solde_actuel numeric default 0,
  currency text default 'FCFA',
  status text default 'actif',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.treasury_movements (
  id text primary key,
  account_id text references public.treasury_accounts(id) on delete set null,
  transaction_id text references public.transactions(id) on delete set null,
  date date default current_date,
  type text check (type in ('entree','sortie','transfert','ajustement')),
  amount numeric default 0,
  label text,
  status text default 'valide',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_accounts (
  id text primary key,
  code text not null unique,
  name text not null,
  type text,
  category text,
  normal_balance text check (normal_balance in ('debit','credit')),
  description text,
  is_active boolean default true,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_entries (
  id text primary key,
  entry_date date default current_date,
  journal text,
  reference text,
  source_module text,
  source_id text,
  label text not null,
  status text default 'brouillon' check (status in ('brouillon','valide','annule')),
  total_debit numeric default 0,
  total_credit numeric default 0,
  validated_at timestamptz,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_entry_lines (
  id text primary key,
  entry_id text references public.accounting_entries(id) on delete cascade,
  account_id text references public.accounting_accounts(id) on delete set null,
  account_code text,
  label text,
  debit numeric default 0,
  credit numeric default 0,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_budgets (
  id text primary key,
  period text not null,
  category text not null,
  budget_amount numeric default 0,
  actual_amount numeric default 0,
  status text default 'ouvert',
  notes text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_closures (
  id text primary key,
  period text not null,
  closure_type text default 'mensuelle',
  status text default 'brouillon',
  closed_at timestamptz,
  summary jsonb default '{}'::jsonb,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounting_documents (
  id text primary key,
  transaction_id text references public.transactions(id) on delete set null,
  entry_id text references public.accounting_entries(id) on delete set null,
  label text,
  document_type text,
  file_url text,
  uploaded_at timestamptz default now(),
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_rules (
  id text primary key,
  key text not null unique,
  module text,
  label text not null,
  severity text default 'info',
  enabled boolean default true,
  threshold numeric,
  channel_erp boolean default true,
  channel_whatsapp boolean default false,
  frequency text default 'immediate',
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_events (
  id text primary key,
  rule_key text,
  module text,
  severity text default 'info',
  title text not null,
  message text,
  status text default 'nouveau',
  related_id text,
  occurred_at timestamptz default now(),
  resolved_at timestamptz,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id text primary key,
  date date default current_date,
  client_id text,
  type text,
  produit text not null,
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
  title text not null,
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
  title text not null,
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
  title text not null,
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
  name text not null,
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

create table if not exists public.offline_queue (
  id text primary key,
  module text,
  operation text,
  payload jsonb default '{}'::jsonb,
  status text default 'pending',
  conflict_strategy text default 'server_wins',
  device text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_webhooks (
  id text primary key,
  name text not null,
  event text,
  target_url text,
  enabled boolean default false,
  secret_hint text,
  owner_user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.security_events (
  id text primary key,
  actor text,
  event_type text,
  severity text default 'info',
  device text,
  ip_address text,
  message text,
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

alter table public.animals add column if not exists photo_url text;
alter table public.animals add column if not exists race text;
alter table public.animals add column if not exists qr_url text;
alter table public.animals add column if not exists historique_poids jsonb default '[]'::jsonb;
alter table public.animals add column if not exists historique_sante jsonb default '[]'::jsonb;
alter table public.animals add column if not exists traitements jsonb default '[]'::jsonb;
alter table public.animals add column if not exists score_sante numeric default 0;
alter table public.animals add column if not exists tag text;
alter table public.animals add column if not exists name text;
alter table public.animals add column if not exists type text;
alter table public.animals add column if not exists sexe text;
alter table public.animals add column if not exists poids numeric default 0;
alter table public.animals add column if not exists purchase_cost bigint default 0;
alter table public.animals add column if not exists alimentation bigint default 0;
alter table public.animals add column if not exists sante bigint default 0;
alter table public.animals add column if not exists health_status text default 'sain';
alter table public.animals add column if not exists sale_price bigint default 0;
alter table public.animals add column if not exists status text default 'actif';
alter table public.animals add column if not exists naissance date;
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
alter table public.clients add column if not exists whatsapp text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists adresse text;
alter table public.clients add column if not exists gps text;
alter table public.clients add column if not exists statut text default 'actif';
alter table public.clients add column if not exists historique_achats text;
alter table public.clients add column if not exists historique_communications text;
alter table public.clients add column if not exists notes_internes text;
alter table public.clients add column if not exists tel text;
alter table public.clients add column if not exists type text;
alter table public.clients add column if not exists score numeric default 0;
alter table public.clients add column if not exists totalachats numeric default 0;
alter table public.clients add column if not exists dernierecommande date;
alter table public.clients add column if not exists prefs text;

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

alter table public.stocks add column if not exists photo_url text;
alter table public.stocks add column if not exists produit text;
alter table public.stocks add column if not exists categorie text;
alter table public.stocks add column if not exists quantite numeric default 0;
alter table public.stocks add column if not exists unite text;
alter table public.stocks add column if not exists seuil numeric default 0;
alter table public.stocks add column if not exists prixunit numeric default 0;

alter table public.fournisseurs add column if not exists photo_url text;
alter table public.fournisseurs add column if not exists nom text;
alter table public.fournisseurs add column if not exists statut text default 'actif';
alter table public.fournisseurs add column if not exists tel text;
alter table public.fournisseurs add column if not exists whatsapp text;
alter table public.fournisseurs add column if not exists email text;
alter table public.fournisseurs add column if not exists categorie text;
alter table public.fournisseurs add column if not exists contact text;
alter table public.fournisseurs add column if not exists note numeric default 0;
alter table public.fournisseurs add column if not exists dettes numeric default 0;
alter table public.fournisseurs add column if not exists livraisons integer default 0;
alter table public.fournisseurs add column if not exists source text default 'manuel';

alter table public.cultures add column if not exists photo_url text;
alter table public.cultures add column if not exists nom text;
alter table public.cultures add column if not exists type text;
alter table public.cultures add column if not exists variete text;
alter table public.cultures add column if not exists parcelle text;
alter table public.cultures add column if not exists surface numeric default 0;
alter table public.cultures add column if not exists date_semis date;
alter table public.cultures add column if not exists date_repiquage date;
alter table public.cultures add column if not exists date_recolte_prevue date;
alter table public.cultures add column if not exists date_recolte_reelle date;
alter table public.cultures add column if not exists quantite_prevue numeric default 0;
alter table public.cultures add column if not exists quantite_recoltee numeric default 0;
alter table public.cultures add column if not exists pertes numeric default 0;
alter table public.cultures add column if not exists rendement numeric default 0;
alter table public.cultures add column if not exists cout_semences numeric default 0;
alter table public.cultures add column if not exists cout_engrais numeric default 0;
alter table public.cultures add column if not exists cout_eau numeric default 0;
alter table public.cultures add column if not exists cout_main_oeuvre numeric default 0;
alter table public.cultures add column if not exists cout_traitement numeric default 0;
alter table public.cultures add column if not exists cout_total numeric default 0;
alter table public.cultures add column if not exists revenu_estime numeric default 0;
alter table public.cultures add column if not exists revenu_reel numeric default 0;
alter table public.cultures add column if not exists marge_estimee numeric default 0;
alter table public.cultures add column if not exists marge_reelle numeric default 0;
alter table public.cultures add column if not exists statut text default 'semis';
alter table public.cultures add column if not exists score_sante numeric default 0;
alter table public.cultures add column if not exists historique text;

alter table public.vaccins add column if not exists nom text;
alter table public.vaccins add column if not exists animal text;
alter table public.vaccins add column if not exists prevue date;
alter table public.vaccins add column if not exists effectuee date;
alter table public.vaccins add column if not exists vet text;
alter table public.vaccins add column if not exists statut text default 'a_faire';

alter table public.investissements add column if not exists type text;
alter table public.investissements add column if not exists libelle text;
alter table public.investissements add column if not exists montant numeric default 0;
alter table public.investissements add column if not exists roi numeric default 0;
alter table public.investissements add column if not exists objectif text;
alter table public.investissements add column if not exists statut text default 'actif';
alter table public.investissements add column if not exists gain numeric default 0;

alter table public.tracabilite add column if not exists animal text;
alter table public.tracabilite add column if not exists type text;
alter table public.tracabilite add column if not exists etapes jsonb default '[]'::jsonb;
alter table public.tracabilite add column if not exists margefinale numeric default 0;
alter table public.tracabilite add column if not exists roi numeric default 0;

alter table public.veterinaires add column if not exists nom text;
alter table public.veterinaires add column if not exists specialite text;
alter table public.veterinaires add column if not exists tel text;
alter table public.veterinaires add column if not exists whatsapp text;
alter table public.veterinaires add column if not exists email text;
alter table public.veterinaires add column if not exists gps text;
alter table public.veterinaires add column if not exists adresse text;
alter table public.veterinaires add column if not exists note numeric default 0;
alter table public.veterinaires add column if not exists source text default 'manuel';

alter table public.transactions add column if not exists module_lie text;
alter table public.transactions add column if not exists related_id text;
alter table public.transactions add column if not exists client_id text;
alter table public.transactions add column if not exists fournisseur_id text;
alter table public.transactions add column if not exists statut text default 'paye';
alter table public.transactions add column if not exists justificatif_url text;
alter table public.transactions add column if not exists treasury_account_id text;
alter table public.transactions add column if not exists accounting_entry_id text;
alter table public.transactions add column if not exists type text;
alter table public.transactions add column if not exists libelle text;
alter table public.transactions add column if not exists montant bigint default 0;
alter table public.transactions add column if not exists date date;
alter table public.transactions add column if not exists categorie text;
alter table public.transactions add column if not exists paiement text;
alter table public.transactions add column if not exists justif boolean default false;

insert into storage.buckets (id, name, public)
values ('erp-media', 'erp-media', true)
on conflict (id) do update set public = true;

insert into public.automation_settings (id, key, label, description, enabled, category, frequency, message_template, audience)
values
  ('relances_clients', 'relances_clients', 'Relances clients', 'Rappel commandes en attente', true, 'whatsapp', 'quotidien', 'Bonjour {nom}, souhaitez-vous renouveler votre commande Horizon Farm ?', 'clients_a_relancer'),
  ('confirmations_ventes', 'confirmations_ventes', 'Confirmations ventes', 'Ticket automatique post-vente', true, 'whatsapp', 'apres_vente', 'Merci {nom}, votre commande Horizon Farm est confirmee.', 'clients_actifs'),
  ('rapports_production', 'rapports_production', 'Rapports production', 'Rapport hebdo pondeuses', false, 'whatsapp', 'hebdomadaire', 'Rapport production disponible: {resume}.', 'manager'),
  ('promotions_grossistes', 'promotions_grossistes', 'Promotions', 'Offres speciales grossistes', false, 'whatsapp', 'mensuel', 'Offre Horizon Farm pour grossistes: {offre}.', 'grossistes')
on conflict (key) do nothing;

insert into public.alimentation_logs (id, date, categorie, type_cible, cible_id, quantite, unite, montant_total, duree_jours, fournisseur_id, notes)
values
  ('ALIM001','2025-07-01','bovin','categorie_animale','',900,'kg',70000,30,'F-001','Aliment bovin mensuel'),
  ('ALIM002','2025-07-01','ovin','categorie_animale','',380,'kg',42000,30,'F-001','Ration ovins'),
  ('ALIM003','2025-07-02','pondeuse','lot_avicole','LOTPO001',1200,'kg',120000,14,'F-001','Aliment pondeuses'),
  ('ALIM004','2025-07-03','poulet_chair','lot_avicole','LOTCH001',900,'kg',98000,10,'F-001','Aliment chair')
on conflict (id) do nothing;

insert into public.production_oeufs_logs (id, lot_id, date, oeufs_produits, oeufs_casses, taux_ponte, notes)
values
  ('PROD001','LOTPO001','2026-05-05',398,12,0,'Production normale'),
  ('PROD002','LOTPO001','2026-05-06',412,9,0,'Hausse legere'),
  ('PROD003','LOTPO001','2026-05-07',405,8,0,'Journal du jour'),
  ('PROD004','LOTPO002','2026-05-05',318,7,0,'Lot secondaire'),
  ('PROD005','LOTPO002','2026-05-06',326,6,0,'Production stable'),
  ('PROD006','LOTPO002','2026-05-07',322,5,0,'Journal du jour')
on conflict (id) do nothing;

insert into public.sensor_devices (id, name, type, zone, location, status, battery_level)
values
  ('SENS001','Capteur meteo simulation','temperature','Station ferme','Dakar, Senegal','simulation',100),
  ('SENS002','Humidite poulailler A','humidite','Poulailler','Batiment pondeuses','simulation',88),
  ('SENS003','Niveau reservoir','eau','Reservoir eau','Forage principal','simulation',76)
on conflict (id) do nothing;

insert into public.camera_devices (id, name, zone, type, status)
values
  ('CAM001','Camera entree principale','Entree principale','simulation','simulation'),
  ('CAM002','Camera poulailler','Batiment pondeuses','simulation','simulation')
on conflict (id) do nothing;

-- Migration demo Senegal: remplace les anciennes donnees de test hors Senegal
-- si elles ont deja ete inserees par l'application.
update public.veterinaires set
  tel = '+221 77 111 22 33',
  whatsapp = '+221 77 111 22 33',
  email = 'kone@horizonfarm.sn',
  gps = '14.6928,-17.4467',
  adresse = 'Dakar Plateau, Senegal'
where id = 'VET01';

update public.veterinaires set
  tel = '+221 76 444 55 66',
  whatsapp = '+221 76 444 55 66',
  email = 'diallo@horizonfarm.sn',
  gps = '14.7886,-16.9246',
  adresse = 'Thies, Senegal'
where id = 'VET02';

update public.veterinaires set
  tel = '+221 70 777 88 99',
  whatsapp = '+221 70 777 88 99',
  email = 'traore@horizonfarm.sn',
  gps = '14.4215,-16.9655',
  adresse = 'Mbour, Senegal'
where id = 'VET03';

update public.clients set
  nom = 'Marche Sandaga Stand 12',
  tel = '+221 76 555 66 77',
  whatsapp = '+221 76 555 66 77',
  email = 'sandaga12@horizonfarm.sn',
  adresse = 'Marche Sandaga, Dakar, Senegal',
  gps = '14.6708,-17.4353',
  statut = 'actif'
where id = 'C-002';

update public.clients set
  nom = 'Coop. Agro Thies',
  tel = '+221 70 888 99 00',
  whatsapp = '+221 70 888 99 00',
  email = 'coopagrothies@horizonfarm.sn',
  adresse = 'Thies, Senegal',
  gps = '14.7886,-16.9246',
  statut = 'VIP'
where id = 'C-003';

update public.clients set
  nom = 'Famille Sarr Roger',
  tel = '+221 77 334 45 55',
  whatsapp = '+221 77 334 45 55',
  email = 'famillesarr@horizonfarm.sn',
  adresse = 'Mbour, Senegal',
  gps = '14.4215,-16.9655',
  statut = 'a_relancer'
where id = 'C-004';

update public.clients set
  tel = '+221 77 223 34 44',
  whatsapp = '+221 77 223 34 44',
  email = 'commandes@kouyate.sn',
  adresse = 'Dakar, Senegal',
  gps = '14.7167,-17.4677',
  statut = 'VIP'
where id = 'C-001';

update public.fournisseurs set nom = 'AgroAlim Senegal', tel = '+221 33 821 22 33', whatsapp = '+221 77 111 22 33', email = 'contact@agroalim.sn', statut = 'fiable' where id = 'F-001';
update public.fournisseurs set nom = 'Pharmavet Dakar', tel = '+221 33 844 55 66', whatsapp = '+221 76 444 55 66', email = 'pharmavet@horizonfarm.sn', statut = 'fiable' where id = 'F-002';
update public.fournisseurs set nom = 'Transport Rapide Senegal', tel = '+221 33 877 88 99', whatsapp = '+221 70 777 88 99', email = 'transport@rapide.sn', statut = 'actif' where id = 'F-003';
update public.fournisseurs set nom = 'MatAgri Senegal', tel = '+221 33 800 11 22', whatsapp = '+221 77 000 11 22', email = 'matagri@senegal.sn', statut = 'a_risque' where id = 'F-004';

do $$
declare
  table_name text;
  admin_user_id uuid;
  tables text[] := array[
    'animals','lots','vaccins','transactions','stocks',
    'clients','fournisseurs','investissements','tracabilite','cultures','veterinaires','automation_settings',
    'treasury_accounts','treasury_movements','accounting_accounts','accounting_entries','accounting_entry_lines',
    'accounting_budgets','accounting_closures','accounting_documents','alert_rules','alert_events',
    'sales','erp_documents','tasks','reports','equipment','audit_logs','offline_queue','api_webhooks','security_events',
    'alimentation_logs','production_oeufs_logs','animal_purchases','veterinary_rounds','veterinary_interventions','veterinary_intervention_targets','animal_health_records','animal_weight_records','intervention_medications','veterinary_intervention_templates','reproduction_events','sensor_devices','sensor_readings','camera_devices','business_plans','bp_investment_lines','bp_recurring_costs','bp_revenue_projections','bp_funding_sources','bp_links','bp_risks','price_catalog','bp_versions','bp_lines_history',
    'alertes_center','alertes_history','alertes_settings','whatsapp_notifications','whatsapp_templates','whatsapp_logs'
  ];
begin
  select id into admin_user_id from auth.users where email = 'penda@horizonfarm.app' limit 1;

  foreach table_name in array tables loop
    execute format('alter table public.%I add column if not exists owner_user_id uuid default auth.uid()', table_name);
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', table_name);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', table_name);
    if admin_user_id is not null then
      execute format('update public.%I set owner_user_id = %L::uuid where owner_user_id is null', table_name, admin_user_id);
    end if;
    execute format('alter table public.%I enable row level security', table_name);

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

revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;

drop policy if exists erp_media_public_read on storage.objects;
create policy erp_media_public_read on storage.objects
for select to public
using (bucket_id = 'erp-media');

drop policy if exists erp_media_authenticated_upload on storage.objects;
create policy erp_media_authenticated_upload on storage.objects
for insert to authenticated
with check (bucket_id = 'erp-media');

drop policy if exists erp_media_authenticated_update on storage.objects;
create policy erp_media_authenticated_update on storage.objects
for update to authenticated
using (bucket_id = 'erp-media');

drop policy if exists erp_media_authenticated_delete on storage.objects;
create policy erp_media_authenticated_delete on storage.objects
for delete to authenticated
using (bucket_id = 'erp-media');


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
notify pgrst, 'reload schema';

-- Sales money flow hardening: orders, payments, receivables and stock sellability.
ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS finance_transaction_id text,
  ADD COLUMN IF NOT EXISTS receivable_id text,
  ADD COLUMN IF NOT EXISTS invoice_document_id text,
  ADD COLUMN IF NOT EXISTS impact_applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS source_label text;

ALTER TABLE public.sales_order_items
  ADD COLUMN IF NOT EXISTS item_type text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS line_total numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_quantity_snapshot numeric,
  ADD COLUMN IF NOT EXISTS cost_snapshot numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_snapshot numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid DEFAULT auth.uid();

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS vente_id text,
  ADD COLUMN IF NOT EXISTS reste_a_payer numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method text;

ALTER TABLE public.stocks
  ADD COLUMN IF NOT EXISTS is_sellable boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.client_receivables (
  id text PRIMARY KEY,
  client_id text,
  sale_order_id text,
  initial_amount numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  remaining_amount numeric DEFAULT 0,
  status text DEFAULT 'ouverte',
  due_date date,
  notes text,
  owner_user_id uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_receivables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS client_receivables_owner ON public.client_receivables;
CREATE POLICY client_receivables_owner ON public.client_receivables
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_client_receivables_updated_at ON public.client_receivables;
CREATE TRIGGER trg_client_receivables_updated_at
  BEFORE UPDATE ON public.client_receivables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_client_receivables_client ON public.client_receivables(client_id);
CREATE INDEX IF NOT EXISTS idx_client_receivables_sale ON public.client_receivables(sale_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_payment_status ON public.sales_orders(statut_paiement);
CREATE INDEX IF NOT EXISTS idx_sales_orders_client ON public.sales_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_sales_source ON public.transactions(source_type, source_id);

NOTIFY pgrst, 'reload schema';
