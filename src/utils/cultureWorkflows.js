import { toNumber } from './format.js';
import { makeId } from './ids.js';

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();
const norm = (value = '') => clean(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const addDays = (date = today(), days = 0) => {
  const base = new Date(date || today());
  if (Number.isNaN(base.getTime())) return today();
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
};

const activeCultureStatus = (row = {}) => {
  const status = norm(row.statut || row.status || row.phase || '');
  return !['terminee', 'terminée', 'recoltee', 'récoltée', 'abandonnee', 'abandonnée', 'archivee', 'archivée'].some((word) => status.includes(norm(word)));
};

export const cultureLabel = (row = {}) => row.nom || row.name || row.type || row.culture || row.parcelle || row.id || 'Culture';
export const cultureHarvestQty = (row = {}) => toNumber(row.quantite_recoltee ?? row.recolte ?? row.production_recoltee ?? row.rendement_reel);
export const cultureSoldQty = (row = {}) => toNumber(row.quantite_vendue ?? row.quantity_sold ?? row.vendue);
export const cultureAvailableQty = (row = {}) => {
  const explicit = toNumber(row.quantite_disponible ?? row.quantity_available ?? row.stock_recolte);
  if (explicit > 0) return explicit;
  const harvested = cultureHarvestQty(row);
  if (harvested <= 0) return 0;
  return Math.max(0, harvested - cultureSoldQty(row));
};
export const cultureHarvestUnit = (row = {}) => row.unite_recolte || row.unite || row.unit || 'kg';
export const cultureUnitPrice = (row = {}) => toNumber(row.prix_vente_estime ?? row.prix_vente ?? row.prix_vente_unitaire ?? row.prix_unitaire ?? row.unit_price);
export const cultureStockKey = (row = {}) => `culture-stock:${row.id || cultureLabel(row)}`;
export const cultureOpportunityKey = (row = {}) => `cultures:${row.id || cultureLabel(row)}`;

export function isCultureHarvestReady(row = {}) {
  const status = norm(row.statut || row.status || row.phase || '');
  return cultureHarvestQty(row) > 0 || cultureAvailableQty(row) > 0
    || Boolean(row.vendable || row.pret_a_la_vente || row.ready_for_sale || row.sale_ready)
    || ['recolte', 'recoltee', 'pret_a_vendre', 'pret_vente', 'pret a vendre'].some((word) => status.includes(norm(word)));
}

export function findCultureStock(stocks = [], culture = {}) {
  const key = cultureStockKey(culture);
  return stocks.find((row) => String(row.stock_key || row.dedupe_key || row.source_record_id || row.related_id || row.culture_id || '') === key
    || (String(row.source_module || '').includes('cultures') && String(row.source_id || row.culture_id || '') === String(culture.id)));
}

export function findCultureOpportunity(opportunities = [], culture = {}) {
  const keys = new Set([cultureOpportunityKey(culture), `culture-sale:${culture.id || ''}`].filter(Boolean));
  return opportunities.find((opp) => {
    const oppKey = String(opp.opportunity_key || opp.dedupe_key || opp.source_record_id || '');
    if (keys.has(oppKey)) return true;
    return (String(opp.source_module || opp.created_from || '').includes('cultures')
      && String(opp.source_id || opp.entity_id || opp.culture_id || '') === String(culture.id));
  });
}

export function buildCropCampaignStartWorkflow({
  culture = {},
  cultures = [],
  parcelles = [],
  stocks = [],
  date = today(),
} = {}) {
  const cultureId = clean(culture.id) || makeId('CULT');
  const startDate = culture.date_debut_campagne || culture.date_semis || culture.date || date;
  const singlePlot = Array.isArray(parcelles) && parcelles.length === 1 ? parcelles[0] : null;
  const plotId = clean(culture.parcelle_id || culture.plot_id) || clean(singlePlot?.id);
  const plotLabel = culture.parcelle || culture.plot || singlePlot?.nom || singlePlot?.name || plotId;
  const surface = toNumber(culture.surface ?? culture.surface_ha ?? singlePlot?.surface ?? singlePlot?.surface_ha);
  const unit = culture.unite_surface || culture.surface_unit || singlePlot?.unite_surface || 'ha';
  const cropName = culture.nom || culture.culture || culture.type || 'Culture';
  const initialCost = toNumber(culture.cout_initial ?? culture.budget_prevu ?? culture.cout_total_prevu);
  const targetYield = toNumber(culture.rendement_cible ?? culture.target_yield) || (surface > 0 ? Math.round(surface * 12000) : 0);
  const unitPrice = cultureUnitPrice(culture) || toNumber(culture.prix_vente_prevu_unitaire);
  const expectedRevenue = unitPrice > 0 ? targetYield * unitPrice : toNumber(culture.revenu_prevu ?? culture.ca_previsionnel);
  const expectedMargin = expectedRevenue - initialCost;
  const harvestDate = culture.date_recolte_estimee || culture.date_recolte_prevue || addDays(startDate, toNumber(culture.duree_cycle_jours) || 90);
  const occupiedPlot = plotId ? arr(cultures).find((row) => {
    if (clean(row.id) === cultureId) return false;
    const rowPlotId = clean(row.parcelle_id || row.plot_id);
    return rowPlotId === plotId && activeCultureStatus(row);
  }) : null;
  const inputStocks = (Array.isArray(stocks) ? stocks : []).filter((stock) => {
    const text = norm(`${stock.categorie || ''} ${stock.category || ''} ${stock.produit || ''} ${stock.name || ''}`);
    return ['semence', 'engrais', 'intrant', 'irrigation', 'eau', 'phyto'].some((word) => text.includes(word));
  });
  const stockReservations = inputStocks
    .map((stock) => {
      const requested = toNumber(stock.quantite_reservee ?? stock.reserve_qty ?? stock.quantite_prevue ?? stock.planned_qty);
      const available = toNumber(stock.quantite ?? stock.quantity);
      if (requested <= 0) return null;
      return {
        stock,
        requested,
        available,
        nextQty: Math.max(0, available - requested),
      };
    })
    .filter(Boolean);
  const issueKey = `culture-campaign:${cultureId}:${startDate}`;
  const missing = [
    plotId || plotLabel ? '' : 'parcelle',
    surface > 0 ? '' : 'surface',
    cropName ? '' : 'culture',
    initialCost > 0 ? '' : 'coûts initiaux',
  ].filter(Boolean);
  const blockingReasons = [
    occupiedPlot ? `parcelle déjà occupée par ${cultureLabel(occupiedPlot)}` : '',
  ].filter(Boolean);
  const irrigationCalendar = [7, 14, 21, 28].map((day) => ({ date: addDays(startDate, day), action: `Irrigation J+${day}` }));
  const followUpCalendar = [15, 30, 45, 60].map((day) => ({ date: addDays(startDate, day), action: `Suivi culture J+${day}` }));

  const culturePayload = {
    ...culture,
    id: cultureId,
    nom: cropName,
    type: culture.type || cropName,
    parcelle_id: plotId,
    plot_id: plotId,
    parcelle: plotLabel,
    surface,
    surface_ha: unit === 'ha' ? surface : culture.surface_ha,
    unite_surface: unit,
    statut: culture.statut || 'en_cours',
    status: culture.status || 'en_cours',
    date_debut_campagne: startDate,
    date_semis: culture.date_semis || startDate,
    cout_initial: initialCost,
    cout_total_prevu: initialCost,
    intrants_planifies: inputStocks.map((stock) => stock.id),
    calendrier_irrigation: irrigationCalendar,
    calendrier_suivi: followUpCalendar,
    date_recolte_estimee: harvestDate,
    date_recolte_prevue: harvestDate,
    rendement_cible: targetYield,
    marge_previsionnelle: expectedMargin,
    intrants_reserves: stockReservations.map(({ stock, requested }) => ({ stock_id: stock.id, quantite: requested, unite: stock.unite || stock.unit || '' })),
    reporting_campaign_ready: missing.length === 0 && blockingReasons.length === 0,
    campaign_start_status: blockingReasons.length ? 'bloque' : 'valide',
    issue_key: issueKey,
  };

  const tasks = [
    ...irrigationCalendar.slice(0, 2).map((item) => ({
      id: makeId('TSK'),
      title: item.action,
      module_lie: 'cultures',
      source_module: 'cultures',
      source_record_id: cultureId,
      related_id: cultureId,
      due_date: item.date,
      priority: 'moyenne',
      status: 'a_faire',
      task_dedupe_key: `${issueKey}:irrigation:${item.date}`,
      checklist: 'Vérifier humidité; Irriguer; Noter volume ou durée',
    })),
    {
      id: makeId('TSK'),
      title: `Suivi démarrage ${cultureLabel(culturePayload)}`,
      module_lie: 'cultures',
      source_module: 'cultures',
      source_record_id: cultureId,
      related_id: cultureId,
      due_date: addDays(startDate, 7),
      priority: missing.length ? 'haute' : 'moyenne',
      status: 'a_faire',
      task_dedupe_key: `${issueKey}:suivi-demarrage`,
      checklist: 'Vérifier levée; Contrôler intrants; Confirmer calendrier irrigation; Estimer récolte',
    },
  ];

  return {
    culture: culturePayload,
    tasks,
    blocked: blockingReasons.length > 0,
    blockingReasons,
    stockPatches: blockingReasons.length ? [] : stockReservations.map(({ stock, nextQty, requested }) => ({
      id: stock.id,
      quantite: nextQty,
      quantity: nextQty,
      last_movement_type: 'reservation_campagne_culture',
      last_movement_qty: requested,
      last_movement_label: `Réservation intrant ${cultureLabel(culturePayload)}`,
      last_movement_at: now(),
    })),
    stockMovements: blockingReasons.length ? [] : stockReservations.map(({ stock, requested }) => ({
      id: makeId('MVT'),
      stock_id: stock.id,
      type: 'sortie',
      movement_type: 'sortie',
      quantite: requested,
      quantity: requested,
      unite: stock.unite || stock.unit || '',
      motif: `Réservation intrant campagne ${cultureLabel(culturePayload)}`,
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: cultureId,
      date: startDate,
      issue_key: issueKey,
    })),
    financeTransaction: initialCost > 0 ? {
      id: makeId('TRX'),
      type: 'sortie',
      transaction_type: 'sortie',
      libelle: `Démarrage campagne ${cultureLabel(culturePayload)}`,
      montant: initialCost,
      amount: initialCost,
      date: startDate,
      categorie: 'Culture',
      module_lie: 'cultures',
      related_id: cultureId,
      source_module: 'cultures',
      source_record_id: cultureId,
      statut: 'paye',
      status: 'paye',
      cash_effect: true,
    } : null,
    alert: missing.length || blockingReasons.length ? {
      id: makeId('ALT'),
      title: blockingReasons.length ? `Campagne culture bloquée: ${cultureLabel(culturePayload)}` : `Campagne culture incomplète: ${cultureLabel(culturePayload)}`,
      message: blockingReasons.length ? blockingReasons.join(', ') : `Données à compléter: ${missing.join(', ')}`,
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: cultureId,
      severity: blockingReasons.length ? 'haute' : 'warning',
      status: 'nouvelle',
      alert_dedupe_key: `${issueKey}:${blockingReasons.length ? 'blocked' : 'missing'}`,
    } : null,
    event: {
      id: makeId('EVT'),
      event_type: 'crop_campaign_start',
      type_evenement: 'crop_campaign_start',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: cultureId,
      title: `Campagne démarrée · ${cultureLabel(culturePayload)}`,
      description: `${surface || '-'} ${unit} · récolte estimée ${harvestDate} · marge prévue ${expectedMargin} FCFA`,
      event_date: startDate,
      severity: missing.length || blockingReasons.length ? 'warning' : 'info',
      amount: expectedMargin,
      blocking_reasons: blockingReasons,
      saisies_evitees: 7,
    },
    reporting: {
      culture_id: cultureId,
      parcelle: plotLabel,
      surface,
      cout_initial: initialCost,
      rendement_cible: targetYield,
      recolte_estimee: harvestDate,
      marge_previsionnelle: expectedMargin,
      missing_fields: missing,
      blocking_reasons: blockingReasons,
      stock_reserved_count: stockReservations.length,
    },
  };
}

export function buildIrrigationEventWorkflow({
  culture = {},
  payload = {},
  smartReadings = [],
  date = today(),
} = {}) {
  const cultureId = clean(payload.culture_id || culture.id);
  const active = cultureId && activeCultureStatus(culture);
  const latestWater = (Array.isArray(smartReadings) ? smartReadings : []).find((row) => {
    const text = norm(`${row.type || ''} ${row.metric || ''} ${row.name || ''}`);
    return text.includes('water') || text.includes('eau') || text.includes('irrigation');
  });
  const durationMin = toNumber(payload.duree_minutes ?? payload.duration_min);
  const volumeL = toNumber(payload.volume_litres ?? payload.volume_l ?? latestWater?.value);
  const source = clean(payload.source_eau || payload.water_source || latestWater?.device_name || latestWater?.device_id) || 'manuel';
  const unitCost = toNumber(payload.cout_unitaire_litre ?? payload.unit_cost_per_liter) || 1;
  const cost = toNumber(payload.cout ?? payload.cost) || Math.round(volumeL * unitCost);
  const abnormalThreshold = toNumber(payload.seuil_anormal_litres ?? payload.abnormal_threshold_l) || Math.max(500, toNumber(culture.surface ?? culture.surface_ha) * 4000);
  const abnormal = volumeL > abnormalThreshold && abnormalThreshold > 0;
  const issueKey = `culture-irrigation:${cultureId || 'sans-culture'}:${date}`;
  const history = Array.isArray(culture.irrigation_history) ? culture.irrigation_history : [];
  const row = { date, volume_litres: volumeL, duree_minutes: durationMin, source_eau: source, cout: cost };

  return {
    culturePatch: active ? {
      cout_eau: toNumber(culture.cout_eau) + cost,
      cout_irrigation: toNumber(culture.cout_irrigation) + cost,
      cout_total_reel: toNumber(culture.cout_total_reel) + cost,
      derniere_irrigation: date,
      irrigation_history: [...history, row],
      eau_consommee_litres: toNumber(culture.eau_consommee_litres) + volumeL,
    } : null,
    alert: (!active || abnormal) ? {
      id: makeId('ALT'),
      title: !active ? 'Irrigation sans culture active' : 'Consommation eau anormale',
      message: !active
        ? 'Aucune campagne active liée à cette irrigation.'
        : `${volumeL} L dépasse le seuil ${abnormalThreshold} L.`,
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: cultureId || 'sans-culture',
      severity: !active ? 'haute' : 'warning',
      status: 'nouvelle',
      alert_dedupe_key: `${issueKey}:alert`,
    } : null,
    task: (!active || abnormal) ? {
      id: makeId('TSK'),
      title: !active ? 'Vérifier irrigation sans culture' : `Contrôler irrigation ${cultureLabel(culture)}`,
      module_lie: 'cultures',
      source_module: 'cultures',
      source_record_id: cultureId || 'sans-culture',
      related_id: cultureId || 'sans-culture',
      task_dedupe_key: `${issueKey}:task`,
      due_date: date,
      priority: !active ? 'haute' : 'moyenne',
      status: 'a_faire',
      checklist: !active ? 'Identifier parcelle; Relier à une campagne active; Corriger la saisie' : 'Contrôler fuite; Vérifier humidité; Ajuster calendrier irrigation',
    } : null,
    financeTransaction: null,
    costAllocation: cost > 0 ? {
      type: 'cout_technique',
      source_type: 'irrigation_estimee',
      amount: cost,
      cash_effect: false,
    } : null,
    event: {
      id: makeId('EVT'),
      event_type: 'irrigation_event',
      type_evenement: 'irrigation_event',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: cultureId || 'sans-culture',
      title: `Irrigation · ${cultureLabel(culture)}`,
      description: `${volumeL || durationMin || '-'} ${volumeL ? 'L' : 'min'} · source ${source} · coût ${cost} FCFA`,
      event_date: date,
      severity: (!active || abnormal) ? 'warning' : 'info',
      quantity: volumeL || durationMin,
      amount: cost,
      smartfarm_source_id: latestWater?.id || '',
      issue_key: issueKey,
      saisies_evitees: latestWater ? 3 : 2,
    },
    reporting: {
      culture_id: cultureId,
      volume_litres: volumeL,
      duree_minutes: durationMin,
      source_eau: source,
      cout: cost,
      abnormal,
      active,
    },
    historyRow: row,
  };
}

export function buildCultureHarvestWorkflow({ before = {}, after = {}, stocks = [], opportunities = [], source = 'fiche culture', date = today() }) {
  if (!after?.id || !isCultureHarvestReady(after)) return null;
  const qty = cultureHarvestQty(after);
  if (qty <= 0) return null;
  const saleQty = cultureAvailableQty(after);
  const unit = cultureHarvestUnit(after);
  const price = cultureUnitPrice(after);
  const amount = price > 0 ? price * (saleQty > 0 ? saleQty : qty) : toNumber(after.valeur_recolte_estimee || after.montant_estime);
  const stockKey = cultureStockKey(after);
  const opportunityKey = cultureOpportunityKey(after);
  const name = `Récolte ${cultureLabel(after)}`;
  const stockExisting = findCultureStock(stocks, after);
  const opportunityExisting = findCultureOpportunity(opportunities, after);
  const stockPayload = {
    stock_key: stockKey,
    dedupe_key: stockKey,
    produit: name,
    name,
    categorie: 'Récoltes cultures',
    category: 'recolte_culture',
    quantite: qty,
    quantity: qty,
    unite: unit,
    seuil: 0,
    source_module: 'cultures',
    source_type: 'culture',
    source_id: after.id,
    source_record_id: stockKey,
    related_id: after.id,
    culture_id: after.id,
    date_entree: after.date_recolte || date,
    notes: `Stock créé depuis la récolte de ${cultureLabel(after)}`,
  };
  const opportunityPayload = {
    opportunity_key: opportunityKey,
    dedupe_key: opportunityKey,
    title: `Vente ${name}`,
    libelle: `Vente ${name}`,
    source_module: 'cultures',
    created_from: 'cultures',
    source_type: 'recolte_culture',
    entity_type: 'culture',
    source_id: after.id,
    entity_id: after.id,
    culture_id: after.id,
    product_name: name,
    produit: name,
    quantity: saleQty > 0 ? saleQty : qty,
    quantite: saleQty > 0 ? saleQty : qty,
    unite: unit,
    unit,
    unit_price: price,
    prix_unitaire: price,
    montant_estime: amount,
    estimated_amount: amount,
    valeur_estimee: amount,
    status: saleQty > 0 ? 'ouverte' : 'fermee',
    statut: saleQty > 0 ? 'ouverte' : 'fermee',
    priority: 'haute',
    date: after.date_recolte || date,
    notes: `Récolte disponible à vendre · ${qty} ${unit}`,
  };
  const beforeQty = cultureHarvestQty(before);
  return {
    stockExistingId: stockExisting?.id || '',
    opportunityExistingId: opportunityExisting?.id || '',
    stock: stockExisting?.id ? stockPayload : { id: makeId('STK'), ...stockPayload },
    opportunity: opportunityExisting?.id ? { ...opportunityPayload, updated_at: now() } : { id: makeId('OPP'), ...opportunityPayload },
    event: qty > beforeQty ? {
      id: makeId('EVT'),
      event_type: 'recolte_culture_disponible',
      module_source: 'cultures',
      module: 'cultures',
      source_type: 'culture',
      entity_type: 'culture',
      source_id: after.id,
      entity_id: after.id,
      title: `Récolte disponible · ${cultureLabel(after)}`,
      description: [`Source: ${source}`, `Quantité récoltée: ${qty} ${unit}`, 'Stock et opportunité de vente préparés.'].join('\n'),
      severity: 'info',
      status: 'nouveau',
      event_date: after.date_recolte || date,
      date: after.date_recolte || date,
      amount,
      montant: amount,
      linked_opportunity_key: opportunityKey,
      linked_stock_key: stockKey,
      saisies_evitees: 2,
    } : null,
  };
}

export function buildCultureInputUsageWorkflow({ culture = {}, stock = {}, qty = 0, motif = 'Intrant utilisé', date = today() }) {
  const usedQty = Math.max(0, toNumber(qty));
  if (!culture?.id || !stock?.id || usedQty <= 0) return null;
  const currentQty = toNumber(stock.quantite ?? stock.quantity);
  const nextQty = Math.max(0, currentQty - usedQty);
  const unitPrice = toNumber(stock.prixUnit ?? stock.prixunit ?? stock.prix_unitaire ?? stock.unit_price);
  const amount = usedQty * unitPrice;
  const label = stock.produit || stock.name || stock.nom || stock.id;
  return {
    stockPatch: {
      quantite: nextQty,
      quantity: nextQty,
      last_movement_type: 'sortie_intrant_culture',
      last_movement_qty: usedQty,
      last_movement_label: motif,
      last_movement_at: now(),
      source_module: stock.source_module || 'stock',
    },
    culturePatch: {
      cout_total_reel: toNumber(culture.cout_total_reel) + amount,
      cout_intrants: toNumber(culture.cout_intrants) + amount,
      derniere_sortie_intrant_stock_id: stock.id,
      derniere_sortie_intrant_at: now(),
    },
    event: {
      id: makeId('EVT'),
      event_type: 'intrant_culture_utilise',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      title: `Intrant utilisé · ${cultureLabel(culture)}`,
      description: `${usedQty} ${stock.unite || ''} de ${label} · ${motif}`.trim(),
      event_date: date,
      severity: nextQty <= toNumber(stock.seuil ?? stock.threshold) && toNumber(stock.seuil ?? stock.threshold) > 0 ? 'warning' : 'info',
      linked_stock_id: stock.id,
      quantity: usedQty,
      amount,
      saisies_evitees: 2,
    },
  };
}

export function buildCultureLossWorkflow({ culture = {}, qty = 0, unitPrice = 0, reason = 'Perte déclarée', date = today() }) {
  const lossQty = Math.max(0, toNumber(qty));
  if (!culture?.id || lossQty <= 0) return null;
  const unit = cultureHarvestUnit(culture);
  const amount = lossQty * toNumber(unitPrice || cultureUnitPrice(culture));
  const available = Math.max(0, toNumber(culture.quantite_disponible ?? cultureHarvestQty(culture)) - lossQty);
  return {
    culturePatch: {
      quantite_disponible: available,
      pertes: toNumber(culture.pertes) + lossQty,
      quantite_perdue: toNumber(culture.quantite_perdue) + lossQty,
      valeur_perte_estimee: toNumber(culture.valeur_perte_estimee) + amount,
      statut: available <= 0 ? 'perdu' : (culture.statut || 'a_surveiller'),
      last_loss_at: now(),
      last_loss_reason: reason,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'perte_culturale',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      title: `Perte culture · ${cultureLabel(culture)}`,
      description: `${lossQty} ${unit} perdu(s) · ${reason}`,
      event_date: date,
      severity: available <= 0 ? 'critique' : 'warning',
      quantity: lossQty,
      amount,
      montant: amount,
    },
  };
}

export function buildCultureWeatherRiskFollowUp({ culture = {}, reason = 'Risque météo', severity = 'warning', date = today() }) {
  if (!culture?.id) return null;
  const key = `culture-risk:${culture.id}:${norm(reason) || 'meteo'}`;
  const taskId = makeId('TSK');
  return {
    task: {
      id: taskId,
      title: `Vérifier culture: ${cultureLabel(culture)}`,
      module_lie: 'cultures',
      source_module: 'cultures',
      source_record_id: culture.id,
      related_id: culture.id,
      task_dedupe_key: key,
      due_date: date,
      priority: severity === 'critique' ? 'critique' : 'haute',
      status: 'a_faire',
      checklist: 'Contrôler parcelle; Vérifier eau/intrants; Noter action terrain',
      notes: reason,
    },
    alert: {
      id: makeId('ALT'),
      title: `Risque culture: ${cultureLabel(culture)}`,
      message: reason,
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      severity,
      status: 'nouvelle',
      action_recommandee: 'Contrôler la parcelle et créer une action si nécessaire.',
      alert_dedupe_key: key,
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'risque_culture_detecte',
      module_source: 'cultures',
      entity_type: 'culture',
      entity_id: culture.id,
      title: `Risque culture ${cultureLabel(culture)}`,
      description: reason,
      event_date: date,
      severity,
      linked_task_id: taskId,
    },
  };
}
