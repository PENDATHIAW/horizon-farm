# Horizon Farm — Pack audio wolof

Ce dossier contient les réponses audio wolof pré-enregistrées utilisées par l’app `/chat`.

## Format attendu

- Format : MP3
- Qualité : 44.1 kHz ou 48 kHz
- Voix : wolof naturel, calme, chaleureux, clair
- Bruit : éviter ventilateur, rue, musique, écho
- Durée : 2 à 8 secondes par phrase si possible
- Volume : stable, sans saturation

## Fichiers obligatoires

| Fichier | Intention | Quand il est joué |
|---|---|---|
| `welcome.mp3` | accueil | ouverture / première interaction wolof |
| `feeding-advice.mp3` | alimentation | questions sur comment nourrir les poules / animaux |
| `egg-tracking.mp3` | production d’œufs | questions sur les œufs / production |
| `market-price.mp3` | prix du marché | questions sur prix, vente, marché |
| `create-alert.mp3` | alerte / rappel | demandes de rappel ou alerte |
| `fallback.mp3` | fallback | quand l’app ne comprend pas clairement |

## Scripts wolof proposés

### welcome.mp3

> Nanga def ? Man maay sa assistant Horizon Farm. Waxal ci wolof, français walla anglais. Man naa la dimbali ci ferme bi.

### feeding-advice.mp3

> Ci mbayum ganaar, ñam wu sell ak ndox mu set dañuy am solo. Wax ma atum ganaar yi ak ni ñu mel, ma jox la ndigal bu leer.

### egg-tracking.mp3

> Waaw, man naa la dimbali ci toppatoo nen yi. Wax ma ñaata nen ngeen am tey, ma wax la ndax production bi baax na.

### market-price.mp3

> Man naa la dimbali ci toppatoo njëgu marse bi. Wax ma produit bi ak marse bi, ma jox la tontu bu leer.

### create-alert.mp3

> Waaw, man naa defal la fàttali. Wax ma lu ma wara fàttali, waxtu wi, ak ñaata yoon.

### fallback.mp3

> Baal ma, dégguma bu leer. Mën nga waxaat ndànk walla wax ko ci beneen anam ?

## Comment enregistrer rapidement

1. Ouvrir l’application dictaphone du téléphone.
2. S’enfermer dans une pièce calme.
3. Tenir le téléphone à 15–20 cm de la bouche.
4. Lire chaque phrase naturellement.
5. Exporter chaque audio en `.mp3`.
6. Renommer exactement les fichiers comme indiqué ci-dessus.
7. Ajouter les fichiers dans `public/audio/wolof/`.

## Important

Les noms doivent être exactement identiques. Exemple :

```txt
public/audio/wolof/feeding-advice.mp3
```

Si le fichier manque, l’app affichera un message indiquant quel audio ajouter.
