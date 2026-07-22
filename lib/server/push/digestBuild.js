/**
 * Cœur testable du digest push : construit la notification (titre, corps, ciblage
 * RACI) à partir des données ERP. Sans dépendance transport (web-push), pour être
 * importable en test.
 */

import { buildFarmDigest, renderDigestText } from '../../../src/services/farmDigestReport.js';

/**
 * @returns { digest, text, payload, audienceRecord }
 */
export function buildDigestNotification(data = {}, { period = 'hebdo' } = {}) {
  const digest = buildFarmDigest(data, { period });
  const s = digest.summary;
  const firstAction = digest.sections?.actions?.items?.[0]?.text || '';
  const body = [
    `${s.attention} point(s) d'attention · ${s.predictions} à anticiper · ${s.relances} relance(s)`,
    firstAction ? `➡️ ${firstAction}` : '',
  ].filter(Boolean).join('\n');

  return {
    digest,
    text: renderDigestText(digest),
    payload: {
      title: `Horizon Farm - Rapport ${digest.periodLabel}`,
      body,
      message: body,
      severity: 'info',
      module: 'dashboard',
      tag: `horizon-digest-${period}`,
      url: '/?module=dashboard&tab=Pilotage',
      requireInteraction: false,
    },
    // Le digest s'adresse à la direction et à la finance.
    audienceRecord: { raci_owner_role: 'promotrice_direction', raci_notify_roles: ['promotrice_direction', 'finance'] },
  };
}

export default buildDigestNotification;
