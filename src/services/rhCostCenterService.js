import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const active = (p = {}) => ['actif', 'active', 'en_poste'].includes(lower(p.statut || p.status || 'actif'));

export function payrollOf(person = {}) {
  const salaire = toNumber(person.salaire_mensuel ?? person.salaire ?? person.base_salary);
  const prime = toNumber(person.prime_mensuelle ?? person.prime ?? person.bonus);
  const avance = toNumber(person.avance_mois ?? person.avance ?? person.advance);
  const brut = salaire + prime;
  const net = Math.max(0, brut - avance);
  return { salaire, prime, avance, brut, net };
}

export function modulesOf(person = {}, teams = []) {
  const own = Array.isArray(person.modules) ? person.modules.filter(Boolean) : [];
  if (own.length) return own;
  const team = arr(teams).find((t) => String(t.id) === String(person.equipe_id));
  return Array.isArray(team?.modules) && team.modules.length ? team.modules.filter(Boolean) : ['ferme'];
}

export function computeRhCostCenters({ people = [], teams = [], month = '' } = {}) {
  const activePeople = arr(people).filter(active);
  const peopleCosts = activePeople.map((person) => {
    const payroll = payrollOf(person);
    const modules = modulesOf(person, teams);
    const share = modules.length ? payroll.net / modules.length : payroll.net;
    return { person, payroll, modules, share };
  });

  const byModuleMap = new Map();
  const byTeamMap = new Map();
  peopleCosts.forEach((item) => {
    item.modules.forEach((module) => {
      const current = byModuleMap.get(module) || { module, people: 0, net: 0, brut: 0, avance: 0 };
      current.people += 1;
      current.net += item.share;
      current.brut += item.payroll.brut / Math.max(1, item.modules.length);
      current.avance += item.payroll.avance / Math.max(1, item.modules.length);
      byModuleMap.set(module, current);
    });
    const teamId = item.person.equipe_id || 'TEAM-NON-AFFECTEE';
    const team = arr(teams).find((t) => String(t.id) === String(teamId));
    const current = byTeamMap.get(teamId) || { id: teamId, name: team?.name || team?.nom || teamId, people: 0, net: 0, brut: 0, avance: 0, modules: new Set() };
    current.people += 1;
    current.net += item.payroll.net;
    current.brut += item.payroll.brut;
    current.avance += item.payroll.avance;
    item.modules.forEach((m) => current.modules.add(m));
    byTeamMap.set(teamId, current);
  });

  const byModule = Array.from(byModuleMap.values()).map((row) => ({ ...row, cout_mensuel: row.net, cout_annuel: row.net * 12 }));
  const byTeam = Array.from(byTeamMap.values()).map((row) => ({ ...row, modules: Array.from(row.modules), cout_mensuel: row.net, cout_annuel: row.net * 12 }));
  const totals = peopleCosts.reduce((acc, item) => ({ brut: acc.brut + item.payroll.brut, avance: acc.avance + item.payroll.avance, net: acc.net + item.payroll.net }), { brut: 0, avance: 0, net: 0 });
  return { month, peopleCosts, byModule, byTeam, totals, activeCount: activePeople.length };
}

export function buildRhFinancePayload({ person = {}, payment = {}, amount = 0, date = '', id = '' } = {}) {
  const modules = Array.isArray(person.modules) && person.modules.length ? person.modules : ['rh'];
  return {
    id,
    type: 'sortie',
    libelle: `Rémunération ${person.nom || person.id}`,
    montant: toNumber(amount),
    date,
    categorie: 'Rémunérations',
    module_lie: 'rh',
    related_id: person.id,
    source_module: 'equipe',
    source_record_id: person.id,
    statut: 'paye',
    equipe_id: person.equipe_id || '',
    modules_affectes: modules.join(','),
    cout_rh_modules: JSON.stringify(modules.map((module) => ({ module, montant: toNumber(amount) / Math.max(1, modules.length) }))),
    payroll_period: payment.period || date?.slice(0, 7),
  };
}

export function analyzeRhQuality({ people = [], teams = [], payments = [] } = {}) {
  const teamIds = new Set(arr(teams).map((t) => String(t.id)));
  const issues = [];
  arr(people).forEach((person) => {
    const payroll = payrollOf(person);
    const modules = modulesOf(person, teams);
    if (!String(person.nom || '').trim()) issues.push({ id: person.id, type: 'Nom manquant', person });
    if (!person.equipe_id || !teamIds.has(String(person.equipe_id))) issues.push({ id: person.id, type: 'Équipe manquante', person });
    if (!modules.length) issues.push({ id: person.id, type: 'Module non affecté', person });
    if (active(person) && payroll.brut <= 0) issues.push({ id: person.id, type: 'Rémunération non définie', person });
  });
  arr(teams).forEach((team) => {
    const members = arr(people).filter((p) => String(p.equipe_id) === String(team.id));
    if (!members.length) issues.push({ id: team.id, type: 'Équipe sans membre', team });
    if (!Array.isArray(team.modules) || !team.modules.length) issues.push({ id: team.id, type: 'Équipe sans module', team });
  });
  return { issues, issueCount: issues.length };
}
