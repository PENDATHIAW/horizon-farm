# Audit module Smart Farm (`smartfarm`)

**Date :** 2026-06-18  
**État :** 3 onglets canoniques

---

## 1. Onglets canoniques

```
Objets connectés | Flux temps réel | Automatisation
```

Alias legacy : `Capteurs`, `Caméras`, `Résumé` → Objets connectés ; `flux`, `telemetry` → Flux temps réel.

---

## 2. Formulaires audités

| Formulaire | Fichier | Champs clés | Valider / Annuler |
|------------|---------|-------------|-------------------|
| Appairage QR capteur | `SmartFarmQrPairingModal.jsx` | Zone **select**, type device | ✅ persistance capteur |
| CRUD capteur / caméra | `DeviceManagerTab.jsx` | Registry `sensor_devices` / `camera_devices` | ✅ zone en select (governance) |
| Règles automatisation | `EdgeAutomationTab.jsx` | Lecture + toggles | ✅ alertes / tâches |

Pas de `window.prompt` sur flux métier.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Alerte critique capteur | `alertes_center` + `business_events` |
| Navigation RH / Parc | `OperationsRessourcesRecoveredModule` → smartfarm |
| Carnet Horizon | Carte capteurs → Flux temps réel |
| Activité & Suivi | Liens depuis alertes IoT |

---

## 4. Écarts corrigés

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| S1 | Haute | Pas de pilotage onglet depuis `App` (deep-links perdus) | **Corrigé** — `smartfarmTab` + onglet brut |
| S2 | Moyenne | Pas de `navigateSmartFarmTab` | **Corrigé** |

---

## Vérification

```bash
node --test tests/unit/smartfarmTabsNavigation.test.js tests/unit/leadershipModulesNavigation.test.js
```
