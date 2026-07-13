# Fiche audit · Commercial

Entry point : `CommercialModule.jsx` → `commercial/CommercialShell.jsx`. Onglets
réels : Ventes · Opportunités · Clients & créances · Livraisons · Abonnements ·
Pilotage. **Non conforme à la cible** (Tableau de bord · Clients · Ventes &
commandes · Livraisons · Factures & paiements · Créances & relances ·
Réclamations).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Ventes | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | **3,8/5** |
| Opportunités | 3/5 | 3/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,3/5** |
| Clients & créances | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,5/5** |
| Livraisons | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,5/5** |
| Abonnements | 2/5 | 2/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,0/5** |
| Pilotage | 3/5 | 3/5 | 4/5 | 3/5 | n/a | 3/5 | **3,2/5** |

## Écarts et problèmes
- **Structure/onglets** : « Abonnements » n'est pas dans la cible — vérifier son
  usage réel (revient-il à une vraie décision de ferme ?). Manquent : Réclamations,
  et la séparation Factures & paiements / Créances & relances.
- **Pertinence** : le plafond de crédit a été retiré du formulaire client (chantier
  6). Le « taux de réclamation » cible n'existe pas encore. « Abonnements » à
  justifier ou retirer.
- **Intégrité** : le CA doit être reconnu à la vente validée et **jamais recalculé
  depuis les paiements**. Le moteur `buildConsolidatedCommercialKpis` (kpiEngine)
  est la source ; à vérifier qu'aucun onglet ne recalcule le CA depuis `payments`.
  16 fichiers commercial font du calcul local (`.reduce`) — audit ligne à ligne
  requis pour confirmer l'absence de double comptage CA/encaissé.
- **Externe** : vérifier qu'aucun nom de client ne sort vers Financements/rapports
  publiés (règle « aucun nom client vers l'externe »).
- **Compréhensibilité** : quelques panneaux d'analyse (`CommercialInsightPanel`)
  encore avec « IA »/tiret long à migrer.

## Corrections prioritaires
1. Restructurer vers la cible 7 onglets ; statut prospect sur la fiche client (pas
   d'onglet Prospects — déjà absent, bon).
2. Confirmer par test que le CA n'est jamais dérivé des paiements.
3. Justifier ou retirer « Abonnements » (pertinence).
