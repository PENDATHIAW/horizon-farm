const arr = (value) => Array.isArray(value) ? value : [];
const num = (value = 0) => Number(value || 0) || 0;
const validDate = (value) => { const d = value ? new Date(value) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
const iso = (date) => validDate(date)?.toISOString().slice(0, 10) || '';
const addDays = (date, days) => { const d = validDate(date) || new Date(); d.setDate(d.getDate() + Number(days || 0)); return d; };
const text = (row = {}) => `${row.type || ''} ${row.name || ''} ${row.nom || ''} ${row.espece || ''}`.toLowerCase();

export const CYCLE_DAYS = { chair: 40, bovins: 90, pondeusesReformWatch: 510 };

export function getEntryDate(row = {}) {
  return validDate(row.entry_date || row.date_entree || row.date_debut || row.date_achat || row.date_entree_ferme || row.created_at || row.createdAt);
}

export function isChairLot(row = {}) {
  const value = text(row);
  return value.includes('chair') || value.includes('poulet');
}

export function isLayerLot(row = {}) {
  const value = text(row);
  return value.includes('pondeuse') || value.includes('ponte') || value.includes('oeuf') || value.includes('œuf');
}

export function isBovine(row = {}) {
  const value = text(row);
  return value.includes('bovin') || value.includes('boeuf') || value.includes('bœuf') || value.includes('taureau') || value.includes('veau');
}

export function buildCalculatedCycleDates({ lots = [], animaux = [] } = {}) {
  const chairSales = arr(lots).filter(isChairLot).map((lot, index) => {
    const start = getEntryDate(lot);
    return {
      id: lot.id || `chair-${index + 1}`,
      label: lot.name || lot.nom || `Bande chair ${index + 1}`,
      startDate: iso(start),
      targetDate: start ? iso(addDays(start, CYCLE_DAYS.chair)) : '',
      quantity: num(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count ?? lot.count),
      cycleDays: CYCLE_DAYS.chair,
      type: 'chair',
    };
  }).filter((row) => row.startDate);

  const bovinSales = arr(animaux).filter(isBovine).filter((animal) => !['vendu', 'sorti', 'archive'].includes(String(animal.status || animal.statut || '').toLowerCase())).map((animal, index) => {
    const start = getEntryDate(animal);
    return {
      id: animal.id || animal.tag || `bovin-${index + 1}`,
      label: animal.name || animal.nom || animal.tag || `Bovin ${index + 1}`,
      startDate: iso(start),
      targetDate: start ? iso(addDays(start, CYCLE_DAYS.bovins)) : '',
      quantity: 1,
      cycleDays: CYCLE_DAYS.bovins,
      type: 'bovins',
    };
  }).filter((row) => row.startDate);

  const layerReform = arr(lots).filter(isLayerLot).map((lot, index) => {
    const start = getEntryDate(lot);
    return {
      id: lot.id || `pondeuse-${index + 1}`,
      label: lot.name || lot.nom || `Bande pondeuse ${index + 1}`,
      startDate: iso(start),
      targetDate: start ? iso(addDays(start, CYCLE_DAYS.pondeusesReformWatch)) : '',
      quantity: num(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count ?? lot.count),
      cycleDays: CYCLE_DAYS.pondeusesReformWatch,
      type: 'pondeuses',
    };
  }).filter((row) => row.startDate);

  return { chairSales, bovinSales, layerReform, all: [...chairSales, ...bovinSales, ...layerReform].sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate))) };
}
