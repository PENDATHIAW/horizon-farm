# Guide utilisateur Horizon Farm

> **PDF prêt à imprimer ou envoyer :** [GUIDE_UTILISATEUR_HORIZON_FARM.pdf](GUIDE_UTILISATEUR_HORIZON_FARM.pdf)  
> Régénérer : `npm run guide:generate` · HTML source : `/guide-utilisateur-horizon-farm.html`

**Version :** juin 2026  
**Public :** exploitants agricoles, responsables d’exploitation, chefs d’équipe terrain

---

## 1. Qu’est-ce qu’Horizon Farm ?

Horizon Farm est un **ERP agricole** conçu pour piloter une exploitation au quotidien : élevage, cultures, stock, ventes, finances et suivi terrain. L’application regroupe vos données en un seul endroit et vous aide à **voir l’essentiel**, **agir au bon moment** et **garder la traçabilité**.

Trois principes guident l’interface :

- **Terrain d’abord** — ce qui compte pour la ferme (effectifs, récoltes, ventes, alertes) est visible sans jargon technique.
- **Un seul fil conducteur** — une vente met à jour le stock, la trésorerie et l’activité ; un achat aliment met à jour les dettes fournisseurs.
- **Validation avant action** — l’assistant Hey Horizon prépare les enregistrements ; vous validez avant que rien ne soit écrit.

---

## 2. Premiers pas

### 2.1 Connexion et profil

1. Ouvrez Horizon Farm depuis votre navigateur ou l’application installée (PWA).
2. Connectez-vous avec votre compte.
3. Vérifiez la **ferme active** en haut de l’écran (sélecteur de ferme si vous gérez plusieurs sites).
4. Choisissez la **période** (mois en cours, trimestre, année) pour les indicateurs filtrés.

### 2.2 Mode démonstration

Dans **Gestion système → Paramètres**, vous pouvez activer le **mode données simulées** pour explorer l’application avec un jeu d’exemple réaliste (bandes avicoles, parcelles, ventes, capteurs). Idéal pour la formation ou une présentation client.

### 2.3 Navigation générale

| Zone | Rôle |
|------|------|
| **Accueil** | Vue dirigeant : état global, capteurs, objectifs, conseil, journal |
| **Élevage** | Lots, animaux, alimentation, santé, reproduction, transformation |
| **Cultures** | Parcelles, campagnes, récoltes, intrants |
| **Achats & Stock** | Inventaire, réceptions, mouvements, fournisseurs |
| **Commercial** | Ventes, clients, livraisons, encaissements |
| **Finance & Pilotage** | Trésorerie, créances, dettes, rentabilité |
| **Activité & Suivi** | Cockpit, actions à traiter, traçabilité, performance |
| **Smart Farm** | Capteurs, caméras, flux temps réel, automatisation |
| **Hey Horizon** | Assistant conversationnel (vente, achat, alerte, question métier) |

---

## 3. Accueil — le carnet du dirigeant

L’accueil est votre **tableau de bord terrain**. Il affiche :

### 3.1 Cartes domaine (sans icônes décoratives)

- **Élevage** — effectifs par espèce (pondeuses, chair, bovins…), mortalités du jour, lots sous traitement.
- **Cultures** — parcelles actives, surfaces, cultures principales, parcelles à surveiller.
- **Stock** — nombre de produits, emplacements, ruptures, DLC proches.
- **Finance** — trésorerie nette, créances, dettes.

Cliquez sur une carte pour ouvrir le module correspondant.

### 3.2 Bandeau capteurs & terrain

Résumé **Smart Farm** sur l’accueil :

- Température, humidité air et sol (selon capteurs connectés).
- Nombre de capteurs en ligne / hors ligne.
- Alertes seuils dépassés.
- Lien direct vers **Smart Farm → Flux temps réel**.

### 3.3 Objectifs de l’exploitation

- **CA mois** — réalisé vs objectif du mois.
- **CA année** — cumul annuel vs objectif.

### 3.4 Conseil Horizon

Message structuré : **Situation → Cause → Action** (ex. stock d’aliment bas, créances à relancer).

### 3.5 Journal d’exploitation

Les 10 derniers événements terrain (ventes, livraisons, récoltes, paiements, soins…) sans bruit administratif (BP, investisseur, tâches internes).

---

## 4. Élevage

### 4.1 Onglets principaux

| Onglet | Usage |
|--------|-------|
| Lots & bandes | Poulets chair, pondeuses, cycles avicoles |
| Animaux | Bovins, ovins, caprins, fiches individuelles |
| Alimentation | Distributions, consommation, lien stock |
| Santé | Vaccins, traitements, rappels |
| Reproduction | Saillies, gestations, naissances |
| Transformation | Abattage, découpe, lien commercial |

### 4.2 Saisies courantes

- **Mortalité** — depuis la fiche lot ou via Hey Horizon (« 5 poulets morts lot A »).
- **Production d’œufs** — saisie journalière ou ramassage.
- **Pesée** — suivi courbe de croissance et aide à la décision vente.
- **Alimentation** — sortie stock automatique si configurée.

### 4.3 Bonnes pratiques

- Clôturer les lots vendus ou terminés pour des indicateurs fiables.
- Renseigner le vétérinaire et les dates de rappel sanitaire.
- Utiliser la **transformation** pour lier abattage → stock viande → vente.

---

## 5. Cultures

### 5.1 Parcelles & campagnes

Créez une **parcelle** (surface, culture, statut) puis suivez les opérations : semis, traitements, récolte.

### 5.2 Récolte

Une récolte enregistrée :

- Met à jour la parcelle.
- Peut alimenter le stock (grains, légumes…).
- Apparaît dans le journal d’accueil et la traçabilité.

### 5.3 Lien Smart Farm

Humidité sol et température parcelle : consultez **Smart Farm** ou le bandeau capteurs sur l’accueil.

---

## 6. Achats & Stock

### 6.1 Parcours type

1. **Réception** — entrée stock + lien fournisseur + dette si à crédit.
2. **Inventaire** — vue quantités, seuils, emplacements.
3. **Mouvements** — journal des entrées/sorties (lecture seule ; saisies dans Stock).
4. **Fournisseurs** — dettes, relances, historique achats.

### 6.2 Alertes stock

- Rupture (quantité ≤ 0 avec seuil défini).
- Sous seuil (réapprovisionnement).
- DLC proche ou dépassée.

### 6.3 Mouvements — vocabulaire

- **Journal** — mouvements officiels enregistrés par l’application.
- **Historique** — anciennes traces (alimentation, événements antérieurs).

---

## 7. Commercial

### 7.1 Vente complète

1. Créer une **commande** (client, produits, prix).
2. Enregistrer une **livraison** si nécessaire.
3. Encaisser le **paiement** (espèces, mobile money, virement).
4. Vérifier la **marge** sur la fiche vente.

### 7.2 Clients & créances

Le module Commercial et l’accueil Finance affichent les montants restant à encaisser. Relancez depuis Commercial ou via message WhatsApp préparé (selon configuration).

### 7.3 Opportunités

Propositions de vente issues des stocks disponibles ou des recommandations (lots prêts à vendre, œufs en surplus…).

---

## 8. Finance & Pilotage

### 8.1 Résumé

- Trésorerie (entrées − sorties récentes).
- Créances clients.
- Dettes fournisseurs et charges.

### 8.2 Rentabilité

Consolidation des coûts élevage + cultures + charges. Les paramètres de coût (rations, prix aliment) se règlent dans l’onglet **Annexe** des modules concernés.

### 8.3 Investissements

Suivi des immobilisations et amortissements (selon données renseignées).

---

## 9. Activité & Suivi

Quatre onglets :

| Onglet | Contenu |
|--------|---------|
| **Cockpit & décisions** | Vue synthèse, alertes critiques, actions recommandées |
| **À traiter maintenant** | Tâches ouvertes, alertes à résoudre, file de traitement |
| **Registre & traçabilité** | Historique des opérations liées |
| **Performance & analytique** | Graphiques, tendances, suivi dans le temps |

**Astuce :** si l’onglet « À traiter maintenant » ne s’ouvre pas depuis un lien externe, cliquez directement sur l’onglet dans la barre du module — la navigation interne est prioritaire.

---

## 10. Smart Farm (capteurs & caméras)

### 10.1 Flux temps réel

- Dernières mesures : température (TC), humidité, sol.
- Événements capteurs (seuils, offline, intrusion…).
- Statut en ligne / hors ligne.

### 10.2 Gestion des équipements

Enregistrement des capteurs, caméras, zones (poulailler, serre, magasin…).

### 10.3 Automatisation

Règles du type « Si température trop haute → alerte + tâche ventilation ». Les commandes matérielles (vannes, ventilateurs) arrivent progressivement ; les **alertes et tâches** sont déjà actives.

---

## 11. Hey Horizon — l’assistant

### 11.1 Ce que vous pouvez dire

- « J’ai vendu 20 tablettes d’œufs à 70 000 FCFA »
- « Réception de 10 sacs d’aliment chez AgroFeed »
- « 3 poulets morts dans le lot B12 »
- « Quel est mon stock de maïs ? »

### 11.2 Workflow

1. Vous formulez votre besoin (texte ou vocal si disponible).
2. L’assistant prépare un **brouillon** (vente, achat, tâche…).
3. Vous **vérifiez et validez**.
4. L’enregistrement est créé dans le bon module.

Aucune écriture sans votre confirmation.

---

## 12. Documents & rapports

- **Centre de contrôle** — état des pièces justificatives.
- **Gestionnaire & OCR** — import et lecture de factures / reçus.
- **Rapprochement** — rapprocher paiements et preuves.
- **Rapports & exports** — synthèses pour banque, partenaires, saison.

---

## 13. Gestion système

Réservé aux administrateurs :

- **Fermes** — création, comparaison multi-sites.
- **Utilisateurs** — rôles et accès (évolution en cours).
- **Paramètres** — devise, unités, mode démo.
- **Sécurité** — journal d’audit.
- **Sauvegardes** — actualiser les données, synchronisation hors ligne.

---

## 14. Multi-fermes et période

- **Ferme unique** — tous les indicateurs concernent ce site.
- **Toutes les fermes** — cumul (accueil affiche souvent « Cumul »).
- **Période** — filtre ventes, finances et certains graphiques.

---

## 15. Résolution de problèmes

| Problème | Piste |
|----------|-------|
| Chiffres à zéro en mode démo | Vérifier que le mode données simulées est activé ; actualiser les données |
| Module qui ne charge pas | Recharger la page ; vider le cache navigateur |
| Onglet qui ne change pas | Cliquer l’onglet dans la barre du module |
| Capteurs absents sur l’accueil | Vérifier Smart Farm → équipements enregistrés |
| Écart de marge / coût | Vérifier Annexe → rations et prix aliment par défaut |

---

## 16. Glossaire métier (non technique)

| Terme | Signification |
|-------|----------------|
| **Lot / bande** | Groupe d’animaux géré ensemble (ex. poulets chair) |
| **CMUP** | Coût moyen unitaire pondéré du stock |
| **Créance** | Argent que un client vous doit encore |
| **DLC** | Date limite de consommation (péremption) |
| **Traçabilité** | Retrouver l’historique d’un produit ou lot |
| **Trésorerie nette** | Solde disponible après entrées et sorties récentes |

---

## 17. Contacts et évolution

Horizon Farm évolue régulièrement (nouveaux modules, capteurs, automatisation). Pour une démo personnalisée ou un déploiement sur votre exploitation, contactez votre interlocuteur Horizon Farm.

**Bonne gestion.**
