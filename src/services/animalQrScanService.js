const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim().toUpperCase().replace(/\s+/g, '');

export function getAnimalQrValue(animal = {}) {
  return clean(animal.qr_code || animal.boucle_numero || animal.tag || animal.id);
}

export function resolveAnimalScan(rawValue = '', animals = []) {
  const value = clean(rawValue);
  if (!value) return { found: false, value, animal: null, reason: 'scan_vide' };

  const animal = arr(animals).find((row) => {
    const candidates = [row.id, row.tag, row.boucle_numero, row.qr_code, row.numero_boucle, row.identifiant_terrain]
      .map(clean)
      .filter(Boolean);
    return candidates.includes(value);
  });

  if (!animal) return { found: false, value, animal: null, reason: 'animal_introuvable' };

  return {
    found: true,
    value,
    animal,
    reason: 'animal_trouve',
    animalId: animal.id,
    displayName: animal.name || animal.nom || animal.id,
    species: animal.type || animal.espece || 'Animal',
  };
}

export function buildAnimalQrLabel(animal = {}) {
  const code = getAnimalQrValue(animal);
  const name = animal.name || animal.nom || '';
  const type = animal.type || animal.espece || '';
  return [code, name, type].filter(Boolean).join(' · ');
}

export default resolveAnimalScan;
