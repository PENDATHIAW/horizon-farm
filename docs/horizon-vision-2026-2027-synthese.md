# Horizon Farm 2026–2027 — Synthèse Vision ERP

## Mission
ERP agricole/avicole/commercial/financier **proactif** : détecter, analyser, anticiper, expliquer, proposer, suivre — pas seulement enregistrer.

## 3 piliers
| Pilier | Contenu |
|--------|---------|
| **Simplicité** | Où je suis · ce qui compte · quoi traiter · urgence |
| **Richesse** | Profondeur métier · analyses · historique · liens inter-modules |
| **Cohérence** | Chaque action produit des impacts réels (vente→commercial/finance/docs/activité/IA/vision) |

## 11 modules cibles
Dashboard · Assistant ERP · Vision & Croissance · Élevage · Commercial · Achats & Stock · Finance & Pilotage · Activité & Suivi · Documents & Rapports · Ressources & Équipements · Gestion Système

→ Détail onglets : `src/config/horizonVision.config.js`

## Moteurs IA (non chatbot)
| Moteur | Rôle |
|--------|------|
| Audit ERP | Boutons morts, doublons, incohérences UX |
| Cohérence | Vente sans facture/paiement/livraison, achat sans stock, mortalité sans effectif |
| Risques | Financier · sanitaire · stock · fournisseur · client (faible→critique) |
| Rentabilité | Marges animaux/lots/œufs — **jamais afficher si non fiable** |
| Prédictif | Ruptures stock, trésorerie, retards paiement |
| Recommandations | Actions concrètes + sync Supabase |
| Financeur | DER, FONGIP, BNDE, CNCAS, banques, PDF dossier |
| Tâches auto | Alerte → tâche → responsable → suivi |
| Surveillance UX | Récursions, modales infinies |

## Implémenté maintenant (Phase 1)
- **`erpHealthEngine.js`** — orchestrateur central
- **Règles** : `coherenceRules`, `riskRules`, `predictiveRules`, `profitabilityRules` + règles existantes
- **Dashboard** — score santé, risques, prédictions, recommandations IA
- **Planification** — exécution horaire + après refresh données
- **Config vision** — audit module par module (`MODULE_AUDIT_ORDER`)

## Méthode de livraison
1. Audit complet module N (onglets, boutons, KPI, interconnexions)
2. Corriger module N
3. Valider + tester
4. Module N+1

**Ordre audit** : Dashboard → Assistant → Vision → Élevage → Commercial → Achats → Finance → Activité → Documents → Ressources → Système

## Interdictions / Obligations
Voir `horizonVision.config.js` → `DEV_RULES`
