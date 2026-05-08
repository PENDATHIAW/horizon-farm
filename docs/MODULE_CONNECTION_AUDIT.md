# Audit des connexions modules - Horizon Farm

Objectif: avant de refondre Finances, verifier les flux entre modules pour eviter de corriger un module isole sans tenir compte des impacts metier.

## Modules charges dans App.jsx

1. Dashboard
2. Animaux
3. Avicole
4. Sante & Vaccins
5. Finances
6. Comptabilite
7. Investissements
8. Impact Business
9. Stock
10. Clients & WhatsApp
11. Ventes
12. Fournisseurs
13. Tracabilite
14. Centre Alertes
15. Cultures
16. Documents
17. Taches
18. Rapports
19. Equipements
20. Smart Farm
21. Audit Logs
22. Sync Offline

## Connexions par module

### Dashboard
Recoit: avicole, animaux, sante/vaccins, stock, clients, cultures, ventes, paiements, finances, alimentation, production oeufs, meteo.

Role attendu: synthese operationnelle. Ne doit pas remplacer Impact Business.

A revoir plus tard: ajouter les KPIs Impact Business sans dupliquer le module Impact Business.

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

### Comptabilite
Recoit: transactions, clients, fournisseurs, refresh finances.
Produit: ecritures comptables brouillon, validations, budgets, clotures, justificatifs.

Role attendu: comptabilite guidee a partir de Finances. Finances reste la source metier des flux; Comptabilite formalise les ecritures.

A verifier: aucune depense/recette ne doit etre creee directement ici sans passer par Finances ou etre liee a une transaction.

### Investissements
Recoit: investissements, business plans et toutes les lignes BP, transactions, lots, animaux, cultures.
Produit: business plans, lignes investissement, couts recurrents, projections CA, financements, risques.

Role attendu: planifier et comparer prevu vs reel par activite.

A renforcer: lien vers Finances pour investissements payes, et Impact Business pour ROI reel / payback.

### Impact Business
Recoit: animaux, lots, production oeufs, sante, stocks, finances, ventes, paiements.

Role attendu: mesurer valeur creee par ERP: pertes evitees, temps gagne, decisions detectees, cash securise, tracabilite, qualite des donnees.

A verifier:
- ajouter progressivement les donnees reelles depuis Finances, Stock, Ventes, Fournisseurs;
- eviter tout doublon avec Dashboard.

### Stock
Recoit: stock, alimentation_logs, animaux, lots avicoles, fournisseurs.
Produit: lignes alimentation.

Role attendu: valeur stock, rupture, alimentation, medicaments/vaccins, impact sur animaux/avicole/sante.

A verifier:
- entree stock doit pouvoir creer une sortie finance si achat paye;
- consommation stock doit reduire stock et alimenter couts par animal/lot;
- stock sante doit etre visible dans Sante.

### Clients & WhatsApp
Recoit: clients, commandes ventes, paiements, transactions.
Produit: clients, relances et campagnes simulees.

Role attendu: suivi commercial client, impayes, relances WhatsApp, historique client.

A renforcer: lien direct vers Ventes/Finances pour reste a payer, et Impact Business pour cash securise.

### Ventes
Recoit: commandes, items, livraisons, factures, paiements, opportunites, animaux, lots, cultures, stocks, clients, finances, tracabilite, documents.
Produit: transactions finance, traces, business events, updates sources.

Role attendu: transformer opportunites en commandes, encaissements, factures, livraisons, mise a jour stock/animal/lot/culture.

A verifier:
- paiement doit toujours creer/mettre a jour finance;
- vente doit mettre a jour source vendue ou quantite disponible;
- prix reel doit retourner vers animaux/avicole/impact business.

### Fournisseurs
Recoit actuellement surtout ses propres donnees.

Role attendu: fournisseurs, dettes, commandes, qualite, delais, liens stock/finance.

A renforcer:
- achats stock lies fournisseur;
- dettes fournisseurs vers Finances;
- alertes delais/risque fournisseur.

### Tracabilite
Recoit traces legacy et business_events, avec animaux/lots/cultures.

Role attendu: historique operationnel complet.

A renforcer:
- sante, stock, ventes, finance doivent creer des evenements de tracabilite;
- chaque evenement doit pointer vers module_source, entity_type, entity_id et transaction/document si disponible.

### Centre Alertes
Recoit alertes, transactions, animaux, lots, stocks, cultures, capteurs.
Produit: alertes manuelles, statuts, WhatsApp simule.

Role attendu: centre d'action, pas simple affichage.

A renforcer:
- chaque alerte doit pointer vers le module et l'objet source;
- alertes finance doivent inclure creances, dettes, marge negative;
- alertes stock/sante/avicole doivent etre coherentes avec les modules source.

### Cultures
Recoit cultures uniquement.
Produit: cultures et calculs rendement/marge.

Role attendu: production vegetale, planning cultural, couts, rendement, recolte, ventes potentielles.

A renforcer:
- lier couts culture a Stock/Finances;
- recolte disponible vers Ventes;
- pertes/rendement vers Impact Business.

### Documents
Recoit documents, animaux, lots, cultures, clients, fournisseurs.
Produit: documents lies a module/entity.

Role attendu: justificatifs, ordonnances, factures, contrats, certificats.

A renforcer:
- Finances/Comptabilite doivent pointer vers justificatifs;
- Sante doit creer/relier ordonnances;
- Ventes doit relier factures/BL.

### Taches
Recoit taches uniquement.
Produit: taches, statut, priorite.

Role attendu: workflow terrain et rappels.

A renforcer:
- taches generables depuis Alertes/Sante/Stock/Ventes;
- module_lie + entity_id doivent permettre retour contextuel.

### Rapports
Recoit rapports uniquement.
Produit: rapports programmes/generes.

Role attendu: reporting PDF/WhatsApp/exploitation.

A renforcer:
- tirer des donnees Dashboard, Finances, Impact Business;
- generation automatique reelle plus tard.

### Equipements
Recoit equipements uniquement.
Produit: equipements, maintenance, carburant.

Role attendu: machines, pompes, vehicules, incubateurs, maintenance.

A renforcer:
- maintenance/carburant vers Finances;
- panne vers Alertes/Taches;
- equipement critique vers Impact Business.

### Smart Farm
Recoit meteo, online, sensors, cameras.
Produit: capteurs/cameras.

Role attendu: meteo live, capteurs, cameras, alertes terrain.

A renforcer:
- capteurs offline vers Alertes;
- meteo/temperature/humidite vers cultures/avicole si seuils critiques;
- impact environnemental dans Impact Business.

### Audit Logs
Recoit audit_logs uniquement.
Produit: lecture seule.

Role attendu: securite, historique modifications.

A renforcer:
- toutes actions critiques doivent creer audit log automatiquement.

### Sync Offline
Recoit dataMap global et online/queue offline.
Produit: synchronisation, backup JSON.

Role attendu: terrain hors ligne, multi-appareils, backup.

A renforcer:
- conflit offline par module;
- audit apres replay offline.

## Regle de refonte par module

Avant de modifier un module:
1. verifier ce qu'il recoit depuis App.jsx;
2. verifier ce qu'il doit produire vers les autres modules;
3. eviter les doublons avec Dashboard et Impact Business;
4. creer les alertes contextuelles uniquement quand elles sont actionnables;
5. verifier l'impact sur Finance et Impact Business;
6. verifier la tracabilite et les documents si l'action produit une preuve.

## Prochaine etape conseillee

Refondre Finances apres cet audit avec ces axes:
- cash reel vs chiffre d'affaires vs creances;
- depenses par activite;
- rentabilite animaux, avicole, cultures, stock;
- couts sante et alimentation relies;
- dettes fournisseurs;
- transactions automatiques venant de Sante, Stock et Ventes;
- donnees propres pour Impact Business;
- passerelles vers Comptabilite et Documents.
