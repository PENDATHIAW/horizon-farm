# Audit Phase 1 · Cartographie du code réel

Établi en lecture seule le 2026-07-13, branche `claude/go-a21ueq`. Fondé sur le
code (`src/config/moduleTabs.config.js`, `moduleEntryPoints.js`, `modules.config.js`,
`src/utils/commercialNavigation.js`, migrations `supabase/`), pas sur les documents
d'architecture.

## 1. Modules, routes et onglets réels

Chargement : `src/config/moduleEntryPoints.js` (pas de routeur URL ; état `active`
dans `src/App.jsx`, composants en `lazy()`). Onglets réels = ceux que le composant
rend, exposés par `MODULE_TABS_CONFIG` (sourcé des constantes `*_TABS` de
`commercialNavigation.js`, vérité du rendu).

| Module (id) | Libellé | Entry point réel | Onglets réellement rendus |
|---|---|---|---|
| dashboard | Accueil | dashboard/AccueilConforme.jsx | Vue du jour · Pilotage · Mes actions |
| assistant_erp | Assistant | AssistantERPV2.jsx | Hey Horizon · Questions métier · Aide à la décision · Recherche dans les données |
| centre_decisionnel | Centre décisionnel | CentreIA.jsx → centre/CentreDecisionModule | À traiter · Écarts · Risques · Décisions · Historique |
| agri_feeds | AGRI FEEDS | AgriFeedsModule.jsx | Tableau de bord · Référence Phase 1 · Matières & fournisseurs · Formulations · Production · Tests & comparaison · Commercial · Qualité & reporting |
| objectifs_croissance | Objectifs & Croissance | ObjectifsCroissanceV2.jsx | Suivi du Business Plan · Efficacité Technique & Zootechnique · Simulateur Sandbox · Sécurisation des Flux |
| financements | Financements | FinancementsModule.jsx | Tableau de bord · Opportunités · Contacts · Dossiers & pièces · Fonds & justificatifs · Espace Financeurs |
| elevage | Élevage | ElevageModule → ElevageRecoveredModule | Lots & bandes · Cycles & Reproduction · Santé · Transformation |
| cultures | Cultures | CulturesRecoveredModule.jsx | Parcelles & campagnes · Récoltes · Économie circulaire |
| commercial | Commercial | CommercialModule → CommercialShell | Ventes · Opportunités · Clients & créances · Livraisons · Abonnements · Pilotage |
| achats_stock | Achats & Stock | AchatsStockModule → AchatsStockRecoveredModule | Inventaire · Réceptions & achats · Fournisseurs & dettes |
| finance_pilotage | Finance & Pilotage | FinancePilotageModule → FinancePilotageRecoveredModule | Résumé · Trésorerie · Créances & dettes · Pilotage · Graphiques |
| activite_suivi | Activité & Suivi | ActiviteSuiviModule → ActiviteSuiviRecoveredModule | Cockpit & décisions · À traiter maintenant · Registre & traçabilité · Performance & analytique |
| documents_rapports | Documents & Rapports | DocumentsRapportsModule.jsx | Centre de contrôle · Gestionnaire & OCR · Rapprochement & preuves · Rapports & exports |
| equipe | Équipe | RHV2 → OperationsRessourcesRecoveredModule | Cockpit RH & Maintenance · Personnel & Paie · Parc Matériel & Maintenance · Registres & Analyses |
| equipements | Équipements | EquipementsV3.jsx | Équipements · Maintenance · Pannes · Coûts · Disponibilité |
| smartfarm | Smart Farm | SmartFarm → SmartFarmRecoveredModule | Objets connectés · Flux temps réel · Automatisation |
| gestion_systeme | Gestion du système | GestionSystemeV2 → GestionSystemeUnified | Vue admin · Utilisateurs · Fermes · Paramètres · Sécurité · Synchronisation · Sauvegardes · Réinitialisation · Audit |

Sous-onglets techniques : `sync_activity` (Vérifications · Connexion & envoi ·
Journal d'activité) est intégré dans Gestion du système › Synchronisation.

### Écart onglets réels vs structure cible (lot 4 du cahier des charges)

| Module | Réel | Cible | Écart |
|---|---|---|---|
| Accueil | 3 | 3 | conforme (mais Pilotage/Mes actions à vérifier au contenu) |
| Assistant | 4 | 1 (Conversation) | 3 onglets de trop |
| Centre décisionnel | 5 | 5 | conforme en libellés |
| Objectifs | 4 (noms techniques) | 3 (Objectifs · Scénarios · Historique) | libellés non conformes, Capacité/Rentabilité non fusionnés |
| Élevage | 4 | 8 | manque Vue d'ensemble, Lots & animaux, Alimentation, Production, Coûts & performance, Historique ; Transformation présente |
| Cultures | 3 | 7 | manque Campagnes, Irrigation, Intrants, Coûts & marge, Historique |
| Commercial | 6 | 7 | libellés partiels ; manque Factures & paiements, Créances & relances, Réclamations séparés |
| Achats & Stock | 3 | 7 | manque Produits & catégories, Stocks & lots, Mouvements, Inventaires séparés |
| Finance & Pilotage | 5 | 6 | libellés non conformes (Graphiques, Pilotage) |
| Activité & Suivi | 4 | 5 | libellés non conformes ; manque Calendrier, Alertes liées séparés |
| Documents & Rapports | 4 | 5 | libellés non conformes (OCR, Rapprochement) |
| Équipe | 4 | 4 | libellés non conformes (Paie, Maintenance présentes alors que collecte minimale demandée) |
| Équipements | 5 | 5 | proche |
| Smart Farm | 3 | 7 | manque Eau, Énergie, Bâtiments, Dispositifs, Qualité, Configuration |
| Gestion du système | 9 | 9 | proche mais Sauvegardes/Réinitialisation hors cible, manque Rôles & permissions, Référentiels, Catalogues KPI & alertes explicites |
| AGRI FEEDS | 8 | 8 | proche |
| Financements | 6 | Cockpit 8 + Espace financeur 5 | faces non séparées, onglets manquants |

Constat : **seuls Accueil et Centre décisionnel ont été réellement restructurés
vers la cible** (chantier 3). Les autres modules gardent leurs onglets d'origine ;
la configuration `MODULE_TABS_CONFIG` documente la cible dans le champ `cible` mais
ne l'a pas encore appliquée.

### Routes et alias (rétro-compatibilité)

`ROUTE_TO_MODULE` (modules.config.js) et `DEPRECATED_MODULE_ALIASES`
(moduleEntryPoints.js) redirigent : `ventes/clients/sales_orders → commercial`,
`stock/fournisseurs → achats_stock`, `animaux/avicole/sante → elevage`,
`finances/investissements → finance_pilotage`, `alertes/taches/tracabilite →
activite_suivi`, `documents/rapports → documents_rapports`, `centre_ia →
centre_decisionnel`, `rh → equipe`, `investisseurs_forums/impact_business/financeurs
→ financements`, `sync/sync_activity/audit_logs → gestion_systeme`. Aucune ancienne
route cassée.

## 2. Tables Supabase : farm_id, RLS, module écrivain

Sources : `supabase/migrations/*.sql`, `supabase/*.sql`. ~110 tables. `farm_id`
n'est ajouté qu'aux tables P0 par `20260606120000_multi_farm_foundations.sql` et
quelques migrations ciblées.

### Tables portant `farm_id` (vérifié dans les migrations)

`animals`, `lots`, `stocks`, `sales_orders`, `finances`, `cultures`,
`business_events` (multi_farm_foundations, avec index) ; `stock_movements`
(stock_movements_farm_scope) ; `alimentation_logs`, `production_oeufs_logs`
(elevage_logs_farm_id) ; `feed_*` (agri_feeds_rls_hardening) ; `funding_*`,
`funder_*` (financements_refactor) ; `farm_cost_settings`, `farm_rh_directory`,
`user_farm_access`.

### Tables métier SANS `farm_id` (échantillon vérifié — manquantes)

`clients`, `fournisseurs`, `invoices`, `payments`, `deliveries`,
`sales_order_items`, `sales_opportunities`, `client_receivables`, `price_catalog`,
`transactions`, `treasury_accounts`, `treasury_movements`, `investissements`,
`accounting_*`, `tasks`, `alert_rules`, `alert_events`, `alertes_center`,
`alertes_history`, `documents`, `erp_documents`, `reports`, `equipment`,
`sensor_devices`, `camera_devices`, `veterinaires`, `vaccins`,
`veterinary_interventions`, `animal_*`, `reproduction_events`, `tracabilite`,
`business_plans`, `bp_*`, `whatsapp_*`, `market_*`, `ai_*`.

### RLS

RLS *par ferme* (fonctions `can_read_farm/can_write_farm/can_access_farm`) :
`farms`, `user_farm_access`, `stock_movements`, `funding_*`, `funder_*`,
`feed_*`, `investor_forum_*`, `client_receivables`, `farm_cost_settings`,
`farm_rh_directory`, `module_role_permissions`, `ai_recommendations`. RLS
*générique* (can_read_erp / can_write_erp, non scindée par ferme) sur les tables
métier de `202605130002_business_tables_rls_read_write.sql`. La majorité des
tables métier n'a donc **ni farm_id ni RLS par ferme** : l'isolation multi-ferme
n'est pas garantie côté base (détail en 99_transverse.md §1).

### Module écrivain (propriété)

`clients/sales_orders/sales_order_items/invoices/payments/deliveries/
sales_opportunities/client_receivables` ← Commercial · `stocks/stock_movements/
fournisseurs/price_catalog` ← Achats & Stock · `finances/transactions/treasury_*/
investissements/accounting_*` ← Finance · `animals/lots/alimentation_logs/
production_oeufs_logs/vaccins/veterinary_*/reproduction_events` ← Élevage ·
`cultures` ← Cultures · `tasks` ← Activité & Suivi · `alertes_center` (+ satellites
`alert_rules/alert_events/alertes_history/alertes_settings`) ← moteur d'alertes ·
`business_plans/bp_*` ← Objectifs · `documents/erp_documents/reports` ← Documents ·
`farm_rh_directory` ← Équipe · `equipment` ← Équipements · `feed_*` ← AGRI FEEDS ·
`sensor_devices/camera_devices/smartfarm_events` ← Smart Farm · `funding_*/funder_*/
investor_forum_*` ← Financements · `farms/companies/system_settings/
module_role_permissions/audit_logs/security_events/business_events/offline_queue/
push_subscriptions/deleted_records` ← Gestion du système.

## 3. Composants partagés et doublons

### Composants partagés réels (`src/components/`, 55+ fichiers)

Cartes/tables : `KpiCard.jsx`, `MiniMetricCard.jsx`, `MiniCharts.jsx`,
`DataTable.jsx`, `ModuleTimeline.jsx`, `NotificationCenter.jsx`. Modales :
`QuickInputModal.jsx`, `SaleDetailModal.jsx`, `ClientFicheModal.jsx`,
`FournisseurFicheModal.jsx`, `CultureFicheModal.jsx`, `AnimalDetailsModal.jsx`,
`AvicoleLotDetailsModal.jsx`. Barre d'onglets : `module/ModuleTabsBar.jsx`.
Composants uniques (chantier 4) : `uniques/JournalEvenements.jsx`,
`uniques/ListeTaches.jsx`, `uniques/ListeAlertes.jsx`, `uniques/CarteKPI.jsx`.

### Doublons et implémentations concurrentes (problème majeur)

- **Composants uniques peu adoptés** : `uniques/*` n'est importé que par **3
  modules** (Accueil, Centre). Les autres affichent tâches/alertes/KPI via des
  rendus locaux : **43 fichiers** utilisent `KpiCard` local (pas le catalogue),
  **51 fichiers** créent/affichent des alertes localement. La duplication visée
  par le chantier 4 subsiste presque partout.
- **Versions legacy multiples du même module** conservées dans `src/modules/`
  (non chargées mais présentes) : Finances ×11 (`FinancesV1`…`V12`), Avicole ×9,
  Investissements ×8, Sante ×7, Comptabilite ×6, Ventes ×5, Stocks ×4, Cultures
  ×4, ImpactBusinessStrategic ×4, ImpactFarmValueBridge ×4, VentesTerrain ×2,
  Taches ×2, Equipements ×2, AlertesCenter ×2. Environ 60 fichiers de modules
  obsolètes, source de confusion et de dette.
- **Deux familles d'affichage KPI** : `KpiCard`/`MiniMetricCard` (calcul passé en
  props, souvent recalculé localement) vs `uniques/CarteKPI` (lit le catalogue).
- **Tables d'alertes satellites** : `alertes_center` + `alert_rules` +
  `alert_events` + `alertes_history` + `alertes_settings` (voir 99_transverse §3).

## 4. Rôles

Rôles réels (`src/config/farmActivities.js` `FARM_ACCESS_ROLES`, `AuthContext`
`ROLE_PERMISSIONS`) : `super_admin, direction, farm_manager, farm_accountant,
farm_agent, farm_commercial, farm_stock_manager, farm_veterinary, farm_readonly`
+ rôles legacy `admin/manager/employe/veterinaire`. **Écart** : la cible impose
huit rôles (`promotrice_direction, responsable_filiere, terrain, finance,
veterinaire, maintenance, financeur_externe, admin_support`) non implémentés tels
quels ; seul `financeur_externe` a un équivalent (espace financeur).
