# Matrice Supabase farm_id, RLS et suppression logique

Audit distant du 2026-07-13 sur le projet `HORIZON FARM` (`xmqfvmswrjhteaijnaxb`).
Commande reproductible : `npm run db:migrate:matrix`. Le contrôle échoue si une table existante perd un des critères.

Résultat : **96 tables métier existantes conformes, 3 tables historiques absentes et non appelées par les sources, 0 anomalie**.
Les politiques de suppression autorisent la mutation selon le rôle ; la suppression applicative écrit `is_deleted`, `deleted_at` et `deleted_by`, et la politique de lecture masque les lignes supprimées.
Le contrôle comportemental complète la matrice : 86 assertions, 8 rôles, 2 fermes, 0 fuite et nettoyage complet.

| Table | farm_id | Index | FK | RLS | Lecture | Insertion | Modification | Suppression logique | Statut |
|---|---|---|---|---|---|---|---|---|---|
| `accounting_accounts` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `accounting_budgets` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `accounting_closures` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `accounting_documents` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `accounting_entries` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `accounting_entry_lines` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `ai_decisions` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | FAIT, absence confirmée et aucun appel source |
| `ai_intake_events` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | FAIT, absence confirmée et aucun appel source |
| `ai_recommendations` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `ai_scores` | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | FAIT, absence confirmée et aucun appel source |
| `alert_events` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `alert_rules` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `alertes_center` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `alertes_history` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `alertes_settings` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `alimentation_logs` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `animal_health_records` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `animal_purchases` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `animal_weight_records` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `animals` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_funding_sources` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_investment_lines` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_lines_history` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_links` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_recurring_costs` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_revenue_projections` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_risks` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `bp_versions` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `business_events` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `business_plans` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `camera_devices` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `client_receivables` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `clients` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `cultures` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `deliveries` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `documents` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `equipment` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `erp_documents` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `farm_cost_settings` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `farm_rh_directory` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_facility_zones` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_finished_batches` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_formula_ingredients` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_formula_versions` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_formulas` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_phase1_comparisons` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_production_orders` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_quality_checks` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_raw_batches` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_raw_materials` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `feed_trials` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `fournisseurs` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funder_access_logs` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funder_accounts` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_agreements` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_applications` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_contacts` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_document_library` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_expense_allocations` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_opportunities` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_project_journal` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `funding_reports` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `intervention_medications` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `investissements` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `investor_forum_contacts` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `investor_forum_documents` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `investor_forum_exports` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `investor_forum_profiles` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `invoices` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `lots` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `payments` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `planning_simulations` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `price_catalog` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `production_oeufs_logs` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `reports` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `reproduction_events` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `sales` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `sales_opportunities` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `sales_order_items` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `sales_orders` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `sensor_devices` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `sensor_readings` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `smartfarm_events` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `stock_movements` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `stocks` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `tasks` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `tracabilite` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `transactions` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `treasury_accounts` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `treasury_movements` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `vaccins` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `veterinaires` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `veterinary_intervention_targets` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `veterinary_intervention_templates` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `veterinary_interventions` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `veterinary_rounds` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `whatsapp_logs` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `whatsapp_notifications` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |
| `whatsapp_templates` | UUID NOT NULL | Oui | Oui | Forcée | Oui | Oui | Oui | Oui, 3 colonnes et politique | FAIT |

Preuves complémentaires : `npm run db:migrate:verify` retourne zéro ligne ; `60/60` tables CRUD et `71/71` tables directement référencées sont présentes.
