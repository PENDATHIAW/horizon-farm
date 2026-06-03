# Point de reprise — Horizon Farm

Dernière mise à jour : juin 2026

## Branche active (travail BP / investissements)

- **Branche :** `cursor/bp-concretisation-e81c`
- **Dernier commit :** `a9fca48` — [refactor(bp): simplifier l’UI investissements](https://github.com/PENDATHIAW/horizon-farm/commit/a9fca4825fa3b1554cf699d67b2371da18b1ee12)
- **Commit parent :** `39ca550` — concrétisation guidée des lignes BP

### Contenu de la branche

1. **`bpLineConcretization.js`** — logique « Concrétiser » (ouvre Avicole / Animaux / Cultures / Stock avec fiche préremplie, événement `BP_LINE_COMPLETED_EVENT`).
2. **`InvestissementsV9.jsx`** — UI simplifiée :
   - Onglets : Vue d’ensemble, Mes investissements, Charges mensuelles, Suivi réel, Prévisions, Contrôle
   - Suppression onglet « Actions terrain » (paiement auto, actif auto)
   - Encart « Comment ça marche » (3 étapes)
3. **Hooks métier** — Animaux, Avicole, Cultures, réception stock branchés sur la finalisation BP.

### Vérifier en local

```bash
git checkout cursor/bp-concretisation-e81c
npm run build
npm run test:unit:bp-concretisation
```

### Merger vers `main`

Ouvrir une PR : `cursor/bp-concretisation-e81c` → `main`  
Compare : https://github.com/PENDATHIAW/horizon-farm/compare/main...cursor/bp-concretisation-e81c

---

## `main` (prod / intégration continue)

- **HEAD distant :** `f798eca` (merge restore onglet Annexe)
- Contient aussi les audits modules : Élevage, Commercial, Achats & Stock, Finance, Activité & Suivi (`926c85e` et antérieurs) — **pas encore** la branche BP ci-dessus.

---

## Ordre d’audit modules (`MODULE_AUDIT_ORDER`)

| Module | Statut sur `main` |
|--------|-------------------|
| dashboard, assistant_erp, objectifs_croissance | partiel / antérieur |
| elevage, commercial, achats_stock, finance_pilotage, activite_suivi | ✅ audit onglets |
| documents_rapports, rh, gestion_systeme | ⏳ à faire |

---

## Reprendre la conversation

1. Travailler sur **`cursor/bp-concretisation-e81c`** pour le BP.
2. Après merge PR, reprendre l’audit sur **`main`** avec **Documents & Rapports**.
