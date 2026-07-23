# Synchronisation hors ligne v2 (HF-P1-001)

Objectif (feuille de route d'audit) : passer d'un rejeu « dernier écrivain
gagne » à une file **versionnée**, **idempotente** et **résistante aux
conflits**. Ce document décrit l'état livré et la suite.

## Sous-lot a — Mutations versionnées + détection de conflit *(livré)*

### Ce qui change

1. **Bug d'identifiant corrigé.** La file écrivait l'identifiant réel de
   l'enregistrement dans `recordId`, mais le rejeu et la déduplication utilisaient
   `id` (identifiant unique de l'entrée de file, `OFF-…`). Conséquence : une
   **modification ou suppression hors ligne était rejouée contre le mauvais
   identifiant** (les créations, elles, passaient par la charge utile). Le rejeu
   et la déduplication ciblent désormais `recordId`.

2. **Mutations versionnées.** Chaque mutation en file porte :
   - `idempotency_key` déterministe (rejouer la même écriture ne produit pas deux
     effets) ;
   - `base_version` : signature de la ligne telle que vue à la saisie
     (`updated_at` sinon empreinte de contenu) ;
   - `status` (`pending`, `sent`, `conflict`, `rejected`, `repaired`) et
     `attempts`.

3. **Détection de conflit au rejeu.** `classifyReplayOutcome` compare la
   `base_version` à l'état connu de la ligne :
   - inchangée → **appliquer** ;
   - changée côté serveur → **conflit** (mutation conservée, non écrasée, visible) ;
   - déjà supprimée → **sans effet**.
   Règle **conservatrice** : sans version de base ou sans état serveur connu, on
   applique (comportement identique à l'existant) — jamais de blocage d'une
   synchronisation légitime.

4. **Fin des rejeux infinis.** Un échec technique incrémente `attempts` ; au-delà
   de `MAX_ATTEMPTS`, la mutation passe `rejected` (visible) au lieu d'être
   rejouée sans fin.

### Fichiers

- `src/services/offlineMutationModel.js` *(nouveau, pur)* — modèle + classification
  + résolution (`server`/`client`/`merge`) + transitions de statut.
- `src/services/offlineQueueService.js` — `enqueueOfflineMutation` versionne la
  mutation et capture `baseRow`.
- `src/services/offlineReplayEvents.js` — déduplication par `recordId`.
- `src/context/AppContext.jsx` — rejeu par `recordId`, classification de conflit
  (via un miroir du dataMap), compteur de tentatives.
- Tests : `offlineMutationModel.test.js` (13), `offlineQueueVersioning.test.js` (3),
  scénarios de l'audit inclus (deux appareils sur la même ligne, reprise après
  crash, suppression d'une ligne modifiée).

## Sous-lot b — à venir

- **Stockage IndexedDB** en remplacement de `localStorage` (durabilité, taille,
  pièces sensibles non stockées en clair). Non testable en CI Node (IndexedDB
  absent) : nécessite un harnais dédié.
- **Écran de résolution de conflit** : présenter les mutations `conflict`, laisser
  choisir serveur / local / fusion, et appliquer `resolveConflict`.
- **Boîte de synchronisation** : en attente / envoyée / rejetée / conflit / réparée.
- Chiffrement des mutations sensibles et horodatage serveur d'autorité.

## Portée

Le moteur de conflit (`offlineMutationModel`) est pur et entièrement testé ; il
est prêt pour l'écran de résolution du sous-lot b. Le durcissement de ce lot est
strictement plus sûr que l'existant : il corrige une perte de données silencieuse
(mauvais identifiant + écrasement aveugle) sans jamais bloquer une synchronisation
légitime.
