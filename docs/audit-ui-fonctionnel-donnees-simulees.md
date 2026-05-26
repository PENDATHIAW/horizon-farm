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
- `npx playwright test tests/e2e/simulated-business-workflows.spec.js --reporter=line` : équivalent local Node réussi après corrections Stock, Santé, Ventes, Clients, Fournisseurs, Documents, Tâches, Alertes, Cultures, Investissements, Avicole, Animaux, Finances, Comptabilité, `42 passed`.
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
