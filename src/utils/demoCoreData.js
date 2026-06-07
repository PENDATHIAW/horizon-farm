const day = (n = 0) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const lot = { id: 'DEMO_LOT_01', name: 'Lot chair demo 45j', type: 'Chair', initial_count: 120, current_count: 92, mortality: 3, vendus: 25, prix_vente_prevu: 3500, cout_poussins: 120000, status: 'vendu_partiellement', date_debut: day(-45), date_mise_en_place: day(-45), code_souche: 'cobb-500', batiment: 'poulailler_demo', poids_history: [{ date: day(-45), poids: 0.04 }, { date: day(-20), poids: 0.95 }, { date: day(-5), poids: 1.48 }] };
const animal = { id: 'DEMO_BOV_01', tag: 'BOV-DEMO-01', name: 'Taureau demo', type: 'Bovin', sexe: 'M', poids: 310, purchase_cost: 260000, status: 'vendu', health_status: 'sain', prix_vente_reel: 390000, client_id: 'DEMO_CLI_RELANCE', date_vente: day(-1), date_mise_en_place: day(-90), date_entree_ferme: day(-90), code_souche: 'goba' };
const culture = { id: 'DEMO_CULT_01', nom: 'Tomates demo Parcelle A', type: 'Tomates', parcelle: 'Parcelle A', surface: 600, quantite_recoltee: 600, quantite_disponible: 420, cout_semences: 35000, cout_engrais: 80000, cout_eau: 25000, cout_main_oeuvre: 90000, cout_traitement: 20000, revenu_reel: 180000, statut: 'recolte', score_sante: 88 };

export const DEMO_CORE_DATA = {
  clients: [
    { id: 'DEMO_CLI_SOLDE', nom: 'Client solde demo', tel: '+221770000001', type: 'grossiste', score: 5, statut: 'actif', prefs: 'Poulets et tomates' },
    { id: 'DEMO_CLI_RELANCE', nom: 'Client a relancer demo', tel: '+221770000002', type: 'restaurant', score: 4, statut: 'a_relancer', prefs: 'Viande bovine' },
  ],
  animaux: [animal],
  avicole: [lot],
  lots: [lot],
  cultures: [culture],
  stock: [
    { id: 'DEMO_STK_ALIM', produit: 'Aliment finition demo', categorie: 'aliment_avicole', activite_liee: 'avicole', quantite: 18, unite: 'sac', seuil: 10, prixUnit: 17500, fournisseur_id: 'DEMO_FOU_ALIM' },
    { id: 'DEMO_STK_TOMATE', produit: 'Tomates recoltees demo', categorie: 'recolte', activite_liee: 'cultures', quantite: 420, unite: 'kg', seuil: 80, prixUnit: 375 },
  ],
  fournisseurs: [
    { id: 'DEMO_FOU_ALIM', nom: 'Aliments Dakar Demo', tel: '+221770000010', whatsapp: '+221770000010', categorie: 'Alimentation', contact: 'Awa', note: 4.5, dettes: 45000, livraisons: 3, source: 'demo' },
  ],
  alimentation_logs: [
    { id: 'DEMO_ALIM_LOT', date: day(-10), lot_id: 'DEMO_LOT_01', type_cible: 'lot_avicole', cible_id: 'DEMO_LOT_01', quantite: 6, unite: 'sac', montant_total: 105000, fournisseur_id: 'DEMO_FOU_ALIM' },
    { id: 'DEMO_ALIM_BOV', date: day(-20), animal_id: 'DEMO_BOV_01', type_cible: 'animal', cible_id: 'DEMO_BOV_01', quantite: 80, unite: 'kg', montant_total: 48000, fournisseur_id: 'DEMO_FOU_ALIM' },
  ],
  sales_orders: [
    { id: 'DEMO_CMD_SOLDE_LOT', client_id: 'DEMO_CLI_SOLDE', product_name: '25 poulets de chair demo', source_module: 'avicole', source_type: 'lot', source_id: 'DEMO_LOT_01', quantity: 25, quantite: 25, unite: 'unite', prix_unitaire: 3500, montant_total: 87500, montant_paye: 87500, reste_a_payer: 0, statut_commande: 'confirme', statut_paiement: 'paye', statut_facture: 'emise', date: day(-2) },
    { id: 'DEMO_CMD_RELANCE_BOV', client_id: 'DEMO_CLI_RELANCE', product_name: 'Taureau demo', source_module: 'animaux', source_type: 'animal', source_id: 'DEMO_BOV_01', quantity: 1, quantite: 1, unite: 'unite', prix_unitaire: 390000, montant_total: 390000, montant_paye: 150000, reste_a_payer: 240000, statut_commande: 'confirme', statut_paiement: 'partiel', statut_facture: 'emise', date: day(-1) },
    { id: 'DEMO_CMD_TOMATE', client_id: 'DEMO_CLI_SOLDE', product_name: 'Tomates recoltees demo', source_module: 'cultures', source_type: 'culture', source_id: 'DEMO_CULT_01', quantity: 120, quantite: 120, unite: 'kg', prix_unitaire: 500, montant_total: 60000, montant_paye: 60000, reste_a_payer: 0, statut_commande: 'confirme', statut_paiement: 'paye', statut_facture: 'emise', date: day() },
  ],
  payments: [
    { id: 'DEMO_PAY_LOT', order_id: 'DEMO_CMD_SOLDE_LOT', sale_id: 'DEMO_CMD_SOLDE_LOT', source_record_id: 'DEMO_CMD_SOLDE_LOT', client_id: 'DEMO_CLI_SOLDE', montant: 87500, montant_paye: 87500, amount: 87500, statut: 'paye', moyen_paiement: 'wave', date: day(-2) },
    { id: 'DEMO_PAY_BOV', order_id: 'DEMO_CMD_RELANCE_BOV', sale_id: 'DEMO_CMD_RELANCE_BOV', source_record_id: 'DEMO_CMD_RELANCE_BOV', client_id: 'DEMO_CLI_RELANCE', montant: 150000, montant_paye: 150000, amount: 150000, statut: 'paye', moyen_paiement: 'orange_money', date: day(-1) },
    { id: 'DEMO_PAY_TOMATE', order_id: 'DEMO_CMD_TOMATE', sale_id: 'DEMO_CMD_TOMATE', source_record_id: 'DEMO_CMD_TOMATE', client_id: 'DEMO_CLI_SOLDE', montant: 60000, montant_paye: 60000, amount: 60000, statut: 'paye', moyen_paiement: 'cash', date: day() },
  ],
  finances: [
    { id: 'DEMO_TRX_LOT', type: 'entree', libelle: 'Encaissement poulets demo', montant: 87500, categorie: 'Vente poulets', statut: 'paye', related_id: 'DEMO_CMD_SOLDE_LOT', source_module: 'ventes', source_record_id: 'DEMO_CMD_SOLDE_LOT', payment_id: 'DEMO_PAY_LOT', date: day(-2) },
    { id: 'DEMO_TRX_BOV', type: 'entree', libelle: 'Acompte taureau demo', montant: 150000, categorie: 'Vente animaux', statut: 'paye', related_id: 'DEMO_CMD_RELANCE_BOV', source_module: 'ventes', source_record_id: 'DEMO_CMD_RELANCE_BOV', payment_id: 'DEMO_PAY_BOV', date: day(-1) },
    { id: 'DEMO_TRX_ALIM', type: 'sortie', libelle: 'Achat aliment demo', montant: 105000, categorie: 'Alimentation', statut: 'paye', related_id: 'DEMO_STK_ALIM', source_module: 'stock', source_record_id: 'DEMO_STK_ALIM', date: day(-12) },
  ],
  transactions: [],
  alertes_center: [{ id: 'DEMO_ALT_CREANCE', title: 'Creance client demo', message: '240000 FCFA restant a encaisser', module_source: 'clients', entity_id: 'DEMO_CLI_RELANCE', severity: 'warning', status: 'nouvelle' }],
  taches: [{ id: 'DEMO_TSK_RELANCE', title: 'Relancer Client a relancer demo', module_lie: 'clients', related_id: 'DEMO_CLI_RELANCE', due_date: day(), priority: 'haute', status: 'a_faire' }],
  business_events: [{ id: 'DEMO_EVT_VENTE', event_type: 'vente_complete', module_source: 'ventes', entity_id: 'DEMO_CMD_SOLDE_LOT', title: 'Vente lot avicole soldee', event_date: day(-2), severity: 'info', amount: 87500, saisies_evitees: 6 }],
};
DEMO_CORE_DATA.ventes = DEMO_CORE_DATA.sales_orders;
DEMO_CORE_DATA.transactions = DEMO_CORE_DATA.finances;

export function withDemoRows(moduleKey, rows = []) {
  const current = Array.isArray(rows) ? rows : [];
  if (current.length) return current;
  return DEMO_CORE_DATA[moduleKey] || current;
}
