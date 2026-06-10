# Audit complémentaire — Reproduction (couches transversales ERP)

**Date :** 9 juin 2026  
**Statut :** Figement architecture avant validation V1 — **aucune implémentation, aucun code**  
**Complète :** `AUDIT_ULTRA_DETAILLE_REPRODUCTION_ELEVAGE_2026-06-09.md` (boutons, formulaires, KPI, IA, voix, caméra, workflow)  
**Périmètre :** Documents, preuves, droits, alertes, notifications, interconnexions ERP, Assistant ERP, événements métier, lecture investisseur  

---

## Score actuel (couches transversales)

| Couche | Score / 100 | Synthèse |
|--------|-------------|----------|
| Documents & rattachement | 18 | Pas de type « reproduction » ; preuves sur champ animal brut |
| Preuves par événement | 15 | Aucune règle métier repro |
| Droits & permissions | 22 | Accès module seulement ; pas granularité repro |
| Alertes reproduction | 12 | Code `getReproductionAlerts` orphelin ; pas alertes_center repro |
| Notifications | 25 | Push/toast génériques ; pas message repro ciblé |
| Interconnexions ERP | 28 | Partiel naissance/gestation ; reste absent |
| Assistant ERP | 10 | Zero intent reproduction |
| Événements métier | 35 | `gestation`/`naissance` partiels ; `reproduction_events` vide |
| Lecture investisseur | 15 | Rapport Élevage sans section repro |
| **Score global transversal** | **20 / 100** | |
| **Score combiné (audit précédent 24 + transversal 20)** | **~22 / 100** | Centre unique non atteint |

---

## Matrice synthèse (livrable 2)

| Axe | État | Verdict |
|-----|------|---------|
| **Documents** | `documents` table OK ; pas cible animal/repro/portée | **Absent canal officiel** |
| **Preuves** | photo_url / documents_text sur animal ; scanner véto Santé | **Non structuré repro** |
| **Droits** | Rôles ERP module ; pas action « annuler mise bas » | **Risque fraude/erreur** |
| **Alertes** | Santé, stock, malade ; pas gestation/MB | **Quasi absent** |
| **Notifications** | Browser push + toast ; WhatsApp simulé alertes | **Pas repro** |
| **Interconnexions** | Voir section 6 | **Majorité Absent/Partiel** |
| **Assistant ERP** | animal_creation seulement | **Doublon partiel Animaux** |
| **Événements** | business_events partiel ; reproduction_events 0 usage | **Double schéma non exploité** |

---

# 1. AUDIT DES DOCUMENTS

## 1.1 Canaux documentaires existants

| Canal | Schéma / fichier | Champs clés |
|-------|------------------|-------------|
| Bibliothèque ERP | `documents` | `title`, `file_url`, `module_source`, `entity_type`, `entity_id`, `document_category` |
| ERP documents | `erp_documents` | `module_lie`, `related_id`, `document_type` |
| Comptabilité | `accounting_documents` | lié `transaction_id` |
| Champ animal | `animals.photo_url` | URL image inline |
| Champ animal | `documents_text` | Texte libre (liens/noms par ligne) |
| Santé | `sante.preuve_photo_url` | Preuve intervention |
| Scanner IA | `DocumentScannerPanel` | Types : facture, ordonnance véto, reçu, BL |

**`DOCUMENT_TARGET_TYPES` (`documentsWorkflow.js`) :** finance, vente, paiement, facture, achat_stock, soin, équipement, culture, paie — **pas animal, pas reproduction, pas portée**.

## 1.2 Tableau documents reproduction (cible métier)

| Document | Créé où ? (existant) | Stocké où ? | Visible où ? | Lié à quoi ? | Verdict |
|----------|----------------------|-------------|--------------|--------------|---------|
| Certificat de naissance | **N'existe** | — | — | jeune / portée | **Absent** |
| Certificat vétérinaire repro | Partiel : ordonnance via **Santé** scanner | `documents` + `sante` | Santé, Documents | animal (indirect) | **Mal rattaché** repro |
| Rapport de gestation (écho) | **N'existe** | — | — | femelle / event | **Absent** |
| Fiche d'insémination | **N'existe** | — | — | reproduction_event | **Absent** |
| Certificat généalogique | **N'existe** | — | — | mère/père/lignée | **Absent** |
| Rapport de mise bas | **N'existe** | — | — | portée / mère | **Absent** |
| Preuve photo portée | `photo_url` création animal | Champ `animals` | Fiche Animaux | animal (jeune) | **Orphelin** vs Documents |
| Preuve photo mère | Idem ou Santé | animal / sante | Animaux / Santé | mère | **Dupliqué** |
| Document sanitaire (délai vente) | Santé workflow | sante + documents | Santé | animal | Pas lien gestation |
| QR / boucle scan | Pas document ; `qr_code` texte | `animals` | Animaux | animal | Identification, pas archive |
| documents_text libre | Création/édition Animaux | `animals` | Historique modal | animal | **Non indexé** bibliothèque |

## 1.3 Rattachement par entité

| Entité | Support `documents` officiel | Support inline animal | reproduction_events |
|--------|------------------------------|----------------------|---------------------|
| **Animal (jeune)** | Non (pas dans TARGET_META) | photo_url, documents_text | — |
| **Mère** | Non | idem fiche femelle | femelle_id (schéma seul) |
| **Père** | Non | idem | male_id (schéma seul) |
| **Portée** | Non | portee_id texte seul | — |
| **Lot** | Non (avicole séparé) | lot_id sur animal optionnel | — |
| **reproduction_event** | Non | — | notes seul |

## 1.4 Problèmes documents

| Problème | Gravité |
|----------|---------|
| **Documents inexistants** : certificat naissance, fiche IA, rapport MB, généalogie | Haute |
| **Documents dupliqués** : photo sur animal + possible document Santé + documents_text | Moyenne |
| **Mal rattachés** : ordonnance véto → Santé, pas Reproduction ni portée | Moyenne |
| **Orphelins** : `documents` sans `module_source=reproduction` ; `documents_text` hors bibliothèque | Haute |
| **Scanner** : pas type `certificat_naissance` / `diagnostic_gestation` | Moyenne |

## 1.5 Architecture documentaire cible (une source officielle)

```
Création preuve → table documents (module_source=reproduction, entity_type, entity_id)
                → proof_document_id sur reproduction_event OU animal/portée
                → visible : Reproduction (journal), Documents (bibliothèque), Traçabilité
```

**Règle :** ne plus stocker les preuves repro uniquement dans `documents_text` ; conserver `documents_text` en lecture legacy (non régression).

---

# 2. AUDIT DES PREUVES (matrice complète)

Légende : **O** = obligatoire | **R** = recommandée | **—** = aucune | Types : photo, PDF/doc, note, signature, QR, scan boucle

| Événement métier | Obligatoire | Recommandée | Aucune | Photo | PDF | Note | Signature | QR/scan | Existant |
|------------------|-------------|-------------|--------|-------|-----|------|-----------|---------|----------|
| **Saillie naturelle** | — | Note (date, mâle) | — | — | — | R | — | Scan mère R | **Absent workflow** |
| **Insémination** | R : ref semence / dose | Photo fiche semence | — | R | R | R | — | Scan mère R | **Absent** |
| **Diagnostic gestation** | — | Photo écho ou PDF véto | — | R | R | R | — | Scan mère R | **Absent** |
| **Déclaration gestation** | — | Note | Oui terrain | — | — | R | — | Scan mère R | Partiel (update champ) |
| **Mise bas** | — | Photo portée | — | R | — | R | — | Scan mère **O** cible | Partiel (naissance animal) |
| **Naissance jeune (création)** | — | Photo jeune R | — | R | — | — | — | Scan boucle R | photo_url optionnel |
| **Sevrage** | — | Note date/poids | — | — | — | R | — | Scan jeune R | **Absent** |
| **Transfert jeune** | — | Note localisation | — | — | — | R | — | Scan R | localisation Animaux |
| **Réforme reproductrice** | — | Note motif | — | — | — | R | — | — | Transformation / statut |

**Synthèse :** aucune preuve **obligatoire** codée ; terrain sans garde-fou. **Cible V1 :** scan mère recommandé mise bas ; note suffisante saillie ; écho recommandé P1.

---

# 3. AUDIT DES DROITS ET PERMISSIONS

## 3.1 Modèle actuel (`AuthContext`, `systemAccessWorkflows`)

| Rôle | Modules Élevage/Animaux | Actions système |
|------|-------------------------|-----------------|
| **admin** | * | * |
| **manager** | * (ERP_MODULE_PERMISSIONS) | voir, créer, modifier, exporter, valider |
| **employe** | animaux, avicole, sante, … | voir, créer |
| **veterinaire** | animaux, sante, tracabilite | voir, créer, modifier |
| **comptable** | finances, documents, … | voir, créer, modifier, exporter, payer |
| **visiteur** | dashboard, assistant_erp | voir |

**Granularité reproduction :** **aucune** — pas de permission `declarer_mise_bas`, `modifier_genealogie`, etc.

## 3.2 Matrice cible (sans implémentation)

| Action | Lecteur | Opérateur | Responsable élevage | Administrateur |
|--------|---------|-----------|---------------------|----------------|
| Voir KPI / listes gestantes | ✓ | ✓ | ✓ | ✓ |
| Déclarer saillie / IA | — | ✓ | ✓ | ✓ |
| Déclarer gestation | — | ✓ | ✓ | ✓ |
| Déclarer mise bas | — | ✓ | ✓ | ✓ |
| Modifier mise bas (N petits, dates) | — | — | ✓ | ✓ |
| Annuler mise bas | — | — | ✓ (justification) | ✓ |
| Supprimer jeune créé par erreur | — | — | ✓ (audit) | ✓ |
| Modifier généalogie (mère/père) | — | — | ✓ | ✓ |
| Valider insémination (technicien/véto) | — | — | ✓ | ✓ |
| Créer document officiel (certificat) | — | — | ✓ | ✓ |
| Export investisseur repro | ✓ | ✓ | ✓ | ✓ |

**Mapping rôles ERP actuels → cible :**

| Rôle ERP actuel | Profil cible approximatif |
|-----------------|---------------------------|
| visiteur | Lecteur |
| employe | Opérateur |
| veterinaire | Opérateur (+ diagnostic véto) |
| manager | Responsable élevage |
| admin | Administrateur |

## 3.3 Risques identifiés

| Risque | Cause actuelle | Impact |
|--------|----------------|--------|
| **Fraude cheptel** | Tout employé peut créer animal (naissance) | Fausses entrées cheptel |
| **Erreur saisie** | Pas validation responsable mise bas | Doublons jeunes, mère non MAJ |
| **Incohérence cheptel** | Généalogie modifiable sans audit | Lignée fausse |
| **Incohérence financière** | Naissance avec purchase_cost > 0 ; opp vente auto | Valorisation / marge fausse |
| **Annulation non tracée** | Pas workflow annuler MB | Historique menteur |
| **Document officiel** | Quiconque peut upload sans catégorie repro | Preuves non recevable investisseur |

---

# 4. AUDIT DES ALERTES

## 4.1 Alertes reproduction — cible vs existant

| Nom alerte | Déclencheur | Priorité | Module destinataire | Existant ? |
|------------|-------------|----------|---------------------|------------|
| Mise bas prévue (14 j) | date_prevue_mise_bas ≤ 14 | warning | Reproduction | Code `getReproductionAlerts` **non branché** |
| Gestation dépassée | date_prevue < today & en_gestation | critique | Reproduction + Santé | Code seul |
| Reproduction à planifier | F disponible, saine, pas gestante | info | Reproduction | Code seul |
| Femelle infertile | statut_reproduction=infertile | info | Reproduction | Champ possible, **pas alerte** |
| Intervalle vêlage anormal | < X j entre mises bas | warning | Reproduction | **Absent** |
| Mortalité nouveau-nés | morts portée / N petits | critique | Reproduction + Santé | **Absent** |
| Sevrage oublié | date sevrage prévue passée | warning | Reproduction | **Absent** |
| Certificat / écho manquant | gestation sans doc 30 j | warning | Documents + Repro | **Absent** |
| Diagnostic gestation manquant | saillie sans diagnostic à J+X | warning | Reproduction | **Absent** |
| Insémination à programmer | calendrier espèce | info | Reproduction | **Absent** |

## 4.2 Alertes ERP liées (non reproduction mais animaux)

| Alerte | Source | Lien repro |
|--------|--------|------------|
| Animal malade | AppNotificationManager, AlertesCenter | Bloque repro |
| Rappel sanitaire | AppContext createAnimalFollowUpTaskAndAlert | Pas lié gestation |
| Déparasitage / eau | technicalFarmingRules | Indirect |
| Prêt à vendre bovin | AlertesCenterV2 cycles | Conflit si gestante |
| Nav badge Élevage | vaccinsRetard + malades + lots | **Pas gestation** |

## 4.3 Stockage alertes

| Mécanisme | Usage repro |
|-----------|-------------|
| `alertes_center` | module_source possible ; **aucune** repro auto |
| `getReproductionAlerts` | Retourne array ; **jamais injecté** UI |
| Toast / push | Dérivées génériques | Pas MB/gestation |
| Tâches `taches` | Santé seulement | Pas tâche pré-MB |

---

# 5. AUDIT DES NOTIFICATIONS

## 5.1 Canaux existants

| Canal | Implémentation | Reproduction |
|-------|----------------|--------------|
| Notification ERP (in-app) | `alertes_center`, AppNotificationManager | Pas message repro |
| Toast | react-hot-toast | Générique |
| Browser push | `appNotifications`, push_subscriptions | Alertes critiques globales |
| WhatsApp | `whatsapp_logs` simulé depuis Alertes | Commercial/relance ; **pas repro** |
| Email | **Non** workflow repro identifié | Absent |
| SMS | **Non** | Absent |
| Assistant ERP | Message texte + ouverture formulaire | Pas intent repro |

## 5.2 Messages cibles (audit — pas implémentation)

| Message | Canal recommandé | Déclencheur |
|---------|------------------|-------------|
| « Vache 102 : mise bas prévue dans 48 h » | ERP + push | J-2 date_prevue |
| « Brebis 14 : sevrage prévu demain » | ERP + WhatsApp option | J-1 sevrage |
| « Diagnostic gestation manquant depuis 30 j » | ERP | gestation sans doc |
| « Gestation dépassée — vérifier femelle X » | ERP critique + push | date passée |
| « Portée enregistrée — 2 jeunes créés » | Toast confirmation | post-validation MB |
| « Certificat naissance à joindre » | ERP + Documents | J+7 naissance sans doc |

**Règle cible :** `send_whatsapp` sur alertes reproduction **optionnel** par ferme (flag existant sur alertes sanitaires : `send_whatsapp: false` par défaut).

---

# 6. AUDIT INTERCONNEXIONS ERP (flux détaillés)

Statuts : **OK** | **Partiel** | **Absent** | **Doublon**

## 6.1 ANIMAUX

| Flux | Source → Destination | Statut | Risque divergence |
|------|----------------------|--------|-------------------|
| Naissance hub → create animal | Reproduction → animaux | Partiel | Hey Horizon bypass events |
| Gestation → event | animaux update → business_events | Partiel | Pas UI |
| Gestation → traçabilité | AppContext appendAnimalTraceStep | Partiel | Si pas update officiel |
| mère/père/portée | animaux champs | Absent UI | Ressaisie manuelle |
| Création → opportunité vente | wrapCreate → Commercial | Doublon | Naissance = vente |
| Fiche → Reproduction | — | Absent | Navigation seule |
| Pesée jeune | Animaux | OK | Hors repro |

## 6.2 SANTÉ

| Flux | Statut | Note |
|------|--------|------|
| Vaccin pré-mise bas | Absent | Pas lien gestation |
| Ordonnance véto → repro | Partiel | Scanner Santé seul |
| Intervention → animal gestante | Partiel | Cible animal_id |
| Délai sanitaire vente | OK Santé | Pas croisement gestation |
| Impact santé → statut repro | Absent | |

## 6.3 ALIMENTATION

| Flux | Statut |
|------|--------|
| Besoin gestante | Absent |
| Alimentation mère post-MB | Partiel (animal_id logs) |
| Coût repro dans marge jeune | Partiel (coûts Animaux) |

## 6.4 PRODUCTION

| Flux | Statut |
|------|--------|
| Œufs / ponte | OK séparé avicole |
| Repro ruminants | Absent onglet Production |

## 6.5 TRANSFORMATION

| Flux | Statut |
|------|--------|
| Réforme femelle | Partiel (abattage animal) |
| Vente gestante (bloquée) | Absent règle |

## 6.6 COMMERCIAL

| Flux | Statut |
|------|--------|
| Opp vente naissance | Doublon | wrapCreate |
| Vente jeunes | Partiel | Après croissance Animaux |

## 6.7 FINANCE

| Flux | Statut |
|------|--------|
| purchase_cost jeune | Partiel manuel |
| Valorisation cheptel naissance | Absent |
| Coût IA/véto | Partiel via Santé |
| Écriture auto MB | Absent |

## 6.8 DOCUMENTS

| Flux | Statut |
|------|--------|
| Upload certificat → entité repro | Absent |
| Lien proof_document_id animal | Absent |
| Scanner → repro | Absent |
| Orphan documents | Partiel | findOrphanDocuments générique |

## 6.9 ASSISTANT ERP

| Flux | Statut |
|------|--------|
| Intent gestation/MB | Absent |
| Navigation elevage Reproduction | Partiel |
| Pré-remplissage formulaire | Partiel animal_creation |

**Données ressaisies inutilement :** mère, dates gestation, N petits, preuves (multi-canal).  
**Automatisations manquantes :** MAJ mère post-MB, N animaux, events reproduction_events, alertes, documents, finance valorisation.

---

# 7. AUDIT ASSISTANT ERP

## 7.1 Règle architecture (validée audit)

| Composant | Rôle |
|-----------|------|
| **Assistant ERP** | Intelligence : comprendre, analyser, recommander, pré-remplir |
| **Onglet Reproduction** | Workflows : valider, enregistrer, journaliser |
| **Interdit** | Création automatique sans validation humaine |

## 7.2 État actuel

| Capacité | Existant |
|----------|----------|
| `animal_creation` intent | Oui → module `animaux`, pas `reproduction` |
| `AUTO_OPEN_FORM_TYPES` | Inclut animal_creation, pas reproduction_* |
| `openHeyHorizonForm` | Navigate + dispatch event |
| `HeyHorizonQuickAsk` sur Élevage | Générique moduleKey elevage |
| `aiIntentEngine` patterns repro | **Aucun** |
| `voiceCommands.js` repro | **Aucun** |
| LLM enhance | Pas domaine repro |

## 7.3 Cible Assistant ↔ Reproduction

| Demande vocale / texte | Compréhension Assistant | Action (après validation) |
|------------------------|-------------------------|---------------------------|
| « vache 102 gestante » | Intent `reproduction_gestation` | Ouvre Reproduction draft femelle + dates |
| « brebis 14 mis bas 2 agneaux » | Intent `reproduction_mise_bas` | Draft portée N=2, mère résolue |
| « programmer insémination brebis 8 » | Intent `reproduction_ia` | Draft saillie/IA |
| « quelles femelles sont gestantes ? » | Analyse lecture | Réponse + lien onglet liste |
| « performance reproduction ovins » | Analyse KPI | Synthèse + section repliable |
| « risque mise bas cette semaine » | Analyse dates | Liste + alertes |

**Formulaires pré-remplis (cible V1) :** gestation, mise bas (mère scannée), naissance jeune — **toujours** statut `awaiting_validation`.

**Analyses générées :** liste gestantes, MB 30 j, femelles disponibles — **lecture seule** dans Assistant ou renvoi Reproduction.

**Recommandations :** planifier saillie, rappel écho, préparation box — **sans** commit auto.

**Doublon à éviter :** ne pas dupliquer CRUD animal complet dans Assistant ; Reproduction = workflow, Animaux = identité post-création.

---

# 8. AUDIT DES ÉVÉNEMENTS MÉTIER

## 8.1 Cartographie

| Événement | Existe ? | Stocké où ? | Visible où ? | Utilisé où ? |
|-----------|----------|-------------|--------------|--------------|
| **saillie** | Non | — | — | — |
| **insémination** | Non | — | — | — |
| **gestation** | Oui (si update en_gestation) | business_events | Historique animal (si event lié) | AppContext |
| **diagnostic** | Non | — | — | — |
| **mise bas** | Non (type dédié) | — | — | Regex KPI « naissance/mise bas » |
| **naissance** | Oui (mode_acquisition) | business_events | Animaux historique | buildCreateEvents |
| **reproduction** (interne) | Oui | business_events | Idem | buildCreateEvents |
| **sevrage** | Non | — | — | — |
| **réforme** | Partiel (statut/transform) | business_events transformation | Transformation | Pas repro |
| **creation_animal** | Oui Hey Horizon | business_events | — | **Doublon** naissance |
| **opportunite_vente_animal** | Oui | business_events | Commercial | Risque naissance |

## 8.2 Table `reproduction_events`

| Aspect | État |
|--------|------|
| Schéma Supabase / erpRealSchema | Défini |
| Service CRUD | **Absent** |
| MODULE_CONFIG | Lié animaux child table |
| UI lecture/écriture | **Absent** |
| Seed simulation | **Absent** |
| Lien business_events | **Absent** |

**Verdict :** double couche données (**animaux** champs + **business_events**) sans **`reproduction_events`** opérationnel → risque divergence future.

## 8.3 Traçabilité (`tracabilite`)

| Step | Code | UI |
|------|------|-----|
| Naissance / acquisition | getAcquisitionTraceStep | append on create |
| Gestation | getGestationTraceStep | append on en_gestation toggle |
| Saillie / MB / sevrage | — | — |

---

# 9. AUDIT INVESTISSEUR

**Question :** en regardant **uniquement** l’onglet Reproduction, l’investisseur comprend-il la performance reproductive ?

| Dimension | Compréhensible ? | Manque |
|-----------|------------------|--------|
| Performance reproductive (IVV, taux gestation) | **Non** | KPI faux « À suivre » ; pas IVV |
| Taux de renouvellement cheptel | **Non** | Naissances vs femelles mal calculé |
| Qualité génétique | **Non** | Pas généalogie, pas index |
| Croissance cheptel | **Partiel** | Naissances events approximatifs |
| Maîtrise sanitaire repro | **Non** | Pas lien véto/écho/preuve |

**Rapport `buildElevageInvestorReport` :** lots, œufs, mortalité, alimentation, P&L activités — **zéro ligne reproduction**.

**Export PDF Élevage :** pas section gestantes, naissances période, taux survie néonatal.

**Ce qu’un investisseur devrait voir (cible, repliable) :**

- Femelles reproductrices actives  
- Taux gestation / naissances / 100 femelles  
- Intervalle entre mises bas  
- Mortalité néonatale  
- Preuves documentaires (% portées avec photo/certificat)  
- Croissance nette cheptel (entrées naissance − sorties)

---

# 10. RISQUES CRITIQUES (livrable 3)

| # | Risque | Couche | Sévérité |
|---|--------|--------|----------|
| R1 | Aucune preuve officielle liée reproduction | Documents | Haute |
| R2 | `reproduction_events` schéma mort → dette données | Événements | Haute |
| R3 | Alertes gestation/MB non affichées | Alertes | Haute |
| R4 | Employé peut fausser cheptel (naissance sans contrôle) | Droits | Haute |
| R5 | Opp vente sur naissance | Commercial | Moyenne |
| R6 | Assistant crée animal sans workflow repro | Assistant | Moyenne |
| R7 | Investisseur ne voit pas performance repro | Investisseur | Moyenne |
| R8 | Documents orphelins (photo_url vs bibliothèque) | Documents | Moyenne |
| R9 | Pas annulation tracée mise bas | Droits / events | Moyenne |
| R10 | Notifications terrain absentes (MB 48 h) | Notifications | Moyenne |

---

# 11. ARCHITECTURE CIBLE VALIDÉE (couches transversales)

```
┌─────────────────────────────────────────────────────────────────┐
│ DOCUMENTS : module_source=reproduction, types certifiés         │
│   entity : reproduction_event | animal | portée (portee_id)     │
├─────────────────────────────────────────────────────────────────┤
│ PREUVES : règles par event (matrice §2) — scan mère prioritaire │
├─────────────────────────────────────────────────────────────────┤
│ DROITS : Opérateur saisie / Responsable valide & corrige        │
├─────────────────────────────────────────────────────────────────┤
│ ALERTES : getReproductionAlerts → alertes_center (dedupe)       │
├─────────────────────────────────────────────────────────────────┤
│ NOTIFICATIONS : ERP + push ; WhatsApp opt-in alertes warning+   │
├─────────────────────────────────────────────────────────────────┤
│ EVENTS : reproduction_events (vérité) → business_events (trace) │
├─────────────────────────────────────────────────────────────────┤
│ ASSISTANT : intents → draft Reproduction → validation humaine   │
└─────────────────────────────────────────────────────────────────┘
```

**Source de vérité unique :**

- Événements repro : `reproduction_events` (V2 CRUD ; V1 lecture/alertes depuis animaux)  
- Documents : table `documents` avec lien entity  
- État femelle courant : champs `animaux` synchronisés depuis dernier event validé  
- Preuves : `documents` + `proof_document_id` ; legacy `documents_text` lecture seule  

---

# 12. PLAN V1 COMPLÉMENTAIRE (livrable 5)

S’ajoute au plan V1 fonctionnel (`AUDIT_ULTRA_DETAILLE` §12). **Aucune implémentation ici.**

| ID | Action transversale | Priorité |
|----|---------------------|----------|
| V1-T01 | Brancher `getReproductionAlerts` → `alertes_center` (dedupe_key repro:gestation:{id}) | P0 |
| V1-T02 | Nav badge / compteur repro dans KPI hub (gestantes + alertes) | P0 |
| V1-T03 | Notification in-app + push pour alertes critique/warning repro | P0 |
| V1-T04 | Document type `photo_portee` / `certificat_naissance` dans catégories (spec) | P1 |
| V1-T05 | Lier upload mise bas → `documents` entity animal mère + portee_id notes | P1 |
| V1-T06 | Interdire opp vente auto naissance (déjà V1 fonctionnel) | P0 |
| V1-T07 | Assistant intents → draft Reproduction (gestation, mise bas) sans auto-commit | P0 |
| V1-T08 | Rôles : documenter matrice §3.2 dans Gestion système (spec UI) | P1 |
| V1-T09 | Event `naissance` unifié (supprimer doublon `creation_animal` pour mode naissance) | P1 |
| V1-T10 | Section investisseur : 5 lignes repro dans export Élevage (lecture animaux/events) | P1 |
| V1-T11 | WhatsApp template optionnel alerte MB J-2 (log simulé comme Commercial) | P2 |
| V1-T12 | Tâche auto « préparer mise bas » J-7 (module_lie=reproduction) | P1 |
| V1-T13 | DOCUMENT_TARGET_TYPES : ajouter ANIMAL / REPRODUCTION (spec documentsWorkflow) | P2 |
| V1-T14 | Tests : alerte gestation dépassée générée et visible Activité | P1 |

**Critères d’acceptation transversaux V1 :**

1. Une gestation déclarée génère une alerte visible (ERP + liste Reproduction).  
2. Une preuve photo mise bas peut être rattachée à un document indexé (spec minimum).  
3. Assistant comprend au moins 2 phrases repro et ouvre draft Reproduction.  
4. Investisseur export contient naissances période + gestantes count.  
5. Aucune régression : documents Santé, ordonnance scanner, documents_text legacy.

---

# Annexes — fichiers audités

- `src/utils/documentsWorkflow.js` — DOCUMENT_TARGET_TYPES  
- `src/services/erpRealSchema.js` — documents, reproduction_events  
- `src/context/AuthContext.jsx` — ROLE_PERMISSIONS  
- `src/utils/systemAccessWorkflows.js` — ACTION_PERMISSIONS  
- `src/utils/animalLifecycle.js` — getReproductionAlerts  
- `src/context/AppContext.jsx` — buildCreateEvents, buildUpdateEvents, trace  
- `src/components/AppNotificationManager.jsx`  
- `src/services/erpHealthRules.js` — navAlertFlags (pas repro)  
- `src/services/heyHorizonAssistantService.js`, `aiIntentEngine.js`  
- `src/services/aiGateway/documentScannerTypes.js`  
- `src/utils/elevageExport.js` — buildElevageInvestorReport  
- `src/modules/AnimauxSpeciesFocused.jsx` — photo_url, documents_text  

---

*Audit complémentaire — validation métier requise avant implémentation V1 Reproduction.*
