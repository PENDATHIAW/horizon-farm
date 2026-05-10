export const RH_STORAGE_KEY = 'horizon_farm_rh_directory_v1';

export const RH_MODULES = [
  { key: 'dashboard', label: 'Dashboard' }, { key: 'avicole', label: 'Avicole' }, { key: 'animaux', label: 'Animaux' }, { key: 'sante', label: 'Santé & Biosécurité' }, { key: 'cultures', label: 'Cultures' }, { key: 'stock', label: 'Stock' }, { key: 'ventes', label: 'Ventes' }, { key: 'clients', label: 'Clients & WhatsApp' }, { key: 'fournisseurs', label: 'Fournisseurs' }, { key: 'finances', label: 'Finances' }, { key: 'comptabilite', label: 'Comptabilité' }, { key: 'investissements', label: 'Investissements' }, { key: 'documents', label: 'Documents' }, { key: 'taches', label: 'Tâches' }, { key: 'rh', label: 'RH & Équipe' }, { key: 'rapports', label: 'Rapports' }, { key: 'equipements', label: 'Équipements' }, { key: 'smartfarm', label: 'Smart Farm' }, { key: 'audit_logs', label: 'Audit Logs' }, { key: 'sync', label: 'Sync Offline' },
];

export const RH_ROLES = ['Propriétaire', 'Chef de projet', 'Admin principal', 'Responsable ferme', 'Responsable avicole', 'Responsable cultures', 'Responsable stock', 'Commercial', 'Comptable', 'Vétérinaire', 'Ouvrier ferme', 'Ramasseur œufs', 'Chauffeur livraison', 'Prestataire externe', 'Nouveau rôle'];

export const RH_FUNCTIONS_BY_ROLE = {
  'Propriétaire': ['Propriétaire exploitante', 'Directrice générale', 'Fondatrice', 'Investisseuse principale'],
  'Chef de projet': ['Chef de projet ERP', 'Chef de projet ferme', 'Pilote performance', 'Coordinatrice opérations'],
  'Admin principal': ['Administrateur principal', 'Super admin ERP', 'Référent données'],
  'Responsable ferme': ['Responsable exploitation', 'Chef de ferme', 'Coordinateur terrain'],
  'Responsable avicole': ['Chef avicole', 'Responsable ponte', 'Responsable chair', 'Référent biosécurité avicole'],
  'Responsable cultures': ['Chef cultures', 'Responsable parcelles', 'Référent intrants', 'Responsable récoltes'],
  'Responsable stock': ['Magasinier principal', 'Responsable stock', 'Responsable achats/réceptions'],
  'Commercial': ['Commercial terrain', 'Responsable clients', 'Chargé ventes & WhatsApp', 'Livreur-commercial'],
  'Comptable': ['Comptable', 'Caissier', 'Assistant finance', 'Contrôleur dépenses'],
  'Vétérinaire': ['Vétérinaire référent', 'Technicien santé animale', 'Conseiller biosécurité'],
  'Ouvrier ferme': ['Ouvrier polyvalent', 'Agent alimentation', 'Agent nettoyage', 'Agent surveillance'],
  'Ramasseur œufs': ['Ramasseur œufs', 'Contrôleur ponte', 'Agent tri œufs'],
  'Chauffeur livraison': ['Chauffeur livraison', 'Livreur', 'Coursier ferme'],
  'Prestataire externe': ['Prestataire maintenance', 'Consultant', 'Technicien externe', 'Journalier'],
  'Nouveau rôle': ['Nouvelle fonction'],
};

export const RH_TEAMS = [
  { id: 'TEAM-FERME', name: 'Équipe ferme', type: 'operationnelle', modules: ['avicole', 'animaux', 'stock', 'cultures'] },
  { id: 'TEAM-AVICOLE', name: 'Équipe avicole', type: 'operationnelle', modules: ['avicole', 'sante', 'stock'] },
  { id: 'TEAM-CULTURES', name: 'Équipe cultures', type: 'operationnelle', modules: ['cultures', 'stock'] },
  { id: 'TEAM-STOCK', name: 'Équipe stock', type: 'operationnelle', modules: ['stock', 'fournisseurs'] },
  { id: 'TEAM-COMMERCIAL', name: 'Équipe commerciale', type: 'commerciale', modules: ['ventes', 'clients'] },
  { id: 'TEAM-MAINTENANCE', name: 'Équipe maintenance', type: 'technique', modules: ['equipements', 'smartfarm'] },
];

export const RH_DEFAULT_PEOPLE = [
  { id: 'RH-PENDA', nom: 'Penda Thiaw', role: 'Propriétaire', fonction: 'Propriétaire exploitante', access_level: 'admin_principal', statut: 'actif', equipe_id: 'TEAM-FERME', modules: ['dashboard', 'avicole', 'animaux', 'cultures', 'stock', 'ventes', 'clients', 'finances', 'comptabilite', 'rh', 'rapports'], phone: '', whatsapp: '', email: '', date_entree: new Date().toISOString().slice(0, 10), salaire_mensuel: 0, prime_mensuelle: 0, avance_mois: 0, remuneration: 'Propriétaire: rémunération variable selon trésorerie + prime résultat', notes: 'Compte propriétaire et pilotage du chantier Horizon Farm.' },
  { id: 'RH-DEMO-AVIC', nom: 'Aminata Diop', role: 'Responsable avicole', fonction: 'Responsable chair', access_level: 'responsable', statut: 'actif', equipe_id: 'TEAM-AVICOLE', modules: ['avicole', 'sante', 'stock', 'taches'], phone: '+221771110001', whatsapp: '+221771110001', email: 'aminata.demo@horizonfarm.app', date_entree: '2026-04-01', salaire_mensuel: 120000, prime_mensuelle: 15000, avance_mois: 30000, remuneration: 'Salaire fixe + prime biosécurité/production', notes: 'Donnée RH fictive pour afficher les rémunérations.' },
  { id: 'RH-DEMO-CULT', nom: 'Moussa Fall', role: 'Responsable cultures', fonction: 'Responsable récoltes', access_level: 'responsable', statut: 'actif', equipe_id: 'TEAM-CULTURES', modules: ['cultures', 'stock', 'taches'], phone: '+221771110002', whatsapp: '+221771110002', email: 'moussa.demo@horizonfarm.app', date_entree: '2026-04-05', salaire_mensuel: 95000, prime_mensuelle: 10000, avance_mois: 0, remuneration: 'Salaire fixe + prime récolte', notes: 'Donnée RH fictive.' },
  { id: 'RH-DEMO-STOCK', nom: 'Fatou Ndiaye', role: 'Responsable stock', fonction: 'Magasinier principal', access_level: 'responsable', statut: 'actif', equipe_id: 'TEAM-STOCK', modules: ['stock', 'fournisseurs', 'documents'], phone: '+221771110003', whatsapp: '+221771110003', email: 'fatou.demo@horizonfarm.app', date_entree: '2026-04-10', salaire_mensuel: 85000, prime_mensuelle: 5000, avance_mois: 20000, remuneration: 'Salaire fixe + prime inventaire', notes: 'Donnée RH fictive.' },
  { id: 'RH-DEMO-COMM', nom: 'Ibrahima Sarr', role: 'Commercial', fonction: 'Chargé ventes & WhatsApp', access_level: 'employe', statut: 'actif', equipe_id: 'TEAM-COMMERCIAL', modules: ['ventes', 'clients', 'documents'], phone: '+221771110004', whatsapp: '+221771110004', email: 'ibrahima.demo@horizonfarm.app', date_entree: '2026-04-12', salaire_mensuel: 70000, prime_mensuelle: 20000, avance_mois: 10000, remuneration: 'Fixe + prime encaissement/relance', notes: 'Donnée RH fictive.' },
];

export function getRoleFunctions(role) { return RH_FUNCTIONS_BY_ROLE[role] || RH_FUNCTIONS_BY_ROLE['Nouveau rôle']; }

export function getRhDirectory() {
  if (typeof window === 'undefined') return { people: RH_DEFAULT_PEOPLE, teams: RH_TEAMS };
  try {
    const raw = window.localStorage.getItem(RH_STORAGE_KEY);
    if (!raw) return { people: RH_DEFAULT_PEOPLE, teams: RH_TEAMS };
    const parsed = JSON.parse(raw);
    const people = Array.isArray(parsed.people) && parsed.people.length ? parsed.people : RH_DEFAULT_PEOPLE;
    const mergedPeople = [...people, ...RH_DEFAULT_PEOPLE.filter((demo) => !people.some((p) => p.id === demo.id))];
    return { people: mergedPeople, teams: Array.isArray(parsed.teams) && parsed.teams.length ? parsed.teams : RH_TEAMS };
  } catch {
    return { people: RH_DEFAULT_PEOPLE, teams: RH_TEAMS };
  }
}

export function saveRhDirectory(directory) {
  if (typeof window === 'undefined') return directory;
  const next = { people: Array.isArray(directory.people) ? directory.people : RH_DEFAULT_PEOPLE, teams: Array.isArray(directory.teams) ? directory.teams : RH_TEAMS, updated_at: new Date().toISOString() };
  window.localStorage.setItem(RH_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('horizon-farm-rh-updated', { detail: next }));
  return next;
}

export function getResponsibleOptions({ includeTeams = true, includePeople = true, moduleKey = '' } = {}) {
  const { people, teams } = getRhDirectory();
  const teamOptions = includeTeams ? teams.filter((team) => !moduleKey || !Array.isArray(team.modules) || team.modules.includes(moduleKey)).map((team) => ({ value: team.id, label: team.name, type: 'team', record: team })) : [];
  const peopleOptions = includePeople ? people.filter((person) => String(person.statut || 'actif').toLowerCase() === 'actif').filter((person) => !moduleKey || !Array.isArray(person.modules) || person.modules.includes(moduleKey) || person.modules.length === 0).map((person) => ({ value: person.id, label: `${person.nom || person.name || person.id} · ${person.role || person.fonction || 'Équipe'}`, type: 'person', record: person })) : [];
  return [...teamOptions, ...peopleOptions];
}

export function resolveResponsibleLabel(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  const options = getResponsibleOptions({ moduleKey: '' });
  return options.find((option) => option.value === clean)?.label || clean;
}
