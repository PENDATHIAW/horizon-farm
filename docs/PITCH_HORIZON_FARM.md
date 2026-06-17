# Horizon Farm — Pitch client

> **Présentation visuelle prête à projeter :** ouvrez [`/pitch-horizon-farm.html`](/pitch-horizon-farm.html) dans le navigateur (14 slides, charte graphique Horizon Farm, export PDF). Voir [docs/pitch/README.md](pitch/README.md).

**Durée cible :** 10–15 minutes  
**Public :** exploitants, coopératives, investisseurs agricoles, partenaires techniques terrain

---

## Accroche (30 secondes)

> *« Vous gérez une ferme avec des tableurs, des cahiers et des messages WhatsApp éparpillés ? Horizon Farm regroupe élevage, cultures, stock, ventes et finances dans une seule application — avec des capteurs connectés et un assistant qui comprend vos phrases du terrain. »*

---

## Le problème (1 minute)

Les exploitations agricoles en Afrique de l’Ouest et au-delà font face aux mêmes freins :

1. **Données dispersées** — effectifs dans un carnet, ventes sur téléphone, stock « de tête ».
2. **Décisions tardives** — on apprend la rupture d’aliment ou la mortalité quand c’est déjà coûteux.
3. **Trésorerie opaque** — difficile de savoir ce qui est vraiment encaissé vs ce qui est promis.
4. **Traçabilité faible** — clients, banques et certifications demandent des preuves que l’on n’a pas sous la main.
5. **Outils inadaptés** — ERP génériques ou apps « gadget » sans lien avec le métier avicole, bovin, maraîcher.

**Résultat :** pertes évitables, marges mal connues, croissance difficile à financer.

---

## La solution Horizon Farm (2 minutes)

Horizon Farm est un **ERP agricole complet**, pensé pour le terrain :

| Pilier | Bénéfice client |
|--------|-----------------|
| **Accueil dirigeant** | En 10 secondes : effectifs, stock critique, trésorerie, capteurs, conseil actionnable |
| **Élevage & cultures** | Lots, animaux, parcelles, récoltes — saisie simple, historique fiable |
| **Stock & achats** | Réceptions, seuils, DLC, dettes fournisseurs |
| **Commercial & finance** | Vente → livraison → paiement → marge, en un flux |
| **Smart Farm** | Capteurs température/humidité, caméras, alertes automatiques |
| **Hey Horizon** | « J’ai vendu 15 caisses à 45 000 » → brouillon prêt à valider |
| **Activité & Suivi** | File « à traiter », traçabilité, performance |

**Différenciateur clé :** tout est interconnecté. Une vente met à jour le stock et la caisse ; une mortalité alimente les alertes ; un capteur hors ligne crée une tâche maintenance.

---

## Démo narrative (5 minutes) — scénario « Ferme avicole + maraîchage »

### Étape 1 — Accueil

*Montrer l’écran d’accueil.*

- « Bonjour [Nom], voici votre exploitation. »
- Cartes **Élevage** (4 000 pondeuses, 300 chair), **Cultures** (12 parcelles), **Stock** (alerte rupture aliment), **Finance** (trésorerie + créances).
- Bandeau **Capteurs** : 28 °C poulailler, 2 capteurs en ligne.
- **Conseil** : « Stock maïs bas — réapprovisionner cette semaine. »

### Étape 2 — Terrain via Hey Horizon

*Ouvrir l’assistant.*

- Dire ou taper : *« Réception 20 sacs aliment, fournisseur AgroFeed, 480 000 FCFA »*
- Montrer le brouillon → validation → stock et dette mis à jour.

### Étape 3 — Vente

*Module Commercial.*

- Commande client restaurant — œufs, montant, statut impayé puis paiement Orange Money.
- Marge visible immédiatement.

### Étape 4 — Smart Farm

*Module Smart Farm → Flux temps réel.*

- Température poulailler, humidité serre.
- Alerte chaleur → tâche créée dans **Activité & Suivi → À traiter maintenant**.

### Étape 5 — Clôture dirigeant

*Retour accueil + Activité & Suivi.*

- Journal : vente, réception, paiement du jour.
- Score santé exploitation : 82/100.
- « Tout ce qui compte pour décider ce soir est ici. »

---

## Bénéfices mesurables

| Indicateur | Impact attendu |
|------------|------------------|
| Temps de saisie | −50 % vs tableur + messages (assistant vocal/texte) |
| Ruptures stock | Détection proactive par seuils et alertes |
| Créances | Visibilité immédiate + relances ciblées |
| Mortalité / sanitaire | Suivi par lot, rappels vaccins |
| Décision prix | Coût unifié → marge réelle par vente |
| Conformité | Traçabilité lot → client → paiement |

*Les gains dépendent de la discipline de saisie ; Horizon Farm réduit la friction de cette saisie.*

---

## Pour qui ?

### Profils cibles

1. **Aviculteur** (chair, ponte) — lots, production œufs, aliment, mortalité.
2. **Éleveur bovin / ovin / caprin** — fiches animaux, reproduction, transformation.
3. **Maraîcher / céréalier** — parcelles, récoltes, irrigation (capteurs sol).
4. **Exploitation mixte** — vue consolidée multi-activités.
5. **Groupe multi-fermes** — comparaison sites, cumul groupe.

### Tailles

- Petite exploitation : 1 utilisateur, mode démo puis déploiement progressif.
- PME agricole : équipe terrain + responsable + comptable.
- Coopérative : plusieurs producteurs, rapports consolidés (évolution produit).

---

## Technologie (sans jargon — 1 minute)

- **Application web** — fonctionne sur téléphone, tablette, ordinateur ; installable comme app (PWA).
- **Hors ligne partiel** — saisies terrain synchronisées au retour réseau.
- **Cloud sécurisé** — données hébergées, sauvegardes, accès par compte.
- **Capteurs** — température, humidité, caméras ; alertes vers l’ERP sans câblage complexe côté utilisateur.
- **Assistant intelligent** — comprend le français naturel métier ; ne remplace pas l’humain : **validation obligatoire**.

*Ne pas mentionner : noms de fournisseurs cloud, clés API, architectures internes.*

---

## Offre et déploiement

### Phase 1 — Découverte (1–2 semaines)

- Compte démo avec données simulées réalistes.
- Visite des modules prioritaires pour le client.
- Liste des 5 saisies quotidiennes à digitaliser en premier.

### Phase 2 — Pilote (1–3 mois)

- Configuration ferme, stocks initiaux, effectifs.
- Formation équipe (2 sessions : dirigeant + terrain).
- Capteurs pilote (1 poulailler ou 1 serre).
- Point hebdomadaire « à traiter ».

### Phase 3 — Généralisation

- Extension multi-fermes, rapports banque/investisseur.
- Automatisations Smart Farm.
- Intégration WhatsApp / mobile money (selon pays).

### Modèle économique (à adapter)

| Formule | Contenu indicatif |
|---------|-------------------|
| **Essentiel** | ERP cœur (élevage ou cultures + stock + commercial) |
| **Pro** | + Finance, Smart Farm, assistant, multi-utilisateurs |
| **Groupe** | + Multi-fermes, rapports, accompagnement |

*Tarification au forfait mensuel par exploitation ou par effectif — à calibrer selon marché.*

---

## Objections fréquentes

| Objection | Réponse |
|-----------|---------|
| « Mon équipe n’est pas à l’aise avec le digital » | Hey Horizon accepte des phrases simples ; l’accueil montre l’essentiel sans formation longue. |
| « J’ai déjà Excel » | Excel ne relie pas vente, stock et alertes capteurs ; Horizon Farm le fait automatiquement. |
| « Les capteurs c’est cher » | Commencer par 2–3 capteurs TC sur le poulailler ; ROI via mortalité et gaspillage évités. |
| « Et si la connexion est mauvaise ? » | Saisie hors ligne possible ; synchronisation au retour du réseau. |
| « Mes données sont-elles à moi ? » | Oui — export et traçabilité ; pas de revente de données. |

---

## Appel à l’action

1. **Essai guidé** — 30 min sur votre cas (avicole, bovin, maraîchage).
2. **Pilote 30 jours** — une ferme, un objectif chiffré (ex. −30 % temps saisie ventes).
3. **Plan de déploiement** — livrable avec jalons, formation, support.

> *« Horizon Farm ne vend pas un logiciel de plus. On vous donne une vue claire sur votre exploitation, des alertes avant les pertes, et un assistant qui parle votre langue du terrain. »*

---

## Contact

**Horizon Farm** — ERP agricole intégré  
Démo · Pilote · Déploiement groupe

*Document interne / commercial — juin 2026*
