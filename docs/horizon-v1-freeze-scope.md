# Horizon Farm — V1 Scope Freeze

## Objectif

La V1 doit etre utilisable, impressionnante et testable rapidement. A partir de maintenant, on arrete l'empilement infini d'idees IA et on ferme un perimetre clair.

## Principe

Un produit IA n'est jamais totalement fini. Mais une V1 peut etre consideree comme terminee quand les workflows essentiels fonctionnent de bout en bout.

## Definition de V1 terminee

La V1 est terminee quand les elements suivants sont disponibles et testables :

### 1. Assistant Horizon global

- assistant accessible partout ;
- mode texte ;
- mode vocal web avec activation ;
- feedback clair d'ecoute ;
- animation Horizon ;
- commandes de base : ouvrir module, question CA, situation globale.

### 2. Brouillons intelligents

- achats stock ;
- ventes ;
- animaux ;
- lots avicoles ;
- finances ;
- taches ;
- fournisseurs/clients via workflow lie.

### 3. Conversation progressive

- completer un brouillon par phrases courtes ;
- reconnaitre fournisseur, quantite, date, paiement ;
- validation vocale : valide/confirme ;
- annulation vocale : annule/stop ;
- reset : recommence/nouvelle commande.

### 4. Validation et execution

- validation utilisateur obligatoire ;
- endpoint /api/assistant/validate ;
- execution user-scoped via Supabase ;
- aucun bypass securite ;
- modules impactes retournes ;
- auto-refresh modules.

### 5. Centre IA V1

- score IA exploitation ;
- score proactif ;
- risques ;
- recommandations ;
- previsions cles ;
- automatisations semi-autonomes ;
- boutons Voir et Preparer ;
- ouverture de brouillons dans Horizon.

### 6. Proactivite V1

- detection stock critique ;
- tensions finance ;
- risques avicoles ;
- animaux/sante a surveiller ;
- Smart Farm offline ;
- taches en retard ;
- fournisseurs a risque.

### 7. Documentation architecture

- Horizon Native Companion documente ;
- Assistant Brain API documente par structure ;
- scope V1 gele dans ce fichier.

## Hors V1

Les elements suivants sont reportes apres V1 :

- vraie application native mobile/desktop ;
- wake word natif sans clic ;
- IA LLM payante complete ;
- IoT physique reel ;
- cameras IA vision temps reel ;
- WhatsApp automatique ;
- multi-agent complet ;
- automatisation sans validation ;
- knowledge graph avance ;
- decision engine avance.

## Regle de fin

A partir de maintenant, toute nouvelle idee est classee en :

- V1 critique si elle bloque le test ;
- V1 polish si elle rend la demo plus claire ;
- Post-V1 si elle peut attendre.

## Prochaine action

Faire une passe de stabilisation :

1. verifier compilation ;
2. verifier imports ;
3. verifier AssistantPanel ;
4. verifier CentreIA ;
5. verifier endpoints API ;
6. corriger erreurs bloquantes ;
7. livrer la V1 testable.
