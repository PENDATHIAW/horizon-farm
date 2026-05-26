# Audit UI fonctionnel Horizon Farm avec données simulées

Branche auditée : `feature/objectifs-croissance-centre-decisionnel`

## Résumé exécutif

- Ce qui marche : la branche expose les versions métier demandées, avec `SanteV8`, `CulturesV5`, `InvestissementsV9`, `StocksV5` et la chaîne ventes `VentesV3 -> VentesV5 -> VentesV6 -> VentesV4`. Les tests métier simulés valident les cas animaux prêts à vendre, avicole, récoltes, ventes soldées, clients payés et santé en retard.
- Ce qui a été corrigé : opportunités animaux/avicole, récoltes cultures synchronisées stock/ventes, ventes soldées protégées, créances clients recalculées, retards santé liés aux tâches/alertes, déduplication alertes, mouvements stock tracés, routage des versions métier, stabilisation UI/tests.
- Ce qui reste bloquant : le push GitHub depuis cette session est bloqué par authentification HTTPS (`could not read Username`). Les commits sont prêts localement sur la bonne branche, mais le remote HTTPS demande une authentification non disponible dans cette session.
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
| Finances | `FinancesV12` | entrées, sorties, créances | écriture, dépense, paiement | build/smoke, finance reliée ventes | `286e618` | anti double comptage à renforcer | P1 |
| Comptabilité | `ComptabiliteV7` | écritures, justificatifs | contrôle, preuve, export | module audité en smoke | `18e6d78` | verrouillage clôture réel | P2 |
| Investissements | `InvestissementsV9` | BP Horizon Farm, charges, revenus | onglets BP, amortissements, contrôle | routage V9 et BP visible | `f06aea4`, `e956a37` | transformation actif à sécuriser | P1 |
| Impact & Valeur | `ImpactBusiness` | production, revenus, preuves | dossier financeur, liens rapports | séparation avec Rapports vérifiée | `18e6d78` | score financeur à sourcer davantage | P2 |
| Stock | `StocksV5` via `StocksV4` | intrants, œufs, récoltes, seuils | mouvements, réception, perte | mouvements tracés sur variation quantité | `2931a85`, `65960b6` | unités multi-produits à normaliser | P1 |
| Clients | `ClientsReadable` / `ClientsV2` | clients avec/sans dette | relance, historique, paiements | statut recalculé depuis créance réelle | `fd486d9`, `2a21447` | suppression client à verrouiller | P1 |
| Ventes | `VentesV3 -> V5 -> V6 -> V4` | ventes simples, partielles, soldées | nouvelle vente, traiter, encaisser, facture | ventes soldées protégées, totaux fiabilisés | `1551d2c`, `7950b24`, `286e618` | livraison/source stock à tester en réel | P1 |
| Fournisseurs | `FournisseursReadable` | dettes, réceptions, paiements | commander, payer, réception | smoke métier | `18e6d78` | réception+dette+finance à verrouiller | P1 |
| Traçabilité | `TracabiliteV2` | événements métier | filtres, source, export | traces stock/santé/ventes enrichies | `2931a85`, `0d73a27` | suppression/action admin à tracer | P1 |
| Alertes | `AlertesCenterV2` | alertes nouvelles/résolues | résoudre, ignorer, transformer tâche | déduplication et clôture tâches liées | `624f89e`, `f05ea39` | WhatsApp simulé à isoler du réel | P2 |
| Cultures | `CulturesV5` | parcelles, récoltes, pertes | récolte, intrants, opportunité | récolte synchronisée stock et vente | `5496389`, `908d3fe` | météo encore décorative partiellement | P2 |
| Documents | `DocumentsV2` | factures, preuves manquantes | créer preuve, lier document | audit preuves importantes | `18e6d78` | upload réel et statut vérifié à compléter | P2 |
| Tâches | `TachesV3` | tâches retard/en cours/terminées | créer, terminer, reporter | santé/alertes liées aux tâches | `0d73a27`, `624f89e` | clôture auto inter-modules à étendre | P1 |
| RH & Équipe | `RHV2` | employés, salaires, rôles | présence, salaire, assignation | smoke module | `18e6d78` | paie vers finance à contrôler | P2 |
| Rapports | `RapportsV2` | rapports, dossier financeur | générer/exporter/préparer | séparation Impact/Rapports | `18e6d78` | PDF sur brouillon modifié à tester | P2 |
| Équipements | `EquipementsV2` | pannes, maintenances, coûts | panne, maintenance, réparation | smoke module | `18e6d78`, `7489b16` | panne -> finance/document à renforcer | P2 |
| Smart Farm | `SmartFarm` | capteurs, météo, seuils | capteur, caméra, alerte | smoke module | `18e6d78` | simulation/réel à marquer partout | P2 |
| Activité & Sync ERP | `SyncActivityCenterV2` | anomalies, logs, sync | rafraîchir, corriger, ouvrir source | centre QA métier audité | `18e6d78` | actions correctives plus nombreuses | P1 |
| Audit logs | `SyncActivityCenterV2` | audit logs, événements | voir logs, ouvrir source | composite keys corrigées | `7489b16` | couverture admin à compléter | P1 |
| Gestion du système | `GestionSystemeV2` | rôles, paramètres, utilisateurs | rôles, permissions, journal | smoke module | `18e6d78` | permissions serveur/Supabase à durcir | P0 |

## Tests

- `npm install --no-audit --no-fund` : réussi avant synchronisation ; après reprise, `npm`/`npx` n’étaient plus disponibles dans le `PATH` Codex. Les bindings natifs optionnels macOS manquants ont été restaurés pour exécuter build/tests avec le binaire Node local.
- `npm run build` : équivalent exécuté avec `node node_modules/vite/bin/vite.js build`, réussi. Avertissement uniquement sur gros chunks.
- `npx playwright install --with-deps chromium` : réussi avant synchronisation.
- `npx playwright test tests/e2e/user-smoke.spec.js --reporter=line` : réussi avec `E2E_LOGIN=penda`, `1 passed (1.4m)`.
- `npx playwright test tests/e2e/simulated-business-workflows.spec.js --reporter=line` : réussi, `6 passed`.
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

Push GitHub : tenté deux fois avec `git push origin feature/objectifs-croissance-centre-decisionnel`, bloqué par `fatal: could not read Username for 'https://github.com': Device not configured`.

## 10 problèmes restants les plus urgents

| Priorité | Module | Cause | Fichier probable | Correction recommandée |
|---|---|---|---|---|
| P0 | Gestion système | permissions UI potentiellement décoratives | `GestionSystemeV2.jsx`, Supabase policies | vérifier RBAC côté serveur et masquer actions selon rôle |
| P1 | Ventes/Stock | sortie source encore à valider sur données réelles | `VentesV4.jsx`, `StocksV5.jsx` | transaction atomique vente -> stock/source/finance |
| P1 | Finances | risque double comptage ventes/paiements | `FinancesV12.jsx` | déduplication par source métier |
| P1 | Documents/Comptabilité | justificatifs pas obligatoires partout | `DocumentsV2.jsx`, `ComptabiliteV7.jsx` | bloquer/alerter selon seuil montant |
| P1 | Traçabilité | actions admin/suppression pas toutes tracées | services CRUD | créer événement métier systématique |
| P1 | Fournisseurs | réception, dette et paiement à verrouiller | `FournisseursReadable.jsx` | workflow unique réception -> stock -> dette/finance |
| P1 | Tâches | clôture auto partielle | `TachesV3.jsx`, `AlertesCenterV2.jsx` | relier chaque tâche à source résoluble |
| P2 | Smart Farm | simulation/réel parfois ambigu | `SmartFarm.jsx` | badge source et seuil par capteur |
| P2 | Rapports | PDF à revalider sur brouillon modifié | `RapportsV2.jsx` | test export avec contenu modifié |
| P2 | Assistant ERP | préremplissage fiche encore limité | `AssistantERPV2.jsx`, `AssistantPanel.jsx` | router intention -> formulaire prérempli avec confirmation |
