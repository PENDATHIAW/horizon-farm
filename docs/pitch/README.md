# Pitch Horizon Farm — fichiers client

## Fichiers à télécharger (PDF & PowerPoint)

| Fichier | Emplacement | Usage |
|---------|-------------|--------|
| **PDF** | [`docs/pitch/PITCH_HORIZON_FARM.pdf`](PITCH_HORIZON_FARM.pdf) | Envoi par e-mail, impression, lecture |
| **PowerPoint** | [`docs/pitch/PITCH_HORIZON_FARM.pptx`](PITCH_HORIZON_FARM.pptx) | Présentation modifiable dans PowerPoint / Google Slides / LibreOffice |
| **HTML interactif** | [`/pitch-horizon-farm.html`](../../public/pitch-horizon-farm.html) | Présentation navigateur (flèches, plein écran) |

Copies publiques (après build / déploiement) :
- `/PITCH_HORIZON_FARM.pdf`
- `/PITCH_HORIZON_FARM.pptx`

## Contenu — 14 slides

1. Couverture — logo & tagline « De la terre à l'horizon »
2. Le constat — 5 freins
3. Vision
4. Solution — 7 piliers
5. Accueil dirigeant + capteurs
6. Hey Horizon
7. Smart Farm
8. Scénario démo
9. Bénéfices
10. Cibles
11. Déploiement
12. Objections
13. Différenciation
14. Appel à l'action

## Charte graphique

- Vert hero `#052e16` · Accent `#22c55e` · Or `#9a6b12`
- Fond carnet `#fffdf8` · Logo officiel Horizon Farm

## Régénérer les fichiers

```bash
npm run pitch:generate
```

Génère `docs/pitch/PITCH_HORIZON_FARM.pdf` et `.pptx` à partir du HTML `public/pitch-horizon-farm.html`.

## Script orateur (texte)

Notes détaillées pour l'oral : [`../PITCH_HORIZON_FARM.md`](../PITCH_HORIZON_FARM.md)
