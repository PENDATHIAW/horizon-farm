# Fiche audit · Accueil (dashboard)

Entry point : `src/modules/dashboard/AccueilConforme.jsx`. Onglets réels : Vue du
jour · Pilotage · Mes actions. **Module restructuré vers la cible (chantier 3).**

| Onglet | Structure | Pertinence | Compréhensibilité | Éditabilité | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Vue du jour | 4/5 | 4/5 | 5/5 | 4/5 | n/a | 4/5 | **4,2/5** |
| Pilotage | 4/5 | 4/5 | 5/5 | 5/5 | n/a | 4/5 | **4,4/5** |
| Mes actions | 4/5 | 4/5 | 5/5 | 5/5 | n/a | 5/5 | **4,6/5** |

## Vue du jour
- **Structure** : priorités (alertes critiques + tâches urgentes), 2-3 cartes KPI,
  stocks sensibles, derniers mouvements (JournalEvenements). Ordre synthèse→détail
  correct. Aucun formulaire ; actions rapides ouvrent les modules propriétaires.
- **Pertinence** : la carte « Stocks sensibles » liste `kpis.stock.ruptureRows` —
  utile. Pas de météo (retirée, chantier 6). RAS.
- **Compréhensibilité** : libellés issus du dictionnaire, aucun jargon.
- **Éditabilité** : `ACTIONS_RAPIDES_QUOTIDIENNES` dérivé du registre
  `formulaires20s.config.js` ; onglets en config.
- **Intégrité** : lit alertes/tâches/mouvements, ne les recopie pas. KPI via
  `runKpiEngine` (moteur central). Bon.
- Correction : afficher le badge « {n} saisies en attente d'envoi » aussi dans la
  Vue du jour (aujourd'hui seulement en en-tête AppLayout).

## Pilotage
- **Structure** : ≤ 8 cartes du catalogue KPI (`CODES_KPI_PILOTAGE`), chacune avec
  période et lien module. Conforme au cahier (8 indicateurs maximum).
- **Intégrité** : `CarteKPI` lit le catalogue, pas de recalcul local. Masqué pour
  rôle terrain (`ROLES_TERRAIN`) → aucune finance au terrain. Conforme.
- Correction : vérifier que `valeur_stock`/`marge_globale` proviennent bien de
  Finance/Achats et non d'un recalcul (catalogue OK, mais la formule
  `marge_globale` = `resultatAllTime` mériterait validation Finance).

## Mes actions
- `ListeTaches` filtré sur l'utilisateur connecté. Composant unique. Conforme.

## Problèmes / corrections prioritaires
1. Le rôle terrain masque Pilotage mais la Vue du jour affiche encore des cartes
   CA/encaissements pour les non-terrain : vérifier qu'un `farm_agent` ne voit
   aucune valeur FCFA (actuellement le filtre `terrain` couvre `farm_agent`, OK).
2. Badge synchro à remonter dans le corps de l'Accueil.
