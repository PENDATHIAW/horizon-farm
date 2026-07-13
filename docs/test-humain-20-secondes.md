# Test humain du contrat des 20 secondes

Le passage du test automatisé (`tests/e2e/contrat-20-secondes.spec.js`,
`tests/unit/contrat20Secondes.test.js`) ne suffit pas à valider l'objectif
humain. Chaque saisie quotidienne doit être chronométrée sur un vrai téléphone,
sur données de démonstration, par une personne du terrain. Tout scénario au-delà
de 20 secondes ou de 5 interactions est marqué PARTIEL.

## Méthode

1. Ouvrir l'application sur téléphone, se connecter avec un compte de démonstration.
2. Depuis l'Accueil, appuyer sur le bouton d'action rapide de la saisie.
3. Démarrer le chronomètre à l'ouverture du formulaire.
4. Remplir uniquement les champs requis (les préremplissages doivent déjà être justes).
5. Valider ; arrêter le chronomètre à l'affichage de la confirmation à effets.
6. Compter les interactions (appuis et sélections), préremplissages inclus comme zéro.

## Grille à remplir

| Saisie | Durée (s) | Interactions | Préremplissages corrects | Confirmation à effets affichée | Résultat |
|---|---|---|---|---|---|
| Distribuer l'aliment | | | | | |
| Enregistrer la ponte | | | | | |
| Déclarer une mortalité | | | | | |
| Enregistrer une pesée | | | | | |
| Noter l'irrigation | | | | | |
| Enregistrer la récolte | | | | | |
| Enregistrer une vente | | | | | |

Résultat = OK si durée < 20 s, interactions ≤ 5, préremplissages corrects et
confirmation à effets affichée ; sinon PARTIEL avec la raison.

## Consignation

Reporter la grille remplie, l'appareil, la version de l'application et la date
dans `docs/RAPPORT_CONFORMITE.md`, section chantier 5. Conserver ce fichier comme
modèle ; ne pas y écrire de données réelles de production.
