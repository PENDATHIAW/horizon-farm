const DAY = 86400000;
const dateDaysAgo = (days) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
const dateDaysFromNow = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
const isoNow = () => new Date().toISOString();

const id = (prefix, n) => `${prefix}-${String(n).padStart(3, '0')}`;
const money = (value) => Math.round(Number(value || 0));

const client = (n, nom, type, prefs) => ({ id: id('HF-CLI', n), nom, name: nom, type, prefs, statut: n <= 3 ? 'VIP / Gros acheteur' : 'actif', score: 4 + (n % 5) / 10, tel: `+221 77 10${n} 20${n}`, whatsapp: `+221 77 10${n} 20${n}`, email: `client${n}@horizonfarm.demo`, adresse: 'Dakar / Thiès / Mbour', source: 'simulation_bp_horizon_farm' });
const fournisseur = (n, nom, categorie) => ({ id: id('HF-FOU', n), nom, name: nom, categorie, statut: 'fiable', contact: 'Responsable commercial', note: 4.4, tel: `+221 76 30${n} 40${n}`, whatsapp: `+221 76 30${n} 40${n}`, email: `fournisseur${n}@horizonfarm.demo`, dettes: n === 2 ? 185000 : 0, livraisons: 8 + n, source: 'simulation_bp_horizon_farm' });
const stock = (n, produit, quantite, unite, seuil, prixUnit, categorie, extra = {}) => ({ id: id('HF-STK', n), produit, nom: produit, quantite, unite, seuil, prixUnit, prixunit: prixUnit, prix_unitaire: prixUnit, categorie, category: categorie, is_sellable: Boolean(extra.is_sellable), source: 'simulation_bp_horizon_farm', ...extra });
const finance = (n, type, libelle, montant, date, categorie, module_lie, related_id, extra = {}) => ({ id: id('HF-TRX', n), type, libelle, description: libelle, montant: money(montant), date, categorie, module_lie, related_id, statut: extra.statut || 'paye', paiement: extra.paiement || 'Wave', moyen_paiement: extra.paiement || 'Wave', client_id: extra.client_id || '', fournisseur_id: extra.fournisseur_id || '', source_module: module_lie, source_record_id: related_id, activite: extra.activite || module_lie, source: 'simulation_bp_horizon_farm', ...extra });
const event = (n, event_type, module_source, entity_type, entity_id, title, description, severity = 'info', extra = {}) => ({ id: id('HF-EVT', n), event_type, module_source, entity_type, entity_id, title, description, severity, status: 'nouveau', event_date: extra.event_date || dateDaysAgo(1), amount: extra.amount || null, decision_key: extra.decision_key || '', source: 'simulation_bp_horizon_farm', ...extra });
const task = (n, title, module_lie, related_id, due_date, priority, checklist, extra = {}) => ({ id: id('HF-TSK', n), title, module_lie, related_id, due_date, priority, status: extra.status || 'a_faire', checklist, source_module: module_lie, decision_key: extra.decision_key || '', source: 'simulation_bp_horizon_farm', ...extra });
const alert = (n, title, message, module_source, entity_id, severity, action, extra = {}) => ({ id: id('HF-ALT', n), title, message, module_source, entity_type: extra.entity_type || module_source, entity_id, severity, status: 'nouvelle', action_recommandee: action, decision_key: extra.decision_key || '', source: 'simulation_bp_horizon_farm', ...extra });
const document = (n, title, category, module_source, entity_type, entity_id, extra = {}) => ({ id: id('HF-DOC', n), title, document_type: category, document_category: category, module_lie: module_source, module_source, entity_type, entity_id, related_id: entity_id, status: 'actif', file_url: '', tags: `simulation,bp,horizon,${category}`, source: 'simulation_bp_horizon_farm', ...extra });

function buildLots() {
  return [
    { id: 'HF-PO-001', name: 'BP Pondeuses 4000 - ponte active', type: 'Pondeuse', type_lot: 'Pondeuse', phase: 'Production', initial_count: 4000, current_count: 3880, mortality: 72, malades: 18, vendus: 0, reformes: 0, frais_sante: 195000, health_status: 'sain', status: 'en_ponte', date_debut: dateDaysAgo(210), age_days: 210, debut_ponte: dateDaysAgo(60), taux_ponte: 78, productionJour: 3026, weight_avg: 1.82, ic: 2.2, prix_oeuf_plateau: 2800, revenuEstime: 8472800, marge: 2630000, scoresSante: 88, source: 'simulation_bp_horizon_farm' },
    { id: 'HF-CH-001', name: 'Chair cycle 1 - vendu 42 jours', type: 'Chair', type_lot: 'Chair', phase: 'Terminé', initial_count: 200, current_count: 0, mortality: 6, vendus: 194, frais_sante: 22000, health_status: 'sain', status: 'vendu', date_debut: dateDaysAgo(135), date_fin_reelle: dateDaysAgo(93), age_days: 42, weight_avg: 1.72, poids_cible: 1.5, ic: 1.88, cout_poussins: 130000, cout_aliment: 178000, prix_vente_reel: 3800, revenuEstime: 737200, marge: 321200, ready_to_sell: false, source: 'simulation_bp_horizon_farm' },
    { id: 'HF-CH-002', name: 'Chair cycle 2 - vendu partiel 38 jours', type: 'Chair', type_lot: 'Chair', phase: 'Terminé', initial_count: 200, current_count: 0, mortality: 5, vendus: 195, frais_sante: 18000, health_status: 'sain', status: 'vendu', date_debut: dateDaysAgo(88), date_fin_reelle: dateDaysAgo(50), age_days: 38, weight_avg: 1.58, poids_cible: 1.5, ic: 1.82, cout_poussins: 130000, cout_aliment: 166000, prix_vente_reel: 3650, revenuEstime: 711750, marge: 337750, ready_to_sell: false, source: 'simulation_bp_horizon_farm' },
    { id: 'HF-CH-003', name: 'Chair prêt à vendre - 35 jours 1,52 kg', type: 'Chair', type_lot: 'Chair', phase: 'Finition', initial_count: 200, current_count: 192, mortality: 5, malades: 3, vendus: 0, frais_sante: 26000, health_status: 'sain', status: 'pret_vente', date_debut: dateDaysAgo(35), age_days: 35, weight_avg: 1.52, poids_cible: 1.5, ic: 1.79, cout_poussins: 130000, cout_aliment: 154000, prix_vente_prevu: 3700, revenuEstime: 710400, marge: 330400, ready_to_sell: true, partial_sale_recommended: true, recommended_sale_qty: 115, decision_key: 'avicole:HF-CH-003:vente_partielle', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-CH-004', name: 'Chair croissance normale - 28 jours', type: 'Chair', type_lot: 'Chair', phase: 'Croissance', initial_count: 200, current_count: 196, mortality: 2, malades: 1, health_status: 'sain', status: 'en_croissance', date_debut: dateDaysAgo(28), age_days: 28, weight_avg: 1.18, poids_cible: 1.5, ic: 1.72, cout_poussins: 130000, cout_aliment: 116000, prix_vente_prevu: 3700, revenuEstime: 725200, marge: 275200, ready_to_sell: false, source: 'simulation_bp_horizon_farm' },
    { id: 'HF-CH-005', name: 'Chair retard de poids - 40 jours', type: 'Chair', type_lot: 'Chair', phase: 'A corriger', initial_count: 200, current_count: 188, mortality: 8, malades: 7, health_status: 'a_surveiller', status: 'retard_poids', date_debut: dateDaysAgo(40), age_days: 40, weight_avg: 1.31, poids_cible: 1.5, ic: 2.18, cout_poussins: 130000, cout_aliment: 196000, frais_sante: 42000, prix_vente_prevu: 3500, revenuEstime: 658000, marge: 198000, ready_to_sell: false, decision_key: 'avicole:HF-CH-005:retard_poids', source: 'simulation_bp_horizon_farm' },
  ];
}

function buildAnimals() {
  const rows = [];
  [
    ['BOV', 'Bovin', 10, 90, 250000, 365000, 2],
    ['OV', 'Ovin', 5, 90, 60000, 95000, 2],
    ['CAP', 'Caprin', 5, 90, 45000, 75000, 1],
  ].forEach(([prefix, type, count, cycleDays, cost, sale, sold]) => {
    for (let i = 1; i <= count; i += 1) {
      const late = i === count;
      const ready = i <= sold || i === sold + 1;
      const soldStatus = i <= sold;
      const poidsBase = type === 'Bovin' ? 285 : type === 'Ovin' ? 42 : 31;
      const poids = poidsBase + (ready ? 22 : late ? -3 : 10) + i;
      rows.push({ id: `HF-${prefix}-${String(i).padStart(3, '0')}`, tag: `HF-${prefix}-${String(i).padStart(3, '0')}`, name: `${type} embouche ${i}`, type, espece: type, sexe: i % 2 ? 'M' : 'F', poids, poids_initial: poidsBase, poids_cible: type === 'Bovin' ? 330 : type === 'Ovin' ? 55 : 42, purchase_cost: cost, alimentation: type === 'Bovin' ? 72000 : 18000, sante: late ? 14000 : 6500, health_status: late ? 'a_surveiller' : 'sain', status: soldStatus ? 'vendu' : 'actif', date_achat: dateDaysAgo(cycleDays + (soldStatus ? 8 : 0)), date_entree_ferme: dateDaysAgo(cycleDays + (soldStatus ? 8 : 0)), mode_acquisition: 'achat', date_vente: soldStatus ? dateDaysAgo(12 - i) : '', sale_price: soldStatus ? sale : 0, prix_vente_reel: soldStatus ? sale : 0, prix_vente_estime: sale, ready_to_sell: ready && !soldStatus, growth_status: late ? 'retard_poids' : ready ? 'pret_vente' : 'normal', decision_key: ready && !soldStatus ? `animaux:HF-${prefix}-${String(i).padStart(3, '0')}:vendre` : late ? `animaux:HF-${prefix}-${String(i).padStart(3, '0')}:retard_poids` : '', source: 'simulation_bp_horizon_farm' });
    }
  });
  return rows;
}

function buildCultures() {
  return [
    { id: 'HF-CULT-001', nom: 'Laitue Batavia BP', type: 'Laitue', parcelle: 'Zone maraîchère A', surface: 350, date_semis: dateDaysAgo(72), date_recolte_prevue: dateDaysFromNow(3), quantite_prevue: 1200, quantite_recoltee: 0, quantite_disponible: 0, pertes: 45, cout_semences: 45000, cout_engrais: 65000, cout_eau: 36000, cout_main_oeuvre: 98000, cout_traitement: 28000, revenu_estime: 780000, revenu_reel: 0, statut: 'pret_recolte', score_sante: 86, ready_to_harvest: true, decision_key: 'cultures:HF-CULT-001:recolter_vendre', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-CULT-002', nom: 'Tomates Roma BP', type: 'Tomate', parcelle: 'Zone maraîchère B', surface: 520, date_semis: dateDaysAgo(95), date_recolte_prevue: dateDaysAgo(5), date_recolte_reelle: dateDaysAgo(5), quantite_prevue: 2100, quantite_recoltee: 1680, quantite_disponible: 720, pertes: 180, cout_semences: 70000, cout_engrais: 125000, cout_eau: 62000, cout_main_oeuvre: 165000, cout_traitement: 53000, revenu_estime: 1680000, revenu_reel: 864000, statut: 'recolte_partielle', score_sante: 78, ready_to_sell: true, decision_key: 'cultures:HF-CULT-002:vendre_stock_recolte', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-CULT-003', nom: 'Piment Safi BP', type: 'Piment', parcelle: 'Zone maraîchère C', surface: 260, date_semis: dateDaysAgo(125), date_recolte_reelle: dateDaysAgo(28), quantite_prevue: 650, quantite_recoltee: 610, quantite_disponible: 0, pertes: 40, cout_semences: 38000, cout_engrais: 58000, cout_eau: 26000, cout_main_oeuvre: 72000, cout_traitement: 18000, revenu_estime: 715000, revenu_reel: 671000, statut: 'termine', score_sante: 92, source: 'simulation_bp_horizon_farm' },
  ];
}

function buildSalesAndFinance() {
  const orders = [
    ['HF-CMD-001', dateDaysAgo(92), 'HF-CLI-001', 'HF-CH-001', 'lot_avicole', 'Poulets chair cycle 1', 194, 3800, 'recupere', 0, true, 'paye', 737200, 737200],
    ['HF-CMD-002', dateDaysAgo(50), 'HF-CLI-001', 'HF-CH-002', 'lot_avicole', 'Poulets chair cycle 2', 195, 3650, 'livraison', 25000, true, 'partiel', 736750, 500000],
    ['HF-CMD-003', dateDaysAgo(7), 'HF-CLI-002', 'HF-PO-001', 'avicole_oeufs', 'Œufs plateaux semaine 1', 680, 2800, 'livraison', 15000, true, 'paye', 1919000, 1919000],
    ['HF-CMD-004', dateDaysAgo(2), 'HF-CLI-003', 'HF-CULT-002', 'culture', 'Tomates Roma récolte partielle', 720, 1200, 'recupere', 0, true, 'non_paye', 864000, 0],
    ['HF-CMD-005', dateDaysAgo(10), 'HF-CLI-004', 'HF-BOV-001', 'animal', 'Bovin embouche 1', 1, 365000, 'livraison', 40000, true, 'paye', 405000, 405000],
    ['HF-CMD-006', dateDaysAgo(8), 'HF-CLI-004', 'HF-OV-001', 'animal', 'Ovin embouche 1', 1, 95000, 'recupere', 0, false, 'paye', 95000, 95000],
  ];
  const sales_orders = orders.map(([orderId, date, client_id, source_id, source_type, product_name, quantity, unit_price, mode, fee, invoice, payStatus, total, paid]) => ({ id: orderId, date, client_id, source_id, source_type, source_label: product_name, product_name, quantity, unit_price, montant_ht: total - fee, montant_total: total, montant_paye: paid, reste_a_payer: Math.max(0, total - paid), statut_commande: 'livre', statut_livraison: mode === 'livraison' ? 'livre' : 'recupere', fulfillment_mode: mode, frais_livraison: fee, facture_emise: invoice, invoice_status: invoice ? 'emise' : 'non_emise', invoice_id: invoice ? orderId.replace('CMD', 'FAC') : '', statut_paiement: payStatus, payment_status: payStatus, source: 'simulation_bp_horizon_farm' }));
  const sales_order_items = sales_orders.map((o, idx) => ({ id: id('HF-CMDI', idx + 1), order_id: o.id, source_type: o.source_type, source_id: o.source_id, product_name: o.product_name, quantity: o.quantity, unit_price: o.unit_price, total: o.montant_ht, line_total: o.montant_ht, source: 'simulation_bp_horizon_farm' }));
  const invoices = sales_orders.filter((o) => o.facture_emise).map((o, idx) => ({ id: o.invoice_id, order_id: o.id, numero_facture: `FAC-${o.id.slice(-3)}`, date_facture: o.date, montant_total: o.montant_total, statut: 'emise', invoice_status: 'emise', source: 'simulation_bp_horizon_farm' }));
  const payments = sales_orders.filter((o) => Number(o.montant_paye) > 0).map((o, idx) => ({ id: id('HF-PAY', idx + 1), order_id: o.id, sale_id: o.id, source_record_id: o.id, client_id: o.client_id, invoice_id: o.invoice_id || '', date_paiement: o.date, date: o.date, montant: o.montant_paye, montant_paye: o.montant_paye, amount: o.montant_paye, moyen_paiement: idx % 2 ? 'Wave' : 'Orange Money', statut: 'paye', source: 'simulation_bp_horizon_farm' }));
  const deliveries = sales_orders.map((o, idx) => ({ id: id('HF-LIV', idx + 1), order_id: o.id, date_livraison: o.date, statut: 'livre', fulfillment_mode: o.fulfillment_mode, mode_livraison: o.fulfillment_mode, frais_livraison: o.frais_livraison, destinataire: o.client_id, source: 'simulation_bp_horizon_farm' }));
  const documents = invoices.map((inv, idx) => document(idx + 1, `Facture ${inv.numero_facture}`, 'facture', 'ventes', 'commande', inv.order_id, { invoice_id: inv.id, amount: inv.montant_total }));
  const finances = [
    finance(1, 'entree', 'Financement bancaire Horizon Farm BP', 12000000, dateDaysAgo(210), 'Financement', 'investissements', 'HF-BP-001', { activite: 'global' }),
    finance(2, 'entree', 'Apport promoteur Horizon Farm', 6905000, dateDaysAgo(210), 'Apport', 'investissements', 'HF-BP-001', { activite: 'global' }),
    finance(3, 'sortie', 'Achat 4000 pondeuses', 3600000, dateDaysAgo(210), 'Investissement cheptel', 'avicole', 'HF-PO-001', { activite: 'avicole_pondeuses' }),
    finance(4, 'sortie', 'Achat poussins chair cycles initiaux', 390000, dateDaysAgo(135), 'Investissement cheptel', 'avicole', 'HF-CH-001', { activite: 'avicole_chair' }),
    finance(5, 'sortie', 'Achat bovins embouche BP', 2500000, dateDaysAgo(100), 'Investissement cheptel', 'animaux', 'bovins', { activite: 'bovins' }),
    finance(6, 'sortie', 'Achat ovins embouche BP', 300000, dateDaysAgo(98), 'Investissement cheptel', 'animaux', 'ovins', { activite: 'ovins' }),
    finance(7, 'sortie', 'Achat caprins embouche BP', 225000, dateDaysAgo(98), 'Investissement cheptel', 'animaux', 'caprins', { activite: 'caprins' }),
    finance(8, 'sortie', 'Construction poulailler pondeuses', 3500000, dateDaysAgo(205), 'Infrastructure', 'equipements', 'HF-EQP-001', { activite: 'avicole_pondeuses' }),
    finance(9, 'sortie', 'Enclos bovins ovins caprins', 1800000, dateDaysAgo(202), 'Infrastructure', 'equipements', 'HF-EQP-002', { activite: 'animaux' }),
    finance(10, 'sortie', 'Stock initial aliments', 1800000, dateDaysAgo(200), 'Stock initial', 'stock', 'HF-STK-001', { activite: 'global' }),
    finance(11, 'sortie', 'Vaccins produits vétérinaires biosécurité', 650000, dateDaysAgo(198), 'Santé', 'sante', 'HF-SAN-001', { activite: 'global' }),
    finance(12, 'sortie', 'Salaires équipe ferme mois courant', 420000, dateDaysAgo(28), 'Salaires', 'rh', 'HF-RH-001', { activite: 'global' }),
    finance(13, 'sortie', 'Aliment pondeuses mois courant', 920000, dateDaysAgo(18), 'Alimentation', 'stock', 'HF-STK-001', { activite: 'avicole_pondeuses' }),
    finance(14, 'sortie', 'Aliment chair finition', 154000, dateDaysAgo(14), 'Alimentation', 'avicole', 'HF-CH-003', { activite: 'avicole_chair' }),
    finance(15, 'sortie', 'Fourrage bovins ovins caprins', 385000, dateDaysAgo(13), 'Alimentation', 'animaux', 'bovins_ovins_caprins', { activite: 'animaux' }),
    finance(16, 'sortie', 'Traitement lot chair retard poids', 42000, dateDaysAgo(5), 'Santé', 'sante', 'HF-SAN-006', { activite: 'avicole_chair' }),
    ...payments.map((p, idx) => finance(30 + idx, 'entree', `Encaissement ${p.order_id}`, p.montant_paye, p.date, 'Vente', 'ventes', p.order_id, { client_id: p.client_id, related_id: p.order_id, activite: 'ventes', payment_id: p.id })),
    finance(50, 'entree', 'Créance client tomates Roma', 864000, dateDaysAgo(2), 'Creance client', 'ventes', 'HF-CMD-004', { statut: 'impaye', client_id: 'HF-CLI-003', activite: 'cultures' }),
  ];
  return { sales_orders, sales_order_items, invoices, payments, deliveries, documents, finances };
}

function buildOpportunitiesAndDecisions() {
  const opportunities = [
    { id: 'HF-OPP-001', title: 'Vendre partiellement lot chair HF-CH-003', source_type: 'lot_avicole', source_id: 'HF-CH-003', quantity: 115, unit: 'têtes', estimated_value: 425500, status: 'nouveau', priority: 'haute', reason: '35 jours, poids moyen 1,52 kg, marge positive.', decision_key: 'avicole:HF-CH-003:vente_partielle', detected_at: dateDaysAgo(1), source: 'simulation_bp_horizon_farm' },
    { id: 'HF-OPP-002', title: 'Vendre bovin HF-BOV-003 prêt', source_type: 'animal', source_id: 'HF-BOV-003', quantity: 1, unit: 'tête', estimated_value: 365000, status: 'nouveau', priority: 'haute', reason: 'Poids cible atteint, coût journalier à limiter.', decision_key: 'animaux:HF-BOV-003:vendre', detected_at: dateDaysAgo(1), source: 'simulation_bp_horizon_farm' },
    { id: 'HF-OPP-003', title: 'Vendre stock tomates Roma récolté', source_type: 'culture', source_id: 'HF-CULT-002', quantity: 720, unit: 'kg', estimated_value: 864000, status: 'nouveau', priority: 'moyenne', reason: 'Stock récolté disponible, risque de perte si attente longue.', decision_key: 'cultures:HF-CULT-002:vendre_stock_recolte', detected_at: dateDaysAgo(2), source: 'simulation_bp_horizon_farm' },
  ];
  const business_events = [
    event(1, 'decision_vente_partielle', 'centre_ia', 'lot_avicole', 'HF-CH-003', 'Vendre 60% du lot chair prêt', 'Le lot HF-CH-003 a atteint 1,52 kg à 35 jours. Recommandation : vendre 115 sujets maintenant et garder le reste 5 jours.', 'warning', { decision_key: 'avicole:HF-CH-003:vente_partielle', amount: 425500, linked_opportunity_id: 'HF-OPP-001' }),
    event(2, 'decision_vendre', 'centre_ia', 'animal', 'HF-BOV-003', 'Bovin prêt à vendre', 'Poids cible atteint sur HF-BOV-003. Vendre avant que le coût alimentaire réduise la marge.', 'warning', { decision_key: 'animaux:HF-BOV-003:vendre', amount: 365000, linked_opportunity_id: 'HF-OPP-002' }),
    event(3, 'decision_recolte_vente', 'centre_ia', 'culture', 'HF-CULT-002', 'Écouler tomates récoltées', '720 kg disponibles : vendre rapidement ou contractualiser avec grossiste.', 'warning', { decision_key: 'cultures:HF-CULT-002:vendre_stock_recolte', amount: 864000, linked_opportunity_id: 'HF-OPP-003' }),
    event(4, 'risque_poids', 'avicole', 'lot_avicole', 'HF-CH-005', 'Retard de poids lot chair', 'À 40 jours, poids moyen 1,31 kg : revoir ration, santé et densité.', 'warning', { decision_key: 'avicole:HF-CH-005:retard_poids' }),
  ];
  const taches = [
    task(1, 'Vendre 115 poulets HF-CH-003', 'ventes', 'HF-OPP-001', dateDaysFromNow(1), 'haute', 'Confirmer client; saisir vente; facture si demandée; livraison ou récupération', { decision_key: 'avicole:HF-CH-003:vente_partielle' }),
    task(2, 'Peser bovin HF-BOV-003 avant vente', 'animaux', 'HF-BOV-003', dateDaysFromNow(1), 'haute', 'Confirmer poids; vérifier coût; vendre si marge OK', { decision_key: 'animaux:HF-BOV-003:vendre' }),
    task(3, 'Écouler tomates Roma disponibles', 'cultures', 'HF-CULT-002', dateDaysFromNow(2), 'moyenne', 'Contacter clients; vendre stock; limiter pertes', { decision_key: 'cultures:HF-CULT-002:vendre_stock_recolte' }),
    task(4, 'Corriger ration lot HF-CH-005', 'avicole', 'HF-CH-005', dateDaysFromNow(1), 'haute', 'Pesée; contrôle santé; ration finition; ventilation', { decision_key: 'avicole:HF-CH-005:retard_poids' }),
  ];
  const alertes_center = [
    alert(1, 'Lot chair prêt à vendre', 'HF-CH-003 peut être vendu partiellement maintenant.', 'avicole', 'HF-CH-003', 'warning', 'Transformer l’opportunité en vente dans Ventes.', { entity_type: 'lot_avicole', decision_key: 'avicole:HF-CH-003:vente_partielle' }),
    alert(2, 'Retard de poids chair', 'HF-CH-005 consomme mais n’atteint pas le poids cible.', 'avicole', 'HF-CH-005', 'warning', 'Vérifier ration, santé, densité et coût journalier.', { entity_type: 'lot_avicole', decision_key: 'avicole:HF-CH-005:retard_poids' }),
    alert(3, 'Créance client à suivre', 'Tomates Roma vendues non encaissées.', 'ventes', 'HF-CMD-004', 'warning', 'Relancer le client et enregistrer le paiement.', { entity_type: 'commande' }),
  ];
  return { sales_opportunities: opportunities, business_events, taches, alertes_center };
}

function buildHealthAndOps() {
  const sante = [
    { id: 'HF-SAN-001', nom: 'Programme Newcastle pondeuses', type_intervention: 'vaccination', animal: 'HF-PO-001', module_lie: 'avicole', related_id: 'HF-PO-001', target_summary: '3880 pondeuses', prevue: dateDaysAgo(185), effectuee: dateDaysAgo(185), vet: 'Dr. Kone', cout: 120000, statut: 'fait', risk_level: 'faible', impact_business_category: 'stock_sante', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-SAN-002', nom: 'Déparasitage bovins', type_intervention: 'deparasitage', animal: 'Bovins BP', module_lie: 'animaux', related_id: 'bovins', target_summary: '10 bovins', prevue: dateDaysAgo(70), effectuee: dateDaysAgo(70), vet: 'Dr. Diallo', cout: 85000, statut: 'fait', risk_level: 'moyen', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-SAN-003', nom: 'Vitamines chair finition', type_intervention: 'preventif', animal: 'HF-CH-003', module_lie: 'avicole', related_id: 'HF-CH-003', target_summary: '192 poulets', prevue: dateDaysAgo(8), effectuee: dateDaysAgo(8), cout: 26000, statut: 'fait', risk_level: 'faible', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-SAN-004', nom: 'Traitement retard poids chair', type_intervention: 'curatif', animal: 'HF-CH-005', module_lie: 'avicole', related_id: 'HF-CH-005', target_summary: '188 poulets à surveiller', prevue: dateDaysAgo(3), effectuee: '', cout: 42000, statut: 'a_faire', risk_level: 'eleve', impact_business_category: 'baisse_production', clinical_signs: 'Poids moyen inférieur cible, indice consommation élevé.', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-SAN-005', nom: 'Désinfection pédiluves', type_intervention: 'biosecurite', animal: 'Tous bâtiments', module_lie: 'sante', related_id: 'biosecurite', target_summary: 'Poulaillers + enclos', prevue: dateDaysFromNow(2), cout: 18000, statut: 'a_faire', risk_level: 'moyen', source: 'simulation_bp_horizon_farm' },
  ];
  const rh = [
    { id: 'HF-RH-001', nom: 'Responsable exploitation', poste: 'Manager ferme', salaire: 180000, statut: 'actif', affectation: 'global', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-RH-002', nom: 'Agent avicole', poste: 'Aviculture', salaire: 120000, statut: 'actif', affectation: 'avicole', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-RH-003', nom: 'Agent élevage', poste: 'Bovins/Ovins/Caprins', salaire: 95000, statut: 'actif', affectation: 'animaux', source: 'simulation_bp_horizon_farm' },
    { id: 'HF-RH-004', nom: 'Journalier cultures', poste: 'Maraîchage', salaire: 25000, statut: 'actif', affectation: 'cultures', source: 'simulation_bp_horizon_farm' },
  ];
  const equipements = [
    { id: 'HF-EQP-001', name: 'Poulailler pondeuses 4000 sujets', type: 'infrastructure', status: 'operationnel', purchase_date: dateDaysAgo(205), purchase_cost: 3500000, maintenance_due: dateDaysFromNow(20), source: 'simulation_bp_horizon_farm' },
    { id: 'HF-EQP-002', name: 'Enclos bovins ovins caprins', type: 'infrastructure', status: 'operationnel', purchase_date: dateDaysAgo(202), purchase_cost: 1800000, maintenance_due: dateDaysFromNow(35), source: 'simulation_bp_horizon_farm' },
    { id: 'HF-EQP-003', name: 'Mangeoires abreuvoirs pondoirs', type: 'equipement', status: 'operationnel', purchase_date: dateDaysAgo(200), purchase_cost: 1250000, maintenance_due: dateDaysFromNow(15), source: 'simulation_bp_horizon_farm' },
  ];
  return { sante, rh, equipements };
}

function buildBusinessPlan() {
  const business_plans = [{ id: 'HF-BP-001', name: 'Business Plan Horizon Farm — Simulation financeur M+7', title: 'Business Plan Horizon Farm', statut: 'simulation_active', montant_total: 18905000, apport_total: 6905000, financement_demande: 12000000, date_demarrage: dateDaysAgo(210), horizon_mois: 12, description: 'Simulation complète utilisée pour démontrer ce que Horizon Farm pourrait produire si le BP était financé.', source: 'simulation_bp_horizon_farm' }];
  const bp_investment_lines = [
    ['Pondeuses 4000 sujets', 3600000, 'avicole_pondeuses'], ['Poulets de chair 200 sujets x cycles', 390000, 'avicole_chair'], ['Bovins embouche 10 têtes', 2500000, 'bovins'], ['Ovins embouche 5 têtes', 300000, 'ovins'], ['Caprins embouche 5 têtes', 225000, 'caprins'], ['Poulailler pondeuses', 3500000, 'infrastructure'], ['Espace chair', 650000, 'infrastructure'], ['Enclos ruminants', 1800000, 'infrastructure'], ['Mangeoires abreuvoirs pondoirs', 1250000, 'equipements'], ['Stock initial aliments', 1800000, 'stock'], ['Santé biosécurité', 650000, 'sante'], ['Fonds de roulement', 2500000, 'tresorerie'],
  ].map(([libelle, montant, activity], idx) => ({ id: id('HF-BPL', idx + 1), business_plan_id: 'HF-BP-001', libelle, label: libelle, montant, total: montant, activity, category: activity, source: 'simulation_bp_horizon_farm' }));
  const bp_recurring_costs = [
    ['Aliment pondeuses', 920000, 'avicole_pondeuses'], ['Aliment chair par cycle', 154000, 'avicole_chair'], ['Fourrage ruminants', 385000, 'animaux'], ['Santé préventive', 95000, 'sante'], ['RH mensuelle', 420000, 'rh'], ['Eau électricité maintenance', 180000, 'global'], ['Emballage livraison', 90000, 'ventes'],
  ].map(([libelle, montant, activity], idx) => ({ id: id('HF-BPC', idx + 1), business_plan_id: 'HF-BP-001', libelle, montant, periodicite: 'mensuelle', activity, source: 'simulation_bp_horizon_farm' }));
  const bp_revenue_projections = [
    ['Œufs pondeuses', 8400000, 0.38, 'avicole_pondeuses'], ['Poulets chair cycles', 2100000, 0.32, 'avicole_chair'], ['Bovins embouche', 1460000, 0.24, 'bovins'], ['Ovins caprins', 850000, 0.26, 'ovins_caprins'], ['Cultures maraîchage', 1680000, 0.34, 'cultures'],
  ].map(([libelle, ca, margin, activity], idx) => ({ id: id('HF-BPR', idx + 1), business_plan_id: 'HF-BP-001', libelle, ca_previsionnel: ca, ca_estime: ca, marge_previsionnelle: money(ca * margin), marge_estimee: money(ca * margin), mois: new Date().toISOString().slice(0, 7), activity, source: 'simulation_bp_horizon_farm' }));
  const bp_funding_sources = [{ id: 'HF-BPF-001', business_plan_id: 'HF-BP-001', source_name: 'Banque / partenaire', type: 'pret', montant: 12000000, taux: 9, duree_mois: 36, source: 'simulation_bp_horizon_farm' }, { id: 'HF-BPF-002', business_plan_id: 'HF-BP-001', source_name: 'Apport promoteur', type: 'fonds_propres', montant: 6905000, source: 'simulation_bp_horizon_farm' }];
  const bp_risks = [{ id: 'HF-BPRISK-001', business_plan_id: 'HF-BP-001', title: 'Retard poids chair', severity: 'moyen', mitigation: 'Pesées hebdomadaires, ration finition, alerte marge.', source: 'simulation_bp_horizon_farm' }, { id: 'HF-BPRISK-002', business_plan_id: 'HF-BP-001', title: 'Créances clients', severity: 'moyen', mitigation: 'Relance, paiement partiel tracé, blocage livraison si nécessaire.', source: 'simulation_bp_horizon_farm' }];
  return { business_plans, bp_investment_lines, bp_recurring_costs, bp_revenue_projections, bp_funding_sources, bp_risks };
}

export function buildHorizonFarmSimulationSeed() {
  const lots = buildLots();
  const animaux = buildAnimals();
  const cultures = buildCultures();
  const sales = buildSalesAndFinance();
  const decision = buildOpportunitiesAndDecisions();
  const ops = buildHealthAndOps();
  const bp = buildBusinessPlan();
  const stocks = [
    stock(1, 'Aliment pondeuse BP', 6200, 'kg', 3000, 290, 'Aliment avicole'),
    stock(2, 'Aliment chair finition BP', 340, 'kg', 500, 310, 'Aliment avicole'),
    stock(3, 'Fourrage bovins BP', 2800, 'kg', 1800, 95, 'Aliment betail'),
    stock(4, 'Aliment ovins caprins BP', 520, 'kg', 700, 120, 'Aliment betail'),
    stock(5, 'Vaccin Newcastle BP', 12, 'flacon', 10, 12500, 'Vaccins'),
    stock(6, 'Vitamines croissance chair', 3, 'flacon', 4, 8500, 'Medicaments'),
    stock(7, 'Désinfectant pédiluve', 18, 'bidon', 8, 4200, 'Biosecurite'),
    stock(8, 'Plateaux œufs', 1200, 'unité', 400, 80, 'Emballage'),
    stock(9, 'Tomates Roma récoltées', 720, 'kg', 100, 0, 'Stock vendable', { is_sellable: true, source_module: 'cultures', related_id: 'HF-CULT-002' }),
  ];
  const clients = [client(1, 'Kouyaté Distribution', 'Grossiste', 'Poulets vivants'), client(2, 'Marché Sandaga Stand 12', 'Détaillant', 'Œufs plateaux'), client(3, 'Coop Agro Thiès', 'Coopérative', 'Cultures et bovins'), client(4, 'Famille Sarr', 'Particulier', 'Ovins caprins bovins')];
  const fournisseurs = [fournisseur(1, 'AgroAlim Sénégal', 'Aliment'), fournisseur(2, 'Pharmavet Dakar', 'Santé'), fournisseur(3, 'Transport Rapide Sénégal', 'Transport'), fournisseur(4, 'MatAgri Sénégal', 'Matériel')];
  const production_oeufs_logs = Array.from({ length: 14 }).map((_, idx) => ({ id: id('HF-EGG', idx + 1), lot_id: 'HF-PO-001', date: dateDaysAgo(13 - idx), oeufs_produits: 2920 + (idx % 5) * 35, oeufs_casses: 38 + (idx % 3) * 4, plateaux: Math.floor((2920 + (idx % 5) * 35) / 30), source: 'simulation_bp_horizon_farm' }));
  const alimentation_logs = [
    { id: 'HF-FEED-001', date: dateDaysAgo(2), type_cible: 'lot_avicole', lot_id: 'HF-PO-001', categorie: 'Aliment pondeuse', quantite: 440, unite: 'kg', montant_total: 127600, source: 'simulation_bp_horizon_farm' },
    { id: 'HF-FEED-002', date: dateDaysAgo(1), type_cible: 'lot_avicole', lot_id: 'HF-CH-003', categorie: 'Aliment chair finition', quantite: 68, unite: 'kg', montant_total: 21080, source: 'simulation_bp_horizon_farm' },
    { id: 'HF-FEED-003', date: dateDaysAgo(1), type_cible: 'animaux', cible_id: 'bovins', categorie: 'Fourrage bovins', quantite: 180, unite: 'kg', montant_total: 17100, source: 'simulation_bp_horizon_farm' },
  ];
  const rapports = [{ id: 'HF-RPT-001', title: 'Rapport investisseur Horizon Farm M+7', report_type: 'investisseur', period: new Date().toISOString().slice(0, 7), status: 'genere', channel: 'PDF', summary: 'Simulation BP : CA, cash, marges, ROI, risques, lots prêts à vendre.', source: 'simulation_bp_horizon_farm' }];
  const tracabilite = [{ id: 'HF-TR-001', animal: 'HF-CH-003', type: 'Lot chair', etapes: [{ etape: 'Démarrage', date: dateDaysAgo(35), detail: '200 poussins mis en place', ok: true }, { etape: 'Pesée', date: dateDaysAgo(1), detail: 'Poids moyen 1,52 kg', ok: true }, { etape: 'Décision', date: dateDaysAgo(1), detail: 'Vente partielle recommandée par centre décisionnel', ok: true }], margeFinale: 330400, roi: 46, source: 'simulation_bp_horizon_farm' }];
  return {
    dashboard: [], animaux, avicole: lots, lots, cultures, stock: stocks, stocks, clients, fournisseurs,
    investissements: [{ id: 'HF-INV-001', type: 'Business Plan', libelle: 'Déploiement Business Plan Horizon Farm — simulation financeur', montant: 18905000, roi: 34, objectif: 'Démontrer Horizon Farm financé et exploité à M+7', statut: 'actif', gain: 6420000, source: 'simulation_bp_horizon_farm' }],
    ...bp, ...ops, ...sales, ...decision, production_oeufs_logs, alimentation_logs,
    documents: [...sales.documents, document(20, 'Ordonnance traitement retard poids HF-CH-005', 'ordonnance', 'sante', 'intervention', 'HF-SAN-004'), document(21, 'Business Plan Horizon Farm simulation financeur', 'business_plan', 'investissements', 'business_plan', 'HF-BP-001')],
    rapports, tracabilite,
    veterinaires: [{ id: 'HF-VET-001', nom: 'Dr. Kone Mamadou', specialite: 'Aviculture', tel: '+221 77 111 22 33', whatsapp: '+221 77 111 22 33', note: 4.8, source: 'simulation_bp_horizon_farm' }, { id: 'HF-VET-002', nom: 'Dr. Diallo Ibrahima', specialite: 'Bovins/Ovins/Caprins', tel: '+221 76 444 55 66', whatsapp: '+221 76 444 55 66', note: 4.7, source: 'simulation_bp_horizon_farm' }],
    equipements: ops.equipements,
    sensor_devices: [], camera_devices: [], audit_logs: [], whatsapp_templates: [], whatsapp_logs: [], price_catalog: [], bp_links: [], bp_versions: [], bp_lines_history: [],
  };
}

export const horizonFarmSimulationSeed = buildHorizonFarmSimulationSeed();
