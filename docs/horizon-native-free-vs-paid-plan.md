# Horizon Native Companion — Gratuit vs payant

## Position

On peut demarrer Horizon Native Companion presque gratuitement, mais pas tout finaliser gratuitement si l'objectif est une vraie app iOS/Android publiee avec wake word fiable.

## Ce qu'on peut faire gratuitement maintenant

- prototype desktop local ;
- prototype mobile en developpement ;
- ecran assistant ;
- connexion a l'ERP via API ;
- brouillons Horizon ;
- validation utilisateur ;
- notifications locales simples ;
- tests internes sur machine de developpement ;
- moteur wake word open-source en preuve de concept ;
- transcription via outils gratuits ou simulation texte.

## Ce qui risque de couter plus tard

- compte Apple Developer pour distribution iOS ;
- compte Google Play pour publication Android ;
- build cloud mobile si on utilise un service externe ;
- moteur wake word commercial si open-source insuffisant ;
- API IA vocale/LLM pour intelligence avancee ;
- hebergement/API si usage eleve ;
- maintenance app native.

## Strategie recommandee

### Phase gratuite

1. Ne pas publier dans les stores.
2. Faire un prototype local/desktop d'abord.
3. Connecter le companion aux API Horizon deja creees.
4. Tester les workflows : question, brouillon, validation.
5. Simuler le wake word si necessaire.

### Phase payante minimale

1. Apple Developer seulement quand on est pret a tester vraiment sur iPhone avec distribution propre.
2. Google Play seulement quand Android doit etre publie.
3. IA vocale payante seulement quand la V1 ERP est stable.

## Decision V1

Pour la V1 actuelle, Horizon Native Companion reste Post-V1.

On ne paie rien maintenant pour le natif. On prepare seulement l'architecture et les API.
