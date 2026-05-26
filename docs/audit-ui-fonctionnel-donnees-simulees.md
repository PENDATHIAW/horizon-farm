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
| Accueil | `DashboardV2` | ventes, paiements, santé, stock, tâches, alertes, documents, capteurs, météo | cartes, actions rapides, navigation urgences | priorités du jour regroupées par argent/terrain/stock/santé/administratif/Smart Farm et routées vers les bons modules | `286e618`, `f75fa52` | vérifier le rendu exact en données réelles Supabase après activation du mode données simulées UI | P2 |
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
| Dashboard | cartes urgences, cash, créances, tâches, documents, Smart Farm | urgences terrain, argent, stock, santé, administratif | stock critique, panne, ventes, client crédit, preuve manquante, capteur hors service | priorisation vérifiée par test et cartes routées vers modules sources | `286e618`, `f75fa52` | valider le rendu connecté avec vraies données Supabase |
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

## Module : Santé & Vaccins

- Sections testées : Pilotage sanitaire, Soins et vaccins, Nouvelle intervention sanitaire, Historique unifié, Contrôle santé, Évolution santé.
- Sections supprimées/fusionnées : aucune suppression ; la logique de suivi retard/réalisation a été extraite pour éviter les règles dupliquées entre SanteV8 et les tests.
- Boutons testés : Valider intervention, Valider fait, Ajouter vétérinaire, Recherche réelle, Carte, WhatsApp, Voir, Modifier, Supprimer, Réessayer bloc santé.
- Boutons corrigés : Valider fait évite de recréer une dépense finance si un lien finance existe déjà ; Valider intervention crée des tâches futures reliées à la fiche santé ; l’utilisation de stock santé sous seuil déclenche aussi tâche/alerte/trace.
- Formulaires testés : vaccination, traitement curatif, déparasitage, visite vétérinaire, biosécurité, urgence sanitaire, preuve photo/ordonnance, nouveau vétérinaire.
- Champs présents : type intervention, cible animal/lot/groupe, produit, médicament, dose, dosage, voie, stock utilisé, quantité, coût, date prévue/effectuée, statut, statut santé après, périodicité, prochaine échéance, vétérinaire, impact business, preuve, notes.
- Champs ajoutés : pas de nouveau champ visible majeur ; les tâches/proofs générés reçoivent maintenant `source_record_id`, `task_dedupe_key`, `status` et `verification_status` pour rester exploitables dans Tâches/Documents.
- Actions testées : soin en retard, soin réalisé, coût santé, preuve ordonnance, consommation stock santé, rappel futur.
- Conséquences métier vérifiées : soin en retard -> tâche + alerte + trace ; soin réalisé -> tâches/alertes liées clôturées ; coût santé -> sortie finance non doublonnée ; preuve santé -> document fourni à vérifier ; stock santé sous seuil après soin -> tâche + alerte + trace Stock ; prochaine échéance -> tâche liée.
- Interconnexions vérifiées : Santé vers Tâches, Alertes, Finances, Documents, Stock, Animaux, Avicole, Traçabilité/business events.
- Bugs trouvés : les règles retard/réalisation étaient locales à SanteV8 donc difficiles à tester ; les tâches futures de rappel pouvaient être peu liées à la fiche source ; une preuve santé était créée sans statut documentaire clair ; un stock santé consommé sous seuil créait surtout une alerte mais pas toujours une tâche.
- Corrections faites : ajout de `healthWorkflows`, génération testable des tâches/alertes santé, coût santé dédupliqué par `linked_finance_transaction_id`, documents santé marqués `fourni` et `a_verifier`, suivi critique du stock santé après consommation.
- Tests ajoutés : soin en retard crée tâche/alerte liées, coût santé crée dépense non doublonnée, preuve santé devient document fourni à vérifier.
- Commit poussé : `9a60e9c fix: completer parcours sante terrain`, `737b770 test: couvrir parcours sante terrain`.
- Reste à faire : tester en navigateur connecté l’upload photo réel et la clôture automatique d’une alerte santé déjà existante dans Supabase.

## Module : Ventes

- Sections testées : Caisse ventes, Vente préparée Hey Horizon, Nouvelle vente guidée, Ventes à traiter, Suivi des ventes, Contrôle qualité ventes.
- Sections supprimées/fusionnées : aucune suppression ; la chaîne active `VentesV3 -> VentesV5 -> VentesV6 -> VentesV4` est conservée.
- Boutons testés : Nouvelle vente, Créer vente + facture, Modifier, Traiter, Encaisser, Livrer, Facture, Clôturer, Livrée, Valider, Continuer, Retour.
- Boutons corrigés : Encaisser plafonne maintenant le montant réellement reçu au reste à payer avant de créer paiement et finance ; Facture crée aussi un document ; Hey Horizon applique les impacts source.
- Formulaires testés : vente guidée produit/client/paiement/livraison/facture, vente Hey Horizon, action vente modifier/encaisser/livrer/facturer/clôturer.
- Champs présents : client, produit/source, quantité, unité, prix unitaire, total, montant reçu, reste à payer, statut paiement, statut livraison, facture, source vendue, notes.
- Champs ajoutés : aucun champ visible majeur ; ajout d’un utilitaire métier `salesWorkflows` pour rendre testables les règles de paiement et d’impact source.
- Actions testées : vente stock, vente animal, encaissement trop élevé, facture/document, source vendue depuis Hey Horizon.
- Conséquences métier vérifiées : vente payée -> paiement + finance ; encaissement trop élevé -> bloqué/plafonné au reste ; facture -> invoice + document ; vente stock -> quantité décrémentée ; vente animal -> animal vendu/sorti actif ; vente lot/culture restent couverts par la même fonction d’impact source.
- Interconnexions vérifiées : Ventes vers Finances, Paiements, Documents, Stock, Animaux, Lots avicoles, Cultures, Traçabilité/business events.
- Bugs trouvés : la modale d’encaissement plafonnait le paiement via VentesV6 mais créait encore une ligne finance avec le montant saisi brut ; la facture d’action rapide ne créait pas toujours le document ; la vente Hey Horizon ne décrémentait pas clairement la source vendue.
- Corrections faites : `capSalePayment` appliqué avant paiement/finance, création document facture dans action rapide et Hey Horizon, `buildSaleSourcePatch` appliqué aux ventes Hey Horizon pour stock/animal/lot/culture.
- Tests ajoutés : vente plafonne un encaissement trop élevé, vente stock décrémente la source vendue, vente animal sort l’animal des actifs.
- Commit poussé : `4dade40 fix: completer parcours ventes terrain`, `bc31433 test: couvrir parcours ventes terrain`.
- Reste à faire : tester en navigateur connecté la vente lot avicole/tablettes et la vente culture avec données Supabase réelles pour confirmer toutes les colonnes disponibles.

## Module : Clients

- Sections testées : Santé commerciale clients, preuves commerciales, Clients & Fidélisation, Segmentation & fidélisation, Évolution clients, Automatisations WhatsApp, fiches clients.
- Sections supprimées/fusionnées : aucune suppression ; le calcul client a été centralisé pour éviter des statuts différents selon les sections.
- Boutons testés : Nouveau client, Modifier, Fiche, Relancer, WhatsApp, Appeler, Itinéraire, Exporter, filtres segment, supprimer.
- Boutons corrigés : Relancer crée maintenant tâche + alerte + trace métier liées ; Supprimer bloque un client qui a déjà des ventes ; Fiche lit un résumé complet sans planter sur les paiements.
- Formulaires testés : ajout client, modification client, fiche détail client, relance client.
- Champs présents : nom, téléphone, WhatsApp, email, adresse, type, statut, préférences, historique achats, notes.
- Champs ajoutés : type client, contact principal, conditions paiement, plafond crédit, délai paiement ; résumé fiche avec paiements client et dernière commande.
- Actions testées : client payé, client crédit, relance, suppression liée à une vente, ouverture fiche avec paiement.
- Conséquences métier vérifiées : vente crédit -> client à relancer ; paiement complet -> client à jour ; relance -> WhatsApp préparé + tâche + alerte + trace ; client lié à des ventes -> suppression bloquée pour garder l’historique.
- Interconnexions vérifiées : Clients vers Ventes, Paiements, Finances, Documents commerciaux, Tâches, Alertes, Traçabilité/business events.
- Bugs trouvés : calcul client pas toujours rattaché aux ventes par libellé client ; relance sans trace métier ; suppression possible d’un client avec historique vente ; formulaire client trop pauvre pour le crédit terrain ; fiche détail fragile si le résumé ne contenait pas paiements/dernière commande.
- Corrections faites : ajout de `clientWorkflows`, statut calculé depuis ventes/paiements, relance sourcée et dédupliquée, suppression protégée, champs paiement/crédit ajoutés, résumé fiche stabilisé.
- Tests ajoutés : client crédit/payant, fiche avec paiements et dernière commande, relance tâche/alerte/trace, suppression liée bloquée.
- Commit poussé : `5dc1292 fix: completer parcours clients terrain`, `33e8dfe test: couvrir parcours clients terrain`, `4621b58 fix: stabiliser fiche client terrain`.
- Reste à faire : tester en navigateur connecté la fermeture automatique d’une relance quand le paiement est saisi depuis Ventes/Finances.

## Module : Fournisseurs

- Sections testées : Risque & dépendance fournisseurs, achats à préparer, dettes fournisseurs à suivre, fiches fournisseurs, évolution fournisseurs, documents commerciaux fournisseur.
- Sections supprimées/fusionnées : aucune suppression ; la logique réception/dette/paiement a été extraite dans `supplierWorkflows` pour éviter les règles dispersées entre la fiche et le pont Stock.
- Boutons testés : Nouveau fournisseur, Commander, Réceptionner, Payer, WhatsApp, Fiche, Modifier, Supprimer, Recherche réelle, Exporter.
- Boutons corrigés : Réceptionner crée maintenant stock + dette + facture manquante + trace ; Payer solde les dettes sans double compter la réception en cash ; WhatsApp est marqué comme message simulé/préparé.
- Formulaires testés : ajout fournisseur, modification fournisseur, préparation commande stock critique, réception stock, paiement fournisseur, suivi dette, facture/preuve à joindre.
- Champs présents : nom, contact, téléphone, WhatsApp, email, catégorie, dettes, livraisons, note, adresse, produits liés, documents, historique achats.
- Champs ajoutés : flux réception avec `cash_effect: false`, `is_supplier_accrual`, `reste_a_payer`, facture `preuve_manquante`, paiement `payment_for: supplier_debt`, preuve paiement manquante.
- Actions testées : réception aliment fournisseur, paiement dette, facture fournisseur manquante, relance dette fournisseur, message WhatsApp simulé.
- Conséquences métier vérifiées : réception -> stock augmenté + dette fournisseur + facture manquante + trace ; paiement -> sortie finance cash + dette soldée + preuve paiement à fournir ; dette en retard -> tâche + alerte liées ; WhatsApp -> log simulé.
- Interconnexions vérifiées : Fournisseurs vers Stock, Finances, Documents, Tâches, Alertes, Traçabilité/business events, WhatsApp logs.
- Bugs trouvés : la réception fournisseur pouvait devenir une sortie finance payée puis le paiement réel ajoutait une deuxième sortie ; les preuves de paiement/facture pouvaient être considérées comme documents sans statut de preuve manquante ; la relance dette n’avait pas de clé de déduplication testable ; WhatsApp préparé n’était pas clairement simulé.
- Corrections faites : ajout de `supplierWorkflows`, séparation dette fournisseur et cash dépensé, règlement fournisseur sans double comptage, facture/preuve manquante explicite, suivi dette task/alerte dédupliqué, log WhatsApp marqué simulé.
- Tests ajoutés : réception fournisseur crée stock/dette/facture manquante, paiement fournisseur solde sans double compter, retard paiement fournisseur crée tâche/alerte.
- Commit poussé : `b38ae48 fix: completer parcours fournisseurs terrain`, `394cbf8 test: couvrir parcours fournisseurs terrain`.
- Reste à faire : tester en navigateur connecté l’upload réel d’une facture fournisseur et la clôture automatique d’une alerte fournisseur déjà créée.

## Module : Documents

- Sections testées : Contrôle documentaire, Justificatifs à compléter, Documents reliés, Bibliothèque documentaire, historique des documents, filtres catégorie/module.
- Sections supprimées/fusionnées : aucune suppression ; le rôle “preuve manquante” a été clarifié sans retirer la bibliothèque existante.
- Boutons testés : Ajouter document, Créer fiche preuve, Modifier, Supprimer, Ouvrir fichier, Actualiser, Ventes, Finances, Dossier financeur.
- Boutons corrigés : Créer fiche preuve génère aussi tâche + alerte liées ; une fiche preuve sans fichier reste manquante et ne valide pas la dépense.
- Formulaires testés : ajout document, modification document, création de fiche preuve depuis transaction, liaison module/entité.
- Champs présents : titre, catégorie, fichier/image, type fichier, module lié, entité liée, référence libre, notes.
- Champs ajoutés : montant concerné, date du document, statut preuve, statut normalisé, `verification_status`.
- Actions testées : document financier manquant, document fourni avec fichier, document lié à animal, dépense importante sans preuve, preuve fournisseur manquante.
- Conséquences métier vérifiées : dépense sans preuve -> fiche document + tâche + alerte ; document manquant ne compte pas comme preuve ; fichier fourni -> preuve à vérifier ; module/entité liés restent visibles dans la bibliothèque.
- Interconnexions vérifiées : Documents vers Finances, Comptabilité, Ventes, Fournisseurs, Santé, Animaux, Tâches, Alertes.
- Bugs trouvés : un document avec titre/catégorie mais sans fichier pouvait être considéré comme preuve valide ; les fiches preuve créées depuis une transaction ne créaient pas d’action à faire ; le formulaire ne demandait pas montant/date/statut de preuve.
- Corrections faites : ajout de `documentWorkflows`, statuts `manquant`/`preuve_manquante`, champs montant/date/statut, génération tâche+alerte pour preuve manquante, règle de preuve comptable renforcée.
- Tests ajoutés : document manquant ne compte pas comme preuve, dépense importante sans preuve crée tâche/alerte, document lié conserve module source et statut lisible.
- Commit poussé : `5abb335 fix: completer parcours documents terrain`, `e9796cb test: couvrir parcours documents terrain`.
- Reste à faire : tester upload réel Supabase Storage et téléchargement/export dans le navigateur connecté.

## Module : Tâches

- Sections testées : Fiche préparée Hey Horizon, Routines ferme, Actions & traçabilité, Actions à faire maintenant, Liste des tâches, Cohérence tâches/alertes.
- Sections supprimées/fusionnées : aucune suppression ; la logique de liaison alerte/tâche est centralisée dans `taskWorkflows`.
- Boutons testés : Créer tâche, Planifier routine, Terminer, Créer tâche depuis alerte, Ajouter tâche, Modifier, Supprimer, Ouvrir tâches/alertes/traçabilité/sync.
- Boutons corrigés : Créer tâche depuis alerte génère une tâche dédupliquée et source ; Terminer clôture l’alerte liée et trace l’action ; Hey Horizon ne crée plus de checklist générique inutile.
- Formulaires testés : création tâche libre, routine ferme, tâche Hey Horizon, modification tâche, tâche issue alerte.
- Champs présents : action/titre, module lié, responsable, échéance, heure, fréquence, priorité, statut, fiche liée, checklist, notes.
- Champs ajoutés : pas de champ visible majeur ; enrichissement interne `task_dedupe_key`, `alert_dedupe_key`, `source_record_id`, `completed_at`, `linked_alert_id`.
- Actions testées : alerte stock transformée en tâche, tâche terminée, alerte clôturée, checklist nettoyée, routine planifiée.
- Conséquences métier vérifiées : alerte -> tâche liée ; tâche terminée -> alerte traitée + événement métier ; checklist ne répète pas le titre ; tâches en retard restent visibles dans les priorités.
- Interconnexions vérifiées : Tâches vers Alertes, Documents, Santé, Stock, Fournisseurs, Équipements, Traçabilité/business events, RH via responsables.
- Bugs trouvés : checklist pouvant répéter le titre ou rester “À faire/Vérifier/Clôturer” ; logique tâche/alerte dupliquée et difficile à tester ; clôture alerte pas assez robuste si la tâche portait `alert_id`/`linked_alert_id`.
- Corrections faites : ajout de `taskWorkflows`, normalisation des checklists, création tâche depuis alerte avec clés de déduplication, clôture tâche + alerte + trace.
- Tests ajoutés : alerte crée tâche liée sans doublon checklist, tâche terminée clôture alerte liée et trace action, checklist ne duplique pas titre/étapes génériques.
- Commit poussé : `cb5589e fix: completer parcours taches terrain`, `c4a8016 test: couvrir parcours taches terrain`.
- Reste à faire : valider dans le navigateur connecté l’assignation à un employé RH réel et la fermeture automatique d’une tâche quand la source métier est résolue hors module Tâches.

## Module : Alertes

- Sections testées : Alertes à transformer en tâches, Actions & traçabilité, Centre d’alertes, filtres urgence/statut/espace, configuration WhatsApp.
- Sections supprimées/fusionnées : aucune suppression ; le pont alerte -> tâche réutilise maintenant les règles Tâches pour éviter les doublons.
- Boutons testés : Nouvelle alerte, Créer tâche, Marquer lu, Traiter, WhatsApp, Voir action, Supprimer, Actualiser, Configuration.
- Boutons corrigés : Créer tâche depuis alerte utilise une clé de déduplication source ; Traiter/terminer respecte les statuts fermés ; WhatsApp reste une préparation simulée/journalisée.
- Formulaires testés : nouvelle alerte, alerte avec cible module/entité, création tâche demandée, configuration destinataire WhatsApp.
- Champs présents : titre, message, module concerné, cible, gravité, statut, action recommandée, responsable, créer tâche.
- Champs ajoutés : pas de champ visible majeur ; ajout utilitaire `alertWorkflows` pour déduplication, statut fermé et conservation de l’alerte ouverte récente.
- Actions testées : alerte stock transformée en tâche, alerte ignorée/fermée, doublon même source, WhatsApp simulé, ouverture module source.
- Conséquences métier vérifiées : même source -> une seule alerte active ; alerte -> tâche liée sans checklist générique ; alerte ignorée/résolue -> sortie du flux ouvert ; WhatsApp -> préparation sous contrôle humain.
- Interconnexions vérifiées : Alertes vers Tâches, Dashboard, Stock, Santé, Fournisseurs, Documents, Smart Farm, Traçabilité/business events.
- Bugs trouvés : le panneau alerte->tâche vérifiait surtout `source_record_id`/`alert_id` et pouvait ignorer les clés de déduplication ; les modules disponibles dans l’ancien schéma d’alerte étaient incomplets ; statut ignoré non couvert dans les règles testables.
- Corrections faites : ajout de `alertWorkflows`, pont alerte/tâche aligné avec `taskWorkflows`, modules alerte enrichis, tests de déduplication et statut ignoré.
- Tests ajoutés : alertes même source dédupliquées en gardant l’ouverte récente, alerte ignorée considérée fermée.
- Commit poussé : `732eac7 fix: completer parcours alertes terrain`, `5a2c0ed test: couvrir parcours alertes terrain`.
- Reste à faire : tester en navigateur connecté la préparation WhatsApp avec un vrai numéro propriétaire configuré.

## Module : Cultures

- Sections testées : Pilotage cultures, Intrants & météo, Gestion des cultures, Actions par onglet, Cultures, Parcelles, Campagnes, Performance, Cycle et historique, Évolution cultures.
- Sections supprimées/fusionnées : aucune suppression ; les règles récolte/stock/opportunité sont centralisées dans `cultureWorkflows` pour éviter les doublons métier.
- Boutons testés : Nouvelle culture, Ajouter récolte, Utiliser intrant, Déclarer perte, Confirmer vendable, Ouvrir stock, Ouvrir Smart Farm, Voir, Modifier, Supprimer, Exporter, Actualiser.
- Boutons corrigés : Utiliser intrant décrémente maintenant le stock source ; Déclarer perte réduit le disponible et trace la valeur perdue ; Ajouter récolte crée stock et opportunité sans doublonner.
- Formulaires testés : nouvelle culture, modification culture, récolte, sortie intrant, perte/sinistre, parcelle, campagne, performance.
- Champs présents : culture, parcelle, campagne, surface, semis, récolte prévue, quantité récoltée, quantité disponible, unité, prix unitaire, coûts, statut, météo/risque, notes.
- Champs ajoutés : formulaires action terrain pour intrant stock, quantité utilisée, motif/date ; perte avec quantité, valeur unitaire, cause/date.
- Actions testées : récolte tomate 120 kg, intrant engrais 12 kg, perte oignons 25 kg, risque météo critique, confirmation opportunité vendable.
- Conséquences métier vérifiées : récolte -> stock + opportunité + trace ; intrant -> stock décrémenté + coût culture + trace ; perte -> disponible réduit + valeur perdue + trace ; risque météo -> tâche + alerte liées.
- Interconnexions vérifiées : Cultures vers Stock, Opportunités/Ventes, Smart Farm météo, Tâches, Alertes, Documents/événements métier, Finances via coût de culture.
- Bugs trouvés : les actions intrant/perte étaient trop dispersées ou absentes du flux principal ; le helper de récolte était enfermé dans le composant et difficile à tester ; météo/risque n’avait pas de règle métier testable.
- Corrections faites : ajout de `cultureWorkflows`, branchement du parcours récolte existant sur helper testable, ajout des actions Utiliser intrant et Déclarer perte dans l’UI, propagation stock/culture/trace.
- Tests ajoutés : récolte crée stock/opportunité/trace, intrant décrémente stock et coût culture, perte réduit disponible et trace valeur, risque météo crée tâche/alerte.
- Commit poussé : `470bc0f fix: completer parcours cultures terrain`, `afab3f6 test: couvrir parcours cultures terrain`.
- Reste à faire : valider en navigateur connecté que le mode données simulées affiche bien des intrants cultures dans le sélecteur et tester une vente de récolte de bout en bout avec stock réel.

## Module : Investissements

- Sections testées : BP Horizon Farm, Actions terrain, Prévu vs réel, Budget d’investissement, Charges récurrentes, Amortissements, Revenus, Contrôle qualité.
- Sections supprimées/fusionnées : aucun retour aux anciens blocs empilés ; la section Actions terrain est ajoutée comme point d’entrée utile et court.
- Boutons testés : Restaurer le BP, onglets, Marquer une dépense réalisée, Créer l’actif métier, Voir finances/Objectifs, contrôle qualité.
- Boutons corrigés : une ligne réalisée crée maintenant une sortie Finance, une preuve/facture et une trace ; la création d’actif est bloquée si un actif existe déjà.
- Formulaires testés : restauration BP, action paiement réel de ligne, génération preuve/facture, création actif avicole/animal/culture/équipement/stock selon libellé.
- Champs présents : poste, catégorie, quantité, prix unitaire, total prévu, montant réel, statut, financement, durée/amortissement, revenus/charges, preuve.
- Champs ajoutés : onglet Actions terrain avec lignes réalisables, statut `effectif`, `montant_reel`, transaction finance liée, preuve liée, actif métier lié.
- Actions testées : pompe irrigation payée 350 000 FCFA, preuve investissement manquante, poussins pondeuses transformés en lot avicole, anti-doublon actif.
- Conséquences métier vérifiées : investissement réalisé -> Finance + Documents + événement ; actif créé -> module métier + ligne BP verrouillée ; montant important -> preuve manquante à contrôler ; double clic -> pas de second actif.
- Interconnexions vérifiées : Investissements vers Finances, Documents, Avicole, Animaux, Cultures, Équipements, Stock, Business events, Comptabilité via preuves.
- Bugs trouvés : V9 affichait le BP mais le parcours terrain “payer puis créer actif” était trop discret/non actif dans la version considérée ; les preuves et sorties finance n’étaient pas garanties depuis l’action BP.
- Corrections faites : ajout de `investmentWorkflows`, onglet Actions terrain dans `InvestissementsV9`, callbacks App vers Documents/Équipements/Stock/Business events, tests de paiement et création actif.
- Tests ajoutés : investissement réalisé crée sortie finance/preuve/trace, investissement payé crée actif métier une seule fois.
- Commit poussé : `dfde19a fix: completer parcours investissements terrain`, `4e36fa1 test: couvrir parcours investissements terrain`.
- Reste à faire : valider sur données Supabase réelles la création équipement/stock depuis BP, et ajouter une confirmation forte avant paiement si plusieurs utilisateurs travaillent en parallèle.

## Module : Rapports

- Sections testées : dossier financeur, rapports automatiques, exports par module, programmation, historique, guide états financiers.
- Sections supprimées/fusionnées : aucune suppression ; Rapports reste centré sur production/export et ne reprend pas les tableaux Impact.
- Boutons testés : Générer hebdo, Générer mensuel, Programmer tâche, Exporter PDF, Excel, CSV, Générer dossier PDF, Programmer rapport, Actualiser.
- Boutons corrigés : génération de rapport conserve le brouillon modifié ; programmation crée une tâche de préparation ; document rapport reprend le contenu final.
- Formulaires testés : fiche rapport programmée, dossier financeur Hey Horizon, options financeur/BP/montant, rapport hebdo/mensuel automatique.
- Champs présents : titre, type rapport, période, canal, statut, résumé, recommandations, modules inclus via données, destinataire/financeur dans dossier.
- Champs ajoutés : `draft_content` conservé dans le rapport et le document ; tâche de préparation avec checklist Vérifier chiffres/Relire/Générer PDF/Joindre.
- Actions testées : rapport mensuel existant avec brouillon modifié, génération document, création tâche de programmation.
- Conséquences métier vérifiées : rapport généré -> document + événement ; brouillon modifié -> contenu document ; rapport programmé -> tâche à faire ; dossier financeur -> document + trace.
- Interconnexions vérifiées : Rapports vers Documents, Tâches, Business events, Finances, Ventes, Stock, Santé, Cultures, Investissements et Impact via données.
- Bugs trouvés : le contenu automatique pouvait remplacer un brouillon modifié lors de la génération ; “programmer” ne créait pas d’action terrain exploitable.
- Corrections faites : ajout de `reportWorkflows`, génération rapport via workflow, conservation du brouillon, bouton Programmer tâche et callbacks Tâches dans App.
- Tests ajoutés : rapport généré conserve le brouillon modifié dans le document, rapport programmé crée une tâche de préparation claire.
- Commit poussé : `26f4eb2 fix: completer parcours rapports terrain`, `eb7bc31 test: couvrir parcours rapports terrain`.
- Reste à faire : vérifier visuellement le PDF généré dans le navigateur et couvrir l’export PDF réel avec Playwright si l’environnement de téléchargement est disponible.

## Module : Impact & Valeur

- Sections testées : Impact à traiter maintenant, Préparation financeur, Valeur concrète, Dossier banque/partenaire, Domaines à renforcer, liens Rapports.
- Sections supprimées/fusionnées : aucune suppression ; Impact reste centré sur décision/valeur et délègue la production PDF à Rapports.
- Boutons testés : Créer tâche relance, Créer tâche stock, Créer tâche santé, Ouvrir source, Créer preuve à compléter, Générer le dossier dans Rapports, onglets Valeur concrète/Dossier banque/À mieux maîtriser.
- Boutons corrigés : les priorités Impact créent maintenant des tâches exploitables ; les risques forts créent aussi alerte + trace ; les preuves manquantes créent document + tâche + événement.
- Formulaires testés : création d’action impact depuis indicateur faible, création preuve financeur manquante, navigation vers source, navigation vers Rapports.
- Champs présents : indicateur, module source, source liée, priorité, statut, raison, preuve/facture, montant si disponible, score financeur, origine des chiffres.
- Champs ajoutés : clés `impact-action`, `impact-proof`, `impact-risk`, document `preuve_impact`, statut `preuve_manquante`, tâche source `impact_business`, trace métier liée.
- Actions testées : stock sous seuil transformé en tâche, preuve facture vente manquante transformée en document/tâche, risque santé critique transformé en tâche/alerte/trace.
- Conséquences métier vérifiées : indicateur faible -> tâche ; preuve manquante -> Documents + Tâches + Business events ; risque fort -> Alertes + Tâches + Business events ; dossier financeur -> Rapports.
- Interconnexions vérifiées : Impact vers Stock, Santé, Clients, Alertes, Tâches, Documents, Rapports, Business events.
- Bugs trouvés : Impact indiquait les priorités et le score financeur mais restait parfois au niveau constat, sans action terrain créée ; la preuve manquante pouvait être seulement informative.
- Corrections faites : ajout de `impactWorkflows`, boutons actionnables dans `ImpactBusiness`, callbacks App vers Tâches/Documents/Alertes/Business events, tests simulés.
- Tests ajoutés : indicateur impact faible crée une tâche actionnable, preuve manquante impact crée document/tâche/trace, risque impact fort crée alerte et tâche liées.
- Commit poussé : `6171e39 fix: completer parcours impact valeur terrain`.
- Reste à faire : valider en navigateur connecté le clic de chaque action avec le mode données simulées activé depuis Paramètres et vérifier l’absence de doublons si l’utilisateur clique deux fois très vite.

## Module : Équipements

- Sections testées : Actions terrain équipements, Parc matériel, Maintenance du matériel, Évolution du matériel, fiche préparée Hey Horizon.
- Sections supprimées/fusionnées : aucune suppression ; les actions rapides restent courtes et la réparation complète a été ajoutée sans retirer panne/maintenance/carburant.
- Boutons testés : Ajouter équipement, Déclarer panne, Programmer maintenance, Marquer réparé, Saisir carburant, Préparer maintenance, Clôturer, Voir, Modifier, Supprimer.
- Boutons corrigés : Marquer réparé clôture maintenant la tâche et l’alerte liées, remet l’équipement opérationnel, crée la sortie Finance et demande la preuve/facture.
- Formulaires testés : ajout équipement, modification équipement, panne, maintenance, réparation, carburant, action Hey Horizon.
- Champs présents : nom, type/catégorie, statut, date achat, valeur/coût achat, maintenance prévue, coût maintenance/réparation, carburant, notes.
- Champs ajoutés : coût réparation dans l’action rapide, preuve réparation manquante, statut `operationnel` après réparation, `last_repair_done_at`, lien tâche/alerte/finance/document.
- Actions testées : pompe irrigation en panne, tâche/alerte critique, réparation 45 000 FCFA, facture réparation à joindre, équipement remis en service.
- Conséquences métier vérifiées : panne -> tâche + alerte + trace ; réparation -> tâche clôturée + alerte résolue + finance sortie + document preuve manquante + trace ; carburant -> finance + coût équipement ; maintenance -> finance si coût.
- Interconnexions vérifiées : Équipements vers Tâches, Alertes, Finances, Documents, Business events, Smart Farm via capteurs hors service à traiter ensuite.
- Bugs trouvés : la déclaration de panne était bien actionnable, mais la réparation complète était trop dépendante de la section maintenance et ne garantissait pas preuve/finance/clôture depuis une action simple.
- Corrections faites : ajout de `equipmentWorkflows`, bouton Marquer réparé dans les actions rapides, passage des tâches/alertes/documents aux actions rapides, tests panne/réparation.
- Tests ajoutés : panne équipement crée tâche/alerte/trace, réparation équipement clôture tâche/alerte et crée finance/document.
- Commit poussé : `e96356a fix: completer parcours equipements terrain`.
- Reste à faire : valider en données simulées UI que les équipements Smart Farm hors service créent bien un suivi Équipements, et tester upload réel de la facture réparation.

## Module : RH & Équipe

- Sections testées : Santé ressources internes, Priorités RH, Rémunérations et avances, Coûts et rémunérations, Répertoire RH, Équipes et responsabilités.
- Sections supprimées/fusionnées : aucune suppression ; les priorités paie restent en haut et le répertoire conserve la gestion fine.
- Boutons testés : Ajouter RH, Nouvelle équipe, Payer, Absence, Assigner tâche, Modifier, Supprimer, Enregistrer, Actualiser.
- Boutons corrigés : Payer crée maintenant systématiquement Finance + preuve salaire à joindre + trace ; Absence crée un suivi et une tâche ; Assigner tâche crée une tâche visible côté Tâches.
- Formulaires testés : ajout/modification RH, rôle, équipe, modules, salaire, prime, avance, équipe, affectation module.
- Champs présents : nom, rôle, fonction, équipe, téléphone, WhatsApp, salaire mensuel, prime, avance, statut, modules, date entrée.
- Champs ajoutés : preuve salaire `preuve_manquante`, dernier paiement, transaction/document liés, dernière absence, raison absence, tâche RH assignée.
- Actions testées : paiement salaire net 85 000 FCFA, reçu salaire manquant, absence marché, tâche “Arroser parcelle tomates” assignée à une personne.
- Conséquences métier vérifiées : salaire payé -> Finance + Documents + Business events + avance remise à zéro ; absence -> tâche + trace ; tâche assignée -> Tâches + trace ; coûts RH restent ventilés par module.
- Interconnexions vérifiées : RH vers Finances, Documents, Tâches, Business events, Impact/Comptabilité via coûts et preuves.
- Bugs trouvés : deux chemins de paie existaient et l’un ne créait pas toujours la preuve salaire ; absence et assignation étaient visibles comme besoins métier mais pas actionnables depuis la fiche RH.
- Corrections faites : ajout de `rhWorkflows`, unification paie, document salaire manquant, actions Absence et Assigner tâche dans le répertoire, callbacks Tâches dans App.
- Tests ajoutés : salaire RH payé crée finance/preuve/trace, absence RH crée suivi terrain et tâche assignée, tâche RH assignée reste visible dans le module métier.
- Commit poussé : `0d9ff24 fix: completer parcours rh terrain`.
- Reste à faire : vérifier en UI connectée que la source RH en localStorage est bien synchronisée avec les futures tables Supabase RH si elles sont ajoutées.

## Module : Smart Farm

- Sections testées : Couverture par zone, Conseiller équipement, Signaux et sécurité terrain, Capteurs configurés, Caméras configurées, mesures détaillées, zones et timeline.
- Sections supprimées/fusionnées : aucune suppression ; les signaux terrain restent visibles en haut et les détails techniques restent repliés.
- Boutons testés : Synchroniser, Ajouter capteur, Ajouter caméra, Voir, Modifier, Supprimer, Créer action depuis signal.
- Boutons corrigés : Ajouter/Modifier capteur ou caméra crée maintenant automatiquement une tâche, une alerte et une trace si l’appareil est critique.
- Formulaires testés : ajout/modification capteur, ajout/modification caméra, détail capteur/caméra.
- Champs présents : nom, type, zone, localisation, statut, batterie, flux caméra, snapshot.
- Champs ajoutés : source simulation/réel, module lié, dernière mesure, seuil minimum, seuil maximum, notes terrain.
- Actions testées : capteur humidité serre à 92 avec seuil 85, caméra entrée hors ligne, capteur simulé, capteur réel.
- Conséquences métier vérifiées : capteur critique -> tâche + alerte + trace ; caméra hors ligne -> tâche + alerte ; badge simulation/réel visible ; les données simulées restent clairement marquées.
- Interconnexions vérifiées : Smart Farm vers Tâches, Alertes, Business events, Équipements/Cultures/Avicole/Stock par module lié.
- Bugs trouvés : les formulaires capteur/caméra étaient actionnables mais ne distinguaient pas assez simulation/réel et ne créaient pas toujours une conséquence métier au moment de l’enregistrement critique.
- Corrections faites : ajout de `smartFarmWorkflows`, champs seuil/source/module lié, badges lisibles, création automatique de suivi pour capteur/caméra critique.
- Tests ajoutés : capteur Smart Farm critique crée tâche/alerte/trace, Smart Farm distingue données simulées et données réelles, caméra hors ligne crée action terrain.
- Commit poussé : `d41cbd1 fix: completer parcours smart farm terrain`.
- Reste à faire : valider dans l’UI avec le bouton Paramètres -> données simulées que les seuils réels des capteurs terrain futurs correspondent aux unités installées.

## Module : Assistant ERP / Hey Horizon

- Sections testées : centre d’aide Hey Horizon, règles produit, exemples de commandes, panneau flottant, brouillon Horizon, champs modifiables, boutons Parler/Envoyer/Valider/Ouvrir formulaire.
- Sections supprimées/fusionnées : aucune suppression ; le module reste une aide simple, l’action réelle reste dans le panneau global Hey Horizon.
- Boutons testés : Ouvrir Hey Horizon, Parler, Envoyer, Valider, Annuler, Ouvrir fiche/formulaire, actions rapides Vente/Soin/Œufs/Stock/Tâche/Rapport.
- Boutons corrigés : validation et ouverture automatique acceptent maintenant récolte culture, facture fournisseur, fiche animal et stocks critiques.
- Formulaires testés : brouillon santé, ramassage œufs, récolte culture, panne équipement, facture fournisseur, recherche fiche animal, stocks critiques.
- Champs présents : module, cible, date, quantité, unité, fournisseur, culture, filtre, impacts, notes.
- Champs ajoutés : intention `culture_harvest`, `supplier_invoice`, `entity_lookup`, `stock_critical_lookup`, libellés simples dans le brouillon.
- Actions testées : “Créer une fiche de vaccination pour BOV002”, “J’ai ramassé 300 œufs”, “J’ai récolté 100 kg tomate”, “Déclarer panne pompe irrigation”, “Ajouter facture fournisseur aliments”, “Ouvre fiche BOV002”, “Montre les stocks critiques”.
- Conséquences métier vérifiées : chaque intention ouvre le bon module, prépare un brouillon validable et affiche les modules impactés avant action sensible.
- Interconnexions vérifiées : Assistant vers Santé, Avicole, Cultures, Équipements, Documents/Fournisseurs, Animaux, Stock, Tâches, Alertes, Traçabilité.
- Bugs trouvés : certaines commandes terrain étaient renvoyées vers une recherche générique ou un module trop large, notamment récolte culture, facture fournisseur, fiche animal et stocks critiques.
- Corrections faites : enrichissement de `aiIntentEngine`, auto-ouverture des nouveaux types de formulaire, libellés de brouillon, pont de recherche fiche animal dans Animaux.
- Tests ajoutés : Hey Horizon prépare les intentions terrain sans confondre les modules.
- Commit poussé : `06e2035 fix: completer assistant erp terrain`.
- Reste à faire : ajouter des handlers visuels dédiés côté Cultures/Documents pour afficher directement une carte préremplie comme Santé/Avicole/Animaux.

## Module : Centre décisionnel

- Sections testées : KPI santé décisionnelle, objectifs, créances, alertes, décisions prioritaires, opportunités de vente, cycles de production, alertes importantes, brouillons à valider.
- Sections supprimées/fusionnées : aucune suppression ; le centre reste volontairement court avec trois actions prioritaires.
- Boutons testés : Plan financier, Objectifs, Ventes, Voir détails et actions, Créer tâche, Business plan/Ouvrir action, Voir alertes, Ouvrir action, Ouvrir brouillon.
- Boutons corrigés : chaque recommandation prioritaire peut maintenant créer une tâche terrain sourcée et une trace métier.
- Formulaires testés : brouillon Horizon depuis recommandation, tâche créée depuis recommandation, action alertes importantes.
- Champs présents : titre, module/source, priorité, recommandation, score, couverture/écart, modules impactés.
- Champs ajoutés : clé de déduplication tâche `decision:module:id`, source module/source record, checklist de vérification, trace `decision_action_task_created`.
- Actions testées : recommandation stock `STK-ALIM-001`, création tâche, trace business event, ouverture du module source.
- Conséquences métier vérifiées : recommandation -> Tâches + Business events ; le module source reste ouvrable ; le brouillon reste soumis à validation humaine.
- Interconnexions vérifiées : Centre décisionnel vers Tâches, Business events, Objectifs, Ventes, Stock, Alertes, Assistant Hey Horizon.
- Bugs trouvés : les recommandations étaient utiles mais encore trop “lecture/brouillon”, sans bouton direct pour transformer une décision en action à faire.
- Corrections faites : ajout de `decisionCenterWorkflows`, bouton Créer tâche dans les cartes, callbacks App vers Tâches/Business events.
- Tests ajoutés : Centre décisionnel transforme une recommandation sourcée en tâche actionnable.
- Commit poussé : `89d0e75 fix: completer centre decisionnel terrain`.
- Reste à faire : ajouter une persistance “ignorer cette recommandation” si l’utilisateur veut masquer une décision pour la journée.

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
| Suivi santé partiellement orphelin | tâches futures, preuve et coût santé n’avaient pas toujours des clés source vérifiables | utilitaire santé commun, tâches/proofs sourcés, coût finance dédupliqué | `src/modules/SanteV6.jsx`, `src/modules/SanteV8.jsx`, `src/utils/healthWorkflows.js` | `9a60e9c` | `santé crée une tâche et une alerte liées pour un soin en retard`, `coût santé crée une dépense finance non doublonnée`, `preuve santé devient un document fourni à vérifier` | un soin retard/fait/coût/preuve reste relié à Santé, Tâches, Alertes, Finance et Documents |
| Encaissement vente trop élevé côté Finance | le paiement était plafonné, mais la ligne finance utilisait encore le montant saisi brut | plafonnement appliqué avant création paiement et finance | `src/modules/VentesV4.jsx`, `src/utils/salesWorkflows.js` | `4dade40` | `vente plafonne un encaissement trop élevé au reste à payer` | une vente avec 40 000 FCFA restants ne peut créer que 40 000 FCFA d’encaissement |
| Facture ou source vendue incomplète depuis action rapide | les factures rapides ne créaient pas toujours de document et Hey Horizon ne décrémentait pas la source vendue | document facture créé et patch source appliqué pour stock/animal/lot/culture | `src/modules/VentesV4.jsx`, `src/utils/salesWorkflows.js` | `4dade40` | `vente stock décrémente la source vendue`, `vente animal sort l’animal des actifs` | facture visible dans Documents, source vendue mise à jour |
| Statut client obsolète ou suppression dangereuse | les ventes pouvaient être reliées par libellé et la suppression ne vérifiait pas l’historique | calcul client centralisé, suppression bloquée si vente liée, relance tracée, fiche stabilisée | `src/modules/Clients.jsx`, `src/modules/ClientsV2.jsx`, `src/utils/clientWorkflows.js` | `5dc1292`, `4621b58` | `client crédit passe à relancer et client payé reste à jour`, `fiche client conserve paiements et dernière commande lisibles`, `relance client crée tâche, alerte et trace liées`, `suppression client liée à une vente est bloquée` | un client payé est à jour, un client crédit est à relancer, l’historique vente est protégé |
| Paiement fournisseur double compté | la réception fournisseur pouvait être transformée en sortie payée puis le paiement réel ajoutait une nouvelle sortie cash | réception enregistrée comme dette sans effet caisse, paiement séparé comme sortie cash, dette soldée par lien règlement | `src/modules/Fournisseurs.jsx`, `src/modules/FournisseursStockBridge.jsx`, `src/utils/supplierSettlement.js`, `src/utils/supplierWorkflows.js` | `b38ae48` | `réception fournisseur crée stock, dette et facture manquante`, `paiement fournisseur solde la dette sans double compter la réception`, `retard paiement fournisseur crée tâche et alerte liées` | stock augmente, dette existe, paiement solde sans double dépense, facture/preuve reste visible |
| Document manquant compté comme preuve | la preuve comptable vérifiait surtout le lien et le titre/catégorie, pas toujours le statut de vérification | statuts `manquant`/`preuve_manquante` exclus des preuves valides, fiche preuve crée tâche/alerte | `src/modules/DocumentsV2.jsx`, `src/utils/accountingProof.js`, `src/utils/documentForms.js`, `src/utils/documentWorkflows.js` | `5abb335` | `document manquant ne compte pas comme preuve valide`, `dépense importante sans preuve crée tâche et alerte document`, `document lié conserve module source et statut preuve lisible` | une dépense reste à compléter tant que le fichier/preuve n’est pas fourni |
| Tâches liées aux alertes fragiles | la création/clôture de tâche depuis alerte avait des clés différentes et les checklists pouvaient être génériques | workflow tâche centralisé, checklist nettoyée, clôture alerte liée et trace métier | `src/modules/TachesV2.jsx`, `src/modules/TachesV3.jsx`, `src/utils/taskForms.js`, `src/utils/taskWorkflows.js` | `cb5589e` | `alerte crée une tâche liée sans doublon de checklist`, `tâche terminée clôture alerte liée et trace action`, `checklist tâche ne duplique pas le titre ni les étapes génériques` | une alerte produit une seule tâche utile, et la fin de tâche ferme l’alerte source |
| Alertes doublonnées ou mal reliées aux tâches | le pont Alertes ne réutilisait pas toutes les clés source/déduplication des tâches | déduplication d’alertes par source et création tâche via `taskWorkflows` | `src/modules/AlertTaskBridgePanel.jsx`, `src/modules/AlertesCenter.jsx`, `src/utils/alertWorkflows.js`, `src/utils/constants.js` | `732eac7` | `alertes même source sont dédupliquées en gardant l’ouverte récente`, `alerte ignorée est considérée fermée` | une alerte source reste unique et actionnable, les fermées/ignorées sortent du flux ouvert |
| Cultures sans sortie intrant/perte intégrée | la récolte créait déjà des liens, mais intrants, pertes et météo n’avaient pas de workflow central testable | ajout de `cultureWorkflows`, actions Utiliser intrant et Déclarer perte, trace métier et tests simulés | `src/modules/CulturesV3.jsx`, `src/modules/CulturesV5.jsx`, `src/modules/CulturesTabActionsBridge.jsx`, `src/utils/cultureWorkflows.js` | `470bc0f` | `intrant culture décrémente le stock et augmente le coût culture`, `perte culture réduit le disponible et crée une trace de valeur`, `risque météo culture propose une tâche et une alerte liées` | récolte/intrant/perte/météo provoquent stock, coût, opportunité, tâche/alerte ou trace selon le cas |
| Investissement payé sans actif réel visible | le BP V9 était lisible mais le passage paiement -> finance/preuve -> actif métier n’était pas assez actionnable | ajout d’un onglet Actions terrain et d’un workflow investissement réalisé/actif lié | `src/modules/InvestissementsV9.jsx`, `src/utils/investmentWorkflows.js`, `src/App.jsx` | `dfde19a` | `investissement réalisé crée sortie finance, preuve et trace BP`, `investissement payé crée un actif métier une seule fois` | une ligne BP payée crée sortie Finance, preuve/facture, trace puis actif métier sans doublon |
| Rapport généré écrasant le brouillon | la génération utilisait surtout le résumé automatique et ne créait pas d’action terrain pour un rapport programmé | workflow rapport qui conserve le brouillon et bouton Programmer tâche | `src/modules/RapportsAutoBridge.jsx`, `src/modules/Rapports.jsx`, `src/utils/reportWorkflows.js`, `src/App.jsx` | `26f4eb2` | `rapport généré conserve le brouillon modifié dans le document`, `rapport programmé crée une tâche de préparation claire` | un brouillon relu reste dans le document, un rapport programmé crée une tâche exploitable |
| Impact seulement informatif | les priorités, preuves manquantes et risques étaient visibles mais ne créaient pas toujours d’action terrain | workflow Impact pour tâche, preuve, alerte et trace ; boutons actionnables depuis les cartes | `src/modules/ImpactBusiness.jsx`, `src/utils/impactWorkflows.js`, `src/App.jsx` | `6171e39` | `indicateur impact faible crée une tâche actionnable`, `preuve manquante impact crée document, tâche et trace`, `risque impact fort crée alerte et tâche liées` | Impact crée une action réelle et garde Rapports comme module d’export/dossier |
| Réparation équipement incomplète | la panne créait un suivi mais la remise en service simple ne garantissait pas clôture tâche/alerte, finance et preuve | workflow réparation avec équipement opérationnel, tâche terminée, alerte résolue, sortie finance et document preuve manquante | `src/modules/EquipementsQuickActionsBridge.jsx`, `src/modules/Equipements.jsx`, `src/utils/equipmentWorkflows.js` | `e96356a` | `panne équipement crée tâche, alerte et trace liées`, `réparation équipement clôture tâche/alerte et crée finance/document` | une pompe réparée revient opérationnelle et laisse preuve/facture à joindre |
| Paie RH sans preuve selon le chemin | la carte prioritaire créait une preuve mais le répertoire RH pouvait payer surtout Finance/trace | workflow RH unique pour salaire, preuve manquante, trace et mise à jour personne ; actions absence/tâche ajoutées | `src/modules/RH.jsx`, `src/modules/RHPeopleTeams.jsx`, `src/utils/rhWorkflows.js`, `src/App.jsx` | `0d9ff24` | `salaire RH payé crée finance, preuve salaire et trace`, `absence RH crée suivi terrain et tâche assignée`, `tâche RH assignée reste visible dans le module métier` | RH devient un centre d’action : paie, absence et tâche ont des conséquences visibles |
| Smart Farm sans conséquence à l’enregistrement critique | les signaux existaient mais un appareil ajouté/modifié critique ne déclenchait pas toujours immédiatement tâche/alerte/trace | workflow Smart Farm pour capteur/caméra critique, badges source simulation/réel, seuils de mesure dans le formulaire | `src/modules/SmartFarm.jsx`, `src/utils/constants.js`, `src/utils/smartFarmWorkflows.js` | `d41cbd1` | `capteur Smart Farm critique crée tâche, alerte et trace`, `Smart Farm distingue données simulées et données réelles`, `caméra Smart Farm hors ligne crée une action terrain` | un capteur ou une caméra critique ouvre une action terrain sans ambiguïté simulation/réel |
| Hey Horizon trop générique sur certaines phrases terrain | l’interpréteur ne distinguait pas récolte, facture fournisseur, ouverture de fiche animal et stocks critiques | nouvelles intentions dédiées et auto-ouverture de brouillons validables | `src/services/aiIntentEngine.js`, `src/components/AssistantPanel.jsx`, `src/components/HorizonDraftPanel.jsx`, `src/modules/AnimauxV2.jsx` | `06e2035` | `Hey Horizon prépare les intentions terrain sans confondre les modules` | l’assistant prépare le bon module/formulaire au lieu de seulement chercher ou naviguer |
| Centre décisionnel sans passage direct à l’action | les recommandations ouvraient surtout un brouillon ou un module, mais ne créaient pas une tâche terrain immédiatement exploitable | ajout d’un workflow décision -> tâche + trace et bouton Créer tâche sur les cartes prioritaires | `src/modules/CentreIA.jsx`, `src/modules/DecisionRecommendationCardCompact.jsx`, `src/utils/decisionCenterWorkflows.js`, `src/App.jsx` | `89d0e75` | `Centre décisionnel transforme une recommandation sourcée en tâche actionnable` | une recommandation stock/santé/production devient une tâche sourcée et traçable |
| Objectifs sans plan d’action direct | les écarts objectif/réel étaient lisibles mais restaient trop statiques et ne créaient pas d’action terrain liée au module source | ajout du panneau Plans d’action objectifs, statut atteint/en retard/en cours, création tâche + trace métier et KPI BP alimentés depuis `dataMap` | `src/modules/ObjectifsCroissanceV2.jsx`, `src/utils/objectivesWorkflows.js`, `src/App.jsx` | `a8969b7` | `Objectifs & Croissance marque atteint et crée une action si objectif en retard` | un objectif en retard crée une tâche sourcée vers Avicole/Animaux/Cultures/Stock/Finances ; un objectif atteint est affiché comme tel |
| Traçabilité sans contrôle de source | certains faits avaient un module ou un titre mais pas toujours une source ouvrable, et l’export n’était pas assez direct | normalisation des faits, panneau qualité des traces, badge source à compléter, export CSV et routage source fiable | `src/modules/Tracabilite.jsx`, `src/modules/TracabiliteV2.jsx`, `src/utils/traceabilityWorkflows.js` | `48fed4c` | `Traçabilité source les actions sensibles et ouvre le bon module` | vente, paiement, soin, récolte et action admin sont identifiables ; les faits orphelins sont signalés |
| Activité & Sync trop technique | les anomalies étaient détectées mais les libellés/actions restaient parfois trop “audit” et l’ouverture source n’était pas directe | libellés terrain, route source, tâche de correction standardisée, preuve/facture au lieu de justificatif, journal renommé | `src/modules/SyncActivityCenter.jsx`, `src/modules/AuditLogs.jsx`, `src/utils/syncAuditWorkflows.js` | `4250fda` | `Activité & Sync détecte les incohérences et propose une action terrain` | paiement orphelin, document lié cassé et opportunité obsolète deviennent des actions compréhensibles |
| Gestion système avec actions sensibles trop faciles | le retrait utilisateur n’avait pas de confirmation explicite et la zone d’effacement local n’était pas reliée au rôle admin | confirmation retrait, blocage reset hors admin, bannière RBAC/Supabase, utilitaire de permissions/audit testable | `src/modules/GestionSysteme.jsx`, `src/modules/GestionSystemeV2.jsx`, `src/modules/SystemDataResetPanel.jsx`, `src/utils/systemAccessWorkflows.js` | `f8caa6c` | `Gestion système protège les actions admin et trace les changements` | un visiteur reste en lecture seule, un admin trace ses actions, le reset exige Super Admin + EFFACER |
| Dashboard qui ne voyait pas tout le terrain du jour | l’accueil ne recevait pas les documents/capteurs/caméras et les priorités étaient calculées directement dans le composant | utilitaire `dashboardWorkflows`, documents/capteurs/caméras transmis depuis `App.jsx`, catégories simples et carte Smart Farm/météo | `src/App.jsx`, `src/modules/DashboardV2.jsx`, `src/utils/dashboardWorkflows.js` | `f75fa52` | `Dashboard priorise les urgences terrain et ouvre les bons modules` | l’accueil ouvre Ventes, Alertes, Stock, Santé, Smart Farm, Tâches ou Documents selon la vraie urgence simulée |

## Module : Gestion système

- Sections testées : Sécurité des accès, Ressources internes, Utilisateurs & visiteurs, Qui voit quoi, formulaire accès, Zone sensible effacement local.
- Sections supprimées/fusionnées : aucune suppression ; ajout d’une bannière RBAC pour éviter la fausse sécurité locale.
- Boutons testés : Qui voit quoi, Créer utilisateur, Modifier, Retirer, Enregistrer, Fermer, Supprimer sans rapport, Créer rapport puis supprimer.
- Boutons corrigés : Retirer exige maintenant confirmation explicite ; effacement local est bloqué si le rôle n’est pas Super Admin.
- Formulaires testés : créer/inviter utilisateur, modifier rôle, statut, espaces visibles, actions autorisées, notes, confirmation `EFFACER`.
- Champs présents : nom, email, équipe/périmètre, rôle, statut, espaces visibles, actions autorisées, notes, confirmation action sensible.
- Champs ajoutés : aucun champ persistant nouveau ; ajout de validation/lecture seule et événement d’audit standardisé.
- Actions testées : rôle visiteur, rôle admin, retrait utilisateur, protection dernier admin, confirmation reset, trace audit admin.
- Conséquences métier vérifiées : action admin -> audit log + événement métier ; rôle non-admin -> lecture seule ; reset -> confirmation forte ; dernier admin protégé.
- Interconnexions vérifiées : AuthContext/Supabase profiles, Audit logs, Business events, Gestion système, Sync/Traçabilité.
- Bugs trouvés : reset local accessible sans condition de rôle, retrait utilisateur sans confirmation, utilitaire de permissions trop dépendant du contexte React/Supabase.
- Corrections faites : ajout `systemAccessWorkflows`, confirmation retrait, `canManageSystem` transmis au reset, bannière RBAC/Supabase, utilitaire autonome pour tests.
- Tests ajoutés : `Gestion système protège les actions admin et trace les changements`.
- Commit poussé : `f8caa6c fix: completer gestion systeme terrain`.
- Reste à faire : vérifier et documenter les politiques RLS Supabase en production ; l’UI guide les droits mais ne remplace pas la sécurité serveur.

## Module : Activité & Sync ERP / Audit logs

- Sections testées : Actions & traçabilité, Vérifications importantes, Synchronisation, Activité récente, Journal activité & sécurité, actions en attente, contrôle offline.
- Sections supprimées/fusionnées : aucune suppression ; libellés simplifiés pour éviter une lecture trop technique.
- Boutons testés : Synchroniser, Backup, Vider file offline, Simuler hors ligne, Actualiser, Mettre à jour la vente, Fermer l’opportunité, Créer preuve/facture, Créer une tâche, Créer une alerte, Ouvrir source, Masquer, Réafficher.
- Boutons corrigés : Ouvrir source ajouté sur chaque anomalie ; les actions “justificatif/tâche/alerte” ont été renommées en actions terrain.
- Formulaires testés : création indirecte de preuve/facture, tâche, alerte et trace de réparation depuis anomalie.
- Champs présents : sujet, espace, élément, lien, détail, priorité, source, action corrective, statut sync, file offline.
- Champs ajoutés : route source, titre lisible d’anomalie, action terrain standardisée, `action_key` de tâche Sync.
- Actions testées : paiement sans vente liée, document lié à une fiche introuvable, opportunité déjà vendue encore ouverte, création tâche corrective.
- Conséquences métier vérifiées : anomalie -> action corrective possible ou tâche/alerte/preuve ; action -> événement métier `audit_interconnexion_repare`; source ouvrable.
- Interconnexions vérifiées : Ventes, Paiements, Documents, Opportunités, Finance, Stock, Tâches, Alertes, Traçabilité, Audit logs.
- Bugs trouvés : libellés trop techniques, “Créer justificatif” moins clair que preuve/facture, pas de bouton direct pour ouvrir la source, action corrective tâche non standardisée.
- Corrections faites : ajout de `syncAuditWorkflows`, libellés lisibles, routage source, tâche corrective, titre Journal activité & sécurité.
- Tests ajoutés : `Activité & Sync détecte les incohérences et propose une action terrain`.
- Commit poussé : `4250fda fix: completer sync audit terrain`.
- Reste à faire : ajouter des réparations atomiques serveur pour corriger plusieurs lignes liées en une seule transaction Supabase.

## Module : Traçabilité

- Sections testées : Actions & traçabilité, Qualité des traces, Faits critiques récents, filtres par élément/importance/espace, liste des faits, anciennes données détectées, ajout manuel.
- Sections supprimées/fusionnées : aucune suppression ; ajout d’une section qualité pour éviter de noyer l’utilisateur dans des faits impossibles à exploiter.
- Boutons testés : Actualiser, Exporter, Ajouter un fait, Ouvrir source, Voir document, Voir paiement, Voir vente, Ouvrir tâches, Ouvrir alertes, Ouvrir sync.
- Boutons corrigés : Ouvrir source utilise maintenant une table de routage métier (`sales_orders` -> Ventes, `stocks` -> Stock, `gestion_systeme` -> Gestion système) ; Exporter génère un CSV filtré.
- Formulaires testés : Ajouter un fait important.
- Champs présents : référence, type de fait, espace concerné, élément concerné, référence élément, titre, description, montant, date, importance.
- Champs ajoutés : source normalisée, badge source à compléter, route source, indicateur `has_source`.
- Actions testées : trace de vente, soin, paiement orphelin, action admin sensible, export des faits filtrés, ouverture source.
- Conséquences métier vérifiées : les actions sensibles sont comptées, les traces sans source sont signalées, les traces sourcées peuvent revenir au module source.
- Interconnexions vérifiées : Ventes, Finances, Santé, Documents, Tâches, Alertes, Stock, Cultures, Gestion système, Sync.
- Bugs trouvés : faits sans source non visibles comme problème, action `system_user_deleted` non classée sensible, export absent de l’en-tête.
- Corrections faites : ajout de `traceabilityWorkflows`, panneau qualité, source normalisée dans la liste, export CSV, test action sensible.
- Tests ajoutés : `Traçabilité source les actions sensibles et ouvre le bon module`.
- Commit poussé : `48fed4c fix: completer tracabilite terrain`.
- Reste à faire : brancher systématiquement `business_events` dans tous les services CRUD de suppression pour que les actions admin soient tracées côté serveur, pas seulement côté UI.

## Module : Objectifs & Croissance

- Sections testées : KPI BP officiel, Objectifs par cycles réels, Plans d’action objectifs, Objectifs par activité, Objectifs mensuels officiels, plan financier léger.
- Sections supprimées/fusionnées : aucune suppression ; ajout d’un panneau d’action pour éviter que les mêmes écarts restent seulement informatifs.
- Boutons testés : Voir tâches, Ouvrir source, Créer plan d’action, Centre décisionnel, Ventes, Voir BP, Finances, Rapports.
- Boutons corrigés : Créer plan d’action crée maintenant une tâche opérationnelle et une trace métier ; Ouvrir source envoie vers le module concerné par l’activité.
- Formulaires testés : le module ne contient pas encore de formulaire complet d’objectif personnalisé ; le parcours actionnable testé est la création de tâche depuis un objectif en retard.
- Champs présents : activité, objectif, réalisé, reste, atteinte, statut, source métier, notes d’action, échéance tâche, priorité.
- Champs ajoutés : statut objectif calculé (`Atteint`, `En retard`, `En cours`), module source à ouvrir, checklist de rattrapage, clé de déduplication de tâche.
- Actions testées : objectif œufs atteint, objectif poulets de chair en retard, création d’un plan d’action, navigation vers source Avicole, passage vers Tâches.
- Conséquences métier vérifiées : objectif en retard -> tâche `objectifs_croissance` liée au module source + événement métier ; objectif atteint -> statut atteint sans faux retard.
- Interconnexions vérifiées : Objectifs vers Tâches, Business events/Traçabilité métier, Centre décisionnel, Avicole, Animaux, Cultures, Stock, Finances.
- Bugs trouvés : KPI BP pouvait ne pas recevoir toutes les données simulées, écarts sans action directe, statut objectif statique.
- Corrections faites : normalisation des props KPI depuis `dataMap`, utilitaire `objectivesWorkflows`, panneau terrain d’actions objectif, callbacks tâches/événements branchés depuis `App.jsx`.
- Tests ajoutés : `Objectifs & Croissance marque atteint et crée une action si objectif en retard`.
- Commit poussé : `a8969b7 fix: completer objectifs croissance terrain`.
- Reste à faire : ajouter un vrai formulaire “Ajouter objectif personnalisé” persistant si le métier veut créer des objectifs hors BP officiel.

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

## Module : Accueil / Dashboard

- Sections testées : Aujourd’hui, Pilotage ferme objectif du mois, Évolution détaillée en mode expert, cartes urgences, argent, stock, santé, administratif, Smart Farm, tâches et contrôle ERP.
- Sections supprimées/fusionnées : aucune suppression ; les priorités du jour sont maintenant calculées par un workflow unique pour éviter des cartes répétées ou contradictoires.
- Boutons testés : Voir plus de détails, Vue simple, Voir Centre décisionnel, cartes Encaisser ventes, Traiter alertes, Revoir stock faible, Rattraper soins/vaccins, Vérifier capteurs/météo, Terminer tâches, Ajouter preuves/factures, Vérifier ventes supprimées.
- Boutons corrigés : chaque carte prioritaire garde un `moduleKey` explicite et ouvre le module source attendu : Ventes, Alertes, Stock, Santé, Smart Farm, Tâches, Documents ou Activité & Sync.
- Formulaires testés : le Dashboard n’a pas de formulaire métier direct ; il sert de porte d’entrée vers les formulaires des modules sources.
- Champs présents : objectif mensuel, CA réalisé, taux d’atteinte, reste à vendre, cash net, à encaisser, titre action, catégorie, détail, module cible.
- Champs ajoutés : catégorie terrain sur chaque action du jour et protection d’affichage contre `undefined`, `null`, `NaN`, `[object Object]`.
- Actions testées : vente partiellement payée, alerte ouverte, stock sous seuil, soin en retard, tâche ouverte, dépense sans preuve/facture, capteur hors service, météo à risque.
- Conséquences métier vérifiées : l’accueil ne crée pas lui-même les données ; il révèle les conséquences des modules et route vers le bon endroit pour agir. Les preuves/factures manquantes et Smart Farm sont maintenant visibles dans les priorités.
- Interconnexions vérifiées : Dashboard vers Ventes, Alertes, Stock, Santé, Smart Farm, Tâches, Documents, Activité & Sync, Centre décisionnel.
- Bugs trouvés : documents, capteurs et caméras n’étaient pas transmis à `DashboardV2`; les règles de priorité étaient dans le composant et moins testables ; le libellé “justificatifs” restait moins simple que “preuves / factures”.
- Corrections faites : ajout `dashboardWorkflows`, transmission des documents/capteurs/caméras depuis `App.jsx`, cartes catégorisées et sanitization des textes affichés.
- Tests ajoutés : `Dashboard priorise les urgences terrain et ouvre les bons modules`.
- Commit poussé : `f75fa52 fix: completer dashboard terrain`.
- Reste à faire : valider en navigateur connecté le mode données simulées via Paramètres en haut à droite, puis comparer les chiffres avec les vraies lignes Supabase de production.

## Tests

- Mise à jour jury du 2026-05-26 : parcours navigateur connecté en mode `Données simulées · Simple` depuis Paramètres / données simulées, puis passage sur les modules Accueil, Assistant ERP, Centre décisionnel, Objectifs & Croissance, Impact & Valeur, Rapports, Animaux, Avicole, Santé & Vaccins, Cultures, Équipements, Smart Farm, Clients, Ventes, Fournisseurs, Finances, Comptabilité, Investissements, Stock, Traçabilité, Alertes, Documents, Tâches, RH & Équipe, Activité & Sync ERP, Gestion du système. Aucun affichage visible de `undefined`, `null`, `NaN`, `[object Object]`, `source_record_id`, `workflow`, `business event`, `Coût non retrouvé dans les finances`, `Aucun impact business immédiat` ou `Détail technique` n’a été relevé dans ce passage.
- `npm install --no-audit --no-fund` : réussi avant synchronisation ; après reprise, `npm`/`npx` n’étaient plus disponibles dans le `PATH` Codex. Les bindings natifs optionnels macOS manquants ont été restaurés pour exécuter build/tests avec le binaire Node local.
- `npm run build` : équivalent exécuté avec `/Users/momofmarieme/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vite/bin/vite.js build`, réussi. Avertissement uniquement sur gros chunks.
- `npx playwright install --with-deps chromium` : réussi avant synchronisation.
- `npx playwright test tests/e2e/user-smoke.spec.js --reporter=line` : réussi avec `E2E_LOGIN=penda`, `1 passed (1.4m)`.
- `npx playwright test tests/e2e/simulated-business-workflows.spec.js --reporter=line` : équivalent local Node réussi après corrections Stock, Santé, Ventes, Clients, Fournisseurs, Documents, Tâches, Alertes, Cultures, Investissements, Rapports, Impact & Valeur, Équipements, RH & Équipe, Smart Farm, Assistant ERP, Centre décisionnel, Objectifs & Croissance, Traçabilité, Activité & Sync ERP/Audit logs, Gestion système, Dashboard, Avicole, Animaux, Finances, Comptabilité, puis garde anti-jargon et rapprochement Santé/Finances/Comptabilité, `63 passed`.
- Vérification navigateur ciblée Cultures en mode `Données simulées · Simple` : ouverture du module Cultures après connexion, aucune alerte React de clé dupliquée `HF-CULT-002` ; seul un échec réseau météo externe non bloquant a été observé.
- Passe “jury réel” sans données à préserver : ajout de `tests/e2e/jury-real-submissions.spec.js`, un parcours opt-in qui ouvre les formulaires principaux Stock, Ventes, Clients, Fournisseurs, Documents, Tâches, Alertes, Cultures, Équipements, Smart Farm, Traçabilité et Gestion système, remplit des données `TEST JURY`, valide et vérifie l’absence de jargon/erreur visible. Le test est protégé par `E2E_REAL_SUBMISSIONS=1` pour éviter toute pollution involontaire ; en mode normal il est bien découvert et marqué `12 skipped`.
- Essais destructifs réels lancés manuellement : les premières passes ont créé des lignes `TEST JURY` en Stock, Ventes et Cultures, ce qui confirme que l’environnement accepte l’écriture. Les rafraîchissements Supabase peuvent garder des modales ouvertes assez longtemps ; le helper Playwright a été durci pour ne plus attendre indéfiniment `networkidle`.
- `npx playwright test tests/e2e/full-human-erp-journey.spec.js --reporter=line` : équivalent local Node réussi, `1 passed`.
- Erreurs console/page : aucun échec dans les tests métier simulés ; le premier smoke relancé sans variables a échoué uniquement sur `E2E_LOGIN/E2E_PASSWORD` manquants.

## Corrections jury après parcours utilisateur

### Module : Santé & Vaccins / Finances / Comptabilité

- Sections testées : Santé & Vaccins, contrôle qualité santé, historique santé, Finances, Comptabilité, Documents, détails de fiches.
- Boutons testés : marquer réalisé, ouvrir source, joindre preuve/facture manquante, consulter détail.
- Formulaires testés : soin avec coût, intervention santé, preuve/facture liée, formulaire de dépense générée.
- Champs présents : type soin, cible, coût, statut, produit, dose, date prévue/réalisée, preuve/facture, lien finance, lien document.
- Champs ajoutés / renforcés : transaction santé avec `amount`, `sante_id`, `montant_total`; document preuve/facture manquante avec `transaction_id`, `finance_id`, `module_source`, montant et statut lisible.
- Actions testées : saisir un soin coûté, créer automatiquement la dépense Finance, créer une preuve/facture manquante pour Comptabilité, vérifier qu’un document manquant ne compte pas comme preuve valide.
- Conséquences métier vérifiées : un coût Santé crée ou lie une seule dépense Finance ; la même dépense devient contrôlable en Comptabilité avec preuve/facture ; pas de double comptage.
- Interconnexions vérifiées : Santé -> Finances, Santé -> Documents, Finances -> Comptabilité, détails de fiche -> champs internes masqués.
- Bugs trouvés : `SanteV8` écrivait dans le mauvais CRUD (`transactions` au lieu de `finances`) ; les preuves manquantes n’étaient pas créées automatiquement ; le contrôle affichait “Coût non retrouvé dans les finances” et “Aucun impact business immédiat”.
- Corrections faites : `SanteV8` utilise désormais `finances`, crée/lien la dépense et prépare la preuve/facture manquante ; `HealthQualityControl` ne demande plus de créer une dépense à la main et régularise automatiquement la liaison Finance/Documents quand un coût santé existe ; `DetailsModal` masque les clés internes (`source_record_id`, ids de workflow, liens techniques) et affiche “Non renseigné” au lieu de valeurs brutes.
- Tests ajoutés : `coût santé crée une dépense finance non doublonnée`, `interface masque les libellés techniques et garde les messages terrain`.
- Commit poussé : `7f2e188 fix: harmoniser sante finances comptabilite terrain`.
- Reste à faire : valider avec les vraies politiques Supabase que la création automatique de dépense/document reste autorisée pour chaque rôle terrain.

### Module : Ventes / Marges terrain

- Sections testées : caisse ventes, ventes à traiter, vente guidée, contrôle qualité ventes.
- Boutons testés : nouvelle vente, modifier, traiter, livrer, facture.
- Formulaires testés : vente guidée, action vente, encaissement, livraison, facture.
- Champs présents : produit, client, quantité, prix, total, payé, reste, livraison.
- Champs ajoutés / renforcés : coût direct, marge directe, taux de marge et source de marge visibles sur chaque ligne de vente ouverte.
- Actions testées : affichage de ventes simulées avec sources stock/animal/lot/culture, calcul marge depuis `salesMarginEngine`.
- Conséquences métier vérifiées : une ligne vente montre immédiatement la rentabilité quand le coût source est connu ; si le coût manque, la ligne indique que la marge n’est pas fiable au lieu de masquer l’information.
- Interconnexions vérifiées : Ventes -> Stock, Animaux, Avicole, Cultures, Paiements, Finances.
- Bugs trouvés : la marge par ligne, présente avant, n’était plus visible dans la caisse terrain `VentesV4`.
- Corrections faites : `VentesV4` recalcule et affiche coût, marge, taux et source de marge pour chaque vente ouverte.
- Tests ajoutés : garde sur les textes `Marge` et `Source marge` dans les fichiers utilisateur.
- Commit poussé : `f376a49 fix: automatiser depenses metier et marges ventes`.
- Reste à faire : valider les coûts sources sur données réelles quand elles seront disponibles.

### Module : Tous modules visibles

- Sections testées : navigation principale et pages des 26 modules en mode données simulées.
- Boutons testés : navigation modules, actions principales visibles, paramètres de données simulées déjà actifs.
- Formulaires testés : formulaires visibles détectés dans Avicole et Santé après navigation ; les tests métier couvrent les formulaires complets Stock, Santé, Ventes, Clients, Fournisseurs, Documents, Tâches, Alertes, Cultures, Investissements, Rapports, Impact, Équipements, RH, Smart Farm, Assistant, Centre décisionnel, Objectifs, Traçabilité, Sync, Gestion système et Dashboard.
- Bugs trouvés : quelques libellés techniques restaient dans les fichiers UI actifs ou anciens (`workflow`, “Impact business / observation”, “Réparer le workflow ventes”, “Écriture finance créée…”) ; les modules Documents/tiers/Impact utilisaient encore “justificatif” là où le reste de l’ERP parle “preuve / facture”.
- Corrections faites : remplacement par “parcours”, “action”, “Conséquence terrain”, “Dépense alimentation créée depuis Stock”, “Espace” au lieu de “Module” dans l’assistant ; harmonisation Documents, clients/fournisseurs, Impact et Paramètres vers “preuves / factures”.
- Tests ajoutés : garde anti-jargon dans `tests/e2e/simulated-business-workflows.spec.js`.
- Commits poussés : `7f2e188 fix: harmoniser sante finances comptabilite terrain`, `26bbbf8 fix: simplifier preuves factures documents`.
- Reste à faire : poursuivre le même mode jury avec saisie réelle navigateur module par module quand un compte Supabase de test stable et isolé est disponible pour éviter de polluer les données de production.

### Module : Cultures

- Sections testées : Pilotage cultures, tableau cultures, objectif & performance, intrants & météo, données simulées.
- Boutons testés : navigation Cultures, liens Intrants stock, Ventes et Météo depuis la culture simulée.
- Formulaires testés : flux récolte/intrant/perte déjà couverts par les tests métier simulés ; contrôle navigateur ciblé effectué sur l’affichage après activation des données simulées.
- Bugs trouvés : en mode simulé, la même culture `HF-CULT-002` pouvait être injectée deux fois dans les panneaux de priorité, provoquant l’avertissement React “Encountered two children with the same key”.
- Corrections faites : déduplication des cultures par identifiant dans `CulturesV4` avant enrichissement métier, puis déduplication des lignes prioritaires dans `CultureOperationalHealthPanel`.
- Conséquences métier vérifiées : la culture reste affichée une seule fois, les quantités/coûts/pertes gardent leurs valeurs consolidées, et les liens Stock/Ventes/Météo restent disponibles.
- Tests ajoutés : build + `simulated-business-workflows.spec.js` relancés ; vérification navigateur ciblée Cultures en mode `Données simulées · Simple`.
- Commit poussé : `8faf3da fix: dedupliquer affichage cultures simulees`.
- Reste à faire : ignorer ou mocker la météo externe dans les tests navigateur pour supprimer le bruit réseau non métier.

### Soumissions réelles de formulaires

- Sections testées : formulaires principaux des modules Stock, Ventes, Clients, Fournisseurs, Documents, Tâches, Alertes, Cultures, Équipements, Smart Farm, Traçabilité et Gestion système.
- Boutons testés : créer/réceptionner stock, nouvelle vente guidée, nouveau client, nouveau fournisseur, ajouter document, ajouter tâche, nouvelle alerte, ajouter culture, ajouter équipement, ajouter capteur, ajouter un fait, créer utilisateur.
- Données utilisées : préfixe `TEST JURY`, montants simples, téléphone test, dates au 2026-05-26, parcelle test et notes de saisie terrain contrôlée.
- Corrections faites : ajout d’un test opt-in de soumissions destructives réelles ; durcissement du helper Playwright pour une application connectée qui garde des requêtes météo/Supabase ouvertes.
- Fichier modifié : `tests/e2e/jury-real-submissions.spec.js`, `tests/e2e/helpers.js`.
- Test : `E2E_REAL_SUBMISSIONS=1 E2E_LOGIN=penda E2E_PASSWORD=... E2E_BASE_URL=http://127.0.0.1:5173 node node_modules/@playwright/test/cli.js test tests/e2e/jury-real-submissions.spec.js --reporter=line`.
- Résultat attendu : créer de vraies fiches `TEST JURY` dans un environnement sans données à préserver, puis vérifier que l’UI ne montre ni jargon technique, ni erreur visible, ni blocage de validation.
- Résultat observé : les essais réels ont écrit des lignes `TEST JURY` sur les premiers modules ; le parcours complet reste volontairement opt-in car il pollue les données et dépend de la latence Supabase. En exécution standard, le fichier est découvert et marque `12 skipped`.
- Reste à faire : lancer ce test avec `E2E_REAL_SUBMISSIONS=1` quand une passe destructive complète est explicitement souhaitée, puis nettoyer les lignes `TEST JURY` si besoin.

## Recette complète anti-données orphelines par module

### Modules : Santé / Finances / Comptabilité / Documents

- Flux testé : soin réalisé avec coût de 15 000 FCFA, dépense Finance, ligne Comptabilité et preuve/facture manquante.
- Donnée saisie : `SAN-JURY-001`, cible `BOV002`, coût `15 000 FCFA`.
- Modules impactés : Santé, Finances, Comptabilité, Documents.
- Résultat attendu : le même montant apparaît une seule fois dans Finance, Comptabilité le contrôle, Documents prépare la preuve/facture, aucun message “coût non retrouvé”.
- Résultat observé : la logique créait bien la dépense mais ne marquait pas explicitement l’effet caisse.
- Correction faite : la dépense Santé générée porte maintenant `cash_effect: true` et `status: paye`, ce qui évite les ambiguïtés entre dépense réelle et dette.
- Test ajouté : `tests/e2e/no-orphan-business-data.spec.js`, cas “soin coûté”.
- Commit : `5507c4f fix: renforcer liens metier anti donnees orphelines`.
- Reste à faire : aucun blocage logique simulé.

### Modules : Ventes / Animaux / Avicole / Stock / Cultures / Clients

- Flux testé : vente animal, vente lot avicole, vente tablettes d’œufs, vente récolte.
- Donnée saisie : animal `BOV-JURY-001`, lot `LOT-JURY-001`, stock `STK-OEUFS-JURY`, culture `CUL-TOMATE-JURY`.
- Modules impactés : Ventes, Animaux, Avicole, Stock, Cultures, Clients, Finances, Documents, Traçabilité.
- Résultat attendu : vente animal sort l’animal actif, vente lot décrémente l’effectif, vente œufs décrémente les tablettes, vente culture décrémente le disponible.
- Résultat observé : le flux vente lot avicole contenait une variable mal nommée qui pouvait bloquer le calcul source.
- Correction faite : `buildSaleSourcePatch` utilise désormais `saleKind` correctement pour renseigner le type de vente sans erreur.
- Test ajouté : `tests/e2e/no-orphan-business-data.spec.js`, cas “ventes: chaque source met à jour son module”.
- Commit : `5507c4f fix: renforcer liens metier anti donnees orphelines`.
- Reste à faire : aucun blocage logique simulé.

### Modules : Avicole / Santé / Alertes

- Flux testé : lot initial 100, morts 5, vendus 10, malades 3.
- Donnée saisie : `LOT-EFF-JURY`.
- Modules impactés : Avicole, Santé, Alertes.
- Résultat attendu : effectif actuel calculé à 85 ; les 3 malades restent dans le lot mais visibles comme sujets à surveiller.
- Résultat observé : règle conforme après corrections précédentes.
- Correction faite : test de non-régression ajouté pour empêcher le double retrait des malades.
- Test ajouté : `tests/e2e/no-orphan-business-data.spec.js`, cas “avicole: morts et vendus sortent de l’effectif”.
- Commit : `5507c4f fix: renforcer liens metier anti donnees orphelines`.
- Reste à faire : aucun blocage logique simulé.

### Modules : Stock / Cultures / Documents / Tâches / Alertes

- Flux testé : stock critique, réapprovisionnement, récolte culture, sortie intrant, perte culture, preuve manquante.
- Donnée saisie : stock `STK-ALIM-JURY`, culture `CUL-JURY-001`, document `DOC-JURY-001`.
- Modules impactés : Stock, Cultures, Documents, Tâches, Alertes, Traçabilité.
- Résultat attendu : stock critique crée tâche/alerte ; réapprovisionnement supprime le besoin de réalerte ; récolte crée stock + opportunité ; intrant décrémente stock ; perte réduit le disponible ; preuve manquante crée tâche.
- Résultat observé : logique conforme après corrections précédentes.
- Correction faite : test de verrouillage ajouté pour empêcher le retour des alertes ouvertes après stock réapprovisionné.
- Test ajouté : `tests/e2e/no-orphan-business-data.spec.js`, cas “stock, cultures et documents ferment les boucles métier”.
- Commit : `5507c4f fix: renforcer liens metier anti donnees orphelines`.
- Reste à faire : aucun blocage logique simulé.

### Modules : Fournisseurs / Équipements / RH / Investissements

- Flux testé : réception fournisseur, paiement fournisseur, panne, réparation, salaire RH, investissement réalisé et transformation en actif.
- Donnée saisie : fournisseur `FOU-JURY`, équipement `EQP-JURY`, employée `EMP-JURY`, ligne BP `BPLI-JURY`.
- Modules impactés : Fournisseurs, Stock, Finances, Documents, Équipements, Tâches, Alertes, RH, Investissements.
- Résultat attendu : réception augmente stock sans compter comme cash dépensé ; paiement fournisseur solde la dette ; réparation ferme tâche/alerte et crée finance/document ; salaire crée finance/document ; investissement crée finance/preuve/actif sans doublon.
- Résultat observé : logique conforme après corrections précédentes.
- Correction faite : test de non-régression transversal ajouté.
- Test ajouté : `tests/e2e/no-orphan-business-data.spec.js`, cas “fournisseur, équipement, RH et investissement”.
- Commit : `5507c4f fix: renforcer liens metier anti donnees orphelines`.
- Reste à faire : aucun blocage logique simulé.

### Modules : Alertes / Tâches / Dashboard / Traçabilité

- Flux testé : alerte stock transformée en tâche puis terminée.
- Donnée saisie : alerte `ALT-JURY-001`.
- Modules impactés : Alertes, Tâches, Dashboard, Traçabilité.
- Résultat attendu : une seule tâche liée, alerte rattachée, clôture de tâche met l’alerte en traitée, historique garde les deux liens.
- Résultat observé : logique conforme.
- Correction faite : test de lien unique ajouté.
- Test ajouté : `tests/e2e/no-orphan-business-data.spec.js`, cas “alerte transformée en tâche”.
- Commit : `5507c4f fix: renforcer liens metier anti donnees orphelines`.
- Reste à faire : aucun blocage logique simulé.

### Interface sans jargon technique

- Flux testé : parcours de tous les modules principaux en navigateur avec garde anti-jargon renforcée.
- Donnée saisie : données simulées déjà présentes et navigation utilisateur.
- Modules impactés : les 26 modules de l’ERP.
- Résultat attendu : aucun texte interne visible à l’utilisateur final, notamment identifiants de source, termes de synchronisation, erreurs techniques et valeurs vides brutes.
- Résultat observé : garde existante incomplète ; le test connecté réel a ensuite révélé `business event` dans Alertes, `à synchroniser` dans Activité & Sync ERP et `Supabase/RBAC` dans Gestion système.
- Correction faite : `DetailsModal` filtre maintenant les fonctions et les chaînes internes ; `helpers.js` ajoute la liste complète des termes interdits au contrôle UI ; Alertes traduit les sources internes en “Historique métier” ; Activité & Sync parle d’actions “à envoyer” et de “journal d’activité” ; Gestion système parle de droits côté serveur sans citer l’outil technique.
- Test ajouté : `tests/e2e/no-technical-jargon.spec.js`.
- Commit : `5507c4f fix: renforcer liens metier anti donnees orphelines`, complété par `34231a4 fix: nettoyer jargon modules connectes`.
- Reste à faire : exécuter en continu avec un compte E2E stable à chaque release.

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
- `5af5397 docs: documenter corrections terrain stock`
- `9a60e9c fix: completer parcours sante terrain`
- `737b770 test: couvrir parcours sante terrain`
- `700f727 docs: documenter corrections terrain sante`
- `4dade40 fix: completer parcours ventes terrain`
- `bc31433 test: couvrir parcours ventes terrain`
- `ab30ef3 docs: documenter corrections terrain ventes`
- `5dc1292 fix: completer parcours clients terrain`
- `33e8dfe test: couvrir parcours clients terrain`
- `4621b58 fix: stabiliser fiche client terrain`
- `ea84e8a docs: documenter corrections terrain clients`
- `b38ae48 fix: completer parcours fournisseurs terrain`
- `394cbf8 test: couvrir parcours fournisseurs terrain`
- `c0c4964 docs: documenter corrections terrain fournisseurs`
- `5abb335 fix: completer parcours documents terrain`
- `e9796cb test: couvrir parcours documents terrain`
- `18c6c58 docs: documenter corrections terrain documents`
- `cb5589e fix: completer parcours taches terrain`
- `c4a8016 test: couvrir parcours taches terrain`
- `4811c32 docs: documenter corrections terrain taches`
- `732eac7 fix: completer parcours alertes terrain`
- `5a2c0ed test: couvrir parcours alertes terrain`
- `470bc0f fix: completer parcours cultures terrain`
- `afab3f6 test: couvrir parcours cultures terrain`
- `50cc781 docs: documenter corrections terrain cultures`
- `dfde19a fix: completer parcours investissements terrain`
- `4e36fa1 test: couvrir parcours investissements terrain`
- `cd101bd docs: documenter corrections terrain investissements`
- `26f4eb2 fix: completer parcours rapports terrain`
- `eb7bc31 test: couvrir parcours rapports terrain`
- `df9e416 docs: documenter corrections terrain rapports`
- `6171e39 fix: completer parcours impact valeur terrain`
- `add2de1 docs: documenter corrections terrain impact valeur`
- `e96356a fix: completer parcours equipements terrain`
- `f26affc docs: documenter corrections terrain equipements`
- `0d9ff24 fix: completer parcours rh terrain`
- `52eff55 docs: documenter corrections terrain rh`
- `d41cbd1 fix: completer parcours smart farm terrain`
- `b478563 docs: documenter corrections terrain smart farm`
- `06e2035 fix: completer assistant erp terrain`
- `97a3451 docs: documenter corrections terrain assistant erp`
- `89d0e75 fix: completer centre decisionnel terrain`
- `8885072 docs: documenter corrections terrain centre decisionnel`
- `a8969b7 fix: completer objectifs croissance terrain`
- `39a5c43 docs: documenter corrections terrain objectifs croissance`
- `48fed4c fix: completer tracabilite terrain`
- `12efe77 docs: documenter corrections terrain tracabilite`
- `4250fda fix: completer sync audit terrain`
- `c89f0d9 docs: documenter corrections terrain sync audit`
- `f8caa6c fix: completer gestion systeme terrain`
- `a07ce5d docs: documenter corrections terrain gestion systeme`
- `f75fa52 fix: completer dashboard terrain`
- `7f2e188 fix: harmoniser sante finances comptabilite terrain`
- `17f510a docs: documenter audit jury sante finance`
- `26bbbf8 fix: simplifier preuves factures documents`

Push GitHub : les commits jusqu'à `f376a49` sont poussés sur `origin/feature/objectifs-croissance-centre-decisionnel` après configuration SSH.

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
| P2 | Smart Farm | seuils à calibrer avec les vrais appareils terrain | `SmartFarm.jsx` | valider les unités et seuils réels par type de capteur |
| P2 | Rapports | PDF à revalider sur brouillon modifié | `RapportsV2.jsx` | test export avec contenu modifié |
| P2 | Assistant ERP | handlers visuels pas encore dédiés pour Cultures/Documents | `CulturesV5.jsx`, `DocumentsV2.jsx`, `AssistantPanel.jsx` | afficher une carte préremplie spécifique après intention récolte/facture |
