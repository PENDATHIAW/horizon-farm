# Grille d'audit formulaires & interconnexions — tous modules

**Usage :** à appliquer **avant** toute correction, module par module, pour préparer la démo financeur.

---

## 1. Inventaire formulaires

Pour chaque module, lister :

- Modales / wizards (`CreateModal`, `EditModal`, `BaseModal`, formulaires inline)
- Fichier source + déclencheur (bouton, KPI, navigation externe)
- Champs : type réel (text, number, date, select, textarea)
- Boutons : Valider / Enregistrer / Annuler / Fermer — handler réel ou stub ?

---

## 2. Cohérence des champs

| Contrôle | Question |
|----------|----------|
| Listes déroulantes | Les champs référençant une entité (client, lot, stock, ferme, statut) sont-ils en `<select>` ? |
| Héritage | Sélection d'une source (lot, stock, opportunité) préremplit-elle produit, qty, prix, client ? |
| Doublons | Y a-t-il deux champs pour la même notion (ex. `type` + `type_client`) ? |
| Validation | Message d'erreur clair avant submit ? Champs obligatoires bloquants ? |
| Annuler | Ferme sans persister ? Draft conservé ou perdu à tort ? |

---

## 3. Boutons Valider / Annuler

- **Annuler** : ferme la modale, ne crée pas de ligne partielle en base
- **Valider** : persiste via CRUD / workflow métier (`commit*`, `record*`, `confirm*`)
- Pas de `window.prompt` pour des saisies métier critiques (prospect, preuve, date planifiée)
- État `saving` / désactivation pendant l'async

---

## 4. Interconnexions ERP (à vérifier par flux)

| Action | Modules / tables impactés attendus |
|--------|-----------------------------------|
| Vente validée | `sales_orders`, items, `deliveries`, `invoices`, `payments`, `finances`, stock/lot/animal/culture, `documents`, `taches`, `alertes`, `business_events`, opportunité fermée |
| Paiement | `payments` + `finances` + MAJ commande/client |
| Livraison | `confirmSaleDelivery` — commande + livraison + tâches (pas simple patch statut) |
| Opportunité → vente | Préremplissage wizard ; clôture **après** vente validée (pas avant) |
| Opportunité auto (IA) | Persistance en base avant conversion |
| Devis | Client choisi explicitement ; conversion → commande |
| Relance WhatsApp | Log `whatsapp_logs` + retour ID pour suivi envoi |

---

## 5. Navigation & deep-links

- Onglets canoniques (`horizonVision.config.js`)
- Alias legacy résolus (`resolve*Tab`)
- Liens externes (Vision, Finance, Centre, Hey Horizon) → onglet correct

---

## 6. Gravité des écarts

| Niveau | Exemple |
|--------|---------|
| **Critique** | Crash, données orphelines, workflow cassé en démo |
| **Haute** | Champ libre au lieu de select sur entité liée ; interconnexion manquante |
| **Moyenne** | `window.prompt`, draft perdu, UX démo fragile |
| **Basse** | Libellé, doublon cosmétique, commentaire manquant |

---

## 7. Livrables par module

1. `docs/rapports/AUDIT_MODULE_<NOM>_YYYY-MM-DD.md` (onglets + formulaires + interconnexions)
2. Correctifs + tests ciblés
3. Merge `main` + push

---

## Modules — statut audit formulaires

| Module | Navigation | Formulaires | Interconnexions |
|--------|------------|-------------|-----------------|
| Commercial | ✅ | ✅ | ✅ |
| Centre décisionnel | ✅ | ✅ | ✅ |
| Objectifs & croissance | ✅ | Partiel | ✅ |
| Élevage | ✅ | ✅ | ✅ |
| Accueil | ✅ | N/A (lecture) | ✅ |
| Finance | ✅ | Partiel | ✅ |
| Achats & stock | — | — | — |
| Cultures | — | — | — |
| Activité & suivi | — | — | — |
| Documents | — | — | — |
| RH | — | — | — |
| Objectifs | — | — | — |
