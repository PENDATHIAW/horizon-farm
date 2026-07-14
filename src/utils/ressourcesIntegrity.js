/**
 * Écarts chantier 6 - maintenance, smart farm, paie RH.
 */

import { toNumber } from './format.js';
import {
  findOpenEquipmentAlert,
  findOpenEquipmentTask,
} from './equipmentWorkflows.js';
import { smartFarmActionKey } from './smartFarmWorkflows.js';
import { buildRessourcesIssueKey, RESSOURCES_DOMAINS } from './ressourcesWorkflow.js';
import { financeIds } from './sideEffectIds.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);

const isClosed = (row = {}) => ['termine', 'terminé', 'resolue', 'résolue', 'done', 'closed'].includes(lower(row.status || row.statut));

export function buildRessourcesGapRows({
  equipment = [],
  tasks = [],
  alertes = [],
  transactions = [],
  documents = [],
  sensors = [],
  cameras = [],
  people = [],
  businessEvents = [],
} = {}) {
  const gaps = [];
  const push = (row) => gaps.push({ severity: 'warning', ...row });

  arr(equipment).filter((eq) => ['panne', 'hors_service'].includes(lower(eq.status || eq.statut))).forEach((eq) => {
    const task = findOpenEquipmentTask(eq, tasks);
    if (!task) {
      push({
        issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.MAINTENANCE, eq.id, 'panne_sans_tache'),
        title: 'Équipement en panne sans tâche',
        detail: `${eq.nom || eq.name || eq.id} : aucune tâche maintenance ouverte.`,
        repair: 'maintenance_task',
        record_id: eq.id,
      });
    }
  });

  arr(transactions).forEach((trx) => {
    const isMaint = lower(trx.categorie || '').includes('maintenance')
      || lower(trx.libelle || '').includes('maintenance')
      || lower(trx.module_lie || '') === 'equipements';
    const eqId = clean(trx.related_id || trx.source_record_id);
    if (isMaint && num(trx.montant ?? trx.amount) > 0 && eqId && !arr(equipment).some((e) => clean(e.id) === eqId)) {
      push({
        issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.MAINTENANCE, trx.id, 'charge_orpheline'),
        title: 'Charge maintenance sans équipement',
        detail: `Transaction ${trx.id} sans fiche équipement ${eqId}.`,
        repair: 'expense_link',
        record_id: trx.id,
      });
    }
  });

  arr(equipment).forEach((eq) => {
    const eqId = clean(eq.id);
    const openAlert = findOpenEquipmentAlert(eq, alertes);
    const maintDone = ['termine', 'operationnel'].includes(lower(eq.maintenance_status || ''))
      || ['operationnel'].includes(lower(eq.status || eq.statut));
    if (maintDone && openAlert) {
      push({
        issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.MAINTENANCE, eqId, 'alerte_ouverte'),
        title: 'Maintenance faite mais alerte ouverte',
        detail: `${eq.nom || eqId} : clôturer l'alerte liée.`,
        repair: 'close_alert',
        record_id: eqId,
        alert_id: openAlert.id,
      });
    }

    const repairTrx = arr(transactions).find(
      (t) => clean(t.related_id) === eqId && num(t.montant ?? t.amount) > 0
        && (lower(t.categorie || '').includes('réparation') || lower(t.categorie || '').includes('maintenance')),
    );
    if (repairTrx && !arr(documents).some((d) => clean(d.transaction_id) === clean(repairTrx.id) || clean(d.related_id) === eqId)) {
      push({
        issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.MAINTENANCE, eqId, 'sans_document'),
        title: 'Facture réparation sans document lié',
        detail: `${eq.nom || eqId} : joindre la preuve pour ${repairTrx.id}.`,
        repair: 'attach_document',
        record_id: eqId,
        transaction_id: repairTrx.id,
      });
    }
  });

  const deviceList = [
    ...arr(sensors).map((d) => ({ ...d, kind: 'capteur' })),
    ...arr(cameras).map((d) => ({ ...d, kind: 'camera' })),
  ];

  const offlineEvents = arr(businessEvents).filter((e) =>
    /smartfarm|offline|capteur|camera/i.test(`${e.event_type || ''} ${e.module_source || ''}`));

  deviceList.forEach((device) => {
    const key = smartFarmActionKey(device, device.kind);
    const offlineCount = offlineEvents.filter(
      (e) => clean(e.entity_id) === clean(device.id) && !isClosed(e),
    ).length;
    if (offlineCount > 1) {
      push({
        issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.SMARTFARM, device.id, 'doublon'),
        title: 'Capteur offline répété',
        detail: `${device.nom || device.id} : ${offlineCount} signalements actifs.`,
        repair: 'dedupe_smartfarm',
        record_id: device.id,
      });
    }

    const isOffline = ['offline', 'hors_ligne', 'alerte', 'panne'].includes(lower(device.status || device.statut))
      || device.online === false;
    const strategic = device.strategic === true || device.critique === true;
    if (isOffline && strategic) {
      const hasAlert = arr(alertes).some(
        (a) => !isClosed(a) && clean(a.alert_dedupe_key || a.action_key) === key,
      );
      if (!hasAlert) {
        push({
          issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.SMARTFARM, device.id, 'sans_alerte'),
          title: 'Capteur critique sans alerte',
          detail: `${device.nom || device.id} offline sans alerte Smart Farm.`,
          repair: 'smartfarm_alert',
          record_id: device.id,
        });
      }
    }

    if (isOffline && !clean(device.equipment_id || device.linked_equipment_id) && !clean(device.zone)) {
      push({
        issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.SMARTFARM, device.id, 'sans_lien'),
        title: 'Capteur lié à aucun équipement/zone',
        detail: `${device.nom || device.id} : renseigner zone ou équipement.`,
        repair: 'link_equipment',
        record_id: device.id,
      });
    }
  });

  arr(people).filter((p) => ['actif', 'active'].includes(lower(p.statut || ''))).forEach((person) => {
    const period = new Date().toISOString().slice(0, 7);
    const trxId = financeIds.rhPayroll(person.id, period);
    const hasPay = arr(transactions).some((t) => clean(t.id) === clean(trxId));
    if (!hasPay && num(person.salaire_mensuel) > 0) {
      push({
        issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.PAYROLL, person.id, 'sans_paie'),
        title: 'Employé actif sans paie prévue',
        detail: `${person.nom || person.id} : paie ${period} non enregistrée.`,
        repair: 'payroll',
        record_id: person.id,
      });
    }
  });

  arr(transactions).forEach((trx) => {
    const isSalary = lower(trx.categorie || '').includes('rémunération')
      || lower(trx.categorie || '').includes('remuneration')
      || lower(trx.module_lie || '') === 'rh';
    const personId = clean(trx.related_id || trx.source_record_id);
    if (isSalary && num(trx.montant ?? trx.amount) > 0) {
      if (personId && !arr(people).some((p) => clean(p.id) === personId)) {
        push({
          issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.PAYROLL, trx.id, 'sans_personne'),
          title: 'Salaire finance sans personne liée',
          detail: `Transaction ${trx.id} → personne ${personId} introuvable.`,
          repair: 'payroll_link',
          record_id: trx.id,
        });
      }
      const hasDoc = arr(documents).some(
        (d) => clean(d.transaction_id) === clean(trx.id) || clean(d.finance_id) === clean(trx.id),
      );
      if (!hasDoc && !trx.proof_document_id) {
        push({
          issue_key: buildRessourcesIssueKey(RESSOURCES_DOMAINS.PAYROLL, trx.id, 'sans_document'),
          title: 'Paie sans document',
          detail: `Paie ${trx.id} : reçu ou contrat manquant.`,
          repair: 'payroll_document',
          record_id: trx.id,
        });
      }
    }
  });

  return gaps;
}
