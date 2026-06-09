/**
 * Délai sanitaire — blocage vente / transformation tant que le délai est actif.
 */

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

export const SANITARY_ACTIONS = {
  SALE: 'sale',
  TRANSFORM: 'transform',
};

const SCOPE_ANIMAL_IDS = new Set(['ALL_ANIMAUX', 'ANIMAUX_MALADES']);
const SCOPE_LOT_IDS = new Set(['ALL_AVICOLE_LOTS', 'AVICOLE_MALADES']);

export function isWithdrawalActive(until = '', asOf = today()) {
  const end = clean(until);
  if (!end) return false;
  const ref = clean(asOf) || today();
  return end >= ref;
}

export function resolveHealthWithdrawalTargets(row = {}) {
  const animalIds = new Set();
  const lotIds = new Set();
  const animalId = clean(row.animal_id);
  const lotId = clean(row.lot_id);
  if (animalId) animalIds.add(animalId);
  if (lotId) lotIds.add(lotId);

  const related = clean(row.related_id);
  const module = clean(row.module_lie);
  if (module === 'animaux' && related && !SCOPE_ANIMAL_IDS.has(related)) animalIds.add(related);
  if (module === 'avicole' && related && !SCOPE_LOT_IDS.has(related)) lotIds.add(related);

  const detail = clean(row.cible_sante || row.target_detail);
  if (detail.startsWith('animal:')) animalIds.add(detail.replace('animal:', ''));
  if (detail.startsWith('lot:') || detail.startsWith('lot_malade:')) {
    lotIds.add(detail.replace('lot_malade:', '').replace('lot:', ''));
  }

  if (module === 'animaux' && arr(row.target_ids).length) {
    row.target_ids.forEach((id) => { if (clean(id)) animalIds.add(clean(id)); });
  }
  if (module === 'avicole' && arr(row.target_ids).length) {
    row.target_ids.forEach((id) => { if (clean(id)) lotIds.add(clean(id)); });
  }

  return { animalIds: [...animalIds], lotIds: [...lotIds] };
}

export function findActiveWithdrawals(healthRows = [], { asOf } = {}) {
  return arr(healthRows).filter((row) =>
    isWithdrawalActive(row.delai_sanitaire_fin || row.withdrawal_until, asOf),
  );
}

export function withdrawalAffectsTarget(row = {}, { animalId = '', lotId = '' } = {}) {
  const targets = resolveHealthWithdrawalTargets(row);
  const animal = clean(animalId);
  const lot = clean(lotId);
  if (!animal && !lot) return true;
  if (animal && targets.animalIds.includes(animal)) return true;
  if (lot && targets.lotIds.includes(lot)) return true;
  return false;
}

export function formatWithdrawalLabel(row = {}) {
  const until = clean(row.delai_sanitaire_fin || row.withdrawal_until);
  const name = clean(row.nom || row.type_intervention || row.id);
  const targets = resolveHealthWithdrawalTargets(row);
  const who = targets.animalIds[0] || targets.lotIds[0] || row.target_summary || 'cible';
  return `${name} (${who}) jusqu'au ${until}`;
}

export function formatSanitaryBlockMessage(withdrawals = [], action = SANITARY_ACTIONS.SALE) {
  const labels = withdrawals.slice(0, 3).map(formatWithdrawalLabel);
  const actionLabel = action === SANITARY_ACTIONS.TRANSFORM ? 'transformation / abattage' : 'vente Commercial';
  const tail = withdrawals.length > 3 ? ` (+${withdrawals.length - 3} autre(s))` : '';
  return `Délai sanitaire actif — ${actionLabel} bloquée. ${labels.join(' · ')}${tail}`;
}

/**
 * Retourne { blocked, message, withdrawals }.
 * Sans animal/lot : bloque si au moins un délai actif sur le cheptel.
 */
export function blockSanitaryAction({
  healthRows = [],
  action = SANITARY_ACTIONS.SALE,
  animalId = '',
  lotId = '',
  asOf,
} = {}) {
  const active = findActiveWithdrawals(healthRows, { asOf });
  const relevant = active.filter((row) => withdrawalAffectsTarget(row, { animalId, lotId }));
  if (!relevant.length) return { blocked: false, message: '', withdrawals: [] };
  return {
    blocked: true,
    message: formatSanitaryBlockMessage(relevant, action),
    withdrawals: relevant,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
