# Chantier 10 — Audit anti-duplication final

Objectif : vérifier que les interconnexions récentes n’ont pas créé de sections similaires ou de doublons fonctionnels.  
Principe : **garder le module source**, transformer l’autre en **lecture / redirection**, ne supprimer ni données ni modules.

## Tableau des doublons

| # | Paire auditée | Module source | Doublon(s) | Décision | Action livrée |
|---|---------------|---------------|------------|----------|---------------|
| 1 | Ajouter charge vs Achat stock | `achats_stock` / Stock | Finance (+ Écriture), BP/Investissements | **Rediriger** | Finance : boutons séparés Charge / → Achat stock / → Vente ; Achats hub sans 2e CTA |
| 2 | Ajouter document vs Joindre preuve | `documents_rapports` / Bibliothèque | Finance, tâches seules | **Rediriger** | « Joindre document » ouvre formulaire prefill ; notice Preuves |
| 3 | Vente Commercial vs Finance | `commercial` / Ventes | Finance recette, Centre opportunités | **Rediriger** | Finance → Commercial ; Centre : « Ouvrir Commercial » (plus Convertir vente) |
| 4 | Stock vs Mouvements | `achats_stock` / Stock | Onglet Mouvements | **Lecture seule** | Notice + historique sans saisie ; 1 seul CTA achat (Résumé) |
| 5 | Alertes Centre vs Activité & Suivi | `activite_suivi` / Alertes | Centre décisionnel | **Rediriger** | Bouton Alerte → Activité & Suivi (plus CRUD inline) |
| 6 | Rapport financeur Documents vs Objectifs | `rapports` | Documents Exports, Objectifs Financeurs | **Rediriger** | Génération PDF uniquement via Rapports ; vitrines + liens |
| 7 | Maintenance RH vs Équipements | `equipements` | RH Maintenance | **Rediriger** | RH file d’attente lecture ; CTA → Équipements |
| 8 | Capteurs Smart Farm vs Équipements | `smartfarm` | RH embed, Équipements | **Rediriger** | Module Smart Farm dédié ; RH/Équipements = lecture + lien |
| 9 | Rentabilité Finance vs Élevage/Objectifs | `finance_pilotage` / Rentabilité | Élevage lots, Objectifs Performance | **Lecture seule** | Élevage/Objectifs = KPI métier + liens Finance |

## Décisions par type

- **Garder** : module propriétaire du domaine (Commercial ventes, Achats stock, Documents bibliothèque, Activité alertes, Rapports PDF, Équipements maintenance, Smart Farm IoT, Finance rentabilité globale).
- **Fusionner** : non — pas de fusion de modules ; agrégation via liens et notices.
- **Rediriger** : paires 1, 2, 3, 5, 6, 7, 8.
- **Masquer expert** : charges BP / prévisionnelles (Investissements, BP wizard) conservées avec libellé « prévision » implicite — pas de saisie opérationnelle dupliquée.
- **Lecture seule** : paires 4 et 9.

## Fichiers modifiés

| Fichier | Rôle |
|---------|------|
| `src/utils/antiDuplicationRegistry.js` | Registre des 9 paires + décisions |
| `src/utils/antiDuplicationGuard.js` | Redirects et guards (stock, vente, preuve, etc.) |
| `src/components/AntiDuplicationNotice.jsx` | Bandeau UI lecture / redirection |
| `src/modules/SmartFarmModule.jsx` | Module Smart Farm dédié (plus re-export RH) |
| `src/modules/FinancePilotageRecoveredModule.jsx` | Séparation charge / achat / vente |
| `src/modules/DocumentsRapportsModule.jsx` | Joindre preuve → document |
| `src/modules/AchatsStockRecoveredModule.jsx` | Mouvements lecture seule |
| `src/modules/vision/VisionOpportunitiesTab.jsx` | Plus de saisie vente directe |
| `src/modules/vision/VisionPrioritiesTab.jsx` | Alertes → Activité & Suivi |
| `src/modules/vision/VisionFundingTab.jsx` | Financeur → Rapports |
| `src/modules/vision/VisionPerformanceTab.jsx` | Notice rentabilité |
| `src/modules/OperationsRessourcesRecoveredModule.jsx` | Maintenance/capteurs redirect |
| `src/modules/Equipements.jsx` | Notices maintenance / capteurs |
| `src/modules/ElevageRecoveredModule.jsx` | Rentabilité lot + liens Finance/Objectifs |
| `src/modules/SmartFarmZoneOverview.jsx` | Boutons capteur seulement si CRUD disponible |

## Tests de non-régression

```bash
npm run test:unit:anti-duplication
npm run build
```

Scénarios couverts :
- registre 9 paires complet ;
- redirect stock / vente / preuve / financeur / équipements / smartfarm ;
- blocage alerte inline Centre décisionnel ;
- détection intent achat vs vente dans Finance.
