# Horizon Farm — Smart Farm temps reel

## Objectif

Connecter progressivement la ferme physique a Horizon Farm afin que le module Smart Farm collecte les donnees terrain et que le Centre IA les interprete.

Le Smart Farm ne remplace pas les modules metier. Il collecte :

- temperature ;
- humidite ;
- cameras ;
- detection humaine ;
- statut capteurs ;
- statut reseau ;
- evenements securite ;
- eau et energie plus tard.

Le Centre IA interprete ensuite les donnees pour produire des alertes et recommandations.

## Architecture cible

```text
Capteurs ESP32 / Cameras ONVIF
        ↓
WiFi / Ethernet / 4G / PoE
        ↓
Gateway Smart Farm
        ↓
Supabase / Edge Function
        ↓
Tables sensor_devices, camera_devices, smartfarm_events
        ↓
Smart Farm + Centre IA + Centre Alertes + Assistant ERP
```

## Priorite Horizon Farm V1

### 1. Poulaillers pondeuses

Donnees prioritaires :

- temperature ;
- humidite ;
- camera infrarouge ;
- detection humaine ;
- statut camera ;
- alertes chaleur.

### 2. Poulets de chair

Donnees prioritaires :

- temperature ;
- humidite ;
- camera infrarouge ;
- detection humaine ;
- ventilation a surveiller.

### 3. Stock aliment

Donnees prioritaires :

- camera infrarouge ;
- detection humaine ;
- porte ouverte/fermee plus tard ;
- alerte intrusion nocturne.

### 4. Parcs bovins / ovins / caprins

Donnees prioritaires :

- camera exterieure ;
- detection humaine ;
- surveillance nuit ;
- mouvement anormal plus tard.

## Standards materiels recommandes

### Cameras

Critique :

- ONVIF ;
- RTSP ;
- PoE ;
- infrarouge ;
- IP66 exterieur ;
- H.265 ;
- detection humaine ;
- option audio bidirectionnel.

A eviter :

- camera mobile-app-only ;
- cloud ferme ;
- absence RTSP ;
- absence ONVIF ;
- dependance forte a une application proprietaire.

### Capteurs

Base recommandee :

- ESP32 DevKit ;
- DHT22 ou AM2302 temperature/humidite ;
- boitier etanche ;
- alimentation stable ;
- WiFi ou passerelle 4G ;
- MQTT ou HTTP JSON.

### Reseau

Pour cameras critiques :

- installation filaire PoE ;
- cable RJ45 exterieur ;
- gaine de protection ;
- switch PoE ;
- NVR ou serveur local possible ;
- routeur 4G/fibre ;
- onduleur.

## Format standard d'evenement Smart Farm

Tout appareil doit envoyer des donnees sous ce format logique :

```json
{
  "device_id": "CAM-STOCK-01",
  "device_type": "camera",
  "zone": "stock aliment",
  "event_type": "humain_detecte",
  "event_value": null,
  "event_unit": null,
  "severity": "urgence",
  "message": "Presence humaine detectee dans le stock aliment",
  "raw_payload": {},
  "created_at": "2026-05-14T20:00:00Z"
}
```

## Types d'evenements standards

| event_type | Description | Gravite par defaut |
|---|---|---|
| temperature | Temperature mesuree | info/warning/critique |
| humidite | Humidite mesuree | info/warning |
| humain_detecte | Presence humaine detectee | urgence si nuit/zone critique |
| mouvement | Mouvement detecte | warning |
| intrusion | Intrusion probable | urgence |
| camera_offline | Camera hors ligne | warning |
| capteur_offline | Capteur hors ligne | warning |
| batterie_faible | Batterie faible | warning |
| reseau_instable | Connexion instable | warning |
| chaleur_critique | Temperature critique | critique |
| humidite_critique | Humidite critique | critique |

## Seuils initiaux proposes

### Poulaillers pondeuses

| Mesure | Seuil surveillance | Seuil critique |
|---|---:|---:|
| Temperature | >= 32 C | >= 36 C |
| Humidite | >= 80% | >= 90% |

### Poulets de chair

Les seuils dependent de l'age du lot. A integrer plus tard par age en jours.

### Stock aliment

| Evenement | Gravite |
|---|---|
| Presence humaine nuit | urgence |
| Camera hors ligne | warning |
| Porte ouverte hors horaire | urgence |

## Regles IA Smart Farm

### Chaleur + baisse ponte

Si :

- temperature poulailler elevee ;
- baisse ponte recente ;
- humidite elevee ;

Alors :

- creer alerte ;
- recommander ventilation, eau, verification alimentation ;
- remonter dans Centre IA.

### Intrusion zone stock

Si :

- humain detecte ;
- zone critique = stock aliment ;
- heure hors plage autorisee ;

Alors :

- creer evenement urgence ;
- creer alerte ;
- recommander verification camera et appel responsable.

### Appareil hors ligne

Si :

- camera ou capteur offline ;
- zone critique ;

Alors :

- creer anomalie ;
- recommander verification alimentation, PoE, routeur, batterie.

## Integration Supabase

Tables utilisees :

- sensor_devices ;
- camera_devices ;
- smartfarm_events ;
- alertes_center ;
- ai_recommendations ;
- ai_decisions.

Flux recommande :

1. ESP32 ou camera envoie evenement.
2. Edge Function valide le payload.
3. Evenement insere dans smartfarm_events.
4. Centre Alertes cree une alerte si necessaire.
5. Centre IA lit l'evenement et produit une recommandation.
6. Assistant ERP peut expliquer l'evenement.

## ESP32 — pseudo-code HTTP

```cpp
// Pseudo-code uniquement
read_temperature();
read_humidity();

POST /functions/v1/smartfarm-ingest
{
  "device_id": "SENS-POND-01",
  "device_type": "sensor",
  "zone": "poulailler pondeuses 1",
  "event_type": "temperature",
  "event_value": 34.5,
  "event_unit": "C",
  "severity": "warning"
}
```

## Cameras — integration recommandee

Les cameras doivent rester gerees comme appareils dans `camera_devices` :

- name ;
- zone ;
- type ;
- status ;
- stream_url RTSP ;
- ONVIF host ;
- detection humaine active ;
- audio bidirectionnel si disponible.

Le flux video ne doit pas etre stocke directement dans Supabase. Supabase stocke les evenements et metadonnees. La video reste dans :

- camera/NVR ;
- stockage local ;
- serveur video ;
- flux RTSP affiche dans l'ERP.

## Plan de deploiement terrain

### Phase 1 — Prototype

- 1 ESP32 ;
- 1 DHT22 ;
- 1 camera ONVIF/RTSP ;
- 1 routeur 4G ;
- insertion manuelle/test dans smartfarm_events.

### Phase 2 — Poulailler pondeuses

- 2 capteurs temperature/humidite ;
- 1 a 2 cameras IR ;
- seuils chaleur/humidite ;
- alertes Smart Farm.

### Phase 3 — Stock aliment

- camera IR PoE ;
- detection humaine ;
- alerte intrusion ;
- surveillance nuit.

### Phase 4 — Extension ferme

- poulets de chair ;
- parcs ruminants ;
- entree principale ;
- bureau/caisse ;
- eau/energie.

## Regle capitale

Chaque capteur ou camera doit servir une decision.

Exemples :

- temperature -> prevenir stress thermique ;
- humidite -> prevenir maladie ;
- camera stock -> prevenir vol ;
- camera poulailler -> surveiller presence et comportement ;
- capteur offline -> verifier equipement critique.

Ne pas acheter des gadgets. Acheter des sources de donnees exploitables par l'IA.
