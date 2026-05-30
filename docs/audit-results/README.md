# ERP Audit Results

This folder is the source of truth for ERP audit findings.

The ERP audit should write its structured results here instead of storing them only in the ERP interface.

## Current files

- `current/audit-roadmap.json`: machine-readable roadmap used for corrections.
- `current/audit-roadmap.md`: human-readable summary used for review.

## Archive

Old audit runs can be stored under:

- `archive/YYYY-MM-DD-HH-mm/audit-roadmap.json`
- `archive/YYYY-MM-DD-HH-mm/audit-roadmap.md`

## Correction workflow

1. Run the full ERP audit.
2. Export or commit the audit result to GitHub under `docs/audit-results/current/`.
3. Corrections are made from the roadmap, in priority order.
4. After correction, run a new audit and replace `current/`.
5. Keep important previous runs in `archive/` if needed.

## Required finding fields

Each finding should include:

```json
{
  "id": "AUD-...",
  "module": "Ventes",
  "zone": "Paiement",
  "element": "PAY-001",
  "type": "workflow",
  "severity": "bloquant",
  "severity_rank": 1,
  "status": "detecte",
  "title": "Paiement sans finance",
  "detail": "Le paiement existe mais aucune transaction finance liée n'a été trouvée.",
  "probable_cause": "Paiement créé hors workflow complet.",
  "expected_fix": "Créer automatiquement une transaction Finance lors de la création du paiement.",
  "business_impact": "CA, marge, comptabilité et objectifs peuvent être faux.",
  "linked_modules": ["Ventes", "Finances", "Comptabilité", "Objectifs", "Accueil"],
  "source_path": "src/modules/VentesV2.jsx",
  "source_component": "PaymentCapturePanel",
  "correction_lot": "Lot 1 · Fiabilité financière et CA",
  "retest_steps": [
    "Créer ou ouvrir un paiement",
    "Vérifier la transaction dans Finances",
    "Vérifier la comptabilité et les objectifs"
  ],
  "detected_at": "2026-05-17T00:00:00.000Z"
}
```

## Priority order

1. Financial reliability and revenue.
2. Interconnected business workflows.
3. Critical field rules.
4. Forms and fields.
5. UI: cards, tables, charts, buttons.
6. Smart simplification.
