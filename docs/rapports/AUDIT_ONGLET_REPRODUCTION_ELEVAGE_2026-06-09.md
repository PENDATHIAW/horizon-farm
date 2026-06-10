# Audit complet — Onglet Reproduction (Module Élevage)

**Date :** 9 juin 2026  
**Périmètre :** Onglet `Reproduction` du module Élevage (`ElevageRecoveredModule`)  
**Méthode :** Revue statique du code, schéma ERP, workflows, tests unitaires mode simulé  
**Contrainte :** Aucune implémentation dans ce livrable — audit et plans V1/V2/V3 uniquement  

---

## 1. Synthèse exécutive

| Indicateur | Valeur |
|------------|--------|
| **Score actuel (fonction métier reproduction)** | **22 / 100** |
| **Score cible après V1** | ~48 / 100 |
| **Score cible après V2** | ~72 / 100 |
| **Score cible après V3** | ~88 / 100 |
| **Objectif métier « centre unique reproduction »** | **Non atteint** |

L’onglet Reproduction est aujourd’hui un **hub de redirection** vers l’onglet Animaux et le formulaire Hey Horizon « création animal ». Il ne gère pas en propre : saillies, inséminations, diagnostics de gestation, mises bas structurées, sevrages, généalogie ni performances reproductives.

La logique reproduction est **éclatée** entre :
- `ReproductionHub` (UI minimale, montée),
- champs `animaux` dans le schéma et `MODULE_FORM_FIELDS` (référence non branchée sur l’UI Animaux actuelle),
- `animalLifecycle.js` (alertes non utilisées),
- table `reproduction_events` (schéma sans CRUD/UI),
- composant orphelin `ElevageReproductionPanel.jsx`.

---

## 2. Point d’entrée et architecture

| Élément | Fichier | Statut |
|---------|---------|--------|
| Tab navigation | `src/utils/commercialNavigation.js` → `ELEVAGE_TABS` inclut `Reproduction` | OK |
| Montage UI | `ElevageRecoveredModule.jsx` ligne ~601 : `tab === 'Reproduction' ? <ReproductionHub …>` | OK |
| Hub inline | `ReproductionHub` (lignes 201–218) | Actif |
| Panel alternatif | `src/modules/elevage/ElevageReproductionPanel.jsx` | **Orphelin — non monté** |
| Fiche animal legacy | `src/components/AnimalDetailsModal.jsx` (onglet Reproduction) | **Orphelin — jamais importé** |
| Fiche animal active | `AnimauxSpeciesFocused.jsx` → `AnimalDetailModal` | **Pas d’onglet Reproduction** |
| Schéma données events | `erpRealSchema.js` → `reproduction_events` | **Aucune UI/service** |
| Champs animal | `animaux` + `normalize.js` + `constants.js` MODULE_FORM_FIELDS | Partiel / non UI |

---

## 3. Audit des boutons (obligatoire)

### 3.1 Onglet Reproduction — `ReproductionHub`

| Bouton | Action code | Résultat attendu métier | Résultat réel | Verdict |
|--------|-------------|-------------------------|---------------|---------|
| **+ Naissance / mise bas** | `emitHorizonForm('animaux','animal_create',…,{ mode_acquisition:'naissance_ferme' })` | Formulaire naissance avec mère, portée, lien mise bas | Événement `horizon-open-form` ; listener dans **AnimauxV2 uniquement** | **Défaillant** si onglet Animaux non monté |
| **+ Reproduction interne** | Idem `mode_acquisition:'reproduction_interne'` | Création avec mère + père | Même rupture + `HeyHorizonAnimalCard` ignore `mode_acquisition` | **Défaillant** |
| **Voir femelles reproductrices** | `setTab('Animaux')` | Liste filtrée femelles / statut repro | Onglet Animaux générique, pas filtre repro | **Partiel** |
| **Historique naissances** | `setTab('Animaux')` | Journal naissances / mises bas | **Identique** au bouton précédent | **Doublon UI** |

### 3.2 Tableau de bord Élevage (parcours métier)

| Bouton | Cible | Verdict |
|--------|-------|---------|
| Reproduction — « Naissances et gestations » | `setTab('Reproduction')` | OK navigation |

### 3.3 `ElevageReproductionPanel` (orphelin — à réintégrer sans supprimer)

| Bouton | Différence vs Hub |
|--------|-------------------|
| + Naissance / mise bas | Identique |
| + Reproduction interne | Identique |
| Voir femelles | Identique (`setTab('Animaux')`) |
| — | **Pas** de bouton « Historique naissances » |
| — | Intègre `HeyHorizonAnimalCard` si draft `animal_creation` | **Meilleur** que Hub actuel (mais panel non monté) |

### 3.4 Boutons absents (objectif métier)

Saillie, insémination, diagnostic gestation, déclaration gestation, mise bas (workflow portée), sevrage, généalogie, performances (IVV, intervalle, taux naissance), scan boucle, actions voix dédiées.

---

## 4. Audit des formulaires (obligatoire)

| Formulaire | Où | Champs reproduction | Branché depuis Reproduction ? |
|------------|-----|---------------------|-------------------------------|
| Hey Horizon création | `HeyHorizonAnimalCard.jsx` | Espèce, nom, poids, date, note | Oui (si listener actif) |
| Création Animaux | `AnimauxSpeciesFocused` `buildCreateFields()` | `mode_acquisition` (3 opts, **sans** `reproduction_interne`), pas mère/père | Non (autre onglet) |
| Édition Animaux | `editFields` | Aucun champ reproduction | Non |
| Référence canonique | `constants.js` MODULE_FORM_FIELDS.animaux | Section reproduction complète | **Non utilisé** par UI actuelle |
| Mise bas portée | — | — | **Absent** |
| Saillie / IA | — | — | **Absent** |
| Sevrage | — | — | **Absent** |

### Rupture critique — `HeyHorizonAnimalCard` (naissance depuis Reproduction)

Le payload `onCreate` ne transmet pas :
- `mode_acquisition` (draft ignoré),
- `mere_id`, `pere_id`, `portee_id`,
- `date_naissance` vs `date_entree_ferme`,
- `sexe` du jeune.

Événement métier créé : `creation_animal` générique, pas `naissance` / `reproduction` du pipeline `AppContext.buildCreateEvents`.

### Rupture — listener `horizon-open-form`

Monté dans `AnimauxV2.jsx` seulement. Quand `tab === 'Reproduction'`, `AnimauxV2` n’est pas dans le DOM → **clic sur + Naissance sans effet visible**.

---

## 5. Audit des champs (obligatoire)

### 5.1 Schéma `animals` (reproduction)

| Champ | normalize | MODULE_FORM_FIELDS | UI Animaux | UI Reproduction | Verdict |
|-------|-----------|-------------------|------------|-----------------|---------|
| `mere_id` | ✓ | ✓ (select) | ✗ | ✗ | Manquant UI |
| `pere_id` | ✓ | ✓ | ✗ | ✗ | Manquant UI |
| `portee_id` | ✓ | ✓ | ✗ | ✗ | Manquant UI |
| `mode_acquisition` | ✓ | ✓ (5 opts) | ✓ partiel (3 opts) | draft seulement | Incohérent |
| `en_gestation` | ✓ | ✓ | ✗ | ✗ | Manquant UI |
| `date_debut_gestation` | ✓ | ✓ | ✗ | ✗ | Manquant UI |
| `date_prevue_mise_bas` | ✓ | ✓ | ✗ | ✗ | Manquant UI |
| `male_reproducteur_id` | ✓ | ✓ | ✗ | ✗ | Manquant UI |
| `statut_reproduction` | ✓ | ✓ | ✗ | ✗ | Manquant UI |
| `notes_reproduction` | — | ✓ | ✗ | ✗ | Manquant UI |

### 5.2 Table `reproduction_events` (non exploitée)

Champs définis : `femelle_id`, `male_id`, `date_saillie`, `date_debut_gestation`, `date_prevue_mise_bas`, `date_mise_bas_reelle`, `resultat`, `nombre_petits`, `notes`.

**Aucun** service CRUD, formulaire ou liste dans l’application.

### 5.3 Champs métier manquants (objectif centre unique)

| Domaine | Exemples manquants |
|---------|-------------------|
| Saillie / IA | Type (naturelle / IA), dose, technicien, numéro paillette |
| Diagnostic | Date echo, résultat (+ / −), stade |
| Mise bas | Difficulté, mortalité néonatale, sexe par petit |
| Sevrage | Date sevrage, poids sevrage, lot post-sevrage |
| Performances | IVV, intervalle entre mises bas, taux survie, taux gestation |
| Généalogie | Liens enfants, arbre, coefficient parenté (V3) |

### 5.4 Données inutiles / KPI trompeurs

| Élément | Problème |
|---------|----------|
| KPI « À suivre » | `femelles - naissances` — **sans sens métier** (compare stocks et événements) |
| KPI « Femelles » | Filtre texte sur `sexe/type/espece` incluant « vache », « brebis » — peut compter des mâles si libellés ambigus |
| KPI « Événements » | Tous `livestockEvents`, pas filtrés reproduction |
| Intro hub | Promet saillies/gestations — **non implémentées** |

---

## 6. Audit des workflows (obligatoire)

| Workflow métier | Implémenté | Chemin actuel | Écart |
|-----------------|------------|---------------|-------|
| Saillie | Non | — | — |
| Insémination | Non | — | — |
| Déclaration gestation | Partiel | Update animal `en_gestation` via AppContext (si champ modifié) | Pas d’UI |
| Diagnostic gestation | Non | — | — |
| Mise bas | Partiel | Création animal « naissance » | Pas portée multi-jeunes, pas MAJ mère |
| Naissance | Partiel | Idem + event `naissance` si `buildCreateEvents` | Hey Horizon bypass |
| Sevrage | Non | — | — |
| Généalogie | Partiel | Champs mère/père en données | Pas de vue |
| Performances repro | Non | — | — |
| Alertes gestation | Code seul | `getReproductionAlerts` | **Jamais appelé** |

### Cycle cible (non implémenté)

```
Saillie/IA → Gestation → Diagnostic → Mise bas → Création jeunes → Sevrage → Historique / KPI
```

### Cycle actuel

```
Reproduction hub → (optionnel) emitHorizonForm → [échec si pas Animaux] → création animal simplifiée
OU
Animaux → création/édition sans champs repro → business_events génériques
```

---

## 7. Interconnexions (obligatoire)

| Module | Lien reproduction actuel | Doublon ? | Cible métier |
|--------|--------------------------|-----------|--------------|
| **Animaux** | Hub = redirect ; champs repro sur fiche absents UI active | **Oui** — même naissance saisie 2 endroits conceptuels | Reproduction = workflows ; Animaux = identité/croissance/vente |
| **Santé** | Pas de lien gestation / mise bas | Non doublon | Veto repro, vaccination pré-mise bas (V2) |
| **Cycles** | Bandes avicoles / embouche bovine | Faible | Cycles = temporalité vente, pas gestation |
| **Production** | Œufs / ponte | Non doublon | Production avicole séparée |
| **Transformation** | — | Non | — |
| **Commercial** | `wrapCreate` peut créer opportunité vente sur **tout** nouvel animal | **Risque** — naissance crée opportunité « prêt à vendre » | Naissance ≠ vente |
| **Finance** | `purchase_cost` sur jeune ; pas valorisation cheptel auto | Partiel | Valorisation cheptel à la mise bas (V2) |
| **Documents** | `documents_text` sur animal | Partiel | Certificat naissance, photo portée (V2) |

### Mise bas validée — cible demandée

| Effet | Statut |
|-------|--------|
| Création automatique nouvel(x) animal(aux) | Non (1 seul via Hey Horizon) |
| Documents | Manuel `documents_text` |
| Finance valorisation cheptel | Non automatique |
| Historique généalogique | Champs seulement si saisis |

---

## 8. Mode simulé (obligatoire)

| Test | Résultat |
|------|----------|
| `elevageV3.test.js` — montage tabs incl. Reproduction | **OK** (stabilité UI) |
| Données simulées gestation | `horizonFarmSimulationSeed` — animaux achat, peu de repro |
| Workflow naissance simulé | Non couvert par test dédié |
| `reproduction_events` seed | Absent |

**Verdict :** montage stable, **aucune** validation métier reproduction.

---

## 9. Accès mobile (obligatoire)

| Critère | Évaluation |
|---------|------------|
| Grille stats | `grid-cols-2` — lisible |
| Cartes action | `grid-cols-1 md:grid-cols-2` — OK tactile |
| Touch targets | `BusinessHub` / `ActionCard` — pas `min-h-[44px]` explicite sur cartes |
| Formulaire depuis Reproduction | Hey Horizon — champs `min-h-[44px]` OK **si** formulaire s’ouvre |
| Scan caméra | Non branché sur Reproduction |
| Voix | Pas d’intents reproduction dans `heyHorizonAssistantService` |

---

## 10. Doublons identifiés (obligatoire)

| # | Doublon | Localisation | Gravité |
|---|---------|--------------|---------|
| D1 | Deux hubs reproduction (`ReproductionHub` vs `ElevageReproductionPanel`) | ElevageRecoveredModule vs elevage/ | Moyenne — dette |
| D2 | Deux modales animal (`AnimalDetailsModal` vs `AnimalDetailModal`) | components vs AnimauxSpeciesFocused | Moyenne |
| D3 | Deux définitions champs animaux (`MODULE_FORM_FIELDS` vs `buildCreateFields`) | constants vs AnimauxSpeciesFocused | Haute |
| D4 | Boutons « Voir femelles » et « Historique naissances » | ReproductionHub | Faible — même action |
| D5 | Naissance saisissable via Reproduction ET Animaux (+ Cycles bovin) | Multi-onglets | Haute — pas centre unique |
| D6 | Événements `naissance` AppContext vs `creation_animal` Hey Horizon | AppContext vs HeyHorizonAnimalCard | Haute — traçabilité |

---

## 11. Problèmes trouvés (priorisés)

### P0 — Bloquants terrain

1. **Listener formulaire absent** quand onglet Reproduction actif.  
2. **Hey Horizon ignore** `mode_acquisition` et liens parentaux.  
3. **Aucun workflow** saillie → gestation → mise bas.  
4. **`getReproductionAlerts` non branché** — alertes gestation invisible.

### P1 — Métier / doublons

5. Champs reproduction **absents** UI Animaux active.  
6. Table `reproduction_events` **vide côté app**.  
7. KPI « À suivre » **erroné**.  
8. `wrapCreate` **opportunité vente** sur naissance.  
9. `ElevageReproductionPanel` **orphelin** (régression potentielle si on supprime).

### P2 — Qualité / digestibilité

10. Intro hub **sur-promet** fonctionnalités.  
11. Pas de liste femelles gestantes / mises bas proches.  
12. Pas de filtre espèce sur hub Reproduction (Bovin/Ovin/Caprin).  
13. `AnimalDetailsModal` mort — confusion maintenance.

---

## 12. Corrections proposées (sans suppression de l’existant)

### 12.1 Automatisation IA

| Fonction | V1 | V2 | V3 |
|----------|----|----|-----|
| Prédiction mise bas | Calcul date depuis espèce + date gestation (règles métier) | + historique femelle | ML / IA Gateway |
| Alertes reproduction | Brancher `getReproductionAlerts` + liste hub | Centre alertes Élevage | Push / SMS |
| Recommandations IA | — | Femelles « disponible » + calendrier saillie | Scoring fertilité |
| Analyse fertilité | — | KPI taux gestation / IVV | Tableaux comparatifs |

### 12.2 Caméra

| V1 | V2 |
|----|-----|
| Bouton scan sur workflow mise bas (réutiliser `resolveAnimalScan` si existant) | Scan → ouverture fiche mère + pré-remplissage portée |

### 12.3 Voix

Exemples cibles — intents à ajouter dans assistant :

- « Hey Horizon, la vache 102 est gestante. » → patch femelle + dates + event `gestation`.  
- « Hey Horizon, la brebis 15 a mis bas deux agneaux. » → workflow mise bas portée (2 jeunes + MAJ mère).

V1 : routing vers formulaire Reproduction pré-rempli.  
V2 : exécution directe avec confirmation.

### 12.4 Interconnexions — mise bas validée

Pipeline cible (V2) :

1. `reproduction_events` ou event `mise_bas`  
2. Création N animaux (loop `nombre_petits`)  
3. MAJ mère : `en_gestation=false`, `statut_reproduction=a_reposer`, dates  
4. Document optionnel (photo portée)  
5. Finance : entrée valorisation cheptel (actif biologique) — **sans** doublon achat  
6. Trace `business_events` + généalogie (`mere_id` / `portee_id`)

### 12.5 Digestibilité

Règle : **≤ 6 KPI visibles** ; sections avancées repliables.

**KPI proposés (6 max) :**

1. Femelles reproductrices (filtre `sexe=F` + statut)  
2. Gestantes  
3. Mises bas prévues (30 j)  
4. Naissances période  
5. Taux gestation (V2)  
6. Alertes actives  

Repliables : performances IVV, généalogie, journal saillies, exports.

---

## 13. Plans de mise en œuvre

### Plan V1 — Corrections sans régression (fondation)

**Objectif :** rendre l’onglet utilisable et stopper les ruptures.

| # | Action | Fichiers touchés (indicatif) |
|---|--------|------------------------------|
| V1-1 | Monter `ElevageReproductionPanel` **ou** listener `horizon-open-form` au niveau `ElevageRecoveredModule` | ElevageRecoveredModule |
| V1-2 | Conserver les 4 `ActionCard` existants ; ajouter scroll vers Hey Horizon | idem |
| V1-3 | `HeyHorizonAnimalCard` : honorer `draft_fields.mode_acquisition`, mère/père, date naissance | HeyHorizonAnimalCard |
| V1-4 | Événements métier alignés `AppContext` (`naissance` / `reproduction`) | HeyHorizonAnimalCard, AppContext |
| V1-5 | Brancher `getReproductionAlerts` → bandeau alertes hub | Reproduction panel + animalLifecycle |
| V1-6 | Corriger KPI femelles (`sexe === 'F'`) ; remplacer « À suivre » par « Gestantes » | ElevageRecoveredModule data |
| V1-7 | Liste courte : femelles gestantes + mises bas < 14 j | ElevageReproductionPanel |
| V1-8 | `wrapCreate` : ne pas créer opportunité vente si `mode_acquisition` naissance/repro | useAnimalWorkflowHandlers |
| V1-9 | Tests : ouverture formulaire depuis tab Reproduction + payload naissance | tests/unit |

**Non régression :** tous boutons actuels conservés ; Animaux inchangé en parcours par défaut.

### Plan V2 — Centre métier reproduction

| # | Action |
|---|--------|
| V2-1 | CRUD `reproduction_events` (service + normalize) |
| V2-2 | Formulaires : saillie, insémination, diagnostic, déclaration gestation |
| V2-3 | Workflow **mise bas portée** (multi-jeunes, MAJ mère) |
| V2-4 | Onglet Reproduction : journal + filtres espèce |
| V2-5 | Champs repro en **édition** Animaux (femelles) — section repliable, pas doublon hub |
| V2-6 | Finance : valorisation cheptel naissance ; Documents : template certificat |
| V2-7 | Sevrage : event + champs date/poids |
| V2-8 | KPI performances (taux gestation, naissances/100 femelles) — section repliable |

### Plan V3 — IA, terrain, généalogie

| # | Action |
|---|--------|
| V3-1 | Prédiction IA mise bas + recommandations insémination |
| V3-2 | Voix : intents gestation / mise bas portée |
| V3-3 | Scan boucle → fiche mère |
| V3-4 | Vue généalogie (arbre mère/père/enfants) |
| V3-5 | Analyse fertilité comparative / export investisseur |
| V3-6 | Synchronisation alertes Santé (vaccin pré-mise bas) |

---

## 14. Matrice de vérification post-correction

| Contrôle | V1 | V2 | V3 |
|----------|----|----|-----|
| Tous boutons existants fonctionnels | ✓ | ✓ | ✓ |
| Formulaires complets métier | Partiel | ✓ | ✓ |
| Pas doublon saisie naissance Animaux/Repro | Partiel | ✓ | ✓ |
| Mode simulé tests | ✓ | ✓ | ✓ |
| Mobile 44px + listes | ✓ | ✓ | ✓ |
| ≤ 6 KPI | ✓ | ✓ | ✓ |
| Interconnexions Finance/Docs | — | ✓ | ✓ |

---

## 15. Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/modules/ElevageRecoveredModule.jsx` | `ReproductionHub`, agrégation KPI |
| `src/modules/elevage/ElevageReproductionPanel.jsx` | UI cible V1 (orphelin) |
| `src/modules/HeyHorizonAnimalCard.jsx` | Création terrain |
| `src/modules/AnimauxV2.jsx` | Listener Hey Horizon |
| `src/modules/AnimauxSpeciesFocused.jsx` | CRUD sans repro |
| `src/utils/animalLifecycle.js` | Alertes, traçabilité |
| `src/utils/constants.js` | MODULE_FORM_FIELDS référence |
| `src/services/erpRealSchema.js` | `reproduction_events` |
| `src/context/AppContext.jsx` | Events gestation / naissance |
| `src/modules/elevage/useAnimalWorkflowHandlers.js` | Side-effects création |

---

## 16. Conclusion

L’onglet Reproduction **ne peut pas** être le centre unique métier aujourd’hui : il agrège 4 KPIs et 4 actions de redirection, sans formulaire ni table dédiée. L’objectif « aucun doublon avec Animaux » est **violé** conceptuellement (naissance saisissable depuis Reproduction et Animaux, sans workflow unifié).

La trajectoire recommandée : **V1** réparer les ruptures et alertes sans retirer aucune fonction ; **V2** installer `reproduction_events` et workflows portée ; **V3** IA, voix, caméra et généalogie.

**Aucune suppression de fonctionnalités existantes** dans ces plans — consolidation et extension uniquement.

---

*Document généré pour revue métier et validation avant implémentation.*
