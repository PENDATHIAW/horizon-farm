/**
 * Règles complémentaires Horizon Advisor - enrichit erpHealthEngine sans dupliquer Alertes.
 */

import { daysUntilDlc, dlcAlertLevel, requiresDlc } from '../../utils/stockFreshProduct.js';
import { isSmartFarmDeviceCritical, smartDeviceLabel, smartFarmDeviceReason } from '../../utils/smartFarmWorkflows.js';
import { totalOpenReceivables } from '../../utils/assistantDataMap.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const money = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total ?? r.prix_unitaire ?? r.unit_price);

function baseFinding({
  id,
  module,
  severity = 'moyenne',
  category = 'advisor',
  title,
  description = '',
  recommended_action = '',
  confidence_score = 0.85,
  auto_action = null,
  source_records = [],
  days_left = null,
  type = 'advisor',
}) {
  return {
    id,
    module,
    severity,
    category,
    type,
    title,
    description,
    recommended_action,
    confidence_score,
    auto_action,
    source_records,
    days_left,
    advisor_rule: true,
  };
}

function isFeedProduct(row = {}) {
  const text = low(`${row.produit || row.nom || row.name || ''} ${row.categorie || row.category || ''}`);
  return /aliment|feed|provende|son|mais|maïs/.test(text);
}

function feedDaysLeft(row = {}, feedLogs = []) {
  const qty = n(row.quantite ?? row.quantity ?? row.stock);
  const name = low(row.produit || row.nom || row.name || '');
  const related = feedLogs.filter((log) => {
    const blob = low(JSON.stringify(log));
    return name.split(' ').some((part) => part.length > 3 && blob.includes(part));
  });
  const dailyUse = related.length
    ? related.slice(0, 14).reduce((s, l) => s + n(l.quantite ?? l.quantity ?? l.amount), 0) / Math.max(related.slice(0, 14).length, 1)
    : 0;
  if (qty <= 0 || dailyUse <= 0) return null;
  return Math.floor(qty / dailyUse);
}

/** Règles advisor : DLC, marge aliment, météo, Smart Farm, clients, documents. */
export function evaluateAdvisorRules(data = {}) {
  const findings = [];
  const stocks = arr(data.stock || data.stocks);
  const finances = arr(data.finances || data.transactions);
  const orders = arr(data.sales_orders || data.salesOrders);
  const payments = arr(data.payments);
  const clients = arr(data.clients);
  const lots = arr(data.avicole || data.lots);
  const feedLogs = arr(data.alimentation_logs || data.alimentationLogs);
  const documents = arr(data.documents);
  const sensors = arr(data.sensors || data.sensor_devices);
  const cameras = arr(data.cameras || data.camera_devices);
  const meteo = data.meteo || null;
  const smartEvents = arr(data.smartfarm_events || data.smartfarmEvents);

  stocks.forEach((row) => {
    if (!requiresDlc(row)) return;
    const level = dlcAlertLevel(row);
    const days = daysUntilDlc(row);
    const label = row.produit || row.nom || row.name || 'Produit frais';
    if (level === 'black' || level === 'red' || level === 'orange') {
      findings.push(baseFinding({
        id: `advisor-dlc-${row.id || label}`,
        module: 'achats_stock',
        severity: level === 'black' ? 'critique' : level === 'red' ? 'haute' : 'moyenne',
        category: 'stock_frais',
        title: level === 'black' ? `DLC dépassée : ${label}` : `DLC viande proche : ${label}`,
        description: days != null ? `DLC dans ${days} jour(s)` : 'Date limite proche',
        recommended_action: 'Vente rapide recommandée ou écoulement prioritaire',
        confidence_score: 0.92,
        auto_action: 'create_task',
        source_records: [{ type: 'stock', id: row.id }],
        days_left: days,
      }));
    }
  });

  stocks.filter(isFeedProduct).forEach((row) => {
    const daysLeft = feedDaysLeft(row, feedLogs);
    const label = row.produit || row.nom || row.name || 'Aliment';
    if (daysLeft != null && daysLeft <= 7) {
      findings.push(baseFinding({
        id: `advisor-feed-days-${row.id || label}`,
        module: 'achats_stock',
        severity: daysLeft <= 3 ? 'critique' : 'haute',
        category: 'predictive',
        type: 'rupture_stock',
        title: `Stock aliment faible dans ${daysLeft} jour(s)`,
        description: `${n(row.quantite ?? row.quantity)} restant · rythme consommation actuel`,
        recommended_action: `Réapprovisionner ${label} avant rupture`,
        confidence_score: 0.88,
        auto_action: 'create_task',
        source_records: [{ type: 'stock', id: row.id }],
        days_left: daysLeft,
      }));
    }

    const currentPrice = money(row);
    const purchaseRows = finances.filter((tx) => {
      const blob = low(`${tx.libelle || tx.title || ''} ${tx.categorie || ''}`);
      return isFeedProduct({ produit: blob }) || blob.includes(low(label).split(' ')[0] || '___');
    });
    if (currentPrice > 0 && purchaseRows.length >= 2) {
      const sorted = purchaseRows.map(money).filter((v) => v > 0).sort((a, b) => a - b);
      const previous = sorted[Math.max(0, sorted.length - 2)];
      const latest = sorted[sorted.length - 1];
      if (previous > 0 && latest > previous * 1.08) {
        const pct = Math.round(((latest - previous) / previous) * 100);
        findings.push(baseFinding({
          id: `advisor-feed-cost-${row.id || label}`,
          module: 'finance_pilotage',
          severity: pct >= 15 ? 'haute' : 'moyenne',
          category: 'rentabilite',
          title: 'Hausse coût aliment : marge à revoir',
          description: `+${pct} % sur ${label} (${previous} → ${latest} FCFA)`,
          recommended_action: 'Renégocier fournisseur ou ajuster prix de vente',
          confidence_score: 0.84,
          auto_action: 'create_alert',
          source_records: [{ type: 'stock', id: row.id }],
        }));
      }
    }
  });

  orders.forEach((order) => {
    const total = money(order);
    const paid = n(order.montant_paye) + payments.filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + money(p), 0);
    const rest = Math.max(0, total - paid);
    if (rest <= 0) return;
    const clientName = order.client_nom || order.customer_name || clients.find((c) => String(c.id) === String(order.client_id))?.nom || 'Client';
    const dueDays = order.date_echeance || order.due_date;
    findings.push(baseFinding({
      id: `advisor-client-late-${order.id}`,
      module: 'commercial',
      severity: rest > total * 0.5 ? 'haute' : 'moyenne',
      category: 'coherence',
      title: `Client en retard de paiement : ${clientName}`,
      description: `Reste ${rest} FCFA${dueDays ? ` · échéance ${dueDays}` : ''}`,
      recommended_action: 'Relancer le client et planifier encaissement',
      confidence_score: 0.9,
      auto_action: 'create_task',
      source_records: [{ type: 'sales_order', id: order.id }],
    }));
  });

  if (totalOpenReceivables(orders, payments) > 0 && !findings.some((f) => f.id.startsWith('advisor-client-late'))) {
    findings.push(baseFinding({
      id: 'advisor-receivables-global',
      module: 'commercial',
      severity: 'moyenne',
      category: 'coherence',
      title: 'Créances clients ouvertes',
      description: 'Encaissements en attente sur plusieurs ventes',
      recommended_action: 'Prioriser les relances clients',
      confidence_score: 0.82,
      auto_action: 'create_task',
    }));
  }

  lots.forEach((lot) => {
    const mortality = n(lot.mortality ?? lot.mortalite);
    const initial = n(lot.initial_count ?? lot.effectif_initial);
    const rate = initial > 0 ? mortality / initial : 0;
    if (rate > 0.03 && rate <= 0.04) {
      findings.push(baseFinding({
        id: `advisor-mortality-watch-${lot.id}`,
        module: 'elevage',
        severity: 'moyenne',
        category: 'sanitaire',
        title: `Mortalité à surveiller : ${lot.nom || lot.name || lot.id}`,
        description: `${Math.round(rate * 100)} % · seuil alerte 4 %`,
        recommended_action: 'Contrôler alimentation, ventilation et soins',
        confidence_score: 0.8,
        auto_action: 'create_alert',
        source_records: [{ type: 'lot', id: lot.id }],
      }));
    }
  });

  finances.filter((tx) => money(tx) > 0).forEach((tx) => {
    const linked = documents.some((doc) => [doc.transaction_id, doc.finance_id, doc.entity_id, doc.related_id].map(String).includes(String(tx.id)));
    if (!linked && !tx.document_id && !tx.proof_url) {
      findings.push(baseFinding({
        id: `advisor-doc-missing-${tx.id}`,
        module: 'documents_rapports',
        severity: 'moyenne',
        category: 'coherence',
        title: `Justificatif manquant : ${tx.libelle || tx.title || tx.id}`,
        description: `Transaction ${money(tx)} FCFA sans document lié`,
        recommended_action: 'Joindre facture ou reçu dans Documents & Rapports',
        confidence_score: 0.86,
        auto_action: 'create_task',
        source_records: [{ type: 'finance', id: tx.id }],
      }));
    }
  });

  const temp = n(meteo?.temperature ?? meteo?.temp);
  const condition = low(meteo?.condition || meteo?.description || '');
  if (temp >= 34 || /chaleur|canicule|chaud|heat/.test(condition)) {
    findings.push(baseFinding({
      id: 'advisor-weather-heat',
      module: 'elevage',
      severity: temp >= 38 ? 'critique' : 'haute',
      category: 'meteo',
      title: 'Chaleur prévue : renforcer abreuvement',
      description: temp ? `${temp}°C · ${meteo?.condition || 'Conditions chaudes'}` : (meteo?.condition || 'Alerte météo chaleur'),
      recommended_action: 'Vérifier abreuvoirs, ventilation et ombrage des lots',
      confidence_score: 0.87,
      auto_action: 'create_task',
    }));
  }

  [...sensors.map((d) => ({ device: d, kind: 'capteur' })), ...cameras.map((d) => ({ device: d, kind: 'camera' }))]
    .forEach(({ device, kind }) => {
      if (!isSmartFarmDeviceCritical(device)) return;
      const label = smartDeviceLabel(device, kind);
      findings.push(baseFinding({
        id: `advisor-smartfarm-${kind}-${device.id}`,
        module: 'smartfarm',
        severity: 'haute',
        category: 'smartfarm',
        title: `Smart Farm : ${label} à vérifier`,
        description: smartFarmDeviceReason(device, kind),
        recommended_action: 'Inspecter capteur/caméra et corriger le signal',
        confidence_score: 0.83,
        auto_action: 'create_alert',
        source_records: [{ type: kind, id: device.id }],
      }));
    });

  if (smartEvents.length) {
    const recentCritical = smartEvents.slice(0, 5).filter((evt) => /critique|alerte|offline|panne/i.test(`${evt.title} ${evt.event_type} ${evt.severity}`));
    recentCritical.forEach((evt) => {
      findings.push(baseFinding({
        id: `advisor-smartfarm-event-${evt.id}`,
        module: 'smartfarm',
        severity: 'moyenne',
        category: 'smartfarm',
        title: evt.title || 'Signal Smart Farm',
        description: evt.description || evt.event_type || 'Événement capteur',
        recommended_action: 'Consulter Smart Farm et traiter le signal',
        confidence_score: 0.78,
        auto_action: 'create_task',
        source_records: [{ type: 'smartfarm_event', id: evt.id }],
      }));
    });
  }

  return findings;
}

export default evaluateAdvisorRules;
