import { toNumber } from './format.js';

export const AVICOLE_TERMINAL_STATUSES = [
  'vendu_totalement',
  'vendu',
  'mort',
  'perdu_mortalite',
  'perdu_vol',
  'abattu',
  'transforme',
  'transformé',
  'termine',
  'terminé',
  'cloture',
  'cloturé',
  'clôture',
  'clôturé',
  'ferme',
  'fermé',
  'closed',
  'archive',
  'archivé',
  'supprime',
  'supprimé',
];

export const firstNumber = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return toNumber(value);
  }
  return 0;
};

export const avicoleInitialCount = (lot = {}) => firstNumber(lot.initial_count, lot.effectif_initial, lot.effectif_depart, lot.nombre_initial, lot.effectif, lot.nombre, lot.quantite);
export const avicoleDeadCount = (lot = {}) => firstNumber(lot.mortality, lot.morts, lot.deaths, lot.pertes_mortalite, lot.pertes);
export const avicoleStolenCount = (lot = {}) => firstNumber(lot.vols, lot.voles, lot.volés, lot.stolen);
export const avicoleSoldCount = (lot = {}) => firstNumber(lot.vendus, lot.sold_count, lot.sold);
export const avicoleSlaughteredCount = (lot = {}) => firstNumber(lot.abattus, lot.slaughtered, lot.transformes, lot.transformés, lot.sujets_abattus);
export const avicoleReformedCount = (lot = {}) => firstNumber(lot.reformes, lot.réformés, lot.reformed);
export const avicoleOtherExitCount = (lot = {}) => firstNumber(lot.autres_sorties, lot.sorties_autres, lot.sorties, lot.other_exits);
export const avicoleSickCount = (lot = {}) => firstNumber(lot.malades, lot.sick_count, lot.sick, lot.malade_count);

export const avicoleCalculatedActiveCount = (lot = {}) => Math.max(
  0,
  avicoleInitialCount(lot)
  - avicoleDeadCount(lot)
  - avicoleStolenCount(lot)
  - avicoleSoldCount(lot)
  - avicoleSlaughteredCount(lot)
  - avicoleReformedCount(lot)
  - avicoleOtherExitCount(lot),
);
export const avicoleRegisteredActiveCount = (lot = {}) => firstNumber(lot.current_count, lot.effectif_actuel, lot.nombre_actuel, lot.active_count);
export const avicoleActiveCount = (lot = {}) => avicoleInitialCount(lot) > 0 ? avicoleCalculatedActiveCount(lot) : avicoleRegisteredActiveCount(lot);
export const avicoleHasCountMismatch = (lot = {}) => avicoleInitialCount(lot) > 0 && avicoleRegisteredActiveCount(lot) > 0 && avicoleRegisteredActiveCount(lot) !== avicoleCalculatedActiveCount(lot);

export const avicoleIsTerminalStatus = (status) => AVICOLE_TERMINAL_STATUSES.includes(String(status || '').toLowerCase().trim());

export function avicoleExitReason(lot = {}) {
  const explicit = String(lot.status || lot.statut || '').toLowerCase().trim();
  if (avicoleIsTerminalStatus(explicit) && avicoleActiveCount(lot) > 0) return explicit;
  const current = avicoleActiveCount(lot);
  if (current > 0) return avicoleSoldCount(lot) > 0 ? 'vendu_partiellement' : 'actif';
  const sold = avicoleSoldCount(lot);
  const dead = avicoleDeadCount(lot);
  const stolen = avicoleStolenCount(lot);
  const slaughtered = avicoleSlaughteredCount(lot);
  const reformed = avicoleReformedCount(lot);
  const other = avicoleOtherExitCount(lot);
  if (sold > 0 && sold >= Math.max(dead, stolen, slaughtered, reformed, other)) return 'vendu';
  if (slaughtered > 0 && slaughtered >= Math.max(dead, stolen, sold, reformed, other)) return 'abattu';
  if (stolen > 0 && stolen >= Math.max(dead, sold, slaughtered, reformed, other)) return 'perdu_vol';
  if (dead > 0 && dead >= Math.max(stolen, sold, slaughtered, reformed, other)) return 'perdu_mortalite';
  if (reformed > 0) return 'reforme';
  if (other > 0) return 'sorti_autre';
  if (avicoleIsTerminalStatus(explicit)) return explicit;
  return 'sortie_non_renseignee';
}

export const avicoleHasActiveBirds = (lot = {}) => avicoleActiveCount(lot) > 0 && !avicoleIsTerminalStatus(lot.status || lot.statut);

export function avicoleStatusFor(lot = {}) {
  const explicit = String(lot.status || lot.statut || '').toLowerCase().trim();
  if (avicoleIsTerminalStatus(explicit)) return explicit;
  if (avicoleActiveCount(lot) <= 0) return avicoleExitReason(lot);
  if (avicoleSoldCount(lot) > 0) return 'vendu_partiellement';
  return lot.status || lot.statut || 'actif';
}
