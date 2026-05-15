import {
  AlertTriangle,
  ArrowRight,
  Beef,
  Bird,
  BookOpen,
  Building2,
  ClipboardCheck,
  DollarSign,
  FileText,
  GitBranch,
  HeartPulse,
  History,
  Package,
  Radio,
  Receipt,
  ShieldCheck,
  Sprout,
  Truck,
  Users,
  Wifi,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (value) => fmtCurrency(toNumber(value));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const statusOf = (row = {}) => lower(row.status || row.statut || row.health_status || row.statut_sante || row.payment_status || row.statut_paiement);
const textOf = (row = {}) => lower(Object.values(row || {}).join(' '));
const hasTerm = (row = {}, terms = []) => terms.some((term) => textOf(row).includes(term));
const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.total_amount ?? row.cout_total ?? row.cout ?? row.frais_sante);
const qty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock ?? row.qty);
const threshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte ?? row.min_stock);
const firstPositive = (...values) => values.map(toNumber).find((value) => value > 0) || 0;
const unitOf = (row = {}) => String(row.unite || row.unit || row.uom || row.mesure || '').trim();

function stockUnitCost(row = {}) {
  const purchase = firstPositive(
    row.prix_achat,
    row.purchase_price,
    row.cout_achat,
    row.prix_unitaire,
    row.prixUnit,
    row.unit_price,
    row.price,
    row.prix,
    row.cout_unitaire,
    row.cost,
    row.cout,
  );
  const unitTransport = firstPositive(row.transport_unitaire, row.unit_transport, row.frais_transport_unitaire);
  return purchase + unitTransport;
}

function stockExtraCost(row = {}) {
  return firstPositive(row.frais_transport, row.transport, row.delivery_cost, row.livraison, row.frais_livraison, row.frais_annexes, row.extra_costs);
}

function stockLineValue(row = {}) {
  const direct = firstPositive(row.valeur_stock, row.stock_value, row.valeur_totale, row.total_value, row.total_cost, row.cout_total);
  if (direct > 0) return direct;
  return qty(row) * stockUnitCost(row) + stockExtraCost(row);
}

function isRevenue(row = {}) {
  return ['entree', 'entrée', 'revenu', 'recette', 'vente', 'income', 'encaissement'].some((term) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`).includes(term));
}

function isExpense(row = {}) {
  return ['sortie', 'depense', 'dépense', 'charge', 'achat', 'expense', 'paiement'].some((term) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`).includes(term));
}

function isUnpaid(row = {}) {
  return ['impaye', 'impayé', 'partiel', 'partial', 'en_retard', 'retard', 'overdue', 'unpaid', 'a_relancer', 'à_relancer'].includes(statusOf(row));
}

function navigateTo(target, onNavigate) {
  if (!target) return;
  if (onNavigate) {
    onNavigate(target);
    return;
  }
  const normalized = String(target).replace('_', ' ').toLowerCase();
  const buttons = Array.from(document.querySelectorAll('nav button, aside button'));
  const match = buttons.find((button) => button.textContent?.toLowerCase().includes(normalized));
  if (match) match.click();
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl px-3 py-2 text-xs font-bold border flex items-center gap-2 ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>
      <Icon size={14} /> {label}
    </button>
  );
}

function MetricCard({ icon: Icon, title, value, detail, tone = 'good', module, onNavigate }) {
  const toneClass = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return (
    <button type="button" onClick={() => navigateTo(module, onNavigate)} className={`rounded-2xl border p-4 text-left ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <Icon size={18} />
        {module ? <ArrowRight size={14} /> : null}
      </div>
      <p className="text-2xl font-black mt-2">{value}</p>
      <p className="font-bold text-[#2f2415]">{title}</p>
      <p className="text-xs mt-1">{detail}</p>
    </button>
  );
}

function DomainIntro({ title, visibility, outcome }) {
  return (
    <div className="rounded-2xl bg-[#fffdf8] border border-[#eadcc2] p-4 space-y-3">
      <h3 className="font-black text-[#2f2415]">{title}</h3>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Visibilité</p>
          <p className="text-sm text-[#2f2415] mt-1">{visibility}</p>
        </div>
        <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Décisions / gains</p>
          <p className="text-sm text-[#2f2415] mt-1">{outcome}</p>
        </div>
      </div>
    </div>
  );
}

function DomainPanel({ domain, onNavigate }) {
  return (
    <div className="space-y-4">
      <DomainIntro title={domain.title} visibility={domain.visibility} outcome={domain.outcome} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {domain.metrics.map((metric) => <MetricCard key={metric.title} {...metric} onNavigate={onNavigate} />)}
      </div>
    </div>
  );
}

function buildStats(props = {}) {
  const animaux = arr(props.animaux);
  const lots = arr(props.lots);
  const sante = arr(props.sante);
  const stocks = arr(props.stocks);
  const transactions = arr(props.transactions);
  const salesOrders = arr(props.salesOrders);
  const payments = arr(props.payments);
  const documents = arr(props.documents);
  const alertes = arr(props.alertes);
  const taches = arr(props.taches);
  const events = arr(props.businessEvents);
  const cultures = arr(props.cultures);
  const clients = arr(props.clients);
  const fournisseurs = arr(props.fournisseurs);
  const equipements = arr(props.equipements);
  const productionLogs = arr(props.productionLogs);
  const investments = arr(props.investissements);
  const businessPlans = arr(props.businessPlans);
  const invoices = arr(props.invoicesList || props.invoices);
  const deliveries = arr(props.deliveriesList || props.deliveries);
  const orderItems = arr(props.orderItems || props.salesOrderItems);
  const sensors = arr(props.sensors || props.sensorDevices);
  const cameras = arr(props.cameras || props.cameraDevices);
  const auditLogs = arr(props.auditLogs || props.audit_logs);
  const reports = arr(props.rapports || props.reports);
  const opportunities = arr(props.opportunities || props.salesOpportunities);
  const whatsappLogs = arr(props.whatsappLogs);

  const sickAnimals = animaux.filter((row) => ['malade', 'sous_traitement', 'critique'].some((term) => statusOf(row).includes(term))).length;
  const riskyLots = lots.filter((row) => ['malade', 'sous_traitement', 'critique'].some((term) => statusOf(row).includes(term)) || toNumber(row.mortality || row.morts) > 0).length;
  const totalSubjects = animaux.length + lots.length;
  const riskySubjects = sickAnimals + riskyLots;
  const healthySubjects = Math.max(0, totalSubjects - riskySubjects);
  const lateCare = sante.filter((row) => ['retard', 'en_retard', 'à_faire', 'a_faire'].includes(statusOf(row))).length;
  const vaccineCare = sante.filter((row) => hasTerm(row, ['vaccin', 'traitement', 'soin', 'preventif', 'préventif', 'curatif'])).length;
  const healthStockRows = stocks.filter((row) => hasTerm(row, ['vaccin', 'médicament', 'medicament', 'traitement', 'désinfectant', 'desinfectant', 'veto', 'véto']));
  const healthStockCritical = healthStockRows.filter((row) => threshold(row) > 0 && qty(row) <= threshold(row)).length;
  const healthDocs = documents.filter((row) => hasTerm(row, ['sante', 'santé', 'ordonnance', 'certificat', 'vaccin', 'traitement', 'veterinaire', 'vétérinaire'])).length;
  const healthCost = transactions.filter((row) => hasTerm(row, ['sante', 'santé', 'veto', 'véto', 'vaccin', 'traitement'])).reduce((sum, row) => sum + amount(row), 0);

  const criticalStocks = stocks.filter((row) => threshold(row) > 0 && qty(row) <= threshold(row));
  const feedStocks = stocks.filter((row) => hasTerm(row, ['aliment', 'provende', 'intrant', 'semence', 'engrais']));
  const valuedStockRows = stocks.filter((row) => stockLineValue(row) > 0);
  const stockTotalValue = stocks.reduce((sum, row) => sum + stockLineValue(row), 0);
  const stockUnits = [...new Set(stocks.map(unitOf).filter(Boolean))];
  const stockMissingPrice = stocks.filter((row) => stockLineValue(row) <= 0 && qty(row) > 0).length;

  const revenue = payments.reduce((sum, row) => sum + amount(row), 0) + transactions.filter(isRevenue).reduce((sum, row) => sum + amount(row), 0);
  const expenses = transactions.filter(isExpense).reduce((sum, row) => sum + amount(row), 0);
  const margin = revenue - expenses;
  const receivables = [...salesOrders, ...payments, ...transactions].filter(isUnpaid).reduce((sum, row) => sum + amount(row), 0);
  const unpaidOrders = salesOrders.filter(isUnpaid).length;
  const unpaidClients = clients.filter((row) => toNumber(row.solde || row.balance || row.reste_a_payer || row.dette) > 0).length;
  const recurrentClients = clients.filter((row) => toNumber(row.totalAchats ?? row.totalachats ?? row.orders_count) > 0).length;
  const deliveredCount = deliveries.filter((row) => ['livre', 'livré', 'delivered', 'done'].includes(statusOf(row))).length;
  const invoicedAmount = invoices.reduce((sum, row) => sum + amount(row), 0);
  const lateTasks = taches.filter((row) => ['retard', 'en_retard', 'critique'].includes(statusOf(row)) || lower(row.priority || row.priorite).includes('critique')).length;
  const equipmentIssues = equipements.filter((row) => ['panne', 'hors_service', 'maintenance'].includes(statusOf(row))).length;

  const reliableSuppliers = fournisseurs.filter((row) => toNumber(row.note) >= 4 || row.verified || row.favorite).length;
  const riskySuppliers = fournisseurs.filter((row) => ['retard', 'bloque', 'bloqué', 'suspendu', 'inactif', 'litige'].some((term) => statusOf(row).includes(term)) || (toNumber(row.note) > 0 && toNumber(row.note) < 3)).length;
  const supplierFamilies = ['aliment', 'poussin', 'intrant', 'semence', 'engrais', 'médicament', 'medicament', 'vaccin', 'transport', 'matériel', 'materiel'].filter((term) => fournisseurs.some((row) => hasTerm(row, [term])) || stocks.some((row) => hasTerm(row, [term])));
  const supplierStockRows = stocks.filter((row) => row.fournisseur_id || row.supplier_id || row.fournisseur || row.supplier || row.vendor);
  const supplierStockValue = supplierStockRows.reduce((sum, row) => sum + stockLineValue(row), 0);
  const supplierExpenses = transactions.filter((row) => isExpense(row) && (hasTerm(row, ['fournisseur', 'supplier', 'achat', 'transport', 'livraison']) || fournisseurs.some((f) => lower(row.fournisseur_id || row.supplier_id || row.vendor_id) === lower(f.id)))).reduce((sum, row) => sum + amount(row), 0);
  const transportCosts = stocks.reduce((sum, row) => sum + stockExtraCost(row), 0);
  const offlineOrSync = auditLogs.filter((row) => hasTerm(row, ['offline', 'sync', 'synchronisation', 'replay'])).length;

  return {
    health: { totalSubjects, healthySubjects, healthyRate: totalSubjects ? (healthySubjects / totalSubjects) * 100 : 0, riskySubjects, careCount: sante.length, lateCare, vaccineCare, healthStock: healthStockRows.length, healthStockCritical, healthDocs, healthCost, riskSignals: riskySubjects + lateCare + healthStockCritical },
    animaux: { count: animaux.length, healthyRate: animaux.length ? ((animaux.length - sickAnimals) / animaux.length) * 100 : 0, sickAnimals, saleReady: animaux.filter((row) => row.ready_for_sale || row.pret_vente || row.pret_a_vendre).length },
    avicole: { lots: lots.length, riskyLots, logs: productionLogs.length, eggs: productionLogs.reduce((sum, row) => sum + toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity), 0), losses: productionLogs.reduce((sum, row) => sum + toNumber(row.oeufs_casses ?? row.pertes ?? row.broken), 0) },
    cultures: { count: cultures.length, risks: cultures.filter((row) => toNumber(row.score_sante || 100) < 80 || statusOf(row) === 'perdu').length, revenue: cultures.reduce((sum, row) => sum + toNumber(row.revenu_reel || row.revenu_estime || row.ca_realise), 0) },
    stock: { total: stocks.length, critical: criticalStocks.length, feed: feedStocks.length, health: healthStockRows.length, value: stockTotalValue, valueDisplay: stockTotalValue > 0 ? money(stockTotalValue) : stocks.length ? 'Prix à renseigner' : money(0), valuedRows: valuedStockRows.length, missingPrice: stockMissingPrice, units: stockUnits },
    sales: { orders: salesOrders.length, items: orderItems.length, opportunities: opportunities.length, deliveries: deliveries.length, deliveredCount, invoices: invoices.length, invoicedAmount, receivables, unpaidOrders },
    clients: { count: clients.length, recurrentClients, unpaidClients, receivables, whatsapp: whatsappLogs.length },
    finance: { revenue, expenses, margin, receivables, payments: payments.length, transactions: transactions.length },
    accounting: { transactions: transactions.length, invoices: invoices.length, documents: documents.length, proofGap: Math.max(0, transactions.length - documents.length), invoicedAmount },
    investment: { investments: investments.length, businessPlans: businessPlans.length, fundingSources: arr(props.bpFundingSources).length, risks: arr(props.bpRisks).length, planned: investments.reduce((sum, row) => sum + amount(row), 0) },
    suppliers: { total: fournisseurs.length, reliable: reliableSuppliers, risky: riskySuppliers, families: supplierFamilies, stockRows: supplierStockRows.length, stockValue: supplierStockValue, expenses: supplierExpenses, transportCosts },
    proof: { documents: documents.length, events: events.length, reports: reports.length, proofs: documents.length + events.length + reports.length },
    execution: { tasks: taches.length, lateTasks, equipments: equipements.length, equipmentIssues },
    smart: { sensors: sensors.length, cameras: cameras.length, offline: [...sensors, ...cameras].filter((row) => ['offline', 'panne', 'inactive'].includes(statusOf(row))).length },
    risks: { alerts: alertes.length, criticalAlerts: alertes.filter((row) => ['critique', 'urgence'].includes(lower(row.severity || row.gravite))).length, auditLogs: auditLogs.length, offlineOrSync },
  };
}

export default function ImpactFarmValueBridgeV4(props) {
  const [tab, setTab] = useState('sante');
  const s = useMemo(() => buildStats(props), [props]);
  const domains = {
    sante: { icon: HeartPulse, label: 'Santé', title: 'Santé & biosécurité', visibility: 'Soins, maladies, mortalité, traitements, délais d’attente, ordonnances, vaccins, stock santé.', outcome: 'Sujets en meilleur état, interventions à temps, pertes sanitaires réduites, suivi sanitaire prouvé.', metrics: [{ icon: HeartPulse, title: 'Sujets en bon état', value: pct(s.health.healthyRate), detail: `${fmtNumber(s.health.healthySubjects)} sur ${fmtNumber(s.health.totalSubjects)} sujet(s)`, module: 'animaux' }, { icon: AlertTriangle, title: 'Sujets à surveiller', value: fmtNumber(s.health.riskySubjects), detail: 'malades, sous traitement ou lots à risque', tone: s.health.riskySubjects ? 'danger' : 'good', module: 'sante' }, { icon: ClipboardCheck, title: 'Soins suivis', value: fmtNumber(s.health.careCount), detail: `${fmtNumber(s.health.lateCare)} soin(s) en retard / à faire`, tone: s.health.lateCare ? 'amber' : 'good', module: 'sante' }, { icon: ShieldCheck, title: 'Vaccins / traitements', value: fmtNumber(s.health.vaccineCare), detail: 'préventif et curatif tracés', module: 'sante' }, { icon: Package, title: 'Stock santé', value: fmtNumber(s.health.healthStock), detail: `${fmtNumber(s.health.healthStockCritical)} produit(s) sous seuil`, tone: s.health.healthStockCritical ? 'danger' : 'good', module: 'stock' }, { icon: FileText, title: 'Preuves sanitaires', value: fmtNumber(s.health.healthDocs), detail: 'ordonnances, certificats, vaccins', tone: s.health.healthDocs ? 'good' : 'amber', module: 'documents' }, { icon: DollarSign, title: 'Coût santé visible', value: money(s.health.healthCost), detail: 'dépenses santé/véto liées aux finances', tone: s.health.healthCost ? 'good' : 'amber', module: 'finances' }, { icon: AlertTriangle, title: 'Risque sanitaire', value: fmtNumber(s.health.riskSignals), detail: 'sujets, soins et stock santé', tone: s.health.riskSignals ? 'danger' : 'good', module: 'alertes' }] },
    animaux: { icon: Beef, label: 'Animaux', title: 'Animaux', visibility: 'Identité, santé, statut vente, soins et historique par sujet.', outcome: 'Protéger, vendre, isoler ou suivre les bons sujets sans ressaisie.', metrics: [{ icon: Beef, title: 'Animaux suivis', value: fmtNumber(s.animaux.count), detail: 'fiches animales actives', module: 'animaux' }, { icon: HeartPulse, title: 'Santé animaux', value: pct(s.animaux.healthyRate), detail: `${fmtNumber(s.animaux.sickAnimals)} malade(s)`, tone: s.animaux.sickAnimals ? 'danger' : 'good', module: 'sante' }, { icon: Receipt, title: 'Prêts vente', value: fmtNumber(s.animaux.saleReady), detail: 'sujets marqués prêts à vendre', module: 'ventes' }] },
    avicole: { icon: Bird, label: 'Avicole', title: 'Avicole', visibility: 'Lots, mortalité, ponte, croissance, alimentation, santé et ventes.', outcome: 'Relancer un lot, augmenter les pondeuses ou corriger l’alimentation au bon moment.', metrics: [{ icon: Bird, title: 'Lots suivis', value: fmtNumber(s.avicole.lots), detail: 'chair, ponte ou autres lots', module: 'avicole' }, { icon: AlertTriangle, title: 'Lots à risque', value: fmtNumber(s.avicole.riskyLots), detail: 'mortalité ou santé', tone: s.avicole.riskyLots ? 'danger' : 'good', module: 'sante' }, { icon: ClipboardCheck, title: 'Relevés ponte', value: fmtNumber(s.avicole.logs), detail: `${fmtNumber(s.avicole.eggs)} œufs enregistrés`, module: 'avicole' }, { icon: AlertTriangle, title: 'Pertes / casses', value: fmtNumber(s.avicole.losses), detail: 'impact direct sur la marge', tone: s.avicole.losses ? 'amber' : 'good', module: 'avicole' }] },
    cultures: { icon: Sprout, label: 'Cultures', title: 'Cultures & campagnes', visibility: 'Parcelles, campagnes, coûts, récoltes, pertes, statut et revenus.', outcome: 'Reprendre, réduire, sécuriser les intrants ou chercher des débouchés avant récolte.', metrics: [{ icon: Sprout, title: 'Cultures suivies', value: fmtNumber(s.cultures.count), detail: 'cultures, parcelles ou campagnes', module: 'cultures' }, { icon: AlertTriangle, title: 'Risques cultures', value: fmtNumber(s.cultures.risks), detail: 'santé basse ou statut perdu', tone: s.cultures.risks ? 'danger' : 'good', module: 'cultures' }, { icon: DollarSign, title: 'CA cultures', value: money(s.cultures.revenue), detail: 'revenu réel ou estimé', module: 'finances' }] },
    stock: { icon: Package, label: 'Stocks', title: 'Stocks & alimentation', visibility: 'Aliments, intrants, médicaments, seuils, ruptures, unités et coûts complets.', outcome: 'Acheter à temps, éviter les ruptures, suivre la consommation sans mélanger kg, unités ou litres.', metrics: [{ icon: Package, title: 'Stocks suivis', value: fmtNumber(s.stock.total), detail: `unités : ${s.stock.units.slice(0, 4).join(', ') || 'à renseigner'}`, module: 'stock' }, { icon: AlertTriangle, title: 'Stocks critiques', value: fmtNumber(s.stock.critical), detail: 'achat, transfert ou substitution à décider', tone: s.stock.critical ? 'danger' : 'good', module: 'stock' }, { icon: Package, title: 'Aliments / intrants', value: fmtNumber(s.stock.feed), detail: `${fmtNumber(s.stock.health)} produit(s) santé`, module: 'stock' }, { icon: DollarSign, title: 'Valeur stock', value: s.stock.valueDisplay, detail: s.stock.value > 0 ? `${fmtNumber(s.stock.valuedRows)} produit(s) avec coût fiable` : `${fmtNumber(s.stock.missingPrice)} produit(s) avec quantité sans prix/coût`, tone: s.stock.value > 0 ? 'good' : 'amber', module: 'stock' }] },
    ventes: { icon: Receipt, label: 'Ventes', title: 'Ventes & débouchés', visibility: 'Opportunités, commandes, lignes, livraisons, factures, paiements, invendus, créances.', outcome: 'Vendre au bon moment, prioriser les clients, réduire les invendus et récupérer le cash.', metrics: [{ icon: Receipt, title: 'Commandes', value: fmtNumber(s.sales.orders), detail: `${fmtNumber(s.sales.items)} ligne(s), ${fmtNumber(s.sales.opportunities)} opportunité(s)`, module: 'ventes' }, { icon: Truck, title: 'Livraisons', value: `${fmtNumber(s.sales.deliveredCount)}/${fmtNumber(s.sales.deliveries)}`, detail: 'livré / prévu', tone: s.sales.deliveredCount < s.sales.deliveries ? 'amber' : 'good', module: 'ventes' }, { icon: FileText, title: 'Facturation', value: money(s.sales.invoicedAmount), detail: `${fmtNumber(s.sales.invoices)} facture(s)`, module: 'ventes' }, { icon: AlertTriangle, title: 'Reste à encaisser', value: money(s.sales.receivables), detail: `${fmtNumber(s.sales.unpaidOrders)} commande(s) à suivre`, tone: s.sales.receivables ? 'amber' : 'good', module: 'clients' }] },
    clients: { icon: Users, label: 'Clients', title: 'Clients & recouvrement', visibility: 'Clients, achats répétés, WhatsApp, créances, paiements et relances.', outcome: 'Relancer seulement les vrais débiteurs, reconnaître les bons clients et réduire le cash dehors.', metrics: [{ icon: Users, title: 'Clients suivis', value: fmtNumber(s.clients.count), detail: `${fmtNumber(s.clients.recurrentClients)} récurrent(s)`, module: 'clients' }, { icon: AlertTriangle, title: 'Clients débiteurs', value: fmtNumber(s.clients.unpaidClients), detail: 'solde ou dette à suivre', tone: s.clients.unpaidClients ? 'amber' : 'good', module: 'clients' }, { icon: DollarSign, title: 'Créances', value: money(s.clients.receivables), detail: 'cash à récupérer', tone: s.clients.receivables ? 'amber' : 'good', module: 'clients' }, { icon: ClipboardCheck, title: 'WhatsApp / relances', value: fmtNumber(s.clients.whatsapp), detail: 'messages et traces commerciales', module: 'clients' }] },
    finance: { icon: DollarSign, label: 'Finances', title: 'Finances & rentabilité', visibility: 'Revenus, charges, paiements, créances, marge, transactions par activité.', outcome: 'Protéger le cash, choisir où réinvestir et éviter les activités qui consomment trop.', metrics: [{ icon: DollarSign, title: 'Revenus', value: money(s.finance.revenue), detail: 'encaissements + recettes', module: 'finances' }, { icon: DollarSign, title: 'Charges', value: money(s.finance.expenses), detail: 'dépenses et coûts enregistrés', tone: s.finance.expenses ? 'amber' : 'good', module: 'finances' }, { icon: ShieldCheck, title: 'Résultat suivi', value: money(s.finance.margin), detail: `${fmtNumber(s.finance.transactions)} transaction(s)`, tone: s.finance.margin >= 0 ? 'good' : 'danger', module: 'finances' }, { icon: AlertTriangle, title: 'Cash dehors', value: money(s.finance.receivables), detail: `${fmtNumber(s.finance.payments)} paiement(s) suivis`, tone: s.finance.receivables ? 'amber' : 'good', module: 'clients' }] },
    compta: { icon: BookOpen, label: 'Compta', title: 'Comptabilité & justificatifs', visibility: 'Transactions, factures, pièces, documents et écarts de justification.', outcome: 'Comptabilité plus lisible, moins de trous de preuve, dossier financeur plus solide.', metrics: [{ icon: BookOpen, title: 'Écritures', value: fmtNumber(s.accounting.transactions), detail: 'transactions financières', module: 'comptabilite' }, { icon: Receipt, title: 'Factures', value: fmtNumber(s.accounting.invoices), detail: money(s.accounting.invoicedAmount), module: 'ventes' }, { icon: FileText, title: 'Justificatifs', value: fmtNumber(s.accounting.documents), detail: 'documents rattachables', module: 'documents' }, { icon: AlertTriangle, title: 'À justifier', value: fmtNumber(s.accounting.proofGap), detail: 'transactions sans preuve évidente', tone: s.accounting.proofGap ? 'amber' : 'good', module: 'documents' }] },
    investissements: { icon: Building2, label: 'Invest.', title: 'Investissements & business plan', visibility: 'Projets, budgets, business plans, financements, risques et liens production.', outcome: 'Financer ce qui rapporte, reporter ce qui est fragile, défendre le projet devant un partenaire.', metrics: [{ icon: Building2, title: 'Investissements', value: fmtNumber(s.investment.investments), detail: money(s.investment.planned), module: 'investissements' }, { icon: FileText, title: 'Business plans', value: fmtNumber(s.investment.businessPlans), detail: 'scénarios et projets', module: 'investissements' }, { icon: DollarSign, title: 'Sources financement', value: fmtNumber(s.investment.fundingSources), detail: 'apports, crédits ou partenaires', module: 'investissements' }, { icon: AlertTriangle, title: 'Risques BP', value: fmtNumber(s.investment.risks), detail: 'points à sécuriser', tone: s.investment.risks ? 'amber' : 'good', module: 'investissements' }] },
    fournisseurs: { icon: Truck, label: 'Fourn.', title: 'Fournisseurs & approvisionnement', visibility: 'Fournisseurs, familles couvertes, achats, transport, fiabilité, risques et stocks liés.', outcome: 'Sécuriser les cycles, choisir chez qui racheter, négocier, éviter qu’un fournisseur bloque la production.', metrics: [{ icon: Truck, title: 'Fournisseurs suivis', value: fmtNumber(s.suppliers.total), detail: `${fmtNumber(s.suppliers.reliable)} fiable(s)`, module: 'fournisseurs' }, { icon: AlertTriangle, title: 'Fournisseurs à risque', value: fmtNumber(s.suppliers.risky), detail: 'retard, litige, note basse ou inactif', tone: s.suppliers.risky ? 'danger' : 'good', module: 'fournisseurs' }, { icon: Package, title: 'Familles couvertes', value: fmtNumber(s.suppliers.families.length), detail: s.suppliers.families.slice(0, 4).join(', ') || 'à qualifier', tone: s.suppliers.families.length ? 'good' : 'amber', module: 'fournisseurs' }, { icon: DollarSign, title: 'Achats fournisseur', value: money(s.suppliers.expenses || s.suppliers.stockValue), detail: `${money(s.suppliers.transportCosts)} transport/frais visibles`, tone: s.suppliers.expenses || s.suppliers.stockValue ? 'good' : 'amber', module: 'finances' }] },
    preuves: { icon: FileText, label: 'Preuves', title: 'Traçabilité, documents & rapports', visibility: 'Documents, historiques, preuves sanitaires, factures, mouvements, rapports et décisions.', outcome: 'Rassurer clients, banques et partenaires, préparer contrôle ou dossier financeur.', metrics: [{ icon: FileText, title: 'Documents', value: fmtNumber(s.proof.documents), detail: 'preuves et justificatifs', module: 'documents' }, { icon: GitBranch, title: 'Événements métier', value: fmtNumber(s.proof.events), detail: 'historique des actions', module: 'tracabilite' }, { icon: FileText, title: 'Rapports', value: fmtNumber(s.proof.reports), detail: 'exports et présentations', module: 'rapports' }, { icon: ShieldCheck, title: 'Preuves disponibles', value: fmtNumber(s.proof.proofs), detail: 'documents + traces + rapports', module: 'rapports' }] },
    execution: { icon: Wrench, label: 'Capacité', title: 'Équipe & équipements', visibility: 'Tâches, responsables, retards, équipements, pannes et disponibilité.', outcome: 'Transformer les décisions en actions terrain et vérifier la capacité réelle à produire plus.', metrics: [{ icon: Users, title: 'Tâches terrain', value: fmtNumber(s.execution.tasks), detail: `${fmtNumber(s.execution.lateTasks)} retard(s)`, tone: s.execution.lateTasks ? 'amber' : 'good', module: 'taches' }, { icon: Wrench, title: 'Équipements', value: fmtNumber(s.execution.equipments), detail: `${fmtNumber(s.execution.equipmentIssues)} panne(s) / maintenance`, tone: s.execution.equipmentIssues ? 'amber' : 'good', module: 'equipements' }] },
    smart: { icon: Radio, label: 'Smart', title: 'Smart Farm, météo & capteurs', visibility: 'Capteurs, caméras, météo, alertes techniques et disponibilité connectée.', outcome: 'Réagir plus vite aux conditions terrain, surveiller à distance et réduire les angles morts.', metrics: [{ icon: Radio, title: 'Capteurs', value: fmtNumber(s.smart.sensors), detail: 'humidité, météo ou mesures', module: 'smartfarm' }, { icon: Radio, title: 'Caméras', value: fmtNumber(s.smart.cameras), detail: 'surveillance terrain', module: 'smartfarm' }, { icon: AlertTriangle, title: 'Hors ligne', value: fmtNumber(s.smart.offline), detail: 'capteurs/caméras à vérifier', tone: s.smart.offline ? 'amber' : 'good', module: 'smartfarm' }] },
    risques: { icon: History, label: 'Risques', title: 'Alertes, audit & synchronisation', visibility: 'Alertes, risques, logs, actions hors ligne, synchronisation et historique.', outcome: 'Sécuriser la donnée, éviter les doublons, garder la preuve des actions.', metrics: [{ icon: AlertTriangle, title: 'Alertes', value: fmtNumber(s.risks.alerts), detail: `${fmtNumber(s.risks.criticalAlerts)} critique(s)`, tone: s.risks.criticalAlerts ? 'danger' : 'good', module: 'alertes' }, { icon: History, title: 'Audit logs', value: fmtNumber(s.risks.auditLogs), detail: 'actions et modifications tracées', module: 'audit_logs' }, { icon: Wifi, title: 'Sync/offline', value: fmtNumber(s.risks.offlineOrSync), detail: 'événements de synchronisation', tone: s.risks.offlineOrSync ? 'amber' : 'good', module: 'sync' }] },
  };
  const tabs = Object.entries(domains).map(([id, domain]) => ({ id, label: domain.label, icon: domain.icon }));
  const activeDomain = domains[tab] || domains.sante;
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Domaines maîtrisés grâce à l’ERP</p>
        <h3 className="font-black text-[#2f2415]">Décisions utiles par domaine</h3>
        <p className="text-sm text-[#7d6a4a] mt-1">Visibilité, décisions, gains et liens directs vers les modules concernés.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => <TabButton key={item.id} active={tab === item.id} icon={item.icon} label={item.label} onClick={() => setTab(item.id)} />)}
      </div>
      <DomainPanel domain={activeDomain} onNavigate={props.onNavigate} />
    </div>
  );
}
