# Dry-run démo financeur — 2026-06-18

**Contexte :** validation post-merge PR #164 (`cursor/transversal-prompts-ac42` → `main`).

## Merge

| Élément | Statut |
|---------|--------|
| Branche `cursor/transversal-prompts-ac42` | ✅ fast-forward sur `main` |
| Push `origin/main` | ✅ `3aa214d4` |
| PR #164 | Contenu intégré sur `main` |

## 5 parcours dry-run

Script : `npm run test:unit:demo-financeur` (`tests/unit/demoFinanceurDryRun.test.js`).

| # | Parcours | Résultat | Vérifications clés |
|---|----------|----------|-------------------|
| 1 | Opportunité → vente → livraison (preuve) → paiement → finance | ✅ | `prepareCommercialSaleCommit`, preuve livraison (`QuickInputModal` côté UI), `recordSalePayment`, chaîne traçabilité complète |
| 2 | Réception achat → finance auto | ✅ | `buildSupplierReceptionWorkflow` : dette fournisseur `is_supplier_accrual`, pas d'effet caisse |
| 3 | Centre → deep-link module | ✅ | `resolvePilotageNavigation` / `navigateFromPilotageItem` vers Commercial et Achats & Stock |
| 4 | Investisseurs → Préparation → export PDF | ✅ | `resolveInvestisseursTab('Préparation')`, `buildForumPack`, `renderForumPackPdfBlob` |
| 5 | Sync ERP → réparation interconnexion | ✅ | `classifySyncIssue` (PAID_SALE_NO_FINANCE), `getGuidedRepairActions`, `buildSyncRepairTask` |

## Tests complémentaires

| Suite | Résultat |
|-------|----------|
| `transversalPromptsAudit.test.js` | ✅ 4/4 — aucun `window.prompt` restant |
| `leadershipModulesNavigation.test.js` | ✅ navigation investisseurs / sync |
| `npm run build` | ✅ |

## E2E navigateur (non exécuté ici)

Les specs Playwright `decision-center-smoke` et `assistant-erp-smoke` nécessitent `E2E_LOGIN` / `E2E_PASSWORD`. À lancer en préprod avec credentials :

```bash
E2E_LOGIN=... E2E_PASSWORD=... npm run test:e2e:smoke
```

## Backlog P0 (hors scope dry-run)

- `stock_movements` prod (`farm_id`, `dedupe_key`)
- Fuite multi-fermes
- Double flux `ventes` vs `sales_orders`
- Archivage legacy (FinancesV2–V10, StocksV2, etc.)

## Conclusion

**Prêt pour démo financeur** sur les 5 parcours métier (logique unitaire validée). UI livraison / relances / alertes utilise désormais `QuickInputModal` au lieu de `window.prompt`.
