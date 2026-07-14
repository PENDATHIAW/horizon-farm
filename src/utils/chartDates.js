/** Dates pour graphiques d'évolution - évite le bucket « Sans date ». */

export function asChartDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function resolveChartDate(row = {}, fieldCandidates = []) {
  const defaults = [
    row.date_commande,
    row.order_date,
    row.date,
    row.date_vente,
    row.date_facture,
    row.event_date,
    row.created_at,
    row.updated_at,
  ];
  const candidates = [...fieldCandidates, ...defaults];
  for (const candidate of candidates) {
    const date = asChartDate(candidate);
    if (date) return date;
  }
  return null;
}

export function monthKeyFromDate(value) {
  const date = value instanceof Date ? value : asChartDate(value);
  if (!date) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabelFromKey(key) {
  if (!key) return '';
  const [year, month] = key.split('-');
  return `${month}/${String(year).slice(-2)}`;
}
