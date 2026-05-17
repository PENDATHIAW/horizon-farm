# Feuille de route audit ERP Horizon Farm

- Générée le : 2026-05-17T23:22:48.952Z
- Modules audités : 25
- Anomalies détectées : 4
- Réconciliation héritée : 8 correction(s) appliquée(s)
- Points de contrôle : 1897
- Éléments à inspecter : 380
- Formulaires : 44
- Cartes/KPI : 96
- Tableaux : 66
- Graphiques : 41
- Workflows : 56

## Réconciliation héritée

- Paiements → finances créées : 5
- Factures → documents créés : 0
- Opportunités fermées : 1
- Animaux vendus reliés : 2
- Erreurs : 0

## Synthèse par priorité

- P1 · Fiabilité financière et chiffre d’affaires : 1 anomalie(s)
- P2 · Workflows métier interconnectés : 2 anomalie(s)
- P3 · Règles terrain critiques : 1 anomalie(s)
- P4 · Formulaires et champs : 1 anomalie(s)
- P5 · UI, tableaux, cartes et graphes : 0 anomalie(s)
- P6 · Simplification intelligente : 0 anomalie(s)

## Anomalies détaillées

### 1. [bloquant] Ventes · Paiements sans transaction Finance liée
- Zone : Paiements
- Élément : 5 paiement(s)
- Type : workflow
- Cause probable : Paiement créé avant la mise en place du workflow finance ou par un chemin incomplet.
- Correction attendue : Réconcilier les anciennes lignes puis garder paiement → finance automatique.
- Impact métier : CA, trésorerie, comptabilité, objectifs et accueil peuvent être faux.
- Modules liés : Ventes, Finances, Comptabilité, Objectifs, Accueil

### 2. [critique] Animaux · Animaux vendus sans commande liée
- Zone : Fiche animal vendu
- Élément : 3 animal(aux)
- Type : workflow
- Cause probable : Ancien statut vendu sans lien de commande ou commande impossible à retrouver.
- Correction attendue : Relier à la commande existante si détectable, sinon marquer comme donnée à compléter.
- Impact métier : Marge, historique, traçabilité et CA animaux peuvent être faux.
- Modules liés : Animaux, Ventes, Finances, Traçabilité, Objectifs

### 3. [critique] Ventes · Opportunités converties mais encore ouvertes
- Zone : Opportunités
- Élément : 1 opportunité(s)
- Type : workflow
- Cause probable : Ancienne commande créée sans fermer l’opportunité.
- Correction attendue : Réconcilier en statut convertie puis garder fermeture automatique.
- Impact métier : Risque de doublons commerciaux et de recommandations inutiles.
- Modules liés : Ventes, Centre décisionnel, Traçabilité

### 4. [majeur] Impact Business · Impact ferme non structuré
- Zone : Interventions santé
- Élément : 3 impact(s)
- Type : champ
- Cause probable : Impact Business encore traité comme champ libre.
- Correction attendue : Catégorie + niveau + montant + action recommandée + commentaire libre optionnel.
- Impact métier : Impossible de filtrer, calculer ou prioriser correctement l’impact ferme.
- Modules liés : Santé, Impact Business, Finances, Centre décisionnel

## Couverture inspection

### Accueil
- Cartes : 5, Tableaux : 2, Graphiques : 2, Formulaires : 0, Workflows : 1
### Centre décisionnel
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Objectifs
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Animaux
- Cartes : 5, Tableaux : 4, Graphiques : 2, Formulaires : 4, Workflows : 2
### Avicole
- Cartes : 5, Tableaux : 4, Graphiques : 3, Formulaires : 4, Workflows : 2
### Cultures
- Cartes : 6, Tableaux : 4, Graphiques : 3, Formulaires : 3, Workflows : 2
### Santé
- Cartes : 4, Tableaux : 4, Graphiques : 2, Formulaires : 6, Workflows : 4
### Ventes
- Cartes : 5, Tableaux : 5, Graphiques : 4, Formulaires : 4, Workflows : 4
### Finances
- Cartes : 5, Tableaux : 3, Graphiques : 3, Formulaires : 2, Workflows : 3
### Comptabilité
- Cartes : 5, Tableaux : 3, Graphiques : 3, Formulaires : 0, Workflows : 2
### Investissements
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Impact Business
- Cartes : 4, Tableaux : 2, Graphiques : 2, Formulaires : 1, Workflows : 2
### Stock
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Clients
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Fournisseurs
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Traçabilité
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Alertes
- Cartes : 4, Tableaux : 2, Graphiques : 2, Formulaires : 2, Workflows : 3
### Documents
- Cartes : 5, Tableaux : 4, Graphiques : 0, Formulaires : 2, Workflows : 3
### Tâches
- Cartes : 4, Tableaux : 3, Graphiques : 2, Formulaires : 3, Workflows : 2
### RH
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Rapports
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Équipements
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Smart Farm
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Sync
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
### Gestion système
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2
