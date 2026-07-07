# Audit module Assistant ERP (`assistant_erp`)

**Date :** 2026-06-18  
**État :** module conversationnel (1 onglet « Hey Horizon »)

---

## 1. Structure

- Entrée : panneau latéral `AssistantPanel` + module `assistant_erp`
- Onglet canonique unique : `Hey Horizon` (pas de sous-navigation métier)

---

## 2. Formulaires & interactions

| Zone | Type | Statut |
|------|------|--------|
| Saisie message | Textarea + envoi | ✅ routage intent ERP |
| Réponses actionnables | Boutons navigation / formulaires préparés | ✅ `horizon-open-form` |
| Vocal (si activé) | Micro → transcription | ✅ |
| Fiches préparées | Finance, vente, stock via `formModalManager` | ✅ selects registry |

Pas de `window.prompt` — les saisies métier passent par modales gouvernées ou navigation.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Intent vente | Commercial / wizard |
| Intent finance | `finance_pilotage` + `FinancesV12` draft |
| Intent stock | Achats & stock |
| Findings Centre | `navigateForIaFinding` |
| Deep-link query | `scheduleHeyHorizonQuery` depuis App |

---

## 4. Écarts

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| A1 | Basse | Module sans onglets multiples — pas de `navigateAssistantTab` nécessaire | Documenté |
| A2 | Basse | `WorkflowQualityPanel` utilise encore `window.prompt` (hors module assistant) | Dette transverse |

---

## Vérification

```bash
node --test tests/unit/leadershipModulesNavigation.test.js
```
