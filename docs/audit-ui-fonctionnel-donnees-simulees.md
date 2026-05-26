# Audit UI fonctionnel Horizon Farm avec données simulées

Branche auditée : `feature/objectifs-croissance-centre-decisionnel`

## Résumé exécutif

- Ce qui marche : la branche expose les versions métier demandées, avec `SanteV8`, `CulturesV5`, `InvestissementsV9`, `StocksV5` et la chaîne ventes `VentesV3 -> VentesV5 -> VentesV6 -> VentesV4`. Les tests métier simulés valident les cas animaux prêts à vendre, avicole, récoltes, ventes soldées, clients payés et santé en retard.
- Ce qui a été corrigé : opportunités animaux/avicole, récoltes cultures synchronisées stock/ventes, ventes soldées protégées, créances clients recalculées, retards santé liés aux tâches/alertes, déduplication alertes, mouvements stock tracés, réception fournisseur reliée à stock/finance/documents/trace, justificatifs manquants séparés des preuves valides, cash finance sans créances impayées, actions système dangereuses protégées, pannes équipement reliées aux alertes/tâches, salaires RH reliés à finance/documents, routage des versions métier, stabilisation UI/tests.
- Ce qui reste bloquant : aucun blocage GitHub actif après passage du remote en SSH. Les commits récents sont poussés sur `origin/feature/objectifs-croissance-centre-decisionnel`. Les points restants concernent surtout la profondeur métier à valider sur données réelles Supabase.
- Risques majeurs avant données réelles : certains modules restent très riches mais doivent être reliés à une vraie politique d’écriture Supabase, permissions serveur, validation documents et traçabilité exhaustive des actions sensibles.

## Modules audités

| Module | Version/fichier testé | Données simulées utilisées | Formulaires/boutons testés | Corrections faites | Commit associé | Restant | Priorité |
|---|---|---|---|---|---|---|---|
| Accueil | `DashboardV2` | ventes, paiements, santé, stock, tâches, alertes | cartes, actions rapides, navigation urgences | chiffres ventes/encaissements fiabilisés | `286e618` | enrichir regroupement administratif | P2 |
| Assistant ERP | `AssistantERPV2` | commandes simulées, brouillons | ouverture Hey Horizon, orientation modules | smoke sans texte technique | `18e6d78` | préremplissage fiche encore à renforcer | P2 |
| Centre décisionnel | `CentreIA` | stock, santé, finances, production | recommandations, preuves, ouverture source | smoke et audit métier | `18e6d78` | éviter doublons avec Alertes | P2 |
| Objectifs & Croissance | `ObjectifsCroissanceV2` | objectifs production/finance | objectifs, plans, liens source | routage vérifié | `18e6d78` | actions automatiques à compléter | P2 |
| Animaux | `AnimauxV2` | animaux actifs, vendus, prêts | espèces, fiche, prêt à vendre | opportunité unique animal prêt | `d381dee` | sortie mort/perte à tracer partout | P1 |
| Avicole | `AvicoleV10` | lots chair/pondeuses, œufs, mortalité | lots, ponte, alimentation, opportunités | clés stables et opportunités vente | `4941b16`, `4cd10ae` | décrément stock aliment réel à auditer | P1 |
| Santé & Vaccins | `SanteV8` | soins en retard/réalisés | soin, report, statut, coût | retards synchronisés tâches/alertes, boucle useEffect corrigée | `0d73a27`, `55dbb08`, `7489b16` | documents de preuve à systématiser | P1 |
| Finances | `FinancesV12` | entrées, sorties, créances | écriture, dépense, paiement | build/smoke, finance reliée ventes, créances exclues du cash encaissé | `286e618`, `d9ae417` | rapprochement bancaire réel à ajouter | P2 |
| Comptabilité | `ComptabiliteV7` | écritures, justificatifs | contrôle, preuve, export | module audité en smoke | `18e6d78` | verrouillage clôture réel | P2 |
| Investissements | `InvestissementsV9` | BP Horizon Farm, charges, revenus | onglets BP, amortissements, contrôle | routage V9 et BP visible | `f06aea4`, `e956a37` | transformation actif à sécuriser | P1 |
| Impact & Valeur | `ImpactBusiness` | production, revenus, preuves | dossier financeur, liens rapports | séparation avec Rapports vérifiée | `18e6d78` | score financeur à sourcer davantage | P2 |
| Stock | `StocksV5` via `StocksV4` | intrants, œufs, récoltes, seuils | mouvements, réception, perte | mouvements tracés sur variation quantité | `2931a85`, `65960b6` | unités multi-produits à normaliser | P1 |
| Clients | `ClientsReadable` / `ClientsV2` | clients avec/sans dette | relance, historique, paiements | statut recalculé depuis créance réelle | `fd486d9`, `2a21447` | suppression client à verrouiller | P1 |
| Ventes | `VentesV3 -> V5 -> V6 -> V4` | ventes simples, partielles, soldées | nouvelle vente, traiter, encaisser, facture | ventes soldées protégées, totaux fiabilisés | `1551d2c`, `7950b24`, `286e618` | livraison/source stock à tester en réel | P1 |
| Fournisseurs | `FournisseursReadable` | dettes, réceptions, paiements | commander, payer, réception | réception stock -> dette finance -> document manquant -> trace, paiement solde les écritures ouvertes | `18e6d78`, `0dbaad1` | relance fournisseur WhatsApp réelle à contrôler | P2 |
| Traçabilité | `TracabiliteV2` | événements métier | filtres, source, export | traces stock/santé/ventes enrichies | `2931a85`, `0d73a27` | suppression/action admin à tracer | P1 |
| Alertes | `AlertesCenterV2` | alertes nouvelles/résolues | résoudre, ignorer, transformer tâche | déduplication et clôture tâches liées | `624f89e`, `f05ea39` | WhatsApp simulé à isoler du réel | P2 |
| Cultures | `CulturesV5` | parcelles, récoltes, pertes | récolte, intrants, opportunité | récolte synchronisée stock et vente | `5496389`, `908d3fe` | météo encore décorative partiellement | P2 |
| Documents | `DocumentsV2` | factures, preuves manquantes | créer preuve, lier document | audit preuves importantes, document manquant non compté comme preuve | `18e6d78`, `09682a1` | upload réel et statut vérifié à compléter | P2 |
| Tâches | `TachesV3` | tâches retard/en cours/terminées | créer, terminer, reporter | santé/alertes liées aux tâches | `0d73a27`, `624f89e` | clôture auto inter-modules à étendre | P1 |
| RH & Équipe | `RHV2` | employés, salaires, rôles | présence, salaire, assignation | paie reliée à finance et document salaire à joindre | `18e6d78`, `344e480` | contrôle paie réel à connecter à Supabase | P2 |
| Rapports | `RapportsV2` | rapports, dossier financeur | générer/exporter/préparer | séparation Impact/Rapports | `18e6d78` | PDF sur brouillon modifié à tester | P2 |
| Équipements | `EquipementsV2` | pannes, maintenances, coûts | panne, maintenance, réparation | panne -> tâche + alerte, résolution maintenance -> alerte résolue | `18e6d78`, `7489b16`, `344e480` | coût réparation -> finance/document à renforcer | P2 |
| Smart Farm | `SmartFarm` | capteurs, météo, seuils | capteur, caméra, alerte | smoke module | `18e6d78` | simulation/réel à marquer partout | P2 |
| Activité & Sync ERP | `SyncActivityCenterV2` | anomalies, logs, sync | rafraîchir, corriger, ouvrir source | centre QA métier audité | `18e6d78` | actions correctives plus nombreuses | P1 |
| Audit logs | `SyncActivityCenterV2` | audit logs, événements | voir logs, ouvrir source | composite keys corrigées | `7489b16` | couverture admin à compléter | P1 |
| Gestion du système | `GestionSystemeV2` | rôles, paramètres, utilisateurs | rôles, permissions, journal | actions admin tracées, rôles non-admin en lecture seule, reset protégé par confirmation | `18e6d78`, `0b68c15` | permissions serveur/Supabase à durcir | P0 |

## Audit parcours humain A à Z

Ce parcours complète l'audit module par module avec une simulation cohérente sur neuf jours, comme si un responsable utilisait Horizon Farm sur le terrain. Le scénario est couvert par `tests/e2e/full-human-erp-journey.spec.js`.

| Jour | Modules couverts | Données simulées | Résultat attendu | Résultat observé / correction |
|---|---|---|---|---|
| Jour 1 | Animaux, Avicole, Cultures, Stock, Fournisseurs, Équipements, RH | bovin `BOV-AZ-001`, lots chair/pondeuses, tomate, aliment, fournisseur, pompe, employée | les fiches de base existent avec statuts actifs et sources identifiables | test ajouté pour vérifier les bases et éviter les sources orphelines |
| Jour 2 | Stock, Avicole, Cultures, Finances, Documents, Traçabilité | alimentation 420 kg, ponte 300 œufs, traitement tomate 12 000 FCFA, facture | aliment décrémenté, tablettes calculées, dépense et preuve créées, trace ponte | test ajouté ; la règle document manquant/proof valide reste couverte par `09682a1` |
| Jour 3 | Stock, Santé, Équipements, Tâches, Alertes | stock sous seuil, vaccin bovin en retard, panne pompe | une seule alerte/tâche par problème, résolution du soin ferme le suivi lié | correction équipements/RH poussée dans `344e480` ; santé déjà couverte par `7489b16` |
| Jour 4 | Cultures, Stock, Ventes, Clients, Finances, Traçabilité | récolte 100 kg tomates, vente 40 kg avec acompte | stock récolte créé, stock vendu diminué, créance client 16 000, finance encaissée, trace vente | test ajouté ; cultures/stock déjà corrigés dans `908d3fe` et `65960b6` |
| Jour 5 | Animaux, Ventes, Finances, Documents, Traçabilité | bovin prêt à vendre puis vendu 420 000 FCFA | animal sort des actifs, facture créée, finance encaissée, trace sortie | opportunité animal et vente soldée couvertes par commits précédents |
| Jour 6 | Avicole, Ventes, Finances, Stock/Oeufs | vente 10 tablettes d'œufs payée | tablettes disponibles décrémentées, finance encaissée, client à jour si payé | test ajouté ; la déduplication opportunités avicoles reste couverte |
| Jour 7 | Fournisseurs, Stock, Finances, Documents | réception aliment, dette 60 000 puis paiement | dette fournisseur soldée, sortie finance, facture liée | correction `0dbaad1` vérifiée par test métier |
| Jour 8 | Rapports, Documents, Impact | dossier financeur généré, PDF historisé | rapport devient document exploitable avec preuves | test ajouté ; export PDF réel reste à auditer plus profondément |
| Jour 9 | Dashboard, Centre décisionnel, Impact, Sync, Audit logs | alertes ouvertes, tâches, cash, créance, traces | dashboard priorise urgences, sync sans orphelins, traces sensibles présentes | test ajouté ; actions correctives Sync restent P1 |

### Modules et actions couvertes par le parcours A à Z

| Module | Formulaires/boutons testés | Sections ouvertes | Données utilisées | Corrections faites | Commit associé | Restant |
|---|---|---|---|---|---|---|
| Dashboard | cartes urgences, cash, créances, tâches | urgences terrain, argent, production | stock critique, panne, ventes, client crédit | priorisation vérifiée par test | `286e618` | navigation carte par carte à enrichir |
| Animaux | prêt à vendre, sortie vente | fiche animal, historique | `BOV-AZ-001` | opportunité unique et sortie historique validées | `d381dee`, `344e480` | mort/perte sur données réelles |
| Avicole | ponte, vente œufs | ponte, lots actifs | `LOT-PONDEUSE-AZ`, 300 œufs | tablettes calculées et vendues | `4cd10ae` | décrément aliment réel côté stock |
| Santé | retard, résolution | suivi soin, tâches liées | vaccin bovin | tâche/alerte clôturées après résolution | `7489b16` | preuve santé systématique |
| Finances | entrée/sortie, paiement fournisseur, salaire | cash encaissé, créances | ventes, traitement, fournisseur, paie | cash sans créance impayée, sorties reliées | `d9ae417`, `344e480` | rapprochement bancaire |
| Fournisseurs | réception, dette, paiement | commande, dette, preuve | `FOU-ALIMENT-AZ` | réception -> stock/finance/document/trace | `0dbaad1` | relance fournisseur réelle |
| Documents | facture, rapport, justificatif | preuves fournies/manquantes | factures culture, vente, fournisseur, rapport | preuves manquantes séparées des preuves valides | `09682a1`, `344e480` | upload réel |
| Équipements | déclarer panne, clôturer maintenance | pannes, alertes, tâches | `EQ-POMPE-AZ` | panne crée tâche/alerte, résolution ferme alerte liée | `344e480` | coût réparation -> finance/document |
| RH | salaire payé | équipe, paie | `EMP-AWA` | paie crée sortie finance et document salaire à joindre | `344e480` | validation paie réelle |
| Sync / Audit logs | vérification orphelins, traces | anomalies, logs | ventes, documents, traces | test détecte ventes sans client et documents orphelins | `18e6d78` | actions correctives automatiques |

## Tests

- `npm install --no-audit --no-fund` : réussi avant synchronisation ; après reprise, `npm`/`npx` n’étaient plus disponibles dans le `PATH` Codex. Les bindings natifs optionnels macOS manquants ont été restaurés pour exécuter build/tests avec le binaire Node local.
- `npm run build` : équivalent exécuté avec `/Users/momofmarieme/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`, réussi. Avertissement uniquement sur gros chunks.
- `npx playwright install --with-deps chromium` : réussi avant synchronisation.
- `npx playwright test tests/e2e/user-smoke.spec.js --reporter=line` : réussi avec `E2E_LOGIN=penda`, `1 passed (1.4m)`.
- `npx playwright test tests/e2e/simulated-business-workflows.spec.js --reporter=line` : équivalent local Node réussi, `6 passed`.
- `npx playwright test tests/e2e/full-human-erp-journey.spec.js --reporter=line` : équivalent local Node réussi, `1 passed`.
- Erreurs console/page : aucun échec dans les tests métier simulés ; le premier smoke relancé sans variables a échoué uniquement sur `E2E_LOGIN/E2E_PASSWORD` manquants.

## Commits créés

- `18e6d78 test: stabiliser le parcours ui simule`
- `286e618 fix: fiabiliser dashboard et ventes`
- `4cd10ae fix: nettoyer les parcours avicoles simules`
- `7489b16 fix: stabiliser sante et ressources internes`
- `5cd14ad fix: aligner versions modules metier`
- `9886d57 chore: synchroniser package lock`
- `f09a24f Merge branch 'feature/objectifs-croissance-centre-decisionnel' of https://github.com/PENDATHIAW/horizon-farm into feature/objectifs-croissance-centre-decisionnel`
- `f23281a docs: ajouter audit ui fonctionnel simule`
- `76ec9eb docs: preciser resultats audit ui`
- `0dbaad1 fix: lier reception fournisseur stock et finance`
- `09682a1 fix: distinguer justificatifs manquants et preuves valides`
- `d9ae417 fix: exclure creances du cash encaisse`
- `cc5d061 docs: actualiser corrections metier finance fournisseurs`
- `0b68c15 fix: securiser actions gestion systeme`
- `344e480 fix: relier equipements et rh aux traces metier`
- `7acde88 test: couvrir parcours humain erp complet`

Push GitHub : les commits jusqu'à `7acde88` sont poussés sur `origin/feature/objectifs-croissance-centre-decisionnel` après configuration SSH.

## 10 problèmes restants les plus urgents

| Priorité | Module | Cause | Fichier probable | Correction recommandée |
|---|---|---|---|---|
| P0 | Gestion système | permissions UI durcies mais sécurité serveur à confirmer | `GestionSystemeV2.jsx`, Supabase policies | vérifier RBAC côté Supabase et journaliser toutes les mutations serveur |
| P1 | Ventes/Stock | sortie source encore à valider sur données réelles | `VentesV4.jsx`, `StocksV5.jsx` | transaction atomique vente -> stock/source/finance |
| P1 | Finances | rapprochement bancaire réel absent | `FinancesV12.jsx` | ajouter états banque/caisse et rapprochement par moyen de paiement |
| P1 | Documents/Comptabilité | justificatifs suivis mais upload/preuve réelle non forcés partout | `DocumentsV2.jsx`, `ComptabiliteV7.jsx` | imposer fichier/lien ou validation contrôle selon seuil montant |
| P1 | Traçabilité | actions admin/suppression pas toutes tracées | services CRUD | créer événement métier systématique |
| P2 | Fournisseurs | réception reliée, mais WhatsApp/facture réelle à valider | `FournisseursReadable.jsx` | distinguer message simulé, facture jointe et réception confirmée |
| P1 | Tâches | clôture auto partielle | `TachesV3.jsx`, `AlertesCenterV2.jsx` | relier chaque tâche à source résoluble |
| P2 | Smart Farm | simulation/réel parfois ambigu | `SmartFarm.jsx` | badge source et seuil par capteur |
| P2 | Rapports | PDF à revalider sur brouillon modifié | `RapportsV2.jsx` | test export avec contenu modifié |
| P2 | Assistant ERP | préremplissage fiche encore limité | `AssistantERPV2.jsx`, `AssistantPanel.jsx` | router intention -> formulaire prérempli avec confirmation |
