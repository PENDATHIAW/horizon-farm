# ASSISTANT_UI_CONVERSATION_AUDIT

**Version :** V5  
**Date :** 2026-06-09

## Bug signalé

> Quand l'utilisateur envoie une question : la question disparaît, aucune réponse n'apparaît.

## Cause racine identifiée

```javascript
// HeyHorizonModule.jsx (V4)
useEffect(() => {
  setMessages([welcomeMessage]);
}, [welcomeMessage]);
```

À chaque rafraîchissement de `welcomeMessage` (props `secretaryProps`, données ERP), **tout le fil était réinitialisé** — message utilisateur et réponses effacés.

## Correctifs V5

| Point | Correction |
|-------|------------|
| Persistance fil | Ne mettre à jour que le message d'accueil, conserver `conversation` |
| Questions métier | Bypass `processContextualVoiceInput` pour les questions (`isBusinessQuestion`) |
| États loading | Bulle « Horizon réfléchit… » pendant traitement |
| Réponses silencieuses | Gestion explicite `error`, `empty`, `fallback`, `null` |
| Scroll | Inchangé — `chatEndRef` sur messages + draft + loading |

## Vérifications

- [x] Message utilisateur persiste après envoi
- [x] Réponse assistant appendée pour strategic / fallback / error
- [x] Brouillon terrain affiché sans effacer le fil
- [x] Accueil mis à jour sans reset conversation
- [x] Indicateur chargement visible

## Risques résiduels

- Navigation `redirect_pilotage` ouvre un module — l'utilisateur quitte l'assistant (comportement voulu)
- LLM hors ligne — message d'erreur ou fallback rules
