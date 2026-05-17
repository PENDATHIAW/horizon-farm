# Feuille de route audit ERP Horizon Farm

- Générée le : 2026-05-17T22:27:39.944Z
- Modules audités : 25
- Anomalies détectées : 15
- Points de contrôle : 1897
- Éléments à inspecter : 380
- Formulaires : 44
- Cartes/KPI : 96
- Tableaux : 66
- Graphiques : 41
- Workflows : 56

## Synthèse par priorité

- P1 · Fiabilité financière et chiffre d’affaires : 1 anomalie(s)
- P2 · Workflows métier interconnectés : 4 anomalie(s)
- P3 · Règles terrain critiques : 10 anomalie(s)
- P4 · Formulaires et champs : 0 anomalie(s)
- P5 · UI, tableaux, cartes et graphes : 12 anomalie(s)
- P6 · Simplification intelligente : 0 anomalie(s)

## Couverture inspection par module

### Accueil
- Route : dashboard
- Dimensions : Navigation complète interface, Audit des cartes et KPI, Audit des graphiques et courbes, Qualité données et cohérence, Interconnexion automatique, Simplification intelligente de l’ERP
- Cartes : 5, Tableaux : 2, Graphiques : 2, Formulaires : 0, Workflows : 1, Simplification : 2
  - [carte_kpi] CA total · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Charges · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Marge · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes critiques · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions rapides · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Alertes récentes · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Tâches prioritaires · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Évolution CA · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Répartition activités · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [workflow] KPI Accueil → Objectifs/Finances/Ventes · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] 5 KPI essentiels en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires repliés · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.

### Centre décisionnel
- Route : centre_ia
- Dimensions : Navigation complète interface, Audit des cartes et KPI, Interconnexion automatique, Règles métier terrain, Qualité du rapport audit, Simplification intelligente de l’ERP
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Objectifs
- Route : objectifs_croissance
- Dimensions : Audit des cartes et KPI, Audit des graphiques et courbes, Qualité données et cohérence, Règles métier terrain, Interconnexion automatique, Simplification intelligente de l’ERP
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Animaux
- Route : animaux
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Règles métier terrain, Interconnexion automatique, Navigation complète interface, Simplification intelligente de l’ERP
- Cartes : 5, Tableaux : 4, Graphiques : 2, Formulaires : 4, Workflows : 2, Simplification : 2
  - [carte_kpi] Fiche animal · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Coût total · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Marge · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Statut vendu · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Prochaine pesée · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Liste animaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Historique pesées · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Historique santé · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Ventes liées · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Courbe croissance poids · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Évolution coût/marge · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Ajouter animal · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - ... 7 autre(s) élément(s) à inspecter

### Avicole
- Route : avicole
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Règles métier terrain, Navigation complète interface, Qualité données et cohérence, Simplification intelligente de l’ERP
- Cartes : 5, Tableaux : 4, Graphiques : 3, Formulaires : 4, Workflows : 2, Simplification : 2
  - [carte_kpi] Lot chair · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Lot pondeuses · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Mortalité · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Production œufs · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Marge lot · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Lots · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Production œufs · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Mortalité · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Ventes partielles · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Chair : poids/âge/mortalité · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Pondeuses : ponte/œufs/alimentation/mortalité · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Rentabilité par lot · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - ... 8 autre(s) élément(s) à inspecter

### Cultures
- Route : cultures
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Règles métier terrain, Interconnexion automatique, Qualité données et cohérence, Simplification intelligente de l’ERP
- Cartes : 6, Tableaux : 4, Graphiques : 3, Formulaires : 3, Workflows : 2, Simplification : 2
  - [carte_kpi] Parcelle · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Surface · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Stade · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Coût culture · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Récolte disponible · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Marge · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Cultures · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Récoltes · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Pertes · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Stock issu récolte · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Évolution stade/récolte · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Coûts par culture · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - ... 8 autre(s) élément(s) à inspecter

### Santé
- Route : sante
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Formulaires, preuves et documents, Audit des tableaux, Interconnexion automatique, Règles métier terrain, Simplification intelligente de l’ERP
- Cartes : 4, Tableaux : 4, Graphiques : 2, Formulaires : 6, Workflows : 4, Simplification : 2
  - [carte_kpi] Urgences · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Rappels vaccins · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Coûts santé · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Preuves manquantes · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Interventions · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Rappels · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Preuves · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Vétérinaires · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Coût santé par période · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Interventions par type · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Vaccination · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [formulaire] Soin curatif · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - ... 10 autre(s) élément(s) à inspecter

### Ventes
- Route : ventes
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des tableaux, Audit des cartes et KPI, Interconnexion automatique, Formulaires, preuves et documents, Qualité données et cohérence, Simplification intelligente de l’ERP
- Cartes : 5, Tableaux : 5, Graphiques : 4, Formulaires : 4, Workflows : 4, Simplification : 2
  - [carte_kpi] CA · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] À encaisser · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] À livrer · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Factures manquantes · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Créances · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Opportunités · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Commandes · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Paiements · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Factures · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Livraisons · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Évolution ventes · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Encaissements · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - ... 12 autre(s) élément(s) à inspecter

### Finances
- Route : finances
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des tableaux, Audit des cartes et KPI, Interconnexion automatique, Qualité données et cohérence, Règles métier terrain, Simplification intelligente de l’ERP
- Cartes : 5, Tableaux : 3, Graphiques : 3, Formulaires : 2, Workflows : 3, Simplification : 2
  - [carte_kpi] Recettes · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Charges · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Solde · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Marge par activité · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Flux non liés · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Transactions · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Justificatifs · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Charges par module · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Trésorerie · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Recettes/charges · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Marge par activité · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Ajouter transaction · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - ... 6 autre(s) élément(s) à inspecter

### Comptabilité
- Route : comptabilite
- Dimensions : Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Qualité données et cohérence, Interconnexion automatique, Règles métier terrain, Simplification intelligente de l’ERP
- Cartes : 5, Tableaux : 3, Graphiques : 3, Formulaires : 0, Workflows : 2, Simplification : 3
  - [carte_kpi] CA · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Charges · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Résultat · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Marge · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Pièces manquantes · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Écritures · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Pièces liées · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Rapprochements · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Résultat mensuel · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Charges par catégorie · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] CA par activité · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [workflow] Finances → comptabilité · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - ... 4 autre(s) élément(s) à inspecter

### Investissements
- Route : investissements
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Impact Business
- Route : impact_business
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Formulaires, preuves et documents, Audit des cartes et KPI, Règles métier terrain, Qualité données et cohérence, Simplification intelligente de l’ERP
- Cartes : 4, Tableaux : 2, Graphiques : 2, Formulaires : 1, Workflows : 2, Simplification : 2
  - [carte_kpi] Impact financier · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Impact santé · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Impact stock · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions recommandées · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Événements impact · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Impact par module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Impact par niveau · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Impact ferme structuré · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Santé/vente/perte/stock → impact structuré · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Impact critique → décision/alerte · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Catégorie + niveau + montant + action · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Stock
- Route : stock
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Clients
- Route : clients
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Fournisseurs
- Route : fournisseurs
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Traçabilité
- Route : tracabilite
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Alertes
- Route : alertes
- Dimensions : Audit des cartes et KPI, Audit des tableaux, Interconnexion automatique, Règles métier terrain, Qualité du rapport audit, Simplification intelligente de l’ERP
- Cartes : 4, Tableaux : 2, Graphiques : 2, Formulaires : 2, Workflows : 3, Simplification : 2
  - [carte_kpi] Critiques · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] En retard · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] À traiter · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Par module · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Alertes · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions recommandées · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Alertes par priorité · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Alertes par module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Créer/traiter alerte · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [formulaire] Créer tâche depuis alerte · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Risque métier → alerte · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Alerte critique → tâche · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - ... 3 autre(s) élément(s) à inspecter

### Documents
- Route : documents
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des tableaux, Formulaires, preuves et documents, Interconnexion automatique, Navigation complète interface, Simplification intelligente de l’ERP
- Cartes : 5, Tableaux : 4, Graphiques : 0, Formulaires : 2, Workflows : 3, Simplification : 2
  - [carte_kpi] Factures · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Preuves santé · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Ordonnances · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Rapports · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Documents sans lien · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Documents · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Factures · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Preuves · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Rapports · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [formulaire] Upload document · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [formulaire] Associer module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Facture → document · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - ... 4 autre(s) élément(s) à inspecter

### Tâches
- Route : taches
- Dimensions : Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des tableaux, Interconnexion automatique, Règles métier terrain, Navigation complète interface, Simplification intelligente de l’ERP
- Cartes : 4, Tableaux : 3, Graphiques : 2, Formulaires : 3, Workflows : 2, Simplification : 2
  - [carte_kpi] À faire aujourd’hui · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] En retard · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Terrain · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Assignées · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tâches · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Responsables · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Échéances · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Tâches par statut · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [graphe] Retards · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Créer tâche · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [formulaire] Terminer tâche · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [formulaire] Assigner responsable · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - ... 4 autre(s) élément(s) à inspecter

### RH
- Route : rh
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Rapports
- Route : rapports
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Équipements
- Route : equipements
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Smart Farm
- Route : smartfarm
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Sync
- Route : sync_activity
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter

### Gestion système
- Route : gestion_systeme
- Dimensions : Navigation complète interface, Audit champ par champ des formulaires, Champ libre ou champ prédéfini, Audit des cartes et KPI, Audit des tableaux, Audit des graphiques et courbes, Interconnexion automatique, Simplification intelligente de l’ERP, Qualité données et cohérence, Qualité du rapport audit
- Cartes : 3, Tableaux : 2, Graphiques : 1, Formulaires : 1, Workflows : 2, Simplification : 4
  - [carte_kpi] KPI principaux · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Actions prioritaires · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [carte_kpi] Alertes ou zéros suspects · Contrôler source, unité, zéro suspect, utilité, action associée et cohérence du module.
  - [tableau] Tableaux principaux · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [tableau] Actions par ligne · Contrôler colonnes, actions par ligne, filtres, tri, statuts, doublons et lisibilité.
  - [graphe] Graphiques présents dans le module · Contrôler titre, source, unité, période, légende, cohérence métier et contexte.
  - [formulaire] Formulaires du module · Contrôler champ par champ : utile, libre ou prédéfini, obligatoire, interconnecté, sans double saisie.
  - [workflow] Actions interconnectées du module · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [workflow] Documents/traces/tâches/alertes générés si pertinent · Contrôler mise à jour automatique des modules liés, documents, traces, tâches/alertes si pertinent.
  - [simplification] Informations essentielles en haut · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Détails secondaires en bas · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - [simplification] Pas de double saisie · Contrôler simplification : moins de saisie, richesse bien rangée, éléments pertinents visibles.
  - ... 1 autre(s) élément(s) à inspecter


## Anomalies détaillées

### 1. [bloquant] Ventes · Paiements sans transaction Finance liée
- Zone : Paiements
- Élément : 5 paiement(s)
- Type : workflow
- Cause probable : Paiement créé par un chemin qui ne passe pas par le workflow vente complet ou ancienne donnée non synchronisée.
- Correction attendue : Centraliser paiement → création Finance automatique sans doublon.
- Impact métier : CA, trésorerie, comptabilité, objectifs et accueil peuvent être faux.
- Modules liés : Ventes, Finances, Comptabilité, Objectifs, Accueil
- Fichier probable : src/modules/VentesV2.jsx · PaymentCapturePanel / commitSaleWorkflow
- Retest : Créer un paiement > Vérifier la transaction dans Finances > Vérifier Comptabilité/Objectifs/Accueil

### 2. [critique] Animaux · Animaux vendus sans commande liée
- Zone : Fiche animal vendu
- Élément : 5 animal(aux)
- Type : workflow
- Cause probable : Statut animal modifié sans passer par la vente ou lien vente non sauvegardé.
- Correction attendue : Animal vendu → commande/paiement/finance liés + animal verrouillé.
- Impact métier : Marge, historique, traçabilité et CA animaux peuvent être faux.
- Modules liés : Animaux, Ventes, Finances, Traçabilité, Objectifs
- Fichier probable : src/services/saleAssetPatchService.js · buildSaleAssetPatch
- Retest : Vendre un animal > Vérifier lien commande > Vérifier verrouillage fiche animal

### 3. [critique] Comptabilité · Données finances absentes
- Zone : Données module
- Élément : finances
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Comptabilité

### 4. [critique] Finances · Données finances absentes
- Zone : Données module
- Élément : finances
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Finances

### 5. [critique] Ventes · Opportunités converties mais encore ouvertes
- Zone : Opportunités
- Élément : 1 opportunité(s)
- Type : workflow
- Cause probable : Commande créée sans fermer l’opportunité ou ancienne donnée non migrée.
- Correction attendue : Commande depuis opportunité → opportunité automatiquement convertie/fermée.
- Impact métier : Le centre décisionnel peut proposer des actions déjà faites et créer des doublons.
- Modules liés : Ventes, Centre décisionnel, Traçabilité
- Fichier probable : src/modules/SalesOpportunitiesBridge.jsx · createOrderFromOpportunity
- Retest : Convertir une opportunité > Vérifier qu’elle disparaît des opportunités actives > Vérifier converted_order_id

### 6. [majeur] Documents · Données rapports absentes
- Zone : Données module
- Élément : rapports
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Documents

### 7. [majeur] Équipements · Données equipements absentes
- Zone : Données module
- Élément : equipements
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Équipements

### 8. [majeur] Équipements · Données taches absentes
- Zone : Données module
- Élément : taches
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Équipements

### 9. [majeur] Fournisseurs · Données taches absentes
- Zone : Données module
- Élément : taches
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Fournisseurs

### 10. [majeur] Rapports · Données rapports absentes
- Zone : Données module
- Élément : rapports
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Rapports

### 11. [majeur] RH · Données taches absentes
- Zone : Données module
- Élément : taches
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : RH

### 12. [majeur] Smart Farm · Données sensor_devices absentes
- Zone : Données module
- Élément : sensor_devices
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Smart Farm

### 13. [majeur] Smart Farm · Données camera_devices absentes
- Zone : Données module
- Élément : camera_devices
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Smart Farm

### 14. [majeur] Sync · Données audit_logs absentes
- Zone : Données module
- Élément : audit_logs
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Sync

### 15. [majeur] Tâches · Données taches absentes
- Zone : Données module
- Élément : taches
- Type : donnee
- Cause probable : Module non alimenté, clé de données incorrecte ou données simulées/réelles absentes.
- Correction attendue : Vérifier alimentation du module et cohérence données simulées/réelles.
- Impact métier : Audit incomplet ou lecture métier partielle.
- Modules liés : Tâches
