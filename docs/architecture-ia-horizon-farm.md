# Horizon Farm — Architecture IA transversale

## Objectif

Mettre en place un ERP agricole intelligent sans dupliquer les modules existants.

L'IA Horizon Farm ne remplace pas les modules metier. Elle les lit, les relie, les analyse, puis produit des recommandations, previsions, alertes et propositions de saisie multi-modules.

## Principe anti-duplication

Regle centrale : une information reste rattachee a son module source.

- Avicole : lots, ponte, mortalite, alimentation, production oeufs.
- Animaux : bovins, ovins, caprins, reproduction, sante, croissance.
- Cultures : parcelles, campagnes, intrants, irrigation, recoltes.
- Stock : aliments, intrants, seuils, mouvements.
- Finances : depenses, recettes, dettes, creances, tresorerie.
- Fournisseurs : prix, fiabilite, delais, qualite.
- Ventes : commandes, clients, livraisons, paiements.
- Smart Farm : capteurs, cameras, meteo, connectivite.
- Alertes : notifications, risques, actions recommandees.
- Assistant ERP : interface conversationnelle.

Le Centre IA est une couche transversale. Il ne devient pas un second Avicole, un second Stock ou un second Dashboard.

## Architecture cible

```text
Modules metier ERP
       ↓
Data Layer IA
       ↓
Centre IA Horizon Farm
       ↓
Recommandations / Previsions / Alertes / Saisie intelligente
       ↓
Assistant ERP + Centre Alertes + Tableaux de bord existants
```

## Role des composants

### Assistant ERP

Interface conversationnelle. L'utilisateur pose des questions, dicte une operation ou demande une analyse.

Exemples :

- Que dois-je traiter aujourd'hui ?
- Quel fournisseur d'aliment est le plus rentable ?
- Quel prix conseiller pour la tablette d'oeufs pendant le Ramadan ?
- Ajoute 30 sacs d'aliment pondeuse achetes chez Sanders a 9 500 FCFA.

### Smart Farm

Module terrain et IoT.

Il gere :

- cameras ONVIF / RTSP ;
- temperature et humidite ;
- meteo ;
- capteurs ;
- niveau d'eau si necessaire ;
- equipements connectes ;
- statut des appareils.

Smart Farm collecte. Le Centre IA interprete.

### Centre IA

Cerveau analytique transversal.

Il produit :

- priorites du jour ;
- prevision ponte ;
- prevision rupture aliment ;
- comparaison fournisseurs ;
- recommandation prix de vente ;
- scoring client / fournisseur / lot / activite ;
- detection anomalies ;
- scenarios Ramadan, Tabaski, Korite, Magal ;
- prevision tresorerie ;
- aide a la bancabilite.

## Moteurs IA a mettre en place

### 1. Moteur Marche & Prix

Objectif : suivre les prix externes et internes.

Donnees :

- prix aliment pondeuse ;
- prix aliment chair ;
- prix mais, son, concentre ;
- prix tablette d'oeufs ;
- prix poulet chair ;
- prix bovins, ovins, caprins ;
- prix intrants maraichers ;
- periodes Ramadan, Korite, Tabaski, Magal ;
- historique fournisseurs.

Sorties :

- prix conseille ;
- meilleur fournisseur reel ;
- alerte hausse prix ;
- opportunite d'achat ;
- opportunite de vente.

Regle : l'IA distingue toujours prix confirme, prix observe, prix estime et prix a verifier.

### 2. Moteur Production

Objectif : optimiser les cycles de production.

Priorite 1 : poules pondeuses.

Indicateurs :

- taux de ponte ;
- oeufs produits ;
- oeufs vendables ;
- oeufs casses ;
- mortalite ;
- consommation aliment ;
- cout par oeuf ;
- cout par tablette ;
- marge par tablette ;
- reforme previsionnelle.

Extension : poulets de chair, bovins, ovins, caprins, cultures.

### 3. Moteur Risques

Objectif : anticiper au lieu de subir.

Risques :

- chaleur dans poulailler ;
- humidite elevee ;
- mortalite anormale ;
- chute ponte ;
- rupture aliment ;
- retard vaccin ;
- impayes ;
- pannes equipements ;
- intrusion humaine ;
- baisse marge.

### 4. Moteur Saisie intelligente multi-modules

Objectif : saisir une fois, impacter correctement plusieurs modules apres validation humaine.

Exemple :

Phrase utilisateur :

"J'ai achete 30 sacs d'aliment pondeuse chez Sanders a 9 500 FCFA, paiement moitie cash moitie credit, livraison demain."

Actions preparees :

- Stock : entree 30 sacs aliment pondeuse ;
- Fournisseur : mise a jour prix Sanders ;
- Finances : depense partielle ;
- Dettes : solde fournisseur restant ;
- Taches : verifier livraison demain ;
- Tracabilite : evenement achat aliment ;
- Avicole : recalcul cout alimentation ;
- Alertes : recalcul autonomie stock.

Aucune ecriture sensible n'est validee sans confirmation utilisateur.

### 5. Moteur Securite intelligente

Objectif : proteger les actifs de la ferme.

Equipements recommandes :

- cameras PoE ONVIF / RTSP ;
- vision nocturne infrarouge ;
- detection humaine ;
- detection mouvement ;
- option audio bidirectionnel ;
- NVR ou stockage central ;
- onduleur / energie solaire.

Zones prioritaires :

- entree principale ;
- stock aliment ;
- poulailler pondeuses ;
- poulets de chair ;
- parc bovins ;
- parc ovins/caprins ;
- pharmacie/vaccins ;
- bureau/caisse.

## Smart Farm — standard technique recommande

- Cameras : ONVIF, RTSP, PoE, IR, H.265, detection humaine.
- Capteurs : ESP32, DHT22/AM2302, MQTT ou HTTP API.
- Reseau : routeur 4G/fibre, switch PoE, cables RJ45 exterieur.
- Energie : onduleur, batterie, solaire si possible.
- Cloud : Supabase.
- Donnees : JSON, horodatage, zone, appareil, mesure, statut.

## Roadmap de mise en place

### Phase 1 — Audit anti-duplication

- Cartographier chaque module.
- Identifier les donnees sources.
- Identifier les KPIs existants.
- Identifier les alertes existantes.
- Eviter toute duplication.

### Phase 2 — Data Layer IA

- Creer un service central de lecture consolidee.
- Normaliser les donnees utiles a l'IA.
- Ajouter historique prix marche/fournisseurs.
- Ajouter tables de recommandations et decisions IA.

### Phase 3 — Saisie intelligente

- Parser les phrases utilisateur.
- Proposer les actions multi-modules.
- Afficher un ecran de validation.
- Journaliser chaque decision.

### Phase 4 — IA pondeuses

- Cout par oeuf/tablette.
- Taux de ponte.
- Rupture aliment previsible.
- Baisse ponte anormale.
- Prix de vente conseille.
- Rentabilite lot.

### Phase 5 — Veille marche

- Releves prix fournisseurs.
- Historique prix aliment.
- Calendrier Ramadan, Korite, Tabaski, Magal.
- Recommandation achat/vente.

### Phase 6 — Smart Farm securite

- Integration cameras PoE ONVIF/RTSP.
- Alertes intrusion humaine.
- Suivi capteurs temperature/humidite.
- Correlation avec production et sante.

### Phase 7 — IA avancee

- Scoring fournisseur.
- Scoring client.
- Scoring sante lot.
- Scoring bancabilite.
- IA vision plus tard.

## Priorite immediate

1. Ne pas coder un module IA duplique.
2. Ajouter la documentation d'architecture IA.
3. Creer les tables de base : prix marche, recommandations IA, decisions IA, saisie intelligente.
4. Connecter le Centre IA aux modules existants.
5. Lancer le premier cas d'usage : poules pondeuses + aliment + prix oeufs.
