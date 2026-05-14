# Horizon Farm — Alertes intelligentes IA

## Objectif

Transformer Horizon Farm en systeme proactif : l'ERP ne doit pas seulement enregistrer les donnees, il doit prevenir, prioriser et recommander les actions utiles.

Les alertes intelligentes doivent etre generees a partir de :

- modules ERP ;
- Smart Farm ;
- Centre IA ;
- anomalies ;
- previsions ;
- veille marche ;
- calendrier agricole et commercial.

## Principe anti-bruit

Une alerte doit etre creee seulement si elle aide a prendre une decision.

A eviter :

- trop d'alertes similaires ;
- alertes sans action recommandee ;
- alertes non priorisees ;
- alertes qui repetent un simple KPI.

Chaque alerte doit contenir :

- un titre clair ;
- une gravite ;
- le module source ;
- l'entite concernee ;
- une explication ;
- une action recommandee ;
- un statut de traitement.

## Niveaux de gravite

| Gravite | Usage |
|---|---|
| urgence | securite, intrusion, mortalite critique, rupture imminente |
| critique | risque operationnel ou financier fort |
| warning | probleme a traiter rapidement |
| info | information utile sans urgence |

## Sources d'alertes

### 1. Smart Farm

Evenements :

- humain_detecte ;
- intrusion ;
- chaleur_critique ;
- humidite_critique ;
- camera_offline ;
- capteur_offline ;
- reseau_instable ;
- batterie_faible.

Exemple :

> Presence humaine detectee dans le stock aliment a 23h45. Verifier camera et contacter le responsable terrain.

### 2. Avicole

Evenements :

- baisse ponte ;
- mortalite elevee ;
- casse oeufs elevee ;
- alimentation sans production ;
- cout tablette trop eleve ;
- reforme prochaine.

### 3. Stock

Evenements :

- stock sous seuil ;
- autonomie aliment faible ;
- stock negatif ;
- stock non valorise ;
- consommation anormale.

### 4. Finances

Evenements :

- tresorerie previsionnelle negative ;
- creances importantes ;
- depense anormale ;
- transaction non categorisee ;
- marge negative.

### 5. Marche

Evenements :

- prix aliment en hausse ;
- prix aliment opportun ;
- prix oeufs favorable ;
- ecart fournisseur significatif ;
- periode commerciale forte : Ramadan, Korite, Tabaski, Magal.

### 6. Animaux et reproduction

Evenements :

- mise bas proche ;
- chaleur a surveiller ;
- retard suivi reproduction ;
- animal malade ;
- croissance lente ;
- periode optimale de vente.

## Regles initiales

### Alerte chaleur poulailler

Si :

- temperature >= 36 C ;
- zone contient poulailler ;

Alors :

- gravite critique ;
- module_source smartfarm ;
- action : augmenter ventilation, verifier eau, surveiller ponte.

### Alerte intrusion stock

Si :

- event_type = humain_detecte ou intrusion ;
- zone contient stock ;
- heure hors plage autorisee ;

Alors :

- gravite urgence ;
- action : verifier flux camera, appeler responsable, journaliser incident.

### Alerte autonomie aliment

Si :

- autonomie <= 7 jours ;

Alors :

- gravite critique ;
- action : comparer prix fournisseurs et commander.

Si :

- autonomie <= 15 jours ;

Alors :

- gravite warning ;
- action : planifier achat.

### Alerte baisse ponte

Si :

- taux de ponte < 65% ;
- ou baisse consecutive detectee ;

Alors :

- gravite warning ou critique ;
- action : verifier chaleur, eau, aliment, sante, stress.

### Alerte marge tablette

Si :

- prix marche observe < cout par tablette ;

Alors :

- gravite critique ;
- action : ne pas vendre a perte, ajuster prix ou reduire cout.

### Alerte creances

Si :

- reste a encaisser important ;
- paiement en retard ;

Alors :

- gravite warning ;
- action : relancer client et prioriser encaissement.

## Deduplication des alertes

Avant de creer une alerte, verifier :

- meme module_source ;
- meme entity_type ;
- meme entity_id ;
- meme titre ou event_type ;
- deja ouverte depuis moins de 24h.

Si oui :

- mettre a jour l'alerte existante ;
- ne pas creer une nouvelle ligne.

## Cycle de vie d'une alerte

| Statut | Description |
|---|---|
| nouvelle | alerte non lue |
| lue | alerte consultee |
| en_cours | action en cours |
| traitee | probleme traite |
| ignoree | alerte jugee non pertinente |

## Notifications

### Phase 1

- badge ERP ;
- Centre Alertes ;
- Centre IA ;
- Assistant ERP.

### Phase 2

- WhatsApp ;
- SMS ;
- email ;
- push mobile.

### Phase 3

- escalade automatique si non traite ;
- rappel responsable ;
- rapport incident.

## Format standard d'alerte IA

```json
{
  "title": "Autonomie aliment critique",
  "message": "Le stock aliment pondeuse couvre environ 5 jours.",
  "module_source": "stock",
  "entity_type": "stock",
  "entity_id": "STOCK-ALIM-POND-01",
  "severity": "critique",
  "status": "nouvelle",
  "action_recommandee": "Comparer les prix et commander avant rupture.",
  "source": "centre_ia",
  "confidence_score": 82
}
```

## Regle de validation humaine

Les alertes peuvent etre creees automatiquement.

Mais les actions sensibles doivent etre validees par un humain :

- achat ;
- vente ;
- depense ;
- modification stock ;
- modification finance ;
- sortie animal ;
- suppression donnees.

## Integration avec Centre IA

Le Centre IA doit lire les alertes et les classer dans :

- urgences ;
- risques operationnels ;
- risques financiers ;
- opportunites marche ;
- actions du jour.

## Integration avec Assistant ERP

Questions utiles :

- Quelles sont les alertes critiques ?
- Que dois-je traiter maintenant ?
- Pourquoi cette alerte est critique ?
- Quelle action recommandes-tu ?
- Est-ce lie a la ponte, au stock ou a la chaleur ?

## Roadmap technique

### Phase 1 — Service de generation

Creer un service :

- `aiAlertsService.js`

Il transforme :

- anomalies ;
- previsions ;
- evenements Smart Farm ;
- recommandations strategie ;

en alertes normalisees.

### Phase 2 — Deduplication

Avant insertion dans `alertes_center`, rechercher alerte similaire ouverte.

### Phase 3 — Notification

Connecter :

- WhatsApp ;
- SMS ;
- email ;
- push mobile.

### Phase 4 — Escalade

Si une urgence n'est pas traitee :

- relance apres 15 minutes ;
- escalade responsable ;
- journal incident.

## Priorite Horizon Farm

Demarrer par 5 alertes :

1. Intrusion stock ou poulailler ;
2. Temperature critique poulailler ;
3. Autonomie aliment <= 7 jours ;
4. Baisse ponte ou mortalite elevee ;
5. Tresorerie previsionnelle negative.
