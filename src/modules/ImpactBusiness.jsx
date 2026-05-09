import { AlertTriangle, BrainCircuit, Clock, FileCheck2, HeartPulse, Link as LinkIcon, Receipt, ShieldCheck, Target, TrendingUp } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const safeArray = (value) => Array.isArray(value) ? value : [];
const money = (value) => fmtCurrency(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.value ?? row.valeur ?? 0);

const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenEggs = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const animalWeight = (animal = {}) => toNumber(animal.weight ?? animal.poids ?? animal.current_weight ?? animal.poids_actuel);
const animalTarget = (animal = {}) => toNumber(animal.target_weight ?? animal.poids_objectif ?? animal.objectif_poids);
const animalSellPrice = (animal = {}) => toNumber(animal.prix_vente_prevu ?? animal.prix_vente_estime ?? animal.sale_price ?? animal.prix_vente_reel);
const lotDead = (lot = {}) => toNumber(lot.mortality ?? lot.morts ?? lot.dead_count ?? lot.pertes);
const lotSick = (lot = {}) => toNumber(lot.malades ?? lot.sick_count ?? lot.malade_count);
const lotCount = (lot = {}) => Math.max(0, toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.effectif_vendable ?? lot.initial_count) - lotDead(lot) - toNumber(lot.vendus) - toNumber(lot.reformes));
const lotPrice = (lot = {}) => toNumber(lot.prix_vente_prevu ?? lot.sale_price ?? lot.prix_unitaire ?? lot.prix_vente_reel);

function getDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isLateHealth(row = {}) {
  const status = String(row.statut || row.status || '').toLowerCase();
  if (['retard', 'en_retard', 'overdue'].includes(status)) return true;
  const due = getDate(row.prevue || row.date_prevue);
  return due && !row.effectuee && due < new Date();
}

function isDoneHealth(row = {}) {
  const status = String(row.statut || row.status || '').toLowerCase();
  return ['fait', 'termine', 'réalisé', 'realise'].includes(status) || Boolean(row.effectuee);
}

function isStockCritical(item = {}) {
  return toNumber(item.quantite ?? item.quantity) <= toNumber(item.seuil ?? item.threshold);
}

function isHealthStock(item = {}) {
  const text = `${item.nom || ''} ${item.name || ''} ${item.categorie || ''} ${item.category || ''}`.toLowerCase();
  return ['vaccin', 'medicament', 'médicament', 'sante', 'santé', 'veto', 'vétérinaire'].some((key) => text.includes(key));
}

function estimateErpImpact({ animaux = [], lots = [], productionLogs = [], sante = [], stocks = [], transactions = [], salesOrders = [], payments = [] }) {
  const animalRows = safeArray(animaux);
  const lotRows = safeArray(lots);
  const prodRows = safeArray(productionLogs);
  const healthRows = safeArray(sante);
  const stockRows = safeArray(stocks);
  const txRows = safeArray(transactions);
  const orderRows = safeArray(salesOrders);
  const paymentRows = safeArray(payments);

  const readyAnimals = animalRows.filter((animal) => animalTarget(animal) > 0 && animalWeight(animal) >= animalTarget(animal));
  const readyAnimalValue = readyAnimals.reduce((sum, animal) => sum + (animalSellPrice(animal) || 0), 0);

  const readyLots = lotRows.filter((lot) => ['pret_a_la_vente', 'pret_a_vendre_reforme'].includes(String(lot.status || lot.statut || '').toLowerCase()) || lot.pret_vente_recommande);
  const readyLotValue = readyLots.reduce((sum, lot) => sum + lotCount(lot) * lotPrice(lot), 0);

  const lateVaccines = healthRows.filter(isLateHealth);
  const doneHealth = healthRows.filter(isDoneHealth);
  const healthCosts = healthRows.reduce((sum, row) => sum + amount(row), 0);
  const sickAnimals = animalRows.filter((animal) => String(animal.health_status || '').toLowerCase().includes('malade'));
  const sickLots = lotRows.filter((lot) => lotSick(lot) > 0 || ['malade', 'critique', 'sous_traitement'].some((key) => String(lot.health_status || '').toLowerCase().includes(key)));

  const criticalStocks = stockRows.filter(isStockCritical);
  const criticalHealthStocks = criticalStocks.filter(isHealthStock);
  const stockValueTracked = stockRows.reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);

  const totalEggs = prodRows.reduce((sum, log) => sum + eggCount(log), 0);
  const totalBroken = prodRows.reduce((sum, log) => sum + brokenEggs(log), 0);
  const eggAnomalies = prodRows.filter((log) => toNumber(log.oeufs_a_verifier) > 0 || eggCount(log) > 0 && eggCount(log) < brokenEggs(log));
  const eggLossValue = totalBroken * 100;
  const eggAnomalyValue = eggAnomalies.reduce((sum, log) => sum + toNumber(log.oeufs_a_verifier) * 100, 0);

  const unpaid = [...orderRows, ...paymentRows, ...txRows].filter((row) => ['impaye', 'partiel', 'en_retard'].includes(String(row.statut || row.status || '').toLowerCase()));
  const cashAtRisk = unpaid.reduce((sum, row) => sum + amount(row), 0);
  const revenueTracked = Math.max(
    orderRows.reduce((sum, row) => sum + amount(row), 0),
    paymentRows.reduce((sum, row) => sum + amount(row), 0),
    txRows.filter((row) => ['entree', 'revenu', 'vente', 'recette'].includes(String(row.type || row.categorie || '').toLowerCase())).reduce((sum, row) => sum + amount(row), 0)
  );

  const healthAvoidedLoss = doneHealth.length * 15000;
  const lateRiskValue = lateVaccines.length * 25000;
  const stockoutRiskValue = criticalStocks.length * 20000;
  const salesAccelerationValue = Math.max(readyAnimalValue + readyLotValue, 0) * 0.05;
  const dataCorrectionValue = eggAnomalyValue + eggLossValue;
  const cashSecuredValue = cashAtRisk * 0.03;
  const estimatedValueCreated = healthAvoidedLoss + stockoutRiskValue + salesAccelerationValue + dataCorrectionValue + cashSecuredValue;
  const valueAtRisk = lateRiskValue + cashAtRisk + stockoutRiskValue + eggLossValue;

  const recordsManaged = animalRows.length + lotRows.length + prodRows.length + healthRows.length + stockRows.length + txRows.length + orderRows.length + paymentRows.length;
  const decisionsDetected = readyAnimals.length + readyLots.length + lateVaccines.length + criticalStocks.length + eggAnomalies.length + sickAnimals.length + sickLots.length + unpaid.length;
  const hoursSaved = Math.round((recordsManaged * 3 + decisionsDetected * 12) / 60);
  const traceabilityScore = recordsManaged > 0 ? Math.min(100, ((healthRows.length + prodRows.length + stockRows.length + txRows.length + orderRows.length) / recordsManaged) * 100) : 0;

  const impactItems = [
    { title: 'Ventes détectées', value: money(salesAccelerationValue), metric: `${readyAnimals.length + readyLots.length} opportunité(s)`, target: 'ventes', priority: readyAnimals.length + readyLots.length > 0 ? 'good' : 'neutral' },
    { title: 'Santé maîtrisée', value: money(healthAvoidedLoss), metric: `${doneHealth.length} intervention(s) faite(s)`, target: 'sante', priority: doneHealth.length ? 'good' : 'neutral' },
    { title: 'Santé à suivre', value: money(lateRiskValue), metric: `${lateVaccines.length} retard(s)`, target: 'sante', priority: lateVaccines.length ? 'danger' : 'good' },
    { title: 'Stocks critiques', value: money(stockoutRiskValue), metric: `${criticalStocks.length} produit(s)`, target: 'stock', priority: criticalStocks.length ? 'danger' : 'good' },
    { title: 'Production à vérifier', value: money(dataCorrectionValue), metric: `${eggAnomalies.length} anomalie(s)`, target: 'avicole', priority: eggAnomalies.length || totalBroken ? 'danger' : 'good' },
    { title: 'Cash à suivre', value: money(cashAtRisk), metric: `${unpaid.length} paiement(s)`, target: 'ventes', priority: unpaid.length ? 'danger' : 'good' },
  ];

  const proofItems = [
    { label: 'Données suivies', value: fmtNumber(recordsManaged) },
    { label: 'Décisions détectées', value: fmtNumber(decisionsDetected) },
    { label: 'Temps gagné', value: `${fmtNumber(hoursSaved)} h` },
    { label: 'Traçabilité', value: pct(traceabilityScore) },
  ];

  return { estimatedValueCreated, valueAtRisk, healthAvoidedLoss, stockoutRiskValue, salesAccelerationValue, dataCorrectionValue, cashAtRisk, revenueTracked, stockValueTracked, healthCosts, totalEggs, totalBroken, criticalHealthStocks, impactItems, proofItems, recordsManaged, decisionsDetected, hoursSaved, traceabilityScore };
}

function ImpactValueCard({ title, value, detail, icon: Icon, tone = 'neutral' }) {
  const tones = { good: 'border-emerald-200 bg-emerald-50/70 text-emerald-700', danger: 'border-red-200 bg-red-50/70 text-red-700', neutral: 'border-[#d6c3a0] bg-white text-[#8a7456]', amber: 'border-amber-200 bg-amber-50/70 text-amber-700' };
  return <div className={`border rounded-2xl p-5 ${tones[tone] || tones.neutral}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide font-semibold">{title}</p><p className="text-3xl font-black text-[#2f2415] mt-2">{value}</p></div><div className="w-11 h-11 rounded-xl bg-white/70 flex items-center justify-center"><Icon size={20} /></div></div><p className="text-sm text-[#7d6a4a] mt-3">{detail}</p></div>;
}

function ImpactLine({ item, onNavigate }) {
  const border = item.priority === 'danger' ? 'border-red-200 bg-red-50/60' : item.priority === 'good' ? 'border-emerald-200 bg-emerald-50/60' : 'border-[#d6c3a0] bg-[#fffdf8]';
  return <button type="button" onClick={() => onNavigate?.(item.target)} className={`text-left rounded-2xl border p-4 hover:border-[#b6975f] transition-all ${border}`}><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{item.title}</p><p className="text-xs text-[#8a7456] mt-1">{item.metric}</p></div><p className="text-xl font-black text-[#2f2415] whitespace-nowrap">{item.value}</p></div></button>;
}

function ProofCard({ label, value }) {
  return <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p></div>;
}

export default function ImpactBusiness({ animaux = [], lots = [], productionLogs = [], sante = [], stocks = [], transactions = [], salesOrders = [], payments = [], onNavigate }) {
  const impact = estimateErpImpact({ animaux, lots, productionLogs, sante, stocks, transactions, salesOrders, payments });
  const roiBase = impact.healthCosts > 0 ? impact.healthCosts : 1;
  const operationalRoi = impact.healthCosts > 0 ? (impact.estimatedValueCreated / roiBase) * 100 : null;

  return (
    <div className="space-y-6">
      <SectionHeader title="Impact Business" sub="Valeur, risques, décisions et traçabilité" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ImpactValueCard icon={TrendingUp} tone="good" title="Valeur créée" value={money(impact.estimatedValueCreated)} detail="Gains estimés grâce aux ventes détectées, soins réalisés, ruptures anticipées et cash suivi." />
        <ImpactValueCard icon={AlertTriangle} tone="danger" title="Valeur à risque" value={money(impact.valueAtRisk)} detail="Montants encore exposés : retards, ruptures, impayés et anomalies de production." />
        <ImpactValueCard icon={Clock} tone="amber" title="Temps gagné" value={`${fmtNumber(impact.hoursSaved)} h`} detail="Gain estimé grâce aux données centralisées et aux actions automatiques." />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Target} label="Décisions" value={fmtNumber(impact.decisionsDetected)} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={FileCheck2} label="Données" value={fmtNumber(impact.recordsManaged)} color="bg-sky-500/20 text-sky-500" />
        <KpiCard icon={ShieldCheck} label="Traçabilité" value={pct(impact.traceabilityScore)} color="bg-emerald-500/20 text-emerald-500" />
        <KpiCard icon={Receipt} label="Cash" value={money(impact.cashAtRisk)} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={BrainCircuit} label="ROI" value={operationalRoi === null ? 'À suivre' : pct(operationalRoi)} color="bg-purple-500/20 text-purple-500" />
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><BrainCircuit size={18} /></div><div><h3 className="font-black text-[#2f2415]">Axes de pilotage</h3><p className="text-sm text-[#8a7456] mt-1">Clique sur une carte pour ouvrir le module concerné.</p></div></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{impact.impactItems.map((item) => <ImpactLine key={item.title} item={item} onNavigate={onNavigate} />)}</div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#e8f7ef] text-emerald-600 flex items-center justify-center"><LinkIcon size={18} /></div><div><h3 className="font-black text-[#2f2415]">Indicateurs de pilotage</h3><p className="text-sm text-[#8a7456] mt-1">Synthèse des données actuellement suivies dans l’ERP.</p></div></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{impact.proofItems.map((item) => <ProofCard key={item.label} {...item} />)}</div>
      </div>
    </div>
  );
}
