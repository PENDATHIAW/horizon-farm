import { computeErpAuditFindings } from './erpRules/index.js';
import { evaluateModuleDataCoverage } from './moduleDataCoverageAudit.js';
import { issueKeyFromFinding, buildIssueKey } from './issueKey.js';
import { linkedPaymentsForOrders } from '../modules/commercial/commercialMetrics.js';
import { remainingForOrder } from '../utils/salesStatuses.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const CLOSED_ANIMAL = ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'];

function withIssueKey(finding) {
  return { ...finding, issue_key: issueKeyFromFinding(finding) };
}

function extraInterconnectionFindings(data = {}) {
  const findings = [];
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const finances = arr(data.finances || data.transactions);
  const documents = arr(data.documents);
  const animaux = arr(data.animaux);
  const equipements = arr(data.equipements);
  const taches = arr(data.taches);
  const alertes = arr(data.alertes_center || data.alertes);
  const linked = linkedPaymentsForOrders(orders, payments);

  orders.forEach((order) => {
    const paidField = n(order.montant_paye);
    const rest = remainingForOrder(order, linked);
    if (paidField > 0 && rest > 0 && !linked.some((p) => String(p.order_id) === String(order.id))) {
      findings.push(withIssueKey({
        id: `audit-paid-without-payment-${order.id}`,
        module: 'commercial',
        severity: 'haute',
        category: 'interconnexion',
        title: `Vente marquée payée sans paiement lié : ${order.id}`,
        description: 'montant_paye renseigné mais aucune ligne payments',
        recommended_action: 'Créer paiement ou corriger montant_paye',
        source_records: [{ type: 'sales_order', id: order.id }],
      }));
    }
  });

  payments.forEach((payment) => {
    const orderId = payment.order_id || payment.sale_id;
    if (orderId && !orders.some((o) => String(o.id) === String(orderId))) {
      findings.push(withIssueKey({
        id: `audit-payment-orphan-${payment.id}`,
        module: 'commercial',
        severity: 'moyenne',
        category: 'interconnexion',
        title: `Paiement sans vente : ${payment.id}`,
        recommended_action: 'Lier à une commande ou annuler le paiement',
        source_records: [{ type: 'payment', id: payment.id }],
      }));
    }
  });

  animaux.forEach((animal) => {
    const status = low(animal.status || animal.statut);
    const sold = CLOSED_ANIMAL.some((word) => status.includes(word));
    const hasSale = orders.some((o) => String(o.source_id || o.related_id) === String(animal.id));
    if (status.includes('vendu') && !hasSale) {
      findings.push(withIssueKey({
        id: `audit-animal-sold-no-sale-${animal.id}`,
        module: 'elevage',
        severity: 'haute',
        category: 'interconnexion',
        title: `Animal vendu sans vente Commercial : ${animal.nom || animal.name || animal.id}`,
        recommended_action: 'Créer vente liée ou corriger statut animal',
        source_records: [{ type: 'animal', id: animal.id }],
      }));
    }
    if (sold && !status.includes('vendu') && hasSale) {
      findings.push(withIssueKey({
        id: `audit-animal-sale-no-status-${animal.id}`,
        module: 'elevage',
        severity: 'moyenne',
        category: 'interconnexion',
        title: `Vente liée mais animal encore actif : ${animal.id}`,
        recommended_action: 'Mettre à jour statut animal',
        source_records: [{ type: 'animal', id: animal.id }],
      }));
    }
  });

  documents.filter((doc) => !doc.source_module && !doc.source_record_id && !doc.related_id).slice(0, 20).forEach((doc) => {
    findings.push(withIssueKey({
      id: `audit-doc-orphan-${doc.id}`,
      module: 'documents_rapports',
      severity: 'moyenne',
      category: 'document',
      title: `Document orphelin : ${doc.nom || doc.title || doc.id}`,
      recommended_action: 'Lier le document à sa source',
      source_records: [{ type: 'document', id: doc.id }],
    }));
  });

  finances.filter((trx) => amount(trx) > 50000 && !trx.document_id && !trx.proof_url).slice(0, 15).forEach((trx) => {
    findings.push(withIssueKey({
      id: `audit-finance-no-proof-${trx.id}`,
      module: 'finance_pilotage',
      severity: 'moyenne',
      category: 'preuve',
      title: `Transaction sans preuve : ${trx.libelle || trx.id}`,
      recommended_action: 'Joindre justificatif',
      source_records: [{ type: 'finance', id: trx.id }],
    }));
  });

  equipements.filter((eq) => ['panne', 'hors_service', 'critique'].includes(low(eq.status || eq.statut))).forEach((eq) => {
    const hasTask = taches.some((t) => String(t.source_record_id) === String(eq.id) || low(t.title).includes(low(eq.nom || eq.name)));
    if (!hasTask) {
      findings.push(withIssueKey({
        id: `audit-equipment-no-task-${eq.id}`,
        module: 'equipements',
        severity: 'haute',
        category: 'maintenance',
        title: `Équipement en panne sans tâche : ${eq.nom || eq.name || eq.id}`,
        recommended_action: 'Créer tâche maintenance',
        auto_action: 'create_task',
        source_records: [{ type: 'equipement', id: eq.id }],
      }));
    }
  });

  const alertKeys = new Set();
  alertes.forEach((alert) => {
    const key = alert.issue_key || buildIssueKey('alert', alert.module_source, alert.entity_id || alert.id, alert.title);
    if (alertKeys.has(key)) {
      findings.push(withIssueKey({
        id: `audit-alert-duplicate-${alert.id}`,
        module: 'activite_suivi',
        severity: 'basse',
        category: 'dedup',
        title: `Alerte dupliquée : ${alert.title || alert.id}`,
        recommended_action: 'Fusionner ou résoudre les doublons',
        source_records: [{ type: 'alert', id: alert.id }],
      }));
    }
    alertKeys.add(key);
  });

  return findings;
}

/** Audit inter-modules complet — checklist document audit §5.2. */
export function runErpAuditEngine(data = {}) {
  const base = computeErpAuditFindings(data).map(withIssueKey);
  const coverage = evaluateModuleDataCoverage(data);
  const extra = extraInterconnectionFindings(data);
  const findings = [...base, ...extra]
    .sort((a, b) => {
      const rank = { critique: 0, haute: 1, moyenne: 2, basse: 3 };
      return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
    });

  const issueMap = new Map();
  findings.forEach((f) => {
    const key = f.issue_key;
    if (!issueMap.has(key)) issueMap.set(key, { issue_key: key, findings: [], severity: f.severity, module: f.module, title: f.title });
    issueMap.get(key).findings.push(f);
  });

  return {
    findings,
    issueGroups: [...issueMap.values()],
    coverage,
    counts: {
      total: findings.length,
      critical: findings.filter((f) => f.severity === 'critique' || f.severity === 'haute').length,
      interconnection: extra.length,
      coverageGaps: coverage.missing.length,
      issueGroups: issueMap.size,
    },
    generated_at: new Date().toISOString(),
  };
}

export { computeErpAuditFindings };
