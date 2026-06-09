import { getReproductionAlerts } from './animalLifecycle.js';

const lower = (value) => String(value || '').toLowerCase();
const arr = (value) => (Array.isArray(value) ? value : []);

export const GESTATION_DAYS_BY_SPECIES = {
  Bovin: 280,
  Ovin: 150,
  Caprin: 150,
  default: 150,
};

const closedStatuses = ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'];

export const isClosedAnimal = (row = {}) => {
  const status = lower(row.status || row.statut);
  return closedStatuses.some((word) => status.includes(word));
};

export const isFemaleAnimal = (row = {}) => {
  const sexe = lower(row.sexe || row.sex);
  if (sexe === 'f' || sexe === 'femelle' || sexe === 'female') return true;
  return false;
};

export const isActiveFemale = (row = {}) => isFemaleAnimal(row) && !isClosedAnimal(row);

export const speciesKey = (row = {}) => {
  const type = lower(row.type || row.espece || 'Bovin');
  if (type.includes('bovin') || type.includes('vache')) return 'Bovin';
  if (type.includes('ovin') || type.includes('mouton')) return 'Ovin';
  if (type.includes('caprin') || type.includes('chevre') || type.includes('chèvre')) return 'Caprin';
  return 'Bovin';
};

export const gestationDaysFor = (row = {}) =>
  GESTATION_DAYS_BY_SPECIES[speciesKey(row)] || GESTATION_DAYS_BY_SPECIES.default;

export const addDays = (isoDate = '', days = 0) => {
  const [y, m, d] = String(isoDate || '').slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return new Date().toISOString().slice(0, 10);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
};

export const predictDueDate = (animal = {}, startDate = '') => {
  const start = startDate || animal.date_debut_gestation || new Date().toISOString().slice(0, 10);
  return addDays(start, gestationDaysFor(animal));
};

export const daysUntil = (isoDate = '') => {
  const due = new Date(String(isoDate || '').slice(0, 10));
  if (Number.isNaN(due.getTime())) return null;
  return Math.ceil((due.getTime() - Date.now()) / 86400000);
};

export const isBirthLikeEvent = (row = {}) =>
  /naissance|mise bas|mise_bas|reproduction|gestation|saillie|portee|portée|veau|agneau|chevreau/.test(
    lower(`${row.event_type || ''} ${row.title || ''} ${row.description || ''}`),
  );

export const isReproductionModuleEvent = (row = {}) =>
  lower(row.module_source || '') === 'reproduction' || isBirthLikeEvent(row);

export function buildGestantesList(animaux = []) {
  return arr(animaux)
    .filter((row) => isActiveFemale(row) && row.en_gestation)
    .map((row) => {
      const due = row.date_prevue_mise_bas || '';
      const days = daysUntil(due);
      return {
        id: row.id,
        name: row.name || row.nom || row.id,
        species: speciesKey(row),
        date_debut_gestation: row.date_debut_gestation || '',
        date_prevue_mise_bas: due,
        days_until_due: days,
        male_id: row.male_reproducteur_id || row.pere_id || '',
        statut_reproduction: row.statut_reproduction || '',
      };
    })
    .sort((a, b) => {
      const da = a.days_until_due ?? 9999;
      const db = b.days_until_due ?? 9999;
      return da - db;
    });
}

export function buildReproductionAlerts(animaux = []) {
  return arr(animaux)
    .flatMap((animal) => getReproductionAlerts(animal))
    .sort((a, b) => {
      const rank = { danger: 0, warning: 1, info: 2 };
      return (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3);
    });
}

export function buildReproductionKpis({
  animaux = [],
  businessEvents = [],
  periodStart = '',
} = {}) {
  const females = arr(animaux).filter(isActiveFemale);
  const gestantes = females.filter((row) => row.en_gestation);
  const gestantesProches = gestantes.filter((row) => {
    const days = daysUntil(row.date_prevue_mise_bas);
    return days !== null && days <= 14;
  });
  const alerts = buildReproductionAlerts(animaux);
  const start = String(periodStart || '').slice(0, 10);
  const birthEvents = arr(businessEvents).filter((row) => {
    if (!isBirthLikeEvent(row)) return false;
    if (!start) return true;
    return String(row.event_date || row.date || row.created_at || '').slice(0, 10) >= start;
  });

  return {
    females: females.length,
    gestantes: gestantes.length,
    gestantesProches: gestantesProches.length,
    birthEvents: birthEvents.length,
    alertCount: alerts.length,
    alerts,
    gestantesList: buildGestantesList(animaux),
    birthJournal: arr(businessEvents)
      .filter(isBirthLikeEvent)
      .sort((a, b) => String(b.event_date || b.date || '').localeCompare(String(a.event_date || a.date || '')))
      .slice(0, 20),
  };
}

export function isBirthAcquisitionDraft(draft = {}) {
  const mode = lower(draft?.draft_fields?.mode_acquisition || '');
  return mode === 'naissance_ferme' || mode === 'reproduction_interne';
}

export const REPRODUCTION_FORM_TYPES = new Set([
  'reproduction_saillie',
  'reproduction_gestation',
  'reproduction_mise_bas',
  'animal_creation',
  'reproduction_document',
]);

export function shouldRouteDraftToReproduction(detail = {}) {
  const module = lower(detail?.module || detail?.draft?.primary_module || '');
  const formType = detail?.draft?.form_type || '';
  if (module === 'reproduction' || module === 'elevage') {
    return REPRODUCTION_FORM_TYPES.has(formType) || lower(detail?.draft?.intent_label || '').includes('reproduction');
  }
  if (module === 'animaux' && formType === 'animal_creation' && isBirthAcquisitionDraft(detail.draft)) return true;
  if (module === 'animaux' && REPRODUCTION_FORM_TYPES.has(formType)) return true;
  return false;
}

/** Preuve reproduction persistée (photo ou lien) — liée mère + module reproduction. */
export function buildReproductionProofDocument({
  id,
  title,
  animalId,
  porteeId,
  date,
  notes,
  preuve_photo_data,
  preuve_file_name,
  preuve_mime_type,
  document_category = 'reproduction',
} = {}) {
  const file = preuve_photo_data || '';
  const motherId = animalId || '';
  return {
    id,
    title: title || 'Preuve reproduction',
    document_category,
    module_source: 'reproduction',
    entity_type: motherId ? 'animal' : 'reproduction',
    entity_id: motherId || id,
    animal_id: motherId || undefined,
    portee_id: porteeId || undefined,
    related_id: motherId || id,
    date,
    notes,
    file_url: file || undefined,
    file_name: preuve_file_name || (file ? `preuve-repro-${motherId || id}.jpg` : undefined),
    mime_type: preuve_mime_type || (file ? 'image/*' : undefined),
    status: file ? 'fourni' : 'manquant',
    verification_status: file ? 'a_verifier' : 'preuve_manquante',
    storage_mode: file ? 'photo_upload' : 'metadata_only',
  };
}
