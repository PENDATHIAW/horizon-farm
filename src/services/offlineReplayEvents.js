/**
 * Rejeu hors ligne idempotent (lot B).
 *
 * La file hors ligne ne doit plus rejouer en CRUD brut : après reconnexion, elle
 * réémet les événements métier avec leur clé (issue_key). Un événement rejoué
 * produit alors un seul effet inter-modules, car la clé est déterministe et la
 * déduplication (findDuplicateBusinessEvent) écarte les événements déjà connus.
 *
 * Ce module est pur (aucune dépendance React) pour être testé directement.
 */
import { buildCreateEvents, buildUpdateEvents } from './businessEventBuilders.js';
import { findDuplicateBusinessEvent } from './businessEventDedup.js';
import { buildIssueKey } from './issueLinkingService.js';

const clean = (v) => String(v || '').trim();

/**
 * Attache la même issue_key déterministe que createBusinessEvent, pour que le
 * rejeu d'un même enregistrement produise la même clé (donc un seul effet).
 */
export function withStableIssueKey(event = {}) {
  if (clean(event.issue_key)) return event;
  const sourceModule = event.source_module || event.module_source || 'system';
  const sourceRecordId = event.source_record_id || event.entity_id || 'unknown';
  const issue_key = buildIssueKey({
    domain: event.event_type || 'event',
    sourceModule,
    sourceRecordId: sourceRecordId || 'unknown',
    kind: event.title || event.event_type || 'event',
  });
  return { ...event, issue_key };
}

/**
 * Construit les événements d'une opération rejouée (création ou mise à jour),
 * avec leur issue_key stable.
 * @param {'create'|'update'} action
 */
export function buildReplayEvents(moduleKey, action, record, previousRow = null) {
  const raw = action === 'update'
    ? buildUpdateEvents(moduleKey, previousRow || {}, record)
    : buildCreateEvents(moduleKey, record);
  return raw
    .filter((event) => event?.event_type && event?.title)
    .map(withStableIssueKey);
}

/**
 * Sélectionne, parmi des événements candidats, ceux qui ne sont pas déjà connus.
 * Rejouer deux fois la même opération renvoie donc les événements la première
 * fois et une liste vide la seconde : un seul effet.
 * @returns {{nouveaux: object[], connus: object[]}}
 */
export function selectionnerNouveauxEvenements(candidats = [], evenementsConnus = []) {
  const nouveaux = [];
  const connus = [...evenementsConnus];
  for (const event of candidats) {
    if (findDuplicateBusinessEvent(event, connus)) continue;
    nouveaux.push(event);
    connus.push(event);
  }
  return { nouveaux, connus };
}

/**
 * Déduplique une file de mutations hors ligne par (moduleKey, action, id) en
 * gardant la dernière charge utile : rejouer la même écriture n'apparaît qu'une
 * fois, ce qui évite les doubles insertions au niveau de l'enregistrement.
 */
export function dedupeFileHorsLigne(file = []) {
  const parCle = new Map();
  for (const item of file) {
    // Dédupliquer par identifiant réel de l'enregistrement (recordId), pas par
    // l'identifiant unique de l'entrée de file : deux écritures de la même ligne
    // sont ainsi bien fusionnées (la dernière l'emporte).
    const recordId = item.recordId ?? item.id;
    const cle = `${item.moduleKey}|${item.action}|${recordId}`;
    parCle.set(cle, item);
  }
  return [...parCle.values()];
}
