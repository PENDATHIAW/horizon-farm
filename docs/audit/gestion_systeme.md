# Fiche audit · Gestion du système

Entry point : `GestionSystemeV2.jsx` → `GestionSystemeUnified.jsx`. Onglets réels :
Vue admin · Utilisateurs · Fermes · Paramètres · Sécurité · Synchronisation ·
Sauvegardes · Réinitialisation · Audit. **Proche de la cible** (Fermes ·
Utilisateurs & accès · Rôles & permissions · Modules & activation · Paramètres ·
Référentiels · Catalogues KPI & alertes · Synchronisation · Audit & sécurité).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Vue admin | 3/5 | 3/5 | 4/5 | 3/5 | n/a | 3/5 | **3,2/5** |
| Utilisateurs | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 3/5 | **3,4/5** |
| Fermes | 4/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,7/5** |
| Paramètres | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 3/5 | **3,4/5** |
| Sécurité | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 4/5 | **3,6/5** |
| Synchronisation | 4/5 | 4/5 | 4/5 | 4/5 | n/a | 4/5 | **4,0/5** |
| Audit | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 4/5 | **3,6/5** |

## Points
- **Synchronisation** intégrée ici (chantier 2) avec la file, les erreurs et la
  reprise ; conflits présentés à un humain — conforme. Badge « {n} saisies en
  attente d'envoi » en en-tête.
- **Manques cible** : onglets **Rôles & permissions**, **Modules & activation**
  (feature flags par ferme), **Référentiels** (catégories/motifs/statuts éditables),
  **Catalogues KPI & alertes** ne sont pas des onglets dédiés. Les catalogues
  (`catalogueKpi.js`, `catalogueAlertes.js`) existent en code mais **ne sont pas
  administrables ici** — écart : ils doivent être consommés partout ET édités ici.
- **Hors cible** : « Sauvegardes » et « Réinitialisation » sont des outils
  techniques ; à ranger sous Audit & sécurité ou Synchronisation.
- **Modules & activation** : les flags existent (`moduleFlags.js`) mais pas d'écran
  d'activation par ferme.

## Corrections prioritaires
1. Ajouter Rôles & permissions, Modules & activation, Référentiels, Catalogues KPI
   & alertes comme onglets administrables.
2. Ranger Sauvegardes/Réinitialisation.
