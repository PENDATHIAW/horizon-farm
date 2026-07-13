const lower = (v) => String(v || '').toLowerCase();
const arr = (v) => (Array.isArray(v) ? v : []);


const isHealthLate = (row = {}) =>
  ['retard', 'en_retard', 'a_faire_retard', 'overdue', 'a_faire'].includes(lower(row.statut || row.status || row.etat));

const isSanitaryVacuum = (healthRows = []) => {
  const recent = arr(healthRows).filter((r) => {
    const d = String(r.effectuee || r.date || r.prevue || '').slice(0, 10);
    return d >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  });
  return recent.length === 0 && arr(healthRows).length > 0;
};

/**
 * Blocages vente / transformation si santé en retard ou vide sanitaire.
 */
export function evaluateElevageHealthBlocks({
  healthRows = [],
  entityId = '',
  entityType = '',
} = {}) {
  const scoped = entityId
    ? arr(healthRows).filter((r) => {
        const rel = String(r.related_id || r.animal_id || r.lot_id || '');
        const mod = lower(r.module_lie || r.entity_type || '');
        if (entityType === 'animal') return rel === String(entityId) || lower(r.animal || '').includes(entityId);
        if (entityType === 'lot') return rel === String(entityId) || mod.includes('avicole');
        return true;
      })
    : arr(healthRows);

  const late = scoped.filter(isHealthLate);
  const vacuum = isSanitaryVacuum(scoped);

  const blocked = late.length > 0 || vacuum;
  const messages = [];
  if (late.length) messages.push(`${late.length} intervention(s) en retard ou à faire.`);
  if (vacuum) messages.push('Aucune intervention sanitaire récente (30 j) - vide sanitaire à combler.');

  return {
    blocked,
    blockSale: blocked,
    blockTransformation: blocked,
    lateCount: late.length,
    messages,
    lateItems: late.slice(0, 5),
  };
}

export function buildSanitaryAlertsPanel(healthRows = []) {
  const late = arr(healthRows).filter(isHealthLate);
  return late.slice(0, 8).map((row) => ({
    id: row.id,
    title: row.nom || row.type_intervention || 'Soin',
    message: `${row.animal || row.target_summary || '-'} · ${String(row.prevue || row.date || '').slice(0, 10)}`,
    severity: 'warning',
  }));
}
