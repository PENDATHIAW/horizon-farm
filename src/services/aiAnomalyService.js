import { toNumber } from '../utils/format';

const asRows = (rows) => (Array.isArray(rows) ? rows : []);

const normalizeText = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const valueByKeys = (row = {}, keys = []) => {
  for (const key of keys) {
    const value = toNumber(row[key], null);
    if (value !== null && Number.isFinite(value) && value !== 0) return value;
  }
  return 0;
};

const sumBy = (rows, keys) => asRows(rows).reduce((sum, row) => sum + valueByKeys(row, keys), 0);

const labelOf = (row = {}) => row.name || row.nom || row.title || row.libelle || row.produit || row.reference || row.id || 'element';

const addAnomaly = (list, anomaly) => {
  list.push({
    id: anomaly.id || `anom-${list.length + 1}-${Date.now()}`,
    severity: anomaly.severity || 'warning',
    module_source: anomaly.module_source || 'autre',
    entity_type: anomaly.entity_type || null,
    entity_id: anomaly.entity_id || null,
    title: anomaly.title,
    summary: anomaly.summary,
    action_recommandee: anomaly.action_recommandee,
    confidence_score: anomaly.confidence_score ?? 60,
    source_data: anomaly.source_data || {},
    created_at: new Date().toISOString(),
  });
};

const detectStockAnomalies = (anomalies, stocks = []) => {
  asRows(stocks).forEach((row) => {
    const qty = valueByKeys(row, ['quantite', 'quantity', 'qty']);
    const threshold = valueByKeys(row, ['seuil', 'threshold']);
    const unitPrice = valueByKeys(row, ['prix_unitaire', 'unit_price', 'cout_unitaire', 'price']);

    if (qty < 0) {
      addAnomaly(anomalies, {
        severity: 'critique',
        module_source: 'stock',
        entity_type: 'stock',
        entity_id: row.id,
        title: `Stock negatif: ${labelOf(row)}`,
        summary: `Quantite negative detectee (${qty}).`,
        action_recommandee: 'Verifier mouvements stock, ventes, pertes ou erreur de saisie.',
        confidence_score: 90,
        source_data: row,
      });
    }

    if (threshold > 0 && qty <= threshold) {
      addAnomaly(anomalies, {
        severity: qty <= threshold * 0.5 ? 'critique' : 'warning',
        module_source: 'stock',
        entity_type: 'stock',
        entity_id: row.id,
        title: `Stock sous seuil: ${labelOf(row)}`,
        summary: `${qty} restant(s), seuil ${threshold}.`,
        action_recommandee: 'Verifier stock physique et planifier reapprovisionnement.',
        confidence_score: 80,
        source_data: row,
      });
    }

    if (qty > 0 && unitPrice === 0) {
      addAnomaly(anomalies, {
        severity: 'info',
        module_source: 'stock',
        entity_type: 'stock',
        entity_id: row.id,
        title: `Stock non valorise: ${labelOf(row)}`,
        summary: 'Quantite presente mais prix unitaire absent.',
        action_recommandee: 'Renseigner prix unitaire pour calculer marge et valeur stock.',
        confidence_score: 75,
        source_data: row,
      });
    }
  });
};

const detectAvicoleAnomalies = (anomalies, lots = [], productionLogs = [], alimentationLogs = []) => {
  asRows(lots).forEach((lot) => {
    const initial = valueByKeys(lot, ['initial_count', 'effectif_initial', 'quantity']);
    const mortality = valueByKeys(lot, ['mortality', 'morts']);
    const scoreSante = valueByKeys(lot, ['scoresSante', 'score_sante']);

    if (initial > 0 && mortality > initial * 0.04) {
      addAnomaly(anomalies, {
        severity: 'critique',
        module_source: 'avicole',
        entity_type: 'lot_avicole',
        entity_id: lot.id,
        title: `Mortalite avicole elevee: ${labelOf(lot)}`,
        summary: `${mortality} morts sur ${initial} sujets (${((mortality / initial) * 100).toFixed(1)}%).`,
        action_recommandee: 'Isoler les sujets faibles, verifier biosécurite, eau, chaleur et veterinaire.',
        confidence_score: 85,
        source_data: lot,
      });
    }

    if (scoreSante > 0 && scoreSante < 80) {
      addAnomaly(anomalies, {
        severity: scoreSante < 60 ? 'critique' : 'warning',
        module_source: 'avicole',
        entity_type: 'lot_avicole',
        entity_id: lot.id,
        title: `Score sante lot faible: ${labelOf(lot)}`,
        summary: `Score sante ${scoreSante}/100.`,
        action_recommandee: 'Verifier alimentation, eau, litiere, ventilation et calendrier sanitaire.',
        confidence_score: 75,
        source_data: lot,
      });
    }
  });

  const eggs = sumBy(productionLogs, ['oeufs_produits', 'oeufs', 'quantite', 'quantity', 'total_oeufs']);
  const broken = sumBy(productionLogs, ['oeufs_casses', 'casses', 'broken_eggs', 'pertes']);
  const feedCost = sumBy(alimentationLogs, ['montant_total', 'cout_total', 'total', 'montant', 'amount', 'prix_total']);

  if (eggs > 0 && broken > eggs * 0.1) {
    addAnomaly(anomalies, {
      severity: 'warning',
      module_source: 'avicole',
      entity_type: 'production_oeufs',
      title: 'Taux de casse oeufs eleve',
      summary: `${broken} oeufs casses sur ${eggs} produits.`,
      action_recommandee: 'Verifier pondoirs, manipulation, collecte et emballages.',
      confidence_score: 75,
    });
  }

  if (feedCost > 0 && eggs === 0) {
    addAnomaly(anomalies, {
      severity: 'warning',
      module_source: 'avicole',
      entity_type: 'production_oeufs',
      title: 'Alimentation sans production associee',
      summary: 'Des couts alimentation existent mais aucune production oeufs nest calculee.',
      action_recommandee: 'Verifier saisie production ou affectation des couts au bon lot.',
      confidence_score: 70,
    });
  }
};

const detectFinanceAnomalies = (anomalies, transactions = [], payments = [], invoices = []) => {
  asRows(transactions).forEach((row) => {
    const amount = valueByKeys(row, ['montant', 'amount', 'total']);
    if (amount < 0) {
      addAnomaly(anomalies, {
        severity: 'warning',
        module_source: 'finances',
        entity_type: 'transaction',
        entity_id: row.id,
        title: `Montant financier negatif: ${labelOf(row)}`,
        summary: `Montant ${amount}.`,
        action_recommandee: 'Verifier sens entree/sortie et montant de la transaction.',
        confidence_score: 80,
        source_data: row,
      });
    }

    if (amount > 0 && !row.categorie && !row.category) {
      addAnomaly(anomalies, {
        severity: 'info',
        module_source: 'finances',
        entity_type: 'transaction',
        entity_id: row.id,
        title: `Transaction non categorisee: ${labelOf(row)}`,
        summary: 'Transaction avec montant mais sans categorie.',
        action_recommandee: 'Ajouter une categorie pour fiabiliser reporting et IA.',
        confidence_score: 70,
        source_data: row,
      });
    }
  });

  const unpaid = [
    ...asRows(payments),
    ...asRows(invoices),
  ].filter((row) => {
    const status = normalizeText(`${row.status || ''} ${row.statut || ''}`);
    return status.includes('impaye') || status.includes('partiel') || status.includes('retard') || status.includes('pending') || status.includes('unpaid');
  });

  const unpaidAmount = sumBy(unpaid, ['reste_a_payer', 'remaining_amount', 'balance', 'montant_restant', 'total_ttc', 'total', 'montant', 'amount']);
  if (unpaid.length > 0) {
    addAnomaly(anomalies, {
      severity: unpaidAmount > 0 ? 'warning' : 'info',
      module_source: 'finances',
      entity_type: 'creance',
      title: 'Creances ou paiements en retard',
      summary: `${unpaid.length} element(s) a suivre, montant estime ${Math.round(unpaidAmount)} FCFA.`,
      action_recommandee: 'Relancer clients et prioriser encaissements.',
      confidence_score: 75,
    });
  }
};

const detectSmartFarmAnomalies = (anomalies, sensors = [], cameras = [], smartfarmEvents = []) => {
  [...asRows(sensors), ...asRows(cameras)].forEach((device) => {
    const status = normalizeText(device.status || device.etat);
    if (status.includes('offline') || status.includes('hors ligne') || status.includes('panne')) {
      addAnomaly(anomalies, {
        severity: 'warning',
        module_source: 'smartfarm',
        entity_type: device.stream_url ? 'camera' : 'sensor',
        entity_id: device.id,
        title: `Appareil Smart Farm hors ligne: ${labelOf(device)}`,
        summary: `Statut detecte: ${device.status || device.etat}.`,
        action_recommandee: 'Verifier alimentation, reseau, batterie, PoE ou routeur 4G.',
        confidence_score: 85,
        source_data: device,
      });
    }
  });

  asRows(smartfarmEvents).forEach((event) => {
    const eventType = normalizeText(event.event_type);
    if (eventType.includes('intrusion') || eventType.includes('humain_detecte')) {
      addAnomaly(anomalies, {
        severity: 'urgence',
        module_source: 'smartfarm',
        entity_type: 'security_event',
        entity_id: event.id,
        title: `Intrusion detectee: ${event.zone || 'zone non precisee'}`,
        summary: event.message || 'Presence humaine ou mouvement suspect detecte.',
        action_recommandee: 'Verifier camera, appeler responsable terrain et journaliser intervention.',
        confidence_score: 80,
        source_data: event,
      });
    }
  });
};

export const detectFarmAnomalies = ({
  stocks = [],
  lots = [],
  productionLogs = [],
  alimentationLogs = [],
  transactions = [],
  payments = [],
  invoices = [],
  sensors = [],
  cameras = [],
  smartfarmEvents = [],
} = {}) => {
  const anomalies = [];

  detectStockAnomalies(anomalies, stocks);
  detectAvicoleAnomalies(anomalies, lots, productionLogs, alimentationLogs);
  detectFinanceAnomalies(anomalies, transactions, payments, invoices);
  detectSmartFarmAnomalies(anomalies, sensors, cameras, smartfarmEvents);

  const severityOrder = { urgence: 0, critique: 1, warning: 2, info: 3 };
  anomalies.sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9));

  return {
    generated_at: new Date().toISOString(),
    count: anomalies.length,
    urgence_count: anomalies.filter((a) => a.severity === 'urgence').length,
    critique_count: anomalies.filter((a) => a.severity === 'critique').length,
    warning_count: anomalies.filter((a) => a.severity === 'warning').length,
    info_count: anomalies.filter((a) => a.severity === 'info').length,
    anomalies,
  };
};

export default detectFarmAnomalies;
