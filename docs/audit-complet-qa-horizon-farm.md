# Audit complet QA — Horizon Farm

Ce document complète :

- `docs/ameliorations-continues-horizon-farm.md`
- `docs/audit-interconnexions-modules-riches.md`
- les tests Playwright dans `tests/e2e/`

Objectif : tester Horizon Farm comme un ERP complet, pas comme une suite de modules isolés.

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
- double clic / refresh / revalidation anti-doublon.

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
- [ ] les nouveaux tests ajoutés par les agents ont été relus et pris en compte.
