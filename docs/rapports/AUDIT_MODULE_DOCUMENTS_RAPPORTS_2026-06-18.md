# Audit module Documents & Rapports (`documents_rapports`)

**Date :** 2026-06-18  
**État :** 4 onglets canoniques

---

## 1. Onglets canoniques

```
Centre de contrôle | Gestionnaire & OCR | Rapprochement & preuves | Rapports & exports
```

Alias legacy : `Résumé` → Centre ; `Preuves` → Rapprochement ; `Rapports` / `Exports` → Rapports & exports ; `Bibliothèque` / `OCR` → Gestionnaire.

---

## 2. Formulaires audités

| Formulaire | Fichier | Champs clés | Valider / Annuler |
|------------|---------|-------------|-------------------|
| Liaison document | `DocumentsLinkPanel.jsx` | Document, type cible, entité liée — **3 selects** | ✅ `commitDocumentLink` |
| Scanner OCR | `DocumentScannerPanel.jsx` | Type, montant, statut paiement **select** | ✅ persistance + refresh |
| CRUD document | `DocumentsV2.jsx` / hook | Registry `documents` | ✅ EditModal |
| Preuve manquante | Centre → tâche | Via `createMissingProofTask` | ✅ pas de prompt |

Pas de `window.prompt` sur flux métier.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| `commitDocumentLink` | document ↔ finance / vente / stock / RH / culture |
| Preuve manquante → tâche | `taches` + navigation Rapprochement |
| Finding IA one-click | `applyOneClickRecommendation` |
| Export rapport | `RapportsExportsTab` → PDF / objectifs financeur |
| Vision / Finance | Liens `Preuves` / `Rapports` (alias résolus) |

---

## 4. Écarts corrigés

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| D1 | Haute | `App.jsx` résolvait l’onglet trop tôt (perte alias `Preuves`) | **Corrigé** — onglet brut conservé |
| D2 | Moyenne | Pas de `navigateDocumentsTab` | **Corrigé** |
| D3 | Moyenne | `navigationOptionsForFinding` sans module documents | **Corrigé** |
| D4 | Basse | Liens legacy `Preuves` / `Rapports` dans Vision, Finance | OK via `DOCUMENTS_TAB_ALIASES` |

---

## Vérification

```bash
node --test tests/unit/documentsNavigationAudit.test.js
node --test tests/unit/documentsWorkflow.test.js
```
