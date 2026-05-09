export const RH_STORAGE_KEY = 'horizon_farm_rh_directory_v1';

export const RH_ROLES = [
  'Propriétaire',
  'Chef de projet',
  'Admin principal',
  'Responsable ferme',
  'Responsable avicole',
  'Responsable cultures',
  'Responsable stock',
  'Commercial',
  'Comptable',
  'Vétérinaire',
  'Ouvrier ferme',
  'Ramasseur œufs',
  'Chauffeur livraison',
  'Prestataire externe',
];

export const RH_TEAMS = [
  { id: 'TEAM-FERME', name: 'Équipe ferme', type: 'operationnelle', modules: ['avicole', 'animaux', 'stock', 'cultures'] },
  { id: 'TEAM-AVICOLE', name: 'Équipe avicole', type: 'operationnelle', modules: ['avicole', 'sante', 'stock'] },
  { id: 'TEAM-CULTURES', name: 'Équipe cultures', type: 'operationnelle', modules: ['cultures', 'stock'] },
  { id: 'TEAM-STOCK', name: 'Équipe stock', type: 'operationnelle', modules: ['stock', 'fournisseurs'] },
  { id: 'TEAM-COMMERCIAL', name: 'Équipe commerciale', type: 'commerciale', modules: ['ventes', 'clients'] },
  { id: 'TEAM-MAINTENANCE', name: 'Équipe maintenance', type: 'technique', modules: ['equipements', 'smartfarm'] },
];

export const RH_DEFAULT_PEOPLE = [
  {
    id: 'RH-PENDA',
    nom: 'Penda Thiaw',
    role: 'Propriétaire',
    fonction: 'Chef de projet',
    access_level: 'admin_principal',
    statut: 'actif',
    equipe_id: 'TEAM-FERME',
    modules: ['dashboard', 'avicole', 'animaux', 'cultures', 'stock', 'ventes', 'clients', 'finances', 'rapports'],
    phone: '',
    whatsapp: '',
    email: '',
    date_entree: new Date().toISOString().slice(0, 10),
    notes: 'Compte propriétaire et pilotage du chantier Horizon Farm.',
  },
];

export function getRhDirectory() {
  if (typeof window === 'undefined') return { people: RH_DEFAULT_PEOPLE, teams: RH_TEAMS };
  try {
    const raw = window.localStorage.getItem(RH_STORAGE_KEY);
    if (!raw) return { people: RH_DEFAULT_PEOPLE, teams: RH_TEAMS };
    const parsed = JSON.parse(raw);
    return {
      people: Array.isArray(parsed.people) && parsed.people.length ? parsed.people : RH_DEFAULT_PEOPLE,
      teams: Array.isArray(parsed.teams) && parsed.teams.length ? parsed.teams : RH_TEAMS,
    };
  } catch {
    return { people: RH_DEFAULT_PEOPLE, teams: RH_TEAMS };
  }
}

export function saveRhDirectory(directory) {
  if (typeof window === 'undefined') return directory;
  const next = {
    people: Array.isArray(directory.people) ? directory.people : RH_DEFAULT_PEOPLE,
    teams: Array.isArray(directory.teams) ? directory.teams : RH_TEAMS,
    updated_at: new Date().toISOString(),
  };
  window.localStorage.setItem(RH_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('horizon-farm-rh-updated', { detail: next }));
  return next;
}

export function getResponsibleOptions({ includeTeams = true, includePeople = true, moduleKey = '' } = {}) {
  const { people, teams } = getRhDirectory();
  const teamOptions = includeTeams ? teams
    .filter((team) => !moduleKey || !Array.isArray(team.modules) || team.modules.includes(moduleKey))
    .map((team) => ({ value: team.id, label: team.name, type: 'team', record: team })) : [];
  const peopleOptions = includePeople ? people
    .filter((person) => String(person.statut || 'actif').toLowerCase() === 'actif')
    .filter((person) => !moduleKey || !Array.isArray(person.modules) || person.modules.includes(moduleKey) || person.modules.length === 0)
    .map((person) => ({ value: person.id, label: `${person.nom || person.name || person.id} · ${person.role || person.fonction || 'Équipe'}`, type: 'person', record: person })) : [];
  return [...teamOptions, ...peopleOptions];
}

export function resolveResponsibleLabel(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const options = getResponsibleOptions({ moduleKey: '' });
  return options.find((option) => option.value === clean)?.label || clean;
}
