const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v = '') => String(v || '').trim().toLowerCase();

export const strategicAlertKey = (row = {}) => clean(
  row.alert_dedupe_key
  || `centre_strategique:${row.category || 'alert'}:${row.entity_id || row.id}:${row.title}`,
);

export const isKnownStrategicAlert = (existing = [], candidate = {}) => arr(existing).some((row) => {
  const open = !['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'closed', 'done'].includes(clean(row.status || row.statut));
  if (!open) return false;
  return strategicAlertKey(row) === strategicAlertKey(candidate);
});

function basePayload(item = {}) {
  return {
    module_source: 'centre_decisionnel',
    entity_type: item.entity_type || item.category || 'strategic_decision',
    entity_id: item.entity_id || item.lotId || item.id,
    status: 'nouvelle',
    statut: 'nouvelle',
    isAuto: true,
    alert_dedupe_key: strategicAlertKey(item),
    created_at: new Date().toISOString(),
  };
}

/** Construit les payloads d'alertes critiques à pousser vers le centre alertes. */
export function buildStrategicAlertPayloads(strategicPlan = {}) {
  const payloads = [];

  arr(strategicPlan.sellNow).forEach((item) => {
    payloads.push({
      ...basePayload({ ...item, category: 'sell_now', entity_type: 'lot', entity_id: item.lotId }),
      id: item.id,
      title: item.status || 'Urgence vente',
      message: item.message,
      severity: 'critique',
      action_recommandee: 'Vendre immédiatement — rendement économique négatif.',
      category: 'sell_now',
    });
  });

  if (strategicPlan.bfr?.blocked) {
    payloads.push({
      ...basePayload({ id: 'bfr-block', category: 'bfr' }),
      id: 'bfr-block',
      title: 'Lancement suspendu — trésorerie insuffisante',
      message: strategicPlan.bfr.message,
      severity: 'critique',
      action_recommandee: 'Relancer les créances VIP avant toute commande de bande.',
      category: 'bfr',
    });
  }

  arr(strategicPlan.sanitary).filter((s) => s.blocking).forEach((item) => {
    payloads.push({
      ...basePayload({ ...item, category: 'sanitary', entity_type: 'batiment', entity_id: item.building }),
      id: item.id,
      title: item.title || `Vide sanitaire — ${item.building}`,
      message: item.explanation || item.message,
      severity: 'critique',
      action_recommandee: (item.actions || [])[0] || 'Respecter le délai de vide sanitaire avant lancement.',
      category: 'sanitary',
    });
  });

  arr(strategicPlan.stockAudit?.alerts).forEach((item) => {
    payloads.push({
      ...basePayload({ ...item, category: 'stock_audit', entity_type: 'batiment', entity_id: item.building }),
      id: item.id,
      title: `Audit stock — ${item.building}`,
      message: item.message,
      severity: item.overPct >= 15 ? 'critique' : 'warning',
      action_recommandee: 'Contrôler stockage, distribution et écarts théoriques.',
      category: 'stock_audit',
    });
  });

  arr(strategicPlan.launch?.alerts).filter((a) => a.priority === 'critique' || a.priority === 'haute').slice(0, 3).forEach((item) => {
    payloads.push({
      ...basePayload({ ...item, category: 'launch_timing' }),
      id: item.id,
      title: item.eventLabel || 'Date pivot lancement',
      message: item.message,
      severity: item.priority === 'critique' ? 'critique' : 'warning',
      action_recommandee: `Respecter la date pivot ${item.pivotDate || item.eventDate || ''}.`.trim(),
      category: 'launch_timing',
    });
  });

  return payloads;
}

/** Pousse les alertes stratégiques manquantes vers alertes_center (sans doublon). */
export async function syncStrategicAlertsToCenter({
  strategicPlan,
  existingAlerts = [],
  onCreateAlert,
  onRefreshAlertes,
} = {}) {
  if (!onCreateAlert || !strategicPlan) return { created: 0, skipped: 0 };

  const payloads = buildStrategicAlertPayloads(strategicPlan);
  let created = 0;
  let skipped = 0;

  for (const payload of payloads) {
    if (isKnownStrategicAlert(existingAlerts, payload)) {
      skipped += 1;
      continue;
    }
    await onCreateAlert(payload);
    created += 1;
  }

  if (created > 0) await onRefreshAlertes?.();
  return { created, skipped };
}

export default syncStrategicAlertsToCenter;
