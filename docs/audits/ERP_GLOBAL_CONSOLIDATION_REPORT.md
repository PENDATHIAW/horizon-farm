# Rapport global de consolidation ERP

Date : 2026-07-13
Dépôt : `PENDATHIAW/horizon-farm`
Branche : `claude/go-a21ueq`
PR : #170 vers `main`, après la fusion partielle de #169

Ce rapport remplace le rapport historique de la PR #167. Il couvre le cumul des corrections reprises
dans la PR #169 et finalisées dans la PR #170 : architecture, doublons, accès aux modules,
26 événements, formulaires, impacts, alertes, rapports, refonte visuelle et application Supabase.

## 1. Audit exhaustif du code

| Contrôle | Résultat final |
|---|---|
| Fichiers source analysés | 1021 |
| Atteignables depuis les points d'entrée | 957 |
| Supports non exécutables | 64 |
| Composants JSX orphelins | 0 |
| Imports non résolus | 0 |
| Routes source orphelines | 0 |
| Fichiers unitaires | 235/235 |
| Vulnérabilités npm | 0 |

Les contrôles combinent `audit:reachability`, ESLint, le build Vite, les tests d'import, les tests
de rendu et l'audit anti-duplication. Les 64 fichiers de support sont des configurations, données,
utilitaires ou feuilles d'index volontairement sans point d'entrée propre.

### Doublons et code mort traités

- `src/modules/BoviniaModule.jsx` supprimé.
- Aucun `TallowModule.jsx` ni action opérationnelle associée.
- `src/services/erpRules/documentRules.js` supprimé après confirmation de l'absence de consommateur.
- L'onglet Centre décisionnel qui ne réagissait pas a été raccordé à sa vue.
- La vue Finance en double a été retirée au profit de la configuration unique.
- Les abonnements temps réel en double sont centralisés dans `src/utils/realtimeSubscriptions.js`.
- Le répertoire Équipe charge ses données seulement à l'ouverture.
- Les anciennes routes sont des alias explicites, pas des moteurs parallèles.
- Les composants partagés d'alertes, tâches, événements et indicateurs pointent vers leur version unique.
- Recherche mot entier dans `src`, `public`, `lib`, `sites` : 0 BOVINIA, 0 Tallow.

## 2. Accessibilité des modules

Audit navigateur réalisé sur ordinateur et mobile :

- 15 modules visibles avec les flags du profil de contrôle ;
- 82 onglets internes ouverts un à un ;
- 82 onglets ont pris l'état sélectionné attendu ;
- aucune page `ERREUR MODULE` ;
- aucune erreur finale de console ;
- menu mobile, fond de fermeture, barre d'actions et Transformation contrôlés.

La configuration couvre 17 modules et la face financeur. Les modules optionnels absents du parcours
visible étaient désactivés par leurs flags, ce qui vérifie aussi l'absence de route, import et requête.

## 3. Revue fichier par fichier des 26 événements

Chaque ligne ci-dessous est vérifiée par
`src/audit/businessEventImplementationMatrix.js`,
`tests/unit/businessEventImplementationAudit.test.js` et
`tests/unit/businessInterconnectionsCoverage.test.js`.

| Événement | Écran actif | Workflow exécutant | Validation du formulaire | Stock | Finance | Commercial | Tâches | Alertes | Documents | Reporting | Test | Statut |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `feed_reception` | `src/modules/StockPurchaseReceptionForm.jsx` | `src/utils/stockPurchaseWorkflow.js` | Le formulaire bloque quantité, coût, fournisseur et statut de paiement invalides. | Entrée et mouvement de stock avec CMUP. | Paiement ou dette fournisseur selon le statut. | N/A. | Réapprovisionnement dérivé si seuil atteint. | Seuil stock et preuve manquante. | Facture ou reçu lié à la transaction. | Événement, coût unitaire et dette fournisseur. | `tests/unit/achatsStockV1P0.test.js` | COMPLET |
| `feed_distribution` | `src/modules/elevage/ElevageWorkflowPanels.jsx` | `src/utils/elevageWorkflow.js` | La cible, le stock et une quantité positive sont obligatoires. | Sortie aliment et mouvement idempotent. | Coût imputé au lot ou à l’animal sans double caisse. | Marge future recalculable. | Tâche de réapprovisionnement au seuil. | Stock critique ou consommation anormale. | N/A en saisie quotidienne. | Consommation, coût alimentaire et indice. | `tests/unit/dailyQuickEntryContract.test.js` | COMPLET |
| `broiler_lot_start` | `src/modules/AvicoleV10.jsx` | `src/utils/elevageWorkflow.js` | Le démarrage est bloqué sans effectif, bâtiment, fournisseur ou coût cohérent. | Besoin aliment projeté. | Coût initial du lot. | Date et marge de vente prévues. | Vaccination, pesée et suivi créés. | Blocage bâtiment occupé ou données manquantes. | Traçabilité via événement du lot. | Effectif, coût, besoin aliment et marge prévisionnelle. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `mortality_record` | `src/modules/elevage/ElevageWorkflowPanels.jsx` | `src/utils/elevageWorkflow.js` | La quantité ne peut pas dépasser l’effectif et la cause est conservée. | N/A. | Perte technique et coût survivant dérivés. | Marge attendue révisée. | Contrôle sanitaire au seuil. | Mortalité élevée ou répétée. | Historique événementiel. | Effectif restant, taux de mortalité et perte estimée. | `tests/unit/dailyQuickEntryContract.test.js` | COMPLET |
| `health_treatment` | `src/modules/SanteV6.jsx` | `src/utils/healthSideEffects.js` | Cible, produit, quantité, date et responsable sont contrôlés. | Consommation du produit vétérinaire. | Coût sanitaire lié à la cible. | Délai d’attente protège la vente. | Rappel ou tâche sanitaire clôturée. | Stock insuffisant ou suivi en retard. | Ordonnance ou preuve sanitaire liée. | Historique santé et coût sanitaire. | `tests/unit/achatsStockV3.test.js` | COMPLET |
| `biosecurity_cleaning` | `src/modules/SanteV6.jsx` | `src/utils/manureSideEffects.js` | Nombre de sacs, poids, statut sanitaire, destination et prochaine étape sont validés. | Création de matière organique collectée. | Coût de biosécurité rattachable. | N/A. | Nettoyage, vide sanitaire ou compostage. | Destination culture bloquée si statut suspect. | Preuve sanitaire et collecte. | Poids collecté et preuve de circularité. | `tests/unit/biosecurityManureWorkflow.test.js` | COMPLET |
| `egg_production` | `src/modules/elevage/ElevageWorkflowPanels.jsx` | `src/utils/elevageWorkflow.js` | Lot, quantité produite et casse cohérente sont obligatoires. | Entrée d’œufs vendables et consommation emballage. | Coût plateau dérivé. | Quantité rendue vendable. | Suivi si emballage ou stock manque. | Casse ou taux de ponte anormal. | Historique de production. | Œufs, tablettes, casse et taux de ponte. | `tests/unit/dailyQuickEntryContract.test.js` | COMPLET |
| `egg_sale` | `src/modules/commercial/DailySaleModal.jsx` | `src/utils/commercialSaleWorkflow.js` | Produit, quantité, prix, client, paiement et disponibilité sont contrôlés. | Sortie du stock œufs. | Encaissement ou créance. | Commande, livraison, facture et client. | Relance si reste dû. | Créance ou stock insuffisant. | Facture liée. | CA œufs, cash, créance et marge. | `tests/unit/businessEventOperationalGaps.vite.js` | COMPLET |
| `broiler_sale` | `src/modules/commercial/DailySaleModal.jsx` | `src/utils/commercialSaleWorkflow.js` | Le lot source et l’effectif disponible sont exigés. | Effectif du lot diminué. | Encaissement ou créance. | Commande, livraison et facture. | Clôture ou suivi du lot. | Vente supérieure à l’effectif bloquée. | Facture et traçabilité lot. | CA chair, marge et écart prévu/réel. | `tests/unit/businessEventOperationalGaps.vite.js` | COMPLET |
| `bovine_weighing` | `src/modules/elevage/ElevageWorkflowPanels.jsx` | `src/utils/elevageWorkflow.js` | Animal, date et poids positif sont obligatoires. | N/A. | Coût par kg gagné et marge dérivés. | Date de sortie estimée. | Nouvelle pesée ou adaptation ration. | GMQ faible ou pesée en retard. | Historique de pesée. | Poids, GMQ, coût/kg et marge. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `bovine_sale` | `src/modules/commercial/DailySaleModal.jsx` | `src/utils/commercialSaleWorkflow.js` | Un animal actif unique, un prix et un client sont requis. | Animal sorti de l’actif. | Encaissement ou créance. | Commande et client liés. | Archivage et suivi de solde. | Animal déjà vendu ou indisponible bloqué. | Facture et fiche animal liées. | CA bovin, marge par tête et rotation. | `tests/unit/businessEventOperationalGaps.vite.js` | COMPLET |
| `crop_campaign_start` | `src/modules/CulturesRecoveredModule.jsx` | `src/utils/cultureWorkflows.js` | Parcelle, culture, surface, date et budget sont cohérents avant création. | Intrants initiaux et besoins liés. | Budget initial de campagne. | Rendement vendable projeté. | Irrigation et suivi planifiés. | Parcelle occupée ou capacité manquante. | Événement de campagne. | Surface, rendement, coût et marge prévus. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `irrigation_event` | `src/modules/cultures/CulturesIrrigationQuickForm.jsx` | `src/utils/culturesWorkflow.js` | Culture active et volume positif sont obligatoires. | N/A. | Coût technique affecté sans faux décaissement. | Marge parcelle recalculable. | Contrôle fuite ou pompe. | Volume anormal ou capteur muet. | Historique d’irrigation. | Eau, durée, coût et rendement eau. | `tests/unit/dailyQuickEntryContract.test.js` | COMPLET |
| `organic_transfer` | `src/modules/CulturesRecoveredModule.jsx` | `src/utils/manureWorkflows.js` | Origine, parcelle, quantité et statut sanitaire sont contrôlés. | Sortie du stock organique. | Économie d’intrants estimée. | N/A. | Suivi parcelle ou contrôle sanitaire. | Blocage contamination et stock insuffisant. | Preuve de transfert. | Kg valorisés et circularité. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `crop_harvest` | `src/modules/cultures/CulturesHarvestPanel.jsx` | `src/utils/culturesWorkflow.js` | Culture, quantité, pertes, unité et destination sont validées. | Entrée de récolte vendable et mouvement. | Coût/kg avec frais de récolte. | Stock rendu disponible. | Suivi pertes si écart. | Quantités incohérentes ou stock manquant. | Événement de récolte. | Rendement, pertes, déclassement et coût/kg. | `tests/unit/culturesWorkflow.test.js` | COMPLET |
| `crop_sale` | `src/modules/commercial/DailySaleModal.jsx` | `src/utils/commercialSaleWorkflow.js` | Récolte source, quantité disponible, prix et client sont requis. | Sortie de récolte. | Encaissement ou créance. | Commande, livraison et client. | Livraison ou relance. | Stock récolte insuffisant. | Facture et preuve de livraison. | CA culture et marge parcelle. | `tests/unit/businessEventOperationalGaps.vite.js` | COMPLET |
| `customer_payment` | `src/modules/SaleActionModal.jsx` | `src/utils/recordSalePayment.js` | Vente liée, plafond du reste dû, date et moyen sont contrôlés. | N/A. | Entrée de trésorerie sans recompter le CA. | Solde commande et statut client. | Relances clôturées au solde. | Créance résolue au paiement complet. | Facture déjà gérée par la vente. | Encaissements, créances et trésorerie. | `tests/unit/demoFinanceurDryRun.test.js` | COMPLET |
| `supplier_payment` | `src/modules/Fournisseurs.jsx` | `src/utils/supplierSideEffects.js` | Dette source, montant plafonné, date, mode et preuve sont obligatoires. | Dette liée à l’achat ou au stock source. | Sortie de trésorerie et solde partiel. | N/A. | Suivi dette clôturé seulement au solde. | Alerte conservée tant que la dette reste ouverte. | Justificatif obligatoire. | Dette fournisseur, cash sortant et coût achat. | `tests/unit/businessEventOperationalGaps.vite.js` | COMPLET |
| `equipment_purchase` | `src/modules/equipements/EquipementAcquisitionForm.jsx` | `src/utils/equipmentWorkflows.js` | Équipement, type, montant, fournisseur, financement, date et preuve sont obligatoires. | N/A. | Dépense d’investissement liée. | N/A. | Maintenance initiale planifiée. | Preuve manquante bloquée par le formulaire. | Facture obligatoire. | Actif, amortissement et coût fixe. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `equipment_maintenance` | `src/modules/EquipementsQuickActionsBridge.jsx` | `src/utils/equipmentSideEffects.js` | Équipement, date, type, responsable, coût non négatif et prochaine échéance sont validés. | N/A. | Dépense de maintenance enregistrée une seule fois. | N/A. | Tâche créée ou mise à jour. | Alerte panne conservée jusqu’à réparation. | Preuve maintenance liée au coût. | Coût, disponibilité et prochaine échéance. | `tests/unit/businessEventOperationalGaps.vite.js` | COMPLET |
| `task_lifecycle` | `src/modules/activiteSuivi/ActiviteWorkflowBridge.jsx` | `src/utils/activiteSuiviWorkflow.js` | Une clôture conserve résultat, date, responsable et événement. | N/A. | N/A sauf opération source. | N/A sauf opération source. | Création, affectation, échéance et clôture. | Lien bidirectionnel et résolution explicite. | Résultat traçable. | Retards, actions ouvertes et clôturées. | `tests/unit/activiteSuiviWorkflow.test.js` | COMPLET |
| `support_document` | `src/modules/documents/DocumentsWorkflowBridge.jsx` | `src/utils/documentsWorkflow.js` | Type, fichier, cible et identifiant source sont contrôlés. | Lien achat/réception possible. | Lien transaction obligatoire selon cible. | Lien vente, paiement ou facture. | Tâche preuve clôturée. | Alerte preuve résolue. | Document classé et rattaché. | Taux de justificatifs et niveau de preuve. | `tests/unit/documentsWorkflow.test.js` | COMPLET |
| `monthly_financier_report` | `src/modules/RapportsAutoBridge.jsx` | `src/utils/reportWorkflows.js` | Période, date d’arrêté, auteur et validation sont tracés. | Valeur du stock consolidée. | CA, cash, dépenses et financement. | Ventes, créances et livraisons. | Validation du brouillon. | Données ou preuves manquantes. | Version de rapport et pièces. | Rapport mensuel versionné. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `funding_usage` | `src/modules/InvestissementsV9.jsx` | `src/utils/bpLineConcretization.js` | Source, ligne budget, montant et preuve sont contrôlés. | Actif ou intrant financé lié. | Dépense affectée à la source. | N/A. | Justification ou correction budget. | Solde, dépassement ou preuve manquante. | Justificatif de dépense. | Fonds utilisés, restants et écart budget. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `growth_objective` | `src/modules/objectifs/ObjectifsDecisionModule.jsx` | `src/utils/objectivesWorkflows.js` | La cible, l’unité, l’échéance, le responsable et la source de calcul restent dérivés du BP. | Besoin aliment ou intrants simulé. | Cash requis et capacité de remboursement. | Débouché et cible de vente. | Action de rattrapage. | Capacité, stock ou cash insuffisant. | Historique de scénario. | Progression calculée et conditions de lancement. | `tests/unit/partialEventsCompletion.test.js` | COMPLET |
| `smartfarm_signal` | `src/modules/smartfarm/hooks/useSmartFarmTelemetry.js` | `src/services/smartFarmAlertSync.js` | V1 utilise uniquement les capteurs; aucun chemin caméra opérationnel. | N/A. | N/A tant qu’aucune intervention n’est facturée. | N/A. | Tâche terrain créée une fois. | Alerte capteur dédupliquée. | Preuve ajoutable lors de l’intervention. | Signal, zone, seuil et disponibilité. | `tests/unit/businessEventOperationalGaps.vite.js` | COMPLET |

Synthèse : **26 COMPLET, 0 PARTIEL, 0 CONFIGURATION UNIQUEMENT, 0 NON BRANCHÉ**.

## 4. Invariants métier vérifiés

- Vente validée : reconnaissance du chiffre d'affaires, puis paiement séparé de l'encaissement.
- Livraison immédiate : sortie directe. Livraison différée : réservation.
- Stock : toute variation passe par un mouvement ; stock négatif bloqué.
- Finance : dépense, décaissement, encaissement et dette restent des moments distincts.
- Rapport publié : instantané daté et immuable ; correction par nouvelle version.
- Financement : dépense liée à une convention et une ligne, sans ressaisie du montant source.
- Tâche corrective : tâche reliée à son alerte, sans table concurrente.
- Risques : dérivés des indicateurs et alertes, sans probabilité manuelle locale.
- Saisie rétroactive : date réelle, motif, auteur et correction tracée.
- Formulaires : cible et listes filtrées, valeurs calculables non demandées, effets confirmés.
- Rejeu : clés stables et garde en cours pour éviter un second effet.
- Échec : l'erreur remonte et les impacts créés sont journalisés, aucun échec critique silencieux.

## 5. Transformation Élevage

Cause initiale : le composant, le rendu et les handlers existaient, mais l'onglet avait disparu de la
configuration visible.

Correction finale :

- configuration unique Élevage avec huit vues ;
- Transformation entre Santé et Biosécurité et Coûts et performance ;
- alias majuscule, minuscule et anciens liens conservés ;
- clic, `initialTab`, lien profond, action animal, action lot et événement d'ouverture testés ;
- contrôle du délai de retrait sanitaire ;
- produit fini, rendement, pertes, stock, coûts, preuves et traçabilité raccordés ;
- aucune vente, aucun stock parallèle et aucun calcul financier concurrent dans Transformation.

Preuves : 14/14 tests officiels et 6/6 tests de configuration/navigation.

## 6. Supabase appliqué

Projet confirmé : `HORIZON FARM`, actif et sain.

- 12 migrations enregistrées ;
- 60/60 tables CRUD présentes ;
- 71/71 tables appelées par les sources présentes ;
- 99/99 tables métier présentes et auditées ;
- 0 table absente ;
- 0 anomalie distante.
- 86 assertions comportementales, 8 rôles, 2 fermes, 0 fuite, nettoyage complet.

Pour chaque table existante : `farm_id UUID NOT NULL`, FK, index, RLS forcée, lecture, insertion,
modification, suppression par rôle, et suppression logique durable. Les huit rôles sont normalisés
en base et dans l'application. Les accès financeur restent en lecture seule et filtrés aux contenus
publiés.

Preuve table par table : `docs/audits/SUPABASE_RLS_MATRIX.md`.

## 7. Design et ergonomie

- Tokens uniques et palette exacte de 18 couleurs.
- Fraunces et Inter chargées depuis la feuille centrale.
- Carte indicateur Horizon unique, variation selon le sens métier.
- Sept sections de navigation.
- Sept saisies quotidiennes disponibles partout.
- Indicateurs d'ouverture sur les 16 modules hors Accueil.
- Focus clavier, mouvement réduit, états vides et chargements.
- Aucun hexadécimal local, gradient, ombre ou taille arbitraire détecté dans les sources contrôlées.

`npm run audit:design` est vert.

## 8. Résultats finaux

| Commande ou preuve | Résultat |
|---|---|
| `npm run test:unit` | 235/235 fichiers, 0 échec |
| `npm run test:e2e:workflows` | 69/69 scénarios, 0 échec |
| `npm run test:unit:module-tabs-stability` | 416/416 |
| `npm run test:unit:business-events` | 5/5, exactement 26 événements |
| `npm run test:unit:i18n` | 4/4 |
| `npm run test:unit:farm-scope` | 52/52 |
| `npm run test:unit:idempotency` | 13/13 |
| `npm run test:unit:daily-entries` | 10/10 |
| `npm run lint` | 0 erreur |
| `npm run build` | réussi |
| `npm run audit:design` | réussi |
| `npm run audit:reachability` | 0 orphelin, 0 import non résolu |
| `npm audit --audit-level=moderate` | 0 vulnérabilité |
| `npm run db:migrate:verify` | 0 anomalie |
| `npm run db:migrate:matrix` | 99/99 conformes, 0 absence, 0 anomalie |
| `npm run db:migrate:isolation` | 86 assertions, 8 rôles, 2 fermes, 0 fuite |
| Audit navigateur | 15 modules, 82 onglets, 0 page d'erreur |
| `git diff --check` | réussi |

## 9. Limites déclarées

- Le test chronométré par une personne sur un téléphone réel reste à consigner. Le contrat et ses
  tests automatisés sont verts, mais cette preuve humaine ne peut pas être simulée honnêtement.
- Le build émet un avertissement non bloquant pour quelques bundles supérieurs à 500 kB.

Aucune autre limite fonctionnelle, de migration ou de fusion n'est laissée ouverte dans ce rapport.
