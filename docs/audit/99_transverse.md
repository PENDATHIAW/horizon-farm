# Audit Phase 1 · Sept audits transverses

Lecture seule, 2026-07-13, branche `claude/go-a21ueq`. Fondé sur le code.

## 1. Multi-ferme (farm_id + RLS)

**État : PARTIEL, risque élevé d'isolation.**

- `farm_id` présent seulement sur les tables P0 : `animals, lots, stocks,
  sales_orders, finances, cultures, business_events` (+ `stock_movements`,
  `alimentation_logs`, `production_oeufs_logs`, `feed_*`, `funding_*/funder_*`,
  `farm_cost_settings`, `farm_rh_directory`, `user_farm_access`).
- **Tables métier SANS `farm_id`** (échantillon vérifié) : `clients, fournisseurs,
  invoices, payments, deliveries, sales_order_items, sales_opportunities,
  client_receivables, price_catalog, transactions, treasury_accounts,
  treasury_movements, investissements, accounting_*, tasks, alertes_center,
  alert_rules, alert_events, documents, reports, equipment, sensor_devices,
  camera_devices, veterinaires, vaccins, veterinary_interventions, animal_*,
  reproduction_events, tracabilite, business_plans, bp_*, whatsapp_*, market_*,
  ai_*`.
- **RLS par ferme** (`can_read_farm/can_write_farm`) seulement sur : `farms,
  user_farm_access, stock_movements, funding_*, funder_*, feed_*,
  investor_forum_*, client_receivables, farm_cost_settings, farm_rh_directory,
  module_role_permissions, ai_recommendations`. Le reste a une RLS **générique**
  (`can_read_erp/can_write_erp`) non scindée par ferme, ou pas de RLS.

**Conséquence** : deux fermes ne sont pas isolées côté base pour la majorité des
tables (ventes, factures, paiements, tâches, alertes, documents, équipements,
santé…). L'isolation repose aujourd'hui surtout sur le filtrage applicatif
(`useFarmScopedCrud`), ce qui ne protège pas contre un accès direct à l'API.
**Correction (lot 2)** : ajouter `farm_id` + index + RLS par ferme sur toutes les
tables métier, avec migration de rattachement à la ferme Horizon Farm avant de
rendre `farm_id` non nul.

## 2. Doublons de données

**État : plusieurs doublons d'affichage, sources de vérité globalement uniques en
base.**

- **KPI affichés localement** : 43 fichiers utilisent `KpiCard` avec des valeurs
  calculées en props (souvent `.reduce` local) au lieu de `uniques/CarteKPI` +
  catalogue. Le même chiffre (CA, marge, valeur de stock) peut donc être recalculé
  différemment selon l'écran. **Source unique visée** : catalogue KPI
  (`catalogueKpi.js`) via `runKpiEngine`. Adoption actuelle : 3 modules seulement.
- **Marges / coûts** : calculés dans Élevage (24 fichiers), Finance (31),
  Commercial (16). La marge appartient à Finance ; Élevage/Commercial doivent la
  lire. Risque de divergence.
- **Journaux** : `JournalEvenements` (composant unique) coexiste avec des rendus de
  timeline locaux (`ModuleTimeline`, panneaux traçabilité). À consolider.
- **Alertes** : affichage dispersé (51 fichiers appellent `onCreateAlert`), mais
  l'écriture va dans une table centrale unique (`alertes_center`). L'affichage doit
  passer par `uniques/ListeAlertes`.
- **Stocks** : pas de stock parallèle détecté ; les mouvements passent par
  `stock_movements`. Bon.

## 3. Moteur alertes / tâches / décisions

**État : une table centrale par famille, mais satellites d'alertes à clarifier.**

- **Tâches** : une seule table `tasks` (clé CRUD `taches`). Bon. Les actions
  correctives sont des tâches avec `alert_id` (supporté par `uniques/ListeTaches`).
- **Alertes** : table centrale `alertes_center`, mais **satellites** `alert_rules`,
  `alert_events`, `alertes_history`, `alertes_settings`. À clarifier : moteur
  unique de règles/événements ou implémentations concurrentes ? Le catalogue des 15
  alertes (`catalogueAlertes.js`) existe en code mais n'est pas encore la source
  administrable unique.
- **Décisions** : pas de table `decisions` dédiée ; les décisions vivent dans
  `ai_decisions` et des moteurs de code (`strategicDecisionEngine`,
  `decisionHistoryEngine`). L'onglet Décisions du Centre ne propose pas encore la
  fiche décision complète clôturable sur résultat mesuré (voir fiche Centre).

## 4. Reconnaissance financière

**État : sources uniques posées, garde anti-double-comptage présente mais fragile.**

- **CA** : source unique `buildConsolidatedCommercialKpis`
  (`kpiEngine/commercialKpis.js`), reconnu à la vente ; **non recalculé depuis les
  paiements** dans le moteur. Bon. Mais 16 fichiers commerciaux + 31 finance font du
  `.reduce` local : audit ligne à ligne requis pour garantir qu'aucun panneau ne
  redérive le CA depuis `payments`.
- **Encaissements / trésorerie** : garde anti-double-comptage à
  `dashboardMetrics.js:487` : `encaisse = commercialKpisPeriod.collected ||
  financePeriods.encaissePeriod` (on ne somme pas les deux). C'est un **fallback**,
  pas une règle stricte imposée partout — à durcir.
- **Créance** : Commercial (ventes − encaissements). **Dette** : Finance (exigible −
  paiements fournisseurs). **Marge** : Finance. Propriété cohérente en principe ;
  reste à garantir que les autres modules lisent et ne recalculent pas.
- **Moments de reconnaissance** : dépense à la facture, décaissement au paiement,
  encaissement lu depuis Commercial — à vérifier onglet par onglet dans Finance.

## 5. Idempotence hors ligne (risque le plus grave)

**État : idempotence de l'événement OUI, idempotence des effets sur rejeu NON
garantie.**

- **Couche événement** : `businessEventsService.js` déduplique par `issue_key` (un
  business_event de même `issue_key` est ignoré). Les workflows quotidiens
  (`elevageWorkflow.js`, ventes, réceptions) attachent `issue_key`. Bon socle.
- **Faille du rejeu hors ligne** : `AppContext.syncOfflineQueue`
  (`AppContext.jsx:261`) rejoue les mutations en appelant **directement**
  `service.create/update/remove(payload)`. Ce chemin **ne passe pas par
  `createRecord`** et **n'émet donc aucun business_event** (`emitBusinessEvents` est
  seulement dans `createRecord`/`updateRecord`). Conséquences :
  1. Un enregistrement créé hors ligne est réinséré avec son id fixe (pas de
     doublon de ligne grâce à la clé primaire), mais **ses effets inter-modules
     (mouvement de stock, écriture finance, alerte) ne sont pas rejoués** — perte
     d'effet, incohérence possible.
  2. L'idempotence par `issue_key` n'est **pas** exploitée sur ce chemin.
- **Recommandation (lot 5/6)** : router le rejeu hors ligne par la même voie que
  l'écriture en ligne (émission d'événements idempotents à `issue_key`), et écrire
  un test « rejeu d'une vente / réception / distribution / relevé = un seul effet ».
  C'est le point le plus grave de l'audit.

## 6. Chaînes en dur

**État : dictionnaire créé, migration très incomplète.**

- Infrastructure i18n présente (`src/i18n/fr/`, `charte.js`) et deux tests de garde
  (`i18nCharteLibelles`, `i18nChainesEnDur`) verts, mais le cliquet ne couvre que
  `src/i18n/`.
- **~2 170 nœuds de texte français visibles restent en dur dans les JSX** (mesure
  approchée sur les nœuds `>texte<`), sans compter les libellés dans les littéraux.
  La très grande majorité de l'interface n'est pas encore dans le dictionnaire.

## 7. Langage (termes interdits, tirets longs, identifiants techniques)

**État : nettoyage des chaînes visibles fait, résidus dans fichiers non visibles.**

- Termes de spécification / formules d'IA à l'écran : ramenés à **0 chaîne visible**
  (chantier 1) ; il reste 3 occurrences dans des fichiers **non affichés**
  (`heyHorizonCommercialPrompt.js`, `heyHorizonFinancePrompt.js` : « canonique »,
  « payload ») — instructions internes du moteur, exclues et documentées.
- **Tiret long** : encore présent dans ~533 fichiers (code et chaînes confondus) ;
  interdit uniquement dans le dictionnaire et les chemins migrés pour l'instant.
- **Mot « IA » à l'écran** : retiré des composants visibles (chantier 1) ; subsiste
  dans des chaînes de `services/*` et `vision/*` non encore migrées.
- **Identifiants techniques visibles** : `MODULE_TABS_CONFIG` empêche désormais
  d'afficher un onglet non rendu ; pas d'identifiant technique constaté dans les
  barres d'onglets. À re-scanner après migration i18n complète.
