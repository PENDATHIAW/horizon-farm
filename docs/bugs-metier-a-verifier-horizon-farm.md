# Bugs métier à vérifier — Horizon Farm

Cette fiche complète :

- `docs/ameliorations-continues-horizon-farm.md`
- `docs/audit-complet-qa-horizon-farm.md`

Objectif : lister les anomalies métier observées en test manuel et à corriger avant de considérer les blocs comme stabilisés.

---

## 1. Clients & WhatsApp — client encore `à relancer` alors que la dette est à 0

**Statut : [À revoir] prioritaire**

### Observation

Un client qui devait de l’argent reste affiché comme `à relancer` après paiement complet, alors que sa dette ou son reste à payer est à `0`.

### Risque métier

- relance abusive d’un client qui a déjà payé ;
- perte de confiance utilisateur ;
- alerte créance obsolète ;
- tâche de relance inutile ;
- incohérence entre Ventes, Paiements, Clients, Factures et WhatsApp.

### Cause probable à vérifier

Dans `Clients.jsx`, le calcul peut utiliser un ancien champ persistant de commande, par exemple `order.reste_a_payer`, au lieu de recalculer depuis les paiements réels.

Règle attendue :

```txt
reste_a_payer_client = somme max(0, montant_total_commande - paiements_valides_commande)
```

`order.reste_a_payer` ne doit être utilisé que comme fallback si aucun paiement fiable n’est disponible.

### À vérifier / corriger

- [ ] recalculer le reste à payer depuis les paiements valides, non annulés ;
- [ ] ignorer les paiements annulés ou invalides ;
- [ ] si `reste_a_payer_total <= 0`, le client ne doit plus être dans `clientsARelancer` ;
- [ ] si `reste_a_payer_total <= 0`, le statut intelligent ne doit pas être `a_relancer` ;
- [ ] si `reste_a_payer_total <= 0`, masquer le bouton `Relancer` ;
- [ ] si `reste_a_payer_total <= 0`, ne plus proposer de relance WhatsApp pour impayé ;
- [ ] clôturer ou masquer les alertes créance liées si elles existent ;
- [ ] clôturer ou masquer les tâches de relance liées si elles existent ;
- [ ] vérifier que Ventes, Paiements, Clients et Factures affichent le même état soldé ;
- [ ] ajouter un test e2e : client avec dette → paiement complet → retour Clients & WhatsApp → le client n’est plus `à relancer`.

### Workflow attendu

```txt
Client paie le solde
→ paiement créé
→ commande soldée
→ reste_a_payer = 0
→ créance client = 0
→ statut client ≠ a_relancer
→ bouton Relancer masqué
→ alerte créance clôturée ou non active
→ tâche relance clôturée ou non active
→ WhatsApp ne propose plus relance impayé
```

---

## 2. Animaux / Avicole — `prêt à la vente` ne persiste pas

**Statut : [À revoir] prioritaire**

### Observation

Lorsqu’un animal ou un lot est confirmé comme `prêt à la vente`, la confirmation semble acceptée, mais en revenant sur la fiche la valeur repasse à `non`.

### Résultat attendu

La valeur confirmée doit persister dans la fiche animal/lot après sauvegarde, refresh, changement de module et reconnexion.

### Modules impactés

Animaux, Avicole, Ventes, Opportunités de vente, Traçabilité, Audit Logs.

### À vérifier / corriger

- [ ] le champ sauvegardé côté animal/lot est le même que le champ relu par la fiche ;
- [ ] pas de conflit de noms entre `pret_vente`, `pret_a_la_vente`, `ready_for_sale`, `sale_ready`, `statut_vente` ou équivalent ;
- [ ] la normalisation Supabase ne supprime pas silencieusement la colonne ;
- [ ] le refresh du module relit bien la valeur mise à jour ;
- [ ] une correction manuelle de ce statut ne doit pas être écrasée par un recalcul automatique ;
- [ ] créer un business event ou audit log lorsque le statut prêt à la vente est confirmé.

---

## 3. Animaux / Avicole → opportunité de vente non visible

**Statut : [À revoir] prioritaire**

### Observation

Après confirmation d’un animal ou lot comme prêt à la vente, l’opportunité n’apparaît pas dans `Ventes > Opportunités de vente`.

### Workflow attendu

```txt
Animal ou lot confirmé prêt à la vente
→ fiche animal/lot mise à jour
→ opportunité de vente créée ou mise à jour
→ opportunité visible dans Ventes
→ trace/business_event créé
→ pas de doublon si on confirme plusieurs fois
```

### À vérifier / corriger

- [ ] `onCreateOpportunity` est bien appelé depuis Animaux/Avicole ;
- [ ] l’opportunité utilise le bon `source_module`, `source_type`, `source_id` et `related_id` ;
- [ ] le module Ventes lit bien la même table/champs que ceux écrits ;
- [ ] les opportunités déjà existantes sont mises à jour au lieu d’être dupliquées ;
- [ ] une opportunité fermée/vendue ne doit plus rester proposée comme nouvelle opportunité active.

---

## 4. Ventes — workflow d’encaissement encore visible alors que la commande est soldée

**Statut : [À revoir] prioritaire**

### Observation

Des clients/commandes déjà encaissés et payés gardent encore un workflow d’encaissement visible. Le montant affiché est parfois `0`.

### Résultat attendu

Si `reste_a_payer = 0` ou si `statut_paiement = paye`, le workflow d’encaissement ne doit plus être proposé comme action à faire.

### À vérifier / corriger

- [ ] filtrer les workflows ventes actifs sur `reste_a_payer > 0` ou `statut_paiement != paye` ;
- [ ] masquer les actions d’encaissement à montant `0` ;
- [ ] recalculer `reste_a_payer = max(0, montant_total - montant_paye)` après chaque paiement ;
- [ ] si une commande est payée, son statut doit être cohérent dans Ventes, Paiements, Clients et Finances ;
- [ ] les factures payées ne doivent pas générer de relance ou workflow de paiement ;
- [ ] créer un test e2e paiement complet : après encaissement final, l’action d’encaissement disparaît.

---

## 5. Cultures — récolte / stock / vente à auditer comme Animaux et Avicole

**Statut : [À revoir] prioritaire**

### Observation à surveiller

Les cultures doivent suivre la même logique de cohérence que les animaux/lots. Si une culture, parcelle ou campagne est marquée comme récoltée, vendable ou prête à vendre, l’état doit persister et déclencher les bons liens métier.

### Workflow attendu — récolte

```txt
Culture / parcelle / campagne récoltée
→ fiche culture/campagne mise à jour
→ quantité récoltée persistée
→ stock récolte créé ou mis à jour
→ rendement calculé
→ trace/business_event créé
→ alerte si rendement faible ou perte
```

### Workflow attendu — culture vendable

```txt
Récolte confirmée vendable
→ stock récolte disponible
→ opportunité de vente créée ou mise à jour
→ source visible dans Ventes
→ vente possible uniquement si quantité disponible > 0
→ pas de doublon si confirmation répétée
```

### Workflow attendu — vente récolte

```txt
Vente récolte
→ commande vente créée
→ paiement/facture selon workflow vente
→ finance entrée
→ client mis à jour
→ stock récolte décrémenté
→ trace/business_event créé
→ alerte créance si paiement partiel
```

### À vérifier / corriger

- [ ] le statut récolté/vendable d’une culture persiste après refresh et retour fiche ;
- [ ] pas de conflit entre `statut`, `statut_culture`, `statut_recolte`, `vendable`, `ready_for_sale` ou équivalent ;
- [ ] une récolte crée/met à jour un stock avec `source_module = cultures` et `source_id` cohérent ;
- [ ] le module Ventes lit bien les récoltes/stock cultures vendables ;
- [ ] une culture sans quantité disponible ne doit pas être proposée comme source active de vente ;
- [ ] la vente d’une récolte décrémente le bon stock ou la bonne quantité vendable ;
- [ ] les coûts intrants sortis du stock alimentent la campagne/parcelle ;
- [ ] les marges culture/rapport/impact business se basent sur les ventes et coûts réels ;
- [ ] créer un test e2e : culture récoltée → stock récolte visible → source vente disponible ;
- [ ] créer un test e2e : vente récolte → stock décrémenté → finance/client/trace mis à jour.

---

## Règle de clôture

Aucun de ces points ne doit être marqué `[Traité]` sans preuve :

```txt
1. test manuel réussi ;
2. test e2e ajouté ou mis à jour ;
3. interconnexion vérifiée dans les modules liés ;
4. absence de doublon après refresh/double clic ;
5. absence de message technique visible côté utilisateur.
```
