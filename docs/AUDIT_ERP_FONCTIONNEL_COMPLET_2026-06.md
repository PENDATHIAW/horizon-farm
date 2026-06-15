# Audit fonctionnel ERP Horizon Farm — juin 2026

Document de référence pour la reprise module par module (sidebar réelle), le mode données simulées, les formulaires, héritages de champs et la roadmap d’amélioration.

**Périmètre sidebar visible** (16 entrées — `equipements` est fusionné dans Opérations & Ressources, non affiché seul).

---

## Méthode d’audit

1. Parcours sidebar → onglets → sous-vues → formulaires / cartes / boutons.
2. Mode **données simulées** (paramètres, en haut à droite) pour détecter incohérences.
3. Vérification **héritages** : choix Avicole / lot / animal / culture filtre les listes liées.
4. Vérification **chiffres** : même KPI = même moteur + même période.
5. Vérification **automatisation** : action métier sans saisie redondante.

---

## Sidebar — modules audités

| Groupe | Module | Onglets | État structure | Points d’attention |
|--------|--------|---------|----------------|-------------------|
| Pilotage | Accueil | Carnet (config 2 onglets non utilisés) | OK lecture | CA mois aligné période (corrigé) ; valeur stock CMUP (corrigé) |
| Pilotage | Assistant ERP | Hey Horizon | OK | Couverture métier forte |
| Pilotage | Centre décisionnel | 3 | OK | Dense ; annexe saisons |
| Pilotage | Objectifs & Croissance | 4 | OK | KPI vs Finance à harmoniser libellés |
| Pilotage | Investisseurs & Forums | 9 vues | OK | Hors MODULE_TARGET_TABS |
| Production | Élevage | 4 + sous-vue Avicole/Animaux | OK | Reproduction montée (Cycles & Reproduction) ; charge UX |
| Production | Cultures | 3 + sous-sections | Partiel | Pilotage dense ; legacy V2/V4 |
| Commerce | Commercial | 6 | OK | KPI header sensible période (corrigé) ; Résumé = onglet Ventes dense |
| Commerce | Achats & Stock | 3 | OK | CMUP canonique ; bypass StocksV4 à fermer |
| Finance | Finance & Pilotage | 5 + sous-vues | OK | **Cumul** vs sélecteur période global |
| Suivi | Activité & Suivi | 4 | OK | Panneaux Insight/Bridge montés |
| Suivi | Documents & Rapports | 4 | OK | OCR/Bridge montés sur onglets |
| Ressources | Opérations & Ressources | 4 | OK | Équipements intégrés ; RH localStorage vs Supabase |
| Ressources | Smart Farm | 3 | OK | Realtime + QR + alertes IoT |
| Admin | Activité & Sync ERP | 3 | OK | Audit + réparation guidée |
| Admin | Gestion système | 8 | Partiel | CRUD utilisateurs incomplet |

**Non sidebar** mais routes : `equipements`, `animaux`, `ventes`, `alertes`, `sync`, `audit_logs` → alias vers grands modules.

---

## Formulaires et héritages (chantier transversal)

| Zone | Comportement attendu | État |
|------|----------------------|------|
| Vente | Source lot avicole → lignes / stock avicole | OK via `commitCommercialSale` |
| Transformation élevage | `source_type` lot vs animal filtre champs | OK `TransformationOfficialForm` |
| Alimentation | `type_cible` lot → champs lot uniquement | OK workflows |
| Santé | Animal vs lot | OK |
| Documents lien | Type entité filtre cibles | Partiel — panneau lien sur Rapprochement |
| Tâches / alertes | `module_lie` + `entity_id` | Partiel — pas toujours pré-rempli |
| Finance saisie | Catégorie stockable → stock | Réparation guidée Sync |

**Recommandation** : composant `EntityLinkedSelect` (module → liste filtrée) sur tous les `GenericCrudModule` à champs `lot_id`, `animal_id`, `culture_id`.

---

## Automatisation — ce qui fonctionne

- Vente canonique → stock, finance, créance, traçabilité, opportunité fermée.
- Encaissement → `recordSalePayment` + side effects.
- Réception stock → mouvement + finance + document.
- Alimentation / santé / récolte → sorties/entrées stock + finance.
- Smart Farm → alertes (événements IoT).
- Sync → détection + 6 scénarios réparation guidée.

## Automatisation — encore manuel ou partiel

- Relances commerciales : plans auto, **envoi** manuel.
- Preuves documents : détection orphelins ; lien souvent **au clic**.
- Tâches IoT critiques : alerte auto, tâche **option** manuelle.
- RH paie : `confirm()` navigateur.
- Réparation Sync : **guidée**, pas silencieuse.
- Chemins legacy (VentesV2, StocksV4) : contournent l’automatisation.

---

## Alignement des chiffres (priorité utilisateur)

| KPI | Correction juin 2026 |
|-----|----------------------|
| CA mois Carnet | `periodRealized` + commandes filtrées période |
| CA Commercial (période active) | `headlineKpis` sur commandes période |
| Valeur stock Accueil | CMUP si calculable, sinon prix fiche |

**À documenter en UI** : Finance = cumul ; Dashboard encaisse = date paiement ; Commercial encaissé = lié commandes.

---

## Roadmap d’amélioration (phases)

### Phase A — Cohérence (en cours)
- [x] Carnet CA mois / période
- [x] Commercial KPI période
- [x] Stock valeur CMUP Accueil
- [ ] Badge « Cumul ferme » sur Finance Résumé
- [ ] Glossaire marge (vente / réelle / opérationnel)

### Phase B — Fermer bypass
- [ ] VentesV2 → `recordSalePayment`
- [ ] StocksV4 → `commitStockPurchaseWorkflow`
- [ ] Réduire doublons événements AppContext

### Phase C — Automatisation défaut
- [ ] Tâche auto si alerte critique sans action (paramètre ferme)
- [ ] Relance : option envoi auto WhatsApp (opt-in)
- [ ] RH : unifier annuaire Supabase

### Phase D — UX allègement
- [ ] Commercial Ventes : alléger cartes (devis/réco déjà sur onglets)
- [ ] Finance Trésorerie : sections repliables
- [ ] Dashboard : restaurer onglets ou aligner config

### Phase E — Livrables utilisateur
- [ ] PDF guide par module / onglet (usage, pas technique)
- [ ] PowerPoint pitch dirigeant / financeur

---

## Mode données simulées

Activer dans **Paramètres** → permet de voir :
- stocks bas, créances, lots, ventes, alertes pré-remplies ;
- anomalies Sync (paiements sans finance si seed incomplet) ;
- parcours complet sans saisie terrain.

**Test recommandé** : période « mois en cours » + données simulées + parcours Commercial → Finance → Documents → Activité.

---

## Synthèse forces

- Architecture 4–6 onglets + hooks sur modules récents.
- Moteurs canoniques documentés (`consolidateFinance`, KPI commercial consolidé, marges vente, CMUP).
- Tests stabilité 253+ combinaisons onglet.
- Interconnexions auditables + Sync ERP.

## Synthèse risques

- Multiplicité des moteurs « marge » et « CA » sans libellé clair.
- Finance toujours cumul vs reste de l’ERP filtré par période.
- Routes legacy encore accessibles.
- Double stockage RH.

---

*Dernière mise à jour : juin 2026 — à enrichir après chaque sprint d’amélioration.*
