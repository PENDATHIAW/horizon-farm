# Horizon Farm — Audit anti-duplication IA

## Objectif

Avant d'ajouter des ecrans IA, chaque module doit etre analyse pour eviter :

- duplication de donnees ;
- duplication de logique metier ;
- duplication de KPI ;
- duplication d'alertes ;
- duplication de formulaires ;
- confusion entre module source et couche IA.

Le Centre IA doit consommer les modules existants, pas les remplacer.

## Regle de responsabilite

Chaque information a un module proprietaire.

| Domaine | Module proprietaire | Role IA autorise |
|---|---|---|
| Lots pondeuses / chair | Avicole | analyser, prevoir, recommander |
| Animaux bovins/ovins/caprins | Animaux | analyser croissance, reproduction, vente |
| Vaccins / soins | Sante | detecter retards, prioriser, relier aux risques |
| Stocks | Stock | prevoir rupture, recommander achat |
| Prix fournisseurs | Fournisseurs + market_prices | comparer et scorer |
| Tresorerie | Finances | prevoir cash-flow, marge, remboursement |
| Ventes | Ventes | recommander prix, relancer, prevoir demande |
| Clients | Clients | scorer risque paiement et fidelite |
| Cultures | Cultures | prevoir rendement, irrigation, risque climatique |
| Equipements | Equipements + Smart Farm | maintenance predictive |
| Cameras/capteurs | Smart Farm | detecter evenements et risques |
| Alertes | Centre Alertes | diffuser et suivre le traitement |
| Conversation | Assistant ERP | dialoguer et declencher les analyses |

## Audit par module

### 1. Dashboard

Contenu existant : synthese globale, KPIs et meteo.

A ne pas dupliquer :

- cartes KPI existantes ;
- alertes deja remontees ;
- meteo deja consommee.

Role IA :

- ajouter un resume decisionnel court ;
- afficher 3 a 5 priorites IA ;
- renvoyer vers les modules sources.

### 2. Avicole

Contenu existant : lots, pondeuses, chair, production oeufs, alimentation, opportunites de vente.

A ne pas dupliquer :

- fiche lot ;
- journal oeufs ;
- mortalite ;
- alimentation ;
- production.

Role IA :

- taux de ponte ;
- cout par oeuf ;
- cout par tablette ;
- prevision rupture aliment ;
- baisse ponte anormale ;
- marge lot ;
- date de reforme ;
- recommandation prix vente.

### 3. Animaux

Contenu existant : bovins, ovins, caprins, couts, statut, sante, reproduction.

A ne pas dupliquer :

- fiche animal ;
- statut administratif ;
- statut sanitaire ;
- couts directs.

Role IA :

- scoring croissance ;
- reproduction : chaleur, saillie, gestation, mise bas ;
- recommandation garder/vendre/engraisser ;
- projection marge Tabaski ou periode forte.

### 4. Sante

Contenu existant : vaccins, veterinaires, interventions.

A ne pas dupliquer :

- calendrier vaccinal ;
- fiches veterinaires ;
- interventions.

Role IA :

- priorisation sanitaire ;
- prediction risque lot/animal ;
- correlation humidite/chaleur/mortalite ;
- rappel intelligent.

### 5. Stock

Contenu existant : produits, quantites, seuils, alimentation.

A ne pas dupliquer :

- inventaire ;
- mouvements stock ;
- seuils.

Role IA :

- autonomie en jours ;
- date rupture ;
- recommandation quantite achat ;
- comparaison prix fournisseur ;
- detection consommation anormale.

### 6. Fournisseurs

Contenu existant : fournisseurs, dettes, statuts.

A ne pas dupliquer :

- fiche fournisseur ;
- dettes ;
- contacts.

Role IA :

- score fournisseur ;
- historique prix ;
- fiabilite delai ;
- qualite constatee ;
- recommandation achat.

### 7. Finances

Contenu existant : recettes, depenses, impayes, marge.

A ne pas dupliquer :

- transactions ;
- encaissements ;
- depenses ;
- impayes.

Role IA :

- prevision tresorerie ;
- scenario hausse aliment ;
- capacite remboursement ;
- score bancabilite ;
- marge previsionnelle par activite.

### 8. Ventes

Contenu existant : commandes, articles, livraisons, factures, paiements, opportunites.

A ne pas dupliquer :

- commande ;
- livraison ;
- facture ;
- paiement.

Role IA :

- prix conseille ;
- relance client ;
- opportunite Ramadan/Korite/Tabaski/Magal ;
- prevision demande ;
- canal rentable.

### 9. Cultures

Contenu existant : cultures, parcelles, statut, score sante.

A ne pas dupliquer :

- fiche culture ;
- parcelle ;
- campagne.

Role IA :

- recommandation irrigation ;
- prevision rendement ;
- risque meteo ;
- rentabilite parcelle ;
- choix culture selon saison.

### 10. Smart Farm

Contenu existant : capteurs, cameras, meteo, zones, simulation.

A ne pas dupliquer :

- declaration appareil ;
- flux camera ;
- mesures capteurs.

Role IA :

- interpreter les evenements ;
- detecter intrusion humaine ;
- relier temperature/humidite a ponte/sante ;
- recommander actions terrain.

### 11. Centre Alertes

Contenu existant : alertes automatiques et manuelles, gravite, statut, WhatsApp simulation.

A ne pas dupliquer :

- liste alertes ;
- statuts ;
- traitement.

Role IA :

- creer des alertes enrichies ;
- classer priorites ;
- expliquer le risque ;
- proposer action recommandee.

### 12. Assistant ERP

Contenu existant : conversation, commandes vocales, recherche globale, navigation.

A ne pas dupliquer :

- UI conversationnelle ;
- recherche ERP.

Role IA :

- comprendre les demandes complexes ;
- proposer saisie multi-modules ;
- expliquer les recommandations ;
- guider les decisions.

## Checklist avant toute nouvelle fonctionnalite IA

1. Quelle donnee source est utilisee ?
2. Quel module en est proprietaire ?
3. Est-ce une analyse ou une nouvelle saisie metier ?
4. Existe-t-il deja une alerte similaire ?
5. Existe-t-il deja un KPI similaire ?
6. La recommandation renvoie-t-elle au bon module ?
7. La decision est-elle journalisee ?
8. L'utilisateur valide-t-il avant impact stock/finance ?

## Cas d'usage prioritaire validé

### Pondeuses + aliment + prix marche

Objectif : premier moteur IA rentable.

Donnees lues :

- lots avicoles ;
- production oeufs ;
- alimentation_logs ;
- stock aliment ;
- market_prices ;
- ventes ;
- finances ;
- meteo ;
- alertes.

Sorties :

- cout par oeuf ;
- cout par tablette ;
- taux de ponte ;
- autonomie aliment ;
- prix conseille ;
- fournisseur recommande ;
- marge previsionnelle ;
- alerte baisse ponte.

## Conclusion

Le Centre IA Horizon Farm doit rester un moteur de decision transversal. Les modules existants restent les sources de verite.
