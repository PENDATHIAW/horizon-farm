# Cultures — fichiers legacy (ne pas supprimer sans grep dépendances)

## Chaîne V2 déconnectée

- `src/modules/CulturesV2.jsx` — non chargé par App
- `src/modules/Cultures.jsx` — CRUD original, importé uniquement par V2

## Bridges orphelins (V2 uniquement)

- `CultureHarvestStockBridge.jsx`
- `CultureCostOverview.jsx`
- `CulturesReadinessBridge.jsx`
- `CultureWorkflowBridgePanel.jsx`

## Alias entrée

- `CulturesV5.jsx` → re-export `CulturesRecoveredModule` (rétro-compat)
- `CulturesModule.jsx` — alias sans imports externes

## V4 encore présent

- `CulturesV4.jsx` — remplacé par shell V1 dans `CulturesRecoveredModule` ; fichier conservé pour référence / exports `CultureInputsWeatherPanel` migré vers `cultures/CultureInputsWeatherPanel.jsx`
