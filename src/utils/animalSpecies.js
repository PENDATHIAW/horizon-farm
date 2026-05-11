const clean = (value) => String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const ANIMAL_SPECIES_TABS = ['Bovin', 'Ovin', 'Caprin'];

export function normalizeAnimalSpecies(row = {}) {
  const raw = clean(row.type || row.espece || row.especes || row.categorie || row.category || row.famille || row.race || row.activity || row.activite);
  if (/bovin|boeuf|bœuf|vache|taureau|veau|genisse|genisse|zebu|zebu/.test(raw)) return 'Bovin';
  if (/ovin|mouton|brebis|belier|agneau|agnelle/.test(raw)) return 'Ovin';
  if (/caprin|chevre|chevre|bouc|chevreau/.test(raw)) return 'Caprin';
  return row.type || 'Bovin';
}

export function isAnimalSpecies(row = {}, species = 'Bovin') {
  return normalizeAnimalSpecies(row) === species;
}

export function filterAnimalsBySpecies(rows = [], species = 'Bovin') {
  return (Array.isArray(rows) ? rows : []).filter((row) => isAnimalSpecies(row, species));
}

export function countAnimalsBySpecies(rows = []) {
  return ANIMAL_SPECIES_TABS.reduce((acc, species) => ({ ...acc, [species]: filterAnimalsBySpecies(rows, species).length }), {});
}

export function normalizeRowsForInnerAnimalTabs(rows = [], species = 'Bovin') {
  return (Array.isArray(rows) ? rows : []).map((row) => ({ ...row, type: 'Bovin', espece_reelle: normalizeAnimalSpecies(row), type_reel: normalizeAnimalSpecies(row), species_filter: species }));
}

export function restoreSpeciesOnAnimalPayload(payload = {}, species = 'Bovin') {
  return { ...payload, type: species, espece: species, categorie: species };
}
