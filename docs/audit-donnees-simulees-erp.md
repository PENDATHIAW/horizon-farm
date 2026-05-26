# Audit ERP par données simulées — Horizon Farm

Branche auditée : `feature/objectifs-croissance-centre-decisionnel`

Source principale : `src/utils/horizonFarmSimulationSeed.js`

## Objectif

Auditer l'ERP à travers les données simulées, car ces données alimentent les modules et révèlent les écarts entre :

1. Ce que l'ERP affiche.
2. Ce que les données racontent.
3. Ce qu'un workflow métier réel devrait faire.

Cet audit met volontairement les corrections UI en pause pour stabiliser d'abord le scénario de simulation.

---

## Synthèse exécutive

Les données simulées sont riches et utiles, mais elles ne forment pas encore un scénario ERP totalement cohérent. Plusieurs modules affichent des cas contradictoires parce que les entités liées ne sont pas toujours synchronisées : ventes, paiements, clients, stock, animaux, cultures, traçabilité, documents et finances.

Le problème principal n'est pas un seul bug : c'est que le seed simule des morceaux de workflow sans toujours créer tous les objets liés.

Exemple type :

```text
Vente créée
→ paiement partiel ou complet
→ mais statut client pas recalculé dans la donnée
→ finance parfois enregistre une créance comme entrée cash
→ stock/culture/animal pas toujours décrémenté ou clôturé
→ traçabilité vide
```

---

## Priorité 0 — Stabiliser la simulation comme un scénario métier unique

Avant d'ajouter de nouvelles corrections UI, il faut transformer `horizonFarmSimulationSeed.js` en scénario contrôlé :

```text
BP initial
→ achats / investissements
→ animaux / avicole / cultures
→ production / récolte / stock
→ opportunités
→ ventes
→ paiements
→ clients
→ finances
→ documents
→ traçabilité
→ alertes / tâches
```

Chaque objet simulé doit avoir ses liens métiers : `source_module`, `source_id`, `related_id`, `client_id`, `order_id`, `payment_id`, `document_id`, `decision_key` ou `dedupe_key`.

---

# Constats critiques par domaine

## 1. Animaux

### Constat

La simulation crée des animaux vendus et des animaux prêts à vendre. Mais toutes les ventes correspondantes ne sont pas présentes.

Dans `buildAnimals()`, les bovins et ovins ont chacun plusieurs animaux déjà marqués `vendu`. Les caprins ont aussi un animal vendu. Pourtant, dans `buildSalesAndFinance()`, les ventes animaux ne couvrent que :

```text
HF-BOV-001
HF-OV-001
```

Il manque donc des ventes simulées pour :

```text
HF-BOV-002
HF-OV-002
HF-CAP-001
```

### Effet UI

Le module Animaux peut afficher des animaux vendus, mais Ventes / Finances / Traçabilité ne montrent pas forcément l'opération correspondante. Cela donne l'impression que les animaux disparaissent ou sont clôturés sans workflow réel.

### Correction recommandée

Ajouter pour chaque animal vendu :

```text
sales_order
sales_order_item
payment si payé
invoice/document si facture
finance transaction
business_event
trace lifecycle
```

---

## 2. Opportunités de vente Animaux

### Constat

La simulation génère des animaux prêts à vendre par logique interne : par exemple `HF-BOV-003`, `HF-OV-003`, `HF-CAP-002`. Mais la table `sales_opportunities` ne contient qu'une opportunité animal :

```text
HF-OPP-002 → HF-BOV-003
```

### Effet UI

Certains animaux peuvent être prêts dans Animaux mais absents de Ventes / Opportunités.

### Correction recommandée

Créer des opportunités pour tous les animaux prêts :

```text
animal-sale:HF-BOV-003
animal-sale:HF-OV-003
animal-sale:HF-CAP-002
```

Utiliser un statut unique compris par l'UI :

```text
ouverte
```

au lieu de mélanger `nouveau`, `ouverte`, `a_traiter`.

---

## 3. Avicole chair

### Constat

Le lot `HF-CH-003` est prêt à vendre, a une opportunité et une tâche associée. C'est un bon scénario. Mais l'opportunité utilise le statut `nouveau`, alors que les wrappers récents et certains écrans attendent plutôt `ouverte`.

### Effet UI

L'opportunité peut être visible dans certains panneaux, mais ignorée par d'autres filtres.

### Correction recommandée

Normaliser les opportunités simulées :

```text
status: 'ouverte'
statut: 'ouverte'
opportunity_key / dedupe_key renseignés
```

---

## 4. Avicole ponte / œufs

### Constat

La simulation contient 14 journaux de ponte d'environ 2990 à 3025 œufs par jour. Elle contient aussi une vente de 680 tablettes d'œufs, soit 20 400 œufs.

Mais il n'existe pas de stock explicite d'œufs ou de tablettes vendables. Le stock contient seulement :

```text
Alvéoles / tablettes 30 œufs
```

qui correspond à l'emballage, pas aux œufs produits.

### Effet UI

L'utilisateur voit de la production et une vente d'œufs, mais pas clairement :

```text
œufs produits
œufs cassés
œufs vendables
œufs vendus
stock restant
```

### Correction recommandée

Ajouter un stock produit fini :

```text
Œufs vendables / tablettes
```

Calculé depuis :

```text
production_oeufs_logs.vendables / 30 - tablettes vendues
```

Créer aussi des événements :

```text
production œufs
entrée stock œufs
sortie stock œufs vente HF-CMD-003
```

---

## 5. Cultures

### Constat

`HF-CULT-002` a :

```text
quantite_recoltee: 1680
quantite_disponible: 720
```

Puis une vente `HF-CMD-004` vend exactement 720 kg de tomates, avec livraison récupérée. Le stock contient aussi :

```text
Tomates Roma récoltées: 720 kg
```

### Incohérence

Si les 720 kg disponibles ont été vendus et récupérés, alors le stock disponible ne devrait plus être 720 kg. Il devrait être :

```text
0 kg disponible
```

ou alors la vente ne doit pas être considérée comme sortie/récupérée.

### Effet UI

Cultures, Stock et Ventes peuvent raconter trois histoires différentes :

```text
Culture : 720 disponible
Stock : 720 disponible
Vente : 720 vendu/récupéré
```

### Correction recommandée

Choisir un scénario clair :

Option A — vente déjà sortie :

```text
quantite_disponible culture = 0
stock tomates = 0
vente HF-CMD-004 = livrée/récupérée
client = créance impayée
```

Option B — vente promise mais pas encore sortie :

```text
stock tomates = 720
vente = à préparer / réservée
livraison = à livrer
```

Pour une démo réaliste, l'option A est plus simple.

---

## 6. Finances / créances

### Constat

La créance client `HF-CMD-004` est enregistrée dans finances comme :

```text
type: 'entree'
statut: 'impaye'
libelle: 'Créance client tomates Roma'
montant: 864000
```

### Incohérence métier

Une créance impayée n'est pas une entrée de trésorerie. Elle doit être une créance à recevoir, pas du cash encaissé.

### Effet UI

Finances peut gonfler les entrées réelles en incluant un montant non encaissé.

### Correction recommandée

Changer le modèle seed :

```text
type: 'creance'
statut: 'impaye'
cash_effect: false
```

ou retirer cette ligne des entrées cash et laisser Ventes/Clients calculer la créance depuis la commande non payée.

---

## 7. Clients

### Constat

Les clients sont créés avec des statuts génériques :

```text
VIP / Gros acheteur
actif
```

Mais leurs statuts ne reflètent pas les créances réelles.

### Effet UI

Avant le wrapper `ClientsV2`, un client payé pouvait rester avec un statut commercial non lié à la dette, et un client débiteur pouvait ne pas être marqué clairement à relancer.

### Correction recommandée

Séparer deux notions :

```text
segment_client: VIP / Restaurant / Grossiste
statut_paiement: a_jour / a_relancer
creance_reelle: calculée
```

Ne plus utiliser `statut` pour tout mélanger.

---

## 8. Santé

### Constat

`HF-SAN-005` est prévu il y a 4 jours, non effectué, mais son statut est :

```text
a_faire
```

alors qu'il devrait être :

```text
retard
```

### Effet UI

Santé peut ne pas déclencher clairement l'urgence ou peut sous-estimer le retard.

### Correction recommandée

Dans le seed :

```text
HF-SAN-005.statut = 'retard'
```

Ajouter :

```text
task liée
alerte liée
business_event santé retard
```

avec clé :

```text
health-action:HF-SAN-005
```

---

## 9. Santé / finances / documents

### Constat

Plusieurs interventions santé ont un coût et parfois une preuve photo, mais toutes ne créent pas de transaction finance ou de document.

Exemples :

```text
HF-SAN-002 coût 6500
HF-SAN-003 coût 26000
HF-SAN-005 coût 11000
```

### Effet UI

Santé affiche des dépenses, mais Finances / Comptabilité / Documents ne sont pas toujours alignés.

### Correction recommandée

Pour chaque soin réalisé avec `cout > 0` :

```text
finance transaction sortie
business_event intervention santé
option document/preuve si disponible
```

Pour les soins à faire : pas de sortie finance tant que non réalisé.

---

## 10. Stock

### Constat

Le stock existe, les journaux d'alimentation existent, mais le seed ne relie pas toujours les consommations au stock restant par mouvements.

Exemple :

```text
Aliment pondeuses stock = 4280 kg
journal alimentation pondeuses = 1450 kg consommés
```

On ne sait pas si 4280 est avant ou après consommation.

### Effet UI

Stock peut afficher des quantités sans historique clair.

### Correction recommandée

Ajouter des `business_events` ou une future table `stock_movements` simulée :

```text
entrée stock initial
sortie alimentation lot
sortie vente
perte/casse
```

---

## 11. Fournisseurs

### Constat

`Veto Sénégal Santé` a :

```text
dettes: 185000
```

Mais il n'y a pas de dette fournisseur structurée dans finances, ni tâche de paiement, ni document fournisseur.

### Effet UI

Fournisseurs peut montrer une dette sans que Finances ou Comptabilité puissent l'expliquer.

### Correction recommandée

Créer :

```text
finance payable fournisseur
task paiement fournisseur
alerte dette fournisseur
éventuel document facture fournisseur
```

---

## 12. Documents

### Constat

Les factures ventes existent pour les commandes avec `facture_emise = true`. Mais `HF-CMD-006` est payé sans facture.

### Effet UI

Documents peut signaler un justificatif manquant, mais le scénario ne dit pas si c'est voulu ou un oubli.

### Correction recommandée

Décider :

```text
HF-CMD-006 = vente comptoir sans facture officielle
```

ou créer une facture/document.

Ajouter aussi des documents pour :

```text
investissements réalisés
achats fournisseurs
preuves santé
vente importante
```

---

## 13. Traçabilité

### Constat critique

La simulation retourne :

```text
tracabilite: []
```

alors qu'elle contient déjà :

```text
animaux vendus
lots vendus
récolte
soins
paiements
livraisons
```

### Effet UI

Le module Traçabilité apparaît vide ou pauvre alors que le reste de l'ERP raconte beaucoup d'événements.

### Correction recommandée

Construire `tracabilite` depuis `business_events` ou générer explicitement :

```text
trace animal HF-BOV-001
trace lot HF-CH-001
trace culture HF-CULT-002
trace vente HF-CMD-004
```

---

## 14. Business events

### Constat

Les événements métiers couvrent quelques décisions et soins, mais pas tout le cycle réel. Les ventes, paiements, factures et livraisons simulés ne génèrent pas tous des événements dans le seed.

### Effet UI

Centre IA, Impact, Traçabilité et Sync ne voient pas toute l'histoire.

### Correction recommandée

Ajouter automatiquement au seed des événements pour :

```text
vente créée
paiement reçu
facture émise
livraison faite
stock sorti
client à relancer
```

---

## 15. Business Plan / Investissements

### Constat

Le BP simulé est trop minimal :

```text
business_plans: 1 ligne simple
bp_investment_lines: 3 investissements seulement
bp_recurring_costs: salaires uniquement
bp_revenue_projections: vide
bp_funding_sources: vide
bp_risks: vide
```

### Effet UI

Investissements peut sembler vide ou incomplet alors que le BP officiel Horizon Farm devrait contenir charges, projections, financement, risques et amortissement.

### Correction recommandée

Faire du seed simulation le reflet du BP officiel :

```text
BP Horizon Farm complet
investissements détaillés
charges mensuelles
projections CA
financements
risques
amortissement simplifié
```

---

# Corrections recommandées par ordre

## Sprint 1 — Cohérence commerciale

1. Compléter les ventes manquantes des animaux déjà vendus.
2. Ajouter les opportunités manquantes pour les animaux prêts.
3. Normaliser les statuts des opportunités en `ouverte`.
4. Corriger les créances : ne pas compter les impayés comme cash.
5. Corriger les statuts clients depuis les créances.

## Sprint 2 — Stock et production

1. Créer stock œufs/tablettes vendables.
2. Corriger tomates : stock 0 si vente récupérée, ou livraison à préparer si stock encore 720.
3. Ajouter mouvements stock simulés.
4. Lier alimentation logs aux sorties stock.

## Sprint 3 — Santé / documents / finances

1. Mettre `HF-SAN-005` en retard.
2. Créer tâche + alerte santé associées.
3. Créer transactions finance pour soins réalisés.
4. Ajouter documents manquants.

## Sprint 4 — Traçabilité / impact / sync

1. Remplir `tracabilite` depuis les événements.
2. Ajouter business events ventes/paiements/livraisons/factures.
3. Ajouter événements pour investissements et fournisseurs.
4. Faire du module Sync un vrai contrôleur de cohérence simulation.

## Sprint 5 — BP Horizon Farm

1. Remplacer le BP minimal par le BP officiel structuré.
2. Ajouter charges mensuelles.
3. Ajouter projections revenus.
4. Ajouter financements et risques.
5. Ajouter amortissement / récupération de l'investissement.

---

# Conclusion

L'ERP a une bonne architecture et les modules sont déjà riches. Mais la simulation doit devenir un scénario cohérent de bout en bout. Tant que les données simulées ne sont pas alignées, l'interface donnera l'impression d'être incohérente même si les composants sont bons.

La prochaine étape recommandée est de corriger `horizonFarmSimulationSeed.js` directement, en commençant par le sprint 1 : ventes, clients, paiements, créances et opportunités.
