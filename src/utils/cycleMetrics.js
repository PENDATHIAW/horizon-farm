/**
 * Cycles V1 — KPI, alertes panel, export investisseur.
 * Pas d'entité cycle : projections J+40 / J+90 / J+510.
 */

import { buildCalculatedCycleDates } from '../services/productionCycleDates.js';
import { aggregateSummaryLayingRate } from './elevageLayingRate.js';
import { buildCycleOverview, daysUntil } from '../modules/elevage/cycleSummary.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const dueSoonOrLate = (date = '') => date && date <= addDays(2);
const normalizeReferenceDate = (value) => {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};
const dateKey = (value) => normalizeReferenceDate(value).toISOString().slice(0, 10);
const addDaysFrom = (value, days) => {
  const date = normalizeReferenceDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const isResolved = (row = {}) => ['resolue', 'résolue', 'cloturee', 'clôturée', 'terminee', 'terminée', 'fermee', 'fermée', 'ok', 'traitee', 'traitée'].includes(norm(row.status || row.statut || row.etat));

const TYPE_LABEL = {
  chair: 'Chair',
  bovins: 'Bovin',
  pondeuses: 'Pondeuses',
};

/** Synthèse blocages lancement (BFR + vide sanitaire) — sans nouveau moteur IA. */
export function summarizeLaunchBlocks(strategicPlan = {}) {
  const bfr = strategicPlan.bfr || {};
  const sanitary = arr(strategicPlan.sanitary).filter((row) => row.blocking);
  const messages = [];
  if (bfr.blocked) messages.push(bfr.message || 'Trésorerie insuffisante pour lancer une bande.');
  sanitary.forEach((row) => messages.push(row.message || row.title || 'Vide sanitaire bloquant'));
  const count = (bfr.blocked ? 1 : 0) + sanitary.length;
  return {
    count,
    blocked: count > 0,
    label: count > 0 ? `${count} blocage(s)` : 'Aucun',
    messages,
  };
}

export function buildCycleV1Kpis({
  lots = [],
  animaux = [],
  productionLogs = [],
  dataMap = {},
  strategicPlan = {},
} = {}) {
  const overview = buildCycleOverview({ lots, animaux, productionLogs, dataMap });
  const laying = aggregateSummaryLayingRate(overview.layers, productionLogs, 7);
  const launch = summarizeLaunchBlocks(strategicPlan);

  const upcoming = arr(overview.cycles.all)
    .filter((row) => row.targetDate && row.targetDate >= today())
    .sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate)));
  const next = upcoming[0];
  const nextExitLabel = next
    ? `${TYPE_LABEL[next.type] || next.type || 'Cycle'} · ${next.label || next.id}`
    : '—';
  const nextExitDate = next?.targetDate || overview.nextTarget || '—';

  return {
    dueSoonCount: overview.dueSoonCount,
    lateCount: overview.lateCount,
    nextExitLabel,
    nextExitDate,
    activeLotsCount: overview.activeLots.length,
    layingRateLabel: laying.label,
    layingRateCalculable: laying.calculable,
    launchBlockLabel: launch.label,
    launchBlockCount: launch.count,
    launchBlocked: launch.blocked,
    overview,
    laying,
    launch,
  };
}

function buildInMemoryCycleAlerts({ lots = [], animaux = [] } = {}) {
  const alerts = [];
  const cycles = buildCalculatedCycleDates({ lots, animaux });
  const push = (alert) => alerts.push(alert);

  arr(cycles.chairSales).forEach((row) => {
    if (!dueSoonOrLate(row.targetDate)) return;
    push({
      id: `auto-j2-chair-${row.id}`,
      title: `Lot chair prêt à vendre : ${row.label}`,
      message: `Date calculée J+40 : ${row.targetDate}.`,
      module_source: 'avicole',
      entity_type: 'lot_avicole',
      entity_id: row.id,
      severity: row.targetDate < today() ? 'critique' : 'warning',
      isAuto: true,
    });
  });
  arr(cycles.bovinSales).forEach((row) => {
    if (!dueSoonOrLate(row.targetDate)) return;
    push({
      id: `auto-j2-bovin-${row.id}`,
      title: `Bovin prêt à vendre : ${row.label}`,
      message: `Date calculée J+90 : ${row.targetDate}.`,
      module_source: 'animaux',
      entity_type: 'animal',
      entity_id: row.id,
      severity: row.targetDate < today() ? 'critique' : 'warning',
      isAuto: true,
    });
  });
  arr(cycles.layerReform).forEach((row) => {
    if (!dueSoonOrLate(row.targetDate)) return;
    push({
      id: `auto-j2-pondeuse-${row.id}`,
      title: `Pondeuses à surveiller : ${row.label}`,
      message: `Renouvellement à décider à partir du ${row.targetDate}.`,
      module_source: 'avicole',
      entity_type: 'lot_avicole',
      entity_id: row.id,
      severity: 'warning',
      isAuto: true,
    });
  });
  return alerts;
}

export function isCycleRelatedAlert(alert = {}, cycleEntityIds = new Set()) {
  const id = String(alert.id || alert.dedupe_key || alert.alert_dedupe_key || '');
  if (/auto-j2-(chair|bovin|pondeuse)/.test(id)) return true;
  const title = String(alert.title || '').toLowerCase();
  if (/prêt à vendre|pret a vendre|pondeuses à surveiller|cycle|j\+40|j\+90/.test(title)) return true;
  const entityId = String(alert.entity_id || '');
  if (entityId && cycleEntityIds.has(entityId)) return true;
  return false;
}

/** Alertes cycles pour l'onglet — alignées AlertesCenter, sans dupliquer le module Alertes. */
export function buildCycleAlertsForPanel({
  lots = [],
  animaux = [],
  alertes = [],
  includeResolved = false,
} = {}) {
  const cycles = buildCalculatedCycleDates({ lots, animaux });
  const cycleEntityIds = new Set(cycles.all.map((row) => String(row.id)));

  const stored = arr(alertes).filter((alert) => {
    if (!includeResolved && isResolved(alert)) return false;
    return isCycleRelatedAlert(alert, cycleEntityIds);
  });

  const memory = buildInMemoryCycleAlerts({ lots, animaux });
  const seen = new Set(stored.map((a) => String(a.id || a.dedupe_key || '')));
  const merged = [...stored];
  memory.forEach((alert) => {
    const key = String(alert.id);
    if (!seen.has(key)) merged.push(alert);
  });

  return merged.sort((a, b) => {
    const sev = (row) => row.severity === 'critique' ? 0 : 1;
    return sev(a) - sev(b) || String(a.title).localeCompare(String(b.title));
  });
}

/** Pipeline cycles pour export investisseur. */
export function buildCycleInvestorPipeline({ lots = [], animaux = [], horizonDays = 90, referenceDate } = {}) {
  const start = dateKey(referenceDate);
  const end = addDaysFrom(referenceDate, horizonDays);
  const cycles = buildCalculatedCycleDates({ lots, animaux });
  const pipeline = arr(cycles.all)
    .filter((row) => row.targetDate && row.targetDate >= start && row.targetDate <= end)
    .sort((a, b) => String(a.targetDate).localeCompare(String(b.targetDate)))
    .map((row) => ({
      label: row.label || row.id,
      type: TYPE_LABEL[row.type] || row.type,
      startDate: row.startDate,
      targetDate: row.targetDate,
      quantity: row.quantity,
      cycleDays: row.cycleDays,
      daysUntil: referenceDate
        ? Math.ceil((new Date(row.targetDate).getTime() - normalizeReferenceDate(referenceDate).getTime()) / 86400000)
        : daysUntil(row.targetDate),
    }));

  const upcomingExits = pipeline.slice(0, 8);

  return {
    pipeline,
    upcomingExits,
    horizonDays,
    totalUpcoming: pipeline.length,
    lateCount: arr(cycles.all).filter((row) => row.targetDate && row.targetDate < start).length,
  };
}
