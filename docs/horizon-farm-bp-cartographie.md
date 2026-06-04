# Cartographie BP Horizon Farm — fichier financier officiel

Source analysée : `Plan-financier-previsionnel HORIZON FARM(4).xlsx`

Objectif : lister toutes les données importantes du fichier avant intégration ERP, pour éviter les oublis, doublons et mauvaises interprétations.

---

## 1. Onglets du fichier

Le fichier contient 4 onglets :

| Onglet | Rôle | Intégration ERP |
|---|---|---|
| `Hypothèses` | Données métier brutes : coûts, prix, quantités, salaires, loyers, matériel | Source principale des hypothèses opérationnelles et charges |
| `Périodicité des sources de reve` | Calendrier mensuel du chiffre d'affaires par activité | Source des objectifs mensuels, mais certaines lignes doivent être alignées avec la stratégie validée |
| `Données à saisir` | Synthèse structurée du BP : besoins, financement, charges, CA, BFR, salaires, seuil | Source principale du module Investissements / BP |
| `Plan financier à imprimer` | États financiers générés : résultat, trésorerie, plan de financement, seuil, BFR | Source pour Finances, prévisionnel 5 ans, trésorerie, seuil |

---

## 2. Identité projet

Onglet : `Données à saisir`

| Donnée | Valeur fichier | ERP cible | Statut |
|---|---:|---|---|
| Porteuse | PENDA THIAW DIAGNE | BP / Profil projet | À intégrer |
| Projet | HORIZON FARM | BP / tableaux objectifs | À intégrer |
| Statut juridique | Entreprise individuelle au réel IR | BP / fiscalité | À intégrer |
| ACRE | Non | BP / charges sociales | À intégrer |
| Activité | Marchandises | BP / fiscalité | À intégrer |
| Fiscalité | Impôt sur le revenu | BP / fiscalité | À intégrer |

---

## 3. Besoins de démarrage

Onglets : `Hypothèses`, `Données à saisir`, `Plan financier à imprimer`

Total officiel : **26 064 000 FCFA**

| Ligne | Quantité | Prix unitaire | Total | ERP cible | Statut |
|---|---:|---:|---:|---|---|
| Abreuvoir 5L | 100 | 2 500 | 250 000 | Investissements / Stock équipement | OK |
| Abreuvoir 10L | 100 | 5 000 | 500 000 | Investissements / Stock équipement | OK |
| Plateaux démarrage | 100 | 2 500 | 250 000 | Investissements / Stock équipement | OK |
| Mangeoires trémie | 100 | 3 000 | 300 000 | Investissements / Stock équipement | OK |
| Radiants | 4 | 60 000 | 240 000 | Investissements / Stock équipement | OK |
| Bâches | 120 | 400 | 48 000 | Investissements / Stock équipement | OK |
| Bottes | 5 | 10 000 | 50 000 | Investissements / EPI | OK |
| Combinaisons | 5 | 10 000 | 50 000 | Investissements / EPI | OK |
| Lassos | 2 | 8 000 | 16 000 | Investissements / Bovins | OK |
| Mangeoires petits | 100 | 800 | 80 000 | Investissements / Stock équipement | OK |
| Papier | 50 | 700 | 35 000 | Investissements / Administratif | OK |
| Abreuvoir bovins | 5 | 5 000 | 25 000 | Investissements / Bovins | OK |
| Lampe | 4 | 35 000 | 140 000 | Investissements / Chair | À clarifier : présent dans Hypothèses, absent du total officiel Données à saisir |
| 3 000 poussins pondeuses | 3 000 | 900 | 2 700 000 | Investissements + Avicole | OK, doit être séparé du forfait global |
| Stock de matières et produits de départ | forfait | - | 17 260 000 | Investissements + Stock | À détailler si possible |
| Trésorerie de départ | forfait | - | 4 260 000 | Finances / Trésorerie | OK |

Point important : la ligne fichier `Effectif poules pondeuses & Stock de matières et produits = 19 960 000` doit être ventilée dans l'ERP en au moins :

- 3 000 poussins pondeuses = 2 700 000
- stock de matières / produits de départ = 17 260 000

---

## 4. Financement

Onglet : `Données à saisir`

| Source | Montant | ERP cible | Statut |
|---|---:|---|---|
| Apport personnel ou familial | 26 064 000 | Investissements / Financement BP | OK |
| Apports en nature | 0 | Investissements / Financement BP | OK |
| Prêt n°1 BNDE | 0 | Investissements / Emprunts | OK |
| Prêt n°2 | 0 | Investissements / Emprunts | OK |
| Prêt n°3 | 0 | Investissements / Emprunts | OK |
| Subvention PNUD / UGB | 0 | Investissements / Subventions | OK |
| Autre financement | 0 | Investissements / Financement BP | OK |
| Total ressources | 26 064 000 | Investissements | OK |
| Écart besoins/ressources | 0 | Contrôle qualité investissement | À afficher |

---

## 5. Amortissements

Onglet : `Données à saisir`

| Donnée | Valeur | ERP cible | Statut |
|---|---:|---|---|
| Durée amortissement | 2 ans | Investissements / Amortissements | À intégrer |
| Montant amortissable | 2 700 000 | Investissements / Amortissements | À intégrer |
| Dotation année 1 | 1 350 000 | Finances / Compte de résultat | À intégrer |
| Dotation année 2 | 1 350 000 | Finances / Compte de résultat | À intégrer |
| Dotation années 3-5 | 0 | Finances | À intégrer |

---

## 6. Charges variables

Onglet : `Hypothèses`

### 6.1 Valeur fichier actuelle

Total fichier actuel : **80 512 000 FCFA / an**

| Charge | Quantité | Prix unitaire | Mensuel fichier | Annuel fichier | ERP cible | Statut |
|---|---:|---:|---:|---:|---|---|
| Vaccins / prophylaxie | 1 | 40 000 | 40 000 | 480 000 | Santé + Finances | OK |
| Aliments pondeuses | 180 | 18 000 | 3 240 000 | 38 880 000 | Stock + Avicole + Finances | OK |
| Aliments chair | 90 | 18 000 | 1 620 000 | 19 440 000 | Stock + Avicole + Finances | OK |
| Aliments bœufs | 8 | 25 000 | 200 000 | 2 400 000 | Stock + Animaux + Finances | OK |
| Emballages œufs 30 | 14 | 4 000 | 56 000 | 672 000 | Stock + Ventes + Finances | OK |
| Bœufs achat | 50 | 300 000 | 1 250 000 | 15 000 000 | Animaux + Finances | OK |
| Cartons poussins chair | 32 | 32 000 | 85 333 | 1 024 000 | Avicole + Finances | À corriger selon stratégie validée |
| Gaz | 2 | 9 000 | 18 000 | 216 000 | Stock + Finances | OK |
| Litière | 100 | 2 000 | 200 000 | 2 400 000 | Stock + Avicole + Finances | OK |

### 6.2 Correction validée pour poussins chair

La stratégie validée dit :

- 32 cartons par mois
- 1 carton = 50 poussins
- 32 × 50 = 1 600 poussins/mois
- prix carton = 32 000 FCFA

Donc :

| Ligne | Valeur fichier | Valeur métier validée | Impact |
|---|---:|---:|---:|
| Coût poussins chair mensuel | 85 333 | 1 024 000 | +938 667 / mois |
| Coût poussins chair annuel | 1 024 000 | 12 288 000 | +11 264 000 / an |
| Charges variables annuelles | 80 512 000 | 91 776 000 | À revoir dans le BP |

Statut : **à corriger dans l'ERP**.

---

## 7. Charges fixes

Onglets : `Hypothèses`, `Données à saisir`

Total année 1 : **6 000 000 FCFA**

| Charge | Mensuel | Année 1 | Année 2 | Année 3 | Année 4 | Année 5 | ERP cible | Statut |
|---|---:|---:|---:|---:|---:|---:|---|---|
| Loyer pondeuses | 150 000 | 1 800 000 | - | - | - | - | Finances | À détailler |
| Loyer chair | 150 000 | 1 800 000 | - | - | - | - | Finances | À détailler |
| Loyer bœufs | 150 000 | 1 800 000 | - | - | - | - | Finances | À détailler |
| Loyer total | 450 000 | 5 400 000 | 5 940 000 | 6 534 000 | 7 187 400 | 7 906 140 | Finances | OK |
| Provisions besoins divers | 40 000 | 480 000 | 528 000 | 580 800 | 638 880 | 702 768 | Finances | OK |
| Nettoyage locaux | 10 000 | 120 000 | 132 000 | 145 200 | 159 720 | 175 692 | Finances | OK |
| Total charges fixes | 500 000 | 6 000 000 | 6 600 000 | 7 260 000 | 7 986 000 | 8 784 600 | Finances | OK |

---

## 8. Chiffre d'affaires annuel par activité

Onglet : `Hypothèses`

Total CA année 1 : **121 820 000 FCFA**

| Activité | Quantité | Prix unitaire | CA annuel | ERP cible | Statut |
|---|---:|---:|---:|---|---|
| Tablettes de 30 œufs | 16 650/an | 2 200 | 36 630 000 | Objectifs + Avicole + Ventes | OK |
| Poulets de chair | 19 008/an | 2 500 | 47 520 000 | Objectifs + Avicole + Ventes | OK si 1 584 vendus/mois en moyenne |
| Bœufs | 50/an | 700 000 | 35 000 000 | Objectifs + Animaux + Ventes | OK |
| Fumier pondeuses | 100/mois | 1 500 | 1 800 000 | Objectifs + Stock + Ventes | OK |
| Fumier chair | 50/mois | 1 000 | 600 000 | Objectifs + Stock + Ventes | OK |
| Fumier bœufs | 540/an | 500 | 270 000 | Objectifs + Stock + Ventes | OK |

---

## 9. Périodicité mensuelle des revenus

Onglet : `Périodicité des sources de reve`

| Mois | Œufs | Chair | Bœufs | Fumier pondeuses | Fumier chair | Fumier bœufs | Total CA |
|---|---:|---:|---:|---:|---:|---:|---:|
| M1 | 0 | 0 | 0 | 150 000 | 50 000 | 15 000 | 215 000 |
| M2 | 0 | 2 500 000 | 0 | 150 000 | 50 000 | 30 000 | 2 730 000 |
| M3 | 0 | 2 500 000 | 3 500 000 | 150 000 | 50 000 | 15 000 | 6 215 000 |
| M4 | 0 | 2 500 000 | 3 500 000 | 150 000 | 50 000 | 30 000 | 6 230 000 |
| M5 | 990 000 | 5 000 000 | 3 500 000 | 150 000 | 50 000 | 15 000 | 9 705 000 |
| M6 | 3 960 000 | 5 000 000 | 3 500 000 | 150 000 | 50 000 | 30 000 | 12 690 000 |
| M7 | 5 280 000 | 5 000 000 | 3 500 000 | 150 000 | 50 000 | 15 000 | 13 995 000 |
| M8 | 5 280 000 | 5 000 000 | 3 500 000 | 150 000 | 50 000 | 30 000 | 14 010 000 |
| M9 | 5 280 000 | 5 000 000 | 3 500 000 | 150 000 | 50 000 | 15 000 | 13 995 000 |
| M10 | 5 280 000 | 5 000 000 | 3 500 000 | 150 000 | 50 000 | 30 000 | 14 010 000 |
| M11 | 5 280 000 | 5 000 000 | 3 500 000 | 150 000 | 50 000 | 15 000 | 13 995 000 |
| M12 | 5 280 000 | 5 020 000 | 3 500 000 | 150 000 | 50 000 | 30 000 | 14 030 000 |
| Total | 36 630 000 | 47 520 000 | 35 000 000 | 1 800 000 | 600 000 | 270 000 | 121 820 000 |

### Points à corriger / aligner

| Point | Dans le fichier | Stratégie validée | Statut |
|---|---|---|---|
| Chair | 1 000/mois puis 2 000/mois dans l'onglet périodicité | bandes de 500, cycle 40 jours, puis roulement 15 jours | À recalculer si on veut une périodicité totalement cohérente |
| Bovins | premières ventes dès M3 | M1 vendu en M4, M2 vendu en M5, M3 vendu en M6 | À corriger dans les projections du Centre décisionnel et potentiellement dans objectifs mensuels |
| Œufs | démarrage CA œufs à M5 | 3 000 pondeuses au départ, production selon entrée en ponte réelle | À confirmer selon âge des pondeuses achetées |

---

## 10. Stratégie opérationnelle validée par la porteuse

Cette stratégie doit piloter le Centre décisionnel, Avicole et Animaux.

### 10.1 Poulets de chair

- Acheter 500 poussins.
- Attendre environ 40 jours.
- Écouler / vendre le lot.
- Après vente, racheter 500 poussins.
- 15 jours après, ajouter 500 autres poussins.
- Maintenir ce dispositif avec des bandes de 500.

Données de référence :

| Donnée | Valeur |
|---|---:|
| Taille bande | 500 poussins |
| Cycle | 40 jours |
| Cadence après démarrage | 15 jours |
| Cartons/mois | 32 |
| Poussins/carton | 50 |
| Poussins/mois | 1 600 |
| Prix carton | 32 000 |
| Coût poussins/mois | 1 024 000 |
| Coût poussins/an | 12 288 000 |

### 10.2 Bovins

- M1 : acheter 5 bovins.
- M2 : acheter 5 bovins.
- M3 : acheter 5 bovins.
- M4 : vendre les bovins achetés en M1 et racheter 5.
- M5 : vendre les bovins achetés en M2 et racheter 5.
- M6 : vendre les bovins achetés en M3 et racheter 5.
- Ensuite : vendre 5 et racheter 5 chaque mois.

Données de référence :

| Donnée | Valeur |
|---|---:|
| Taille lot mensuel | 5 bovins |
| Cycle embouche | 90 jours |
| Prix achat unitaire | 300 000 |
| Prix vente unitaire | 700 000 |
| Achat annuel fichier | 15 000 000 |
| CA annuel fichier | 35 000 000 |

### 10.3 Pondeuses

- Démarrer avec 3 000 pondeuses.
- Objectif : œufs toute l'année.
- Ne pas fixer maintenant la deuxième bande.
- Décider plus tard selon : taux de ponte réel, demande client, baisse de ponte, risque de rupture.

Données de référence :

| Donnée | Valeur |
|---|---:|
| Poussins pondeuses | 3 000 |
| Prix unitaire | 900 |
| Investissement | 2 700 000 |
| Objectif tablettes | 16 650/an |
| Prix tablette | 2 200 |
| CA œufs | 36 630 000 |

---

## 11. CA sur 5 ans

Onglet : `Données à saisir`

| Année | CA prévisionnel | Croissance |
|---|---:|---:|
| Année 1 | 121 820 000 | - |
| Année 2 | 158 366 000 | +30% |
| Année 3 | 190 039 200 | +20% |
| Année 4 | 218 545 080 | +15% |
| Année 5 | 240 399 588 | +10% |

ERP cible : Objectifs & Croissance, Centre décisionnel, Finances prévisionnelles.

---

## 12. Salaires et rémunération

Onglet : `Hypothèses`, `Données à saisir`

| Poste | Durée | Nombre | Salaire/mois | Annuel | ERP cible | Statut |
|---|---:|---:|---:|---:|---|---|
| Gardien | 12 | 1 | 110 000 | 1 320 000 | RH / Finances | OK |
| Aviculture & conditionnement œufs | 12 | 2 | 70 000 | 1 680 000 | RH / Avicole / Finances | OK |
| Agent élevage bovins | 12 | 1 | 70 000 | 840 000 | RH / Animaux / Finances | OK |
| Coordonnatrice projet | 12 | 1 | 600 000 | 7 200 000 | Finances | OK |
| Total salaires + rémunération | - | - | - | 11 040 000 | Finances | OK |

Progression annuelle : +10%.

| Année | Salaires employés | Rémunération dirigeante |
|---|---:|---:|
| A1 | 3 840 000 | 7 200 000 |
| A2 | 4 224 000 | 7 920 000 |
| A3 | 4 646 400 | 8 712 000 |
| A4 | 5 111 040 | 9 583 200 |
| A5 | 5 622 144 | 10 541 520 |

---

## 13. Charges sociales

Onglet : `Données à saisir`

| Ligne | Année 1 | Année 2 | Année 3 | ERP cible | Statut |
|---|---:|---:|---:|---|---|
| Charges sociales employés | 2 764 800 | 3 041 280 | 3 345 408 | Finances / RH | À intégrer |
| Charges dirigeant EI réel IR sans ACRE | 2 160 000 | 2 376 000 | 2 613 600 | Finances | À intégrer |
| ACRE | Non | - | - | Finances | OK |

---

## 14. Besoin en fonds de roulement

Onglet : `Données à saisir`, `Plan financier à imprimer`

| Donnée | Valeur | ERP cible | Statut |
|---|---:|---|---|
| Crédit client moyen | 30 jours | Finances / Ventes | À intégrer |
| Dette fournisseur moyenne | 30 jours | Finances / Fournisseurs | À intégrer |
| BFR année 1 | 3 395 178 | Finances prévisionnelles | À intégrer |
| BFR année 2 | 4 413 732 | Finances prévisionnelles | À intégrer |
| BFR année 3 | 5 296 478 | Finances prévisionnelles | À intégrer |
| BFR année 4 | 6 090 949 | Finances prévisionnelles | À intégrer |
| BFR année 5 | 6 700 044 | Finances prévisionnelles | À intégrer |

---

## 15. États financiers prévisionnels principaux

Onglet : `Plan financier à imprimer`

### 15.1 Résultat et CAF

| Ligne | A1 | A2 | A3 | A4 | A5 | ERP cible | Statut |
|---|---:|---:|---:|---:|---:|---|---|
| Résultat de l'exercice | 22 918 000 | 33 606 400 | 43 822 080 | 51 426 312 | 56 568 943 | Finances / Prévisionnel | À intégrer |
| Capacité d'autofinancement | 24 268 000 | 34 956 400 | 43 822 080 | 51 426 312 | 56 568 943 | Finances / Prévisionnel | À intégrer |

### 15.2 Trésorerie mensuelle année 1

| Mois | Encaissements | Décaissements | Solde du mois | Cumul trésorerie |
|---|---:|---:|---:|---:|
| M1 | 26 279 000 | 23 366 096 | 2 912 904 | 2 912 904 |
| M2 | 2 730 000 | 3 224 283 | -494 283 | 2 418 621 |
| M3 | 6 215 000 | 5 527 553 | 687 447 | 3 106 069 |
| M4 | 6 230 000 | 5 537 466 | 692 534 | 3 798 602 |
| M5 | 9 705 000 | 7 834 127 | 1 870 873 | 5 669 475 |
| M6 | 12 690 000 | 9 806 942 | 2 883 058 | 8 552 533 |
| M7 | 13 995 000 | 10 669 429 | 3 325 571 | 11 878 104 |
| M8 | 14 010 000 | 10 679 343 | 3 330 657 | 15 208 761 |
| M9 | 13 995 000 | 10 669 429 | 3 325 571 | 18 534 332 |
| M10 | 14 010 000 | 10 679 343 | 3 330 657 | 21 864 990 |
| M11 | 13 995 000 | 10 669 429 | 3 325 571 | 25 190 561 |
| M12 | 14 030 000 | 10 692 561 | 3 337 439 | 28 528 000 |

Statut : à intégrer dans Finances prévisionnelles et Centre décisionnel.

---

## 16. Priorités d'intégration ERP

### Phase 1 — verrouiller le BP officiel

1. Créer une source unique `horizonFarmOfficialBusinessPlan`.
2. Ne plus dupliquer les objectifs dans plusieurs services.
3. Stocker toutes les lignes : besoins, financement, amortissements, charges, CA, salaires, BFR, trésorerie.
4. Ajouter un mécanisme de remplacement des anciennes lignes BP Horizon Farm obsolètes.

### Phase 2 — corriger les incohérences métier

| Sujet | Correction |
|---|---|
| Cartons poussins chair | passer de 85 333/mois à 1 024 000/mois |
| Périodicité chair | recalculer selon bandes de 500 / J+40 / roulement 15 jours |
| Périodicité bovins | M4 vend M1, M5 vend M2, M6 vend M3 |
| Lampe | décider si elle entre dans le total des besoins de démarrage |
| Stock de départ | ventiler le forfait 17 260 000 si possible |

### Phase 3 — affichage ERP

| Module | À afficher |
|---|---|
| Investissements | BP officiel complet, besoins, financement, amortissement, hypothèses validées |
| Centre décisionnel | cycles chair, bovins, pondeuses + prochaines actions |
| Objectifs & Croissance | objectifs mensuels, CA par activité, écarts prévisionnel/réel |
| Finances | charges variables/fixes, salaires, BFR, trésorerie, résultat prévisionnel |
| Avicole | exécution pondeuses + chair, ponte réelle, bandes, coûts alimentation |
| Animaux | pipeline bovins 90 jours, coût par lot, marge à la vente |
| Ventes | ventes réelles vs objectifs, encaissements, marge fiable |

---

## 18. Répartition ERP (import multi-onglets)

Règle centrale : **Finance > Investissements = lignes actionnables uniquement**.

| Onglet xlsx | Module(s) ERP | Visible Investissements |
|---|---|---|
| Hypothèses | Objectifs, Commercial, Finance charges, RH, Achats | Non |
| Périodicité revenus | Objectifs, Commercial, Élevage, Trésorerie | Non |
| Données à saisir | Investissements (démarrage), Financeurs, Finance, RH… | Partiel (besoins, stock, trésorerie, amort.) |
| Plan à imprimer | Documents, Objectifs financeurs, Synthèse Finance | Non (lecture seule) |

Implémentation : `src/services/bpImport/` (`bpSheetMapping.js`, `bpImportDispatcher.js`).


Le BP intégré actuellement est partiel. La présente cartographie confirme que les éléments suivants doivent encore être intégrés ou corrigés :

- financement détaillé ;
- amortissements ;
- charges sociales ;
- BFR ;
- trésorerie mensuelle ;
- résultat prévisionnel 5 ans ;
- périodicité mensuelle corrigée selon la stratégie métier ;
- remplacement propre des anciennes lignes BP déjà créées en base ;
- affichage clair des écarts entre fichier, stratégie validée et réel ERP.
