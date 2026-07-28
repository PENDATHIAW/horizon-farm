# Onboarding par filière (HF-P1-009)

Objectif (audit) : « la richesse fonctionnelle décourage une petite ferme » →
**assistant de configuration par filière** + affichage progressif des modules.

## Ce qui est livré

- **`src/config/onboardingProfiles.js`** *(pur)* — profils de filière
  (aviculture chair, pondeuses, bovin, cultures, mixte, agro-industrie). Chaque
  profil déclare :
  - `flags` : réglage des modules activables ferme par ferme (AGRI FEEDS, Smart
    Farm, Financements, Assistant) adapté à l'activité ;
  - `firstSteps` : premiers gestes guidés (libellé + module + onglet) ;
  - `focusModules` : modules mis en avant.
  Fonctions : `resolveOnboardingFlags`, `buildOnboardingSettings`,
  `isFarmOnboarded`.

- **`src/modules/OnboardingAssistantPanel.jsx`** — assistant dans **Gestion
  système → Modules & activation** : choix de la filière (cartes), aperçu des
  premiers gestes, puis application. L'application écrit
  `farms.settings.modules` (flags) et `farms.settings.onboarding` (profil + date)
  et met à jour l'instantané local des flags. Une fois la filière choisie, une
  vue compacte donne accès direct aux premiers gestes.

- Les réglages manuels module par module restent disponibles en dessous pour les
  utilisateurs avancés.

## Effet

Choisir « Aviculture chair » active les bons modules et propose : créer une
bande, distribuer l'aliment, peser, vendre — au lieu de laisser l'exploitant
découvrir seul des dizaines d'écrans. Tout reste ajustable ensuite.

## Suite possible

- Nudge d'onboarding sur l'Accueil pour une ferme non configurée
  (`isFarmOnboarded` renvoie déjà l'état).
- Pré-remplissage de données initiales guidées par filière.
