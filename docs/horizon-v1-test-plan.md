# Horizon Farm — Plan de test V1

## Objectif

Valider rapidement que la V1 Horizon est utilisable de bout en bout.

## Prérequis

- utilisateur connecté ;
- variables Supabase configurées ;
- données de démonstration chargées ;
- accès au module Centre IA ;
- Assistant Horizon visible en bas à droite.

## Test 1 — Assistant global

### Étapes

1. Ouvrir l'ERP.
2. Cliquer sur Activer Horizon.
3. Saisir ou dire : `ouvre ventes`.

### Résultat attendu

- Horizon répond ;
- le module ventes s'ouvre ;
- aucune erreur console bloquante.

## Test 2 — Question business

### Commande

`quel est mon CA ?`

### Résultat attendu

- Horizon répond avec CA, encaissé, créances ;
- le module ventes ou finances peut s'ouvrir.

## Test 3 — Achat stock progressif

### Commandes

1. `ajoute 20 sacs d aliment`
2. `chez Sanders`
3. `payé cash`
4. `date aujourd hui`
5. `valide`

### Résultat attendu

- brouillon créé ;
- champs complétés progressivement ;
- validation possible ;
- endpoint `/api/assistant/validate` appelé ;
- modules stock, finances, fournisseurs, traçabilité, Centre IA rafraîchis.

## Test 4 — Animal

### Commande

`ajoute une vache Gobra appelée Awa`

### Résultat attendu

- brouillon animal ;
- module animaux impacté ;
- validation possible ;
- traçabilité créée ou préparée.

## Test 5 — Lot avicole

### Commande

`crée un lot de 500 pondeuses`

### Résultat attendu

- brouillon lot avicole ;
- module avicole impacté ;
- validation possible.

## Test 6 — Validation vocale

### Commandes

- `valide`
- `annule`
- `recommence`

### Résultat attendu

- `valide` exécute ou tente l'exécution ;
- `annule` supprime le brouillon ;
- `recommence` réinitialise la conversation.

## Test 7 — Centre IA Proactif

### Étapes

1. Ouvrir Centre IA.
2. Vérifier les scores et risques.
3. Cliquer sur `Préparer` sur une action proactive.

### Résultat attendu

- Horizon s'ouvre ;
- un brouillon est chargé ;
- le brouillon peut être complété et validé.

## Test 8 — Automatisations Horizon

### Étapes

1. Ouvrir Centre IA.
2. Aller à la section Automatisations Horizon.
3. Cliquer sur `Ouvrir le brouillon`.

### Résultat attendu

- assistant Horizon ouvert ;
- brouillon semi-autonome prêt ;
- aucune exécution sans validation.

## Test 9 — Sécurité validation

### Étapes

1. Déconnecter l'utilisateur ou retirer le token.
2. Essayer une validation.

### Résultat attendu

- aucune écriture dangereuse ;
- réponse claire si token absent ;
- mode dry-run ou erreur contrôlée.

## Critères GO V1

La V1 est validée si :

- les tests 1 à 8 passent ;
- aucune erreur de compilation ;
- aucune erreur console bloquante ;
- validation réelle sécurisée ;
- Centre IA ouvre bien les brouillons Horizon ;
- auto-refresh fonctionne après validation.

## Bugs acceptables pour V1

- wake word natif sans clic absent ;
- reconnaissance vocale web imparfaite ;
- IA non LLM complète ;
- exécution limitée par permissions Supabase/RLS ;
- certaines recommandations perfectibles.

## Bugs bloquants V1

- application ne compile pas ;
- AssistantPanel plante ;
- CentreIA plante ;
- `validate` échoue systématiquement ;
- brouillon impossible à valider ;
- imports manquants ;
- page blanche.
