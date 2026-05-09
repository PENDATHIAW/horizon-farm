# Audit Horizon Farm — modules riches, interconnexions et réduction de saisie

## Objectif produit

Horizon Farm doit rester un ERP agricole riche, mais l'utilisateur doit saisir le minimum. Chaque action métier simple doit alimenter automatiquement les modules concernés, avec possibilité de correction humaine avant validation.

Principe :

```text
1 action terrain simple = plusieurs modules mis à jour + traçabilité + finance + documents + alertes + tâches + impact business.
```

## État confirmé depuis App.jsx

Modules principaux chargés :

- Dashboard
- Animaux
- Avicole via AvicoleV8 / AvicoleV9 / AvicoleBase
- Santé & Vaccins via SanteV5
- Finances via FinancesV10
- Comptabilité via ComptabiliteV4
- Investissements via InvestissementsV8
- Impact Business
- Stock via StocksV3 + StockFlowPanel + StockStatusPanel
- Clients & WhatsApp
- Fournisseurs
- Traçabilité
- Centre Alertes
- Cultures via CulturesV3
- Smart Farm
- Ventes via VentesV2
- Documents via DocumentsV2
- Tâches via TachesV2
- Rapports
- Équipements
- Audit Logs
- Sync Offline

Modules internes / tables métier :

- Business Plans
- Lignes d'investissement BP
- Charges récurrentes BP
- Projections BP
- Sources de financement BP
- Risques BP
- Alimentation logs
- Production œufs
- Capteurs
- Caméras
- WhatsApp templates
- WhatsApp logs
- Commandes
- Lignes commande
- Livraisons
- Factures
- Paiements
- Opportunités de vente
- Business events

## Diagnostic global

### Points forts

- L'ERP est déjà très riche.
- `workflowService.js` existe déjà avec logique `prepare/commit`, `manual_override`, `auto_value`, `final_value`, `saisies_evitees`.
- `VentesV2` va déjà dans la bonne direction avec un workflow preview.
- `InvestissementsV8` transforme déjà certaines dépenses effectives en actifs opérationnels.
- `CulturesV3` a déjà intégré la logique Cultures, Parcelles & Campagnes.
- `StocksV3`, `StockFlowPanel` et `StockStatusPanel` montrent une vraie logique stock métier.
- `DocumentsV2` détecte les transactions sans justificatif.
- `TachesV2` transforme des alertes en tâches.
- `ImpactBusiness` mesure déjà la valeur créée, les risques et le temps gagné.

### Risques / manques transversaux

- Certaines automatisations existent dans les modules mais pas encore toujours via `workflowService`.
- Certaines alertes auto sont calculées à l'affichage mais pas persistées, donc difficilement actionnables et traçables.
- Les modules génériques comme Rapports et Équipements doivent être enrichis métier.
- La biosécurité doit devenir une couche transversale explicite.
- Les flux doivent éviter la double saisie et les doublons en base.
- Les valeurs automatiques doivent rester modifiables avec audit.

## Modules et axes d'amélioration

### 1. Ventes

Objectif : une vente doit déclencher automatiquement commande, facture, paiement, finance, mise à jour source vendue, client, document, alerte et trace.

Déjà fait : VentesV2 + workflow preview.

À renforcer :

- catégorisation finance dynamique selon animal, œuf, poulet, culture, stock, autre ;
- anti-doublon entre sales_orders, payments et transactions ;
- mise à jour source vendue : animal, lot, culture, stock ;
- facture/document automatique ;
- alerte si paiement partiel ;
- business_event complet.

### 2. Finances

Objectif : Finances doit être la vérité économique réelle, pas un module de double saisie.

À renforcer :

- toutes les écritures automatiques doivent avoir `module_lie`, `related_id`, `source_module`, `source_record_id` ;
- ventes synchronisées avec catégorie correcte ;
- dépenses santé, stock, équipement, investissement bien classées ;
- éviter les doublons ;
- permettre correction manuelle mais tracer via audit.

### 3. Stock

Objectif : Stock doit être le centre des intrants, aliments, médicaments, récoltes, équipements consommables.

Déjà fait : StocksV3, StockFlowPanel, StockStatusPanel.

À renforcer :

- formaliser les mouvements stock ;
- relier réception à fournisseur + finance + document ;
- relier sortie aliment à alimentation_logs + animaux/avicole ;
- relier sortie médicament à santé ;
- relier désinfectant à biosécurité ;
- alerte stock critique persistée ;
- correction inventaire avec justification.

### 4. Fournisseurs

Objectif : passer du suivi fournisseur à l'approvisionnement intelligent.

À renforcer :

- paiement fournisseur doit créer finance ;
- commande fournisseur doit créer flux stock attendu ;
- dette fournisseur doit être liée aux transactions ;
- score fournisseur basé sur prix, délai, qualité, dettes ;
- historique prix par produit.

### 5. Santé & Vaccins

Objectif : un soin doit alimenter santé, stock, finance, tâches, alertes, traçabilité et biosécurité si nécessaire.

À renforcer :

- stock médicament/vaccin décrémenté ;
- tâche de rappel automatique ;
- délai sanitaire avant vente ;
- alertes persistées en cas de retard ;
- bascule vers workflow biosécurité en cas de maladie/mortalité.

### 6. Biosécurité

Objectif : couche transversale de prévention sanitaire.

À intégrer dans Santé, Avicole, Animaux, Stock, Alertes, Tâches, Documents, Smart Farm.

Workflows :

- mortalité élevée → alerte biosécurité + tâche inspection + trace ;
- nouvel animal → quarantaine proposée ;
- fin lot avicole → vide sanitaire + nettoyage + désinfection ;
- maladie détectée → protocole biosécurité ;
- désinfectant utilisé → sortie stock + trace ;
- document sanitaire → Documents + Santé/Avicole/Animaux.

### 7. Animaux

Objectif : cheptel riche avec vente, santé, reproduction, coût et traçabilité.

À renforcer :

- vente animal par workflow ;
- coût alimentation auto depuis stock ;
- coût santé auto depuis santé ;
- quarantaine nouvel animal ;
- reproduction/mise bas → événements + tâches ;
- statut sous traitement bloquant ou avertissant la vente.

### 8. Avicole

Objectif : lot avicole riche avec ponte, chair, mortalité, alimentation, vente, réforme et biosécurité.

À renforcer :

- fin de cycle → workflow réforme/vente/vide sanitaire ;
- mortalité anormale → biosécurité ;
- alimentation auto depuis stock ;
- production œufs → stock vendable ou ventes ;
- baisse ponte → alerte + tâche inspection.

### 9. Cultures, Parcelles & Campagnes

Objectif : module déjà avancé, à connecter davantage.

À renforcer :

- récolte → stock récolte ou ventes ;
- dépense culture → finance ;
- intrants culture → sortie stock ;
- rendement faible → alerte ;
- campagne liée à investissement/business plan ;
- parcelle avec historique cultural.

### 10. Investissements / Business Plans

Objectif : prévision, business plan, ROI, effectif vs prévu.

À renforcer :

- ligne effective → finance + actif réel + document + trace ;
- lien vers cultures/avicole/animaux/équipements/stock ;
- écarts prévu/réel ;
- risques BP reliés aux alertes ;
- sources de financement reliées aux entrées finance.

### 11. Clients & WhatsApp

Objectif : CRM agricole simple et actionnable.

À renforcer :

- relance automatique impayés ;
- segmentation client ;
- historique achat depuis Ventes ;
- score fidélité basé sur commandes/paiements ;
- WhatsApp simulé puis réel plus tard ;
- fiche client enrichie sans ressaisie.

### 12. Documents

Objectif : justificatifs attachés automatiquement aux opérations.

Déjà fait : détection transactions sans justificatif.

À renforcer :

- document créé depuis vente, santé, investissement, stock, fournisseur, équipement ;
- classification automatique ;
- lien entity_type/entity_id/module_source ;
- contrôle pièces manquantes pour clôture comptable.

### 13. Tâches

Objectif : moteur d'exécution terrain.

Déjà fait : création depuis alertes.

À renforcer :

- tâches automatiques santé, biosécurité, stock, maintenance, récolte, relance ;
- checklist ;
- récurrence ;
- assignation ;
- preuve document/photo ;
- clôture qui crée business_event.

### 14. Alertes

Objectif : système proactif actionnable.

À renforcer :

- persister les alertes critiques automatiques ;
- éviter recréation en boucle ;
- actions rapides par type d'alerte ;
- créer tâche, WhatsApp, trace ou workflow selon cas ;
- intégrer biosécurité.

### 15. Traçabilité / Business Events

Objectif : journal métier transversal.

À renforcer :

- chaque workflow doit créer un business_event ;
- normaliser event_type ;
- lier document/transaction/vente/tâche/alerte ;
- afficher `saisies_evitees` quand disponible.

### 16. Comptabilité

Objectif : contrôle et validation, pas double saisie opérationnelle.

À renforcer :

- utiliser transactions financières comme source ;
- signaler opérations sans justificatif ;
- vérifier impayés/dettes/écritures ;
- préparer compte résultat simplifié.

### 17. Équipements

Objectif : passer d'un CRUD matériel à un module maintenance/actifs.

À renforcer :

- panne → alerte + tâche + finance si réparation ;
- maintenance due → tâche ;
- achat équipement → investissement/finance/document ;
- taux disponibilité ;
- coût maintenance cumulé.

### 18. Rapports

Objectif : rapports générés, pas juste programmés.

À créer :

- rapport financier ;
- rapport ventes ;
- rapport stock ;
- rapport avicole ;
- rapport animaux ;
- rapport cultures ;
- rapport santé/biosécurité ;
- rapport investissement ;
- rapport impact business.

### 19. Smart Farm

Objectif : capteurs/caméras comme sources d'alertes et tâches.

À renforcer :

- capteur offline → alerte + tâche ;
- température/humidité/eau → alerte ;
- lien biosécurité ;
- recommandations météo transformables en tâches.

### 20. Impact Business

Objectif : prouver la valeur de l'ERP.

À renforcer :

- KPI saisies évitées ;
- workflows automatisés ;
- incidents sanitaires évités ;
- documents manquants évités ;
- valeur liée à interconnexion.

### 21. Sync Offline

Objectif : workflows compatibles terrain.

À renforcer :

- workflows en queue offline ;
- replay avec audit + business_event ;
- conflit local/serveur ;
- affichage erreurs de sync.

### 22. Audit Logs

Objectif : sécurité et contrôle.

À renforcer :

- tracer corrections manuelles des valeurs automatiques ;
- tracer workflow commit ;
- before/after si possible ;
- filtres module/action/date.

## Priorité de développement

1. Stabiliser Ventes → Finances → Clients → Documents → Traçabilité.
2. Stabiliser Stock → Fournisseurs → Finances → Alimentation.
3. Renforcer Santé → Stock → Alertes → Tâches → Biosécurité.
4. Renforcer Investissements → actifs réels → Finances → Documents.
5. Connecter Cultures → Stock/Ventes/Finances/Alertes.
6. Enrichir Équipements.
7. Transformer Rapports en générateur réel.
8. Ajouter KPI saisies évitées dans Impact Business.
9. Fiabiliser Sync Offline + Audit Logs.

## Règle UX non négociable

L'ERP propose, l'utilisateur confirme ou corrige.

- Badge Auto pour valeur calculée.
- Badge Modifié pour correction manuelle.
- Bouton Recalculer.
- Aucun écrasement silencieux.
- Audit des corrections.

## Premières corrections réalisées dans cette branche

- `financeSyncService.js` : catégorisation dynamique des ventes, liens source, champs business plan/investment, et logique d'upsert/anti-doublon.
