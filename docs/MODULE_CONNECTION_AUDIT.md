# Audit des connexions modules - Horizon Farm

Objectif: avant de refondre Finances, verifier les flux entre modules pour eviter de corriger un module isole sans tenir compte des impacts metier.

## Connexions deja visibles dans App.jsx

### Dashboard
Recoit: avicole, animaux, sante/vaccins, stock, clients, cultures, ventes, paiements, finances, alimentation, production oeufs, meteo.

Role attendu: synthese operationnelle. Ne doit pas remplacer Impact Business.

### Animaux
Recoit: animaux, alimentation_logs, sante/vaccins.

Role attendu: fiche et pilotage animal individuel, croissance, couts, sante, pret a vendre.

A verifier plus tard: remontee automatique vers Impact Business et Finances par animal.

### Avicole
Recoit: lots avicoles, alimentation_logs, production_oeufs_logs.
Produit: opportunites de vente.

Role attendu: lots chair/pondeuses, ponte, mortalite, maladies, pret a vendre, marge par lot.

A verifier plus tard: remontee des ventes reelles et couts alimentation vers Finances/Impact Business.

### Sante & Vaccins
Recoit: soins/vaccins, veterinaires, animaux, lots avicoles, stocks, finances.
Produit: transaction finance si soin/vaccin fait avec cout.

Role attendu: planning sanitaire, retards, couts, vetos, risques, impact business sante.

A verifier: eviter doublons de transactions finance lors de modifications successives.

### Finances
Recoit: transactions, animaux, lots avicoles, cultures, stocks, investissements, clients, fournisseurs, alimentation_logs, business plans, ventes, paiements.

Role attendu: verite financiere: cash, creances, depenses, rentabilite par activite, couts reels.

Problemes detectes avant refonte:
- rentabilite avicole utilise encore revenuEstime/revenu_estime et des couts fixes approximatifs;
- besoin de remplacer les calculs generiques par les regles metier recentes d'Avicole;
- besoin de distinguer cash encaisse, chiffre d'affaires, creances, dettes et marge;
- besoin de relier explicitement les couts sante, alimentation, stock, ventes et investissements.

### Stock
Recoit: stock, alimentation_logs, animaux, lots avicoles, fournisseurs.
Produit: lignes alimentation.

Role attendu: valeur stock, rupture, alimentation, medicaments/vaccins, impact sur animaux/avicole/sante.

A verifier:
- entree stock doit pouvoir creer une sortie finance si achat paye;
- consommation stock doit reduire stock et alimenter couts par animal/lot;
- stock sante doit etre visible dans Sante.

### Ventes
Recoit: commandes, items, livraisons, factures, paiements, opportunites, animaux, lots, cultures, stocks, clients, finances, tracabilite, documents.
Produit: transactions finance, traces, business events, updates sources.

Role attendu: transformer opportunites en commandes, encaissements, factures, livraisons, mise a jour stock/animal/lot/culture.

A verifier:
- paiement doit toujours creer/mettre a jour finance;
- vente doit mettre a jour source vendue ou quantite disponible;
- prix reel doit retourner vers animaux/avicole/impact business.

### Impact Business
Recoit: animaux, lots, production oeufs, sante, stocks, finances, ventes, paiements.

Role attendu: mesurer valeur creee par ERP: pertes evitees, temps gagne, decisions detectees, cash securise, tracabilite, qualite des donnees.

A verifier:
- ajouter progressivement les donnees reelles depuis Finances, Stock, Ventes, Fournisseurs.

### Fournisseurs
Recoit actuellement surtout ses propres donnees.

Role attendu: fournisseurs, dettes, commandes, qualite, delais, liens stock/finance.

A renforcer:
- achats stock lies fournisseur;
- dettes fournisseurs vers Finances;
- alertes delais/risque fournisseur.

### Tracabilite
Recoit traces et business_events, avec animaux/lots/cultures.

Role attendu: historique operationnel complet.

A renforcer:
- sante, stock, ventes, finance doivent creer des evenements de tracabilite.

### Alertes
Recoit alertes, transactions, animaux, lots, stocks, cultures, capteurs.

Role attendu: centre d'action, pas simple affichage.

A renforcer:
- chaque alerte doit pointer vers le module et l'objet source.

## Regle de refonte par module

Avant de modifier un module:
1. verifier ce qu'il recoit depuis App.jsx;
2. verifier ce qu'il doit produire vers les autres modules;
3. eviter les doublons avec Dashboard et Impact Business;
4. creer les alertes contextuelles uniquement quand elles sont actionnables;
5. verifier l'impact sur Finance et Impact Business.

## Prochaine etape conseillee

Refondre Finances apres cet audit avec ces axes:
- cash reel vs chiffre d'affaires vs creances;
- depenses par activite;
- rentabilite animaux, avicole, cultures, stock;
- couts sante et alimentation relies;
- dettes fournisseurs;
- transactions automatiques venant de Sante, Stock et Ventes;
- donnees propres pour Impact Business.
