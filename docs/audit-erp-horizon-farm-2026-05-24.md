# Audit ERP Horizon Farm — module par module

Date: 2026-05-24
Branche: `feature/objectifs-croissance-centre-decisionnel`
Source de vérité BP: `src/services/horizonFarmOfficialBusinessPlan.js`

## 1. Modules retrouvés dans `src/App.jsx`

Modules chargeables: `dashboard`, `assistant_erp`, `centre_ia`, `objectifs_croissance`, `animaux`, `avicole`, `sante`, `finances`, `comptabilite`, `investissements`, `impact_business`, `stock`, `clients`, `fournisseurs`, `tracabilite`, `alertes`, `cultures`, `smartfarm`, `ventes`, `documents`, `taches`, `rh`, `rapports`, `equipements`, `sync`, `sync_activity`, `audit_logs`, `gestion_systeme`.

Modules visibles dans la navigation: Accueil, Assistant ERP, Centre décisionnel, Objectifs & Croissance, Animaux, Avicole, Santé & Vaccins, Finances, Comptabilité, Investissements, Impact & Valeur, Stock, Clients, Ventes, Fournisseurs, Traçabilité, Alertes, Cultures, Documents, Tâches, RH & Équipe, Rapports, Équipements, Smart Farm, Activité & Sync ERP, Gestion du système.

Sous-domaines présents mais non exposés comme modules autonomes: production œufs, alimentation, capteurs, caméras, météo, prix marché, calendrier marché, automatisations, justificatifs, audit logs.

## 2. Constats globaux

### Points solides

- La registry centrale existe dans `App.jsx`, ce qui permet de piloter les connexions depuis un seul endroit.
- Les flux ventes sont déjà fortement reliés à clients, stock, animaux, avicole, cultures, finances, documents, alertes, paiements, factures et livraisons.
- Le stock peut déjà créer des logs d’alimentation, des transactions finance et des événements métier.
- Investissements possède déjà un pont vers Avicole, Animaux et Cultures quand une ligne BP devient effective.
- Le Centre décisionnel consomme les données clés: ventes, paiements, finances, stock, avicole, production, alimentation, capteurs, caméras, météo, marché.
- Le BP officiel est centralisé dans `src/services/horizonFarmOfficialBusinessPlan.js`.

### Risques globaux

- Plusieurs modules demandés par le cahier des charges ne sont pas visibles comme entrées de navigation séparées, même si les données existent.
- Les champs libres sont encore probables dans les composants profonds, notamment ventes, stock, animaux, avicole, santé, documents et fournisseurs.
- Certains boutons ouvrent des actions de création ou de brouillon; il faut vérifier à l’exécution que les handlers existent toujours avant affichage.
- Les calculs utilisent des fallbacks robustes, mais il faut continuer à retirer les anciens chiffres codés en dur hors BP officiel.
- Le hook `useCrudModule` est appelé par mapping dans `App.jsx`; l’ordre est stable car `CRUD_KEYS` est constant, mais une passe lint React Hooks peut le signaler. À corriger dans un commit dédié par un hook agrégateur basé sur `useAppData`.

## 3. Audit par module

### 1. Dashboard / Accueil
- Fichier: `src/modules/DashboardV2.jsx`.
- Données reçues: avicole, animaux, santé, stock, clients, cultures, ventes, paiements, finances, alimentation, production œufs, opportunités, tâches, alertes, équipements, événements, météo.
- UI attendue: synthèse simple, KPIs, alertes, raccourcis.
- Vérifications: éviter les doublons avec Centre décisionnel; garder uniquement les indicateurs de pilotage immédiat.
- Connexions manquantes à vérifier: accès direct vers rapports, objectifs, alertes critiques.

### 2. Assistant ERP
- Fichier: `src/modules/AssistantERPV2.jsx`.
- Données reçues: `dataMap`, navigation.
- Risque: doublon avec Centre décisionnel si recommandations métier affichées en double.
- À garder: aide conversationnelle et actions guidées, pas les mêmes cartes KPI que le dashboard.

### 3. Centre décisionnel / CentreIA
- Fichier: `src/modules/CentreIA.jsx`.
- Sections observées: santé décisionnelle, objectif mensuel, créances, alertes, décisions prioritaires, cycles de production, alertes importantes, brouillons à valider.
- Connexions existantes: ventes, paiements, finances, stock, avicole, production œufs, alimentation, capteurs, caméras, météo, marché, calendrier marché.
- KPI à vérifier: score décisionnel, objectif mensuel, créances, alertes urgentes.
- Amélioration UI: bonne simplification actuelle, les détails restent limités aux 3 priorités.
- Manque: bouton clair vers Smart Farm quand un risque capteur/caméra est dominant.

### 4. Objectifs & Croissance
- Fichier: `src/modules/ObjectifsCroissance.jsx`.
- Sections observées: priorité croissance, objectifs mensuels officiels, plan financier léger, objectifs par activité, lien Centre décisionnel.
- Connexions existantes: BP officiel, moteur décisionnel, ventes, encaissements, finances via `dataMap`.
- Calculs à vérifier: CA mensuel prévu vs réalisé, encaissement, reste à vendre, ventilation par activité.
- Risque: objectifs mensuels affichés depuis le BP sans adaptation automatique aux événements réels exceptionnels.

### 5. Investissements
- Fichier: `src/modules/InvestissementsV8.jsx`.
- Sections observées: hypothèses opérationnelles BP, contrôle qualité, actifs métier créés depuis BP, portefeuille détaillé, évolution.
- Connexions existantes: finance, business plans, lignes BP, lots avicoles, animaux, cultures.
- Correction déjà présente dans le code: transformation de lignes effectives en actifs métier.
- Risque: `HORIZON_FARM_OPERATIONAL_CYCLES` vient de `horizonFarmBusinessPlanSeed`; vérifier qu’il ne réintroduit pas des chiffres anciens et qu’il reste aligné au BP officiel.
- À faire: privilégier `horizonFarmOfficialBusinessPlan.js` pour toutes les hypothèses affichées.

### 6. Finances
- Fichier: `src/modules/FinancesV11.jsx`.
- Données reçues: animaux, lots, cultures, stocks, investissements, clients, fournisseurs, alimentation, business plans, ventes, paiements.
- Connexions existantes: ventes, investissements, stock, animaux, avicole, comptabilité, objectifs, centre décisionnel.
- À vérifier: catégories obligatoires, statut payé/impayé/partiel, liaison document justificatif.

### 7. Comptabilité
- Fichier: `src/modules/ComptabiliteV6.jsx`.
- Données reçues: finances, ventes, paiements, clients, fournisseurs, stock, animaux, avicole, cultures, santé, investissements, équipements, documents.
- Connexions existantes: écritures calculées depuis flux opérationnels.
- À vérifier: éviter double écriture entre paiement vente et transaction finance.

### 8. Ventes
- Fichier: `src/modules/VentesV3.jsx`.
- Sections observées: plan financier léger, actions commerciales, vendre & encaisser, pilotage avancé.
- Connexions existantes: clients, stock, animaux, avicole, cultures, finances, documents, alertes, traçabilité, paiements, factures, livraisons.
- Calculs observés: CA, reste à encaisser, livraisons à clôturer, factures manquantes.
- À vérifier: sélection produit obligatoire, décrémentation stock/lot/animal/culture selon type de vente, création transaction finance à l’encaissement uniquement.

### 9. Clients
- Fichier: `src/modules/ClientsReadable.jsx`.
- Données reçues: ventes, paiements, finances.
- À vérifier: créances client, historique commandes, statut client, champs téléphone/adresse obligatoires si livraison.

### 10. Fournisseurs
- Fichier: `src/modules/FournisseursReadable.jsx`.
- Données reçues: stock, tâches, finances, documents.
- À vérifier: dettes fournisseurs, relances, documents d’achat, création tâche ou alerte si retard.

### 11. Stock
- Fichier: `src/modules/StocksV4.jsx`.
- Sections observées: stock courant, alimentation animaux/lots, évolution stock.
- Connexions existantes: alimentation logs, animaux, lots, fournisseurs, opportunités, tâches, finances, alertes, événements métier.
- Correction déjà présente dans le code: appliquer un plan d’alimentation retire le stock, crée un log alimentation, une transaction finance et un événement métier.
- À vérifier: champs libres produit/unité/catégorie à convertir en listes prédéfinies; seuil obligatoire; unité sac/kg cohérente.

### 12. Avicole
- Fichier: `src/modules/AvicoleV10.jsx`.
- Données reçues: finances, alimentation, production œufs, opportunités, événements.
- Connexions existantes: stock alimentation, ventes, finances, objectifs, centre décisionnel, investissements.
- À vérifier: mortalité, effectif courant, coût par tête, production œufs, cycles chair, réforme pondeuses.

### 13. Animaux
- Fichier: `src/modules/AnimauxV2.jsx`.
- Données reçues: alimentation, santé, événements, ventes, paiements, opportunités.
- Connexions existantes: stock alimentation, santé, ventes, finances, objectifs, centre décisionnel, investissements.
- À vérifier: espèce prédéfinie, coût d’achat, poids, date entrée, date vente cible, statut santé.

### 14. Cultures
- Fichier: `src/modules/CulturesV4.jsx`.
- Données reçues: finances, ventes, paiements, livraisons, événements, opportunités.
- Connexions existantes: ventes, finances, objectifs, centre décisionnel.
- Manque probable: liaison explicite stock intrants et météo dans les props directes.

### 15. Production œufs
- Pas module de navigation autonome.
- Données: `production_oeufs_logs`.
- Présent dans Avicole, Dashboard, Centre décisionnel, Objectifs.
- À créer si nécessaire: entrée navigation ou sous-module dédié avec saisie quotidienne, taux de ponte, casse/pertes, stock œufs, ventes œufs.

### 16. Alimentation
- Pas module de navigation autonome.
- Données: `alimentation_logs`.
- Présent dans Stock, Avicole, Animaux, Dashboard, Centre décisionnel.
- UI existante: planificateur dans Stock.
- À créer si nécessaire: vue consolidée alimentation par lot/animal/activité.

### 17. Santé / Alertes sanitaires
- Fichier: `src/modules/SanteV7.jsx`.
- Données reçues: vétérinaires, animaux, lots, stock, finances.
- Connexions existantes: création transaction finance, navigation.
- À vérifier: médicament/vaccin en liste, date rappel, statut retard, lien stock pharmacie.

### 18. Alertes
- Fichier: `src/modules/AlertesCenterTechnical.jsx`.
- Données reçues: finances, animaux, lots, stock, cultures, capteurs, WhatsApp templates/logs.
- Connexions existantes: centre décisionnel, WhatsApp simulé, modules opérationnels.
- À vérifier: action recommandée obligatoire, statut nouvelle/en cours/résolue.

### 19. SmartFarm / Capteurs
- Fichier: `src/modules/SmartFarm.jsx`.
- Données reçues: météo, capteurs, caméras, tâches, alertes, événements.
- Connexions existantes: tâches, alertes, centre décisionnel.
- À vérifier: statut capteur, seuils, dernière mesure, alerte automatique.

### 20. Caméras
- Pas module de navigation autonome.
- Données: `camera_devices` dans Smart Farm et Centre décisionnel.
- À créer si besoin: vue dédiée caméras ou onglet dans Smart Farm.

### 21. Météo
- Pas module de navigation autonome.
- Données: `useLiveWeather`, injectées dans Dashboard, Centre décisionnel, Smart Farm.
- À vérifier: fallback si API indisponible, source affichée, impact cultures.

### 22. Marché / Prix marché
- Pas module de navigation autonome.
- Données: `market_prices` dans Centre décisionnel.
- À créer si besoin: table prix par produit, zone, date, source.

### 23. Calendrier marché
- Pas module de navigation autonome.
- Données: `market_calendar_events` dans Centre décisionnel.
- À créer si besoin: calendrier commercial avec Tabaski/Ramadan/Korité/fin d’année et événements personnalisés.

### 24. Tâches / Automatisations
- Fichier: `src/modules/TachesTechnical.jsx`.
- Données reçues: alertes, animaux, lots, stock, capteurs, événements.
- Connexions existantes: alertes, centre décisionnel, sync.
- À vérifier: échéance obligatoire, responsable, priorité, statut.

### 25. Documents / Justificatifs
- Fichier: `src/modules/DocumentsV2.jsx`.
- Données reçues: animaux, lots, cultures, clients, fournisseurs, finances.
- Connexions existantes: finances, ventes, équipements, rapports.
- À vérifier: document obligatoire pour dépenses significatives, type prédéfini, module lié.

### 26. Paramètres / Gestion système
- Fichier: `src/modules/GestionSysteme.jsx`.
- À vérifier: paramètres métier, listes de valeurs, seuils, rôles, sécurité.

### 27. RH / Personnel / Salaires
- Fichier: `src/modules/RH.jsx`.
- Connexions existantes: finance via création transaction.
- À vérifier: salaires du BP, charges sociales, paiements mensuels, justificatifs.

### 28. Rapports / Exports
- Fichier: `src/modules/Rapports.jsx`.
- Données reçues: synthèse multi-modules.
- Connexions existantes: documents générés.
- À vérifier: export fiable, pas de double comptage CA/paiements.

### 29. Business Plan / Prévisionnel
- Présent via Investissements et Objectifs & Croissance, pas module autonome.
- Source unique à maintenir: `horizonFarmOfficialBusinessPlan.js`.
- À vérifier: aucune constante ancienne hors service officiel.

### 30. Impact & Valeur
- Fichier: `src/modules/ImpactBusiness.jsx`.
- Rôle: mesure pertes, alertes, valeur créée, événements.
- À vérifier: éviter doublon avec Dashboard/Centre décisionnel.

### 31. Traçabilité
- Fichier: `src/modules/Tracabilite.jsx`.
- Données reçues: événements métier, animaux, lots, cultures.
- À vérifier: écriture automatique depuis vente, stock, santé, investissement.

### 32. Équipements
- Fichier: `src/modules/Equipements.jsx`.
- Connexions existantes: tâches, alertes, finances, documents.
- À vérifier: maintenance, panne, amortissement éventuel, lien investissement.

### 33. Activité & Sync ERP / Audit logs
- Fichier: `src/modules/SyncActivityCenter.jsx`.
- Connexions existantes: refresh global, offline queue, audit logs, tâches, alertes, ventes, documents, événements.
- À vérifier: affichage clair des erreurs sync et actions de reprise.

## 4. Connexions existantes principales

- Ventes → clients, stock, animaux, avicole, cultures, finances, comptabilité, objectifs, centre décisionnel, documents, alertes, traçabilité.
- Stock → finances, alimentation, animaux, avicole, fournisseurs, tâches, alertes, centre décisionnel, événements métier.
- Investissements → finances, BP, avicole, animaux, cultures, centre décisionnel, objectifs.
- Avicole → alimentation, production œufs, finances, ventes, objectifs, centre décisionnel.
- Animaux → alimentation, santé, ventes, finances, objectifs, centre décisionnel.
- Cultures → ventes, finances, objectifs, centre décisionnel; liaison stock intrants/météo à renforcer.
- Santé → animaux, avicole, stock, finances.
- Documents → finances, clients, fournisseurs, animaux, avicole, cultures.
- Smart Farm → capteurs, caméras, météo, tâches, alertes, centre décisionnel.

## 5. Connexions manquantes ou à renforcer

1. Cultures ↔ Stock intrants.
2. Cultures ↔ Météo avec alertes météo opérationnelles.
3. Caméras comme module/onglet exploitable si l’utilisateur doit les gérer séparément.
4. Production œufs comme vue dédiée si la saisie quotidienne devient centrale.
5. Alimentation comme vue consolidée par activité.
6. Marché / Prix marché avec formulaire de prix par produit.
7. Calendrier marché avec dates personnalisables plutôt que dates indicatives codées.
8. BP officiel à imposer dans tous les panneaux qui affichent hypothèses et montants.

## 6. Corrections appliquées dans ce commit

- Ajout du présent audit versionné dans `docs/audit-erp-horizon-farm-2026-05-24.md` pour servir de feuille de route de correction module par module.
- Aucun fichier fonctionnel n’a été modifié dans ce commit, afin de respecter la consigne de petites corrections et d’éviter de casser l’existant sans exécution locale.

## 7. Prochains commits recommandés

1. Refactor App: remplacer le mapping de hooks CRUD par un hook agrégateur basé sur `useAppData`.
2. BP source unique: remplacer les imports restants de `horizonFarmBusinessPlanSeed` par `horizonFarmOfficialBusinessPlan.js` ou un adaptateur officiel.
3. Cultures: ajouter props et UI pour stock intrants + météo.
4. Smart Farm: séparer onglets Capteurs / Caméras / Météo et ajouter actions vers alertes.
5. Production œufs: créer une vue consolidée ou entrée navigation si besoin.
6. Alimentation: créer une vue consolidée depuis `alimentation_logs`.
7. Formulaires: convertir champs libres critiques en listes prédéfinies.
8. Vérification finale: lint, build, parcours boutons/formulaires, audit interconnexions complet en runtime.
