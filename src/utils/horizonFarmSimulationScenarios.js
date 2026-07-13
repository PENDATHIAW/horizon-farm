/**
 * Scénarios de test supplémentaires pour le mode données simulées (tous modules ERP).
 * Fusionné dans horizonFarmSimulationSeed via mergeSimulationScenarios().
 */

const DAY = 86400000;
const dateDaysAgo = (days) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
const dateDaysFromNow = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

const id = (prefix, n) => `${prefix}-${String(n).padStart(3, '0')}`;
const money = (value) => Math.round(Number(value || 0));
const SOURCE = 'simulation_bp_horizon_farm';

const event = (n, event_type, module_source, entity_type, entity_id, title, description, severity = 'info', extra = {}) => ({
  id: id('HF-EVT-X', n),
  event_type,
  type_evenement: event_type,
  module_source,
  entity_type,
  entity_id,
  source_id: entity_id,
  related_id: entity_id,
  title,
  description,
  severity,
  status: extra.status || 'confirme',
  event_date: extra.event_date || dateDaysAgo(1),
  date: extra.event_date || dateDaysAgo(1),
  amount: extra.amount || null,
  montant: extra.amount || null,
  quantity: extra.quantity,
  unit: extra.unit,
  linked_sale_id: extra.linked_sale_id || '',
  source: SOURCE,
  ...extra,
});

export function buildExtraElevageSalesOrders() {
  const rows = [
    ['HF-CMD-007', dateDaysAgo(3), 'HF-CLI-002', 'HF-CH-003', 'lot_avicole', 'avicole', 'Chair HF-CH-003 vente partielle', 115, 'tête', 3700, 'livraison', 12000, true, 'paye', 437500, 437500, 'chair'],
    ['HF-CMD-008', dateDaysAgo(14), 'HF-CLI-004', 'HF-BOV-002', 'animal', 'animaux', 'Bovin embouche 2', 1, 'tête', 395000, 'recupere', 0, true, 'paye', 395000, 395000, 'animal'],
    ['HF-CMD-009', dateDaysAgo(5), 'HF-CLI-004', 'HF-CAP-002', 'animal', 'animaux', 'Caprin embouche 2', 1, 'tête', 78000, 'livraison', 0, true, 'partiel', 78000, 40000, 'animal'],
    ['HF-CMD-010', dateDaysAgo(1), 'HF-CLI-001', 'HF-PO-001', 'lot_avicole', 'avicole', 'Œufs plateaux semaine 2', 520, 'tablette', 2850, 'livraison', 8000, true, 'non_paye', 1490000, 0, 'oeufs_tablettes'],
  ];
  return rows.map(([orderId, date, client_id, source_id, source_type, source_module, product_name, quantity, unit, unit_price, mode, fee, invoice, payStatus, total, paid, sale_kind]) => ({
    id: orderId,
    date,
    date_commande: date,
    client_id,
    source_id,
    source_type,
    source_module,
    source_label: product_name,
    product_name,
    produit: product_name,
    quantity,
    quantite: quantity,
    unit,
    unite: unit,
    unit_price,
    prix_unitaire: unit_price,
    sale_kind,
    montant_ht: total - fee,
    total,
    total_amount: total,
    montant_total: total,
    chiffre_affaires: total,
    montant_paye: paid,
    paid_amount: paid,
    reste_a_payer: Math.max(0, total - paid),
    statut_commande: 'livre',
    statut_livraison: mode === 'livraison' ? 'livre' : 'recupere',
    fulfillment_mode: mode,
    frais_livraison: fee,
    facture_emise: invoice,
    invoice_status: invoice ? 'emise' : 'non_emise',
    invoice_id: invoice ? orderId.replace('CMD', 'FAC') : '',
    statut_paiement: payStatus,
    payment_status: payStatus,
    source: SOURCE,
  }));
}

export function buildTransformationSaleEvents(salesOrders = []) {
  return salesOrders
    .filter((o) => {
      const mod = String(o.source_module || '').toLowerCase();
      return mod.includes('animaux') || mod.includes('animal') || mod.includes('avicole');
    })
    .map((o, idx) => event(
      200 + idx,
      'sortie_vente_elevage',
      'elevage',
      String(o.source_type || '').includes('animal') ? 'animal' : 'lot_avicole',
      o.source_id,
      `Vente enregistrée : ${o.product_name || o.id}`,
      `Commande ${o.id} · ${o.quantity} ${o.unit} · ${money(o.montant_total)} FCFA - visible Transformation`,
      'info',
      {
        amount: money(o.montant_total),
        quantity: o.quantity,
        unit: o.unit,
        linked_sale_id: o.id,
        event_date: o.date,
      },
    ));
}

export function buildExtraSimulationEntities() {
  return {
    animaux_extra: [
      {
        id: 'HF-BOV-010',
        tag: 'HF-BOV-010',
        name: 'Bovin abattu démo',
        type: 'Bovin',
        espece: 'Bovin',
        sexe: 'M',
        poids: 312,
        poids_carcasse: 185,
        status: 'abattu',
        statut: 'abattu',
        date_abattage: dateDaysAgo(20),
        produit_stock: 'Viande de bœuf',
        cout_abattage: 45000,
        purchase_cost: 240000,
        prix_achat: 240000,
        health_status: 'sain',
        source: SOURCE,
      },
      {
        id: 'HF-CAP-004',
        tag: 'HF-CAP-004',
        name: 'Caprin réforme démo',
        type: 'Caprin',
        espece: 'Caprin',
        sexe: 'F',
        poids: 38,
        status: 'reforme',
        statut: 'reforme',
        date_reforme: dateDaysAgo(15),
        motif_reforme: 'Faible croissance',
        valeur_residuelle: 35000,
        purchase_cost: 48000,
        health_status: 'a_surveiller',
        source: SOURCE,
      },
      {
        id: 'HF-OV-005',
        tag: 'HF-OV-005',
        name: 'Ovin mortalité démo',
        type: 'Ovin',
        espece: 'Ovin',
        sexe: 'M',
        poids: 41,
        status: 'mort',
        statut: 'mort',
        date_deces: dateDaysAgo(12),
        cause_deces: 'Maladie respiratoire',
        valeur_perte_estimee: 55000,
        purchase_cost: 60000,
        health_status: 'malade',
        source: SOURCE,
      },
    ],
    business_events_extra: [
      event(210, 'abattage_animal', 'animaux_abattage', 'animal', 'HF-BOV-010', 'Abattage bovin HF-BOV-010', '185 kg viande → stock', 'info', { amount: 45000, quantity: 185, unit: 'kg', event_date: dateDaysAgo(20) }),
      event(211, 'mortalite_lot', 'avicole', 'lot_avicole', 'HF-CH-005', 'Mortalité lot retard poids', '8 sujets - impact effectif', 'warning', { amount: 52000, quantity: 8, unit: 'sujet', event_date: dateDaysAgo(6) }),
      event(212, 'reforme_pondeuses', 'avicole', 'lot_avicole', 'HF-PO-001', 'Réforme pondeuses planifiée', 'Simulation réforme 17+ mois', 'info', { event_date: dateDaysFromNow(45) }),
    ],
    stock_extra: [
      { id: 'HF-STK-007', produit: 'Viande de bœuf (abattage)', nom: 'Viande de bœuf (abattage)', quantite: 142, unite: 'kg', seuil: 20, prixUnit: 3200, prixunit: 3200, categorie: 'produit_fini_viande', is_sellable: true, source_module: 'animaux', source_record_id: 'HF-BOV-010', source: SOURCE },
      { id: 'HF-STK-008', produit: 'Viande poulet HF-CH-001', nom: 'Viande poulet HF-CH-001', quantite: 88, unite: 'kg', seuil: 15, prixUnit: 3800, prixunit: 3800, categorie: 'produit_fini_viande_avicole', is_sellable: true, source_module: 'avicole', source_record_id: 'HF-CH-001', source: SOURCE },
    ],
    price_catalog_extra: [
      { id: 'HF-PRICE-002', produit: 'Bovin embouche kg', product_category: 'bovin', price: 2800, prix_vente: 2800, unit: 'kg', observed_at: dateDaysAgo(3), confidence_level: 'confirme', source: SOURCE },
      { id: 'HF-PRICE-003', produit: 'Poulet chair sujet', product_category: 'poulet_chair', price: 3700, prix_vente: 3700, unit: 'sujet', observed_at: dateDaysAgo(2), confidence_level: 'confirme', source: SOURCE },
      { id: 'HF-PRICE-004', produit: 'Ovin kg', product_category: 'ovin', price: 4500, prix_vente: 4500, unit: 'kg', observed_at: dateDaysAgo(4), confidence_level: 'estime', source: SOURCE },
    ],
    rh: [
      { id: 'HF-RH-001', nom: 'Mamadou Diop', poste: 'Chef avicole', affectation: 'avicole', tel: '+221771234501', email: 'mamadou@horizonfarm.demo', salaire: 95000, statut: 'actif', source: SOURCE },
      { id: 'HF-RH-002', nom: 'Awa Ndiaye', poste: 'Responsable embouche', affectation: 'animaux', tel: '+221771234502', email: 'awa@horizonfarm.demo', salaire: 85000, statut: 'actif', source: SOURCE },
      { id: 'HF-RH-003', nom: 'Cheikh Fall', poste: 'Commercial terrain', affectation: 'ventes', tel: '+221771234503', email: 'cheikh@horizonfarm.demo', salaire: 70000, statut: 'actif', source: SOURCE },
    ],
    tracabilite: [
      { id: 'HF-TRC-001', entity_type: 'animal', entity_id: 'HF-BOV-001', module_source: 'animaux', event_type: 'vente', label: 'Vente bovin HF-BOV-001', date: dateDaysAgo(10), related_id: 'HF-CMD-005', source: SOURCE },
      { id: 'HF-TRC-002', entity_type: 'lot_avicole', entity_id: 'HF-CH-001', module_source: 'avicole', event_type: 'vente', label: 'Lot chair cycle 1 vendu', date: dateDaysAgo(92), related_id: 'HF-CMD-001', source: SOURCE },
      { id: 'HF-TRC-003', entity_type: 'animal', entity_id: 'HF-BOV-010', module_source: 'animaux', event_type: 'abattage', label: 'Abattage → stock viande', date: dateDaysAgo(20), source: SOURCE },
    ],
    equipements: [
      { id: 'HF-EQP-001', nom: 'Balance pesée animaux', type: 'Balance', statut: 'actif', zone: 'enclos_embouche', source: SOURCE },
      { id: 'HF-EQP-002', nom: 'Tracteur distribution aliment', type: 'Tracteur', statut: 'maintenance', zone: 'stock_aliment', source: SOURCE },
    ],
    rapports: [
      { id: 'HF-RPT-001', titre: 'Rentabilité lots chair Q1 simulation', type: 'rentabilite', module: 'avicole', date: dateDaysAgo(7), statut: 'genere', source: SOURCE },
      { id: 'HF-RPT-002', titre: 'Suivi créances clients simulation', type: 'finance', module: 'ventes', date: dateDaysAgo(2), statut: 'genere', source: SOURCE },
    ],
    sensor_devices: [
      { id: 'HF-SEN-001', nom: 'Capteur température poulailler A', zone: 'poulailler', status: 'simulation', source_type: 'simulation', last_value: 28.5, unit: '°C', source: SOURCE },
    ],
    camera_devices: [
      { id: 'HF-CAM-001', nom: 'Caméra entrée enclos', zone: 'entree_principale', status: 'simulation', source_type: 'simulation', source: SOURCE },
    ],
    whatsapp_templates: [
      { id: 'HF-WAT-001', name: 'Relance créance client', body: 'Bonjour {client}, rappel facture {montant} FCFA.', module: 'ventes', source: SOURCE },
    ],
    sales_opportunities_extra: [
      { id: 'HF-OPP-003', title: 'Finaliser vente œufs HF-PO-001', source_type: 'lot_avicole', source_id: 'HF-PO-001', quantity: 520, unit: 'tablette', estimated_value: 1490000, status: 'en_cours', priority: 'moyenne', reason: 'Commande HF-CMD-010 non payée.', detected_at: dateDaysAgo(1), source: SOURCE },
      { id: 'HF-OPP-004', title: 'Caprin HF-CAP-002 solde encaissement', source_type: 'animal', source_id: 'HF-CAP-002', quantity: 1, unit: 'tête', estimated_value: 38000, status: 'nouveau', priority: 'moyenne', reason: 'Reste à encaisser sur HF-CMD-009.', detected_at: dateDaysAgo(1), source: SOURCE },
    ],
    alertes_extra: [
      { id: 'HF-ALT-003', title: 'Vente animal visible Transformation', message: 'Les ventes HF-CMD-005/006/007/008 apparaissent dans Élevage → Transformation.', module_source: 'elevage', entity_id: 'HF-CMD-005', severity: 'info', status: 'nouvelle', action_recommandee: 'Contrôler journal Transformation.', source: SOURCE },
    ],
    taches_extra: [
      { id: 'HF-TSK-004', title: 'Encaisser HF-CMD-010 œufs', module_lie: 'ventes', related_id: 'HF-CMD-010', due_date: dateDaysFromNow(2), priority: 'haute', status: 'a_faire', checklist: 'Relance client; paiement Wave', source: SOURCE },
    ],
  };
}

const mergeById = (base = [], extra = [], key = 'id') => {
  const map = new Map();
  [...arr(base), ...arr(extra)].forEach((row) => { if (row?.[key]) map.set(String(row[key]), row); });
  return [...map.values()];
};
const arr = (v) => (Array.isArray(v) ? v : []);

export function mergeSimulationScenarios(base = {}) {
  const extra = buildExtraSimulationEntities();
  const extraOrders = buildExtraElevageSalesOrders();
  const allOrders = mergeById(base.sales_orders, extraOrders);
  const saleEvents = buildTransformationSaleEvents(allOrders);

  return {
    ...base,
    animaux: mergeById(base.animaux, extra.animaux_extra),
    stock: mergeById(base.stock, extra.stock_extra),
    stocks: mergeById(base.stocks, extra.stock_extra),
    sales_orders: allOrders,
    ventes: allOrders,
    business_events: [...arr(base.business_events), ...extra.business_events_extra, ...saleEvents],
    price_catalog: [...arr(base.price_catalog), ...extra.price_catalog_extra],
    rh: extra.rh,
    tracabilite: extra.tracabilite,
    equipements: extra.equipements,
    rapports: extra.rapports,
    sensor_devices: extra.sensor_devices,
    camera_devices: extra.camera_devices,
    whatsapp_templates: extra.whatsapp_templates,
    sales_opportunities: [...arr(base.sales_opportunities), ...extra.sales_opportunities_extra],
    alertes_center: [...arr(base.alertes_center), ...extra.alertes_extra],
    taches: [...arr(base.taches), ...extra.taches_extra],
  };
}
