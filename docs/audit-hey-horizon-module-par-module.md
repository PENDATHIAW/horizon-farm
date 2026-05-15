# Horizon Farm — Audit Hey Horizon module par module

## Objectif

Parcourir les modules existants pour identifier :

1. ce que l'utilisateur peut saisir manuellement aujourd'hui ;
2. ce que Hey Horizon peut comprendre et preparer ;
3. les formulaires ou sections a ouvrir automatiquement ;
4. les validations humaines obligatoires ;
5. les modules impactes apres execution.

Principe central : Horizon ne remplace aucun module. Il orchestre les modules existants.

---

## Regle UX globale

Workflow unique :

1. L'utilisateur parle ou ecrit.
2. Horizon interprete l'intention.
3. Horizon prepare un brouillon.
4. Horizon affiche le formulaire ou la section concernee.
5. L'utilisateur complete ou corrige.
6. L'utilisateur valide.
7. L'ERP execute.
8. Horizon affiche : "Necessaire fait" + modules mis a jour.

Horizon ne doit jamais executer une action sensible avant validation humaine.

---

## 1. Assistant ERP / Horizon

### Role actuel

Interface conversationnelle et navigation ERP.

### Evolution Horizon

Devenir assistant global accessible partout, pas seulement via le module Assistant ERP.

### Ce que Horizon doit faire

- comprendre les commandes naturelles ;
- ouvrir le bon module ;
- pre-remplir les formulaires ;
- gerer les brouillons incomplets ;
- demander les champs manquants ;
- gerer les sous-formulaires ;
- executer apres validation.

### Exemples

- Hey Horizon, enregistre un achat de 20 sacs d'aliment.
- Hey Horizon, quelles sont les alertes critiques ?
- Hey Horizon, prepare une vente de 15 tablettes d'oeufs.

---

## 2. Centre IA

### Role actuel

Cerveau decisionnel transversal.

### Saisies manuelles

Normalement aucune saisie metier directe.

### Role de Horizon

- expliquer les recommandations ;
- ouvrir les modules sources ;
- transformer une recommandation en brouillon d'action ;
- afficher les modules impactes.

### Exemples

- Pourquoi le score IA est faible ?
- Prepare les actions recommandees.
- Ouvre le module concerne par cette alerte.

---

## 3. Smart Farm

### Saisies manuelles possibles

- capteur ;
- camera ;
- zone ;
- statut appareil ;
- evenement terrain ;
- tache liee ;
- alerte liee.

### Ce que Horizon doit preparer

- creation camera ;
- creation capteur ;
- evenement temperature/humidite ;
- signalement camera hors ligne ;
- intrusion ;
- creation alerte ;
- creation tache maintenance.

### Formulaires a ouvrir

- Smart Farm appareil ;
- Centre Alertes ;
- Taches.

### Exemples

- Camera stock hors ligne.
- Temperature poulailler 37 degres.
- Presence humaine detectee dans le stock.

---

## 4. Stock

### Saisies manuelles existantes

- creation produit stock ;
- entree stock ;
- sortie stock ;
- perte stock ;
- seuil ;
- unite ;
- poids sac ;
- prix unitaire ;
- alimentation animaux/lots.

### Ce que Horizon doit preparer

- achat intrants ;
- entree stock ;
- sortie alimentation ;
- perte stock ;
- mise a jour seuil ;
- creation produit si absent ;
- rattachement fournisseur ;
- depense finance si paye.

### Modules impactes

- Stock ;
- Finances ;
- Fournisseurs ;
- Tracabilite ;
- Centre IA ;
- Alertes.

### Exemple

> Hey Horizon, j'ai achete 20 sacs d'aliment de 50 kg.

Si fournisseur absent : Horizon demande ou ouvre le formulaire fournisseur.

---

## 5. Avicole

### Saisies manuelles existantes

- creation lot ;
- effectif initial ;
- type lot : pondeuses, chair, poussins ;
- mortalite ;
- ponte ;
- oeufs casses ;
- charges directes ;
- transformation/abattage ;
- cloture cycle ;
- historique.

### Ce que Horizon doit preparer

- creation lot ;
- production oeufs ;
- mortalite ;
- alimentation lot ;
- charge directe ;
- abattage/transformation ;
- alerte baisse ponte ;
- vente oeufs ou sujets.

### Modules impactes

- Avicole ;
- Stock ;
- Ventes ;
- Finances ;
- Sante ;
- Tracabilite ;
- Centre IA.

### Exemples

- Ponte P1 aujourd'hui 980 oeufs, 12 casses.
- Il y a 2 morts dans le lot chair B.
- Prepare la vente de 30 poulets.

---

## 6. Animaux

### Saisies manuelles existantes

- creation animal ;
- espece : bovin, ovin, caprin ;
- poids ;
- sante ;
- disponibilite ;
- frais directs ;
- abattage/transformation ;
- historique.

### Ce que Horizon doit preparer

- creation animal ;
- mise a jour poids ;
- alimentation ;
- soin ;
- mortalite/perte ;
- vente animal ;
- reproduction ou evenement sanitaire ;
- abattage/transformation.

### Modules impactes

- Animaux ;
- Sante ;
- Stock ;
- Ventes ;
- Finances ;
- Tracabilite ;
- Centre IA.

### Exemples

- Enregistre une chevre achetee aujourd'hui.
- La vache Awa pese 280 kg.
- Le mouton M12 est vendu cash.

---

## 7. Sante & Vaccins

### Saisies manuelles existantes

- soin ;
- vaccin ;
- visite veterinaire ;
- produit utilise ;
- cout ;
- prochaine date ;
- cible animal ou lot.

### Ce que Horizon doit preparer

- vaccin lot ;
- traitement animal ;
- visite veterinaire ;
- depense sante ;
- sortie stock medicament ;
- prochaine tache de rappel ;
- alerte retard vaccin.

### Modules impactes

- Sante ;
- Animaux ;
- Avicole ;
- Stock ;
- Finances ;
- Taches ;
- Tracabilite ;
- Centre IA.

### Exemples

- Enregistre vaccin Newcastle pour le lot P1.
- Le veterinaire a traite la vache Awa.
- Programme rappel vaccin dans 21 jours.

---

## 8. Ventes

### Saisies manuelles existantes

- commande ;
- client ;
- article vendu ;
- quantite ;
- prix ;
- paiement ;
- facture ;
- livraison ;
- opportunite ;
- marge.

### Ce que Horizon doit preparer

- vente oeufs ;
- vente animaux ;
- vente cultures ;
- vente stock ;
- encaissement ;
- facture ;
- livraison ;
- creation client si absent ;
- baisse stock ou sortie lot/animal.

### Modules impactes

- Ventes ;
- Clients ;
- Stock ;
- Animaux ;
- Avicole ;
- Cultures ;
- Finances ;
- Documents ;
- Tracabilite ;
- Centre IA.

### Exemples

- Vends 15 tablettes d'oeufs au client Mariama.
- Enregistre une vente de 2 moutons payee cash.
- Prepare facture pour client Dakar Eggs.

---

## 9. Finances

### Saisies manuelles existantes

- entree ;
- sortie ;
- depense ;
- recette ;
- paiement ;
- categorie ;
- lien client/fournisseur ;
- justificatif.

### Ce que Horizon doit preparer

- depense simple ;
- recette simple ;
- paiement client ;
- paiement fournisseur ;
- affectation categorie ;
- rattachement document ;
- controle doublon.

### Modules impactes

- Finances ;
- Comptabilite ;
- Clients ;
- Fournisseurs ;
- Documents ;
- Tracabilite ;
- Centre IA.

### Exemples

- Enregistre une depense de 25 000 FCFA transport.
- J'ai encaisse 50 000 FCFA du client Fatou.
- Paiement fournisseur partiel de 100 000 FCFA.

---

## 10. Comptabilite

### Saisies manuelles existantes

Principalement lecture, consolidation et controle des donnees finance/ventes/documents.

### Ce que Horizon doit faire

- expliquer les ecarts ;
- ouvrir finance ou ventes ;
- preparer correction ;
- detecter transaction non categorisee ;
- aider a rattacher justificatif.

### Validation

Aucune correction automatique sans validation.

---

## 11. Clients

### Saisies manuelles existantes

- creation client ;
- contacts ;
- historique ;
- creances ;
- relances.

### Ce que Horizon doit preparer

- creation client ;
- relance client ;
- liaison vente ;
- paiement client ;
- note commerciale.

### Modules impactes

- Clients ;
- Ventes ;
- Finances ;
- Documents ;
- Tracabilite.

---

## 12. Fournisseurs

### Saisies manuelles existantes

- creation fournisseur ;
- contacts ;
- dettes ;
- documents ;
- achats ;
- taches.

### Ce que Horizon doit preparer

- creation fournisseur si absent ;
- rattachement a achat ;
- dette fournisseur ;
- paiement fournisseur ;
- relance ou tache ;
- comparaison IA marche.

### Modules impactes

- Fournisseurs ;
- Stock ;
- Finances ;
- Documents ;
- Taches ;
- Centre IA.

---

## 13. Cultures

### Saisies manuelles existantes

- culture/parcelle ;
- campagne ;
- semis ;
- intrants ;
- couts ;
- recolte ;
- pertes ;
- ventes ;
- historique.

### Ce que Horizon doit preparer

- creation culture ;
- semis ;
- recolte ;
- sortie intrants ;
- vente recolte ;
- depense culture ;
- alerte risque.

### Modules impactes

- Cultures ;
- Stock ;
- Ventes ;
- Finances ;
- Tracabilite ;
- Centre IA.

### Exemples

- Enregistre semis tomate sur parcelle 1.
- J'ai recolte 40 kg de piment.
- Enregistre perte de 10 kg de tomate.

---

## 14. Documents

### Saisies manuelles existantes

- facture ;
- recu ;
- justificatif ;
- contrat ;
- liaison client/fournisseur/finance.

### Ce que Horizon doit preparer

- rattacher document a depense ;
- rattacher recu a paiement ;
- creer justificatif ;
- demander fichier si absent ;
- lier au bon module.

### Modules impactes

- Documents ;
- Finances ;
- Ventes ;
- Clients ;
- Fournisseurs ;
- Tracabilite.

---

## 15. Taches

### Saisies manuelles existantes

- titre ;
- responsable ;
- priorite ;
- echeance ;
- statut ;
- module lie.

### Ce que Horizon doit preparer

- creation tache ;
- rappel ;
- tache depuis alerte ;
- tache depuis IA ;
- cloture tache.

### Exemples

- Rappelle a Moussa de verifier le stock demain.
- Cree une tache critique pour reparer la camera stock.

---

## 16. Alertes

### Saisies manuelles existantes

- alerte ;
- gravite ;
- statut ;
- action recommandee ;
- WhatsApp simule.

### Ce que Horizon doit preparer

- creer alerte ;
- expliquer alerte ;
- ouvrir module source ;
- marquer en cours ;
- traiter ;
- envoyer WhatsApp simule ;
- creer tache depuis alerte.

---

## 17. Equipements

### Saisies manuelles existantes

- equipement ;
- panne ;
- maintenance ;
- cout ;
- document ;
- tache.

### Ce que Horizon doit preparer

- panne equipement ;
- maintenance planifiee ;
- depense maintenance ;
- tache technicien ;
- document justificatif.

---

## 18. RH & Equipe

### Saisies manuelles possibles

- employe ;
- role ;
- tache ;
- paiement ;
- presence ;
- paie.

### Ce que Horizon doit preparer

- creation employe ;
- assignation tache ;
- depense salaire ;
- note RH.

---

## 19. Rapports

### Role actuel

Generation, lecture, export et sauvegarde de rapports.

### Ce que Horizon doit faire

- generer rapport ;
- expliquer indicateurs ;
- preparer export ;
- rattacher document.

---

## 20. Investissements / Business plans

### Saisies manuelles existantes

- investissement ;
- business plan ;
- lignes investissement ;
- couts recurrents ;
- revenus projetes ;
- financement ;
- risques.

### Ce que Horizon doit preparer

- brouillon business plan ;
- ajout ligne investissement ;
- simulation financement ;
- risque ;
- document financeur.

### Modules impactes

- Investissements ;
- Finances ;
- Documents ;
- Centre IA.

---

## 21. Impact & Valeur

### Role actuel

Lecture decisionnelle sur la valeur et l'impact de l'ERP.

### Ce que Horizon doit faire

- expliquer ce que l'ERP a permis ;
- ouvrir modules sources ;
- transformer priorites en taches ;
- resumer gain de temps, cash, alertes, documents.

---

## 22. Sync / Activite ERP

### Saisies manuelles possibles

- refresh ;
- flush offline ;
- audit ;
- correction incoherence.

### Ce que Horizon doit faire

- expliquer pourquoi une donnee revient ;
- proposer refresh ;
- orienter vers module fautif ;
- creer tache technique.

---

## Priorisation d'implementation Hey Horizon

### Phase 1 — Actions agricoles courantes

1. Achat stock / aliment ;
2. Production oeufs ;
3. Vente oeufs ;
4. Mortalite lot/animal ;
5. Distribution aliment ;
6. Depense simple ;
7. Tache simple.

### Phase 2 — Interconnexions fortes

1. Achat + fournisseur + finance + stock ;
2. Vente + client + paiement + stock ;
3. Soin + stock medicament + finance + tache rappel ;
4. Smart Farm + alerte + tache.

### Phase 3 — Workflows avances

1. Business plan ;
2. Reproduction animale ;
3. Abattage/transformation ;
4. Rapports ;
5. Documents intelligents.

---

## Conclusion

Hey Horizon doit couvrir toute la ferme progressivement.

L'exemple achat fournisseur n'est que le premier cas pilote. La cible est un assistant transversal capable de preparer tous les formulaires metier, de gerer les champs manquants, les sous-formulaires, les modules impactes et l'execution apres validation humaine.
