# Rapport de conformité Horizon Farm ERP

État final du 2026-07-13. Dépôt `PENDATHIAW/horizon-farm`, branche
`claude/go-a21ueq`, PR de consolidation #170, cible `main`, après la fusion partielle de #169.

Échelle imposée : FAIT, PARTIEL, NON FAIT, BLOQUÉ.

## Vue d'ensemble

| Chantier | Statut | Preuve |
|---|---|---|
| 0. Inventaire et reprise | FAIT | `docs/ETAT_ACTUEL.md` |
| 1. Dictionnaire et charte | FAIT | `npm run test:unit:i18n`, 4/4 |
| 2. Identifiants, flags, rôles et portée ferme | FAIT | 8 rôles, flags testés, matrice Supabase à 0 anomalie |
| 3. Structure des 17 modules | FAIT | configuration unique, 416/416 parcours d'onglets |
| 4. Composants uniques | FAIT | JournalEvenements, ListeTaches, ListeAlertes, CarteKPI |
| 5. Contrat des 20 secondes | PARTIEL | contrat automatisé vert, test humain sur téléphone à consigner |
| 6. Nettoyages de pertinence | FAIT | retraits vérifiés, aucun reliquat historique exécutable |
| 7. Tests et rapport | FAIT | 235/235 fichiers unitaires, lint, build et audits verts |
| Refonte visuelle | FAIT | 18 couleurs, 7 sections, 7 saisies, 16 modules avec indicateurs |
| Supabase production | FAIT | 96 tables existantes conformes, 3 absences attendues, 0 anomalie |

## 1. Dictionnaire et langage

Statut : FAIT.

- Dictionnaire central dans `src/i18n/fr/` et règles dans `src/i18n/charte.js`.
- Aucun terme interdit, identifiant technique ou tiret long dans les chaînes visibles contrôlées.
- Aucun texte français hors des chemins de dictionnaire autorisés par le test.
- Les boutons utilisent un verbe et un objet, les états vides proposent une action utile.
- `npm run test:unit:i18n` : 4 tests, 4 réussis.

## 2. Identifiants, flags, rôles et fermes

Statut : FAIT.

- Identifiants actifs : `centre_decisionnel`, `equipe`, `financements`.
- Les anciens identifiants restent des alias de navigation.
- Synchronisation et audit sont intégrés à Gestion du système. L'ancien point d'entrée reste un
  alias de compatibilité et n'est pas une entrée de navigation concurrente.
- `agri_feeds`, `smartfarm`, `financements` et `assistant_erp` sont pilotés par ferme.
  Un flag désactivé retire navigation, chargement différé et requêtes.
- Les huit rôles actifs sont : promotrice_direction, responsable_filiere, terrain, finance,
  veterinaire, maintenance, financeur_externe et admin_support.
- Les anciens rôles sont normalisés côté application et côté base.
- Les profils visiteurs restent en attente et sans accès métier.

### Supabase appliqué

- Projet vérifié : `HORIZON FARM`, région `eu-north-1`, état sain.
- Ferme par défaut : 1. Accès ferme actifs : 2.
- Profils actifs : 2 admin_support. Visiteur en attente : 1.
- Historique : 12 migrations enregistrées.
- Tables CRUD : 60 attendues, 60 présentes.
- Tables appelées directement par les sources : 71 attendues, 71 présentes.
- Tables métier existantes auditées : 96.
- Chaque table existante a `farm_id UUID NOT NULL`, une FK vers `farms`, un index, la RLS
  forcée, des politiques séparées de lecture, insertion, modification et suppression.
- Chaque table existante a `is_deleted`, `deleted_at`, `deleted_by`. Les lignes supprimées
  sont masquées par la politique de lecture.
- Test comportemental distant : 86 assertions, 8 rôles, 2 fermes, 0 fuite, nettoyage complet.
- `ai_decisions`, `ai_intake_events` et `ai_scores` ne sont pas déployées et ne sont appelées
  par aucune source exécutable.
- Détail reproductible : `docs/audits/SUPABASE_RLS_MATRIX.md`.

## 3. Modules et onglets

Statut : FAIT.

Chaque onglet possède un identifiant, un libellé du dictionnaire, une clé de vue distincte, des
rôles, un flag éventuel, un ordre et des alias historiques. La barre, le rendu et les liens
profonds utilisent `src/config/moduleTabs/`.

| Module | Onglets actifs |
|---|---|
| Accueil | Vue du jour, Pilotage, Mes actions |
| Assistant ERP | Conversation |
| Centre décisionnel | À traiter, Écarts, Risques, Décisions, Historique |
| Objectifs et Croissance | Objectifs, Scénarios, Historique |
| Élevage | Vue d'ensemble, Lots et animaux, Alimentation, Production, Santé et Biosécurité, Transformation, Coûts et performance, Historique |
| Cultures | Parcelles, Campagnes, Irrigation, Intrants et fertilisation, Récoltes, Coûts et marge, Historique |
| Commercial | Tableau de bord, Clients, Ventes et commandes, Livraisons, Factures et paiements, Créances et relances, Réclamations |
| Achats et Stock | Tableau de bord, Produits et catégories, Fournisseurs, Achats et réceptions, Stocks et lots, Mouvements, Inventaires |
| Finance et Pilotage | Vue d'ensemble, Transactions, Trésorerie, Budget et écarts, Coûts et marges, Investissements et dettes |
| Activité et Suivi | À faire, Calendrier, Alertes liées, Journal d'exploitation, Historique |
| Documents et Rapports | Bibliothèque, Preuves et justificatifs, Rapports, Publications, Archives |
| Équipe | Vue d'ensemble, Membres, Affectations, Absences |
| Équipements | Parc, Acquisitions, Pannes, Réparations, Coûts et disponibilité |
| Gestion du système | Fermes, Utilisateurs et accès, Rôles et permissions, Modules et activation, Paramètres, Référentiels, Catalogues KPI et alertes, Synchronisation, Audit et sécurité |
| AGRI FEEDS | Vue d'ensemble, Matières et fournisseurs, Formulations, Production, Essais et performance, Qualité, Commercial, Coûts et décisions |
| Smart Farm | Vue d'ensemble, Relevés d'eau, Énergie, Bâtiments, Dispositifs, Relevés et qualité, Configuration |
| Financements | Tableau de bord, Opportunités, Contacts et échanges, Candidatures, Pièces du dossier, Fonds et utilisation, Publications, Accès externes |

La face financeur en lecture seule expose : Vue d'ensemble, Rapports, Journal du projet, Documents
partagés et Contact.

Preuves :

- `tests/unit/moduleTabsConformiteV1.test.js` : 5/5.
- `npm run test:unit:module-tabs-stability` : 416/416.
- Audit navigateur : 15 modules activés et 82 onglets internes ouverts, aucun écran d'erreur,
  aucune erreur finale de console.

## 4. Composants uniques

Statut : FAIT.

- `src/components/uniques/JournalEvenements.jsx`
- `src/components/uniques/ListeTaches.jsx`
- `src/components/uniques/ListeAlertes.jsx`
- `src/components/uniques/CarteKPI.jsx`

Les anciens imports partagés pointent vers les composants uniques. `CarteKPI` gère le sens
métier de la variation, le chargement, l'absence de données, le clic et la ligne d'horizon.

## 5. Contrat des 20 secondes

Statut : PARTIEL.

Fait :

- Sept saisies quotidiennes : aliment, ponte, mortalité, pesée, irrigation, récolte, vente.
- Cinq champs requis maximum.
- Date, utilisateur, unité et cible unique préremplis quand disponibles.
- Listes filtrées par ferme, catégorie, disponibilité et statut.
- Clé stable en ligne et hors ligne, garde contre double clic et rejeu idempotent.
- Confirmation avec effets sur stock, coût ou indicateur.
- Menu global de saisie rapide sur ordinateur et mobile.
- `tests/unit/contrat20Secondes.test.js` : 7/7.
- `tests/unit/dailyQuickEntryContract.test.js` : 10/10.

Reste à consigner :

- Test par une personne sur un téléphone réel, chronométré pour les sept saisies, dans
  `docs/test-humain-20-secondes.md`.

Ce point ne peut pas être déclaré FAIT par une automatisation seule.

## 6. Nettoyages

Statut : FAIT.

- Carte météo retirée de l'Accueil.
- Assistant réduit à Conversation avec Suggestions intégrées.
- Capacité et Rentabilité fusionnées dans Scénarios.
- Modèles de documents intégré à Rapports.
- Rôles opérationnels porté par la fiche membre.
- Synchronisation et audit fusionnés dans Gestion du système.
- `BoviniaModule.jsx`, `TallowModule.jsx` et les actions associées sont absents.
- Recherche mot entier sur `src`, `public`, `lib` et `sites` : zéro reliquat BOVINIA ou Tallow.
- Service mort `src/services/erpRules/documentRules.js` supprimé.
- Aucun composant JSX orphelin, aucune route source orpheline, aucun import non résolu.

## 7. Transformation Élevage

Statut : FAIT.

- Onglet placé après Santé et Biosécurité et avant Coûts et performance.
- Alias `Transformation` et `transformation` conservés.
- Clic, `initialTab`, lien profond, action animal, action lot et événement d'ouverture utilisent
  la même configuration.
- Le formulaire conserve cible, date réelle, statut sanitaire, délai de retrait, poids d'entrée,
  produits finis, pertes, rendement, coûts, documents et traçabilité.
- La vente reste dans Commercial.
- Stock fini, mouvements, coûts, documents, événement et rafraîchissements sont produits une fois.
- Tests officiels : 14/14. Configuration et navigation : 6/6.

## 8. Design final

Statut : FAIT.

- Tokens uniques dans `src/styles/tokens.css`.
- Palette exacte de 18 couleurs, Fraunces et Inter.
- Navigation en 7 sections.
- 16 modules de navigation hors Accueil ouvrent avec leur bande d'indicateurs.
- Accueil limité aux indicateurs vitaux.
- Sept saisies disponibles partout.
- États de chargement, états vides, focus clavier et mouvement réduit.
- Barre mobile, menu latéral et fond de fermeture vérifiés.
- `npm run audit:design` : audit valide.
- Captures de contrôle réalisées sur ordinateur et mobile.

## 9. Validations finales

| Validation | Résultat |
|---|---|
| Suite unitaire complète | 235/235 fichiers, 0 échec |
| Audit métier simulé Playwright | 69/69 scénarios, 0 échec |
| Stabilité des onglets | 416/416 |
| Événements métier | 26/26 complets, 5/5 tests de matrice |
| Rôles et portée d'écriture | verts dans la suite complète |
| Isolation entre fermes | 52/52 |
| Idempotence | 13/13 |
| Saisies quotidiennes | 10/10 |
| Cohérence KPI | 6/6 |
| Rapports figés | 3/3 |
| i18n | 4/4 |
| Lint | 0 erreur |
| Build production | réussi |
| Audit design | réussi |
| Atteignabilité source | 1021 sources, 957 atteignables, 64 supports, 0 orpheline |
| Imports | 0 non résolu |
| Dépendances | 0 vulnérabilité |
| Supabase | 96 conformes, 3 absences attendues, 0 anomalie |
| Isolation Supabase réelle | 86 assertions, 8 rôles, 2 fermes, 0 fuite |
| Navigateur | 15 modules et 82 onglets, aucune page d'erreur |

Le build conserve seulement un avertissement de taille sur quelques bundles lourds. Il ne bloque
ni l'exécution ni la fusion.

## Conclusion

La conformité logicielle, métier, visuelle et Supabase est FAITE. Le seul statut PARTIEL concerne
le test d'usage chronométré par une personne sur un téléphone physique. Il est volontairement
laissé visible pour ne pas transformer une preuve automatisée en preuve humaine.
