# Horizon Native Companion — Architecture cible

## Decision

Horizon Farm garde l'ERP web comme socle principal, mais le vrai assistant vocal intelligent doit etre porte par une application native compagnon.

Raison : une PWA ou une application ajoutee a l'ecran d'accueil iPhone reste soumise aux limitations Web/Safari. Elle ne peut pas garantir une ecoute permanente fiable du mot-cle "Hey Horizon".

## Objectif produit

Permettre a l'utilisateur de dire :

> Hey Horizon, ouvre les ventes.
> Hey Horizon, quel est mon CA ?
> Hey Horizon, enregistre 20 sacs d'aliment.
> Hey Horizon, ajoute une vache Gobra appelee Awa.

Sans devoir cliquer sur un bouton dans l'ERP.

## Architecture recommandee

### 1. ERP Web Horizon Farm

Role :

- gestion complete des modules ;
- formulaires ;
- tableaux de bord ;
- centre IA ;
- smart farm ;
- stock ;
- ventes ;
- finances ;
- avicole ;
- animaux ;
- sante ;
- documents ;
- rapports.

### 2. Application native Horizon Companion

Role :

- detection locale du wake word ;
- micro terrain ;
- transcription vocale ;
- dialogue IA ;
- lecture des donnees ERP via API ;
- preparation de brouillons ;
- validation utilisateur ;
- notifications push ;
- mode terrain offline/low network.

## Composants natifs

| Composant | Role |
|---|---|
| WakeWordEngine | Detecter "Hey Horizon" localement |
| SpeechToText | Transcrire la voix en texte |
| HorizonBrainClient | Envoyer la commande au moteur IA |
| ERPApiClient | Lire/ecrire dans Horizon Farm via API |
| DraftValidationUI | Afficher les brouillons a valider |
| VoiceResponse | Repondre vocalement |
| PushNotificationManager | Alertes critiques terrain |
| OfflineQueue | Stocker les actions hors connexion |

## Technologies possibles

### Mobile iOS / Android

Option recommandee : React Native ou Flutter.

Avantages :

- app mobile reelle ;
- notifications natives ;
- acces micro plus controle ;
- possibilite de services natifs ;
- meilleure experience terrain.

### Desktop Mac / Windows

Option recommandee : Tauri ou Electron.

Avantages :

- assistant de bureau ;
- ecoute plus fiable ;
- raccourcis globaux ;
- integration systeme ;
- fenetre flottante.

## Wake word

Moteurs possibles :

- Porcupine ;
- OpenWakeWord ;
- moteur custom plus tard.

Principe :

1. le wake word tourne localement ;
2. aucune voix n'est envoyee au cloud tant que "Hey Horizon" n'est pas detecte ;
3. apres detection, l'application lance la transcription ;
4. la commande est envoyee au moteur Horizon Brain.

## Workflow vocal cible

1. Utilisateur dit : "Hey Horizon".
2. L'application detecte le wake word localement.
3. Animation ou signal sonore : Horizon s'eveille.
4. Horizon ecoute la commande.
5. L'utilisateur parle.
6. Detection de silence.
7. Transcription.
8. Horizon Brain comprend l'intention.
9. Brouillon affiche.
10. Utilisateur valide/modifie/annule.
11. ERP execute.
12. Horizon repond : "Necessaire fait" + modules mis a jour.

## Exemple : achat aliment

Commande :

> Hey Horizon, enregistre 20 sacs d'aliment de 50 kg.

Horizon Companion :

- detecte wake word ;
- transcrit ;
- envoie au moteur IA ;
- recoit brouillon ;
- affiche : produit, quantite, unite, poids, champs manquants ;
- demande fournisseur/paiement si manquants ;
- valide ;
- appelle API ERP.

Modules impactes :

- Stock ;
- Finances ;
- Fournisseurs ;
- Tracabilite ;
- Centre IA.

## Exemple : question business

Commande :

> Hey Horizon, quel est mon CA ?

Horizon Companion :

- lit les ventes, factures, paiements ;
- calcule CA, encaissement, creances ;
- repond vocalement ;
- propose d'ouvrir le module ventes.

## API ERP necessaires

A creer ou stabiliser :

- `/api/assistant/ask` : question libre ERP ;
- `/api/assistant/intent` : detection intention ;
- `/api/assistant/draft` : creation brouillon ;
- `/api/assistant/validate` : validation et execution ;
- `/api/modules/summary` : resume global de tous les modules ;
- `/api/notifications/critical` : alertes terrain ;
- `/api/smartfarm/events` : evenements capteurs/cameras.

## Securite

- authentification obligatoire ;
- token utilisateur ;
- actions sensibles toujours validees ;
- journalisation des commandes vocales ;
- pas d'execution directe sans validation ;
- historique des modules impactes.

## Confidentialite vocale

Principe :

- wake word local ;
- transcription seulement apres activation ;
- possibilite de desactiver l'ecoute ;
- voyant micro visible ;
- historique controlable.

## Relation avec l'ERP web actuel

L'ERP web reste le coeur.

L'app native n'est pas un deuxieme ERP.

Elle agit comme :

- interface vocale ;
- copilote terrain ;
- pont IA ;
- extension mobile/desktop ;
- centre de notifications intelligentes.

## Roadmap

### Phase 1 — API Assistant dans ERP Web

- stabiliser `aiIntentEngine` ;
- stabiliser `voiceCommands` ;
- creer endpoints assistant ;
- standardiser brouillons ;
- standardiser validation.

### Phase 2 — Companion Desktop MVP

- Tauri ou Electron ;
- login utilisateur ;
- micro ;
- wake word simple ;
- transcription ;
- requetes API ;
- reponses vocales ;
- brouillon achat stock / question CA / navigation module.

### Phase 3 — Companion Mobile MVP

- React Native ou Flutter ;
- push notifications ;
- mode terrain ;
- commandes vocales ;
- validation brouillons ;
- synchronisation offline.

### Phase 4 — Smart Farm temps reel

- alertes camera ;
- alertes intrusion ;
- temperature/humidite ;
- notifications critiques ;
- recommandations IA.

## Decision UX

Dans l'ERP web, le bouton Horizon reste utile comme fallback.

Dans Horizon Native Companion, l'objectif est :

> Hey Horizon sans clic.

## Conclusion

Le vrai assistant vocal Horizon doit etre natif.

La PWA reste excellente pour consulter et administrer l'ERP, mais le wake word permanent et l'experience terrain intelligente doivent passer par Horizon Native Companion.
