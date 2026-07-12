# État actuel du dépôt Horizon Farm ERP

Constat établi le 2026-07-12, avant toute modification, conformément à la méthode de travail imposée
(inventaire avant chantiers). Branche de travail : `claude/go-a21ueq`.

## 1. Pile technique

- React 18 + Vite, TailwindCSS (classes utilitaires en ligne), PWA avec file hors ligne (`offline_queue`).
- Supabase (auth, base, RLS partielle), voir `supabase/` et `supabase/migrations/` (26 migrations).
- Tests : `node --test` et `vite-node` pour l'unitaire (~90 suites listées dans `package.json`), Playwright pour l'E2E.
- Taille : 1 256 fichiers JS/JSX sous `src/` (~13 Mo).

## 2. Modules et routes

### 2.1 Mécanisme

- Pas de routeur URL : `src/App.jsx` maintient un état `active` (identifiant de module) et charge le
  composant via `lazy()` depuis `src/config/moduleEntryPoints.js` (source unique des entry points).
- Registre central : `src/config/modules.config.js` (`MODULE_REGISTRY`, `NAV_MODULE_ORDER`,
  `ROUTE_TO_MODULE`, `ADVANCED_MODULE_IDS`).
- Alias de compatibilité déjà en place : `DEPRECATED_MODULE_ALIASES` dans `moduleEntryPoints.js`
  (`impact_business`, `investisseurs_forums`, `financeurs` → `financements`). Le mécanisme de
  redirection existe donc et peut être réutilisé pour les renommages du chantier 2.

### 2.2 Modules principaux (18 entrées de navigation)

| Identifiant actuel | Libellé affiché | Entry point réel | Écart vs cible |
|---|---|---|---|
| dashboard | Accueil | dashboard/AccueilRefinedEntry.jsx | onglets non conformes |
| assistant_erp | Assistant ERP | AssistantERPV2.jsx | 4 onglets au lieu d'un écran unique |
| centre_ia | Centre décisionnel | CentreIA.jsx | identifiant à renommer en `centre_decisionnel` |
| agri_feeds | AGRI FEEDS | AgriFeedsModule.jsx | pas de flag par ferme |
| objectifs_croissance | Objectifs & Croissance | ObjectifsCroissanceV2.jsx | onglets non conformes |
| financements | Financements | FinancementsModule.jsx | renommage déjà fait (alias en place) |
| elevage | Élevage | ElevageModule.jsx → ElevageRecoveredModule | onglets non conformes |
| cultures | Cultures | CulturesRecoveredModule.jsx | onglets non conformes |
| commercial | Commercial | CommercialModule.jsx | onglets non conformes |
| achats_stock | Achats & Stock | AchatsStockModule.jsx | onglets non conformes |
| finance_pilotage | Finance & Pilotage | FinancePilotageModule.jsx | onglets non conformes |
| activite_suivi | Activité & Suivi | ActiviteSuiviModule.jsx | onglets non conformes |
| documents_rapports | Documents & Rapports | DocumentsRapportsModule.jsx | onglets non conformes |
| rh | Opérations & Ressources | RHV2.jsx | identifiant à renommer en `equipe`, libellé à changer |
| equipements | Équipements | EquipementsV3.jsx | onglets non conformes |
| smartfarm | Smart Farm | SmartFarm.jsx | pas de flag par ferme |
| sync_activity | Activité & Sync ERP | SyncActivityCenter.jsx | à fusionner dans Gestion du système |
| gestion_systeme | Gestion du système | GestionSystemeV2.jsx | onglets non conformes |

### 2.3 Modules historiques (« avancés », accessibles par route directe)

`animaux`, `avicole`, `sante`, `finances`, `comptabilite`, `investissements`, `stock`, `clients`,
`fournisseurs`, `tracabilite`, `alertes`, `ventes`, `documents`, `taches`, `rapports`, `sync`,
`audit_logs`. Chacun a son entry point propre (`AnimauxV2.jsx`, `AvicoleV10.jsx`, `StocksV5.jsx`,
`AlertesCenterV3.jsx`, `TachesV3.jsx`, etc.). `sync`, `sync_activity` et `audit_logs` pointent tous
les trois vers `SyncActivityCenter.jsx`.

## 3. Onglets réels par module

Constat : les onglets sont codés en dur dans les composants de module (chaînes littérales dans le
JSX et les `useState`), pas dans un fichier de configuration par module. Il existe une liste cible
historique dans `src/config/horizonVision.config.js` (`MODULE_TARGET_TABS`) et des tests de
stabilité (`tests/unit/moduleTabsStability.test.js`), mais aucune configuration consommée à
l'exécution avec id, libellé, composant, rôle requis et flag.

Onglets constatés (source `MODULE_TARGET_TABS`, vérifiés par les tests de stabilité) :

- Accueil : Carnet Horizon · Priorités du jour · Indicateurs ferme · Vue financeur rapide
- Assistant ERP : Hey Horizon · Questions métier · Aide à la décision · Recherche dans les données
- Centre décisionnel : Urgences & risques · Écarts & cohérence · Actions prioritaires (· Croissance & opportunités)
- AGRI FEEDS : Tableau de bord · Référence Phase 1 · Matières & fournisseurs · Formulations · Production · Tests & comparaison · Commercial · Qualité & reporting
- Objectifs & Croissance : Suivi du Business Plan · Prévisionnel vs réel · Simulations · Capacité de remboursement
- Élevage : Lots & bandes · Pondeuses · Embouche bovine · Santé & biosécurité · Alimentation · Performances
- Cultures : Parcelles & campagnes · Irrigation · Récoltes · Économie circulaire · Marge parcelle
- Commercial : Ventes · Clients & créances · Livraisons · Factures · Marge commerciale
- Achats & Stock : Inventaire · Réceptions & achats · Fournisseurs & dettes · Mouvements stock · Matières organiques
- Finance & Pilotage : Résumé · Trésorerie · Créances & dettes · Coûts par filière · Financement · Écarts budget
- Activité & Suivi : Tâches du jour · Alertes · Décisions · Registre d'actions · Traçabilité opérationnelle
- Documents & Rapports : Documents · Justificatifs · Rapports financeur · Exports · Audit documentaire
- Financements : Tableau de bord · Opportunités · Contacts · Dossiers & pièces · Fonds & justificatifs · Espace Financeurs
- Opérations & Ressources (rh) : Équipe · Responsabilités · Planning · Temps de travail · Incidents
- Équipements : Équipements · Maintenance · Pannes · Coûts · Disponibilité
- Smart Farm : Capteurs · Eau · Énergie · Alertes techniques · Automatisation terrain
- Activité & Sync ERP : Vérifications · Connexion & envoi · Journal d'activité · Données hors ligne
- Gestion du système : Utilisateurs · Rôles · Fermes · Sécurité · Audit · Paramètres

Aucun module n'est conforme à la structure cible du chantier 3 telle quelle.

## 4. Tables Supabase constatées (~110)

Extraites de `supabase/erp_schema_export.sql`, `horizon_farm_prod_schema.sql`,
`horizon_farm_ai_schema.sql` et des 26 migrations :

- Élevage : animals, lots, alimentation_logs, production_oeufs_logs, animal_health_records,
  animal_purchases, animal_weight_records, reproduction_events, vaccins, veterinaires,
  veterinary_interventions (+ rounds, templates, targets, medications), tracabilite
- Commercial : clients, sales, sales_orders, sales_order_items, sales_opportunities, deliveries,
  invoices, payments, client_receivables, price_catalog
- Achats & Stock : stocks, stock_movements, fournisseurs
- Finance : transactions, treasury_accounts, treasury_movements, investissements,
  accounting_* (accounts, budgets, closures, documents, entries, entry_lines), farm_cost_settings
- Cultures : cultures
- Activité : tasks, alert_rules, alert_events, alertes_center, alertes_history, alertes_settings
- Documents : documents, erp_documents, reports
- Équipe : farm_rh_directory, profiles, user_farm_access
- Équipements : equipment
- AGRI FEEDS : feed_* (raw_materials, raw_batches, formulas, formula_versions,
  formula_ingredients, facility_zones, production_orders, finished_batches, quality_checks, trials)
- Smart Farm : sensor_devices, sensor_readings, camera_devices, smartfarm_events
- Financements : funding_* (opportunities, contacts, applications, document_library, agreements,
  expense_allocations, reports, project_journal), funder_accounts, funder_access_logs,
  investor_forum_* (profiles, documents, contacts, exports)
- Objectifs : business_plans, bp_* (versions, links, risks, investment_lines, recurring_costs,
  revenue_projections, funding_sources, lines_history)
- Système : farms, companies, system_settings, module_role_permissions, audit_logs,
  security_events, business_events, offline_queue, push_subscriptions, deleted_records,
  automation_settings, api_webhooks
- IA/marché : ai_recommendations, ai_decisions, ai_intake_events, ai_scores, market_prices,
  market_price_sources, market_calendar_events, whatsapp_* (logs, templates, notifications)

Points notables vs invariants cibles :

- `business_events` et `audit_logs` existent déjà et sont séparés.
- `alertes_center` est une table centrale d'alertes ; `alert_rules`/`alert_events` coexistent
  (à vérifier comme doublon potentiel au chantier 3).
- `farm_id` : généralisation en cours (migrations `multi_farm_foundations`,
  `stock_movements_farm_scope`, `elevage_logs_farm_id`, durcissement RLS AGRI FEEDS et
  financements). Non prouvé sur toutes les tables métier ; pas de vérification systématique
  farm_id + index + RLS.
- Aucune table de KPI locale détectée par module, mais les formules de KPI vivent dans le code
  (`src/services/kpiEngine/`), pas dans un catalogue administrable.

## 5. Composants

- 55 composants partagés dans `src/components/` (+ sous-dossiers charts, commercial, elevage,
  investments, module, workflow, greenpreneurs, investorForums).
- Pas de composants uniques `JournalEvenements`, `ListeTaches`, `ListeAlertes`, `CarteKPI` au sens
  du chantier 4. Existants approchants : `KpiCard.jsx`, `MiniMetricCard.jsx`, `ModuleTimeline.jsx`,
  `NotificationCenter.jsx`, `DataTable.jsx`. Chaque module affiche ses tâches/alertes/journaux avec
  ses propres rendus locaux.

## 6. Chaînes de texte en dur

- Aucune structure i18n : ni `src/i18n/`, ni dictionnaire de libellés. Toutes les chaînes visibles
  sont dans les composants.
- Scan (heuristique : littéraux et nœuds JSX contenant des caractères accentués) :
  18 506 occurrences françaises réparties dans les 1 256 fichiers scannés.
- Répertoires les plus chargés : `src/modules/vision` (474), `src/services/investorForums` (354),
  `src/modules/dashboard` (327), `src/modules/elevage` (293), `src/services/decisionMethodology.js`
  (282), `src/modules/agriFeeds` (276), `src/modules/commercial` (264).
- Termes interdits par la charte constatés dans des chaînes visibles : « canonique » (8 fichiers
  JSX), formulations de type « L'IA propose, l'humain valide », « hallucination », « niveau de
  confiance » (Assistant, AGRI FEEDS, Santé, services IA). Le tiret long apparaît dans 533 fichiers
  (code et chaînes confondus). Le mot « IA » apparaît à l'écran (Centre IA, panneaux d'analyse).

## 7. Rôles et permissions

- Rôles constatés : `FARM_ACCESS_ROLES` dans `src/config/farmActivities.js` : super_admin,
  direction, farm_manager, farm_accountant, farm_agent, farm_commercial, farm_stock_manager,
  farm_veterinary, farm_readonly. Table `module_role_permissions` en base.
- Écart : la cible impose huit rôles (promotrice_direction, responsable_filiere, terrain, finance,
  veterinaire, maintenance, financeur_externe, admin_support). Un rôle financeur existe côté
  Financements (`funder_accounts`, espace financeur en lecture seule).

## 8. Feature flags

- Aucun mécanisme de flag par ferme. Tous les modules (AGRI FEEDS, Smart Farm, Financements,
  Assistant) sont toujours chargés dans `MODULE_ENTRY_POINTS` et visibles dans `NAV_MODULE_ORDER`.
  Le chargement est différé (`lazy()`), mais rien ne conditionne route, import ou requêtes à un
  flag de ferme.

## 9. Autres constats utiles aux chantiers

- Météo : présente sur l'Accueil (`src/utils/weather.js`, utilisée par `DashboardShell.jsx`,
  `dashboardV3Panels.jsx`, `farmDashboardPanels.jsx`). À retirer au chantier 6.
- Assistant : onglets multiples dont questions/aide/recherche ; la cible impose un écran unique
  Conversation avec Suggestions.
- La ferme par défaut existe (`farms`, `accessibleFarms`), multi-fermes amorcé
  (`multi_farm_foundations`).
- Idempotence : `tests/unit/workflowIdempotency.test.js` existe ; `event_key` à vérifier sur tous
  les flux.
- Nombreux documents d'audit antérieurs dans `docs/` (MODULE_CANONICAL_MAP.md,
  AUDIT_ERP_FONCTIONNEL_COMPLET_2026-06.md, etc.) qui documentent la dette : versions multiples de
  modules (`FinancesV12`, `AvicoleV10`, etc.), fichiers legacy interdits comme entry points.

## 10. Écarts majeurs par rapport à la version cible (résumé)

1. Aucun dictionnaire de libellés ; ~18 500 chaînes en dur ; termes interdits présents à l'écran.
2. Identifiants non conformes : `centre_ia`, `rh` ; modules de synchronisation non fusionnés dans
   Gestion du système.
3. Pas de feature flags par ferme avec chargement réellement conditionné.
4. Onglets non conformes au chantier 3 dans les 18 modules, et non définis en configuration.
5. Composants uniques (JournalEvenements, ListeTaches, ListeAlertes, CarteKPI) absents.
6. Contrat des 20 secondes non formalisé ni testé.
7. Catalogue central des KPI et des 15 alertes non administrable en base.
8. Rôles non alignés sur les huit rôles cibles.
