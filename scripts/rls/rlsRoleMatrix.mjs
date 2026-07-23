/**
 * Matrice de tests RLS par rôle (feuille de route HF-P0-005).
 *
 * Source unique de vérité pour le contrôle comportemental d'isolation
 * (`npm run db:migrate:isolation`). Chaque rôle officiel y déclare le
 * comportement attendu des politiques RLS Supabase :
 *
 *  - SMARTFARM_EXPECTATIONS : lecture/écriture Smart Farm + accès à une seconde
 *    ferme (isolation inter-fermes), pour prouver le cloisonnement par ferme.
 *  - DOMAIN_CHECKS : pour chaque rôle, un échantillon représentatif de tables
 *    métier avec [table, lecture attendue, écriture attendue]. Les quatre
 *    fonctions de politique (can_read/insert/update/delete_farm_table) sont
 *    génériques et pilotées par current_erp_role : tester une table par classe
 *    de permission suffit à prouver la logique partagée.
 *
 * Extraire cette matrice permet à un test CI (rlsTestMatrixCoverage.test.js) de
 * garantir qu'elle reste complète (les huit rôles) et cohérente (uniquement des
 * tables réellement cloisonnées par ferme) : une nouvelle table ou un nouveau
 * rôle ne peut plus rejoindre l'ERP sans couverture de test RLS.
 */

// Lecture/écriture Smart Farm par rôle + visibilité de la seconde ferme.
export const SMARTFARM_EXPECTATIONS = Object.freeze({
  promotrice_direction: { smartRead: true, smartWrite: true, farmB: true },
  responsable_filiere: { smartRead: true, smartWrite: true, farmB: false },
  terrain: { smartRead: true, smartWrite: false, farmB: false },
  finance: { smartRead: true, smartWrite: false, farmB: false },
  veterinaire: { smartRead: false, smartWrite: false, farmB: false },
  maintenance: { smartRead: true, smartWrite: true, farmB: false },
  financeur_externe: { smartRead: false, smartWrite: false, farmB: false },
  admin_support: { smartRead: true, smartWrite: true, farmB: true },
});

// Échantillon [table, lecture attendue, écriture attendue] par rôle.
export const DOMAIN_CHECKS = Object.freeze({
  promotrice_direction: [['transactions', true, true]],
  responsable_filiere: [['transactions', true, false], ['animals', true, true]],
  terrain: [['tasks', true, true], ['transactions', false, false]],
  finance: [['transactions', true, true], ['animals', true, false]],
  veterinaire: [['vaccins', true, true], ['transactions', false, false]],
  maintenance: [['equipment', true, true], ['transactions', false, false]],
  financeur_externe: [['funding_reports', false, false], ['transactions', false, false]],
  admin_support: [['transactions', true, true]],
});

// Rôle en lecture seule sur les données métier : ne doit jamais obtenir d'écriture.
export const READ_ONLY_ROLES = Object.freeze(['financeur_externe']);
