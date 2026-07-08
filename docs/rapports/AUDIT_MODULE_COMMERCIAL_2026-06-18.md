# Audit module Commercial (`commercial`)

**Date :** 2026-06-18  
**État :** structure **6 onglets** (refonte Vision ERP 2026)

---

## 1. Inventaire des fichiers

| Fichier | Rôle | Monté ? |
|---------|------|---------|
| `CommercialModule.jsx` | Entrée lazy (réexport) | Oui |
| `CommercialRecoveredModule.jsx` | Orchestrateur (~730 lignes) | **Racine** |
| `commercial/CommercialShell.jsx` | Header, KPIs, barre onglets | Oui |
| `VentesV5.jsx` | Onglet Ventes (workflow vente complet) | Oui |
| `ClientsReadable.jsx` | Onglet Clients & créances — portefeuille | Oui |
| `commercial/CommercialOpportunitiesPanel.jsx` | Onglet Opportunités | Oui |
| `commercial/CommercialDeliveriesPanel.jsx` | Onglet Livraisons | Oui |
| `commercial/CommercialSubscriptionsPanel.jsx` | Onglet Abonnements | Oui |
| `commercial/CommercialPilotagePanel.jsx` | KPIs, graphiques pilotage | Oui (dans Pilotage) |
| `commercial/CommercialInsightPanel.jsx` | Signaux IA / cohérence | Oui (dans Pilotage) |
| `commercial/CommercialSegmentsPanel.jsx` | Segments clients | Oui (Clients) |
| `commercial/CommercialProspectsPanel.jsx` | Prospects / conversion | Oui (Clients) |
| `commercial/CommercialScheduledRelancesPanel.jsx` | Relances planifiées | Oui (Clients) |
| `commercial/CommercialRelancesPanel.jsx` | Liste relances | Oui (via ScheduledRelances) |
| `commercial/CommercialQuotesPanel.jsx` | Devis avancé | Oui (Pilotage / détails) |
| `commercial/CommercialReconciliationPanel.jsx` | Réconciliation ventes | Oui (Pilotage / détails) |
| `commercial/CommercialAnnexeTab.jsx` | Documents liés | Oui (Pilotage / annexe) |
| `commercial/CommercialMobileToolbar.jsx` | Actions terrain mobile | Oui |
| `commercial/commercialVisionHelpers.js` | Score santé, findings IA | Service |
| `commercial/commercialMetrics.js` | KPIs, todos, top clients | Service |
| `utils/commercialAutoOpportunities.js` | Opportunités auto (stock, lots…) | Service |
| `utils/commercialHeyHorizon.js` | Questions rapides assistant | Service |

**Fichiers legacy non montés en racine** : `ClientsV2.jsx` (remplacé par `ClientsReadable`), `CommercialEvolution.jsx` (via `ModuleGraphiquesTab` uniquement).

---

## 2. Données entrantes depuis `App.jsx`

| Prop | Source | Usage |
|------|--------|-------|
| `initialTab` / `onTabChange` | `commercialTab` (défaut `Pilotage`) | 6 onglets canoniques |
| `salesOrders`, `salesOrdersAll`, `orderItems` | CRUD scoped | Ventes, KPIs |
| `payments`, `paymentsAll` | CRUD | Encaissements, créances |
| `clients` | CRUD | Portefeuille, relances |
| `opportunities` | CRUD | Pipeline commercial |
| `deliveries`, `invoices` | CRUD | Livraisons, facturation |
| `stocks`, `lots`, `animaux`, `cultures` | CRUD | Ventes liées production |
| `documents`, `transactions` | CRUD | Preuves, réconciliation |
| `onNavigate`, `onOpenAssistant` | navigation / Hey Horizon | Liens inter-modules |
| `onCreate*` (vente, paiement, livraison, facture, client, tâche, alerte…) | handlers App | Workflows métier |
| `periodScope`, `periodFiltered`, `farmScope` | filtres globaux | KPIs période |

**Fallback interne** : `useCrudModule` pour chaque entité si props absentes.

---

## 3. Onglets et routes

### Canon (`horizonVision.config.js`)

```
Ventes | Opportunités | Clients & créances | Livraisons | Abonnements | Pilotage
```

### Alias legacy (`COMMERCIAL_TAB_ALIASES`)

| Legacy | Canonique |
|--------|-----------|
| Résumé, resume | Pilotage |
| Clients, clients, Relances | Clients & créances |
| devis, prospects | Ventes / Clients & créances |
| Annexe, Graphiques | Ventes (ou contenu dans Pilotage) |
| reconciliation | Ventes |

---

## 4. Boutons et destinations (principaux)

| Zone | Action | Destination |
|------|--------|-------------|
| Pilotage (Summary) | KPI CA / Encaissé / Panier | Onglet Pilotage (détail) |
| | KPI Créances / Clients actifs | Clients & créances |
| | KPI Commandes ouvertes | Ventes |
| | À traiter aujourd'hui | Ventes (ou tab todo) |
| Ventes | Nouvelle vente / encaissement | Formulaire `VentesV5` |
| Opportunités | Convertir en vente | Ventes (draft prérempli) |
| Clients & créances | Relance WhatsApp | Log + fiche client |
| Livraisons | Livrer / document | Workflow livraison |
| Abonnements | Préparer commande | Ventes |
| Mobile toolbar | Vente / Encaisser / Livrer / Relancer | Onglets respectifs |
| Insight panel | Centre décisionnel | `centre_ia` → Croissance & opportunités |
| Hey Horizon | Questions commerciales | Assistant + navigation canonique |

---

## 5. Créations réelles

| Type | Depuis Commercial ? | Mécanisme |
|------|---------------------|-----------|
| **Commande / vente** | Oui | `sales_orders` + `sales_order_items` |
| **Paiement** | Oui | `payments` + lien finance |
| **Livraison** | Oui | `deliveries` |
| **Facture** | Oui | `invoices` + document |
| **Document** | Oui | `documents` |
| **Client** | Oui | `clients` CRUD |
| **Opportunité** | Oui | `sales_opportunities` (manuel + auto) |
| **Tâche** | Oui | `applyOneClickRecommendation` / relances |
| **Alerte** | Oui | findings IA one-click |
| **Business event** | Oui | traçabilité vente |
| **WhatsApp log** | Oui | `whatsapp_logs` (préparation envoi) |
| **Finance** | Oui | transaction via paiement vente |

---

## 6. Moteurs IA / services

| Service | Rôle |
|---------|------|
| `buildCommercialHealthSnapshot` | Score santé, findings, prédictions |
| `buildAutoCommercialOpportunities` | Opportunités depuis stock / lots / cultures |
| `buildConsolidatedCommercialKpis` | CA, encaissé, créances, panier |
| `buildCommercialReconciliationRows` | Écarts ventes / finance / stock |
| `buildScheduledRelanceRows` | Relances planifiées |
| `buildCommercialDeliveryQueue` | File livraisons |
| `heyHorizonCommercialAnswers.js` | Réponses assistant commercial |
| `commercialHeyHorizon.js` | Intents questions rapides |
| `applyOneClickRecommendation` | Actions tâche / alerte / navigation |

---

## 7. Incohérences identifiées

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| C1 | Moyenne | Liens externes `Clients` au lieu de `Clients & créances` (Vision, Finance, Hey Horizon, recherche) | **Corrigé** |
| C2 | Moyenne | Liens `Résumé` / `Graphiques` pour Commercial (onglet supprimé → `Pilotage`) | **Corrigé** |
| C3 | Basse | `CommercialInsightPanel` → Centre IA onglet `Opportunités` (legacy) | **Corrigé** → Croissance & opportunités |
| C4 | Basse | Pas de helper `navigateCommercialTab` (contrairement Centre / Élevage) | **Corrigé** |
| C5 | Info | Alias `Clients` / `Résumé` conservés dans `COMMERCIAL_TAB_ALIASES` | OK — rétrocompat deep-links |
| C6 | Info | `resolveCommercialTab` dans `App.jsx` à l'entrée module | OK — pas de sous-onglets comme Élevage |

---

## 8. Correctifs appliqués

1. `navigateCommercialTab` dans `commercialNavigation.js`
2. `SEARCH_KEY_TO_MODULE.clients` → `Clients & créances`
3. Navigation Vision / Finance / Centre / Hey Horizon / annexe → onglets canoniques
4. `objectifsCroissanceNavigation` et `visionNavigation` — défaut Commercial → `Pilotage`
5. `heyHorizonCommercialAnswers` / `heyHorizonCommercialPrompt` — tabs canoniques
6. Tests `commercialDecisionTabs.test.js`

---

## Vérification

```bash
node --test tests/unit/commercialDecisionTabs.test.js tests/unit/modulesThreeTabs.test.js tests/unit/commercialTabControl.test.js
```

---

## 9. Audit formulaires (passe financeur — 2026-06-18)

### Formulaires principaux

| Formulaire | Fichier | Selects / héritage | Valider / Annuler |
|------------|---------|---------------------|-------------------|
| Vente 5 étapes | `VentesTerrainV3.jsx` | Source, client, unité, livraison, paiement — préremplissage opportunité/abonnement | ✅ `commitCommercialSale` |
| Action vente | `SaleActionModal.jsx` | Client en **select** (corrigé), paiement, livraison | ✅ |
| Client CRUD | `Clients.jsx` | `type_client`, `statut`, `conditions_paiement` | ✅ |
| Abonnement | `CommercialSubscriptionFormModal.jsx` | Client, fréquence, **unité en select** (corrigé) | ✅ |
| Prospect | `CommercialProspectsPanel.jsx` | Formulaire inline (remplace `prompt`) | ✅ Annuler / Enregistrer |
| Devis | `CommercialQuotesPanel.jsx` | **Sélecteur client** avant création | ✅ |

### Correctifs formulaires / interconnexions

| # | Problème | Correctif |
|---|----------|-----------|
| F1 | Opportunité `en_conversion` avant vente validée | Statut changé **à la validation** (`commitCommercialSale` → `gagnee`) |
| F2 | Opportunités auto (`auto-opp-*`) non persistées | Création en base avant conversion |
| F3 | Livraisons : patch statut seul | `confirmSaleDelivery` (sync commande + tâches) |
| F4 | Modifier vente : client en texte libre | Select clients + `client_id` |
| F5 | Devis toujours sur `clients[0]` | Select client dédié |
| F6 | Prospect via `window.prompt` | Formulaire nom / tél / besoin |
| F7 | WhatsApp opportunité sans log ID | Retour ID pour `ClientContactModal` |

### Parcours démo recommandés

1. Opportunité (DB) → Convertir → wizard prérempli → Valider → vérif finance + stock + opportunité gagnée
2. Ventes → Encaisser / Livrer / Facture via `SaleActionModal`
3. Clients → Nouveau prospect (formulaire) → Devis → Client actif
4. Abonnement → Créer commande prévue → vente préremplie

---

## 10. Passe complète financeur (2026-06-18)

Module validé navigation + formulaires + interconnexions (sections 7–9). Prêt pour démo financeur sur parcours vente / client / opportunité / livraison.

---

## 11. Passe transversale prompts (2026-06-18)

| # | Écart résiduel | Correctif |
|---|----------------|-----------|
| C1 | Preuve livraison via `window.prompt` | `QuickInputModal` textarea |
| C2 | Date relance planifiée via `window.prompt` | `QuickInputModal` date |

Voir `AUDIT_TRANSVERSAL_PROMPTS_2026-06-18.md`.
