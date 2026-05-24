# Horizon Farm — suivi des constats utilisateur et corrections ERP

Date : 2026-05-24
Branche : `feature/objectifs-croissance-centre-decisionnel`

Ce document reprend les constats utilisateur à traiter comme checklist de référence pour les corrections ERP.

## Règle générale validée

L’ERP doit parler métier ferme, pas technique. Les interconnexions normales doivent être gérées en amont par le code : vente, paiement, finance, comptabilité, stock, actifs, documents, tâches, alertes, objectifs et centre décisionnel.

## Checklist des constats

| # | Constat utilisateur | Statut | Correction / décision |
|---|---|---|---|
| 1 | Le commentaire “coût poussins chair corrigé à 1 024 000 FCFA/mois” ne doit pas figurer dans l’ERP. | Corrigé / vérifié | Recherche globale sans résultat sur les libellés à supprimer. Le chiffre reste une donnée BP, pas un commentaire UI. |
| 2 | Investissements affiche deux boutons “Synchroniser BP”. | Corrigé / vérifié statiquement | Recherche globale sans résultat sur “Synchroniser BP” ou “Synchroniser”. `InvestissementsV8` met en haut “Concrétiser un investissement”, puis replie le portefeuille. |
| 3 | “Vente 1ère bande le 03/07” ne doit pas être codé en dur ; date = date ajout lot + 40 jours. | Corrigé | Service `productionCycleDates.js` ajouté ; Centre décisionnel affiche les dates calculées depuis les dates d’ajout réelles. |
| 4 | Centre décisionnel doit calculer dates vente chair, vente bovins, réforme pondeuses selon cycles validés. | Corrigé | Chair J+40, bovins J+90, surveillance réforme pondeuses J+510 depuis date d’ajout. |
| 5 | Supprimer “Vue simplifiée”. | Corrigé / vérifié | Recherche globale sans résultat. |
| 6 | Supprimer “Priorités métier, bouton de correction, testeur humain AI avec simulations de formulaires, puis commande guidée.” | Corrigé / vérifié | Assistant ERP simplifié ; recherche globale sans résultat. |
| 7 | Supprimer texte “Mode données réelles / Mode données simulées”. | Corrigé / vérifié | Recherche globale sans résultat. |
| 8 | Supprimer “L’assistant classe ce qui bloque la cohérence ou la rentabilité de l’ERP.” | Corrigé / vérifié | Recherche globale sans résultat. |
| 9 | Accueil : fusionner “Pilotage ferme / L’essentiel à suivre” et “Objectif du mois / Situation actuelle”. | Corrigé / vérifié statiquement | `DashboardV2` affiche un seul bloc “Pilotage ferme · objectif du mois” et n’appelle plus l’ancien dashboard. |
| 10 | Doublon KPI & BP officiel dans Rapports et Objectifs & Croissance. | Corrigé | Le bloc BP reste dans Objectifs & Croissance ; retiré du haut de Rapports. |
| 11 | PDF financeur incomplet, pas éditable/solide, trop de “à compléter”. | Corrigé | Nouveau `FinancingDossierGenerator.jsx` avec choix BP + financeur et dossier enrichi. |
| 12 | PDF doit demander BP concerné s’il y en a plusieurs. | Corrigé | Sélecteur Business Plan ajouté au générateur. |
| 13 | PDF doit demander financeur DER/FONGIP/BNDE/etc. | Corrigé | Financeurs : DER/FJ, FONGIP, BNDE/Banque, Partenaire privé. |
| 14 | Impact & Valeur ERP : onglet Dossier Banque/Partenaire à relier au générateur. | Corrigé / vérifié statiquement | `ImpactBusiness.jsx` réutilise `FinancingDossierGenerator`. |
| 15 | Objectifs annuels/mensuels par activité : chair, pondeuses, bovins. | Corrigé / à affiner avec données réelles | `ActivityCycleGoalsPanel.jsx` ajouté : objectifs mensuels par cycles réels + BP. |
| 16 | Équipements contient RH, équipements, dépenses, preuves : garder seulement équipements. | Corrigé / vérifié statiquement | `EquipementsV2` charge uniquement `Equipements`. `Equipements.jsx` contient actions rapides équipements, parc matériel, maintenance et évolution équipements. |
| 17 | Ventes : BP/objectifs trop en haut ; créer/modifier/suivre vente doit être en haut. | Corrigé / vérifié statiquement | Ventes routé vers `VentesV5` puis `VentesTerrainV2`. |
| 18 | Ventes : supprimer “Contrôle comptable Paiements ↔ Finances” et tout bouton synchroniser/lier. | Corrigé / vérifié | Recherche globale sans résultat sur les libellés techniques. |
| 19 | Interconnexion vente → finances/comptabilité doit être automatique. | Corrigé côté flux vente terrain / vérifié callbacks | `VentesTerrainV2` crée paiement, transaction finance, facture, document, impact source. `App.jsx` transmet les callbacks nécessaires. Comptabilité reste à renforcer côté écritures formelles si modèle comptable détaillé requis. |
| 20 | Objectif mensuel global/par activité : pas linéaire, dépend de l’investissement et de la capacité réelle. | Corrigé conceptuellement | Objectifs par cycles réels : chair J+40, bovins J+90, pondeuses actives/taux ponte. |
| 21 | Investissements : concrétiser un investissement doit exister. | Corrigé / vérifié statiquement | `InvestissementsV8` ajoute “Concrétiser un investissement” : création lot/animal/culture depuis dépense BP effective. |
| 22 | Comptabilité : écritures automatiques ou manuelles ? Maximum d’automatisation. | Corrigé en UX / partiel en logique | `AutomaticAccountingPanel` clarifie que les écritures suivent les actions métier ; manuel réservé aux régularisations. À renforcer si écritures débit/crédit détaillées nécessaires. |
| 23 | Tâches / Alertes : enrichir santé, biosécurité, alimentation, ramassage œufs, ventes, maintenance. | Corrigé | `FarmRoutineTasksPanel` ajouté dans Tâches et Alertes. |
| 24 | Assistant ERP : enlever section “Corriger depuis l’interface, sans terminal” et reprendre module. | Corrigé | `AssistantERPV2` simplifié, `AssistantERPInsights` nettoyé. |
| 25 | Gestion système : ramener “effacer les données” avec deux options. | Corrigé | `SystemDataResetPanel` ajouté : suppression sans rapport / rapport puis suppression. |
| 26 | Suppression ne doit pas concerner BP, BP multiples ni tables. | Corrigé | Clés BP/schémas/migrations protégées dans `SystemDataResetPanel`. |
| 27 | Gérer en amont toutes les interconnexions possibles. | En cours / continu | Ventes, investissements, tâches, finances, comptabilité, objectifs et centre décisionnel améliorés. Reste à continuer module par module. |
| 28 | Revoir structure de chaque module pour mettre le cœur du module en haut. | En cours / plusieurs modules corrigés | Ventes, Finances, Comptabilité, Accueil, Rapports, Impact, Investissements, Tâches/Alertes corrigés. Reste une passe build/visuelle globale. |

## Vérifications déjà faites

- Recherche globale effectuée sur les libellés supprimés : aucun résultat.
- Recherche globale sur “Synchroniser BP”, “Synchroniser”, “Contrôle comptable”, “Paiements ↔ Finances”, “sans finance”, “actifs non liés” : aucun résultat.
- Ventes routé : `VentesV3` → `VentesV5` → `SalesAutoTasksBridge` + `VentesV4` → `VentesTerrainV2`.
- `App.jsx` transmet les callbacks ventes : paiement, facture, livraison, finance, document, stock, lot, animal, culture, événement métier.
- Rapports et Impact utilisent le même générateur financeur.
- Accueil utilise un bloc fusionné “Pilotage ferme · objectif du mois”.
- Équipements est recentré sur actions rapides équipements, parc matériel, maintenance et évolution.

## Points à surveiller dans la prochaine passe

1. Vérifier build/lint localement : `npm run lint` et `npm run build`.
2. Tester visuellement Ventes : création vente payée, partielle, crédit, source stock, lot, animal et culture.
3. Tester visuellement Investissements : concrétiser une ligne BP effective vers lot/animal/culture.
4. Tester visuellement suppression système : avec rapport et sans rapport, en confirmant que BP/tables restent protégés.
5. Renforcer si besoin la comptabilité en écritures débit/crédit détaillées.
6. Continuer la passe structure module par module sur les modules non revérifiés visuellement.
