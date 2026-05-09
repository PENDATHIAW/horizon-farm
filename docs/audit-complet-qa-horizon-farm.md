# Audit complet QA — Horizon Farm

Ce document complète :

- `docs/ameliorations-continues-horizon-farm.md`
- `docs/audit-interconnexions-modules-riches.md`
- les tests Playwright dans `tests/e2e/`

Objectif : tester Horizon Farm comme un ERP complet, pas comme une suite de modules isolés.

---

## Bugs métier observés en test manuel — à corriger en priorité

Ces anomalies viennent de tests utilisateur réels et doivent être traitées avant de considérer les blocs concernés comme stabilisés.

### 1. Animaux / Avicole → prêt à la vente non persistant

**Observation :** lorsqu’un animal ou un lot est confirmé comme `prêt à la vente`, la confirmation semble acceptée, mais en revenant sur la fiche la valeur repasse à `non`.

**Résultat attendu :** la valeur confirmée doit persister dans la fiche animal/lot après sauvegarde, refresh, changement de module et reconnexion.

**Modules impactés :** Animaux, Avicole, Ventes, Opportunités de vente, Traçabilité/Audit.

**À vérifier/corriger :**

- [ ] le champ sauvegardé côté animal/lot est le même que le champ relu par la fiche ;
- [ ] pas de conflit de noms entre `pret_vente`, `pret_a_la_vente`, `ready_for_sale`, `sale_ready`, `statut_vente` ou équivalent ;
- [ ] la normalisation Supabase ne supprime pas silencieusement la colonne ;
- [ ] le refresh du module relit bien la valeur mise à jour ;
- [ ] une correction manuelle de ce statut ne doit pas être écrasée par un recalcul automatique ;
- [ ] créer un business event ou audit log lorsque le statut prêt à la vente est confirmé.

### 2. Prêt à la vente → opportunité de vente non créée ou non visible

**Observation :** après confirmation d’un animal ou lot comme prêt à la vente, l’opportunité n’apparaît pas dans `Ventes > Opportunités de vente`.

**Résultat attendu :** confirmer prêt à la vente doit créer ou mettre à jour une opportunité de vente visible dans le module Ventes.

**Modules impactés :** Animaux, Avicole, Ventes, Opportunités de vente, Clients potentiels, Traçabilité.

**Workflow attendu :**

```txt
Animal ou lot confirmé prêt à la vente
→ fiche animal/lot mise à jour
→ opportunité de vente créée ou mise à jour
→ opportunité visible dans Ventes
→ trace/business_event créé
→ pas de doublon si on confirme plusieurs fois
```

**À vérifier/corriger :**

- [ ] `onCreateOpportunity` est bien appelé depuis Animaux/Avicole ;
- [ ] l’opportunité utilise le bon `source_module`, `source_type`, `source_id` et `related_id` ;
- [ ] le module Ventes lit bien la même table/champs que ceux écrits ;
- [ ] les opportunités déjà existantes sont mises à jour au lieu d’être dupliquées ;
- [ ] une opportunité fermée/vendue ne doit plus rester proposée comme nouvelle opportunité active.

### 3. Workflow vente encore affiché alors que la commande est soldée

**Observation :** des clients/commandes déjà encaissés et payés gardent encore un workflow d’encaissement visible. Le montant affiché est parfois `0`, ce qui n’est pas logique.

**Résultat attendu :** si `reste_a_payer = 0` ou si `statut_paiement = paye`, le workflow d’encaissement ne doit plus être proposé comme action à faire. Une commande soldée doit sortir des listes d’encaissement et des workflows actifs.

**Modules impactés :** Ventes, Paiements, Factures, Clients, Finances, Dashboard/Alertes.

**À vérifier/corriger :**

- [ ] filtrer les workflows ventes actifs sur `reste_a_payer > 0` ou `statut_paiement != paye` ;
- [ ] masquer les actions d’encaissement à montant `0` ;
- [ ] recalculer `reste_a_payer = max(0, montant_total - montant_paye)` après chaque paiement ;
- [ ] si une commande est payée, son statut doit être cohérent dans ventes, paiements, clients et finances ;
- [ ] les factures payées ne doivent pas générer de relance ou workflow de paiement ;
- [ ] créer un test e2e paiement complet : après encaissement final, l’action d’encaissement disparaît.

### 4. Clients & WhatsApp : statut à relancer alors que la créance est à zéro

**Observation :** un client qui devait de l’argent reste avec le statut `à relancer` dans Clients & WhatsApp après paiement complet, alors que sa dette est à `0`.

**Résultat attendu :** un client ne doit être à relancer que si `creances > 0`, `reste_a_payer_total > 0`, ou s’il existe une commande/facture réellement impayée ou partielle. Si le client ne doit plus rien, le statut de relance doit être désactivé ou passé à jour.

**Modules impactés :** Clients & WhatsApp, Ventes, Paiements, Factures, Alertes, Tâches, Finances.

**Workflow attendu :**

```txt
Client paie le solde
→ paiement créé
→ commande soldée
→ reste_a_payer = 0
→ créance client = 0
→ relance client désactivée
→ alerte créance clôturée ou résolue
→ tâche relance clôturée ou marquée sans objet
→ WhatsApp ne propose plus de relance impayé
```

**À vérifier/corriger :**

- [ ] le module Clients recalcule ses créances depuis ventes/paiements/factures, pas seulement depuis un ancien champ statique ;
- [ ] le statut `a_relancer` dépend d’une dette réelle strictement supérieure à zéro ;
- [ ] après paiement complet, les alertes/tâches de relance liées sont mises à jour ;
- [ ] les relances WhatsApp ne doivent pas être proposées pour un client soldé ;
- [ ] créer un test e2e client : dette initiale → paiement complet → statut relance disparaît.

---

## Principe

Un module n’est pas considéré comme terminé parce qu’il s’affiche.

Il est considéré comme terminé seulement si :

- il s’ouvre sans erreur visible ;
- ses boutons principaux fonctionnent ;
- ses formulaires ne contiennent pas de champs incohérents ;
- ses listes déroulantes sont filtrées selon les entités réellement disponibles ;
- ses champs dépendants se remplissent ou se réinitialisent correctement ;
- ses actions mettent réellement à jour les modules liés ;
- aucun doublon n’est créé après double clic, refresh ou revalidation ;
- aucun message technique ou commentaire brouillon n’est visible dans l’interface ;
- les statuts restent cohérents entre les modules ;
- les données créées sont traçables.

---

## Audit global module par module

À couvrir systématiquement :

- Dashboard
- Animaux
- Avicole
- Santé & Biosécurité
- Finances
- Comptabilité
- Investissements
- Impact Business
- Stock
- Clients & WhatsApp
- Ventes
- Fournisseurs
- Traçabilité
- Centre Alertes
- Cultures
- Documents
- Tâches
- Rapports
- Équipements
- Smart Farm
- Audit Logs
- Sync Offline

Pour chaque module :

- [ ] ouverture sans crash ;
- [ ] absence de `undefined`, `null`, `NaN`, `[object Object]` ;
- [ ] absence de messages techniques visibles ;
- [ ] boutons principaux testés ;
- [ ] modales/formulaires testés ;
- [ ] listes déroulantes cohérentes ;
- [ ] champs liés cohérents ;
- [ ] état vide compréhensible si aucune donnée ;
- [ ] interconnexions vérifiées dans les modules liés ;
- [ ] traces/audit/business events créés quand nécessaire.

---

## Audit des interconnexions critiques

### Ventes

À vérifier :

```txt
Vente
→ paiement
→ facture
→ finance
→ client
→ source vendue : stock / animal / lot / culture
→ document
→ traçabilité
→ alerte créance si reste à payer
```

Cas à tester :

- [ ] vente sans paiement ;
- [ ] paiement partiel ;
- [ ] paiement complet ;
- [ ] facture émise ;
- [ ] commande déjà soldée absente de l’encaissement ;
- [ ] double validation sans doublon.

### Stock / Fournisseurs

À vérifier :

```txt
Réception stock payée
→ stock
→ finance sortie
→ document
→ trace

Réception stock avec dette
→ stock
→ dette fournisseur
→ alerte
→ tâche
→ document
→ trace
```

Cas à tester :

- [ ] réception payée ;
- [ ] réception avec dette fournisseur ;
- [ ] sortie stock ;
- [ ] perte stock ;
- [ ] seuil critique ;
- [ ] pas de doublon document/dette/alerte.

### Santé & Biosécurité

À vérifier :

```txt
Soin / vaccin / biosécurité
→ santé
→ stock si source interne
→ finance si coût
→ tâche
→ alerte si risque
→ document/preuve si présent
→ trace
```

Cas à tester :

- [ ] stock interne avec quantité suffisante ;
- [ ] stock interne avec quantité insuffisante ;
- [ ] produit vétérinaire ;
- [ ] achat direct ;
- [ ] aucun produit ;
- [ ] maladie/mortalité déclenchant biosécurité.

### Animaux

À vérifier :

```txt
Animal malade / blessé / sous traitement
→ suivi santé
→ tâche
→ alerte
→ trace
→ animal mis à jour
→ blocage ou avertissement vente si nécessaire
```

### Avicole

À vérifier :

```txt
Lot malade / mortalité élevée / baisse ponte
→ suivi santé
→ biosécurité
→ tâche
→ alerte
→ trace
→ lot mis à jour
```

### Cultures

À vérifier :

```txt
Intrant utilisé
→ sortie stock
→ coût campagne/parcelle
→ trace

Récolte
→ stock récolte
→ rendement
→ trace

Vente récolte
→ vente
→ paiement/facture
→ finance
→ client
→ stock décrémenté
```

### Investissements / Business Plans

À vérifier :

```txt
Ligne BP validée
→ investissement réel
→ finance
→ document
→ actif réel si applicable
→ trace
→ écart prévu/réel
```

### Alertes / Tâches / Documents / Traçabilité

À vérifier :

```txt
alerte
→ tâche/action rapide
→ document/preuve si nécessaire
→ trace
→ statut mis à jour
```

---

## Audit UX et cohérence métier

À vérifier partout :

- [ ] un module sans entité valide n’est pas proposé comme choix actif ;
- [ ] une liste parent filtre correctement la liste enfant ;
- [ ] changer un parent réinitialise les enfants devenus invalides ;
- [ ] les champs connus ne sont pas redemandés ;
- [ ] les champs automatiques sont visibles comme automatiques ;
- [ ] les corrections manuelles sont conservées ;
- [ ] les messages d’erreur sont métier, pas techniques ;
- [ ] les statuts ne sont pas mélangés.

Exemple :

```txt
Si l’utilisateur choisit module = Animaux,
la liste d’entités doit proposer uniquement des animaux actifs.
Si aucun animal actif n’existe,
Animaux ne doit pas être proposé comme choix actif ou doit être désactivé avec une explication claire.
```

---

## Audit des tests ajoutés par les agents

L’autre agent peut ajouter des tests au fil de l’eau. Ils doivent être pris en compte dans l’audit.

À chaque revue :

- [ ] regarder les nouveaux fichiers dans `tests/e2e/` ;
- [ ] vérifier si les tests couvrent seulement l’affichage ou aussi les interconnexions ;
- [ ] vérifier si les tests utilisent des données stables ;
- [ ] vérifier si les tests sont trop permissifs ;
- [ ] vérifier si les tests ignorent des erreurs console ;
- [ ] vérifier si les rapports Playwright sont disponibles ;
- [ ] vérifier si les échecs sont analysés et transformés en corrections.

Un test e2e utile doit dire clairement :

```txt
Action faite
Résultat attendu
Module lié vérifié
Anomalie détectée si écart
```

---

## Niveaux de tests Playwright attendus

### Niveau 1 — Smoke test global

Déjà amorcé dans `tests/e2e/user-smoke.spec.js`.

But : connexion, ouverture de tous les modules, absence d’erreurs visibles.

### Niveau 2 — Scénarios métier QA

Déjà amorcé dans `tests/e2e/business-scenarios.spec.js`.

But : ouvrir les actions métiers, formulaires, modales, champs liés.

### Niveau 3 — Workflows complets

À ajouter progressivement :

- vente complète ;
- paiement partiel puis paiement final ;
- réception stock payée ;
- réception stock avec dette ;
- soin avec stock interne ;
- soin avec produit externe ;
- récolte vers stock ;
- vente récolte ;
- alerte vers tâche ;
- double clic / refresh / revalidation anti-doublon ;
- prêt à la vente animal/lot → opportunité visible dans Ventes ;
- client à relancer → paiement complet → relance disparaît.

---

## Rapport d’audit attendu

Chaque audit doit produire un résumé sous cette forme :

```txt
Module :
Action testée :
Résultat attendu :
Résultat observé :
Anomalie : oui/non
Gravité : bloquant / majeur / moyen / mineur
Modules liés impactés :
Correction recommandée :
Test à ajouter ou modifier :
```

---

## Critères avant sortie du mode Draft

La PR ne devrait pas sortir du mode Draft tant que :

- [ ] les modules principaux s’ouvrent sans erreur ;
- [ ] les workflows critiques ont au moins un test e2e ou une checklist manuelle documentée ;
- [ ] les erreurs Playwright connues sont corrigées ou justifiées ;
- [ ] les interconnexions critiques sont vérifiées ;
- [ ] les listes déroulantes dépendantes sont cohérentes ;
- [ ] les doublons critiques sont évités ;
- [ ] les messages techniques visibles sont supprimés ;
- [ ] le fichier `docs/ameliorations-continues-horizon-farm.md` est à jour ;
- [ ] les nouveaux tests ajoutés par les agents ont été relus et pris en compte ;
- [ ] les bugs métier observés en test manuel ci-dessus sont corrigés ou explicitement suivis.
