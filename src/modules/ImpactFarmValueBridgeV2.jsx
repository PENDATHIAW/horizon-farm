import { AlertTriangle, ArrowRight, Building2, ClipboardCheck, DollarSign, FileCheck2, HeartPulse, Package, ShieldCheck, Sprout, Truck, Users, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const money = (value) => fmtCurrency(toNumber(value));
const statusOf = (row = {}) => lower(row.status || row.statut || row.health_status || row.statut_sante);
const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.value ?? row.valeur ?? row.cout ?? row.cout_total ?? row.frais_sante);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const isUnpaid = (row = {}) => ['impaye', 'impayé', 'partiel', 'partial', 'en_retard', 'retard', 'overdue', 'unpaid', 'a_relancer', 'à_relancer'].includes(statusOf(row));
const isRevenue = (row = {}) => ['entree', 'entrée', 'revenu', 'recette', 'vente', 'income'].some((key) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''}`).includes(key));
const isExpense = (row = {}) => ['sortie', 'depense', 'dépense', 'charge', 'achat', 'expense'].some((key) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''}`).includes(key));
const hasTerm = (row = {}, terms = []) => terms.some((term) => lower(`${row.title || ''} ${row.name || ''} ${row.nom || ''} ${row.libelle || ''} ${row.produit || ''} ${row.categorie || ''} ${row.type || ''} ${row.module_source || ''} ${row.entity_type || ''} ${row.description || ''}`).includes(term));

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

function TabButton({ active, icon: Icon, children, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-xl px-3 py-2 text-xs md:text-sm font-bold border flex items-center gap-2 ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>
      <Icon size={15} /> {children}
    </button>
  );
}

function MetricCard({ icon: Icon, title, value, detail, tone = 'good', module, onNavigate }) {
  const toneClass = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  const Comp = module ? 'button' : 'div';
  return (
    <Comp type={module ? 'button' : undefined} onClick={module ? () => navigateTo(module, onNavigate) : undefined} className={`rounded-2xl border p-4 text-left ${toneClass}`}>
      <div className="flex items-start justify-between gap-3"><Icon size={18} />{module ? <ArrowRight size={14} /> : null}</div>
      <p className="text-2xl font-black mt-2">{value}</p>
      <p className="font-bold text-[#2f2415]">{title}</p>
      <p className="text-xs mt-1">{detail}</p>
    </Comp>
  );
}

function DomainIntro({ title, shows, enables }) {
  return (
    <div className="rounded-2xl bg-[#fffdf8] border border-[#eadcc2] p-4">
      <h3 className="font-black text-[#2f2415]">{title}</h3>
      <p className="text-sm text-[#7d6a4a] mt-2"><b className="text-[#2f2415]">ERP montre :</b> {shows}</p>
      <p className="text-sm text-[#7d6a4a] mt-1"><b className="text-[#2f2415]">Ça permet :</b> {enables}</p>
    </div>
  );
}

function HealthPanel({ stats, onNavigate }) {
  return (
    <div className="space-y-4">
      <DomainIntro title="Santé & biosécurité" shows="soins, maladies, mortalité, traitements, délais d’attente, ordonnances, vaccins et stock santé." enables="garder les sujets en meilleur état, intervenir à temps, réduire les pertes sanitaires et prouver le suivi de la ferme." />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard icon={HeartPulse} title="Sujets en bon état" value={pct(stats.healthyRate)} detail={`${fmtNumber(stats.healthySubjects)} sur ${fmtNumber(stats.totalSubjects)} sujet(s)`} module="animaux" onNavigate={onNavigate} />
        <MetricCard icon={AlertTriangle} title="Sujets à surveiller" value={fmtNumber(stats.riskySubjects)} detail="malades, sous traitement ou lots avec mortalité" tone={stats.riskySubjects ? 'danger' : 'good'} module="sante" onNavigate={onNavigate} />
        <MetricCard icon={ClipboardCheck} title="Soins suivis" value={fmtNumber(stats.careCount)} detail={`${fmtNumber(stats.lateCare)} soin(s) en retard / à faire`} tone={stats.lateCare ? 'amber' : 'good'} module="sante" onNavigate={onNavigate} />
        <MetricCard icon={ShieldCheck} title="Vaccins / traitements" value={fmtNumber(stats.vaccineCare)} detail="actes préventifs ou curatifs tracés" module="sante" onNavigate={onNavigate} />
        <MetricCard icon={Package} title="Stock santé" value={fmtNumber(stats.healthStock)} detail={`${fmtNumber(stats.healthStockCritical)} produit(s) sous seuil`} tone={stats.healthStockCritical ? 'danger' : 'good'} module="stock" onNavigate={onNavigate} />
        <MetricCard icon={FileCheck2} title="Preuves sanitaires" value={fmtNumber(stats.healthDocs)} detail="ordonnances, certificats, vaccins, justificatifs" tone={stats.healthDocs ? 'good' : 'amber'} module="documents" onNavigate={onNavigate} />
        <MetricCard icon={DollarSign} title="Coût santé visible" value={money(stats.healthCost)} detail="dépenses santé/véto liées aux finances" tone={stats.healthCost ? 'good' : 'amber'} module="finances" onNavigate={onNavigate} />
        <MetricCard icon={AlertTriangle} title="Risque sanitaire" value={fmtNumber(stats.healthRiskSignals)} detail="sujets, soins, stock santé et alertes" tone={stats.healthRiskSignals ? 'danger' : 'good'} module="alertes" onNavigate={onNavigate} />
      </div>
    </div>
  );
}

function GenericPanel({ domain, onNavigate }) {
  return (
    <div className="space-y-4">
      <DomainIntro title={domain.title} shows={domain.shows} enables={domain.enables} />
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
  const businessEvents = arr(props.businessEvents);
  const cultures = arr(props.cultures);
  const clients = arr(props.clients);
  const fournisseurs = arr(props.fournisseurs);
  const equipements = arr(props.equipements);
  const productionLogs = arr(props.productionLogs);

  const sickAnimals = animaux.filter((row) => ['malade', 'sous_traitement', 'critique'].some((term) => statusOf(row).includes(term))).length;
  const riskyLots = lots.filter((row) => ['malade', 'sous_traitement', 'critique'].some((term) => statusOf(row).includes(term)) || toNumber(row.mortality || row.morts) > 0).length;
  const totalSubjects = animaux.length + lots.length;
  const riskySubjects = sickAnimals + riskyLots;
  const healthySubjects = Math.max(0, totalSubjects - riskySubjects);
  const lateCare = sante.filter((row) => ['retard', 'en_retard', 'à_faire', 'a_faire'].includes(statusOf(row))).length;
  const vaccineCare = sante.filter((row) => hasTerm(row, ['vaccin', 'traitement', 'soin', 'préventif', 'preventif', 'curatif'])).length;
  const healthStockRows = stocks.filter((row) => hasTerm(row, ['vaccin', 'médicament', 'medicament', 'traitement', 'désinfectant', 'desinfectant', 'veto', 'véto']));
  const healthStockCritical = healthStockRows.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row)).length;
  const healthDocs = documents.filter((row) => hasTerm(row, ['sante', 'santé', 'ordonnance', 'certificat', 'vaccin', 'traitement', 'veterinaire', 'vétérinaire'])).length;
  const healthCost = transactions.filter((row) => hasTerm(row, ['sante', 'santé', 'veto', 'véto', 'vaccin', 'traitement'])).reduce((sum, row) => sum + amount(row), 0);
  const healthAlerts = alertes.filter((row) => hasTerm(row, ['sante', 'santé', 'animal', 'avicole', 'vaccin', 'traitement'])).length;

  const criticalStocks = stocks.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  const feedStocks = stocks.filter((row) => hasTerm(row, ['aliment', 'provende', 'intrant', 'semence', 'engrais']));
  const stockValue = stocks.reduce((sum, row) => sum + stockQty(row) * toNumber(row.prix_unitaire ?? row.unit_price ?? row.price ?? row.cout_unitaire), 0);
  const revenue = payments.reduce((sum, row) => sum + amount(row), 0) + transactions.filter(isRevenue).reduce((sum, row) => sum + amount(row), 0);
  const expenses = transactions.filter(isExpense).reduce((sum, row) => sum + amount(row), 0);
  const receivables = [...salesOrders, ...payments, ...transactions].filter(isUnpaid).reduce((sum, row) => sum + amount(row), 0);
  const lateTasks = taches.filter((row) => ['retard', 'en_retard', 'critique'].includes(statusOf(row)) || lower(row.priority || row.priorite).includes('critique')).length;
  const equipmentIssues = equipements.filter((row) => ['panne', 'hors_service', 'maintenance'].includes(statusOf(row))).length;
  const reliableSuppliers = fournisseurs.filter((row) => toNumber(row.note) >= 4 || row.verified || row.favorite).length;
  const proofs = documents.length + businessEvents.length;
  const recurrentClients = clients.filter((row) => toNumber(row.totalAchats ?? row.totalachats) > 0).length;

  return {
    health: { totalSubjects, healthySubjects, healthyRate: totalSubjects ? (healthySubjects / totalSubjects) * 100 : 0, riskySubjects, careCount: sante.length, lateCare, vaccineCare, healthStock: healthStockRows.length, healthStockCritical, healthDocs, healthCost, healthRiskSignals: riskySubjects + lateCare + healthStockCritical + healthAlerts },
    stock: { total: stocks.length, critical: criticalStocks.length, feed: feedStocks.length, value: stockValue, healthStock: healthStockRows.length },
    production: { cultures: cultures.length, lots: lots.length, animals: animaux.length, logs: productionLogs.length, eggs: productionLogs.reduce((sum, row) => sum + toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity), 0), losses: productionLogs.reduce((sum, row) => sum + toNumber(row.oeufs_casses ?? row.pertes ?? row.broken), 0) },
    sales: { orders: salesOrders.length, clients: clients.length, recurrentClients, receivables },
    finance: { revenue, expenses, margin: revenue - expenses, receivables },
    proof: { documents: documents.length, events: businessEvents.length, proofs },
    execution: { tasks: taches.length, lateTasks, equipments: equipements.length, equipmentIssues, suppliers: fournisseurs.length, reliableSuppliers },
  };
}

export default function ImpactFarmValueBridgeV2(props) {
  const [tab, setTab] = useState('sante');
  const stats = useMemo(() => buildStats(props), [props]);
  const domains = {
    stock: { title: 'Stocks & alimentation', shows: 'aliments, intrants, médicaments, seuils, ruptures et valeur stock.', enables: 'acheter au bon moment, éviter les ruptures et suivre ce que les sujets consomment.', metrics: [
      { icon: Package, title: 'Stocks suivis', value: fmtNumber(stats.stock.total), detail: 'produits et intrants enregistrés', module: 'stock' },
      { icon: AlertTriangle, title: 'Stocks critiques', value: fmtNumber(stats.stock.critical), detail: 'sous seuil ou à sécuriser', tone: stats.stock.critical ? 'danger' : 'good', module: 'stock' },
      { icon: Package, title: 'Aliments / intrants', value: fmtNumber(stats.stock.feed), detail: 'liés à la production', module: 'stock' },
      { icon: DollarSign, title: 'Valeur stock', value: money(stats.stock.value), detail: 'base pour pilotage et financement', module: 'stock' },
    ] },
    production: { title: 'Production & rendement', shows: 'lots, animaux, cultures, ponte, récoltes, pertes, casses et volumes produits.', enables: 'savoir quoi protéger, quoi vendre et quoi reprendre au prochain cycle.', metrics: [
      { icon: Sprout, title: 'Cultures suivies', value: fmtNumber(stats.production.cultures), detail: 'campagnes, parcelles ou cultures', module: 'cultures' },
      { icon: ShieldCheck, title: 'Lots / animaux', value: fmtNumber(stats.production.lots + stats.production.animals), detail: 'production animale suivie', module: 'avicole' },
      { icon: ClipboardCheck, title: 'Relevés production', value: fmtNumber(stats.production.logs), detail: 'ponte, croissance ou rendement', module: 'avicole' },
      { icon: AlertTriangle, title: 'Pertes / casses', value: fmtNumber(stats.production.losses), detail: 'à réduire pour protéger la marge', tone: stats.production.losses ? 'amber' : 'good', module: 'avicole' },
    ] },
    ventes: { title: 'Ventes & débouchés', shows: 'clients, commandes, opportunités, invendus, créances et produits prêts à vendre.', enables: 'vendre au bon moment, choisir quoi vendre, relancer utilement et réduire les invendus.', metrics: [
      { icon: Truck, title: 'Commandes', value: fmtNumber(stats.sales.orders), detail: 'ventes et débouchés suivis', module: 'ventes' },
      { icon: Users, title: 'Clients', value: fmtNumber(stats.sales.clients), detail: `${fmtNumber(stats.sales.recurrentClients)} client(s) récurrent(s)`, module: 'clients' },
      { icon: DollarSign, title: 'Créances', value: money(stats.sales.receivables), detail: 'argent à suivre ou relancer', tone: stats.sales.receivables ? 'amber' : 'good', module: 'clients' },
      { icon: TargetIcon, title: 'Décision vente', value: stats.sales.orders ? 'Active' : 'À nourrir', detail: 'lier produits prêts et opportunités', module: 'ventes' },
    ] },
    finance: { title: 'Finances & rentabilité', shows: 'revenus, charges, coûts par activité, marges, paiements et reste à encaisser.', enables: 'protéger le cash, réinvestir au bon endroit et éviter une activité qui consomme trop.', metrics: [
      { icon: DollarSign, title: 'Revenus', value: money(stats.finance.revenue), detail: 'encaissements et recettes', module: 'finances' },
      { icon: DollarSign, title: 'Charges', value: money(stats.finance.expenses), detail: 'sorties et coûts suivis', module: 'finances' },
      { icon: ShieldCheck, title: 'Résultat suivi', value: money(stats.finance.margin), detail: 'revenus moins charges', tone: stats.finance.margin >= 0 ? 'good' : 'danger', module: 'finances' },
      { icon: AlertTriangle, title: 'À encaisser', value: money(stats.finance.receivables), detail: 'créances impactant le cash', tone: stats.finance.receivables ? 'amber' : 'good', module: 'clients' },
    ] },
    preuve: { title: 'Traçabilité & preuves', shows: 'documents, historiques, preuves sanitaires, factures, mouvements et décisions.', enables: 'rassurer clients, banques et partenaires, préparer contrôle ou dossier financeur.', metrics: [
      { icon: FileCheck2, title: 'Documents', value: fmtNumber(stats.proof.documents), detail: 'preuves et justificatifs', module: 'documents' },
      { icon: ClipboardCheck, title: 'Événements métier', value: fmtNumber(stats.proof.events), detail: 'historique des décisions et actions', module: 'tracabilite' },
      { icon: Building2, title: 'Preuves disponibles', value: fmtNumber(stats.proof.proofs), detail: 'documents + traces métier', module: 'rapports' },
      { icon: ShieldCheck, title: 'Conformité', value: stats.proof.proofs ? 'À prouver' : 'À construire', detail: 'sanitaire, ventes et finance', module: 'documents' },
    ] },
    execution: { title: 'Équipe, équipements & fournisseurs', shows: 'tâches, responsables, retards, équipements, pannes et fournisseurs clés.', enables: 'transformer les décisions en actions terrain et vérifier la capacité réelle à produire plus.', metrics: [
      { icon: Users, title: 'Tâches terrain', value: fmtNumber(stats.execution.tasks), detail: `${fmtNumber(stats.execution.lateTasks)} retard(s)`, tone: stats.execution.lateTasks ? 'amber' : 'good', module: 'taches' },
      { icon: Wrench, title: 'Équipements', value: fmtNumber(stats.execution.equipments), detail: `${fmtNumber(stats.execution.equipmentIssues)} panne(s) / maintenance`, tone: stats.execution.equipmentIssues ? 'amber' : 'good', module: 'equipements' },
      { icon: Truck, title: 'Fournisseurs', value: fmtNumber(stats.execution.suppliers), detail: `${fmtNumber(stats.execution.reliableSuppliers)} fiable(s)`, module: 'fournisseurs' },
      { icon: Building2, title: 'Capacité à grandir', value: stats.execution.equipmentIssues || stats.execution.lateTasks ? 'À sécuriser' : 'Prête à suivre', detail: 'équipe, matériel et approvisionnement', module: 'impact_business' },
    ] },
  };

  const tabs = [
    { id: 'sante', label: 'Santé', icon: HeartPulse },
    { id: 'stock', label: 'Stocks', icon: Package },
    { id: 'production', label: 'Production', icon: Sprout },
    { id: 'ventes', label: 'Ventes', icon: Truck },
    { id: 'finance', label: 'Finances', icon: DollarSign },
    { id: 'preuve', label: 'Traçabilité', icon: FileCheck2 },
    { id: 'execution', label: 'Capacité', icon: Wrench },
  ];

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Domaines maîtrisés grâce à l’ERP</p>
        <h3 className="font-black text-[#2f2415]">Ce que les données reliées permettent de décider à temps</h3>
        <p className="text-sm text-[#7d6a4a] mt-1">Chaque sous-onglet montre ce que l’ERP détecte, ce que ça permet et les chiffres utiles.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => <TabButton key={item.id} active={tab === item.id} icon={item.icon} onClick={() => setTab(item.id)}>{item.label}</TabButton>)}
      </div>
      {tab === 'sante' ? <HealthPanel stats={stats.health} onNavigate={props.onNavigate} /> : <GenericPanel domain={domains[tab]} onNavigate={props.onNavigate} />}
    </div>
  );
}

const TargetIcon = ShieldCheck;
