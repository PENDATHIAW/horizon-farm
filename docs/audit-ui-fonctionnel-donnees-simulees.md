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
| Animaux | `AnimauxV2` | animaux actifs, vendus, prêts, malades, historisés | espèces, fiche, formulaires ajout/modification, prêt à vendre | fiche animal complète, champs terrain ajoutés, historique de vie lisible | `d381dee`, `a6d23b4`, `ecb8048` | sortie mort/perte à tracer partout sur données réelles | P1 |
| Avicole | `AvicoleV10` | lots chair/pondeuses, œufs, mortalité, malades, vendus/sortis | lots, ponte, alimentation, opportunités, cycles | ramassage œufs débloqué, tablettes calculées, effectif actuel recalculé, cycles dédupliqués | `4941b16`, `4cd10ae`, `e51b139`, `1163fb7`, `5369273` | décrément stock aliment réel à auditer | P1 |
| Santé & Vaccins | `SanteV8` | soins en retard/réalisés | soin, report, statut, coût | retards synchronisés tâches/alertes, boucle useEffect corrigée | `0d73a27`, `55dbb08`, `7489b16` | documents de preuve à systématiser | P1 |
| Finances | `FinancesV12` | argent reçu, argent dépensé, reste à encaisser, reste à payer | ligne finance, dépense, paiement, preuve/facture | libellés terrain simplifiés, cash sans reste à encaisser, paiements liés pris en compte | `286e618`, `d9ae417`, `aeca008`, `8795c17` | rapprochement caisse/banque réel à ajouter | P2 |
| Comptabilité | `ComptabiliteV7` | lignes comptables, preuves/factures, reste à encaisser/payer | contrôle, preuve, export, vérification caisse/banque | vocabulaire terrain simplifié et rôle séparé de Finances | `18e6d78`, `9812ad2`, `ce0a66a` | verrouillage clôture réel | P2 |
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

## Module : Stock

- Sections testées : Pilotage stock, Stock courant, Inventaire, Alimentation liée au stock, Réapprovisionnement, Opportunités vente stock, Alimentation des animaux et lots, Évolution stock.
- Sections supprimées/fusionnées : aucune suppression ; les sections Flux stock et Mouvement stock restent séparées, mais les conséquences critiques sont maintenant centralisées pour éviter un bouton seulement décoratif.
- Boutons testés : Actualiser, Créer / réceptionner stock, Utiliser aliment, Rapport, Voir, Modifier, Réceptionner, Utiliser, Perte, Créer tâche, Clôturer tâche, Stock vendu, Plan alimentation.
- Boutons corrigés : Réceptionner/Utiliser/Perte déclenchent désormais la vérification sous seuil avec tâche, alerte et trace ; Perte crée aussi l’impact valeur en finance si un prix unitaire existe.
- Formulaires testés : création stock, modification stock, mouvement entrée, mouvement sortie, déclaration perte, utilisation alimentation liée, réapprovisionnement depuis stock critique.
- Champs présents : produit, catégorie, quantité, unité, seuil, stock cible, prix unitaire, fournisseur, réception prévue, dernière réception, emplacement, preuve/facture, notes.
- Champs ajoutés : motif du dernier mouvement et source liée dans le formulaire stock, pour éviter les entrées sans contexte terrain.
- Actions testées : entrée fournisseur 20 kg, sortie alimentation 7 kg, perte/casse 2 tablettes, passage sous seuil, création automatique du suivi critique.
- Conséquences métier vérifiées : entrée fournisseur augmente la quantité et crée une trace ; sortie alimentation décrémente le stock ; stock sous seuil crée tâche + alerte + événement métier dédupliqués ; perte stock crée trace et sortie finance de perte si la valeur peut être calculée ; l’historique de mouvement reste visible.
- Interconnexions vérifiées : Stock vers Alertes, Tâches, Finances, Traçabilité, Fournisseurs, Animaux/Avicole via alimentation, Ventes via opportunités.
- Bugs trouvés : un stock pouvait passer sous seuil sans tâche associée si l’utilisateur ne cliquait pas manuellement sur “Créer tâche” ; une perte était tracée en quantité mais ne matérialisait pas son impact valeur côté finance ; le formulaire ne demandait pas assez clairement motif/source du mouvement.
- Corrections faites : ajout d’un utilitaire métier `stockWorkflows`, création automatique de suivi critique sur création/modification/mouvement, déduplication par clé `stock_reorder:[id]`, impact finance des pertes, champs motif/source dans le formulaire.
- Tests ajoutés : stock critique crée alerte/tâche/trace, entrée fournisseur augmente le stock, sortie alimentation décrémente le stock, perte stock crée trace avec impact valeur, absence de valeurs techniques visibles dans les libellés Stock.
- Commit poussé : `ebb2db1 fix: completer parcours stock terrain`, `391ea1a test: couvrir parcours stock terrain`.
- Reste à faire : tester dans l’UI connectée une réception fournisseur avec facture réelle et vérifier la fermeture automatique des alertes stock après réapprovisionnement complet.

## Module : Avicole

- Sections testées : séparation Pondeuses/Poulets de chair, Pilotage avicole, Vue active, Où saisir les œufs, Objectif œufs/pondeuses, Lots actifs, Gestion avicole, Journal de ponte et charges, Journal de ramassage des œufs, Charges directes pondeuses, Cycle et historique, Évolution détaillée.
- Sections supprimées/fusionnées : aucune suppression ; les doublons métier du tableau cycles ont été corrigés par déduplication des lignes calculées.
- Boutons testés : Pondeuses, Poulets de chair, Stock alimentation, Ventes, Santé, Voir Centre décisionnel, Actualiser, Exporter, Ramassage œufs, Ajouter lot pondeuses, Voir, Modifier, Supprimer.
- Boutons corrigés : le flux Ramassage œufs ne bloque plus si la synchronisation stock/opportunité échoue après l’enregistrement de la ponte ; les boutons Stock/Ventes/Santé gardent une navigation métier claire.
- Formulaires testés : saisie de ramassage d’œufs, journal de ponte, lots pondeuses, actions lot Voir/Modifier, suivi cycles.
- Champs présents : lot, date, œufs produits, œufs cassés, œufs vendables, tablettes/plateaux, effectif initial, morts, malades, vendus/sortis, effectif actuel, statut, coût/charges, alimentation.
- Champs ajoutés : payload complet côté ramassage œufs avec `oeufs_produits`, `oeufs_vendables`, `tablettes`, `plateaux`, `oeufs_par_tablette`, `type_evenement`; affichage fiche lot enrichi avec effectif initial, morts, malades à surveiller, vendus/sortis, effectif calculé et effectif enregistré si différent.
- Actions testées : ramassage de 300 œufs, calcul 30 œufs = 1 tablette, recalcul effectif lot initial 100 / morts 5 / vendus 10 / malades 3, contrôle des cycles chair/pondeuses.
- Conséquences métier vérifiées : la production d’œufs reste enregistrée même si une synchronisation secondaire échoue ; les tablettes sont calculées sur les œufs vendables ; les malades restent dans l’effectif et apparaissent comme à surveiller ; les morts/vendus/sortis sortent de l’effectif actuel ; les pondeuses ne sont plus classées dans les ventes chair.
- Interconnexions vérifiées : Avicole vers Stock œufs/tablettes, opportunités de vente, Santé, Ventes, Centre décisionnel ; la synchronisation secondaire est non bloquante pour ne pas perdre la saisie terrain.
- Bugs trouvés : blocage apparent du ramassage d’œufs quand la synchro stock/opportunité échouait après création, effectif actuel dépendant de champs contradictoires, malades risquant d’être retirés de l’effectif, pondeuses classées comme poulets chair dans les cycles, doublons LOTCH dans les cycles, œufs du jour non comptés quand la donnée venait de `oeufs_produits`.
- Corrections faites : normalisation des logs ponte, payload compatible Supabase/production_oeufs_logs, synchro stock/opportunité non bloquante, règle unique `effectif actuel = effectif initial - morts - vendus - pertes/sorties`, affichage d’alerte si effectif enregistré différent du calculé, classification cycle chair après exclusion des pondeuses, déduplication des cycles, comptage œufs depuis `oeufs_produits`.
- Tests ajoutés : `ramassage œufs normalisé ne bloque pas et calcule les tablettes`, `effectif actuel avicole exclut morts/vendus/sorties mais pas malades`, `cycles avicoles ne dupliquent pas les lots et ne classent pas les pondeuses en chair`.
- Commit poussé : `e51b139 fix: corriger blocage ramassage oeufs`, `1163fb7 fix: recalculer cycles avicoles`, `5369273 test: couvrir incoherences terrain avicole`.
- Reste à faire : revalider en données Supabase réelles que la sortie stock aliment est décrémentée automatiquement à chaque alimentation et ajouter un test navigateur complet si l’environnement de login de test est disponible.

## Corrections terrain après test manuel utilisateur

| Bug observé | Cause trouvée | Correction faite | Fichiers modifiés | Commit | Test ajouté | Résultat attendu |
|---|---|---|---|---|---|---|
| Ramassage d’œufs bloqué | l’écriture de production pouvait réussir mais la synchronisation stock/opportunité secondaire faisait échouer le parcours utilisateur | payload de ponte complété et synchronisation secondaire rendue non bloquante | `src/modules/AvicoleV10.jsx`, `src/modules/AvicoleJournalsBridge.jsx`, `src/utils/normalize.js` | `e51b139` | `ramassage œufs normalisé ne bloque pas et calcule les tablettes` | 300 œufs saisis créent 10 tablettes sans bloquer |
| Effectif actuel incohérent | plusieurs champs concurrents (`current_count`, `effectif_actuel`, `mortality`, `vendus`, `sorties`) étaient utilisés sans règle unique | règle unique de calcul et affichage de l’écart enregistré/calculé | `src/utils/avicoleMetrics.js`, `src/utils/normalize.js`, `src/modules/AvicoleBase.jsx`, `src/components/AvicoleLotDetailsModal.jsx` | `e51b139` | `effectif actuel avicole exclut morts/vendus/sorties mais pas malades` | initial 100 - morts 5 - vendus 10 = 85 ; 3 malades restent à surveiller |
| Cycles avicoles dupliqués ou mal classés | les pondeuses pouvaient être détectées comme chair si le libellé contenait poulet, et les retards apparaissaient deux fois | exclusion des pondeuses avant classification chair et déduplication des cycles affichés | `src/services/productionCycleDates.js`, `src/modules/AvicoleCycleHealthPanel.jsx` | `1163fb7` | `cycles avicoles ne dupliquent pas les lots et ne classent pas les pondeuses en chair` | les lots pondeuses restent dans réforme/ponte, les lots chair dans vente chair |
| Œufs du jour à zéro malgré des logs | le tableau de pilotage ne lisait pas `oeufs_produits` | compteur d’œufs unifié sur tous les alias de production | `src/modules/AvicoleCycleHealthPanel.jsx` | `1163fb7` | couvert par le test ramassage œufs | le pilotage compte les œufs produits du jour |
| Stock critique sans tâche immédiate | la création tâche/alerte dépendait surtout du bouton manuel de réapprovisionnement | suivi critique automatique après création, modification et mouvement stock | `src/modules/StocksV3.jsx`, `src/utils/stockWorkflows.js` | `ebb2db1` | `stock critique crée une alerte, une tâche et une trace liées` | un stock sous seuil crée une tâche, une alerte et une trace dédupliquées |
| Perte stock sans impact valeur clair | la perte était surtout un événement quantité | perte reliée à une sortie finance si prix unitaire disponible et trace enrichie en montant | `src/modules/StocksV3.jsx`, `src/utils/stockWorkflows.js` | `ebb2db1` | `perte stock crée une trace avec impact valeur` | une casse/perte affiche quantité, valeur perdue et lien finance |

## Module : Animaux

- Sections testées : Cheptel par espèce, Pilotage santé/cycle animal, Vue active, Objectif espèce, Suivi quotidien, Abattage/transformation/stock, Frais liés à un animal, Cycle et historique, Évolution.
- Sections supprimées/fusionnées : aucune suppression ; la fiche détail a été restructurée pour éviter de disperser identité, poids, coûts, documents et historique dans plusieurs zones peu lisibles.
- Boutons testés : Bovin/Ovin/Caprin, Actualiser, Exporter, Ajouter animal, filtres Actifs/Prêts vente/Pesées en retard/Vendus/À surveiller, Voir, Modifier, Supprimer.
- Boutons corrigés : Voir ouvre maintenant une fiche réellement complète ; Modifier permet de saisir les champs terrain principaux manquants.
- Formulaires testés : Ajouter animal, Modifier animal, détail fiche, historique pesées, photo/document, statut présence/vente, santé, localisation.
- Champs présents : ID animal, N° boucle, QR/scan, nom/repère, espèce, sexe, date entrée, poids entrée, poids actuel, poids cible, dernière pesée, prix achat, prix vente estimé, santé, statut, notes.
- Champs ajoutés : race, date naissance/âge, origine/vendeur, localisation/enclos, photo animal, documents/preuves, notes terrain visibles, documents sérialisés en `documents` et `pieces_jointes`.
- Actions testées : création animal complet, modification fiche, ajout pesée, affichage coûts, statut prêt à vendre, animal verrouillé vendu/mort/perdu, consultation historique.
- Conséquences métier vérifiées : animal prêt à vendre garde l’opportunité vente existante sans doublon ; animal vendu/mort/perdu/sorti n’est plus dans les actifs mais reste dans historique ; soins, alimentation, ventes, paiements et événements liés sont regroupés dans l’historique de vie.
- Interconnexions vérifiées : Animaux vers Santé, Alimentation/Stock, Ventes, Paiements, Finances, Documents, Traçabilité/Centre décisionnel via événements métier.
- Bugs trouvés : fiche détail insuffisante pour comprendre toute la vie de l’animal, champs race/naissance/origine/localisation/documents absents des formulaires, valeurs manquantes pouvant rester peu explicites, historique de vie limité aux pesées.
- Corrections faites : ajout de libellés “Non renseigné”, identité complète dans la fiche, coûts avec achat/alimentation/soins/coût cumulé/valeur estimée, documents/photos visibles, historique de vie fusionnant pesées, santé, alimentation, ventes et événements métier.
- Tests ajoutés : `fiche animal complète affiche les champs terrain importants`.
- Commit poussé : `a6d23b4 fix: completer fiches animaux`, `ecb8048 test: couvrir fiche animal complete`.
- Reste à faire : tester dans le navigateur connecté la saisie photo réelle Supabase Storage et étendre la traçabilité automatique des sorties mort/perte/vol sur tous les chemins de formulaire.

## Module : Finances

- Sections testées : Trésorerie, BP KPI, Contrôle argent et preuves, Argent/dépenses/rentabilité, Rémunération propriétaire, Lignes finance manuelles, Évolution financière.
- Sections supprimées/fusionnées : aucune suppression ; les libellés comptables ont été simplifiés pour éviter la confusion avec Comptabilité.
- Boutons testés : Actualiser, Exporter, Ajouter argent reçu/dépensé, Voir, Modifier, Supprimer, Ouvrir documents, Ouvrir comptabilité, Ouvrir finances.
- Boutons corrigés : Ajouter produit/charge devient Ajouter argent reçu/dépensé ; Créer l’écriture devient Enregistrer la ligne finance.
- Formulaires testés : Hey Horizon finance, ajout ligne finance, modification ligne finance, preuve/facture, catégorie, module lié, caisse/banque.
- Champs présents : type, montant, date, libellé simple, statut paiement, catégorie, module lié, fiche liée, client, fournisseur, moyen paiement, preuve/facture, caisse/banque.
- Champs ajoutés : aucun champ structurel nouveau ; les champs existants ont été renommés côté UI pour être compréhensibles sans vocabulaire comptable.
- Actions testées : vente de 100 000 FCFA avec paiement lié de 40 000 FCFA, dépense fournisseur ouverte de 15 000 FCFA, vérification argent reçu/reste à encaisser/reste à payer.
- Conséquences métier vérifiées : le reste à encaisser ne s’ajoute pas à l’argent reçu ; les paiements liés à une vente diminuent le reste à encaisser même si la commande ne recopie pas encore `montant_paye` ; les lignes sans preuve/facture restent signalées.
- Interconnexions vérifiées : Ventes/Paiements vers Finances, Fournisseurs vers reste à payer, Documents vers preuve/facture, Comptabilité vers contrôle.
- Bugs trouvés : termes trop techniques visibles (`écriture`, `créance`, `dette`, `justificatif`), reste à encaisser potentiellement trop haut quand un paiement lié existe seulement dans `payments`, message cash trop comptable.
- Corrections faites : création de `computeFinanceCash`, prise en compte des paiements liés par commande, libellés remplacés par Argent reçu/Argent dépensé/Reste à encaisser/Reste à payer/Preuve-facture/Caisse-banque, messages d’alerte simplifiés.
- Tests ajoutés : `finance ne compte pas le reste à encaisser comme argent reçu`.
- Commit poussé : `aeca008 fix: simplifier finances et calcul cash`, `8795c17 test: couvrir cash finance terrain`.
- Reste à faire : ajouter un vrai écran de vérification caisse/banque et tester la preuve/facture avec upload réel.

## Module : Comptabilité

- Sections testées : Lignes comptables automatiques, Lecture simplifiée des lignes comptables, Contrôle argent et preuves, Contrôle comptable, Lecture comptable simplifiée, Lignes comptables, Évolution comptable.
- Sections supprimées/fusionnées : aucune suppression ; le rôle du module est clarifié pour éviter le doublon avec Finances.
- Boutons testés : Ventes, Finances, Documents, Ouvrir documents, Ouvrir comptabilité, Ouvrir finances.
- Boutons corrigés : les boutons restent de navigation métier ; aucun bouton décoratif ajouté.
- Formulaires testés : module principalement de contrôle ; les saisies manuelles restent dans les lignes finance/ComptabiliteV5 existantes.
- Champs présents : source, argent/reste, vente/dépense, montant, sens métier, preuves/factures, reste à encaisser, reste à payer, vérification caisse/banque.
- Champs ajoutés : aucun champ structurel ; libellés simplifiés pour preuve/facture et vérification caisse/banque.
- Actions testées : contrôle de ligne sans preuve, vente partiellement payée, reste à payer fournisseur, navigation vers Documents/Finances/Ventes.
- Conséquences métier vérifiées : Comptabilité ne recompte pas le cash opérationnel ; elle signale les preuves manquantes, le reste à encaisser, le reste à payer et les vérifications à faire.
- Interconnexions vérifiées : Finances, Ventes, Paiements, Documents, Fournisseurs.
- Bugs trouvés : vocabulaire trop comptable visible (`écriture`, `débit/crédit`, `créances`, `dettes`, `justificatifs`) sans traduction terrain ; confusion possible avec le pilotage Finances.
- Corrections faites : remplacement par lignes comptables, argent/reste, vente/dépense, preuve/facture, reste à encaisser, reste à payer, vérification caisse/banque ; messages de rôle clarifiés.
- Tests ajoutés : `comptabilité reste centrée sur preuves et contrôle sans jargon inutile`.
- Commit poussé : `9812ad2 fix: simplifier comptabilite terrain`, `ce0a66a test: couvrir vocabulaire comptabilite`.
- Reste à faire : implémenter une clôture de période réelle avec verrouillage et export comptable signé.

## Tests

- `npm install --no-audit --no-fund` : réussi avant synchronisation ; après reprise, `npm`/`npx` n’étaient plus disponibles dans le `PATH` Codex. Les bindings natifs optionnels macOS manquants ont été restaurés pour exécuter build/tests avec le binaire Node local.
- `npm run build` : équivalent exécuté avec `/Users/momofmarieme/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`, réussi. Avertissement uniquement sur gros chunks.
- `npx playwright install --with-deps chromium` : réussi avant synchronisation.
- `npx playwright test tests/e2e/user-smoke.spec.js --reporter=line` : réussi avec `E2E_LOGIN=penda`, `1 passed (1.4m)`.
- `npx playwright test tests/e2e/simulated-business-workflows.spec.js --reporter=line` : équivalent local Node réussi après corrections Stock, Avicole, Animaux, Finances, Comptabilité, `16 passed`.
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
- `e51b139 fix: corriger blocage ramassage oeufs`
- `1163fb7 fix: recalculer cycles avicoles`
- `5369273 test: couvrir incoherences terrain avicole`
- `47c2266 docs: documenter corrections terrain avicole`
- `a6d23b4 fix: completer fiches animaux`
- `ecb8048 test: couvrir fiche animal complete`
- `21d14bd docs: documenter corrections terrain animaux`
- `aeca008 fix: simplifier finances et calcul cash`
- `8795c17 test: couvrir cash finance terrain`
- `d5ee20a docs: documenter corrections terrain finances`
- `9812ad2 fix: simplifier comptabilite terrain`
- `ce0a66a test: couvrir vocabulaire comptabilite`
- `ebb2db1 fix: completer parcours stock terrain`
- `391ea1a test: couvrir parcours stock terrain`

Push GitHub : les commits jusqu'à `ce0a66a` sont poussés sur `origin/feature/objectifs-croissance-centre-decisionnel` après configuration SSH.

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
