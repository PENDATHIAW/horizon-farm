# Horizon Chat

## Principe

Horizon Chat est une application mobile standalone accessible via `/chat`. Elle ne remplace pas l'ERP et ne réutilise pas son interface visuelle. Elle se connecte avec les mêmes identifiants et utilise les mêmes données Supabase.

## Rôle

- ERP Horizon Farm : gestion complète, tableaux, filtres, corrections, audit.
- Horizon Chat : assistant conversationnel pour demander, vérifier, saisir et déclencher des actions rapides.

Les deux se complètent et partagent la même source de données.

## Données utilisées

Le chat lit les données ERP via `AppContext` : ventes, paiements, clients, stock, ponte, santé, tâches, alertes, capteurs, caméras, documents, finances, fournisseurs et événements métier.

Les actions sensibles demandent confirmation avant écriture.

## Capteurs, humidité, thermique et caméras

Les capteurs et caméras restent gérés dans l'ERP. Horizon Chat lit les tables `sensor_devices`, `camera_devices` et `alertes_center`, puis affiche les alertes utiles dans la conversation.

Exemples :

- température élevée ;
- humidité élevée ;
- mouvement caméra ;
- caméra hors ligne ;
- alerte terrain issue du centre d'alertes.

## Langues

Phase actuelle : détection simple français / wolof / anglais, avec réponses adaptées.

Objectif suivant : brancher un vrai modèle IA pour comprendre les subtilités de toutes les questions ERP.

## Accès

- Local : `http://127.0.0.1:5173/chat`
- Vercel : ajouter `/chat` à l'URL de preview ou de production.

## Limites actuelles

- Agent encore local/mock, sans LLM connecté.
- Compréhension large mais pas illimitée.
- La vraie réponse à toutes les questions ERP nécessitera un moteur IA connecté à des outils de recherche et d'action sur Supabase.
