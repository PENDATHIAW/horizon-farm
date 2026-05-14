# Horizon Farm — Centre Alertes IA UI

## Objectif

Faire evoluer le Centre Alertes existant en centre operationnel intelligent, sans dupliquer les modules metier.

Le Centre Alertes doit afficher, prioriser, traiter et tracer les alertes venant de :

- modules ERP ;
- Smart Farm ;
- IA anomalies ;
- IA previsions ;
- IA pondeuses ;
- IA marche ;
- IA strategie.

## Principe

Le Centre Alertes n'est pas le Centre IA.

- Centre IA : analyse, prevoit, recommande.
- Centre Alertes : notifie, priorise, suit le traitement.

## Structure UI recommandee

### 1. Bandeau de synthese

Cartes KPI :

- urgences ;
- critiques ;
- warnings ;
- nouvelles ;
- en cours ;
- traitees aujourd'hui.

### 2. Filtres

Filtres utiles :

- gravite ;
- statut ;
- module source ;
- zone Smart Farm ;
- type : securite, production, stock, finance, marche ;
- date ;
- responsable.

### 3. Liste priorisee

Chaque alerte doit afficher :

- gravite ;
- titre ;
- message ;
- module source ;
- entite concernee ;
- action recommandee ;
- confiance IA ;
- date ;
- statut ;
- boutons d'action.

### 4. Actions rapides

Actions possibles :

- marquer comme lue ;
- mettre en cours ;
- traiter ;
- ignorer ;
- ouvrir module source ;
- creer une tache ;
- notifier responsable ;
- journaliser commentaire.

## Statuts

| Statut | Sens |
|---|---|
| nouvelle | pas encore lue |
| lue | consultee |
| en_cours | prise en charge |
| traitee | resolue |
| ignoree | non pertinente |

## Couleurs de gravite

| Gravite | Couleur |
|---|---|
| urgence | rouge fonce |
| critique | rouge/orange |
| warning | orange/ambre |
| info | bleu/gris |

## Modules sources

| module_source | Navigation cible |
|---|---|
| smartfarm | Smart Farm |
| avicole | Avicole |
| stock | Stock |
| finances | Finances |
| ventes | Ventes |
| sante | Santé |
| animaux | Animaux |
| cultures | Cultures |
| centre_ia | Centre IA |

## Exemple carte alerte

```text
[CRITIQUE] Autonomie aliment critique
Le stock aliment couvre environ 5 jours.
Source : Stock / Centre IA
Action recommandee : Comparer les prix et commander avant rupture.
Confiance IA : 82%
[Ouvrir Stock] [Creer tache] [En cours] [Traitee]
```

## Integration avec aiAlertsOrchestratorService

Le module peut appeler :

```js
import { prepareIntelligentAlerts } from '../services/aiAlertsOrchestratorService';

const generated = prepareIntelligentAlerts(dataMap, { meteo });
```

Puis afficher :

```js
generated.alerts
```

Ou inserer dans Supabase plus tard :

```js
generated.payloads
```

## Deduplication

Le service IA evite deja les doublons.

Mais l'UI doit aussi eviter d'afficher deux fois :

- alertes existantes ;
- alertes IA preparees ;
- alertes deja traitees.

## Strategie d'integration progressive

### Phase 1 — Lecture seule

Afficher les alertes existantes + alertes IA preparees.

Aucune insertion automatique.

### Phase 2 — Validation humaine

Bouton : "Ajouter au Centre Alertes".

### Phase 3 — Insertion automatique controlee

Insertion automatique uniquement pour :

- intrusion ;
- temperature critique ;
- autonomie aliment <= 7 jours ;
- tresorerie negative ;
- mortalite critique.

### Phase 4 — Notifications

WhatsApp, SMS, email, push.

## Regle de securite

Aucune action sensible ne doit etre executee automatiquement depuis une alerte.

Exemples necessitant validation humaine :

- acheter aliment ;
- vendre oeufs ;
- modifier stock ;
- creer depense ;
- modifier finance ;
- sortir animal ;
- supprimer donnee.

## Priorite MVP

L'ecran doit d'abord permettre :

1. Voir les urgences ;
2. Comprendre pourquoi ;
3. Savoir quoi faire ;
4. Ouvrir le module source ;
5. Marquer comme traite.

## Prochaine implementation code

Creer ou enrichir :

- `src/modules/AlertesCenter.jsx`

Sans remplacer les alertes existantes :

- ajouter un onglet "Alertes IA" ;
- ajouter les alertes preparees par IA ;
- ajouter badges et filtres ;
- ajouter navigation module source.
