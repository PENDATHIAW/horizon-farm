# Pitch Horizon Farm — fichiers client

## Fichiers à télécharger (PDF & PowerPoint)

| Fichier | Emplacement | Usage |
|---------|-------------|--------|
| **PDF** | [`docs/pitch/PITCH_HORIZON_FARM.pdf`](PITCH_HORIZON_FARM.pdf) | Envoi par e-mail, impression, lecture |
| **PowerPoint** | [`docs/pitch/PITCH_HORIZON_FARM.pptx`](PITCH_HORIZON_FARM.pptx) | Présentation modifiable dans PowerPoint / Google Slides / LibreOffice |
| **HTML interactif** | [`/pitch-horizon-farm.html`](../../public/pitch-horizon-farm.html) | Présentation navigateur (flèches, plein écran) |
| **Démo interactive** | [`/demo-horizon-farm.html`](../../public/demo-horizon-farm.html) | Parcours guidé, exploration des 17 modules |

Copies publiques (après build / déploiement) :
- `/PITCH_HORIZON_FARM.pdf`
- `/PITCH_HORIZON_FARM.pptx`
- `/demo-horizon-farm.html`

## Contenu — 22 slides

1. Couverture — logo & tagline « De la terre à l'horizon » · 17 modules
2. Le constat — 5 freins
3. Notre promesse — exploitation lisible en 10 secondes
4. La plateforme — 17 modules interconnectés
5. Accueil dirigeant + capteurs
6. Hey Horizon — assistant IA
7. Centre décisionnel
8. Élevage & Cultures
9. Commercial & Stock
10. Finance & Pilotage
11. Smart Farm — capteurs TC
12. Suivi & conformité (Activité, Documents, Sync, RH)
13. Investisseurs & Forums
14. Interconnexion — tout se parle
15. Scénario démo — matinée type
16. ROI abonnement
17. Pour qui — 6 profils
18. Offres — Essentiel / Pro / Groupe
19. Déploiement — 3 phases
20. Objections
21. Différenciation
22. Appel à l'action → démo interactive

## Charte graphique

- Vert hero `#052e16` · Accent `#22c55e` · Or `#9a6b12`
- Fond carnet `#fffdf8` · Logo officiel Horizon Farm

## Régénérer les fichiers

```bash
npm run pitch:generate
```

Génère `public/pitch-horizon-farm.html` (22 slides), puis `docs/pitch/PITCH_HORIZON_FARM.pdf` et `.pptx`.

## Script orateur (texte)

Notes détaillées pour l'oral : [`../PITCH_HORIZON_FARM.md`](../PITCH_HORIZON_FARM.md)

## Guide utilisateur complet

[`../GUIDE_UTILISATEUR_HORIZON_FARM.md`](../GUIDE_UTILISATEUR_HORIZON_FARM.md) — 22 sections, tous les modules et workflows.
