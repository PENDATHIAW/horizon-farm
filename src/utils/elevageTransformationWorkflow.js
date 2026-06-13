/**
 * Canal officiel transformation — vivant → produit fini (stock, traçabilité, coût de revient).
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { buildMeatStockPayload } from '../services/livestockStockBridge.js';
import { calculateUnifiedAnimalCost, calculateUnifiedLotCost } from '../services/unifiedCostService.js';
import { avicoleActiveCount, avicoleDeadCount } from './avicoleMetrics.js';
import { applyStockMovement, stockQuantity } from './stockWorkflows.js';
import {
  blockSanitaryAction,
  findActiveWithdrawals,
  SANITARY_ACTIONS,
} from './sanitaryWithdrawal.js';
import {
  buildElevageIssueKey,
  ELEVAGE_DOMAINS,
} from './elevageWorkflow.js';
import { resolveElevageLogFarmId, stampElevageLogFarmId } from './elevageFarmScope.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);

export const TRANSFORM_TYPES = [
  { value: 'abattage', label: 'Abattage — carcasse / stock viande' },
  { value: 'reforme', label: 'Réforme — sortie cheptel / lot' },
  { value: 'mortalite_lot', label: 'Mortalité lot / bande (avicole)' },
  { value: 'mortalite_animal', label: 'Mortalité animal individuel (perte)' },
  { value: 'sortie_vente_vivant', label: 'Sortie vente vivant (pas de stock carcasse)' },
  { value: 'transformation_viande', label: 'Découpe / conditionnement viande' },
  { value: 'autre', label: 'Autre sortie / conversion' },
];

/** Champs et défauts selon le type — évite incohérences (réforme + tous les frais abattage, etc.). */
export const TRANSFORM_TYPE_PROFILES = {
  abattage: {
    hint: 'Animal ou lot chair → poids vif/carcasse, frais abattage, stock viande après validation.',
    sources: ['animal', 'lot_avicole'],
    lotScope: 'chair',
    show: { effectif: true, poids_vif: true, poids_carcasse: true, rendement: true, pertes: true, frais_abattage: true, frais_decoupe: true, frais_emballage: true, frais_transport: true, autres_frais: true, produit_fini: true, stock_fields: true, proof: true },
    defaults: { destination: 'stock', create_stock: true, produit_fini_type: 'viande_fraiche' },
  },
  reforme: {
    hint: 'Réforme pondeuses ou animal — effectif, poids optionnel, frais limités, stock ou vente.',
    sources: ['animal', 'lot_avicole'],
    lotScope: 'all',
    show: { effectif: true, poids_vif: true, poids_carcasse: true, rendement: true, pertes: true, frais_abattage: true, frais_decoupe: false, frais_emballage: true, frais_transport: true, autres_frais: true, produit_fini: true, stock_fields: true, proof: true },
    defaults: { destination: 'stock', create_stock: true, produit_fini_type: 'viande_fraiche' },
  },
  mortalite_lot: {
    hint: 'Mortalité sur une bande avicole — effectif perdu, perte financière, pas de stock viande.',
    sources: ['lot_avicole'],
    lotScope: 'all',
    show: { effectif: true, poids_vif: false, poids_carcasse: false, rendement: false, pertes: true, frais_abattage: false, frais_decoupe: false, frais_emballage: false, frais_transport: false, autres_frais: true, produit_fini: false, stock_fields: false, proof: false },
    defaults: { destination: 'perte', create_stock: false, source_type: 'lot_avicole' },
  },
  mortalite_animal: {
    hint: 'Décès d’un animal (bovin, ovin, caprin…) — perte financière, pas de produit fini ni stock.',
    sources: ['animal'],
    lotScope: 'all',
    show: { effectif: false, poids_vif: false, poids_carcasse: false, rendement: false, pertes: true, frais_abattage: false, frais_decoupe: false, frais_emballage: false, frais_transport: false, autres_frais: true, produit_fini: false, stock_fields: false, proof: false },
    defaults: { destination: 'perte', create_stock: false, source_type: 'animal' },
  },
  sortie_vente_vivant: {
    hint: 'Vente vivant — pas de carcasse ni stock produit fini ici (préparer vente Commercial).',
    sources: ['animal', 'lot_avicole'],
    lotScope: 'all',
    show: { effectif: true, poids_vif: true, poids_carcasse: false, rendement: false, pertes: false, frais_abattage: false, frais_decoupe: false, frais_emballage: false, frais_transport: true, autres_frais: true, produit_fini: false, stock_fields: false, proof: false },
    defaults: { destination: 'vente_directe', create_stock: false },
  },
  transformation_viande: {
    hint: 'Découpe / conditionnement — pièces, frais découpe et emballage, stock produit fini.',
    sources: ['animal', 'lot_avicole'],
    lotScope: 'all',
    show: { effectif: false, poids_vif: false, poids_carcasse: true, rendement: false, pertes: true, frais_abattage: false, frais_decoupe: true, frais_emballage: true, frais_transport: true, autres_frais: true, produit_fini: true, stock_fields: true, proof: true },
    defaults: { destination: 'stock', create_stock: true, produit_fini_type: 'pieces' },
  },
  autre: {
    hint: 'Sortie ou conversion non standard — précisez en notes.',
    sources: ['animal', 'lot_avicole'],
    lotScope: 'all',
    show: { effectif: true, poids_vif: true, poids_carcasse: true, rendement: true, pertes: true, frais_abattage: true, frais_decoupe: true, frais_emballage: true, frais_transport: true, autres_frais: true, produit_fini: true, stock_fields: true, proof: true },
    defaults: { destination: 'stock', create_stock: true, produit_fini_type: 'autre' },
  },
};

export function getTransformTypeProfile(type = 'abattage') {
  return TRANSFORM_TYPE_PROFILES[type] || TRANSFORM_TYPE_PROFILES.abattage;
}

export const PRODUIT_FINI_TYPES = [
  { value: 'viande_fraiche', label: 'Viande fraîche' },
  { value: 'carcasse', label: 'Carcasse' },
  { value: 'pieces', label: 'Pièces' },
  { value: 'autre', label: 'Autre' },
];

const lowerNorm = (value = '') => lower(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function meatProductForAnimal(animal = {}, ageClass = '') {
  const type = lowerNorm(animal.type);
  const sexe = lowerNorm(animal.sexe);
  const name = lowerNorm(`${animal.name || ''} ${animal.race || ''} ${animal.categorie || ''}`);
  const age = lowerNorm(ageClass || animal.age_class || animal.classe_age || '');
  if (type.includes('caprin') || name.includes('chevre')) return { produit: 'Viande de chèvre', categorie: 'produit_fini_viande_caprine' };
  if (type.includes('ovin') || name.includes('mouton') || name.includes('agneau')) {
    if (age.includes('jeune') || age.includes('agneau') || name.includes('agneau')) {
      return { produit: 'Viande d’agneau', categorie: 'produit_fini_viande_ovine_agneau' };
    }
    return { produit: 'Viande de mouton', categorie: 'produit_fini_viande_ovine' };
  }
  if (type.includes('bovin') || name.includes('boeuf') || name.includes('vache') || name.includes('veau')) {
    if (age.includes('veau') || name.includes('veau')) {
      return { produit: 'Viande de veau', categorie: 'produit_fini_viande_bovine_veau' };
    }
    if (sexe === 'f' || sexe.includes('femelle') || name.includes('vache')) {
      return { produit: 'Viande de vache', categorie: 'produit_fini_viande_bovine_vache' };
    }
    return { produit: 'Viande de bœuf', categorie: 'produit_fini_viande_bovine_boeuf' };
  }
  return { produit: 'Viande animale', categorie: 'produit_fini_viande_animale' };
}

export function transformationFees(form = {}) {
  return num(form.frais_abattage) + num(form.frais_decoupe) + num(form.frais_emballage)
    + num(form.frais_transport) + num(form.autres_frais);
}

export function computeCarcassYield(poidsVif = 0, poidsCarcasse = 0) {
  const live = num(poidsVif);
  const carcass = num(poidsCarcasse);
  if (live <= 0 || carcass <= 0) return null;
  return Number(((carcass / live) * 100).toFixed(1));
}

export function computeTransformationCosting({
  form = {},
  animal = null,
  lot = null,
  alimentationLogs = [],
  productionLogs = [],
  healthRows = [],
  businessEvents = [],
} = {}) {
  const effectif = Math.max(1, num(form.effectif || form.sujets_concernes) || 1);
  const transformFees = transformationFees(form);
  const pertes = num(form.pertes);

  let base = null;
  if (animal) {
    base = calculateUnifiedAnimalCost({
      animal,
      alimentationLogs,
      vaccins: healthRows,
      healthEvents: healthRows,
      directCharges: businessEvents,
      slaughterEvents: businessEvents,
    });
  } else if (lot) {
    base = calculateUnifiedLotCost({
      lot,
      alimentationLogs,
      productionLogs,
      healthEvents: healthRows,
      directCharges: businessEvents,
      slaughterEvents: businessEvents,
    });
  }

  const purchase = base ? num(base.purchaseCost) : 0;
  const feed = base ? num(base.feedingCost) : 0;
  const health = base ? num(base.healthCost) : 0;
  const otherDirect = base ? num(base.otherCost) : 0;
  const incomplete = base ? Boolean(base.costMissing || !base.costComplete) : true;
  const warnings = base ? [...arr(base.warnings)] : ['Données de coût absentes'];

  const activeLotCount = lot ? Math.max(1, avicoleActiveCount(lot)) : 1;
  const share = animal ? 1 : effectif / activeLotCount;
  const allocatedBase = (purchase + feed + health + otherDirect) * share;
  const totalCost = allocatedBase + transformFees + pertes;
  const qtyKg = num(form.quantite_produit || form.poids_carcasse || form.poids_produit_fini);
  const costPerKg = qtyKg > 0 ? totalCost / qtyKg : 0;
  const salePrice = num(form.prix_vente_estime || animal?.prix_vente || lot?.prix_vente);
  const margin = salePrice > 0 && qtyKg > 0 ? (salePrice * qtyKg) - totalCost : null;

  return {
    purchaseCost: purchase * share,
    feedCost: feed * share,
    healthCost: health * share,
    otherDirectCost: otherDirect * share,
    transformFees,
    pertes,
    totalCost: Number(totalCost.toFixed(2)),
    costPerKg: Number(costPerKg.toFixed(2)),
    marginEstimee: margin != null ? Number(margin.toFixed(2)) : null,
    incomplete,
    warnings,
    costMessage: incomplete
      ? 'Coût de revient partiel : certaines données alimentation, santé ou achat sont manquantes.'
      : '',
  };
}

function stockKey(produit, sourceRecordId) {
  return `${lowerNorm(produit)}::${sourceRecordId}`;
}

async function upsertMeatStock({
  stocks = [],
  onCreateStock,
  onUpdateStock,
  produit,
  categorie,
  quantityDelta,
  sourceModule,
  sourceRecordId,
  unitCost,
  eventId,
  origineLabel,
  emplacement,
  dlc,
  farmId,
  transformationId,
}) {
  const delta = num(quantityDelta);
  if (!delta || delta <= 0) return { stockId: '', created: false };

  const existing = arr(stocks).find((row) =>
    stockKey(row.produit, row.source_record_id || row.origine_id) === stockKey(produit, sourceRecordId),
  );

  if (existing && onUpdateStock) {
    const previousQty = stockQuantity(existing);
    const nextQty = previousQty + delta;
    const previousUnit = num(existing.cout_revient_unitaire ?? existing.prix_unitaire ?? existing.prixUnit);
    const weightedUnit = nextQty > 0
      ? ((previousQty * previousUnit) + (delta * num(unitCost))) / nextQty
      : previousUnit;
    await onUpdateStock(existing.id, {
      quantite: Number(nextQty.toFixed(2)),
      prixUnit: Number(weightedUnit.toFixed(2)),
      prixunit: Number(weightedUnit.toFixed(2)),
      prix_unitaire: Number(weightedUnit.toFixed(2)),
      cout_revient_unitaire: Number(weightedUnit.toFixed(2)),
      last_movement_type: 'entree_transformation',
      last_movement_label: 'Transformation officielle',
      last_movement_qty: Number(delta.toFixed(2)),
      last_movement_at: new Date().toISOString(),
      linked_event_id: eventId,
      linked_transformation_id: transformationId,
      source_type: 'transformation',
      farm_id: farmId || existing.farm_id,
    });
    return { stockId: existing.id, created: false };
  }

  if (!onCreateStock) return { stockId: '', created: false };

  const payload = buildMeatStockPayload({
    produit,
    categorie,
    quantite: delta,
    unitCost,
    sourceModule,
    sourceRecordId,
    eventId,
    origineLabel,
    emplacement,
    date: today(),
  });
  payload.id = makeId('STKVIANDE');
  payload.source_module = 'elevage';
  payload.source_type = 'transformation';
  payload.linked_transformation_id = transformationId;
  payload.farm_id = farmId || '';
  if (dlc) payload.date_peremption = dlc;
  await onCreateStock(payload);
  return { stockId: payload.id, created: true, stockRow: payload };
}

export function validateOfficialTransformationForm(form = {}) {
  if (!clean(form.animal_id) && !clean(form.lot_id)) return 'Animal ou lot obligatoire.';
  if (!clean(form.transform_type)) return 'Type de transformation obligatoire.';
  if (!form.confirmed) return 'Confirmation humaine obligatoire avant validation.';
  const profile = getTransformTypeProfile(form.transform_type);
  const qty = num(form.quantite_produit || form.poids_carcasse);
  if (profile.show.poids_carcasse && form.destination !== 'perte' && form.create_stock && qty <= 0) {
    return 'Poids carcasse / produit fini obligatoire pour ce type.';
  }
  if (form.transform_type === 'mortalite_lot' && !clean(form.lot_id)) {
    return 'Lot avicole obligatoire pour mortalité de bande.';
  }
  if (form.transform_type === 'mortalite_lot' && !num(form.effectif) && !num(form.pertes)) {
    return 'Effectif ou montant de perte obligatoire pour mortalité lot.';
  }
  if (form.transform_type === 'mortalite_animal' && !clean(form.animal_id)) {
    return 'Animal obligatoire pour mortalité individuelle.';
  }
  if (form.sanitary_override && !clean(form.sanitary_override_reason)) {
    return 'Justification obligatoire pour une dérogation sanitaire.';
  }
  return '';
}

/**
 * Commit officiel — une seule voie pour créer stock viande après validation.
 */
export async function commitOfficialTransformation({
  form = {},
  context = {},
  handlers = {},
} = {}) {
  const err = validateOfficialTransformationForm(form);
  if (err) throw new Error(err);

  const animalId = clean(form.animal_id);
  const lotId = clean(form.lot_id);
  const animal = animalId ? arr(context.animaux).find((a) => clean(a.id) === animalId) : null;
  const lot = lotId ? arr(context.lots).find((l) => clean(l.id) === lotId) : null;

  if (!form.sanitary_override) {
    const block = blockSanitaryAction({
      healthRows: context.health || context.sante || [],
      action: SANITARY_ACTIONS.TRANSFORM,
      animalId,
      lotId,
    });
    if (block.blocked) throw new Error(block.message);
  }

  const transformId = clean(form.id) || makeId('TRF');
  const transformType = clean(form.transform_type) || 'abattage';
  const date = form.date || today();
  const issueKey = buildElevageIssueKey(ELEVAGE_DOMAINS.TRANSFORM, transformId, transformType);
  const farmId = resolveElevageLogFarmId({ form, context });

  const costing = computeTransformationCosting({
    form,
    animal,
    lot,
    alimentationLogs: context.alimentationLogs || context.feedLogs || [],
    productionLogs: context.productionLogs || [],
    healthRows: context.health || context.sante || [],
    businessEvents: context.businessEvents || [],
  });

  const effectif = num(form.effectif || form.sujets_concernes);
  const poidsCarcasse = num(form.poids_carcasse || form.quantite_produit);
  const produitType = clean(form.produit_fini_type) || 'viande_fraiche';
  const destination = clean(form.destination) || 'stock';

  let produitNom = clean(form.produit_fini_nom);
  let categorie = clean(form.categorie_stock) || 'produit_fini_viande_frais';
  if (!produitNom && animal) {
    const p = meatProductForAnimal(animal, form.age_class);
    produitNom = p.produit;
    categorie = p.categorie;
  }
  if (!produitNom && lot) produitNom = `Viande poulet ${lot.name || lot.nom || lot.id}`;
  if (!produitNom) produitNom = 'Viande transformée';

  const record = stampElevageLogFarmId({
    id: transformId,
    date,
    transform_type: transformType,
    kind: transformType,
    animal_id: animalId,
    lot_id: lotId,
    source_type: animalId ? 'animal' : 'lot_avicole',
    effectif,
    poids_vif: num(form.poids_vif),
    poids_carcasse: poidsCarcasse,
    rendement_carcasse: computeCarcassYield(form.poids_vif, poidsCarcasse),
    pertes: num(form.pertes),
    frais_abattage: num(form.frais_abattage),
    frais_decoupe: num(form.frais_decoupe),
    frais_emballage: num(form.frais_emballage),
    frais_transport: num(form.frais_transport),
    autres_frais: num(form.autres_frais),
    produit_fini_type: produitType,
    produit_fini_nom: produitNom,
    quantite_produit: poidsCarcasse,
    unite: clean(form.unite) || 'kg',
    emplacement: clean(form.emplacement) || 'Chambre froide 1',
    dlc: clean(form.dlc || form.date_limite_consommation),
    cout_revient_total: costing.totalCost,
    cout_revient_kg: costing.costPerKg,
    cout_incomplet: costing.incomplete,
    responsable: clean(form.responsable),
    notes: clean(form.notes),
    statut: clean(form.statut) || 'valide',
    destination,
    sanitary_override: Boolean(form.sanitary_override),
    sanitary_override_reason: clean(form.sanitary_override_reason),
    issue_key: issueKey,
    source_module: 'elevage',
    source_type: 'transformation',
    side_effects_managed: true,
    created_from: 'transformation_official',
  }, farmId);

  const eventPayload = {
    id: makeId('EVT'),
    event_type: `transformation_${transformType}`,
    module_source: 'elevage',
    entity_type: lotId ? 'lot_avicole' : 'animal',
    entity_id: lotId || animalId,
    related_id: transformId,
    source_record_id: transformId,
    title: `Transformation · ${transformType}`,
    description: `${produitNom} · ${poidsCarcasse} kg · coût revient ${costing.costPerKg}/kg`,
    event_date: date,
    date,
    montant: costing.transformFees,
    cout: costing.totalCost,
    cout_revient_viande_kg: costing.costPerKg,
    issue_key: issueKey,
    farm_id: farmId,
    side_effects_managed: true,
    sanitary_override: record.sanitary_override,
    sanitary_override_reason: record.sanitary_override_reason,
  };

  if (handlers.onCreateBusinessEvent) await handlers.onCreateBusinessEvent(eventPayload);

  if (lotId && handlers.onUpdateLot) {
    if (transformType === 'mortalite_lot') {
      const qty = Math.max(1, num(form.effectif) || 1);
      const prevDead = avicoleDeadCount(lot);
      const newDead = prevDead + qty;
      const prevActive = avicoleActiveCount(lot);
      const nextActive = Math.max(0, prevActive - qty);
      const lossUnit = num(lot.prix_unitaire_sujet ?? lot.unit_cost ?? lot.cout_unitaire_poussin);
      const economicLoss = num(form.pertes) || qty * lossUnit;
      await handlers.onUpdateLot(lotId, {
        mortality: newDead,
        morts: newDead,
        current_count: nextActive,
        effectif_actuel: nextActive,
        last_event_date: date,
        last_health_note: clean(form.notes) || 'Mortalité lot',
        status: nextActive === 0 ? 'perdu_mortalite' : (lot.status || 'actif'),
        statut: nextActive === 0 ? 'perdu_mortalite' : (lot.statut || 'actif'),
        valeur_perte_estimee: num(lot.valeur_perte_estimee) + economicLoss,
        perte_estimee: num(lot.valeur_perte_estimee) + economicLoss,
      });
    } else {
    const nextActive = Math.max(0, avicoleActiveCount(lot) - (effectif || avicoleActiveCount(lot)));
    const statusMap = { abattage: 'abattu', reforme: 'reforme', sortie_vente_vivant: 'pret_vente', pret_vente: 'pret_vente' };
    const status = statusMap[transformType] || form.statut_lot || 'pret_vente';
    await handlers.onUpdateLot(lotId, {
      current_count: transformType === 'pret_vente' || transformType === 'sortie_vente_vivant'
        ? avicoleActiveCount(lot)
        : nextActive,
      effectif_actuel: transformType === 'pret_vente' || transformType === 'sortie_vente_vivant'
        ? avicoleActiveCount(lot)
        : nextActive,
      vendus: num(lot.vendus) + (effectif || 0),
      sujets_abattus: num(lot.sujets_abattus) + (effectif || 0),
      status,
      statut: status,
      date_sortie: date,
      last_slaughter_date: date,
      cout_revient_viande_kg: costing.costPerKg,
    });
    }
  }

  if (animalId && handlers.onUpdateAnimal) {
    if (transformType === 'mortalite_animal') {
      await handlers.onUpdateAnimal(animalId, {
        status: 'mort',
        statut: 'mort',
        date_sortie: date,
        date_deces: date,
        cause_deces: clean(form.notes) || '',
      });
    } else {
    const animalStatus = transformType === 'abattage' || transformType === 'reforme' ? 'abattu' : 'pret_vente';
    await handlers.onUpdateAnimal(animalId, {
      status: animalStatus,
      statut: animalStatus,
      date_abattage: transformType === 'abattage' ? date : animal?.date_abattage,
      date_sortie: date,
      poids_carcasse: poidsCarcasse,
      produit_stock: produitNom,
      cout_revient_viande_kg: costing.costPerKg,
    });
    }
  }

  if ((transformType === 'mortalite_lot' || transformType === 'mortalite_animal') && handlers.onCreateFinanceTransaction) {
    let economicLoss = num(form.pertes);
    if (!economicLoss && lot) {
      const qty = Math.max(1, num(form.effectif) || 1);
      economicLoss = qty * num(lot.prix_unitaire_sujet ?? lot.unit_cost ?? lot.cout_unitaire_poussin);
    }
    if (!economicLoss && animal) {
      economicLoss = num(animal.cout_achat ?? animal.purchase_cost ?? animal.prix_achat ?? animal.cout_acquisition);
    }
    if (economicLoss > 0) {
      const financeId = `TRX-MORT-${transformType}-${lotId || animalId}-${date}`;
      const exists = arr(context.transactions).some((t) => clean(t.id) === financeId);
      if (!exists) {
        await handlers.onCreateFinanceTransaction(stampElevageLogFarmId({
          id: financeId,
          type: 'sortie',
          libelle: `Perte mortalité ${animal ? (animal.name || animal.nom || animalId) : (lot?.name || lot?.nom || lotId)}`,
          montant: economicLoss,
          amount: economicLoss,
          date,
          categorie: 'Pertes',
          activite: lotId ? 'avicole' : 'elevage',
          module_lie: 'elevage',
          source_module: 'elevage',
          source_record_id: lotId || animalId,
          issue_key: issueKey,
          side_effects_managed: true,
        }, farmId));
      }
    }
  }

  let stockId = '';
  let stockCreated = false;

  if (form.create_stock && destination !== 'perte' && poidsCarcasse > 0) {
    const sourceModule = animalId ? 'animaux' : 'avicole';
    const sourceRecordId = animalId || lotId;
    const stockResult = await upsertMeatStock({
      stocks: context.stocks || [],
      onCreateStock: handlers.onCreateStock,
      onUpdateStock: handlers.onUpdateStock,
      produit: produitNom,
      categorie,
      quantityDelta: poidsCarcasse,
      sourceModule,
      sourceRecordId,
      unitCost: costing.costPerKg,
      eventId: eventPayload.id,
      origineLabel: animal ? (animal.name || animal.tag || animalId) : (lot?.name || lot?.nom || lotId),
      emplacement: record.emplacement,
      dlc: record.dlc,
      farmId,
      transformationId: transformId,
    });
    stockId = stockResult.stockId || '';
    stockCreated = stockResult.created;

    if (stockId && handlers.onCreateStockMovement) {
      await handlers.onCreateStockMovement({
        id: makeId('MVT'),
        stock_id: stockId,
        type: 'entree',
        quantite: poidsCarcasse,
        unite: record.unite,
        motif: `Transformation ${transformType} · ${transformId}`,
        date,
        source_module: 'elevage',
        source_type: 'transformation',
        source_record_id: transformId,
        issue_key: issueKey,
        farm_id: farmId,
      });
    }
  }

  const proofUrl = clean(form.preuve_url || form.certificat_url);
  const photoData = clean(form.preuve_photo_data);
  if ((proofUrl || photoData) && handlers.onCreateDocument) {
    const docCategory = /certificat|sanitaire/i.test(form.preuve_type || '')
      ? 'certificat_sanitaire'
      : 'transformation';
    await handlers.onCreateDocument({
      id: makeId('DOC'),
      title: clean(form.document_title) || `Transformation ${transformType}`,
      document_category: docCategory,
      module_source: 'elevage',
      entity_type: 'transformation',
      entity_id: transformId,
      related_id: transformId,
      animal_id: animalId,
      lot_id: lotId,
      file_url: proofUrl || '',
      preuve_photo_data: photoData || '',
      issue_key: issueKey,
      farm_id: farmId,
      side_effects_managed: true,
      created_from: 'transformation_official',
    });
  }

  const activeWithdrawals = findActiveWithdrawals(context.health || context.sante || []);
  const sanitaryActive = activeWithdrawals.some((row) =>
    (animalId && clean(row.animal_id) === animalId)
    || (lotId && clean(row.lot_id) === lotId),
  );

  return {
    ok: true,
    transformId,
    issueKey,
    stockId,
    stockCreated,
    costing,
    record,
    commercialBlocked: sanitaryActive && !form.sanitary_override,
    prixPlancher: costing.costPerKg > 0 ? Number((costing.costPerKg * 1.15).toFixed(2)) : null,
  };
}
