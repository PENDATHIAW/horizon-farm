# Audit Phase 1 · Synthèse et plan

Lecture seule, 2026-07-13, branche `claude/go-a21ueq`. Détail : `00_cartographie.md`,
`{module}.md`, `99_transverse.md`.

## Note globale : 52 / 100

Justification. Le socle est sain et en progrès (identifiants et alias propres,
flags par ferme, Accueil et Centre décisionnel restructurés, composants uniques et
catalogues KPI/alertes créés, contrat des 20 s encodé, redirections des anciennes
routes, i18n et charte amorcées avec tests). Mais la mise en conformité est
inégale : l'isolation multi-ferme n'est pas garantie en base, l'idempotence du
rejeu hors ligne est trouée, 15 des 17 modules gardent des onglets non conformes,
les composants uniques ne sont adoptés que par 3 modules, et 2 000+ chaînes restent
en dur. On est à mi-parcours : les fondations existent, l'application aux modules
reste à faire.

Répartition indicative : Structure 5/10 · Pertinence 6/10 · Compréhensibilité 6/10
· Éditabilité 5/10 · Saisie 6/10 · Intégrité 5/10 · Multi-ferme 3/10 · Idempotence
4/10 · Langage/i18n 5/10 · Cohérence composants 5/10.

## Les 10 problèmes les plus graves (par impact)

1. **Isolation multi-ferme non garantie en base** (99 §1). `farm_id` + RLS par
   ferme absents sur la majorité des tables métier (ventes, factures, paiements,
   tâches, alertes, documents, santé, équipements). Un accès direct à l'API n'est
   pas cloisonné. **Impact : fuite de données entre fermes.**
2. **Rejeu hors ligne non idempotent en effets** (99 §5). `syncOfflineQueue`
   rejoue en CRUD direct sans émettre les événements idempotents : effets
   inter-modules perdus ou incohérents au retour du réseau. **Impact : données
   incohérentes après coupure réseau — le pire risque terrain.**
3. **15 modules sur 17 aux onglets non conformes** (00, fiches). Seuls Accueil et
   Centre suivent la cible ; Élevage (4/8), Cultures (3/7), Achats (3/7), Smart
   Farm (3/7), Finance, Commercial, Documents, Objectifs, Équipe divergent.
   **Impact : produit qui ne parle pas encore la langue du cahier.**
4. **Composants uniques quasi non adoptés** (00 §3, 99 §2). `uniques/*` dans 3
   modules ; 43 fichiers gardent un KPI local, l'affichage tâches/alertes/journaux
   reste dupliqué. **Impact : mêmes objets rendus de façons divergentes.**
5. **KPI et marges recalculés localement** (99 §2, §4). Finance 31, Élevage 24,
   Commercial 16 fichiers de calcul local ; le catalogue KPI n'est pas la source
   unique effective. **Impact : chiffres qui divergent entre écrans.**
6. **~2 170 chaînes d'interface en dur** (99 §6). L'i18n ne couvre que le
   dictionnaire ; la charte n'est verrouillée que sur les chemins migrés.
   **Impact : langage et tirets longs non maîtrisés sur presque tout l'écran.**
7. **Onglet Décisions incomplet au Centre** (fiche Centre). Pas de fiche décision
   clôturable sur résultat mesuré ; recouvrement avec « Cockpit & décisions »
   d'Activité & Suivi. **Impact : la décision, cœur du produit, n'est pas outillée.**
8. **Équipe mélange RH, paie et maintenance** (fiche Équipe). Paie et données
   sensibles présentes malgré la règle de collecte minimale ; maintenance/parc
   relèvent d'Équipements. **Impact : mauvaise propriété + risque données
   personnelles.**
9. **Immuabilité des rapports publiés non prouvée** (fiche Documents, Financements).
   Gel, versionnage et blocage sur divergence de source à démontrer par test.
   **Impact : un rapport financeur pourrait diverger de ses sources.**
10. **~60 fichiers de modules legacy dans l'arbre** (00 §3). Finances ×11, Avicole
    ×9, etc., non chargés mais présents. **Impact : dette, confusion, risque de
    charger une mauvaise version.**

## Plan de correction proposé (lots)

- **Lot A — Multi-ferme et sécurité (priorité 1)** : `farm_id` + index + RLS par
  ferme sur toutes les tables métier ; migration de rattachement à Horizon Farm ;
  huit rôles cibles. Tests : isolation lecture/écriture entre deux fermes,
  permissions des huit rôles. *Bloqué sans accès à l'instance Supabase — à cadrer.*
- **Lot B — Idempotence hors ligne (priorité 1)** : router le rejeu par les
  événements idempotents à `issue_key` ; test « rejeu vente/réception/distribution/
  relevé = un seul effet » ; transactions sans état partiel silencieux.
- **Lot C — Composants uniques et catalogue KPI (priorité 2)** : généraliser
  `JournalEvenements/ListeTaches/ListeAlertes/CarteKPI`, supprimer les rendus
  locaux, faire du catalogue KPI la seule source affichée. Test de cohérence KPI
  (Accueil = module source = rapport).
- **Lot D — Structure des onglets (priorité 2)** : appliquer la cible du lot 4
  module par module (Élevage 8 onglets, Cultures 7, Achats 7, Finance 6, Smart Farm
  7, etc.), grille SPCE à l'appui, onglets en configuration ; onglet Décisions
  complet ; Équipe recentrée sur les employés.
- **Lot E — Langage et i18n (priorité 3)** : migrer les ~2 170 chaînes vers le
  dictionnaire, étendre le cliquet `CHEMINS_MIGRES` répertoire par répertoire,
  bannir tiret long et « IA » partout.
- **Lot F — Nettoyage de dette (priorité 3)** : archiver les ~60 modules legacy,
  clarifier les tables d'alertes satellites, prouver l'immuabilité des rapports.
- **Lot G — Tests et rapport final** : batterie complète du lot 6, chronométrage
  des 7 saisies, `RAPPORT_CORRECTION.md`.

## Arrêt

Fin de la Phase 1 (audit, lecture seule). **Aucun code modifié ; seuls des fichiers
`docs/audit/` ont été écrits.** J'attends votre validation et le signal
« go phase 2 » avant toute correction. Dites-moi aussi si vous voulez réordonner
les lots ou traiter d'abord un module précis.
