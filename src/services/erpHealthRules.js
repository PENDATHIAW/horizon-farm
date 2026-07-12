import { computeErpAuditFindings } from './erpRules/index.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const isOpen = (r = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu', 'traitee', 'traitée'].includes(low(r.status || r.statut || r.state));
const stockQty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const stockThreshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min);

/** Compteurs d'alertes pour la navigation sidebar. */
export function computeNavAlertCounts(crudRows = {}) {
  const rows = (key) => arr(crudRows[key]);
  const vaccinsRetard = rows('sante').filter((v) => v.statut === 'retard').length;
  const stocksCritiques = rows('stock').filter((s) => stockQty(s) <= stockThreshold(s) && stockThreshold(s) > 0).length;
  const animauxMalades = rows('animaux').filter((a) => a.health_status === 'malade').length;
  const culturesRisque = rows('cultures').filter((x) => n(x.score_sante) < 80 || x.statut === 'perdu').length;
  const lotsAlerte = rows('avicole').filter((lot) => n(lot.mortality) > n(lot.initial_count) * 0.04 || n(lot.scoresSante ?? 100) < 88).length;
  const financesAlerte = rows('finances').filter((trx) => ['impaye', 'partiel'].includes(trx.statut)).length;
  const fournisseursAlerte = rows('fournisseurs').filter((f) => n(f.dettes) > 0 || f.statut === 'a_risque').length;
  const equipementsAlerte = rows('equipements').filter((e) => ['panne', 'maintenance', 'hors_service'].includes(e.status)).length;
  const tachesAlerte = rows('taches').filter((t) => t.priority === 'critique' || t.status === 'retard').length;
  const ventesAlerte = rows('sales_orders').filter((order) => !['paye', 'payé', 'termine', 'terminé', 'closed'].includes(low(order.statut || order.status || order.payment_status))).length;
  const activiteSuiviAlerte = tachesAlerte + rows('alertes_center').filter((a) => a.status === 'nouvelle').length;
  const documentsRapportsAlerte = rows('finances').filter((trx) => amount(trx) > 0 && !trx.document_id && !trx.proof_url && !trx.justificatif_id).length;
  const achatsStockAlerte = stocksCritiques + fournisseursAlerte;
  const notifs = vaccinsRetard + stocksCritiques + animauxMalades + culturesRisque + lotsAlerte + financesAlerte + fournisseursAlerte + equipementsAlerte + tachesAlerte;

  return {
    vaccinsRetard, stocksCritiques, animauxMalades, culturesRisque, lotsAlerte,
    financesAlerte, fournisseursAlerte, equipementsAlerte, tachesAlerte, ventesAlerte,
    achatsStockAlerte, activiteSuiviAlerte, documentsRapportsAlerte, notifs,
  };
}

/** Badges hasAlert par module de navigation. */
export function navAlertFlags(counts = {}, online = true) {
  return {
    centre_decisionnel: counts.stocksCritiques > 0 || counts.lotsAlerte > 0 || counts.financesAlerte > 0 || counts.culturesRisque > 0,
    objectifs_croissance: counts.financesAlerte > 0 || counts.lotsAlerte > 0 || counts.culturesRisque > 0,
    elevage: counts.vaccinsRetard > 0 || counts.animauxMalades > 0 || counts.lotsAlerte > 0,
    commercial: counts.ventesAlerte > 0,
    achats_stock: counts.achatsStockAlerte > 0,
    finance_pilotage: counts.financesAlerte > 0,
    activite_suivi: counts.activiteSuiviAlerte > 0,
    documents_rapports: counts.documentsRapportsAlerte > 0,
    impact_business: counts.vaccinsRetard > 0 || counts.stocksCritiques > 0 || counts.animauxMalades > 0 || counts.lotsAlerte > 0,
    cultures: counts.culturesRisque > 0,
    gestion_systeme: !online,
  };
}

/** Score santé global ERP 0–100. */
export function computeGlobalHealthScore(data = {}) {
  const findings = computeErpAuditFindings(data);
  const critical = findings.filter((f) => f.severity === 'critique' || f.severity === 'haute').length;
  const total = Math.max(findings.length, 1);
  return Math.max(0, Math.round(100 - (critical / total) * 100));
}

export { computeErpAuditFindings, isOpen };
