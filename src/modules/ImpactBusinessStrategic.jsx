import { AlertTriangle, ArrowRight, Bird, Building2, CheckCircle2, ClipboardCheck, DollarSign, Factory, FileCheck2, HeartPulse, Layers, Package, Scale, ShieldCheck, Sprout, Target, TrendingUp, Truck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));
const money = (value) => fmtCurrency(toNumber(value));
const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.total_amount ?? row.estimated_amount ?? row.value ?? row.valeur);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const stockUnitPrice = (row = {}) => toNumber(row.prix_unitaire ?? row.prixUnit ?? row.prixunit ?? row.unit_price ?? row.price ?? row.cout_unitaire);
const eggCount = (row = {}) => toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
const brokenEggs = (row = {}) => toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
const statusOf = (row = {}) => lower(row.status || row.statut || row.payment_status || row.statut_paiement);
const isExpense = (row = {}) => ['sortie', 'depense', 'dépense', 'charge', 'achat', 'expense'].some((key) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''}`).includes(key));
const isRevenue = (row = {}) => ['entree', 'entrée', 'revenu', 'recette', 'vente', 'income'].some((key) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''}`).includes(key));
const isUnpaid = (row = {}) => ['impaye', 'impayé', 'partiel', 'partial', 'en_retard', 'retard', 'overdue', 'unpaid'].includes(statusOf(row));
const isClosed = (row = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done', 'closed', 'termine', 'terminé'].includes(statusOf(row));
const hasText = (row = {}, terms = []) => terms.some((term) => lower(`${row.product_name || ''} ${row.libelle || ''} ${row.title || ''} ${row.name || ''} ${row.nom || ''} ${row.type || ''} ${row.culture || ''}`).includes(term));

function navigateTo(target, onNavigate) {
  if (onNavigate) return onNavigate(target);
  const buttons = Array.from(document.querySelectorAll('nav button, aside button'));
  const match = buttons.find((button) => button.textContent?.toLowerCase().includes(String(target || '').toLowerCase()));
  if (match) match.click();
}
function marginScore(margin, revenue) { if (revenue <= 0) return 30; return clamp(50 + ((margin / revenue) * 100)); }
function cashScore(revenue, expenses, receivables) { if (expenses <= 0 && revenue > 0) return 80; const pressure = expenses + receivables; if (pressure <= 0) return 55; return clamp((revenue / pressure) * 60); }
function demandScore(salesCount, revenue, unsold = 0) { const base = salesCount > 0 ? 55 + Math.min(30, salesCount * 5) : revenue > 0 ? 45 : 25; return clamp(base - Math.min(25, unsold * 4)); }
function capacityScore({ stockOk = true, tasksLate = 0, criticalStock = 0, base = 65 }) { return clamp(base - (stockOk ? 0 : 18) - (criticalStock * 7) - (tasksLate * 4)); }
function dataScore(points, expected) { if (!expected) return 30; return clamp((points / expected) * 100); }
function rotationScore(cycleDays, revenue, margin) { if (!cycleDays) return revenue > 0 ? 55 : 35; const cyclesPerYear = 365 / Math.max(1, cycleDays); const monthlyMargin = (margin * cyclesPerYear) / 12; return clamp(35 + Math.min(35, cyclesPerYear * 5) + Math.min(30, monthlyMargin / 10000)); }
function riskControlScore(lossRate, alertCount = 0) { return clamp(95 - (lossRate * 4) - (alertCount * 10)); }
function recommendation(score, scores) {
  if (scores.data < 40) return { label: 'Tester petit volume', reason: 'Données encore insuffisantes pour engager gros.' };
  if (scores.cash < 35) return { label: 'Reprendre avec financement sécurisé', reason: 'Besoin de cash trop fort pour augmenter sans filet.' };
  if (scores.risque < 35) return { label: 'Corriger les risques avant relance', reason: 'Les pertes ou alertes peuvent absorber la marge.' };
  if (scores.demande < 40) return { label: 'Sécuriser les clients avant reprise', reason: 'La demande n’est pas encore assez prouvée.' };
  if (scores.capacite < 40) return { label: 'Stabiliser la capacité', reason: 'Stock, équipe ou équipements doivent suivre avant extension.' };
  if (score >= 80) return { label: 'À renforcer', reason: 'Rentabilité, demande et capacité sont favorables.' };
  if (score >= 65) return { label: 'À reprendre avec contrôle', reason: 'Potentiel réel, mais certains indicateurs restent à surveiller.' };
  if (score >= 50) return { label: 'À stabiliser ou tester', reason: 'Potentiel présent, mais pas encore assez solide.' };
  if (score >= 35) return { label: 'À réduire ou surveiller', reason: 'La marge ou la demande ne compense pas assez les risques.' };
  return { label: 'À reporter', reason: 'Les indicateurs ne justifient pas une relance maintenant.' };
}
function buildPerspective({ id, title, module, icon, revenue, expenses, margin, cycleDays, lossRate, salesCount, unsold, stockOk, criticalStock, tasksLate, dataPoints, expectedPoints, capacityBase, details = [], actions = [] }) {
  const scores = {
    rentabilite: marginScore(margin, revenue),
    cash: cashScore(revenue, expenses, Math.max(0, revenue - Math.max(0, revenue - expenses))),
    rotation: rotationScore(cycleDays, revenue, margin),
    risque: riskControlScore(lossRate, criticalStock),
    demande: demandScore(salesCount, revenue, unsold),
    capacite: capacityScore({ stockOk, criticalStock, tasksLate, base: capacityBase || 65 }),
    data: dataScore(dataPoints, expectedPoints),
  };
  const score = clamp(scores.rentabilite * 0.25 + scores.cash * 0.15 + scores.rotation * 0.15 + scores.risque * 0.15 + scores.demande * 0.15 + scores.capacite * 0.10 + scores.data * 0.05);
  return { id, title, module, icon, revenue, expenses, margin, cycleDays, lossRate, salesCount, unsold, scores, score, recommendation: recommendation(score, scores), details, actions, dataPoints };
}

function computeStrategic({ animaux = [], lots = [], productionLogs = [], sante = [], stocks = [], transactions = [], salesOrders = [], payments = [], alertes = [], taches = [], documents = [], whatsappLogs = [], businessEvents = [], cultures = [] }) {
  const animalRows = arr(animaux);
  const lotRows = arr(lots);
  const prodRows = arr(productionLogs);
  const healthRows = arr(sante);
  const stockRows = arr(stocks);
  const txRows = arr(transactions);
  const orderRows = arr(salesOrders);
  const paymentRows = arr(payments);
  const alertRows = arr(alertes);
  const taskRows = arr(taches);
  const docRows = arr(documents);
  const eventRows = arr(businessEvents);
  const revenueRows = txRows.filter(isRevenue);
  const expenseRows = txRows.filter(isExpense);
  const revenue = paymentRows.reduce((s, r) => s + amount(r), 0) + revenueRows.reduce((s, r) => s + amount(r), 0);
  const expenses = expenseRows.reduce((s, r) => s + amount(r), 0);
  const receivables = [...orderRows, ...paymentRows, ...txRows].filter(isUnpaid).reduce((s, r) => s + amount(r), 0);
  const criticalStocks = stockRows.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  const stockValue = stockRows.reduce((s, r) => s + stockQty(r) * stockUnitPrice(r), 0);
  const openCriticalAlerts = alertRows.filter((row) => ['urgence', 'critique'].includes(lower(row.severity || row.gravite)) && !isClosed(row));
  const lateTasks = taskRows.filter((row) => ['retard', 'en_retard', 'critique'].includes(statusOf(row)) || lower(row.priority || row.priorite) === 'critique');
  const sickAnimals = animalRows.filter((row) => lower(row.health_status).includes('malade'));
  const lateHealth = healthRows.filter((row) => ['retard', 'en_retard'].includes(statusOf(row)));
  const actionsAuto = alertRows.length + taskRows.length + docRows.length + arr(whatsappLogs).length + eventRows.length;
  const realCultures = arr(cultures).filter((row) => !['parcelle', 'campagne', 'performance'].includes(lower(row.record_type || row.type_fiche)));
  const tomateRows = realCultures.filter((row) => hasText(row, ['tomate', 'tomates']));
  const cultureScope = tomateRows.length ? tomateRows : realCultures;
  const cultureRevenue = cultureScope.reduce((s, r) => s + toNumber(r.revenu_reel || r.revenu_estime || r.ca_realise), 0) + orderRows.filter((r) => hasText(r, ['tomate', 'tomates', 'culture', 'recolte', 'récolte'])).reduce((s, r) => s + amount(r), 0);
  const cultureCost = cultureScope.reduce((s, r) => s + toNumber(r.cout_total || r.cout_semences) + toNumber(r.cout_engrais) + toNumber(r.cout_eau) + toNumber(r.cout_main_oeuvre) + toNumber(r.cout_traitement), 0);
  const cultureLoss = cultureScope.reduce((s, r) => s + toNumber(r.pertes), 0);
  const cultureQty = cultureScope.reduce((s, r) => s + toNumber(r.quantite_recoltee || r.quantite_prevue), 0);
  const cultureLossRate = cultureQty > 0 ? (cultureLoss / cultureQty) * 100 : 0;
  const cultureSales = orderRows.filter((r) => hasText(r, ['tomate', 'tomates', 'culture', 'recolte', 'récolte'])).length;
  const chairLots = lotRows.filter((row) => lower(row.type || row.category).includes('chair'));
  const chairRevenue = chairLots.reduce((s, r) => s + toNumber(r.revenu_reel || r.revenu_estime || r.prix_vente_reel || r.prix_vente_prevu) * Math.max(1, toNumber(r.vendus || r.effectif_vendable || 1)), 0) + orderRows.filter((r) => hasText(r, ['chair', 'poulet'])).reduce((s, r) => s + amount(r), 0);
  const chairCost = chairLots.reduce((s, r) => s + toNumber(r.cout_poussins) + toNumber(r.frais_sante) + toNumber(r.autres_frais) + toNumber(r.alimentation_cost || r.cout_aliment), 0);
  const chairInitial = chairLots.reduce((s, r) => s + toNumber(r.initial_count || r.current_count), 0);
  const chairLoss = chairLots.reduce((s, r) => s + toNumber(r.mortality || r.morts), 0);
  const chairLossRate = chairInitial > 0 ? (chairLoss / chairInitial) * 100 : 0;
  const layerLots = lotRows.filter((row) => lower(row.type || row.category).includes('pondeuse'));
  const eggs = prodRows.reduce((s, r) => s + eggCount(r), 0);
  const broken = prodRows.reduce((s, r) => s + brokenEggs(r), 0);
  const eggRevenue = orderRows.filter((r) => hasText(r, ['oeuf', 'œuf', 'plateau'])).reduce((s, r) => s + amount(r), 0) + txRows.filter((r) => hasText(r, ['oeuf', 'œuf', 'plateau']) && isRevenue(r)).reduce((s, r) => s + amount(r), 0);
  const eggCost = layerLots.reduce((s, r) => s + toNumber(r.frais_sante) + toNumber(r.autres_frais) + toNumber(r.alimentation_cost || r.cout_aliment), 0);
  const eggLossRate = eggs > 0 ? (broken / eggs) * 100 : 0;
  const animalRevenue = orderRows.filter((r) => hasText(r, ['animal', 'bovin', 'ovin', 'caprin'])).reduce((s, r) => s + amount(r), 0) + animalRows.reduce((s, r) => s + toNumber(r.prix_vente_reel || r.sale_price), 0);
  const animalCost = animalRows.reduce((s, r) => s + toNumber(r.frais_sante) + toNumber(r.autres_frais) + toNumber(r.cout_traitement), 0);
  const animalRiskRate = animalRows.length ? (sickAnimals.length / animalRows.length) * 100 : 0;
  const stockSalesRevenue = orderRows.filter((r) => hasText(r, ['stock', 'revente', 'produit'])).reduce((s, r) => s + amount(r), 0);
  const stockCost = stockRows.reduce((s, r) => s + stockQty(r) * stockUnitPrice(r), 0);
  const perspectives = [
    buildPerspective({ id: 'cultures', title: tomateRows.length ? 'Reprendre tomates ?' : 'Reprendre une campagne cultures ?', module: 'cultures', icon: Sprout, revenue: cultureRevenue, expenses: cultureCost, margin: cultureRevenue - cultureCost, cycleDays: 90, lossRate: cultureLossRate, salesCount: cultureSales, unsold: 0, stockOk: criticalStocks.length === 0, criticalStock: criticalStocks.filter((r) => ['semence', 'engrais', 'phyto', 'traitement'].some((t) => lower(r.categorie || r.produit).includes(t))).length, tasksLate: lateTasks.length, dataPoints: cultureScope.length + cultureSales + (cultureCost > 0 ? 1 : 0) + (cultureRevenue > 0 ? 1 : 0), expectedPoints: 6, details: [`Marge estimée : ${money(cultureRevenue - cultureCost)}`, `Pertes récolte : ${fmtNumber(cultureLoss)} unité(s)`, `Ventes liées : ${cultureSales}`], actions: [{ label: 'Voir cultures', module: 'cultures' }, { label: 'Voir stock intrants', module: 'stock' }, { label: 'Voir ventes', module: 'ventes' }] }),
    buildPerspective({ id: 'chair', title: 'Relancer poulets de chair ?', module: 'avicole', icon: Bird, revenue: chairRevenue, expenses: chairCost, margin: chairRevenue - chairCost, cycleDays: 45, lossRate: chairLossRate, salesCount: orderRows.filter((r) => hasText(r, ['chair', 'poulet'])).length, unsold: 0, stockOk: criticalStocks.length === 0, criticalStock: criticalStocks.filter((r) => ['aliment', 'poussin'].some((t) => lower(r.categorie || r.produit).includes(t))).length, tasksLate: lateTasks.length, dataPoints: chairLots.length + (chairCost > 0 ? 1 : 0) + (chairRevenue > 0 ? 1 : 0), expectedPoints: 5, details: [`Mortalité : ${fmtNumber(chairLoss)} sujet(s)`, `Marge estimée : ${money(chairRevenue - chairCost)}`, 'Cycle court : rotation rapide'], actions: [{ label: 'Voir lots', module: 'avicole' }, { label: 'Voir alimentation', module: 'stock' }, { label: 'Voir ventes', module: 'ventes' }] }),
    buildPerspective({ id: 'ponte', title: 'Augmenter les pondeuses ?', module: 'avicole', icon: Scale, revenue: eggRevenue, expenses: eggCost, margin: eggRevenue - eggCost, cycleDays: 30, lossRate: eggLossRate, salesCount: orderRows.filter((r) => hasText(r, ['oeuf', 'œuf', 'plateau'])).length, unsold: 0, stockOk: criticalStocks.length === 0, criticalStock: criticalStocks.filter((r) => lower(r.categorie || r.produit).includes('aliment')).length, tasksLate: lateTasks.length, dataPoints: layerLots.length + prodRows.length + (eggRevenue > 0 ? 1 : 0) + (eggCost > 0 ? 1 : 0), expectedPoints: 6, details: [`Œufs produits : ${fmtNumber(eggs)}`, `Casses : ${fmtNumber(broken)} (${eggLossRate.toFixed(1)}%)`, `Marge estimée : ${money(eggRevenue - eggCost)}`], actions: [{ label: 'Voir ponte', module: 'avicole' }, { label: 'Voir ventes œufs', module: 'ventes' }, { label: 'Voir aliment', module: 'stock' }] }),
    buildPerspective({ id: 'animaux', title: 'Renforcer bétail / animaux ?', module: 'animaux', icon: HeartPulse, revenue: animalRevenue, expenses: animalCost, margin: animalRevenue - animalCost, cycleDays: 180, lossRate: animalRiskRate, salesCount: orderRows.filter((r) => hasText(r, ['animal', 'bovin', 'ovin', 'caprin'])).length, unsold: 0, stockOk: true, criticalStock: criticalStocks.filter((r) => lower(r.categorie || r.produit).includes('aliment')).length, tasksLate: lateTasks.length, dataPoints: animalRows.length + (animalRevenue > 0 ? 1 : 0) + (animalCost > 0 ? 1 : 0) + healthRows.length, expectedPoints: 7, details: [`Animaux suivis : ${fmtNumber(animalRows.length)}`, `Santé à risque : ${fmtNumber(sickAnimals.length)}`, `Marge estimée : ${money(animalRevenue - animalCost)}`], actions: [{ label: 'Voir animaux', module: 'animaux' }, { label: 'Voir santé', module: 'sante' }, { label: 'Voir ventes', module: 'ventes' }] }),
    buildPerspective({ id: 'stock_revente', title: 'Tester revente / distribution ?', module: 'stock', icon: Truck, revenue: stockSalesRevenue, expenses: stockCost * 0.35, margin: stockSalesRevenue - (stockCost * 0.35), cycleDays: 20, lossRate: criticalStocks.length * 3, salesCount: orderRows.filter((r) => hasText(r, ['stock', 'revente', 'produit'])).length, unsold: 0, stockOk: criticalStocks.length === 0, criticalStock: criticalStocks.length, tasksLate: lateTasks.length, dataPoints: stockRows.length + (stockSalesRevenue > 0 ? 1 : 0) + stockRows.filter((r) => stockUnitPrice(r) > 0).length, expectedPoints: 8, details: [`Stock valorisé : ${money(stockValue)}`, `Produits critiques : ${fmtNumber(criticalStocks.length)}`, 'Rotation rapide si demande confirmée'], actions: [{ label: 'Voir stock', module: 'stock' }, { label: 'Voir fournisseurs', module: 'fournisseurs' }, { label: 'Voir ventes', module: 'ventes' }] }),
  ].filter((item) => item.dataPoints > 0 || item.revenue > 0 || item.expenses > 0);
  const globalData = dataScore(docRows.length + txRows.length + orderRows.length + stockRows.filter((r) => stockUnitPrice(r) > 0).length + prodRows.length, Math.max(10, stockRows.length + orderRows.length + prodRows.length + 5));
  const bankability = clamp(globalData * 0.35 + (docRows.length ? 20 : 0) + (stockValue > 0 ? 20 : 0) + (revenue > 0 ? 25 : 0));
  const reinvestment = clamp((revenue - expenses > 0 ? 45 : 20) + Math.min(35, Math.max(0, revenue - expenses) / 20000) - Math.min(25, receivables / 50000));
  const scalability = clamp((eventRows.length + taskRows.length + docRows.length > 0 ? 45 : 20) + Math.min(30, actionsAuto * 2) + Math.min(25, perspectives.filter((p) => p.score >= 65).length * 8));
  const verticalization = clamp((eggs > 0 ? 20 : 0) + (realCultures.length ? 20 : 0) + (docRows.length ? 15 : 0) + (revenue > 0 ? 25 : 0) + (stockValue > 0 ? 20 : 0));
  return { revenue, expenses, margin: revenue - expenses, receivables, stockValue, criticalStocks, openCriticalAlerts, lateTasks, sickAnimals, lateHealth, actionsAuto, perspectives, growth: { bankability, reinvestment, scalability, verticalization, globalData } };
}

function ScoreBar({ label, value }) {
  return <div><div className="flex justify-between text-xs text-[#8a7456] mb-1"><span>{label}</span><b>{value}/100</b></div><div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full bg-[#2f2415]" style={{ width: `${clamp(value)}%` }} /></div></div>;
}
function TabButton({ active, children, onClick }) { return <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-bold border ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>{children}</button>; }
function ActionButton({ label, module, onNavigate }) { return <button type="button" onClick={() => navigateTo(module, onNavigate)} className="rounded-lg border border-[#d6c3a0] px-3 py-1.5 text-xs font-bold text-[#2f2415] hover:border-[#b6975f]">{label} <ArrowRight size={12} className="inline" /></button>; }
function PerspectiveCard({ item, onNavigate }) {
  const Icon = item.icon;
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="w-11 h-11 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={19} /></div><div><h3 className="font-black text-[#2f2415]">{item.title}</h3><p className="text-sm text-[#8a7456]">{item.recommendation.label}</p></div></div><div className="text-right"><p className="text-xs text-[#8a7456]">Score</p><p className="text-3xl font-black text-[#2f2415]">{item.score}</p></div></div><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Pourquoi :</b> {item.recommendation.reason}</div><div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3"><span className="text-xs text-[#8a7456]">CA</span><b className="block text-[#2f2415]">{money(item.revenue)}</b></div><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3"><span className="text-xs text-[#8a7456]">Marge</span><b className="block text-[#2f2415]">{money(item.margin)}</b></div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2"><ScoreBar label="Rentabilité" value={item.scores.rentabilite} /><ScoreBar label="Cash" value={item.scores.cash} /><ScoreBar label="Rotation" value={item.scores.rotation} /><ScoreBar label="Risque maîtrisé" value={item.scores.risque} /><ScoreBar label="Demande" value={item.scores.demande} /><ScoreBar label="Capacité" value={item.scores.capacite} /><ScoreBar label="Fiabilité données" value={item.scores.data} /></div><div className="space-y-1">{item.details.map((detail) => <p key={detail} className="text-xs text-[#8a7456]">• {detail}</p>)}</div><div className="flex flex-wrap gap-2">{item.actions.map((action) => <ActionButton key={action.label} {...action} onNavigate={onNavigate} />)}</div></div>;
}
function DecisionCard({ title, value, detail, module, icon: Icon, tone, onNavigate }) { const toneClass = tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'; return <button type="button" onClick={() => navigateTo(module, onNavigate)} className={`rounded-2xl border p-4 text-left ${toneClass}`}><Icon size={18} /><p className="text-2xl font-black mt-2">{value}</p><p className="font-bold text-[#2f2415]">{title}</p><p className="text-xs mt-1">{detail}</p></button>; }
function GrowthCard({ title, score, detail, icon: Icon, actions = [], onNavigate }) { return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-3"><div className="flex justify-between gap-3"><div><Icon size={18} className="text-[#9a6b12]" /><h3 className="font-black text-[#2f2415] mt-2">{title}</h3></div><p className="text-3xl font-black text-[#2f2415]">{score}</p></div><ScoreBar label="Niveau" value={score} /><p className="text-sm text-[#7d6a4a]">{detail}</p><div className="flex flex-wrap gap-2">{actions.map((action) => <ActionButton key={action.label} {...action} onNavigate={onNavigate} />)}</div></div>; }

export default function ImpactBusinessStrategic(props) {
  const [tab, setTab] = useState('decisions');
  const impact = useMemo(() => computeStrategic(props), [props]);
  return <div className="space-y-6"><SectionHeader title="Impact & Valeur ERP" sub="Décider quoi traiter maintenant, quoi reprendre, quoi renforcer et quoi présenter aux financeurs." /><div className="flex flex-wrap gap-2"><TabButton active={tab === 'decisions'} onClick={() => setTab('decisions')}>Centre de décisions</TabButton><TabButton active={tab === 'perspectives'} onClick={() => setTab('perspectives')}>Perspectives & arbitrages</TabButton><TabButton active={tab === 'croissance'} onClick={() => setTab('croissance')}>Valeur & croissance</TabButton></div>{tab === 'decisions' ? <div className="space-y-5"><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><DecisionCard title="Stocks à sécuriser" value={fmtNumber(impact.criticalStocks.length)} detail="Risque de rupture ou blocage production" module="stock" icon={Package} tone={impact.criticalStocks.length ? 'danger' : 'good'} onNavigate={props.onNavigate} /><DecisionCard title="Créances à suivre" value={money(impact.receivables)} detail="Argent vendu mais pas encore encaissé" module="clients" icon={Users} tone={impact.receivables ? 'amber' : 'good'} onNavigate={props.onNavigate} /><DecisionCard title="Santé à surveiller" value={fmtNumber(impact.sickAnimals.length + impact.lateHealth.length)} detail="Animaux, lots ou soins à contrôler" module="sante" icon={HeartPulse} tone={impact.sickAnimals.length ? 'danger' : 'good'} onNavigate={props.onNavigate} /><DecisionCard title="Alertes critiques" value={fmtNumber(impact.openCriticalAlerts.length + impact.lateTasks.length)} detail="À traiter pour éviter pertes et retards" module="alertes" icon={AlertTriangle} tone={impact.openCriticalAlerts.length ? 'danger' : 'good'} onNavigate={props.onNavigate} /></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><KpiCard icon={DollarSign} label="Encaissements" value={money(impact.revenue)} /><KpiCard icon={TrendingUp} label="Marge suivie" value={money(impact.margin)} /><KpiCard icon={Package} label="Stock valorisé" value={money(impact.stockValue)} /><KpiCard icon={ClipboardCheck} label="Actions tracées" value={fmtNumber(impact.actionsAuto)} /></div></div> : null}{tab === 'perspectives' ? <div className="space-y-4"><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><h3 className="font-black text-[#2f2415]">Lecture des scores</h3><p className="text-sm text-[#7d6a4a] mt-1">Le score global combine rentabilité, cash, rotation, risque maîtrisé, demande, capacité et fiabilité des données. Les garde-fous évitent de recommander une extension quand le cash, la demande, le risque ou les données ne suivent pas.</p></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{impact.perspectives.map((item) => <PerspectiveCard key={item.id} item={item} onNavigate={props.onNavigate} />)}</div>{!impact.perspectives.length ? <div className="rounded-2xl border border-[#d6c3a0] bg-white p-8 text-center text-[#8a7456]">Pas encore assez de données d’activité pour proposer un arbitrage.</div> : null}</div> : null}{tab === 'croissance' ? <div className="space-y-4"><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><h3 className="font-black text-[#2f2415]">De ferme suivie à entreprise bancable</h3><p className="text-sm text-[#7d6a4a] mt-1">Ce bloc montre si Horizon Farm peut soutenir un dossier de financement, libérer du cash, gérer plus grand et monter vers transformation, vente directe ou marchés plus exigeants.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"><GrowthCard title="Bancabilité" score={impact.growth.bankability} detail="Stocks, ventes, documents et rentabilité rendent l’activité plus lisible pour une banque ou un partenaire." icon={Building2} actions={[{ label: 'Voir rapports', module: 'rapports' }, { label: 'Voir documents', module: 'documents' }]} onNavigate={props.onNavigate} /><GrowthCard title="Réinvestissement" score={impact.growth.reinvestment} detail="Mesure la capacité à financer la suite avec la marge et les encaissements suivis." icon={ShieldCheck} actions={[{ label: 'Voir finances', module: 'finances' }, { label: 'Voir ventes', module: 'ventes' }]} onNavigate={props.onNavigate} /><GrowthCard title="Scalabilité" score={impact.growth.scalability} detail="Montre si les processus, tâches, alertes et traces permettent d’agrandir sans perdre le contrôle." icon={Layers} actions={[{ label: 'Voir tâches', module: 'taches' }, { label: 'Voir alertes', module: 'alertes' }]} onNavigate={props.onNavigate} /><GrowthCard title="Montée en valeur" score={impact.growth.verticalization} detail="Prépare transformation, conditionnement, vente directe, export ou conformité avec preuves et traçabilité." icon={Factory} actions={[{ label: 'Voir traçabilité', module: 'tracabilite' }, { label: 'Voir stock', module: 'stock' }]} onNavigate={props.onNavigate} /></div><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><h3 className="font-black text-[#2f2415] mb-3">Boucle de croissance</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-4"><CheckCircle2 size={16} className="text-emerald-600" /><p className="font-bold text-[#2f2415] mt-2">Optimiser l’existant</p><p className="text-xs text-[#8a7456] mt-1">Stocks, coûts, pertes, relances et santé sont suivis pour protéger le cash.</p></div><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-4"><FileCheck2 size={16} className="text-[#9a6b12]" /><p className="font-bold text-[#2f2415] mt-2">Prouver la performance</p><p className="text-xs text-[#8a7456] mt-1">Rapports, documents, ventes et historique rendent le projet présentable.</p></div><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-4"><Target size={16} className="text-sky-600" /><p className="font-bold text-[#2f2415] mt-2">Grandir sans perdre le contrôle</p><p className="text-xs text-[#8a7456] mt-1">Les mêmes règles peuvent être répétées sur plus de lots, cultures, sites ou canaux de vente.</p></div></div></div></div> : null}</div>;
}
