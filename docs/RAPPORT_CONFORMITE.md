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
| 5 · Contrat des 20 secondes | PARTIEL | registre + test contrat (7 tests verts) ; chronométrage humain à consigner |
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

## Chantier 5 · Contrat des 20 secondes (PARTIEL)

Fait, avec preuves :

- Registre unique `src/config/formulaires20s.config.js` : les 7 saisies quotidiennes (distribution,
  ponte, mortalité, pesée, irrigation, récolte, vente) et les 10 saisies périodiques (réception,
  dépense, encaissement client, paiement fournisseur, vaccination, nettoyage, transfert organique,
  semis, panne, absence). Chaque entrée déclare : champs requis (cinq au maximum), champs repliés
  sous « Détails », préremplissages (date du jour, utilisateur connecté, unités de la ferme, lot ou
  parcelle unique auto, dernier fournisseur, dernier prix), filtres de contexte, clé d'idempotence
  (issue_key : rejeu = un seul effet, en ligne comme hors ligne) et gabarit de confirmation à effets.
- Confirmation à effets : `src/utils/confirmationAEffets.js` produit « {Saisie} enregistrée ·
  {effet stock} · {effet coût ou KPI} » depuis le dictionnaire et le registre.
- Boutons d'action rapide des 7 saisies quotidiennes sur l'Accueil, dérivés du même registre
  (`ACTIONS_RAPIDES_QUOTIDIENNES` dans src/modules/dashboard/AccueilConforme.jsx).
- Test contrat `tests/unit/contrat20Secondes.test.js` : 7 tests, 0 échec (7 quotidiennes et 10
  périodiques présentes ; cinq champs requis maximum ; préremplissages date/utilisateur/unités
  partout ; clé d'idempotence et confirmation à effets présentes ; libellés verbe + objet conformes
  à la charte, « Soumettre » interdit ; gabarit de confirmation vérifié ; boutons de l'Accueil
  alignés sur les 7 saisies quotidiennes).
- Harnais de chronométrage `tests/e2e/contrat-20-secondes.spec.js` : ouvre chaque saisie quotidienne
  depuis l'Accueil sur données de démonstration et vérifie une ouverture en moins de 20 secondes
  (ignoré sans identifiants E2E ni navigateur).
- Modèle de test humain sur téléphone `docs/test-humain-20-secondes.md` avec grille à consigner.

Reste à faire (raison du PARTIEL) : l'exécution réelle du harnais Playwright dans un environnement
avec navigateur et données de démonstration, et surtout le test humain chronométré sur téléphone,
qui doit être consigné séparément. Le contrat est encodé et vérifié au niveau du registre ; le
respect des cinq interactions et des moins de 20 secondes en usage réel se prouve par ces deux
exécutions, non encore faites dans cette session.

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

Le module n'avait pas été supprimé. `ElevageTransformationTab`, le rendu
conditionnel `tab === 'Transformation'`, les handlers et les utilitaires de
navigation, journal et workflow existaient encore. Le masquage venait d'une
configuration d'onglets visible contradictoire avec le rendu réel. La
configuration canonique par module est désormais `src/config/moduleTabs/` ;
`ModuleTabsBar`, le résolveur d'alias et les deep-links lisent cette même source.

### Correction appliquée

- La barre Élevage expose les huit onglets cibles dans l'ordre demandé : Vue
  d'ensemble, Lots & animaux, Alimentation, Production, Santé & Biosécurité,
  Transformation, Coûts & performance, Historique.
- Les alias historiques `Transformation` et `transformation`, `initialTab`, les
  deep-links, les actions Transformer animal/lot et `horizon-open-form` convergent
  vers le même rendu.
- Le formulaire conserve l'animal ou le lot, le type, la date réelle, le statut
  sanitaire, les poids, pertes, preuves et la destination du produit fini.
- La validation produit une seule sortie vivant, une entrée de stock et son
  mouvement, une allocation de coût sans effet de trésorerie, un document et un
  événement métier. Elle ne crée aucune vente.
- Les identifiants et `event_key` des effets sont déterministes ; un rejeu déjà
  présent dans `business_events` est reconnu et ne recrée aucun effet.
- Les capacités sont explicites pour les sept profils concernés : direction et
  responsable complets, terrain sans coûts sensibles, vétérinaire en lecture
  sanitaire, finance en lecture des coûts, financeur externe sans accès et support
  administrateur tracé.
- Aucune table locale `alerts`, `tasks`, `stock`, `sales`, `finance` ou `kpi` n'a
  été créée.

### Fichiers modifiés

- `src/config/moduleTabs/elevage.config.js`
- `src/modules/ElevageRecoveredModule.jsx`
- `src/modules/elevage/TransformationOfficialForm.jsx`
- `src/utils/elevageTransformationWorkflow.js`
- `src/utils/elevageTransformationPermissions.js`
- `tests/unit/elevageTransformationOfficial.test.js`
- `tests/unit/elevageTransformationTabConfig.test.js`
- `tests/unit/moduleRenderWithProvider.vite.test.js`

### Comportement avant / après

- Avant : le code Transformation existait mais sa configuration visible pouvait
  l'écarter ; certains alias retombaient sur la vue Lots & bandes.
- Après : Transformation occupe la sixième position de la structure à huit
  onglets et rend `ElevageTransformationTab` dans le module réel, y compris par
  deep-link et formulaire prérempli.

### Tests exécutés et résultats

- `elevageTransformationTabConfig.test.js` : 6 réussites, 0 échec.
- `elevageTransformationOfficial.test.js` : 14 réussites, 0 échec.
- `moduleRenderWithProvider.vite.test.js` : 5 modules rendus, dont Élevage ouvert
  directement sur Transformation ; 5 réussites, 0 échec.
- `npm run lint` : succès, 0 erreur.
- `npm run build` : succès, 3 519 modules transformés ; avertissements de taille
  de chunks et d'imports dynamiques inefficaces déjà connus, sans échec.

### Navigation, formulaire, idempotence, permissions

- Navigation : opérationnelle pour clic, alias, `initialTab`, deep-link, actions
  animal/lot et événement d'ouverture de formulaire.
- Formulaire : opérationnel avec validation sanitaire, sortie vivant, stock,
  mouvement, coûts, preuve et événement métier ; aucune vente automatique.
- Idempotence : prouvée par un double appel avec la même `event_key`, sans doublon.
- Permissions : appliquées dans la visibilité de l'onglet et dans le formulaire ;
  les coûts, la saisie, la validation et la dérogation sanitaire sont séparés.

### Éléments encore partiels

Le contrôle navigateur de tous les onglets, le responsive et la validation
Supabase font partie de la batterie finale du chantier global et sont consignés
séparément après exécution.
