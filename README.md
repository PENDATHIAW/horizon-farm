# Horizon Farm ERP

ERP agricole React + Vite + TailwindCSS + Supabase pour piloter une ferme multi-activites: animaux, avicole, cultures, stocks, finances, comptabilite, ventes, documents, taches, rapports, Smart Farm et synchronisation offline.

## Installation locale

```bash
npm install
npm run dev
# → http://localhost:5173
```

Variables attendues dans `.env` (copier depuis `.env.example`):

```env
VITE_SUPABASE_URL=https://xmqfvmswrjhteaijnaxb.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

## Déploiement en ligne (Vercel — recommandé)

1. Pousser sur GitHub
2. Importer sur [vercel.com](https://vercel.com) — Framework : Vite
3. Ajouter les variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`
4. **Hey Horizon LLM (optionnel)** : ajouter `OPENAI_API_KEY` (ou `HEY_HORIZON_LLM_API_KEY`) côté serveur — jamais en `VITE_*`. Garder `VITE_HEY_HORIZON_LLM=auto`.
5. Déployer → URL publique disponible

Le fichier `vercel.json` gère le SPA routing (rechargements de page sans 404).

## Déploiement Netlify (alternative)

Même démarche. Le fichier `netlify.toml` est préconfigué.

## Installer comme application (PWA)

| Appareil | Méthode |
|---|---|
| Android | Chrome → Menu → Installer l'application |
| iPhone | Safari → Partager → Sur l'écran d'accueil |
| Mac/Windows | Chrome/Edge → Icône installation dans la barre adresse |

## Récupérer sur un autre ordinateur

```bash
git clone https://github.com/VOTRE_COMPTE/horizon-farm.git
cd horizon-farm
cp .env.example .env   # renseigner les clés Supabase
npm install
npm run dev
```

## Première initialisation Git

```bash
git init
git add .
git commit -m "Initial commit — Horizon Farm ERP"
git remote add origin https://github.com/VOTRE_COMPTE/horizon-farm.git
git branch -M main
git push -u origin main
```

## Supabase SQL

1. Ouvre Supabase SQL Editor.
2. Colle et execute le fichier complet: `supabase/horizon_farm_prod_schema.sql`.
3. Attends le message final: `Horizon Farm schema corrige...`.
4. Recharge l'application apres 5 a 10 secondes pour laisser PostgREST recharger le schema.

Si Supabase affiche encore une erreur de cache schema, execute ensuite:

```sql
-- contenu du fichier supabase/repair_schema_cache_and_columns.sql
```

Regles importantes du schema:

- IDs metier en `text`: `BOV001`, `OV001`, `CAP001`, `LOTPO001`, `LOTCH001`, `C-001`, etc.
- `owner_user_id` reste en `uuid` et suit `auth.uid()`.
- Pas de FK incompatible `text` vers `uuid`.
- `alimentation_logs` remplace toute table fantome `alimentation`.

Compte de test cree par SQL:

```text
Email: penda@horizonfarm.app
Login affiche: penda
Mot de passe: 
```

## Tests rapides

```bash
npm run lint
npm run build
npm run test:e2e:workflows    # logique métier sans navigateur
npm run test:e2e:smoke        # Hey Horizon + Centre décisionnel (nécessite E2E_LOGIN / E2E_PASSWORD)
```

### CI GitHub

Le workflow `.github/workflows/ci.yml` exécute lint, build et les tests workflow à chaque push sur `main`.

Pour activer les smoke tests navigateur, ajouter dans **Settings → Secrets → Actions** :

| Secret | Exemple |
|--------|---------|
| `E2E_LOGIN` | `penda` |
| `E2E_PASSWORD` | mot de passe du compte test Supabase |

Sans ces secrets, la CI reste verte (build + tests unitaires workflow).

### Hey Horizon — clé OpenAI

| Variable | Où | Rôle |
|----------|-----|------|
| `VITE_HEY_HORIZON_LLM` | `.env` / Vercel (build) | `auto` \| `on` \| `off` |
| `OPENAI_API_KEY` | Vercel env **serveur** uniquement | Complète les commandes ambiguës via `/api/assistant/enhance` |
| `HEY_HORIZON_LLM_MODEL` | Vercel (optionnel) | Défaut `gpt-4o-mini` |

Vérification après déploiement : poser une question ambiguë dans Hey Horizon — si la clé est absente, les règles métier répondent seules ; si présente, le journal affiche `source_engine: llm`.

Scenario de test conseille:

1. Ajouter un animal bovin: l'ID doit proposer `BOV00X`.
2. Ajouter un lot pondeuse: l'ID doit proposer `LOTPO00X`.
3. Aller dans Stocks puis ajouter une ligne Alimentation.
4. Verifier dans Animaux que le cout alimentation est calcule automatiquement.
5. Modifier/supprimer un stock, client, lot ou animal et verifier le toast + refresh Supabase.
6. Ouvrir Dashboard: meteo live, risque agricole, recommandations et KPIs alimentation doivent apparaitre.
7. Ouvrir Smart Farm: capteurs/cameras en simulation et CRUD capteur/camera doivent fonctionner.
8. Dans Avicole, modifier un lot: l'effectif actuel doit rester calcule automatiquement.
9. Dans Avicole, saisir la production dans le journal oeufs, pas dans le formulaire lot.
10. Dans Sante/Fournisseurs, utiliser "Recherche reelle" pour interroger OpenStreetMap autour de la position autorisee ou Dakar/Senegal.

## Animaux: logique interne

- `sante` est conservee pour compatibilite, mais l'interface utilise `frais_sante` comme "Frais sante / soins".
- `health_status` represente l'etat sanitaire: sain, malade, blesse, sous traitement, a surveiller.
- `status` represente seulement le statut administratif: actif, vendu, mort, vole, reforme.
- L'alimentation animal n'est plus saisie manuellement; elle est calculee depuis `alimentation_logs`.
- Le cout total interne est calcule: prix achat + alimentation calculee + frais sante / soins + autres frais.
- La fiche interne affiche couts, marge, ROI, reproduction, documents et tracabilite pour les roles autorises.
- Les suivis sanitaires structures utilisent `veterinary_interventions`, `veterinary_intervention_targets`, `animal_health_records`, `animal_weight_records` et `intervention_medications`.
- Une prochaine verification sanitaire peut creer automatiquement une tache et une alerte trois jours avant.

## Avicole: lots et production

- Deux types de lots sont separes: `pondeuse` et `chair`.
- `current_count` est calcule depuis effectif initial - morts - vols - vendus - reformes - sorties.
- Les malades ne diminuent pas l'effectif actuel.
- Oeufs casses et production/jour sont saisis dans `production_oeufs_logs`, pas dans le formulaire lot.
- L'alimentation lot est calculee depuis `alimentation_logs` avec `type_cible = lot_avicole`.
- Frais sante, etat sanitaire et statut operationnel sont separes.

## Geolocalisation reelle

- Les veterininaires/fournisseurs de demonstration sont marques `Demo`.
- La recherche reelle utilise OpenStreetMap/Overpass si aucune API Google Places n'est configuree.
- L'application n'invente pas les telephones, adresses ou notes: les champs inconnus restent "Non renseigne".
- Fallback geographique: GPS utilisateur si autorise, sinon ferme/Dakar/Senegal.

## PWA mobile

Sur Android, iPhone, iPad, Mac ou Windows:

1. Ouvre l'URL de l'application dans le navigateur.
2. Menu navigateur -> Ajouter a l'ecran d'accueil / Installer l'application.
3. L'application utilise le manifest + service worker pour l'experience PWA.
4. La synchronisation metier passe par Supabase; le mode offline partiel met les mutations en file locale puis les rejoue quand le reseau revient.

## Meteo intelligente

Le Dashboard utilise Open-Meteo:

- geolocalisation reelle si autorisee et au Senegal;
- fallback ferme/Dakar Senegal;
- temperature, ressenti, humidite, pluie, probabilite pluie, vent, nuages, lever/coucher soleil, jour/nuit;
- recommandations terrain selon chaleur, pluie, vent, humidite, nuit et risques agricoles.

## Smart Farm / capteurs / cameras

Oui, les capteurs reels peuvent etre integres plus tard sans casser les modules metier.

Architecture prevue:

- `sensor_devices` pour declarer ESP32/Arduino/API/passerelles IoT;
- `sensor_readings` pour les mesures temperature, humidite, eau, energie, air, ouverture, mouvement;
- `camera_devices` pour RTSP/ONVIF/IP/snapshot;
- Supabase Realtime pour synchroniser mesures et alertes;
- Dashboard et Alertes peuvent consommer ces donnees sans melanger la logique Animaux, Avicole, Stocks ou Cultures.

Sans materiel configure, Smart Farm affiche un mode simulation propre.
