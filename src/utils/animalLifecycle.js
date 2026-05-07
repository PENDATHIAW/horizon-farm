import { fmtCurrency, toNumber } from './format';

export const ACQUISITION_OPTIONS = [
  { value: 'achat', label: 'Achat' },
  { value: 'naissance_ferme', label: 'Naissance sur la ferme' },
  { value: 'reproduction_interne', label: 'Reproduction interne' },
  { value: 'don', label: 'Don' },
  { value: 'autre', label: 'Autre' },
];

export const REPRODUCTION_STATUS_OPTIONS = [
  { value: 'non_reproductrice', label: 'Non reproductrice' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_gestation', label: 'En gestation' },
  { value: 'mise_bas_proche', label: 'Mise bas proche' },
  { value: 'a_reposer', label: 'A reposer' },
  { value: 'infertile', label: 'Infertile' },
  { value: 'inconnu', label: 'Inconnu' },
];

export const acquisitionLabel = (value) =>
  ACQUISITION_OPTIONS.find((option) => option.value === value)?.label || 'Achat';

export const reproductionStatusLabel = (value) =>
  REPRODUCTION_STATUS_OPTIONS.find((option) => option.value === value)?.label || 'Inconnu';

export const getAnimalBirthDate = (animal = {}) =>
  animal.date_naissance || animal.naissance || '';

export const calculateAge = (dateValue) => {
  if (!dateValue) return { years: 0, months: 0, days: 0, label: '-' };
  const birth = new Date(dateValue);
  if (Number.isNaN(birth.getTime())) return { years: 0, months: 0, days: 0, label: '-' };

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += previousMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const chunks = [];
  if (years > 0) chunks.push(`${years} an${years > 1 ? 's' : ''}`);
  if (months > 0) chunks.push(`${months} mois`);
  if (!chunks.length) chunks.push(`${Math.max(days, 0)} jour${days > 1 ? 's' : ''}`);

  return { years, months, days, label: chunks.join(' ') };
};

export const getAnimalDisplayName = (animal = {}) =>
  [animal.id, animal.name].filter(Boolean).join(' - ') || '-';

export const findAnimalById = (animals = [], id) =>
  animals.find((animal) => animal.id === id || animal.tag === id) || null;

export const getParentLabel = (animals = [], id) => {
  const parent = findAnimalById(animals, id);
  return parent ? getAnimalDisplayName(parent) : id || 'Inconnu';
};

export const getReproductionAlerts = (animal = {}) => {
  if (animal.sexe !== 'F') return [];

  const alerts = [];
  const dueDate = animal.date_prevue_mise_bas ? new Date(animal.date_prevue_mise_bas) : null;

  if (animal.en_gestation && dueDate && !Number.isNaN(dueDate.getTime())) {
    const days = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
    if (days < 0) {
      alerts.push({
        id: `${animal.id}-gestation-depassee`,
        severity: 'danger',
        title: `Gestation depassee : ${animal.id}`,
        message: `Verifier ${animal.name || animal.id}. La mise bas etait prevue il y a ${Math.abs(days)} jour(s).`,
      });
    } else if (days <= 14) {
      alerts.push({
        id: `${animal.id}-mise-bas-proche`,
        severity: 'warning',
        title: `Mise bas proche : ${animal.id}`,
        message: `${animal.name || animal.id} est prevue dans ${days} jour(s). Preparer box propre, eau et surveillance.`,
      });
    }
  }

  if (!animal.en_gestation && ['disponible', 'inconnu', undefined, null, ''].includes(animal.statut_reproduction) && ['actif', 'sain'].includes(animal.status || 'actif')) {
    alerts.push({
      id: `${animal.id}-reproduction-planifier`,
      severity: 'info',
      title: `Reproduction a planifier : ${animal.id}`,
      message: `${animal.name || animal.id} peut etre evaluee pour reproduction si son etat de sante le permet.`,
    });
  }

  return alerts;
};

export const getAcquisitionTraceStep = (animal = {}, animals = []) => {
  const mode = animal.mode_acquisition || 'achat';
  const date =
    mode === 'achat'
      ? animal.date_achat || animal.date_entree_ferme || getAnimalBirthDate(animal) || new Date().toISOString().slice(0, 10)
      : getAnimalBirthDate(animal) || animal.date_entree_ferme || new Date().toISOString().slice(0, 10);
  const mother = getParentLabel(animals, animal.mere_id);
  const father = getParentLabel(animals, animal.pere_id || animal.male_reproducteur_id);

  if (mode === 'naissance_ferme') {
    return {
      etape: 'Naissance',
      event_type: 'naissance',
      titre: 'Naissance sur la ferme',
      date,
      detail: `Animal ne sur la ferme${animal.mere_id ? ` - mere: ${mother}` : ''}${animal.pere_id ? ` - pere: ${father}` : ''}`,
      description: 'Animal ne sur la ferme',
      ok: true,
    };
  }

  if (mode === 'reproduction_interne') {
    return {
      etape: 'Reproduction',
      event_type: 'reproduction',
      titre: 'Naissance issue de reproduction interne',
      date,
      detail: `Animal issu de reproduction interne${animal.mere_id ? ` - mere: ${mother}` : ''}${animal.pere_id ? ` - pere: ${father}` : ''}`,
      description: 'Animal issu de la reproduction interne de la ferme',
      ok: true,
    };
  }

  if (mode === 'don') {
    return {
      etape: 'Acquisition',
      event_type: 'acquisition',
      titre: 'Acquisition par don',
      date,
      detail: `Don recu${animal.fournisseur_vendeur ? ` - origine: ${animal.fournisseur_vendeur}` : ''}`,
      description: 'Animal entre dans la ferme par don',
      ok: true,
    };
  }

  if (mode === 'autre') {
    return {
      etape: 'Acquisition',
      event_type: 'acquisition',
      titre: 'Acquisition autre',
      date,
      detail: animal.notes_reproduction || 'Origine autre a documenter',
      description: 'Animal entre dans la ferme par une origine autre',
      ok: true,
    };
  }

  return {
    etape: 'Acquisition',
    event_type: 'acquisition',
    titre: 'Acquisition par achat',
    date,
    detail: `Achat ${fmtCurrency(toNumber(animal.purchase_cost))}${animal.fournisseur_vendeur ? ` - vendeur: ${animal.fournisseur_vendeur}` : ''}`,
    description: 'Achat de l animal aupres du fournisseur / vendeur',
    ok: true,
  };
};

export const getGestationTraceStep = (animal = {}, animals = []) => ({
  etape: 'Gestation',
  event_type: 'gestation',
  titre: 'Debut gestation',
  date: animal.date_debut_gestation || new Date().toISOString().slice(0, 10),
  detail: `Femelle declaree en gestation${animal.date_prevue_mise_bas ? ` - mise bas prevue: ${animal.date_prevue_mise_bas}` : ''}${animal.male_reproducteur_id ? ` - male: ${getParentLabel(animals, animal.male_reproducteur_id)}` : ''}`,
  description: 'Femelle declaree en gestation',
  ok: true,
});

export const enrichAnimalLifecycle = ({ animal = {}, animals = [], metrics = {} }) => {
  const birthDate = getAnimalBirthDate(animal);
  const mother = getParentLabel(animals, animal.mere_id);
  const father = getParentLabel(animals, animal.pere_id);
  const breeder = getParentLabel(animals, animal.male_reproducteur_id);

  return {
    ...animal,
    age_calcule: calculateAge(birthDate).label,
    mode_acquisition_label: acquisitionLabel(animal.mode_acquisition || 'achat'),
    mere: mother,
    pere: father,
    en_gestation_label: animal.sexe === 'F' ? (animal.en_gestation ? 'Oui' : 'Non') : 'Non applicable',
    male_reproducteur: animal.sexe === 'F' ? breeder : 'Non applicable',
    statut_reproduction_label: animal.sexe === 'F' ? reproductionStatusLabel(animal.statut_reproduction) : 'Non applicable',
    cout_total_calcule: metrics.totalCost,
    alimentation_calculee: metrics.feedingCost,
    marge_calculee: metrics.margin ?? 'En cours',
  };
};
