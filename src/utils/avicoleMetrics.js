import { toNumber } from './format';

export const AVICOLE_TERMINAL_STATUSES = ['vendu_totalement', 'cloture', 'clôturé', 'termine', 'terminé', 'archive', 'supprime', 'supprimé'];

export const firstNumber = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return toNumber(value);
  }
  return 0;
};

export const avicoleInitialCount = (lot = {}) => firstNumber(lot.initial_count, lot.effectif_initial, lot.effectif_depart, lot.nombre_initial, lot.effectif, lot.nombre, lot.quantite);
export const avicoleDeadCount = (lot = {}) => firstNumber(lot.mortality, lot.morts, lot.deaths, lot.pertes);
export const avicoleStolenCount = (lot = {}) => firstNumber(lot.vols, lot.voles, lot.volés, lot.stolen);
export const avicoleSoldCount = (lot = {}) => firstNumber(lot.vendus, lot.sold_count, lot.sold);
export const avicoleReformedCount = (lot = {}) => firstNumber(lot.reformes, lot.réformés, lot.reformed);
export const avicoleOtherExitCount = (lot = {}) => firstNumber(lot.autres_sorties, lot.sorties_autres, lot.sorties, lot.other_exits);
export const avicoleSickCount = (lot = {}) => firstNumber(lot.malades, lot.sick_count, lot.sick, lot.malade_count);

// Règle métier unique : les malades restent présents dans le lot.
// Ne jamais repartir de current_count/effectif_actuel ici, car ces champs peuvent déjà être calculés.
export const avicoleActiveCount = (lot = {}) => Math.max(
  0,
  avicoleInitialCount(lot)
  - avicoleDeadCount(lot)
  - avicoleStolenCount(lot)
  - avicoleSoldCount(lot)
  - avicoleReformedCount(lot)
  - avicoleOtherExitCount(lot),
);

export const avicoleIsTerminalStatus = (status) => AVICOLE_TERMINAL_STATUSES.includes(String(status || '').toLowerCase());
export const avicoleHasActiveBirds = (lot = {}) => avicoleActiveCount(lot) > 0 && !avicoleIsTerminalStatus(lot.status || lot.statut);

export function avicoleStatusFor(lot = {}) {
  const current = avicoleActiveCount(lot);
  if (current <= 0 || avicoleIsTerminalStatus(lot.status || lot.statut)) return 'cloture';
  if (avicoleSoldCount(lot) > 0) return 'vendu_partiellement';
  return lot.status || lot.statut || 'actif';
}
