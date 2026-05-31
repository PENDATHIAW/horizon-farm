import { runErpHealthEngine } from '../../services/erpHealthEngine.js';
import { fmtCurrency } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.cout ?? r.cost);
const isRisk = (r = {}) => ['panne', 'maintenance', 'hors_service', 'offline', 'hors_ligne'].includes(low(r.status || r.statut || r.etat)) || r.online === false;
const isActivePerson = (r = {}) => ['actif', 'active'].includes(low(r.statut || r.status));
const eqLabel = (r = {}) => r.nom || r.name || r.libelle || r.id || 'Équipement';
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);

export function buildRhHealthSnapshot({ team = [], equipment = [], transactions = [], tasks = [], alertes = [] }) {
  const data = { equipements: equipment, taches: tasks, tasks, alertes_center: alertes, alertes, finances: transactions, rh: team };
  const health = runErpHealthEngine(data);
  return {
    score: health.score,
    findings: health.findings.filter((f) => f.module === 'rh' || f.module === 'equipements' || f.module === 'activite_suivi'),
    predictions: health.predictions.filter((p) => p.module === 'rh' || p.module === 'equipements'),
    risks: health.risks.filter((r) => r.module === 'rh' || r.domain === 'fournisseur'),
  };
}

export function buildRhCoherenceRows(team = [], equipment = [], transactions = [], tasks = [], documents = []) {
  const rows = [];

  arr(equipment).filter(isRisk).forEach((eq) => {
    const name = eqLabel(eq);
    const hasTask = arr(tasks).some((t) => isOpenTask(t) && (String(t.equipment_id) === String(eq.id) || low(t.title).includes(low(name))));
    if (!hasTask) {
      rows.push({
        id: `maint-${eq.id}`,
        equipmentId: eq.id,
        type: 'maintenance',
        title: `Maintenance requise : ${name}`,
        detail: eq.status || eq.statut || eq.etat || 'Hors service',
        finding: {
          id: `rh-maint-${eq.id}`,
          module: 'rh',
          severity: 'haute',
          auto_action: 'create_task',
          title: `Maintenance équipement : ${name}`,
          description: `Statut : ${eq.status || eq.statut || 'à vérifier'}`,
          recommended_action: 'Planifier maintenance ou réparation',
          confidence_score: 0.9,
          equipment_id: eq.id,
        },
      });
    }
  });

  arr(team).filter(isActivePerson).forEach((person) => {
    const mods = arr(person.modules);
    if (!mods.length) {
      rows.push({
        id: `person-mod-${person.id}`,
        personId: person.id,
        type: 'affectation',
        title: `${person.nom || person.name || person.id} sans modules`,
        detail: person.role || person.fonction || 'Membre actif',
        finding: {
          id: `rh-no-modules-${person.id}`,
          module: 'rh',
          severity: 'moyenne',
          auto_action: 'create_task',
          title: `Affectation incomplète : ${person.nom || person.id}`,
          description: 'Aucun module métier assigné',
          recommended_action: 'Compléter affectation équipe',
          confidence_score: 0.84,
        },
      });
    }
  });

  arr(transactions).filter((trx) => /equipement|maintenance|rh|salaire|personnel|ressource/.test(low(`${trx.categorie || ''} ${trx.libelle || ''} ${trx.type || ''}`))).forEach((trx) => {
    const val = amount(trx);
    const linkedDoc = arr(documents).some((d) => String(d.transaction_id || d.source_record_id) === String(trx.id));
    if (val > 0 && !hasProof(trx) && !linkedDoc) {
      rows.push({
        id: `rh-cost-${trx.id}`,
        trxId: trx.id,
        type: 'preuve',
        title: `Charge RH sans preuve : ${trx.libelle || trx.id}`,
        detail: fmtCurrency(val),
        value: val,
        finding: {
          id: `rh-no-proof-${trx.id}`,
          module: 'rh',
          severity: 'moyenne',
          auto_action: 'create_task',
          title: `Justificatif RH manquant : ${trx.libelle || trx.id}`,
          description: `${val} FCFA sans document`,
          recommended_action: 'Joindre facture ou fiche de paie',
          confidence_score: 0.86,
        },
      });
    }
  });

  return rows.sort((a, b) => (b.value || 0) - (a.value || 0));
}

function isOpenTask(t = {}) {
  return !['termine', 'terminé', 'done', 'closed', 'resolu', 'résolu'].includes(low(t.status || t.statut));
}

export function aggregateMaintenanceQueue(equipment = [], tasks = []) {
  return arr(equipment)
    .filter(isRisk)
    .map((eq) => ({
      id: eq.id,
      name: eqLabel(eq),
      status: eq.status || eq.statut || eq.etat || '—',
      hasTask: arr(tasks).some((t) => isOpenTask(t) && (String(t.equipment_id) === String(eq.id) || low(t.title).includes(low(eqLabel(eq))))),
    }))
    .filter((row) => !row.hasTask);
}

export function computePayrollSummary(team = []) {
  return arr(team).filter(isActivePerson).reduce(
    (acc, p) => {
      const salaire = n(p.salaire_mensuel);
      const prime = n(p.prime_mensuelle);
      const avance = n(p.avance_mois);
      return {
        headcount: acc.headcount + 1,
        gross: acc.gross + salaire + prime,
        net: acc.net + Math.max(0, salaire + prime - avance),
        advances: acc.advances + avance,
      };
    },
    { headcount: 0, gross: 0, net: 0, advances: 0 },
  );
}
