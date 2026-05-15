# Audit Horizon Farm — modules riches, interconnexions et réduction de saisie

## Objectif produit

Horizon Farm doit rester un ERP agricole riche, mais l'utilisateur doit saisir le minimum. Chaque action métier simple doit alimenter automatiquement les modules concernés, avec possibilité de correction humaine avant validation.

Principe :

```text
1 action terrain simple = plusieurs modules mis à jour + traçabilité + finance + documents + alertes + tâches + impact business.
```

## État confirmé depuis App.jsx

Modules principaux chargés : Dashboard, Animaux, Avicole, Santé & Vaccins, Finances, Comptabilité, Investissements, Impact Business, Stock, Clients & WhatsApp, Fournisseurs, Traçabilité, Centre Alertes, Cultures, Smart Farm, Ventes, Documents, Tâches, Rapports, Équipements, Audit Logs, Sync Offline.

Modules internes / tables métier : Business Plans, lignes investissement BP, charges récurrentes BP, projections BP, sources de financement BP, risques BP, alimentation logs, production œufs, capteurs, caméras, WhatsApp templates/logs, commandes, lignes commande, livraisons, factures, paiements, opportunités vente, business events.

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

À renforcer : catégorisation finance dynamique, anti-doublon ventes/paiements/transactions, mise à jour source vendue, facture/document automatique, alerte si paiement partiel, business_event complet.

### 2. Finances

Objectif : Finances doit être la vérité économique réelle, pas un module de double saisie.

À renforcer : `module_lie`, `related_id`, `source_module`, `source_record_id`, catégories cohérentes, anti-doublon, correction manuelle auditée.

### 3. Stock

Objectif : Stock doit être le centre des intrants, aliments, médicaments, récoltes, équipements consommables.

À renforcer : mouvements stock, réception fournisseur + finance + document, sortie aliment vers alimentation_logs, sortie médicament vers santé, désinfectant vers biosécurité, alertes critiques persistées, correction inventaire justifiée.

### 4. Fournisseurs

Objectif : passer du suivi fournisseur à l'approvisionnement intelligent.

À renforcer : paiement fournisseur vers finance, commande fournisseur vers stock attendu, dettes liées aux transactions, score fournisseur, historique prix par produit.

### 5. Santé & Vaccins

Objectif : un soin doit alimenter santé, stock, finance, tâches, alertes, traçabilité et biosécurité si nécessaire.

À renforcer : décrément stock médicament/vaccin, tâche rappel, délai sanitaire avant vente, alertes persistées, bascule biosécurité maladie/mortalité.

### 6. Biosécurité

Objectif : couche transversale de prévention sanitaire.

À intégrer dans Santé, Avicole, Animaux, Stock, Alertes, Tâches, Documents, Smart Farm.

Workflows : mortalité élevée → alerte + tâche inspection + trace ; nouvel animal → quarantaine ; fin lot avicole → vide sanitaire/nettoyage/désinfection ; maladie → protocole biosécurité ; désinfectant utilisé → sortie stock + trace ; document sanitaire → Documents + entité liée.

### 7. Animaux

À renforcer : vente animal par workflow, coût alimentation auto, coût santé auto, quarantaine nouvel animal, reproduction/mise bas vers événements/tâches, statut sous traitement qui avertit ou bloque vente.

### 8. Avicole

À renforcer : fin cycle → réforme/vente/vide sanitaire, mortalité anormale → biosécurité, alimentation auto, production œufs → stock vendable ou ventes, baisse ponte → alerte + tâche inspection.

### 9. Cultures, Parcelles & Campagnes

À renforcer : récolte → stock ou ventes, dépense culture → finance, intrants → sortie stock, rendement faible → alerte, campagne liée à business plan/investissement, historique cultural.

### 10. Investissements / Business Plans

À renforcer : ligne effective → finance + actif réel + document + trace, écarts prévu/réel, risques BP reliés aux alertes, financements reliés aux entrées finance.

### 11. Clients & WhatsApp

À renforcer : relance impayés, segmentation client, historique achat depuis ventes, score fidélité commandes/paiements, WhatsApp simulé puis réel, fiche client enrichie sans ressaisie.

### 12. Documents

À renforcer : création depuis vente/santé/investissement/stock/fournisseur/équipement, classification automatique, liens `entity_type/entity_id/module_source`, contrôle pièces manquantes pour comptabilité.

### 13. Tâches

À renforcer : tâches automatiques santé, biosécurité, stock, maintenance, récolte, relance, checklist, récurrence, assignation, preuve document/photo, clôture vers business_event.

### 14. Alertes

À renforcer : persister alertes critiques auto, éviter recréation en boucle, actions rapides par type d'alerte, créer tâche/WhatsApp/trace/workflow, intégrer biosécurité.

### 15. Traçabilité / Business Events

À renforcer : chaque workflow crée un business_event, normaliser event_type, lier document/transaction/vente/tâche/alerte, afficher `saisies_evitees`.

### 16. Comptabilité

À renforcer : source depuis transactions, opérations sans justificatif, impayés/dettes/écritures, compte résultat simplifié.

### 17. Équipements

À renforcer : panne → alerte + tâche + finance, maintenance due → tâche, achat équipement → investissement/finance/document, taux disponibilité, coût maintenance cumulé.

### 18. Rapports

À créer : rapports financier, ventes, stock, avicole, animaux, cultures, santé/biosécurité, investissement, impact business.

### 19. Smart Farm

À renforcer : capteur offline → alerte + tâche, température/humidité/eau → alerte, lien biosécurité, recommandations météo transformables en tâches.

### 20. Impact Business

À renforcer : KPI saisies évitées, workflows automatisés, incidents sanitaires évités, documents manquants évités, valeur liée à interconnexion.

### 21. Sync Offline

À renforcer : workflows en queue offline, replay avec audit + business_event, conflit local/serveur, affichage erreurs de sync.

### 22. Audit Logs

À renforcer : corrections manuelles, workflow commit, before/after si possible, filtres module/action/date.

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
- `workflowService.js` : workflow vente plus sûr, métadonnées automatiques, et workflow biosécurité transversal.
