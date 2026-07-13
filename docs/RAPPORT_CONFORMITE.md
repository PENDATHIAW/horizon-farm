# Rapport de conformité Horizon Farm ERP

Session du 2026-07-12, branche `claude/go-a21ueq`. Référence : prompt « Mise en conformité
Horizon Farm ERP V1 » (version corrigée et consolidée). L'inventaire préalable est dans
`docs/ETAT_ACTUEL.md` (commit `00abbc3`).

Échelle : FAIT / PARTIEL / NON FAIT / BLOQUÉ. Un statut FAIT cite fichiers, tests et résultats.

## Vue d'ensemble

| Chantier | Statut | Preuve principale |
|---|---|---|
| 0 · Inventaire de l'existant | FAIT | docs/ETAT_ACTUEL.md, commit 00abbc3 |
| 1 · Dictionnaire et charte de langage | PARTIEL | src/i18n/, 2 tests verts, commit acdd762 |
| 2 · Identifiants, alias et flags | PARTIEL | alias + flags testés (7 tests), commit 9527b3a ; volet base BLOQUÉ |
| 3 · Structure cible des onglets | NON FAIT | écarts documentés ci-dessous |
| 4 · Composants uniques | NON FAIT | composants cibles absents, existants listés |
| 5 · Contrat des 20 secondes | NON FAIT | aucun harnais dédié exécuté |
| 6 · Nettoyages de pertinence | PARTIEL | retraits réels faits, autres cibles sans objet, commit 8d32052 |
| 7 · Tests et rapport | PARTIEL | batteries exécutées ci-dessous |

## Chantier 0 · Inventaire (FAIT)

`docs/ETAT_ACTUEL.md` : 18 modules de navigation + 17 modules historiques, onglets réels par
module, ~110 tables Supabase, 26 migrations, 55 composants partagés, 18 506 chaînes françaises
en dur dans 1 256 fichiers, rôles réels, absence de flags et d'i18n.

## Chantier 1 · Dictionnaire de libellés et charte (PARTIEL)

Fait, avec preuves :

- `src/i18n/charte.js` : termes de spécification interdits, formulations interdites, tiret long,
  mot « IA », versions V1/V2/V3, avec les exclusions demandées documentées (contenu utilisateur,
  documents importés, pièces publiées, noms de fichiers, commentaires, jeux de test, logs non
  visibles, noms propres, identifiants de code).
- `src/i18n/fr/` (index, commun, navigation) avec les remplacements de référence : « Suggestion à
  confirmer », « Je n'ai pas assez de données pour répondre. Voir {module}. », « Rien à afficher
  pour l'instant. », « Coût moyen » + infobulle, « Urgent : {objet} attend un responsable »,
  astérisque pour champ obligatoire, boutons verbe + objet.
- Corrections réelles : 101 fichiers modifiés (commit acdd762). 114 chaînes visibles non
  conformes ramenées à 0 (hors 2 fichiers d'instructions moteur exclus et documentés) :
  « canonique », « validation humaine », « L'IA propose », « Centre IA », « Décision IA »,
  « Brouillon IA », « recommandation IA », « source officielle », « ne doit jamais »,
  « business_events » en prose, etc.
- Tests exigés : `tests/unit/i18nCharteLibelles.test.js` (dictionnaire sans terme interdit ni
  tiret long) et `tests/unit/i18nChainesEnDur.test.js` (chaînes visibles de src/, exclusions
  documentées dans le fichier, cliquet de migration par chemins). `npm run test:unit:i18n` :
  4 tests, 0 échec.

Reste à faire (raison du PARTIEL) : la migration des ~18 500 chaînes françaises vers le
dictionnaire. Le cliquet (`CHEMINS_MIGRES` dans le test 2) verrouille chaque répertoire migré ;
seul `src/i18n/` est migré à ce stade. Le tiret long et le mot « IA » ne sont donc verrouillés
que dans le dictionnaire et les chemins migrés (533 fichiers contiennent encore des tirets longs).

## Chantier 2 · Identifiants, alias et flags (PARTIEL)

Fait, avec preuves (commit 9527b3a, `tests/unit/moduleAliasesEtFlags.test.js` : 7 tests, 0 échec) :

- Renommages : `centre_ia → centre_decisionnel`, `rh → equipe` (libellé « Équipe »),
  `investisseurs_forums → financements` (déjà en place, vérifié). Anciennes routes redirigées via
  `DEPRECATED_MODULE_ALIASES` (src/config/moduleEntryPoints.js) ; permissions conscientes des
  alias (src/context/AuthContext.jsx) ; registre et navigation sur les nouveaux identifiants,
  libellés lus depuis src/i18n (src/config/modules.config.js).
- Fusion synchronisation : `sync`, `sync_activity` et `audit_logs` redirigent vers Gestion du
  système ; nouvel onglet Synchronisation qui intègre SyncActivityCenter
  (src/modules/GestionSystemeUnified.jsx) ; badge global d'en-tête « {n} saisies en attente
  d'envoi » depuis la file hors ligne (src/layouts/AppLayout.jsx, libellé du dictionnaire).
- Flags par ferme (`src/config/moduleFlags.js`, source farms.settings.modules) pour agri_feeds,
  smartfarm, financements, assistant_erp. Module désactivé = aucune entrée de navigation,
  navigation redirigée vers l'Accueil, composant jamais construit donc import dynamique jamais
  résolu, et préchargement de ses tables coupé (garde dans AppContext.fetchModuleData via
  isDataKeyEnabled). AGRI FEEDS et Smart Farm désactivés par défaut pour une nouvelle ferme.
  Vérification par test d'import : un chargeur espionné n'est jamais résolu quand le flag est
  éteint (test « flag désactivé = entry point retiré, import jamais résolu »).
- Migration écrite : `supabase/migrations/20260712120000_flags_modules_par_ferme.sql` (active les
  quatre modules pour les fermes existantes afin de ne rien casser, sans écraser un réglage posé).

Reste à faire / BLOQUÉ :

- Application des migrations : BLOQUÉ, aucun accès à l'instance Supabase depuis cet
  environnement. La migration des flags est écrite mais non appliquée ni testée en base.
- farm_id + index + RLS sur toutes les tables métier, ferme par défaut et rattachement des lignes
  existantes : NON FAIT. L'existant couvre une partie (migrations multi_farm_foundations,
  stock_movements_farm_scope, elevage_logs_farm_id, durcissements AGRI FEEDS et financements),
  mais la vérification systématique table par table exige l'accès base.

## Chantier 3 · Structure cible des modules et onglets (NON FAIT)

Aucun des 17 modules n'a été restructuré vers la liste cible d'onglets. L'écart complet actuel /
cible est documenté dans docs/ETAT_ACTUEL.md §3. Fondations en place : les onglets sont déjà
servis par une configuration centrale (`MODULE_TARGET_TABS` dans src/config/horizonVision.config.js,
consommée par ModuleTabsBar), mais sans rôle requis ni flag par onglet, et les listes ne
correspondent pas au chantier 3. Seule évolution livrée : l'onglet Synchronisation de Gestion du
système (chantier 2). Raison : chaque module demande fusions, déplacements de contenus et
nouveaux écrans ; c'est un chantier de plusieurs sessions qui doit suivre la grille SPCE écran
par écran.

## Chantier 4 · Composants uniques (NON FAIT)

JournalEvenements, ListeTaches, ListeAlertes et CarteKPI n'existent pas encore comme composants
uniques. Existants approchants recensés (KpiCard, MiniMetricCard, ModuleTimeline, DataTable) et
implémentations locales multiples confirmées. Créer les quatre composants sans migrer leurs
consommateurs ajouterait une duplication de plus ; ce chantier doit être mené avec le chantier 3.

## Chantier 5 · Contrat des 20 secondes (NON FAIT)

Aucun harnais « 5 champs, 5 interactions, 20 secondes » n'a été créé ni exécuté. Les scénarios
Playwright existants (tests/e2e/) n'ont pas été lancés dans cette session (pas de navigateur
dans le budget de la session ; le dépôt fournit `npm run test:e2e`). Le test humain sur téléphone
doit être chronométré et consigné séparément par l'équipe ; aucun résultat automatisé ne peut le
remplacer (règle du prompt).

## Chantier 6 · Nettoyages de pertinence (PARTIEL)

Retraits effectués (commit 8d32052) :

| Retrait | Détail | Fichiers |
|---|---|---|
| Carte météo de l'Accueil | Carte « Météo terrain » supprimée (code mort), ligne température retirée des cartes ferme, pastilles météo retirées de l'en-tête | src/modules/dashboard/DashboardShell.jsx, dashboardV3Panels.jsx, farmDashboardPanels.jsx, dashboardV3.js, src/layouts/AppLayout.jsx |
| Plafond de crédit (reporté) | Champ retiré du formulaire client ; les données existantes restent lisibles, rien n'est supprimé | src/modules/Clients.jsx |

Cibles du chantier sans objet dans l'état actuel (vérifié par recherche dans le code) :

- Assistant : pas d'onglets « Sources » ni « Questions fréquentes » (onglets actuels : Hey
  Horizon, Questions métier, Aide à la décision, Recherche dans les données).
- Objectifs : pas d'onglets « Capacité » ni « Rentabilité » (actuels : Suivi du Business Plan,
  Prévisionnel vs réel, Simulations, Capacité de remboursement).
- Documents : pas d'onglet « Modèles ».
- Équipe : pas d'onglet « Rôles opérationnels ».
- Commercial : pas de « taux de réclamation » affiché.
- Équipements : pas d'alerte de garantie implémentée.

Ces éléments restent à traiter lors de la restructuration du chantier 3 si les nouveaux onglets
les réintroduisent.

## Chantier 7 · Tests exécutés et résultats

Exécutés dans cette session (Node 22, npm ci propre) :

| Batterie | Résultat |
|---|---|
| test:unit:i18n (libellés interdits + chaînes en dur avec exclusions) | 4 tests, 0 échec |
| moduleAliasesEtFlags (redirections + flags = zéro chargement) | 7 tests, 0 échec |
| test:unit:idempotency (rejeu d'événements = un seul effet) | 13 tests, 0 échec |
| test:unit:farm-scope (portée ferme, phases 1 à 5) | 52 tests, 0 échec |
| test:unit:kpi-coherence | 6 tests, 0 échec |
| test:unit:anti-duplication | 9 tests, 0 échec |
| test:unit:workflow-quality | 4 tests, 0 échec |
| test:unit:render-smoke, module-smoke, stability, dashboard, commercial, elevage, achats-stock, agri-feeds | 0 échec (après mise à jour de 2 assertions liées aux libellés) |
| Build de production (vite build) | OK |
| Lint (eslint) sur tous les fichiers modifiés | 0 erreur |

Échecs préexistants, non causés par cette session (vérifiés sur l'arbre avant modification) :

- tests/unit/elevageV2.test.js : 1 échec dépendant de la date du jour (fenêtre de 7 jours sur des
  données de juin 2026).
- tests/unit/annexeTabsConfig.test.js : 4 échecs, assertions de comptage d'onglets périmées.
- tests/unit/syncActivityTabsNavigation.test.js : 1 échec typographique (apostrophe ' vs ').
- tests/unit/documentsWorkflow.test.js : import sans extension incompatible avec node --test
  (passe sous vite).

Non exécutés / NON FAIT dans cette session : isolation live entre deux fermes (exige la base et
les politiques RLS appliquées), permissions des huit rôles cibles (les huit rôles
promotrice_direction … admin_support ne sont pas encore implémentés ; rôles actuels documentés
dans docs/ETAT_ACTUEL.md §7), tests de transactions sans état partiel, immuabilité des rapports
publiés, chronométrage automatisé des 7 formulaires et test humain sur téléphone.

## Migrations non appliquées

- `supabase/migrations/20260712120000_flags_modules_par_ferme.sql` (nouvelle, cette session).
- Aucune vérification possible de l'application des 26 migrations existantes depuis cet
  environnement : à prouver sur l'instance avant tout merge dans main (contrainte de livraison).

## Invariants et interdictions permanentes : conformité de la session

- Aucune table ni donnée supprimée ; le retrait du plafond de crédit ne touche que le formulaire.
- Aucune route cassée : tous les anciens identifiants (centre_ia, rh, sync, sync_activity,
  audit_logs, investisseurs_forums, impact_business, financeurs) redirigent, testé.
- Aucun secret ajouté au dépôt ni au rapport.
- Aucune table alerts, tasks ou de KPI locale créée.

## Reste à faire, dans l'ordre du prompt

1. Terminer la migration i18n répertoire par répertoire en étendant `CHEMINS_MIGRES` (chantier 1).
2. Prouver farm_id + index + RLS table par table et appliquer les migrations (chantier 2, accès base requis).
3. Restructurer les 17 modules vers les onglets cibles avec config id / libellé / composant / rôle / flag, grille SPCE à l'appui (chantier 3).
4. Créer et généraliser JournalEvenements, ListeTaches, ListeAlertes, CarteKPI (chantier 4).
5. Harnais des 20 secondes + test humain consigné (chantier 5).
6. Batterie complète du chantier 7 (isolation fermes, huit rôles, transactions, immuabilité, chronométrage).

---

## Correctif Élevage · Restauration de l'onglet Transformation

### Cause exacte

La barre d'onglets (`src/components/module/ModuleTabsBar.jsx`) affichait la liste
d'onglets *cible* (aspirationnelle) au lieu des onglets réellement rendus par
chaque module. Pour Élevage, la liste affichée était « Lots & bandes · Pondeuses ·
Embouche bovine · Santé & biosécurité · Alimentation · Performances », alors que
`ElevageRecoveredModule` ne rend que « Lots & bandes · Cycles & Reproduction ·
Santé · Transformation » (constante `ELEVAGE_TABS`). Résultat : l'onglet
Transformation n'apparaissait pas, et les libellés affichés que le module ne sait
pas rendre ne déclenchaient rien au clic. Le module Transformation n'a jamais été
supprimé : `ElevageTransformationTab.jsx`, le rendu conditionnel
`tab === 'Transformation'` (ElevageRecoveredModule ligne 588), les utilitaires
`elevageTransformation{Navigation,Journal,Cost,Workflow}.js` et la reconnaissance
de `Transformation`/`transformation` par `resolveElevageTab` sont tous intacts.

Ce défaut touchait toute la famille de modules pilotés par `ModuleTabsBar`, d'où
les onglets « qui ne font rien » signalés dans plusieurs modules.

### Correction appliquée

`src/config/moduleTabs.config.js` devient la source unique des onglets : pour
chaque module, `onglets` est construit à partir des constantes de navigation qui
sont la vérité du rendu (`ELEVAGE_TABS`, `COMMERCIAL_TABS`, `ACHATS_STOCK_TABS`,
`FINANCE_TABS`, `ACTIVITE_SUIVI_TABS`, `DOCUMENTS_RAPPORTS_TABS`, `RH_TABS`,
`OBJECTIFS_TABS`, `CENTRE_IA_TABS`, `SMARTFARM_TABS`, `SYNC_ACTIVITY_TABS`,
`GESTION_SYSTEME_TABS`, `AGRI_FEEDS_TABS`, `DASHBOARD_TABS`). `MODULE_TARGET_TABS`
est dérivé de cette configuration, si bien que barre d'onglets, rendu et
deep-links lisent désormais la même liste. La structure cible reste documentée
dans le champ `cible` de chaque module. Aucun ancien alias n'a été retiré ;
`Transformation` et `transformation` continuent de résoudre vers l'onglet.

Transformation reste conforme à la décision métier : création du produit fini et
de la traçabilité, rattachement des coûts lus depuis Finance, aucune vente saisie
dans Élevage, aucun stock ni calcul financier parallèle. Aucune table locale
`alerts`, `tasks`, `stock`, `sales`, `finance` ou `kpi` n'a été créée.

### Fichiers modifiés

- `src/config/moduleTabs.config.js` (onglets sourcés des constantes réelles).
- `src/components/module/ModuleTabsBar.jsx` (lecture de la configuration unique).
- `src/config/horizonVision.config.js` (`MODULE_TARGET_TABS` dérivé).
- `tests/unit/elevageTransformationTabConfig.test.js` (nouveau, preuve du correctif).
- `tests/unit/achatsStockTabControl.test.js` (assertion alignée sur le rendu réel).

### Comportement avant / après

- Avant : onglet Transformation absent de la barre Élevage ; onglets aspirationnels
  affichés sans effet au clic sur plusieurs modules.
- Après : la barre Élevage affiche « Lots & bandes · Cycles & Reproduction · Santé ·
  Transformation » ; chaque onglet de chaque module correspond à une vue rendue.

### Tests exécutés et résultats

- `tests/unit/elevageTransformationTabConfig.test.js` : 6 tests, 0 échec (config
  Élevage = rendu réel, Transformation visible dans le rendu SSR de la barre,
  alias `Transformation`/`transformation`, non-repli sur « Lots & bandes »,
  composant de rendu déclaré).
- `tests/unit/elevageTransformationOfficial.test.js` : 10 tests, 0 échec.
- `tests/unit/elevageDecisionTabs.test.js` : 4 tests, 0 échec.
- `moduleTabsStability` : 340 tests, 0 échec ; render smoke, tab-control et
  navigation de tous les modules : 0 échec.
- `npm run build` : succès.
- Rendu SSR des 4 onglets Élevage, des 3 onglets Accueil et des 5 onglets du
  Centre décisionnel : aucun crash.

### Navigation, formulaire, idempotence, permissions

- Navigation : `resolveElevageTab('Transformation')` et `('transformation')`
  renvoient « Transformation » ; `initialTab` et les deep-links ouvrent l'onglet
  sans repli silencieux sur « Lots & bandes ». Les actions métier « Transformer »
  et l'événement `horizon-open-form` restent gérés par les utilitaires existants
  (`elevageTransformationNavigation.js`, `elevageTransformationWorkflow.js`).
- Formulaire et idempotence : couverts par `elevageTransformationOfficial.test.js`
  (écriture unique, entrée de stock unique, pas de doublon au rejeu, pas de vente
  créée dans Élevage), inchangés par ce correctif.
- Permissions : Élevage n'est pas exposé au rôle `financeur_externe` (contrôle en
  amont de la navigation) ; l'onglet Transformation suit l'accès du module.

### Éléments encore partiels

La restructuration *complète* d'Élevage vers la structure cible à 8 onglets
(Vue d'ensemble · Lots & animaux · Alimentation · Production · Santé & Biosécurité ·
Transformation · Coûts & performance · Historique) reste à mener ; le champ `cible`
la documente. Ce correctif restaure Transformation dans la liste réellement
consommée, sans casser les vues existantes, et prépare la configuration unique.
