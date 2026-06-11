# Horizon Farm — ERP UX Simplification Master Audit V1

Date : 2026-06-09  
Branche : `cursor/erp-ux-master-audit-v1-ac42`  
Méthode : scan code + analyse composants (539 JSX, 35 routes) — **audit lecture seule, aucune implémentation**

**Contexte** : après Finance P1, Commercial V1, ERP Transversal, UX Anti-Doublons, Architecture Canonique, Canonical Execution — les vérités métier sont stabilisées. Le problème prioritaire est la **complexité visuelle** et la **surcharge de navigation**, sans réduire artificiellement le nombre d’onglets ni créer des « onglets monstres ».

**Contraintes respectées** : aucune suppression métier · aucune modification des moteurs canoniques · aucun changement routes/permissions/données.

---

## Synthèse exécutive

| Indicateur | Valeur |
|------------|--------|
| Modules accessibles (routes App) | **35** |
| Modules menu principal | **17** |
| Onglets niveau 1 (grands modules) | **~110** cumulés |
| Fichiers panneaux dédiés (commercial/finance/elevage/vision) | **84** |
| Écrans classés CRITICAL (charge visuelle) | **8** |
| Écrans VERY_LONG (scroll) | **6** |

**Diagnostic** : l’ERP n’est pas « trop d’onglets » en nombre absolu — il est **trop chargé dans les onglets Résumé** et dans **Production / Avicole / Finance Résumé**, qui empilent KPI + panneaux IA + workflows + tableaux sur une seule page.

**Principe directeur UX proposé** :  
`Onglet métier` → `sous-onglet ou drawer` → `panneau repliable` — jamais tout au même niveau sur un seul scroll.

---

## Phase 1 — MODULE_INVENTORY

### 1.1 Modules navigation principale

| MODULE | ROUTE | COMPOSANT PRINCIPAL | ONGLETS | SOUS-ONGLETS | PANNEAUX | KPI (estim.) | TABLEAUX |
|--------|-------|---------------------|---------|--------------|----------|--------------|----------|
| Accueil | `dashboard` | `DashboardV2.jsx` | 2 | 0 | 12+ | 8–14 | 0 |
| Assistant ERP | `assistant_erp` | `HeyHorizonModule.jsx` | 1 page | 0 | 10 | 4 | 0 |
| Centre décisionnel | `centre_ia` | `CentreDecisionModule.jsx` | 7 | 0 | 11 (centre) + 17 (vision) | 2 | 1 |
| Objectifs & Croissance | `objectifs_croissance` | `ObjectifsDecisionModule.jsx` | 6 | 0 | 11 | 4 | 2 |
| Élevage | `elevage` | `ElevageRecoveredModule.jsx` | 11 | 2 (Avicole activité) | 16 (elevage/) + bridges | 6–30* | 3 |
| Commercial | `commercial` | `CommercialRecoveredModule.jsx` | 10 | 0 | 30 (commercial/) | 6 | 2 |
| Achats & Stock | `achats_stock` | `AchatsStockRecoveredModule.jsx` | 7 | 0 | 14 (achatsStock/) | 4 | 2 |
| Finance & Pilotage | `finance_pilotage` | `FinancePilotageRecoveredModule.jsx` | 11 | 0 | 21 (finance/) | 8 | 3 |
| Activité & Suivi | `activite_suivi` | `ActiviteSuiviRecoveredModule.jsx` | 5 | 0 | 7 | 4 | 3 |
| Documents & Rapports | `documents_rapports` | `DocumentsRapportsModule.jsx` | 7 | 0 | 5 | 3 | 2 |
| Investisseurs & Forums | `investisseurs_forums` | `InvestisseursForumsModule.jsx` | 9 | 9 sections dossier | 4 | 6 | 1 |
| Cultures | `cultures` | `CulturesRecoveredModule.jsx` | 10 | 0 | 13 (cultures/) | 4 | 2 |
| RH & Équipe | `rh` | `OperationsRessourcesRecoveredModule.jsx` | 7 | 0 | 4 | 5 | 2 |
| Équipements | `equipements` | alias RH → `EquipementsV3` | — | — | bridges | — | — |
| Smart Farm | `smartfarm` | `SmartFarmRecoveredModule.jsx` | 5 | 0 | 3 | 2 | 2 |
| Activité & Sync | `sync_activity` | `SyncActivityCenter.jsx` | 1 | 0 | 3 | 1 | 2 |
| Gestion système | `gestion_systeme` | `GestionSystemeUnified.jsx` | 8 | 0 | 4 | 2 | 1 |

\* Élevage : 6 KPI cockpit Résumé ; ProductionHub seul expose ~12 KPI hero + blocs espèces.

### 1.2 Routes avancées (hors menu, accessibles App)

| ROUTE | COMPOSANT | RATTACHEMENT UX |
|-------|-----------|-----------------|
| `animaux`, `avicole`, `sante` | AnimauxV2, AvicoleV10, SanteV8 | Élevage (onglets) |
| `ventes` | VentesV5.jsx | Commercial (embed) |
| `finances`, `comptabilite`, `investissements` | FinancesV12, ComptabiliteV7, InvestissementsV9 | Finance |
| `stock`, `fournisseurs` | StocksV5, FournisseursReadable | Achats & Stock |
| `clients` | ClientsReadable | Commercial |
| `alertes`, `taches`, `tracabilite` | AlertesCenterV3, TachesV3, TracabiliteV2 | Activité |
| `documents`, `rapports` | DocumentsV2, RapportsV2 | Documents |
| `sync`, `audit_logs` | SyncActivityCenter | Système |
| `impact_business` | alias InvestisseursForums | Legacy |

### 1.3 Surfaces globales (non routes)

| SURFACE | FICHIER | RÔLE |
|---------|---------|------|
| AssistantPanel (flottant) | `AssistantPanel.jsx` | Hey Horizon overlay |
| ErrorBoundary | `App.jsx` | Recovery module |
| AppLayout + nav | `AppLayout.jsx` | 17 entrées menu |

---

## Phase 2 — SCREEN_MAP (cartographie écran par écran)

Légende widgets : KPI · Carte action · Panneau IA · Tableau · Graphique · Formulaire/modal · Repliable.

### Accueil — `dashboard`

| Onglet | Cartes / widgets | Tableaux | Formulaires |
|--------|------------------|----------|-------------|
| **Résumé** | Score santé, trésorerie, alertes, météo, KPI activité (4–8), brief dirigeant V3, priorités, narration, modules rapides, Hey Horizon strip, repliables : présentation, multi-fermes, investisseur, exploitation, suivi | — | Overlay présentation |
| **Graphiques** | Courbes CA, encaissements, trésorerie, production | — | — |

### Commercial — `commercial`

| Onglet | Contenu visible |
|--------|-----------------|
| **Résumé** | 6 KPI · quick actions (5 btn) · InsightPanel · QuotesPanel · Reconciliation teaser · Relances teaser · todos · top clients · segments teaser |
| **Ventes** | VentesV5 : liste commandes, modal vente, devis, encaissement, livraison |
| **Clients** | ClientsReadable · SegmentsPanel · ProspectsPanel |
| **Livraisons** | CommercialDeliveriesPanel |
| **Abonnements** | CommercialSubscriptionsPanel |
| **Relances** | CommercialScheduledRelancesPanel |
| **Opportunités** | CommercialOpportunitiesPanel |
| **Pilotage** | CommercialPilotagePanel (marges, graphiques métier) |
| **Annexe** | CommercialAnnexeTab |
| **Graphiques** | ModuleGraphiquesTab |

### Élevage — `elevage`

| Onglet | Contenu visible |
|--------|-----------------|
| **Résumé** | StartupPanel · 6 KPI cockpit · Brief assistant · Actions terrain (6) · Repliable : P&L, rentabilité, IA, findings · Parcours 6 cartes |
| **Cycles** | ElevageCyclesPanel (planification, questions production) |
| **Animaux** | AnimauxV2 (CRUD, fiches, évolution) |
| **Avicole** | AvicoleV10 : sections modulaires, journal ponte, lots chair/pondeuse, bridges vente, historique lifecycle |
| **Alimentation** | FeedingHub (rations, distributions) |
| **Santé** | SanteV8 + blocs sanitaires élevage |
| **Reproduction** | ReproductionHub + formulaire workflow |
| **Production** | ProductionHub : 6 KPI hero + diagnostic + 4 blocs repliables espèces (œufs, chair, bovins, transformation) |
| **Transformation** | TransformationHub + formulaire officiel |
| **Annexe** | ElevageAnnexeVault |
| **Graphiques** | ModuleGraphiquesTab élevage |

### Finance — `finance_pilotage`

| Onglet | Contenu visible |
|--------|-----------------|
| **Résumé** | Demo banner · ExecutiveSituation · DataQuality · Alerts · MultiFarm · Startup · Hey Horizon strip · Exports · 8 KPI · IA panel · Missing proof · Coherence · Grille 7 workflows |
| **Trésorerie** | FinancesV12 (écritures complètes) |
| **Créances** | CreancesPanel |
| **Dettes** | DettesPanel |
| **Échéancier** | Schedule + Aging + CashFlow forecast (3 panneaux) |
| **Financement** | FinancingPanel + simulateur |
| **Réconciliation** | FinanceReconciliationPanel + IA |
| **Investissements** | InvestissementsV9 (BP complet) |
| **Rentabilité** | RentabilitePanel |
| **Annexe** | FinanceAnnexePanel |
| **Graphiques** | ModuleGraphiquesTab |

### Achats & Stock — `achats_stock`

| Onglet | Contenu |
|--------|---------|
| **Résumé** | KPI stock, dettes, péremption, startup, findings |
| **Stock** | StocksV5 + repliable transferts/sources |
| **Achats** | AchatsStockPurchasesPanel |
| **Fournisseurs** | FournisseursReadable |
| **Mouvements** | AchatsStockMovementsPanel |
| **Annexe** | AchatsStockAnnexeTab |
| **Graphiques** | ModuleGraphiquesTab |

### Cultures — `cultures`

| Onglet | Hub / contenu |
|--------|---------------|
| **Pilotage** | CulturesPilotageHub |
| **Cycles** | CulturesCyclesHub |
| **Parcelles & Cultures** | CulturesParcellesHub |
| **Intrants & Météo** | CulturesIntrantsHub |
| **Santé & Protection** | CulturesSanteHub |
| **Récoltes** | CulturesRecoltesHub |
| **Transformation** | CulturesTransformationHub |
| **Économie circulaire** | CulturesEconomieHub |
| **Annexe** | CulturesAnnexeTab |
| **Graphiques** | ModuleGraphiquesTab + narratifs |

### Centre décisionnel — `centre_ia`

| Onglet | Contenu |
|--------|---------|
| **À traiter** | VisionPrioritiesTab |
| **Recommandations** | CentreRecommandationsTab |
| **Cycles** | VisionCyclesTab |
| **Risques** | VisionRisksTab |
| **Historique** | CentreHistoriqueTab |
| **Annexe** | DecisionAnnexeTab |
| **Graphiques** | VisionDecisionGraphiquesTab |

### Objectifs — `objectifs_croissance`

| Onglet | Contenu |
|--------|---------|
| **Rentabilité Lot & Cycle** | RentabiliteLotCycleTab |
| **Efficacité Technique** | EfficaciteTechniqueTab |
| **Flux & Équilibres** | FluxEquilibresTab |
| **Maraîchage & Diversification** | MaraichageDiversificationTab |
| **Annexe** | DecisionAnnexeTab |
| **Graphiques** | ObjectifsGraphiquesTab |

### Autres modules (synthèse)

| Module | Onglets clés | Charge typique |
|--------|--------------|----------------|
| Activité & Suivi | Résumé, Alertes, Tâches, Traçabilité, Graphiques | MEDIUM |
| Documents & Rapports | Bibliothèque, Preuves, Rapports, Exports, Modèles | MEDIUM |
| RH / Équipements | Équipements, Maintenance, Affectations, Coûts | MEDIUM |
| Smart Farm | Capteurs, Caméras (CRUD générique) | LOW |
| Investisseurs | 9 onglets + 9 sections dossier éditable | HIGH |
| Gestion système | Admin, Fermes, Utilisateurs, Sécurité, Sauvegardes | LOW–MEDIUM |

---

## Phase 3 — VISUAL_COMPLEXITY_REPORT

Règles appliquées : HIGH > 8 KPI · CRITICAL > 12 KPI ou > 3 tableaux ou > 20 actions visibles.

| ÉCRAN | KPI | BOUTONS | TABLEAUX | GRAPHIQUES | FORMS | CLASSE |
|-------|-----|---------|----------|------------|-------|--------|
| Dashboard Résumé (expert) | 10–14 | 15+ | 0 | 2 | 0 | **CRITICAL** |
| Commercial Résumé | 6 | 12+ | 0 | 0 | 0 | **HIGH** |
| Commercial Ventes (VentesV5) | 2 | 20+ | 1 | 1 | 3 modals | **HIGH** |
| Élevage Résumé (repliables ouverts) | 6 + 8 | 12 | 0 | 0 | 0 | **HIGH** |
| Élevage Production | 12+ | 8 | 0 | 0 | 0 | **CRITICAL** |
| Élevage Avicole | 8+ | 15+ | 1 | 2 | 2 | **HIGH** |
| Finance Résumé | 8 | 14+ | 0 | 0 | 0 | **HIGH** |
| Finance Trésorerie (V12) | 4 | 25+ | 1 | 0 | 2 | **HIGH** |
| Finance Investissements | 6 | 20+ | 2 | 1 | 3 | **CRITICAL** |
| Achats Stock Résumé | 4 | 8 | 0 | 0 | 0 | MEDIUM |
| Cultures Pilotage | 4 | 6 | 1 | 1 | 1 | MEDIUM |
| Centre À traiter | 2 | 10+ | 0 | 0 | 0 | MEDIUM |
| Investisseurs Room | 6 | 20+ | 0 | 0 | 0 | **HIGH** |
| Hey Horizon (Assistant) | 4 | 20+ | 0 | 0 | 0 | **HIGH** |

**Zones CRITICAL à traiter en priorité** : Dashboard expert, Élevage Production, Finance Investissements, Avicole (densité sections).

---

## Phase 4 — PAGE_LENGTH_REPORT

Estimation scroll desktop (viewport ~900px) :

| ÉCRAN | LONGUEUR | CAUSE |
|-------|----------|-------|
| Dashboard Résumé expert | **VERY_LONG** | 8+ sections repliables empilées |
| Dashboard startup | LONG | Parcours + priorités |
| Commercial Résumé | **LONG** | 7 panneaux séquentiels |
| Élevage Résumé | LONG | Startup + cockpit + actions + repliables |
| Élevage Production (tous blocs ouverts) | **VERY_LONG** | 4 CollapsibleBlock + KPI doubles |
| Élevage Avicole | **VERY_LONG** | ModuleSection × N + bridges |
| Finance Résumé | **VERY_LONG** | 10+ panneaux avant KPI |
| Finance Échéancier | LONG | 3 panneaux empilés |
| Investisseurs Dossier | **VERY_LONG** | 9 sections édition |
| Cultures Récoltes | LONG | workflow + opportunités |

**Futurs « onglets monstres » identifiés** (si fusion sans sous-structure) :
- Fusion Résumé + Production Élevage → **interdit** (scroll > 3× normal)
- Fusion Commercial Résumé + Ventes → **interdit**
- Fusion Finance Résumé + Trésorerie → **interdit**

---

## Phase 5 — FREQUENCY_MATRIX

| FONCTIONNALITÉ | FRÉQUENCE | ÉCRAN ACTUEL | RECOMMANDATION UX |
|----------------|-----------|--------------|-------------------|
| Ramassage œufs / ponte | **QUOTIDIEN** | Avicole, workflows | Drawer rapide + Avicole sous-onglet Pondeuses |
| Distribution aliment | **QUOTIDIEN** | Alimentation, workflows | Barre actions Résumé Élevage |
| Nouvelle vente / encaissement | **QUOTIDIEN** | Commercial Ventes | Quick action Résumé (OK) |
| Livraison client | **QUOTIDIEN** | Commercial Livraisons | Todo Résumé → Livraisons |
| Stock réception / sortie | **QUOTIDIEN** | Achats Stock | Stock onglet |
| Trésorerie du jour | **QUOTIDIEN** | Finance Trésorerie | KPI Accueil + Finance Résumé |
| Alertes / tâches | **QUOTIDIEN** | Activité | Accueil priorités |
| Vaccination / soin | **HEBDOMADAIRE** | Santé Élevage | Onglet Santé (pas Résumé) |
| Réconciliation finance | **HEBDOMADAIRE** | Finance Réconciliation | Pas sur Résumé Commercial |
| Relances clients | **HEBDOMADAIRE** | Commercial Relances | Teaser Résumé (OK) |
| Cycles / planification | **HEBDOMADAIRE** | Élevage Cycles | Onglet dédié (OK) |
| Mortalité lot | **EXCEPTIONNEL** | Workflow modal | Drawer — pas onglet |
| Reproduction / mise bas | **EXCEPTIONNEL** | Reproduction | Onglet dédié (OK) |
| Transformation / abattage | **EXCEPTIONNEL** | Transformation | Onglet dédié (OK) |
| Investissements / BP | **MENSUEL** | Finance Investissements | Pas Résumé Finance |
| Rentabilité globale | **MENSUEL** | Finance Rentabilité, Objectifs | Dirigeant |
| Dossier investisseur | **MENSUEL** | Investisseurs | Module séparé (OK) |
| Récolte cultures | **EXCEPTIONNEL** | Cultures Récoltes | Onglet dédié (OK) |
| Paramètres système | **EXCEPTIONNEL** | Gestion système | Admin |

---

## Phase 6 — RECOMMANDATIONS UX PAR MODULE

### Pattern global recommandé

```
Niveau 1 — Onglet module (ex. Élevage)
Niveau 2 — Sous-onglet OU drawer (ex. Avicole → Pondeuses | Chair)
Niveau 3 — Panneau repliable (analyse, P&L, historique)
Niveau 4 — Modal / workflow (mortalité, vente, santé)
```

**Interdit** : empiler niveau 2 + 3 + 4 sur Résumé sans repliable par défaut fermé.

### Commercial

| PRINCIPAL | SOUS / DRAWER | REPLIABLE | MODALE |
|-----------|---------------|-----------|--------|
| Résumé (6 KPI + todos) | — | Insight IA | Nouvelle vente |
| Ventes | Devis \| Commandes \| Encaissements | — | SaleActionModal |
| Clients | Segments \| Prospects | — | Fiche client |
| Livraisons | — | — | Livraison |
| Relances | — | — | WhatsApp prep |
| Opportunités | Auto \| Manuelles | — | Convert |
| Pilotage | Marge \| Évolution | Graphiques insight | — |

**Résumé Commercial** : retirer **QuotesPanel complet** → lien « Devis en attente (N) » vers Ventes sous-filtre Devis. Garder teaser relances (OK).

### Finance

| PRINCIPAL | SOUS | REPLIABLE |
|-----------|------|-----------|
| Résumé | — | Executive only + 8 KPI ; replier workflows grid |
| Trésorerie | Entrées \| Sorties | — |
| Échéancier | Créances \| Dettes \| Forecast | — |
| Investissements | BP \| Actifs | Lignes BP |
| Rentabilité | Modules \| Global | — |

**Résumé Finance** : ordre proposé — ExecutiveSituation → 8 KPI → Alerts (si any) → repliable « Qualité données + Exports + IA ».

### Achats & Stock

Résumé léger · Stock = opérations quotidiennes · Achats/Fournisseurs mensuels · Mouvements pour audit.

### Cultures

Hubs par métier (OK) · Pilotage = quotidien saison · Récoltes = exceptionnel workflow.

### Centre décisionnel

À traiter = entrée dirigeant · Recommandations/Cycles/Risques = hebdo · Graphiques = mensuel.

### Investisseur

Room = lecture · Préparation/Dossier = édition · CRM/Export = mensuel · pas fusionner Room + Dossier.

---

## Phase 7 — ELEVAGE_UX_TARGET (priorité absolue)

### AVANT (structure actuelle)

| Zone | Problème |
|------|----------|
| **Résumé** | 6 KPI + brief + 6 actions + repliable P&L/IA/rentabilité + 6 cartes parcours = **LONG** |
| **Avicole** | Sections modulaires empilées, journal, bridges, historique = **VERY_LONG** |
| **Production** | 6 KPI + 4 blocs espèces repliables chacun avec 4–6 KPI = **CRITICAL si ouverts** |
| **Mortalité** | Pas d’onglet — workflow modal (OK) mais aussi actions Résumé |
| **Historique / Stats** | Dispersés Avicole + Graphiques |
| **Lots** | Pas d’onglet « Lots » — split Animaux / Avicole |

**Nombre onglets** : 11 (correct pour séparer métiers)  
**Scroll Résumé** : ~2–3 pages  
**Scroll Production ouvert** : ~4+ pages  

### APRÈS (cible UX — sans supprimer fonctionnalités)

| Onglet L1 | Sous-onglets L2 | Contenu max (1 scroll normal) |
|-----------|-----------------|-------------------------------|
| **Résumé** | — | 6 KPI cockpit · brief 2 lignes · barre 4 actions quotidiennes · todos (3 max) · **tout analyse en repliable fermé** |
| **Lots & cheptel** | **Avicole** : Pondeuses \| Chair \| Historique · **Animaux** : Bovins/Ovins | 1 tableau lots + fiche drawer |
| **Production** | **Œufs** \| **Chair** \| **Bovins/Lait** \| **Transformation** | 6 KPI hero sur L1 uniquement ; détail par sous-onglet |
| **Alimentation** | Distributions \| Plans | Formulaire + historique 7j |
| **Santé** | Animaux \| Lots \| Biosécurité | Formulaire officiel + liste retard |
| **Reproduction** | Saillies \| Gestations \| Mises bas | Workflow + calendrier |
| **Transformation** | Avicole \| Bovins | Formulaire officiel + stock impact |
| **Cycles** | Plan \| Bandes actives | (existant, OK) |
| **Annexe** | Documents | Vault |
| **Graphiques** | Production \| Financier \| Mortalité | Stats & historique centralisés |

**Changements clés** :
1. **Ne pas fusionner** les 11 onglets en 3 — **réorganiser** avec sous-onglets L2 sur Avicole et Production.
2. **Mortalité** : drawer workflow depuis Résumé, Avicole, Santé — jamais page dédiée.
3. **P&L / rentabilité filières** : sous-onglet Production → « Rentabilité » ou repliable fermé sur Résumé.
4. **Historique lifecycle** : sous-onglet Avicole « Historique », pas section ouverte par défaut.
5. **Statistiques** : uniquement onglet Graphiques (éviter doublon Production).

**Justification agriculteur** : actions quotidiennes (œufs, aliment, vente prep) en ≤ 2 clics depuis Résumé. **Justification éleveur** : lots chair/pondeuse séparés visuellement. **Justification dirigeant** : Production sous-onglets par espèce sans scroll infini.

### Mapping mental utilisateur → cible

| Demande utilisateur | AVANT | APRÈS |
|--------------------|-------|-------|
| « Mes lots » | Avicole + Animaux | Lots & cheptel → sous-onglets |
| « Ponte du jour » | Avicole / workflow | Résumé action + Avicole Pondeuses |
| « Mortalité » | Modal workflow | Drawer (idem, plus visible) |
| « Stats » | Graphiques + Production | Graphiques centralisé |
| « Reproduction » | Onglet Reproduction | Inchangé |

---

## Phase 8 — PROPOSITIONS FINALES (Commercial, Finance, Décisionnel)

### Commercial (cible)

- **Résumé** : 6 KPI · todos · quick actions · teasers (relances, réconciliation 1 ligne) — **max 1 scroll**
- **Ventes** : sous-navigation `Commandes | Devis | Encaissements` (tabs internes VentesV5)
- **Pilotage** : réservé dirigeant / investisseur — pas dupliquer KPI Résumé
- **Opportunités** : garder onglet — fréquence hebdo, pas sur Résumé

### Finance (cible)

- **Résumé** : situation exécutive + 8 KPI canoniques — panneaux secondaires **tous repliables fermés**
- **Trésorerie** : seule saisie quotidienne complète
- **Réconciliation** : hebdo, lien depuis todo pas banner permanent
- **Investissements** : module BP intact mais **hors** Résumé scroll

### Décisionnel (cible)

- **Centre** : « À traiter » = 1ère entrée dirigeant ; badges sur onglets Risques/Cycles
- **Objectifs** : exports Excel visibles mais **pas** sur chaque onglet — header module
- Réduire duplication Centre ↔ Objectifs : Centre = actions, Objectifs = analytics

---

## Phase 9 — ERP_UX_MASTER_SCORE

Scores 0–100 (après audits précédents, état code actuel — **avant** refonte UX).

| MODULE | Architecture | UX | Lisibilité | Charge visuelle | Parcours | Dirigeant | Investisseur | **Moy.** |
|--------|-------------|-----|------------|-----------------|----------|-----------|--------------|----------|
| Accueil | 82 | 68 | 70 | 55 | 72 | 75 | 70 | **69** |
| Assistant ERP | 78 | 74 | 76 | 65 | 80 | 72 | 68 | **73** |
| Centre IA | 80 | 70 | 72 | 62 | 68 | 78 | 74 | **73** |
| Objectifs | 82 | 76 | 78 | 70 | 74 | 80 | 76 | **77** |
| **Élevage** | 85 | **62** | **58** | **48** | 65 | 70 | 68 | **64** |
| Commercial | 84 | 72 | 74 | 58 | 78 | 76 | 72 | **73** |
| Achats & Stock | 83 | 78 | 80 | 72 | 80 | 74 | 68 | **76** |
| **Finance** | 88 | 70 | 68 | **52** | 72 | 74 | 76 | **71** |
| Cultures | 82 | 76 | 78 | 68 | 76 | 72 | 66 | **74** |
| Activité & Suivi | 80 | 82 | 84 | 75 | 85 | 70 | 62 | **76** |
| Documents | 78 | 80 | 82 | 74 | 78 | 72 | 74 | **77** |
| Investisseurs | 76 | 68 | 70 | 54 | 70 | 82 | **85** | **74** |
| RH / Ressources | 75 | 74 | 76 | 72 | 74 | 68 | 60 | **72** |
| Smart Farm | 74 | 80 | 82 | 78 | 76 | 62 | 58 | **73** |
| Gestion système | 82 | 85 | 86 | 82 | 78 | 70 | 55 | **76** |

### Score global ERP UX

| Dimension | Score |
|-----------|-------|
| Architecture navigation | **81** |
| UX agriculteur terrain | **72** |
| UX dirigeant | **74** |
| UX investisseur | **72** |
| Lisibilité information | **74** |
| Charge visuelle (inverse : plus bas = plus chargé) | **63** |
| **GLOBAL ERP UX** | **71** |

**Cible post-refonte (plan directeur)** : Global **85+** sans réduire le nombre d’onglets — en réduisant la densité des Résumé et en introduisant sous-onglets L2 (Élevage, Ventes, Production).

---

## Plan directeur — ordre de refonte UX (hors scope V1)

1. **Élevage** — sous-onglets Avicole + Production (priorité absolue)  
2. **Finance Résumé** — repliables par défaut fermés  
3. **Commercial Résumé** — déporter Quotes vers Ventes  
4. **Dashboard** — mode expert : repliables fermés par défaut  
5. **Investisseurs** — séparer lecture Room vs édition Dossier (navigation)  
6. **Centre / Objectifs** — clarifier rôles, badges onglets  

---

## Contraintes rappel

- ❌ Pas de fusion Résumé + métier sur un seul onglet géant  
- ❌ Pas de modification `consolidateFinance`, `buildConsolidatedCommercialKpis`, `summarizeSalesMargins`  
- ❌ Pas de suppression routes / permissions / données  
- ✅ Sous-onglets, drawers, repliables, modales, badges fréquence  

---

## Références code

- Onglets : `src/utils/commercialNavigation.js`, `src/config/horizonVision.config.js`
- Modules : `src/config/moduleEntryPoints.js`, `src/config/modules.config.js`
- Élevage cockpit : `src/modules/elevage/ElevageSummaryCockpit.jsx`, `ProductionHub.jsx`
- Discovery : `docs/reports/FULL_ERP_DISCOVERY_AUDIT_V1.md`
- Execution : `docs/reports/CANONICAL_EXECUTION_AUDIT_V1.md`

**Aucune modification de code dans cette mission — audit et plan directeur uniquement.**
