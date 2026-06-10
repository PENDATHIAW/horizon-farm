# Audit ciblé — Reproduction ↔ Finance ↔ Investisseur

**Date :** 9 juin 2026  
**Statut :** Analyse uniquement — **aucune implémentation, aucun code**  
**Objectif :** Impacts financiers et investisseurs de tous les événements de reproduction  

---

## Scores

| Périmètre | Score actuel / 100 | Score cible post-V1 / 100 |
|-----------|-------------------|---------------------------|
| Valorisation cheptel à la naissance | 15 | 55 |
| Traçabilité finance ↔ reproduction | 20 | 60 |
| Indicateurs investisseur reproduction | 10 | 50 |
| Événements → écritures (règles claires) | 12 | 55 |
| Risque double comptabilisation maîtrisé | 25 | 70 |
| **Score global Reproduction–Finance–Investisseur** | **18 / 100** | **58 / 100** |

---

## 1. Une naissance augmente-t-elle la valeur du cheptel ?

### Réponse courte

**Oui pour l’effectif (quantité).** **Non ou très partiellement pour la valeur monétaire agrégée**, sauf si l’opérateur saisit manuellement une « valeur entrée » sur le jeune.

### Détail métier + code

| Dimension | Naissance / mise bas aujourd’hui | Verdict |
|-----------|----------------------------------|---------|
| **Effectif cheptel** | Chaque animal créé actif augmente `activeAnimals` (`ElevageRecoveredModule`, `computeFarmHeadcount`) | **Oui** (+1 tête) |
| **Valeur stockée `purchase_cost`** | `enrichAnimalEntryPayload` : si `mode_acquisition` = `naissance_ferme` ou `reproduction_interne` → **`purchase_cost = 0`** | **Pas d’augmentation valeur entrée** si pipeline enrichissement utilisé |
| **UI création Animaux** | `purchase_cost` **obligatoire** dans `buildCreateFields` — opérateur peut saisir > 0 par erreur | **Risque** valeur saisie à la main |
| **Hey Horizon** | Ne passe pas `mode_acquisition` ; pas `enrichAnimalEntryPayload` | Valeur **non structurée** |
| **Écriture `finances`** | **Aucune** création auto à la naissance | **Pas** d’augmentation trésorerie / actif comptable |
| **Compte 241 « Investissements agricoles / cheptel durable »** (`accounting.js`) | Existe en seed ; **pas** de mouvement auto naissance | **Non branché** |
| **`business_events`** | `buildCreateEvents` : `amount = purchase_cost` → **0 ou null** si naissance correcte | Trace info, pas valorisation |
| **Coût unifié / marge** | `calculateAnimalCost` : `baseCost = purchase_cost` ; rollup marque **« achat » manquant** si 0 | Jeune = coût alim+santé seulement, pas capital entrée |
| **Prix vente estimé** | Moteur `recommendAnimalSalePrice` sur poids/espèce — **pas** à la naissance automatique | Valeur **future**, pas cheptel comptable |

### Conclusion métier

Une naissance **renforce le cheptel en têtes** mais **ne valorise pas automatiquement** le patrimoine biologique dans Finance ni dans un actif « cheptel » consolidé. La valeur économique réelle (coût gestation, alimentation mère, mortalité néonatale) est **absorbée en charges** (alimentation_logs, santé) sans contrepartie actif naissance.

**Cible V1 :** règle explicite — naissance interne → `purchase_cost = 0` + **valorisation cheptel optionnelle** (champ `valeur_actif_biologique` ou écriture 241) calculée (règle espèce), **sans** doublon achat cash.

---

## 2. Où cette valeur est-elle stockée ?

| Emplacement | Champ / objet | Utilisé pour naissance ? | Rôle |
|-------------|---------------|--------------------------|------|
| **`animals`** | `purchase_cost`, `prix_achat`, `cout_achat` | Partiel (souvent 0 ou saisie erronée) | « Prix achat / valeur entrée » fiche |
| **`animals`** | `prix_vente_estime`, `sale_price`, `prix_vente_reel` | Non à la naissance | Valeur **vente** future / réalisée |
| **`animals`** | `mode_acquisition`, `mere_id`, `portee_id` | Si saisi | Origine, pas montant |
| **`business_events`** | `amount` sur event `naissance` / `reproduction` | Si purchase_cost > 0 | Trace agrégée (pas compta) |
| **`finances`** | transactions | **Non** auto naissance | Trésorerie / charges |
| **`investissements`** | lignes BP | **Non** naissance terrain | Investissement initial cheptel (achat) |
| **`bp_investment_lines`** | catégorie `cheptel` | BP wizard | Budget / concrétisation **achat** animaux |
| **`tracabilite`** | étapes animal | Naissance / gestation si update | Historique, pas agrégat € |
| **Dashboard** | `computeFarmHeadcount().activeAnimals` | Oui (+1) | Effectif, pas FCFA |
| **`elevageActivityPnl`** | `purchaseCost` agrégé bovins/ovins/caprins | Si purchase_cost > 0 | P&L activité |
| **`profitabilityRollupService`** | `rollupAnimalCosts.purchaseCost` | Idem | Rollup marge animal |
| **`reproduction_events`** | — | **Table non utilisée** | — |

**Il n’existe pas aujourd’hui une « valeur cheptel » consolidée** distincte du cumul des `purchase_cost` animaux + effectifs.

---

## 3. Quels indicateurs investisseurs utilisent aujourd’hui ces données ?

| Indicateur / rapport | Source données repro | Lien reproduction réel |
|----------------------|----------------------|------------------------|
| **Animaux actifs** (`buildElevageInvestorReport`, Résumé Élevage) | Count animaux non clos | **Indirect** — toute entrée y compris naissance |
| **Effectif ferme** (`computeFarmHeadcount`, dashboard) | `activeAnimals` | Idem — **pas** distingué naissance vs achat |
| **P&L activité bovins/ovins/caprins** (`elevageActivityPnl`) | `purchaseCost` + alim + santé | **Pas** taux gestation / naissances |
| **Export PDF Élevage** (`exportElevageInvestorPdf`) | P&L + alertes IA | **Zéro** KPI reproduction |
| **AnimauxEvolution — bucket `reproduction`** | Femelles `status_reproduction` gest/mise_bas | **Pas** naissances ; compte femelles gestantes |
| **Impact Business / Strategic** | CA/coûts animaux génériques | Pas pipeline repro |
| **Dossier financement BP** (`fundingDossierPdf`) | Lignes `cheptel_pondeuses`, `bovin` | **Budget investissement initial**, pas naissances courantes |
| **Investissements — concrétisation** (`InvestissementsV8`) | Création animaux `mode_acquisition: achat` + `purchase_cost` | **Achat BP**, pas naissance ferme |
| **Centre décisionnel / IA élevage** (`elevageIaInsights`) | Mortalité, ponte, marges lots | **Pas** repro ruminants |
| **KPI Reproduction hub** | `birthLikeEvents` regex events | **Approximatif**, pas financier |

**Aucun indicateur investisseur standard** (IVV, taux de renouvellement, valeur ajoutée reproduction, mortalité néonatale %) est calculé et exposé dans les rapports investisseurs actuels.

---

## 4. Quels indicateurs devraient exister ?

| Indicateur | Définition | Finance | Investisseur |
|------------|------------|---------|--------------|
| **Naissances période** | Count jeunes `mode_acquisition` naissance/repro interne | — | Oui |
| **Taux de renouvellement cheptel** | Naissances / femelles reproductrices actives | — | Oui |
| **Taux gestation** | Gestantes / saillies ou femelles exposées | — | Oui |
| **IVV / intervalle vêlage** | Jours entre mises bas (femelle) | — | Oui |
| **Mortalité néonatale** | Morts portée / petits déclarés | Charge perte | Oui |
| **Valorisation naissances** | Σ valeur actif biologique jeunes (règle) | Actif 241 | Oui |
| **Coût reproduction / tête** | IA + véto + alim gestante / naissances | Charges 602/601 | Oui |
| **Croissance nette cheptel** | Entrées naissance − sorties (vente/mort) | Effectif + valeur | Oui |
| **Marge jeune à sevrage** | Coût cumulé vs prix marché estimé | P&L | Oui (repliable) |
| **% portées avec preuve document** | Documents liés / mises bas | Conformité | Oui |

---

## 5. Quels événements reproduction doivent générer une écriture financière ?

### Matrice événements ↔ Finance (cible métier)

| Événement | Écriture financière aujourd’hui | Doit générer (cible) | Type | Compte cible (seed) | Notes |
|-----------|--------------------------------|----------------------|------|---------------------|-------|
| **Saillie naturelle** | Aucune | **Non** (pas cash) | — | — | Option : note seule |
| **Insémination** | Partiel si Santé/véto avec `cout` → finance manuelle | **Oui** si coût IA/technicien | Charge | 602 / 624 | Lien `reproduction_event` |
| **Diagnostic gestation** | Idem visite véto | **Oui** si facturé | Charge | 602 | Lien femelle |
| **Déclaration gestation** | Non | **Non** cash | — | — | Alimentation mère suit en charges |
| **Mise bas / naissance** | Non | **Non** sortie cash | — | — | Production interne |
| **Naissance — valorisation cheptel** | Non | **Oui** (écriture actif) | Actif biologique | **241** (débit) / contrepartie à définir* | *Odu production interne ou 701 en attente — **pas** 401 achat |
| **Mortalité néonatale** | Partiel `deces` event ; perte si `valeur_perte_estimee` | **Oui** si valeur > 0 | Charge / perte | 707 ou compte perte | Réduit actif si valorisé |
| **Sevrage** | Non | **Non** | — | — | Coûts alim en charges continues |
| **Transfert jeune** | Non | Non | — | — | — |
| **Réforme reproductrice** | Partiel Transformation / vente | **Oui** si vente ou abattage | Produit / charge | 701 / charges | Existant Transformation |
| **Achat femelle reproductrice** | Oui si saisie achat + finance | **Oui** | Actif / charge | 241 ou 601 | **Pas** naissance |

\*La contrepartie actif naissance doit éviter double comptage avec achat cash — typiquement **pas** de mouvement trésorerie ; journal **mémorandum inventaire biologique** ou crédit compte de production interne.

### Événements qui ne doivent **pas** générer une sortie trésorerie

Saillie, déclaration gestation, naissance interne, sevrage — seulement charges indirectes (alimentation, santé) déjà enregistrées via leurs modules.

---

## 6. Quels événements reproduction doivent apparaître dans les rapports investisseurs ?

### Matrice événements ↔ Investisseur

| Événement | Rapport actuel | Doit apparaître (cible) | Format suggéré |
|-----------|----------------|-------------------------|----------------|
| Saillie / IA | Non | Oui (repliable) | Journal + count période |
| Insémination | Non | Oui | Coût cumulé IA |
| Gestation déclarée | Non | Oui | Gestantes actives |
| Diagnostic | Non | Oui (repliable) | % positifs |
| Mise bas / naissance | Non (sauf effectif global) | **Oui** | Naissances période, par espèce |
| Mortalité néonatale | Non | **Oui** | % + impact FCFA |
| Sevrage | Non | Optionnel | Effectif post-sevrage |
| Réforme reproductrice | Partiel (sorties animaux) | Oui | Sorties reproducteurs |
| Valorisation cheptel naissances | Non | **Oui** | Σ actif biologique ajouté |
| Performance (IVV, intervalle) | Non | **Oui** (repliable) | Tableau + tendance |

### Rapports à enrichir (cible V1 — lecture seule)

1. **`buildElevageInvestorReport`** — section « Reproduction » (5–8 lignes max).  
2. **Export PDF Élevage** — tableau naissances / gestantes / renouvellement.  
3. **Impact Business** — perspective animaux : distinguer entrées naissance vs achat.  
4. **Dashboard pilotage** — option headcount « naissances 12 mois » (repliable).

**Ne pas** dupliquer le onglet Reproduction entier dans le PDF investisseur — **synthèse chiffrée** uniquement.

---

## 7. Risques de double comptabilisation

| # | Scénario | Mécanisme actuel | Impact | Mitigation cible V1 |
|---|----------|------------------|--------|---------------------|
| D1 | Naissance saisie avec `purchase_cost` > 0 | UI oblige valeur entrée | Cheptel + P&L « achat » comme si achat externe | Force 0 si naissance ; valorisation via champ/actif séparé |
| D2 | Naissance + écriture finance achat manuelle | Opérateur enregistre dépense + animal | Double charge | Garde-fou : mode naissance → pas libellé achat |
| D3 | BP investissement + naissance même animal | Ligne BP crée animaux `purchase_cost` ; naissance ultérieure doublon | Deux animaux ou double coût | Déduplication `source_record_id` / portée |
| D4 | `business_events.amount` + `finances.montant` | Event naissance amount + transaction | Double trace montant | Event sans amount si actif 241 |
| D5 | `creation_animal` + `naissance` events | Hey Horizon vs AppContext | Double événements | Unifier event_type |
| D6 | Effectif dashboard + ligne investissement cheptel | Headcount + BP catégorie cheptel | Investisseur voit deux « augmentations » | BP = initial ; naissances = flux courant |
| D7 | Coût alimentation mère + jeune | Deux `animal_id` logs | Correct si deux entités ; erreur si même log | Règle allocation portée |
| D8 | Opportunité vente sur naissance | `wrapCreate` → Commercial | Valorisation « vente » prématurée | Skip opp si naissance |
| D9 | Valorisation 241 + `purchase_cost` jeune | Cible V1 deux champs | Double actif | **Une** source : soit purchase_cost achat, soit actif_bio naissance |

---

## Synthèse des réponses directes

| Question | Réponse |
|----------|---------|
| 1. Naissance augmente valeur cheptel ? | **Effectif oui** ; **valeur monétaire consolidée non** (purchase_cost souvent 0, pas finance, pas 241) |
| 2. Où stockée ? | Principalement **`animals.purchase_cost`** (incomplet) ; effectif dans **headcount** ; pas actif biologique dédié |
| 3. Indicateurs investisseurs actuels ? | **Effectif actif**, P&L animal générique, BP cheptel initial — **pas** KPI reproduction |
| 4. Indicateurs à créer ? | Naissances, renouvellement, gestation, IVV, mortalité néonatale, valorisation, coût repro |
| 5. Écritures finance ? | IA/véto **charge** ; naissance **actif 241** (pas cash) ; mortalité néonatale **perte** ; pas saillie/gestation seules |
| 6. Rapports investisseurs ? | Naissances période, gestantes, renouvellement, mortalité néonatale, valorisation ajoutée, IVV (repliable) |
| 7. Double comptage ? | **9 scénarios** — purchase_cost naissance, events dupliqués, BP+naissance, opp vente |

---

## Plan V1 complémentaire (Finance & Investisseur)

| ID | Action | Impact score |
|----|--------|--------------|
| V1-F01 | Règle : naissance → `purchase_cost = 0` + champ valorisation actif (spec) | +15 |
| V1-F02 | Pas d’écriture `finances` sortie sur naissance ; spec écriture 241 optionnelle | +10 |
| V1-F03 | Insémination / véto repro → charge liée `reproduction_event` ou santé | +8 |
| V1-F04 | Section repro dans `buildElevageInvestorReport` (5 KPI) | +12 |
| V1-F05 | Export PDF : naissances période, gestantes, croissance nette cheptel | +8 |
| V1-F06 | Distinguer entrées naissance vs achat dans Impact Business | +5 |
| V1-F07 | Unifier events `naissance` vs `creation_animal` | +5 |
| V1-F08 | Skip opportunité vente naissance (aligné workflow) | +5 |
| V1-F09 | Documenter risques D1–D9 dans guide métier (pas code seul) | +3 |

**Score cible post-V1 : ~58/100** — fondation traçable, pas compta complète biologique (V2 : 241 automatisé, IVV, rapports forum investisseurs).

---

*Audit ciblé — validation métier avant implémentation V1 Reproduction.*
