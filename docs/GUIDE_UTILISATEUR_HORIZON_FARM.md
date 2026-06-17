# Guide utilisateur Horizon Farm — Édition complète

> **PDF :** [GUIDE_UTILISATEUR_HORIZON_FARM.pdf](GUIDE_UTILISATEUR_HORIZON_FARM.pdf) · Régénérer : `npm run guide:generate`

**Version :** juin 2026  
**Public :** exploitants, dirigeants, chefs d'équipe, comptables terrain, formateurs

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Premiers pas](#2-premiers-pas)
3. [Accueil](#3-accueil)
4. [Assistant ERP (Hey Horizon)](#4-assistant-erp-hey-horizon)
5. [Centre décisionnel](#5-centre-décisionnel)
6. [Objectifs & Croissance](#6-objectifs--croissance)
7. [Élevage](#7-élevage)
8. [Cultures](#8-cultures)
9. [Commercial](#9-commercial)
10. [Achats & Stock](#10-achats--stock)
11. [Finance & Pilotage](#11-finance--pilotage)
12. [Activité & Suivi](#12-activité--suivi)
13. [Documents & Rapports](#13-documents--rapports)
14. [Opérations & Ressources](#14-opérations--ressources)
15. [Smart Farm](#15-smart-farm)
16. [Investisseurs & Forums](#16-investisseurs--forums)
17. [Activité & Sync ERP](#17-activité--sync-erp)
18. [Gestion du système](#18-gestion-du-système)
19. [Fonctionnalités transverses](#19-fonctionnalités-transverses)
20. [Workflows métier pas à pas](#20-workflows-métier-pas-à-pas)
21. [Résolution de problèmes](#21-résolution-de-problèmes)
22. [Glossaire](#22-glossaire)

---

## 1. Vue d'ensemble

Horizon Farm est un **ERP agricole intégré** : une seule application pour piloter l'élevage, les cultures, les stocks, les ventes, la finance, les capteurs connectés, la traçabilité et la préparation investisseur.

### 1.1 Les 17 modules de navigation

| Groupe | Module | Rôle principal |
|--------|--------|----------------|
| Pilotage | **Accueil** | Tableau de bord dirigeant |
| Pilotage | **Assistant ERP** | Hey Horizon — saisie et questions en langage naturel |
| Pilotage | **Centre décisionnel** | Urgences, opportunités, saisons & marchés |
| Pilotage | **Objectifs & Croissance** | Business Plan, zootechnie, simulateur |
| Pilotage | **Investisseurs & Forums** | Dossier banque/ONG, CRM investisseurs |
| Production | **Élevage** | Lots, animaux, santé, reproduction, transformation |
| Production | **Cultures** | Parcelles, récoltes, économie circulaire |
| Commerce | **Commercial** | Ventes, clients, livraisons, abonnements |
| Commerce | **Achats & Stock** | Inventaire, achats, fournisseurs |
| Finance | **Finance & Pilotage** | Trésorerie, créances, investissements, rentabilité |
| Suivi | **Activité & Suivi** | Cockpit, à traiter, traçabilité, performance |
| Suivi | **Documents & Rapports** | OCR, preuves, exports |
| Ressources | **Opérations & Ressources** | RH, paie, parc matériel, maintenance |
| Terrain | **Smart Farm** | Capteurs, caméras, automatisation |
| Admin | **Activité & Sync ERP** | Cohérence données, hors ligne, journal |
| Admin | **Gestion du système** | Fermes, utilisateurs, paramètres, sécurité |

### 1.2 Principes directeurs

- **Terrain d'abord** — indicateurs et actions compréhensibles sans jargon technique.
- **Un seul fil** — une vente met à jour stock, trésorerie et activité ; un achat met à jour dettes et inventaire.
- **Validation avant écriture** — l'assistant prépare, vous validez.
- **Interconnexion** — le moteur de santé ERP détecte les incohérences et propose des réparations.

---

## 2. Premiers pas

### 2.1 Connexion

1. Ouvrez Horizon Farm (navigateur ou application installée PWA).
2. Connectez-vous avec votre compte.
3. Vérifiez le **sélecteur de ferme** (en-tête) si vous gérez plusieurs sites.
4. Choisissez la **période** (mois, trimestre, année) pour filtrer ventes et finances.

### 2.2 Mode démonstration

**Gestion du système → Paramètres** : activez le **mode données simulées** pour explorer avec un jeu réaliste (bandes avicoles, parcelles, ventes, capteurs, BP). Idéal formation et démo client.

### 2.3 Navigation

- **Menu latéral** — accès aux 17 modules, regroupés par thème.
- **Hey Horizon flottant** — panneau assistant accessible depuis n'importe quelle page.
- **Recherche vocale** — barre de recherche en en-tête.
- **Météo** — indicateur météo live (en-tête), utilisé par Cultures et Centre décisionnel.

### 2.4 Multi-fermes et période

- **Ferme unique** — tous les KPI concernent ce site.
- **Toutes les fermes** — cumul groupe (accueil affiche souvent « Cumul »).
- **Période** — filtre ventes, finances, graphiques ; badge visible sur les modules concernés.

---

## 3. Accueil

Le **Carnet Horizon** est le tableau de bord du dirigeant.

### 3.1 Cartes domaine

| Carte | Informations | Action |
|-------|--------------|--------|
| **Élevage** | Effectifs par espèce, mortalités du jour, lots sous traitement | Ouvre Élevage → Lots & bandes |
| **Cultures** | Parcelles actives, hectares, cultures principales | Ouvre Cultures |
| **Stock** | Produits, emplacements, ruptures, DLC | Ouvre Achats & Stock → Inventaire |
| **Finance** | Trésorerie nette, créances, dettes | Ouvre Finance → Résumé |

### 3.2 Bandeau capteurs & terrain

Température, humidité air/sol, capteurs en ligne/hors ligne, alertes seuils. Lien vers **Smart Farm → Flux temps réel**.

### 3.3 Objectifs CA

- **CA mois** — réalisé vs objectif.
- **CA année** — cumul annuel vs objectif.

### 3.4 Conseil Horizon

Message **Situation → Cause → Action** (ex. stock aliment bas, créances à relancer).

### 3.5 Journal d'exploitation

10 derniers événements terrain (ventes, livraisons, récoltes, paiements, soins) sans bruit administratif.

---

## 4. Assistant ERP (Hey Horizon)

Module dédié + panneau global sur toutes les pages.

### 4.1 Ce que vous pouvez faire

- Enregistrer une **vente**, **achat**, **mortalité**, **production œufs**, **récolte**.
- Poser des questions : « Quel est mon stock de maïs ? », « Combien de créances ouvertes ? »
- Importer un **document** (facture, reçu) pour pré-remplir une fiche.
- Utiliser la **voix** (si micro activé) : « Hey Horizon… »

### 4.2 Workflow obligatoire

1. Vous formulez (texte ou vocal).
2. L'assistant prépare un **brouillon**.
3. Vous **vérifiez** montants, client, produit, date.
4. Vous **validez** → enregistrement dans le module cible.

**Aucune écriture sans confirmation.**

### 4.3 Exemples de phrases

- « J'ai vendu 20 tablettes d'œufs à 70 000 FCFA, payé Orange Money. »
- « Réception 10 sacs aliment chez AgroFeed à 24 000 le sac. »
- « 3 poulets morts lot B12 ce matin. »
- « Planifier vaccination lot chair semaine prochaine. »

---

## 5. Centre décisionnel

Pilotage stratégique quotidien — **3 onglets**.

### 5.1 Urgences & risques

- Alertes critiques cross-modules (stock, sanitaire, trésorerie, cohérence).
- Actions recommandées en un clic (tâche, alerte, navigation module).
- Score santé et priorités du jour.

### 5.2 Croissance & opportunités

- Opportunités de vente (stock dispo, lots prêts, surplus récolte).
- Recommandations IA métier avec validation.
- Lien Objectifs & Croissance et Commercial.

### 5.3 Saisons & marchés

- Calendrier marchés et saisons.
- Prix marché de référence.
- Contexte météo pour décisions cultures/élevage.

### 5.4 Exports

Export CSV/Excel des décisions et priorités pour réunion d'équipe.

---

## 6. Objectifs & Croissance

Suivi du Business Plan et performance technique — **4 onglets**.

### 6.1 Suivi du Business Plan

- Objectifs CA mensuels et annuels vs réalisé.
- Projections revenus BP.
- Écarts et rattrapage.

### 6.2 Efficacité Technique & Zootechnique

- Analytics lots : mortalité, thermique, occupation, production.
- Indicateurs par activité (chair, ponte, bovins…).
- Alertes zootechniques.

### 6.3 Simulateur Sandbox

- Simulation maraîchage, diversification, nouvelles activités.
- Scénarios « et si » sans modifier les données réelles.

### 6.4 Sécurisation des Flux

- Trésorerie, dettes, alertes sanitaires consolidées.
- Vue risques trésorerie à 30/90 jours.

---

## 7. Élevage

Module unifié avicole + animaux + santé — **4 onglets**.

### 7.1 Lots & bandes

**Sous-vues : Avicole | Animaux**

| Activité | Actions |
|----------|---------|
| **Avicole** | Créer lot chair/pondeuses, saisir production œufs, mortalité, pesée, clôturer lot |
| **Animaux** | Fiches bovins/ovins/caprins, pesées, statut, lien vétérinaire |
| **Alimentation** | Distributions, consommation, sortie stock automatique |
| **Production** | Hub production : œufs, taux ponte, courbes croissance |

**Saisies courantes :** mortalité, ramassage œufs, pesée, alimentation journalière.

### 7.2 Cycles & Reproduction

- Saillies, gestations, naissances.
- Calendrier reproduction.
- Lien effectifs Accueil.

### 7.3 Santé

- Vaccins, traitements, retraits sanitaires.
- Rappels et lots « sous traitement ».
- Alertes retard sanitaire → Activité & Suivi.

### 7.4 Transformation

- Abattage, découpe, lien stock viande.
- Pont vers Commercial pour vente.
- Journal transformation.

### 7.5 Bonnes pratiques

- Clôturer les lots terminés pour KPI fiables.
- Renseigner vétérinaire et dates rappel.
- Utiliser Hey Horizon pour saisies terrain rapides.

---

## 8. Cultures

**3 onglets** + hubs internes.

### 8.1 Parcelles & campagnes

- Créer parcelle (surface, culture, statut, campagne).
- Opérations : semis, traitements, intrants.
- Pilotage parcelles à surveiller.
- Lien météo et capteurs sol (Smart Farm).

### 8.2 Récoltes

- Enregistrer récolte (quantité, date, qualité).
- Alimentation stock (grains, légumes…).
- Apparition journal Accueil et traçabilité.
- Opportunités vente surplus → Commercial.

### 8.3 Économie circulaire

- Valorisation fumier, compost.
- Lien élevage ↔ cultures (intrants organiques).
- Charges et revenus annexes.

---

## 9. Commercial

**6 onglets** — cycle vente complet.

### 9.1 Ventes

1. Créer **commande** (client, produits, prix, marge visible).
2. **Livraison** si nécessaire.
3. **Facture** et **paiement** (espèces, mobile money, virement).
4. Effets automatiques : sortie stock, entrée trésorerie, créance soldée.

### 9.2 Opportunités

- Propositions auto : stock disponible, lots prêts à vendre, œufs surplus.
- Conversion opportunité → commande en un clic.

### 9.3 Clients & créances

- Fichier clients, historique commandes.
- Créances ouvertes, montants dus.
- **Relances** et préparation message **WhatsApp** (selon config).

### 9.4 Livraisons

- Planning livraisons, statuts, lien commandes.
- Preuve livraison → Documents.

### 9.5 Abonnements

- Ventes récurrentes (client régulier, livraison hebdomadaire).
- Suivi échéances abonnement.

### 9.6 Pilotage

- KPI : CA période, encaissé, impayés, panier moyen.
- Cohérence avec Finance et Stock.
- Mode données simulées pour formation.

---

## 10. Achats & Stock

**3 onglets** principaux + vues détaillées.

### 10.1 Inventaire

- Produits, quantités, emplacements, seuils.
- **CMUP** (coût moyen unitaire pondéré).
- Alertes : rupture, sous-seuil, **DLC** proche/dépassée.
- Transferts inter-fermes.

### 10.2 Réceptions & achats

- Réception marchandise → entrée stock.
- Lien fournisseur, dette si à crédit.
- Chemin canonique depuis Hey Horizon ou formulaire Stock.

### 10.3 Fournisseurs & dettes

- Fichier fournisseurs.
- Dettes ouvertes, échéances.
- Relances fournisseur.

### 10.4 Mouvements (lecture)

- Journal entrées/sorties/consommations.
- Filtres période, ferme, type, source.
- Distinction **Journal** (officiel) vs **Historique** (traces antérieures).

### 10.5 Liens métier

- Alimentation élevage → sortie stock aliment.
- Vente commercial → sortie stock produit.
- Récolte cultures → entrée stock.

---

## 11. Finance & Pilotage

**5 onglets** + sous-vues.

### 11.1 Résumé

- Trésorerie nette, créances, dettes.
- Score santé exploitation.
- Synthèse exécutive dirigeant.

### 11.2 Trésorerie

- Flux entrées/sorties.
- **Réconciliation** paiements (lien Documents).
- Prévision trésorerie.

### 11.3 Créances & dettes

- Consolidation clients (Commercial) et fournisseurs (Achats).
- Âge des créances, priorités encaissement.

### 11.4 Pilotage (sous-vues)

| Sous-vue | Contenu |
|----------|---------|
| **Échéancier** | Échéances charges et encaissements |
| **Financement** | Simulateur financement, besoins |
| **Investissements** | Lignes BP, immobilisations, concrétisation |
| **Rentabilité** | Marge par activité élevage/cultures |
| **Annexe** | Rations, prix aliment par défaut (coût unifié) |

### 11.5 Graphiques

- Évolution CA, charges, trésorerie.
- Comparaisons périodes.

### 11.6 Investissements & BP

- Lignes investissement : prévu, en cours, concrétisé, reporté.
- Actions : **Concrétiser**, Modifier, Reporter, Annuler.
- Charges récurrentes BP, sources financement, risques.

---

## 12. Activité & Suivi

**4 onglets** — fusion alertes, tâches, traçabilité.

### 12.1 Cockpit & décisions

- Vue synthèse : santé /100, alertes critiques.
- Recommandations avec application en un clic.
- Navigation vers module source.

### 12.2 À traiter maintenant

- File unifiée : tâches ouvertes, alertes, actions commerciales.
- Traitement, résolution, création tâche de suivi.
- **Astuce :** cliquer l'onglet dans la barre du module si un lien externe ne répond pas.

### 12.3 Registre & traçabilité

- Chaîne lot → transformation → vente → paiement.
- Historique opérations par entité.
- Export pour contrôle qualité / certification.

### 12.4 Performance & analytique

- Graphiques tendances alertes, tâches, activité.
- Suivi dans le temps par module.

---

## 13. Documents & Rapports

**4 onglets**.

### 13.1 Centre de contrôle

- État pièces justificatives (factures, reçus, bons).
- Pièces manquantes → tâche automatique.

### 13.2 Gestionnaire & OCR

- Import PDF/image facture ou reçu.
- **Lecture intelligente** (montant, date, fournisseur).
- Lien achat ou charge finance.

### 13.3 Rapprochement & preuves

- Associer paiement ↔ justificatif.
- Lever écarts comptables.

### 13.4 Rapports & exports

- Synthèses saison, banque, partenaires.
- Exports PDF/Excel selon module.

---

## 14. Opérations & Ressources

**4 onglets** (inclut ancien module Équipements).

### 14.1 Cockpit RH & Maintenance

- Effectifs, coûts main-d'œuvre.
- Maintenances ouvertes, retards.

### 14.2 Personnel & Paie

- Fiches personnel, affectations terrain.
- Salaires, primes, périodes.

### 14.3 Parc Matériel & Maintenance

- Machines, outillage, véhicules.
- Plan maintenance, tâches liées.
- Pont **Smart Farm** (capteurs sur équipements).

### 14.4 Registres & Analyses

- Registres RH réglementaires.
- Analyses coût/main-d'œuvre par activité.

---

## 15. Smart Farm

**3 onglets** — IoT agricole.

### 15.1 Objets connectés

- Enregistrer capteurs (température TC, humidité, sol, porte…).
- Caméras par zone (poulailler, serre, magasin).
- Protocoles et statut online/offline.

### 15.2 Flux temps réel

- Dernières mesures et événements.
- Historique signaux capteurs.
- Alimente bandeau **Accueil**.

### 15.3 Automatisation

- Règles : « Si température > seuil → alerte + tâche ventilation ».
- Catalogue alertes : chaleur poulailler, sol sec, intrusion, batterie faible.
- Scénarios irrigation/ventilation (commandes matériel à venir).
- Notifications vers **Activité & Suivi**.

---

## 16. Investisseurs & Forums

Module levée de fonds et dossiers partenaires — **9 vues**.

| Vue | Usage |
|-----|-------|
| **Investor Room** | KPIs ERP, vision, score readiness |
| **Préparation** | Checklist dossier complet |
| **Dossier** | 9 sections éditables (résumé, chiffres, impact, risques, IA…) |
| **Data Room** | Bibliothèque documents investisseur |
| **CRM** | Suivi investisseurs, contacts, relances |
| **Aperçu dossier** | Prévisualisation avant export |
| **Exports PDF** | Packs banque, ONG, salon agricole |
| **Historique** | Versions et envois |
| **Démo investisseur** | WhatsApp terrain, OCR facture, simulateur |

---

## 17. Activité & Sync ERP

**3 onglets** — santé technique des données.

### 17.1 Vérifications

- Audit interconnexions (vente sans stock, paiement sans preuve…).
- Score cohérence ERP.
- **Réparations guidées** en un clic.

### 17.2 Connexion & envoi

- État en ligne / hors ligne.
- File d'attente synchronisation.
- Forcer envoi données locales.

### 17.3 Journal d'activité

- Logs audit métier.
- Historique actions utilisateurs et système.

---

## 18. Gestion du système

**8 onglets** — administration.

| Onglet | Fonctions |
|--------|-----------|
| **Vue admin** | Santé système, modules, actions rapides |
| **Utilisateurs** | Comptes, rôles (évolution) |
| **Fermes** | Création sites, comparaison multi-fermes |
| **Paramètres** | Devise, unités, **mode données simulées** |
| **Sécurité** | Accès, audit connexions |
| **Sauvegardes** | Actualiser données, sync hors ligne |
| **Réinitialisation** | Remise à zéro (protégée) |
| **Audit** | Audit vision ERP module par module |

---

## 19. Fonctionnalités transverses

| Fonctionnalité | Description |
|----------------|-------------|
| **Hey Horizon global** | Panneau assistant sur toutes les pages |
| **Quick Ask** | Raccourcis contextuels dans modules (Élevage, etc.) |
| **Multi-ferme** | Sélecteur ferme + cumul groupe |
| **Période globale** | Filtre temporel cohérent |
| **Mode démo** | Données simulées réalistes |
| **WhatsApp** | Relances clients, alertes, démo investisseur |
| **OCR documents** | Factures, reçus, pièces jointes |
| **Hors ligne** | Saisie terrain, sync au retour réseau |
| **Météo live** | Contexte décisionnel |
| **Coût unifié** | Même calcul coût Animaux, Avicole, Ventes, Finance |
| **Marge vente** | CA − coût direct sur chaque vente |
| **Santé ERP** | Score /100 sur Accueil, Finance, Gestion |
| **PWA** | Installation sur téléphone comme application |

---

## 20. Workflows métier pas à pas

### 20.1 Vente complète (œufs)

1. **Commercial → Ventes** : nouvelle commande client restaurant.
2. Ajouter produits, vérifier **marge**.
3. **Livraison** si nécessaire.
4. **Paiement** Orange Money → trésorerie mise à jour.
5. Stock œufs décrémenté automatiquement.
6. Événement dans **Journal Accueil** et **Traçabilité**.

*Alternative : Hey Horizon en une phrase → valider brouillon.*

### 20.2 Réception aliment

1. **Achats & Stock** ou Hey Horizon : réception fournisseur.
2. Quantité, prix, lien fournisseur.
3. Stock aliment augmenté, **dette fournisseur** si crédit.
4. Alerte rupture levée si seuil repassé.

### 20.3 Mortalité lot avicole

1. **Élevage → Lots & bandes** ou Hey Horizon.
2. Saisir mortalité (nombre, lot, date).
3. Effectif Accueil mis à jour.
4. Alerte si seuil zootechnique dépassé → Centre décisionnel.

### 20.4 Récolte maraîchage

1. **Cultures → Récoltes** : culture, quantité, qualité.
2. Option entrée stock.
3. Opportunité vente si surplus → Commercial.

### 20.5 Alerte capteur chaleur

1. **Smart Farm** détecte température haute.
2. Alerte + tâche dans **Activité & Suivi → À traiter**.
3. Action terrain ventilation.
4. Clôture tâche après résolution.

### 20.6 Dossier investisseur

1. **Investisseurs & Forums → Dossier** : compléter sections.
2. **Exports PDF** : pack banque.
3. **CRM** : suivi contacts investisseurs.

### 20.7 Réparation incohérence ERP

1. **Activité & Sync ERP → Vérifications**.
2. Lire diagnostic (ex. vente sans mouvement stock).
3. Cliquer **réparation guidée**.
4. Vérifier résultat dans module concerné.

---

## 21. Résolution de problèmes

| Problème | Solution |
|----------|----------|
| Chiffres à zéro en démo | Activer mode données simulées ; Actualiser les données |
| Module ne charge pas | Recharger page ; vider cache navigateur |
| Onglet ne change pas | Cliquer onglet dans barre du module |
| Capteurs absents Accueil | Smart Farm → enregistrer équipements |
| Écart marge / coût | Finance/Élevage → Annexe : rations et prix aliment |
| Créance fantôme | Sync ERP → Vérifications → réparation |
| OCR échoue | Photo nette, réessayer ; saisie manuelle |
| Hors ligne bloqué | Sync ERP → Connexion & envoi |

---

## 22. Glossaire

| Terme | Définition |
|-------|------------|
| **Lot / bande** | Groupe d'animaux géré ensemble |
| **CMUP** | Coût moyen unitaire pondéré du stock |
| **Créance** | Montant dû par un client |
| **DLC** | Date limite de consommation |
| **BP** | Business Plan (prévisionnel) |
| **Traçabilité** | Historique lot → client → paiement |
| **Trésorerie nette** | Solde après entrées et sorties récentes |
| **Zootechnie** | Performance technique élevage (mortalité, ponte, poids) |
| **OCR** | Lecture automatique de documents papier/PDF |
| **PWA** | Application web installable sur téléphone |

---

**Horizon Farm — De la terre à l'horizon.**  
Pour démo personnalisée : contact@horizon-farm.app
