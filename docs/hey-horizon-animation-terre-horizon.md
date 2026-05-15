# Horizon Farm — Animation Hey Horizon : De la terre à l'horizon

## Vision

Quand l'utilisateur dit "Hey Horizon", l'assistant ne doit pas seulement s'ouvrir. Il doit donner l'impression que l'intelligence de la ferme se reveille.

Scenario visuel :

> De la terre a l'horizon.

Une lumiere part du bas du site, traverse les contours de l'interface, fait le tour de l'ecran, puis se transforme en soleil lumineux autour de l'assistant Horizon.

## Objectif UX

L'utilisateur doit comprendre immediatement que :

- Horizon a entendu ;
- Horizon est actif ;
- Horizon ecoute ;
- toute la ferme numerique est connectee a l'assistant.

## Scenario d'animation

### Etape 1 — Terre

Position de depart : bas de l'ecran, proche du bouton flottant Horizon.

Effet :

- petite etincelle doree ;
- halo doux ;
- sensation de graine/lumiere qui nait depuis la terre.

Texte possible :

> Horizon s'eveille...

### Etape 2 — Eclair vivant

L'etincelle devient un eclair lumineux.

Elle suit le contour du site :

- bas ;
- cote gauche ;
- haut ;
- cote droit ;
- retour vers le bouton assistant.

Effet :

- train lumineux dore/vert ;
- leger flou ;
- animation rapide mais elegante.

### Etape 3 — Tour complet de la ferme

Pendant le tour, l'interface peut recevoir un halo subtil.

Message possible :

> Connexion aux modules...

Symbolique : Horizon traverse tous les modules de la ferme.

### Etape 4 — Soleil Horizon

L'eclair revient vers l'assistant flottant et devient un soleil lumineux.

Effet :

- cercle radial dore ;
- pulsation ;
- icone micro ou Horizon au centre ;
- lumiere douce sur l'interface.

Texte final :

> Je t'ecoute.

## Etats techniques

| Etat | Animation |
|---|---|
| idle | bouton Horizon discret |
| wake_detected | etincelle depuis le bas |
| circuit | eclair fait le tour du site |
| sun | soleil autour du bouton Horizon |
| listening | pulsation douce + micro actif |
| interpreting | halo stable + texte "Je comprends..." |
| draft_ready | animation disparait, panneau brouillon ouvert |

## Palette recommandee

- Or Horizon : `#f6c453`
- Vert ferme : `#22c55e`
- Terre : `#8a5a2b`
- Fond doux : `rgba(246, 196, 83, 0.18)`
- Halo : `rgba(34, 197, 94, 0.12)`

## Regles de bon gout

L'animation doit etre :

- visible ;
- memorisable ;
- rapide ;
- elegante ;
- non agressive.

Duree recommandee :

- animation complete : 1.8 a 2.4 secondes ;
- puis ecoute active continue.

Ne pas bloquer l'utilisateur.

## Accessibilite

Respecter `prefers-reduced-motion`.

Si l'utilisateur reduit les animations :

- pas d'eclair ;
- simple halo ;
- texte "Je t'ecoute".

## Implementation recommandee

Creer :

- `src/components/HorizonWakeAnimation.jsx`
- `src/components/HorizonFloatingAssistant.jsx`

Puis brancher dans `App.jsx` au niveau global, au meme niveau que `AssistantPanel`.

## Props recommandees

```js
<HorizonWakeAnimation state={horizonState} />
```

Etats possibles :

```js
'idle' | 'wake_detected' | 'circuit' | 'sun' | 'listening' | 'interpreting' | 'draft_ready'
```

## Animation CSS suggeree

- un overlay `pointer-events-none` ;
- un trace lumineux en `position: fixed` ;
- animation par `offset-path` ou keyframes CSS ;
- fallback avec quatre segments : bas, gauche, haut, droite ;
- soleil final en radial-gradient.

## Message produit

Cette animation devient la signature d'Horizon Farm.

Elle raconte que l'intelligence part de la terre, traverse toute la ferme, puis atteint l'horizon.

C'est poetique, africain, agricole et technologique.
