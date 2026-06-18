# Audit transversal — Formulaires, champs et boutons

**Horizon Farm ERP** · 18 juin 2026  
**Périmètre** : formulaires CRUD, modals, workflows inline, paramètres, assistant Hey Horizon  
**Données structurées** : `AUDIT_FORMULAIRES_CHAMPS_BOUTONS_2026-06-18.json`

---

## 1. Synthèse exécutive

| Indicateur | Valeur |
|-----------|--------|
| Modules avec `MODULE_FORM_FIELDS` | **36** |
| Modules couverts par `formSimulationScenarios` | **8** |
| Types de champs EditModal | **11** |
| Anomalies P0 | **3** |
| Anomalies P1 | **5** |
| Anomalies P2 | **3** |
| Score estimé formulaires/boutons | **68 / 100** |

**Verdict** : l’infrastructure modale (`EditModal`, `CreateModal`, `GenericCrudModule`) est solide et réutilisée largement. Les écarts critiques concernent des **doublons de schémas** (Santé legacy vs V6, ventes vs sales_orders), des **formulaires métier inline** non alignés sur le registre central, et une **couverture de tests/simulation incomplète** (8 modules sur ~25 avec formulaires significatifs).

---

## 2. Méthodologie

1. Inventaire du registre `MODULE_FORM_FIELDS` (`src/utils/constants.js`) + overrides `formFieldGovernance.js`
2. Revue des modals partagés (`EditModal`, `CreateModal`, `DeleteModal`)
3. Cartographie des formulaires inline par module (Élevage, RH, Cultures, Commercial, etc.)
4. Croisement avec `src/audit/formSimulationScenarios.js` et `humanUiAuditChecklist.js`
5. Reprise des audits module existants (`docs/rapports/AUDIT_MODULE_*`, reproduction, élevage)
6. Tests unitaires existants + ajout `tests/unit/formsAuditRegistry.test.js`

**Non couvert dans cet audit** : tests E2E navigateur, audit pixel/UI de chaque écran déployé Vercel.

---

## 3. Infrastructure formulaires (existant)

### 3.1 Couche registre

| Fichier | Rôle |
|---------|------|
| `src/utils/constants.js` | `MODULE_FORM_FIELDS` — 36 clés, 7–77 champs/module |
| `src/utils/formFieldGovernance.js` | Required, types select, options métier |
| `src/utils/formSchemaRegistry.js` | Champs requis/recommandés pour Hey Horizon |
| `src/utils/stockForms.js`, `alertForms.js`, `taskForms.js`, `documentForms.js` | Builders hors constants |

### 3.2 UI modale partagée

| Composant | Boutons standard | Validation |
|-----------|------------------|------------|
| `EditModal.jsx` | Annuler (outline) · Enregistrer/Créer (primary) | Required visible, select sans options bloqué |
| `CreateModal.jsx` | Alias EditModal, label « Créer » | Idem |
| `GenericCrudModule.jsx` | Ajouter · Modifier · Supprimer | Liste + modals |

**Champs supportés** : `text`, `number`, `date`, `email`, `select`, `checkbox`, `textarea`, `image` (file + URL), `readonly`, `section`, `entity_linked`.

**Fonctionnalités** : `showWhen(form)` conditionnel, `VoiceInput` sur text/textarea, upload image, `deriveValues`, `autoId`.

### 3.3 Bus formulaires assistant

| Mécanisme | Fichier |
|-----------|---------|
| `horizon-open-form` event | `formModalManager.js` |
| Brouillon → formulaire | `HorizonDraftPanel.jsx`, `heyHorizonAssistantService.js` |
| Listeners modules | Commercial, Élevage, Animaux, Avicole, Finances, Stocks, Tâches, Rapports |

### 3.4 Formulaires workflow canoniques (IDs stables)

| ID / fichier | Module | Usage |
|--------------|--------|--------|
| `elevage-health-intervention-form` | `SanteV6.jsx` | Intervention adaptative |
| `TransformationOfficialForm.jsx` | Élevage | Transformation officielle |
| `StockPurchaseReceptionForm.jsx` | Achats & Stock | Réception achat |
| `FarmCreationWizard.jsx` | Fermes | Création multi-étapes |
| `BpWizard.jsx` | Objectifs | Business Plan |

### 3.5 Boutons (`Btn.jsx`)

- Variants : `primary`, `outline`, `danger`, `amber`, `whatsapp`
- `min-h-[44px]` (accessibilité tactile)
- **Défaut `type="button"`** — impact sur soumission native `<form>`

---

## 4. Inventaire par module (formulaires principaux)

| Module ERP | Pattern | Fichiers clés | Champs registry | Simulation |
|------------|---------|---------------|-----------------|------------|
| Animaux | EditModal + fiche | `AnimauxSpeciesFocused.jsx`, `AnimauxV2.jsx` | `animaux` (77) | ANIMAUX-001/002 |
| Avicole | EditModal + journaux | `AvicoleV10.jsx`, `AvicoleBase.jsx` | `avicole` (46) | AVICOLE-001/002 |
| Élevage workflows | Inline modals | `ElevageWorkflowPanels`, pesée/alimentation | partiel | partiel |
| Santé | **SanteV6** inline | `SanteV6.jsx` | `sante` (8) **≠ V6** | SANTE-001/002 |
| Commercial | Sale modals, abonnements | `CommercialRecoveredModule.jsx`, `SaleActionModal.jsx` | `sales_orders` | VENTES-* |
| Clients / Fournisseurs | EditModal + fiche | `Clients.jsx`, `Fournisseurs.jsx` | `clients`, `fournisseurs` | — |
| Stock | Movement + réception | `StocksV3.jsx`, `StockPurchaseReceptionForm.jsx` | `stock` | STOCK-001 |
| Cultures | EditModal + récolte | `CulturesV3.jsx`, harvest panels | `cultures` | CULTURES-001 |
| Finance | EditModal + inline | `FinancesV12.jsx`, `FinanceTransactionsOnly.jsx` | `finances` | FINANCES-001 |
| Documents | EditModal + OCR | `Documents.jsx`, scanner panels | `documents`, `erp_documents` | DOCUMENTS-001 |
| Tâches / Alertes | Builders + modal | `TachesV3.jsx`, `AlertesCenter.jsx` | `taches`, `alertes_center` | — |
| RH | Inline `Field` | `RHUnified.jsx`, `RHPeopleTeams.jsx` | — | — |
| Équipements | GenericCrud | `Equipements.jsx` | `equipements` | — |
| Smart Farm | Device forms | `SmartFarmPanel.jsx`, QR pairing | `sensor_devices`, `camera_devices` | — |
| Gestion système | Inline admin | `GestionSystemeUnified.jsx` | — | audit module |
| Investisseurs / BP | Wizard + tabs | `BpWizard.jsx`, `BpDetailTabs.jsx` | `business_plans`, bp_* | — |
| Hey Horizon | Draft panel | `HorizonDraftPanel.jsx` | draft dynamique | — |
| Paramètres | Toggles | `SettingsPanel.jsx`, `PilotageSettingsPanel.jsx` | — | — |

---

## 5. Catalogue boutons formulaires

| Contexte | Libellés usuels | Handler attendu | Risques observés |
|----------|----------------|-----------------|------------------|
| Modal CRUD | Annuler · Enregistrer/Créer | `onClose` · `onSubmit` | Enter ne submit pas (Btn type=button) |
| Workflow inline | Valider · Enregistrer la récolte | `onSubmit` + `disabled={busy}` | Spinner sans fermeture (audit Ventes) |
| Assistant | Valider brouillon · Annuler | `executeWhatsAppDraft` / create | Double écriture si pas dédupe |
| Settings | Toggle · Remettre affichage | localStorage | OK |
| Centre décisionnel | Créer tâche · Voir calendrier | `visionPriorityActions` | Corrigé 18/06 (fêtes) |

**Checklist boutons** (`humanUiAuditChecklist` — `buttons_actions`) :
- Spinner infini → **Ventes** documenté historiquement
- Action OK mais modal bloqué → tester après chaque fix
- Objet vendu modifiable → **Animaux** (ANIMAUX-002)
- Doublons tâche/alerte → dédupe `task_dedupe_key` / `alert_dedupe_key`

---

## 6. Anomalies et corrections recommandées

### P0 — Bloquant métier ou incohérence forte

| ID | Problème | Fichiers | Action |
|----|----------|----------|--------|
| FORM-P0-001 | Santé : `constants.sante` ≠ `SanteV6` adaptatif | `constants.js`, `Sante.jsx`, `SanteV6.jsx` | Unifier entrée santé sur V6 ; retirer legacy |
| FORM-P0-002 | Double flux vente `ventes` + `sales_orders` | `constants.js`, Commercial | Flux canonique Commercial ; déprécier ventes legacy UI |
| FORM-P0-003 | `horizon-open-form` non écouté (reproduction) | `formModalManager.js`, Élevage | Listener parent Élevage ou handler global |

### P1 — UX / qualité données

| ID | Problème | Action |
|----|----------|--------|
| FORM-P1-001 | Submit modal via onClick | `type="submit"` sur Btn Enregistrer |
| FORM-P1-002 | `client_id` texte (animaux vendus) | `entity_linked` clients |
| FORM-P1-003 | `module_lie` text vs select | Harmoniser governance |
| FORM-P1-004 | Alimentation double source | Consolider `stockForms` |
| FORM-P1-005 | Gestion système : users/sauvegardes | CRUD ou masquer boutons |

### P2 — Amélioration / dette

| ID | Problème | Action |
|----|----------|--------|
| FORM-P2-001 | 8 scénarios simulation / 36 modules | Étendre scénarios ou tests workflow |
| FORM-P2-002 | Heuristique dead-button DOM | `data-action` + tests React |
| FORM-P2-003 | Fiches 77 champs (animaux) | Wizard / sections repliables |

---

## 7. Matrice champs — points d’attention

### Animaux (`animaux` — 77 champs)

- **Points forts** : `showWhen` sur acquisition, santé, vente, mort, vol, réforme ; sections métier
- **À corriger** : `client_id` texte ; `fournisseur_id` texte ; `mere_id`/`pere_id` select options vides par défaut
- **Tests** : `ANIMAUX-001` (pesée J+15, rappel J-1), `ANIMAUX-002` (verrouillage vendu)

### Santé

- **Registry** : 8 champs vaccin simples
- **Terrain** : `SanteV6` — types intervention, preuve URL, impact structuré
- **Écart audit** : `forms_adaptive_fields` exige champs différents par type → **V6 OK**, legacy **KO**

### Commercial

- **Registry** : `sales_orders`, `payments`, `deliveries`, `invoices`, `sales_opportunities`
- **Workflow** : opportunité → commande → livraison → paiement
- **Tests** : `commercialV3.test.js`, scénarios VENTES-001/002

### Stock

- **Registry** : `stock` minimal (7 champs)
- **Workflow** : `StockPurchaseReceptionForm` + mouvements `StocksV3`
- **Governance** : catégorie/unite/seuil required via `formFieldGovernance`

---

## 8. Tests existants et plan

### Automatisés (unitaires)

| Fichier | Couverture formulaire |
|---------|----------------------|
| `commercialV3.test.js` | Abonnement, vente, validation |
| `elevageHealthTerrain.test.js` | ID formulaire santé V6 |
| `elevageTransformationOfficial.test.js` | Transformation officielle |
| `culturesWorkflow.test.js` | Récolte / transformation |
| `ressourcesWorkflow.test.js` | RH maintenance / paie |
| `reproductionV1.test.js` | Hey Horizon form types |
| `formsAuditRegistry.test.js` | **Nouveau** — cohérence registre |

### Scénarios manuels (`formSimulationScenarios.js`)

Exécuter via **HumanUiAuditPanel** ou procédure `humanAiTesterMasterPrompt.js` :
1. Remplir champs requis → valider → vérifier ricochets (Finance, Stock, Documents)
2. Inputs invalides listés dans chaque scénario
3. Exporter `form-simulation-report.json`

### Plan de test manuel prioritaire (30 min)

1. **Commercial** : commande complète + paiement partiel (VENTES-001/002)
2. **Santé V6** : changer type intervention → champs différents (SANTE-001/002)
3. **Animaux** : vendre → tenter modifier prix (ANIMAUX-002)
4. **Stock** : sortie > disponible (STOCK-001)
5. **EditModal** : champ required vide → message erreur ; select vide → blocage
6. **Hey Horizon** : brouillon → Valider → données dans module cible

---

## 9. Références outils audit internes

| Outil | Chemin |
|-------|--------|
| Scénarios simulation | `src/audit/formSimulationScenarios.js` |
| Checklist UI humaine | `src/audit/humanUiAuditChecklist.js` |
| Manifest modules | `src/audit/auditManifest.js` (Lot 3 Formulaires) |
| Deep audit champs | `src/audit/deepAuditChecklist.js` |
| Panel in-app | `src/modules/HumanUiAuditPanel.jsx` |
| Surveillance UX | `src/services/erpRules/surveillanceUxRules.js` |

---

## 10. Prochaines étapes recommandées (ordre)

1. **P0** : Santé unifiée V6 + flux vente canonique + listener `horizon-open-form` Élevage
2. **P1** : EditModal submit natif + `client_id` entity_linked + Gestion système boutons
3. **Tests** : étendre `formSimulationScenarios` (RH, Tâches, Alertes, BP)
4. **UX** : wizard fiche animal / réduire champs visibles par défaut

---

*Généré pour le dépôt Horizon Farm · branche `cursor/forms-audit-ac42`*
