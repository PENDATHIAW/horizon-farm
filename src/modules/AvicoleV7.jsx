import { Activity, AlertTriangle, Bird, CalendarDays, Download, Edit, Eye, HeartPulse, MessageCircle, Package, Plus, Receipt, RefreshCw, Scale, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import AvicoleActivityTabs from '../components/AvicoleActivityTabs';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import { DEFAULT_PHONE } from '../utils/location';
import { calculateLotMetrics, enrichProductionEggLogs, suggestLotPhase } from '../utils/businessCalculations';
import { filterLotsByActivity, isChairLot, isPondeuseLot } from '../utils/avicoleActivity';

const BROILER_MIN_PRICE = 2500;
const BROILER_MAX_PRICE = 4000;
const BROILER_DEFAULT_PRICE = 3000;
const LAYER_MIN_PRICE = 1500;
const LAYER_MAX_PRICE = 2000;
const LAYER_DEFAULT_PRICE = 1800;
const BROILER_READY_DAYS = 30;
const BROILER_MAX_DAYS = 45;
const BROILER_READY_WEIGHT = 1.5;
const LAYER_REFORM_DAYS = 18 * 30;

const safeArray = (value) => (Array.isArray(value) ? value : []);
const todayIso = () => new Date().toISOString().slice(0, 10);
const money = (value) => fmtCurrency(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenCount = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const sellableEggs = (log = {}) => Math.max(0, eggCount(log) - brokenCount(log));
const trayCount = (log = {}) => toNumber(log.plateaux) || Math.floor(sellableEggs(log) / 30);

const clampPrice = (value, min, max, fallback) => {
  const n = toNumber(value);
  const base = n > 0 ? n : fallback;
  return Math.min(max, Math.max(min, base));
};
const clampBroilerPrice = (value, fallback = BROILER_DEFAULT_PRICE) => clampPrice(value, BROILER_MIN_PRICE, BROILER_MAX_PRICE, fallback);
const clampLayerPrice = (value, fallback = LAYER_DEFAULT_PRICE) => clampPrice(value, LAYER_MIN_PRICE, LAYER_MAX_PRICE, fallback);

const formatDate = (date) => {
  if (!date) return 'Non renseignee';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return parsed.toLocaleDateString('fr-FR');
};

const formatAge = (days) => {
  if (days === null || days === undefined || Number.isNaN(Number(days))) return 'Age inconnu';
  const value = Number(days);
  if (value >= 60) return `${value} j (${Math.floor(value / 30)} mois)`;
  return `${value} j`;
};

const getAgeDays = (lot = {}) => {
  if (!lot.date_debut) return null;
  const start = new Date(lot.date_debut).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / 86400000));
};

const currentCount = (lot = {}) => Math.max(
  0,
  toNumber(lot.initial_count ?? lot.current_count ?? lot.effectif_actuel ?? lot.effectif_vendable) -
  toNumber(lot.mortality) -
  toNumber(lot.vols) -
  toNumber(lot.vendus) -
  toNumber(lot.reformes) -
  toNumber(lot.sorties)
);

const getInitialCount = (lot = {}) => Math.max(toNumber(lot.initial_count), toNumber(lot.current_count), toNumber(lot.effectif_actuel), currentCount(lot));
const getSurvivalRate = (lot = {}) => {
  const initial = getInitialCount(lot);
  return initial > 0 ? (currentCount(lot) / initial) * 100 : 0;
};

const getWeight = (lot = {}) => toNumber(lot.weight_avg || lot.poids_moyen || lot.poids_actuel);
const getWeight30 = (lot = {}) => toNumber(lot.poids_moyen_30j ?? lot.weight_day30 ?? lot.poids_30j ?? lot.poids_j30);

const suggestedBroilerPriceByWeight = (weight, fallback) => {
  if (toNumber(fallback) > 0) return clampBroilerPrice(fallback);
  if (weight >= 2) return 4000;
  if (weight >= 1.7) return 3500;
  if (weight >= 1.5) return 3000;
  return 2500;
};

const sumCosts = (lot = {}, baseMetrics = {}) => {
  const count = currentCount(lot) || getInitialCount(lot);
  const purchaseUnit = toNumber(lot.prix_achat || lot.cout_achat || lot.purchase_price || lot.cost_per_head);
  const purchaseTotal = toNumber(lot.prix_achat_total || lot.cout_achat_total || lot.purchase_cost || lot.investissement_initial) || (purchaseUnit * count);
  const health = toNumber(lot.frais_sante || lot.health_costs || lot.vet_costs || lot.cout_sante);
  const other = toNumber(lot.autres_frais || lot.other_costs || lot.cout_autres);
  const feeding = toNumber(baseMetrics.feedingCost);
  return { purchaseTotal, feeding, health, other, totalCosts: purchaseTotal + feeding + health + other };
};

function ensureAvicoleFormFields() {
  const fields = MODULE_FORM_FIELDS.avicole || [];
  const dateField = fields.find((field) => field.key === 'date_debut');
  if (dateField) dateField.label = 'Date entree poulailler';

  if (!fields.some((field) => field.key === 'age_poulailler_view')) {
    const dateIndex = Math.max(0, fields.findIndex((field) => field.key === 'date_debut'));
    fields.splice(dateIndex + 1, 0, { key: 'age_poulailler_view', label: 'Age dans le poulailler', type: 'readonly' });
  }

  if (!fields.some((field) => field.key === 'poids_moyen_30j')) {
    const weightIndex = Math.max(0, fields.findIndex((field) => field.key === 'weight_avg'));
    fields.splice(weightIndex + 1, 0,
      { key: 'poids_moyen_30j', label: 'Poids moyen a 30 jours (kg)', type: 'number', showWhen: (form) => form.type === 'Chair' },
      { key: 'date_pesee_30j', label: 'Date pesee 30 jours', type: 'date', showWhen: (form) => form.type === 'Chair' },
      { key: 'prix_chair_retenu_view', label: 'Prix chair retenu', type: 'readonly', showWhen: (form) => form.type === 'Chair' }
    );
  }
}

function getUnitPrice(lot = {}) {
  if (isChairLot(lot)) return suggestedBroilerPriceByWeight(getWeight(lot), lot.prix_vente_reel || lot.prix_vente_prevu || lot.sale_price || lot.prix_unitaire);
  if (isPondeuseLot(lot)) return clampLayerPrice(lot.prix_vente_reel || lot.prix_vente_prevu || lot.sale_price || lot.valeur_residuelle);
  return toNumber(lot.prix_vente_reel || lot.prix_vente_prevu || lot.sale_price || lot.prix_unitaire);
}

function businessMetrics(lot = {}, alimentationLogs = [], productionLogs = []) {
  const base = calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs });
  const count = currentCount(lot) || toNumber(base.currentCount);
  const unitPrice = getUnitPrice(lot);
  const costs = sumCosts(lot, base);
  const grossRevenue = count * unitPrice;
  const estimatedMargin = grossRevenue - costs.totalCosts;
  return {
    ...base,
    currentCount: count,
    unitPrice,
    purchaseTotal: costs.purchaseTotal,
    feedingCost: costs.feeding,
    healthCost: costs.health,
    otherCost: costs.other,
    totalCosts: costs.totalCosts,
    costPerHead: count > 0 ? costs.totalCosts / count : 0,
    grossRevenue,
    estimatedMargin,
    marginPerHead: count > 0 ? estimatedMargin / count : 0,
    survivalRate: getSurvivalRate(lot),
  };
}

function saleDecision(lot = {}, metrics = {}) {
  const ageDays = getAgeDays(lot);
  const ageOk = ageDays !== null;
  const marginOk = toNumber(metrics.estimatedMargin) >= 0;

  if (isChairLot(lot)) {
    const weight = getWeight(lot);
    const weight30 = getWeight30(lot);
    const ageReady = ageOk && ageDays >= BROILER_READY_DAYS;
    const ageMax = ageOk && ageDays >= BROILER_MAX_DAYS;
    const weightReady = weight >= BROILER_READY_WEIGHT;
    const ready = marginOk && ((ageReady && weightReady) || ageMax);
    const missing = [];
    if (!ageOk) missing.push('date entree poulailler');
    else if (!ageReady) missing.push(`${BROILER_READY_DAYS} jours minimum`);
    if (!weightReady && !ageMax) missing.push(`${BROILER_READY_WEIGHT} kg minimum`);
    if (!marginOk) missing.push('marge positive');
    const reason = ready
      ? (ageMax ? `Age maximum atteint (${formatAge(ageDays)})` : `Age ${formatAge(ageDays)} et poids ${weight.toFixed(2)} kg`)
      : `Attendre: ${missing.join(', ')}`;
    return {
      ready,
      label: ready ? 'Pret a la vente' : 'Pas pret',
      score: ready ? 100 : Math.round(([ageReady, weightReady, marginOk].filter(Boolean).length / 3) * 100),
      reason,
      ageDays,
      detail: weight > 0 ? `Poids moyen ${weight.toFixed(2)} kg${weight30 > 0 ? ` · J30 ${weight30.toFixed(2)} kg` : ''}` : 'Poids moyen a renseigner',
    };
  }

  if (isPondeuseLot(lot)) {
    const phase = suggestLotPhase(lot, metrics);
    const phaseText = `${lot.phase || ''} ${lot.status || ''} ${phase.label || ''}`.toLowerCase();
    const oldEnough = ageOk && ageDays >= LAYER_REFORM_DAYS;
    const stillLaying = phaseText.includes('en_ponte') || phaseText.includes('en ponte') || phaseText.includes('entree_ponte') || phaseText.includes('entree en ponte');
    const finishing = phaseText.includes('fin') || phaseText.includes('reform') || phaseText.includes('baisse_ponte') || phaseText.includes('baisse ponte');
    const ready = oldEnough && !stillLaying && (finishing || !phaseText.includes('croissance')) && marginOk;
    const missing = [];
    if (!ageOk) missing.push('date entree poulailler');
    else if (!oldEnough) missing.push('18 mois minimum');
    if (stillLaying) missing.push('encore en ponte');
    if (!marginOk) missing.push('marge positive');
    return {
      ready,
      label: ready ? 'Pret reforme' : 'Pas pret',
      score: ready ? 100 : Math.round(([oldEnough, !stillLaying, marginOk].filter(Boolean).length / 3) * 100),
      reason: ready ? `Fin de cycle / reforme possible (${formatAge(ageDays)})` : `Attendre: ${missing.join(', ')}`,
      ageDays,
      detail: `Phase ${phase.label || lot.phase || lot.status || 'a renseigner'}`,
    };
  }

  return { ready: false, label: 'Pas pret', score: 0, reason: 'Type non reconnu', ageDays, detail: 'Phase a renseigner' };
}

function normalizeLot(lot = {}, alimentationLogs = [], productionLogs = []) {
  const metrics = businessMetrics(lot, alimentationLogs, productionLogs);
  const decision = saleDecision(lot, metrics);
  const ageDays = getAgeDays(lot);
  const status = decision.ready ? (isChairLot(lot) ? 'pret_a_la_vente' : 'pret_a_vendre_reforme') : (isChairLot(lot) ? (lot.status === 'pret_a_la_vente' ? 'finition' : lot.status || 'en_croissance') : (['pret_a_la_vente', 'pret_a_vendre_reforme'].includes(lot.status) ? 'en_ponte' : lot.status || 'en_ponte'));
  return {
    ...lot,
    status,
    prix_vente_prevu: metrics.unitPrice,
    sale_price: metrics.unitPrice,
    prix_unitaire: metrics.unitPrice,
    current_count: metrics.currentCount,
    date_entree_poulailler_view: formatDate(lot.date_debut),
    age_poulailler_jours: ageDays,
    age_poulailler_view: formatAge(ageDays),
    phase_suggeree_view: decision.detail,
    prix_chair_retenu_view: isChairLot(lot) ? money(metrics.unitPrice) : '',
    pret_vente_recommande: decision.ready,
    sale_readiness_score: String(decision.score),
    sale_readiness_status: decision.ready ? 'pret' : 'non_pret',
    raison_pret_vente: decision.reason,
    marge_calculee_view: money(metrics.estimatedMargin),
  };
}

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const navButtons = Array.from(document.querySelectorAll('nav button'));
  navButtons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}

function groupDailyProduction(logs = [], lots = []) {
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));
  const grouped = new Map();

  logs.forEach((log) => {
    const key = `${log.date || 'Sans date'}::${log.lot_id || ''}`;
    const item = grouped.get(key) || { id: key, date: log.date || 'Sans date', lot_id: log.lot_id, lot_name: log.lot_name, logIds: [], raw: 0, broken: 0, sellable: 0, trays: 0 };
    item.logIds.push(log.id);
    item.raw += eggCount(log);
    item.broken += brokenCount(log);
    item.sellable += sellableEggs(log);
    item.trays += trayCount(log);
    grouped.set(key, item);
  });

  return Array.from(grouped.values()).map((row) => {
    const lot = lotById.get(row.lot_id) || {};
    const capacity = currentCount(lot);
    const valid = Math.min(row.raw, capacity);
    const excess = Math.max(0, row.raw - capacity);
    const rate = capacity > 0 ? Math.min(100, (valid / capacity) * 100) : 0;
    const brokenRate = row.raw > 0 ? (row.broken / row.raw) * 100 : 0;
    return { ...row, lot, capacity, valid, excess, rate, brokenRate };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.lot_id).localeCompare(String(b.lot_id)));
}

function sumDailyRows(rows = []) {
  const total = rows.reduce((acc, row) => {
    acc.raw += row.raw; acc.valid += row.valid; acc.excess += row.excess; acc.broken += row.broken; acc.sellable += row.sellable; acc.trays += row.trays; acc.capacity += row.capacity;
    return acc;
  }, { raw: 0, valid: 0, excess: 0, broken: 0, sellable: 0, trays: 0, capacity: 0 });
  total.rate = total.capacity > 0 ? Math.min(100, (total.valid / total.capacity) * 100) : 0;
  total.brokenRate = total.raw > 0 ? (total.broken / total.raw) * 100 : 0;
  return total;
}

function Metric({ label, value, sub }) {
  return <div className="bg-[#fffdf8] rounded-xl p-3 border border-[#d6c3a0]"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-bold text-[#2f2415]">{value}</p>{sub ? <p className="text-[11px] text-[#8a7456] mt-1">{sub}</p> : null}</div>;
}

function QuickLinks({ readyChair }) {
  const links = [
    { icon: Receipt, title: 'Ventes', desc: `${readyChair} lot(s) chair pret(s)`, key: 'Ventes' },
    { icon: Package, title: 'Stock alimentation', desc: 'Controler aliment disponible', key: 'Stock' },
    { icon: HeartPulse, title: 'Sante', desc: 'Vaccins, soins et mortalite', key: 'Sante' },
    { icon: Scale, title: 'Finances', desc: 'Couts, marge et rentabilite', key: 'Finances' },
  ];
  return <div className="grid grid-cols-1 md:grid-cols-4 gap-3">{links.map(({ icon: Icon, title, desc, key }) => <button key={title} type="button" onClick={() => openModule(key)} className="bg-white border border-[#d6c3a0] rounded-2xl p-4 text-left hover:border-[#b6975f] transition-all"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div><div><p className="font-black text-[#2f2415]">{title}</p><p className="text-xs text-[#8a7456] mt-1">{desc}</p></div></div></button>)}</div>;
}

function LotCard({ lot, metrics, decision, onDetails, onEdit, onWhatsapp, onOpportunity, onDelete }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs text-[#8a7456]">{lot.type}</p><h3 className="text-lg font-black text-[#2f2415]">{lot.name || lot.id}</h3><p className="text-xs text-[#8a7456]">{lot.id}</p></div>
        <Badge status={lot.status || 'actif'} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Metric label="Entree" value={formatDate(lot.date_debut)} sub={formatAge(getAgeDays(lot))} />
        <Metric label="Effectif" value={fmtNumber(metrics.currentCount)} sub={`Survie ${pct(metrics.survivalRate)}`} />
        <Metric label={isChairLot(lot) ? 'Poids moyen' : 'Phase'} value={isChairLot(lot) ? `${getWeight(lot).toFixed(2)} kg` : decision.detail.replace('Phase ', '')} />
        <Metric label="Prix indicatif" value={money(metrics.unitPrice)} sub={isChairLot(lot) ? '2 500 - 4 000 F' : '1 500 - 2 000 F'} />
        <Metric label="Cout/tete" value={money(metrics.costPerHead)} />
        <Metric label="Marge/tete" value={money(metrics.marginPerHead)} />
      </div>
      <div className={`border rounded-xl p-3 ${decision.ready ? 'bg-emerald-50 border-emerald-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
        <p className="text-xs text-[#8a7456]">Decision commerciale</p>
        <p className="text-sm font-semibold text-[#2f2415]">{decision.label}</p>
        <p className="text-xs text-[#8a7456] mt-1">{decision.reason}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        <ActionIconButton icon={Eye} title="Voir fiche" color="sky" onClick={onDetails} />
        <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={onEdit} />
        <ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={onWhatsapp} />
        <ActionIconButton icon={TrendingUp} title="Creer opportunite" color="emerald" onClick={onOpportunity} />
        <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={onDelete} />
      </div>
    </div>
  );
}

function SaleReadyPanel({ rows, metricsFor, decisionFor, onCreateOpportunity }) {
  const ready = rows.map((lot) => ({ lot, metrics: metricsFor(lot), decision: decisionFor(lot) })).filter((item) => item.decision.ready).slice(0, 4);
  if (!ready.length) return null;
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><p className="text-xs uppercase tracking-wide text-[#8a7456]">Pret a la vente</p><h3 className="text-lg font-black text-[#2f2415]">Lots a transformer en opportunites</h3></div><Btn icon={Receipt} variant="outline" small onClick={() => openModule('Ventes')}>Voir ventes</Btn></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{ready.map(({ lot, metrics, decision }) => <div key={lot.id} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{lot.name || lot.id}</p><p className="text-xs text-[#8a7456] mt-1">{isChairLot(lot) ? 'Chair' : 'Pondeuse'} · {decision.detail}</p><p className="text-xs text-[#8a7456] mt-1">Entree: {formatDate(lot.date_debut)} · {formatAge(decision.ageDays)}</p></div><span className="text-xs font-semibold rounded-full px-2 py-1 bg-emerald-100 text-emerald-700">Pret</span></div><div className="grid grid-cols-4 gap-2 mt-3 text-xs"><div><p className="text-[#8a7456]">Effectif</p><p className="font-bold text-[#2f2415]">{fmtNumber(metrics.currentCount)}</p></div><div><p className="text-[#8a7456]">Prix</p><p className="font-bold text-[#2f2415]">{money(metrics.unitPrice)}</p></div><div><p className="text-[#8a7456]">Score</p><p className="font-bold text-[#2f2415]">{decision.score}%</p></div><div><p className="text-[#8a7456]">Marge/tete</p><p className="font-bold text-[#2f2415]">{money(metrics.marginPerHead)}</p></div></div><div className="mt-3"><Btn icon={TrendingUp} small onClick={() => onCreateOpportunity?.(buildOpportunity(lot, metrics, decision))}>Creer opportunite</Btn></div></div>)}</div></div>;
}

function Growth30Panel({ rows }) {
  const chairRows = filterLotsByActivity(rows, 'Chair');
  if (!chairRows.length) return null;
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><CalendarDays size={18} /></div><div><p className="font-black text-[#2f2415]">Suivi croissance J30</p><p className="text-xs text-[#8a7456]">La decision de vente utilise la date entree poulailler, l age et le poids moyen.</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{chairRows.slice(0, 6).map((lot) => { const age = getAgeDays(lot); const w = getWeight(lot); const w30 = getWeight30(lot); const missing = age !== null && age >= 30 && w30 <= 0; return <div key={lot.id} className={`border rounded-xl p-3 ${missing ? 'border-amber-300 bg-amber-50/60' : 'border-[#d6c3a0] bg-[#fffdf8]'}`}><p className="font-semibold text-[#2f2415]">{lot.name || lot.id}</p><p className="text-xs text-[#8a7456] mt-1">Entree: {formatDate(lot.date_debut)} · Age: {formatAge(age)}</p><p className="text-xs text-[#8a7456]">Poids actuel: {w ? `${w.toFixed(2)} kg` : '-'} · J30: {w30 ? `${w30.toFixed(2)} kg` : 'a renseigner'}</p></div>; })}</div></div>;
}

function ProductionPanel({ rows, summary, onAdd, onDetails, onEdit, onDelete }) {
  const cards = [['Jour courant', fmtNumber(summary.latest.valid), summary.referenceDate], ['Taux jour', pct(summary.latest.rate), ''], ['Moyenne 7j', pct(summary.last7.rate), `${summary.uniqueDates.length} jour(s)`], ['Total oeufs', fmtNumber(summary.total.raw), 'Depuis le debut'], ['Vendables', fmtNumber(summary.total.sellable), 'Cumul'], ['A verifier', fmtNumber(summary.total.excess), '']];
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><p className="font-semibold text-[#2f2415]">Journal production oeufs</p><p className="text-xs text-[#8a7456]">Calcul journalier par lot.</p></div><Btn icon={Plus} small onClick={onAdd}>Ajouter releve</Btn></div><div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">{cards.map(([label, value, sub]) => <Metric key={label} label={label} value={value} sub={sub} />)}</div><div className="overflow-x-auto border border-[#d6c3a0] rounded-xl"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] border-b border-[#d6c3a0]">{['Date', 'Lot', 'Effectif', 'Oeufs saisis', 'Valides', 'A verifier', 'Casses', 'Vendables', 'Taux', 'Actions'].map((head) => <th key={head} className="text-left text-xs font-semibold text-[#8a7456] uppercase tracking-wide px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={`border-b border-[#d6c3a0]/60 hover:bg-[#fffdf8] ${row.excess > 0 ? 'bg-red-50/60' : ''}`}><td className="px-3 py-3 text-[#2f2415]">{row.date}</td><td className="px-3 py-3 text-[#2f2415] font-semibold">{row.lot?.name || row.lot_name || row.lot_id}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.capacity)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.raw)}</td><td className="px-3 py-3 text-emerald-600 font-semibold">{fmtNumber(row.valid)}</td><td className="px-3 py-3 text-red-600 font-semibold">{fmtNumber(row.excess)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.broken)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.sellable)}</td><td className="px-3 py-3 text-[#2f2415]">{pct(row.rate)}</td><td className="px-3 py-3"><div className="flex gap-1"><ActionIconButton icon={Eye} title="Details" color="sky" onClick={() => onDetails(row)} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => onEdit(row)} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => onDelete(row)} /></div></td></tr>)}{!rows.length ? <tr><td colSpan={10} className="px-3 py-8 text-center text-[#8a7456]">Aucun releve production oeufs.</td></tr> : null}</tbody></table></div></div>;
}

function buildOpportunity(lot, metrics, decision) {
  return { id: makeId('OPP'), opportunity_type: isChairLot(lot) ? 'lot_chair' : 'pondeuse_reforme', source_type: 'lot_avicole', source_id: lot.id, title: `${lot.name || lot.id} - ${decision.label}`, description: `${decision.reason}. Entree: ${formatDate(lot.date_debut)}.`, quantity: metrics.currentCount, unit: 'tete', unit_price: metrics.unitPrice, estimated_value: metrics.grossRevenue, estimated_margin: metrics.estimatedMargin, score: decision.score, status: 'a_traiter' };
}

export default function AvicoleV7({ rows = [], alimentationLogs = [], productionLogs = [], loading = false, onCreate, onUpdate, onDelete, onRefresh, onCreateProduction, onUpdateProduction, onDeleteProduction, onRefreshProduction, onCreateOpportunity }) {
  ensureAvicoleFormFields();
  const [activityType, setActivityType] = useState('Pondeuse');
  const [selected, setSelected] = useState(null);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [modal, setModal] = useState(null);
  const [productionModal, setProductionModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const allRows = useMemo(() => safeArray(rows).map((lot) => normalizeLot(lot, alimentationLogs, productionLogs)), [rows, alimentationLogs, productionLogs]);
  const pondeuseRows = useMemo(() => filterLotsByActivity(allRows, 'Pondeuse'), [allRows]);
  const chairRows = useMemo(() => filterLotsByActivity(allRows, 'Chair'), [allRows]);
  const activityRows = useMemo(() => filterLotsByActivity(allRows, activityType), [allRows, activityType]);
  const metricsFor = (lot) => businessMetrics(lot, alimentationLogs, productionLogs);
  const decisionFor = (lot) => saleDecision(lot, metricsFor(lot));

  const enrichedLogs = useMemo(() => enrichProductionEggLogs({ logs: safeArray(productionLogs), lots: allRows }), [productionLogs, allRows]);
  const productionRows = useMemo(() => groupDailyProduction(enrichedLogs.filter((log) => new Set(pondeuseRows.map((lot) => lot.id)).has(log.lot_id)), pondeuseRows), [enrichedLogs, pondeuseRows]);
  const productionSummary = useMemo(() => { const referenceDate = productionRows[0]?.date || todayIso(); const latestRows = productionRows.filter((row) => row.date === referenceDate); const dates = [...new Set(productionRows.map((row) => row.date))].slice(0, 7); const last7Rows = productionRows.filter((row) => dates.includes(row.date)); return { referenceDate, uniqueDates: dates, latest: sumDailyRows(latestRows), last7: sumDailyRows(last7Rows), total: sumDailyRows(productionRows) }; }, [productionRows]);

  const summary = useMemo(() => {
    const rowsToUse = activityRows;
    const metricsList = rowsToUse.map(metricsFor);
    const totalTetes = metricsList.reduce((sum, item) => sum + item.currentCount, 0);
    const ca = metricsList.reduce((sum, item) => sum + item.grossRevenue, 0);
    const costs = metricsList.reduce((sum, item) => sum + item.totalCosts, 0);
    const margin = metricsList.reduce((sum, item) => sum + item.estimatedMargin, 0);
    const ready = rowsToUse.filter((lot) => decisionFor(lot).ready).length;
    const avgWeight = rowsToUse.length ? rowsToUse.reduce((sum, lot) => sum + getWeight(lot), 0) / rowsToUse.length : 0;
    const mortality = rowsToUse.reduce((sum, lot) => sum + toNumber(lot.mortality), 0);
    const mortalityRate = totalTetes + mortality > 0 ? (mortality / (totalTetes + mortality)) * 100 : 0;
    return { totalTetes, ca, costs, margin, ready, avgWeight, mortality, mortalityRate };
  }, [activityRows, alimentationLogs, productionLogs]);

  const defaultLot = useMemo(() => ({ id: generateSequentialId('avicole', allRows, { type: activityType }), type: activityType, name: `Lot ${activityType}`, date_debut: todayIso(), initial_count: 0, current_count: 0, mortality: 0, vendus: 0, weight_avg: activityType === 'Chair' ? 1.5 : 0, prix_vente_prevu: activityType === 'Chair' ? BROILER_DEFAULT_PRICE : LAYER_DEFAULT_PRICE }), [activityType, allRows]);
  const defaultProductionLotId = pondeuseRows[0]?.id || '';

  const deriveLotValues = (form = {}) => {
    const temp = normalizeLot({ ...form, current_count: currentCount(form) || form.current_count }, alimentationLogs, productionLogs);
    const metrics = metricsFor(temp);
    const decision = saleDecision(temp, metrics);
    return { ...temp, age_poulailler_view: formatAge(getAgeDays(temp)), prix_chair_retenu_view: isChairLot(temp) ? money(metrics.unitPrice) : '', phase_suggeree_view: decision.detail, marge_calculee_view: money(metrics.estimatedMargin), raison_pret_vente: decision.reason };
  };

  const prepareLotPayload = (payload = {}) => {
    if (!payload.date_debut) throw new Error('Date entree poulailler obligatoire.');
    const normalized = deriveLotValues(payload);
    return { ...normalized, current_count: currentCount(normalized), effectif_vendable: currentCount(normalized) };
  };

  const deriveProductionValues = (form = {}) => {
    const lot = allRows.find((item) => item.id === form.lot_id) || {};
    const capacity = currentCount(lot);
    const produced = eggCount(form);
    const broken = brokenCount(form);
    const valid = Math.min(produced, capacity);
    return { ...form, oeufs_vendables_view: fmtNumber(Math.max(0, produced - broken)), plateaux_view: fmtNumber(Math.floor(Math.max(0, produced - broken) / 30)), taux_ponte_view: capacity > 0 ? pct((valid / capacity) * 100) : '0.0%', oeufs_a_verifier_view: fmtNumber(Math.max(0, produced - capacity)) };
  };

  const prepareProductionPayload = (payload = {}) => {
    const lot = allRows.find((item) => item.id === payload.lot_id) || {};
    const capacity = currentCount(lot);
    const produced = eggCount(payload);
    const broken = brokenCount(payload);
    if (broken > produced) throw new Error('Les oeufs casses ne peuvent pas depasser les oeufs produits.');
    const valid = Math.min(produced, capacity);
    return { ...payload, taux_ponte: capacity > 0 ? (valid / capacity) * 100 : 0, oeufs_a_verifier: Math.max(0, produced - capacity) };
  };

  const run = async (action, success, close) => { try { setSaving(true); await action(); toast.success(success); if (close) close(); } catch (error) { toast.error(error.message || 'Action impossible'); } finally { setSaving(false); } };
  const refreshEverything = () => run(async () => { await Promise.allSettled([onRefresh?.(), onRefreshProduction?.()]); }, 'Donnees avicoles actualisees');
  const exportRows = () => { const exported = activityRows.map((lot) => { const metrics = metricsFor(lot); const decision = decisionFor(lot); return { ...lot, effectif: metrics.currentCount, prix_indicatif: metrics.unitPrice, ca_potentiel: metrics.grossRevenue, couts_saisis: metrics.totalCosts, marge_estimee: metrics.estimatedMargin, decision: decision.label, raison: decision.reason }; }); exportToCsv({ rows: exported, fileName: `avicole-${activityType}.csv` }); exportToExcel({ rows: exported, fileName: `avicole-${activityType}.xlsx`, sheetName: activityType }); exportToPdf({ rows: exported, title: `Avicole ${activityType}`, fileName: `avicole-${activityType}.pdf` }); };

  const createOpportunity = (lot) => run(async () => onCreateOpportunity?.(buildOpportunity(lot, metricsFor(lot), decisionFor(lot))), 'Opportunite creee');
  const openWhatsApp = (lot) => { const metrics = metricsFor(lot); const decision = decisionFor(lot); window.open(toWhatsappLink(DEFAULT_PHONE, `Lot ${lot.name || lot.id}: ${decision.label}. ${decision.reason}. Prix indicatif ${money(metrics.unitPrice)}, marge estimee ${money(metrics.estimatedMargin)}.`), '_blank', 'noopener,noreferrer'); };

  return <div className="space-y-6">
    <SectionHeader title="Gestion Avicole" sub="Pondeuses et poulets de chair: pilotage separe par activite" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={refreshEverything}>Refresh</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter {activityType}</Btn>{activityType === 'Pondeuse' ? <Btn icon={Plus} variant="outline" small onClick={() => setProductionModal('create')}>Production oeufs</Btn> : null}<Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau lot {activityType}</Btn></>} />
    <QuickLinks readyChair={chairRows.filter((lot) => decisionFor(lot).ready).length} />
    <AvicoleActivityTabs activeType={activityType} onChange={setActivityType} pondeusesCount={pondeuseRows.length} chairCount={chairRows.length} />

    {activityType === 'Pondeuse' ? <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><KpiCard icon={Bird} label="Pondeuses" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" /><KpiCard icon={Activity} label="Oeufs valides jour" value={fmtNumber(productionSummary.latest.valid)} sub={productionSummary.referenceDate} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={TrendingUp} label="Taux ponte jour" value={pct(productionSummary.latest.rate)} color="bg-sky-500/20 text-sky-400" /><KpiCard icon={Activity} label="Moyenne 7 jours" value={pct(productionSummary.last7.rate)} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={AlertTriangle} label="A verifier" value={fmtNumber(productionSummary.total.excess)} color="bg-red-500/20 text-red-400" /></div> : <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><KpiCard icon={Bird} label="Chair actifs" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" /><KpiCard icon={TrendingUp} label="CA potentiel" value={money(summary.ca)} color="bg-sky-500/20 text-sky-400" /><KpiCard icon={Scale} label="Couts saisis" value={money(summary.costs)} color="bg-amber-500/20 text-amber-400" /><KpiCard icon={Activity} label="Marge estimee" value={money(summary.margin)} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={Bird} label="Prets vente" value={fmtNumber(summary.ready)} color="bg-emerald-500/20 text-emerald-400" /></div>}

    <SaleReadyPanel rows={activityRows} metricsFor={metricsFor} decisionFor={decisionFor} onCreateOpportunity={onCreateOpportunity} />
    <Growth30Panel rows={allRows} />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {activityRows.map((lot) => <LotCard key={lot.id} lot={lot} metrics={metricsFor(lot)} decision={decisionFor(lot)} onDetails={() => { setSelected(lot); setModal('details'); }} onEdit={() => { setSelected(lot); setModal('edit'); }} onWhatsapp={() => openWhatsApp(lot)} onOpportunity={() => createOpportunity(lot)} onDelete={() => { setSelected(lot); setModal('delete'); }} />)}
      {!activityRows.length ? <div className="lg:col-span-3 bg-white border border-dashed border-[#d6c3a0] rounded-2xl p-6 text-center text-[#8a7456]">{loading ? 'Chargement...' : `Aucun lot ${activityType}`}</div> : null}
    </div>

    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Calculs automatiques {activityType}</p><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{activityRows.map((lot) => { const metrics = metricsFor(lot); const decision = decisionFor(lot); return <div key={lot.id} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="text-xs text-[#8a7456]">{lot.name || lot.id}</p><p className="text-sm font-bold text-[#2f2415]">{decision.label}</p><p className="text-xs text-[#7d6a4a]">Prix {money(metrics.unitPrice)} · CA {money(metrics.grossRevenue)}</p><p className="text-xs text-[#7d6a4a]">Couts {money(metrics.totalCosts)} · Marge {money(metrics.estimatedMargin)}</p></div>; })}</div></div>

    {activityType === 'Pondeuse' ? <ProductionPanel rows={productionRows} summary={productionSummary} onAdd={() => setProductionModal('create')} onDetails={(row) => { setSelectedProduction(enrichedLogs.find((log) => row.logIds.includes(log.id)) || row); setProductionModal('details'); }} onEdit={(row) => { setSelectedProduction(enrichedLogs.find((log) => row.logIds.includes(log.id)) || row); setProductionModal('edit'); }} onDelete={(row) => { setSelectedProduction(enrichedLogs.find((log) => row.logIds.includes(log.id)) || row); setProductionModal('delete'); }} /> : <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Decision vente - lots de chair</p><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{chairRows.map((lot) => { const metrics = metricsFor(lot); const decision = decisionFor(lot); return <div key={lot.id} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="font-semibold text-[#2f2415]">{lot.name || lot.id}</p><p className="text-xs text-[#8a7456]">{decision.reason}</p><p className="text-xs text-[#8a7456]">Entree: {formatDate(lot.date_debut)} · {formatAge(getAgeDays(lot))}</p><p className="text-xs text-[#8a7456]">Poids: {getWeight(lot).toFixed(2)} kg · Prix: {money(metrics.unitPrice)}</p></div>; })}</div></div>}

    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...metricsFor(selected), decision_commerciale: decisionFor(selected).label, raison_decision: decisionFor(selected).reason, date_entree_poulailler: formatDate(selected.date_debut), age_poulailler: formatAge(getAgeDays(selected)), prix_indicatif: money(metricsFor(selected).unitPrice), marge_estimee: money(metricsFor(selected).estimatedMargin) } : selected} title="Details du lot" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => run(() => onCreate?.(prepareLotPayload(payload)), 'Lot ajoute', () => setModal(null))} fields={MODULE_FORM_FIELDS.avicole} initialValues={deriveLotValues(defaultLot)} autoId={(values) => generateSequentialId('avicole', allRows, values)} deriveValues={deriveLotValues} loading={saving} title={`Ajouter un lot ${activityType}`} submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && run(() => onUpdate?.(selected.id, prepareLotPayload(payload)), 'Lot modifie', () => setModal(null))} fields={MODULE_FORM_FIELDS.avicole} initialValues={selected ? deriveLotValues(selected) : {}} deriveValues={deriveLotValues} loading={saving} title="Modifier lot" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && run(() => onDelete?.(selected.id), 'Lot supprime', () => setModal(null))} itemLabel={selected ? `${selected.name || selected.id}` : ''} loading={saving} />

    <DetailsModal open={productionModal === 'details'} onClose={() => setProductionModal(null)} data={selectedProduction || {}} title="Details production oeufs" />
    <CreateModal open={productionModal === 'create'} onClose={() => setProductionModal(null)} onSubmit={(payload) => run(() => onCreateProduction?.(prepareProductionPayload(payload)), 'Releve ajoute', () => setProductionModal(null))} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={deriveProductionValues({ id: generateSequentialId('production_oeufs_logs', productionLogs), lot_id: defaultProductionLotId, date: todayIso(), oeufs_produits: 0, oeufs_casses: 0, notes: '' })} deriveValues={deriveProductionValues} loading={saving} title="Ajouter releve production oeufs" submitLabel="Ajouter" />
    <EditModal open={productionModal === 'edit'} onClose={() => setProductionModal(null)} onSubmit={(payload) => selectedProduction && run(() => onUpdateProduction?.(selectedProduction.id, prepareProductionPayload(payload)), 'Releve modifie', () => setProductionModal(null))} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={selectedProduction ? deriveProductionValues(selectedProduction) : {}} deriveValues={deriveProductionValues} loading={saving} title="Modifier production oeufs" submitLabel="Enregistrer" />
    <DeleteModal open={productionModal === 'delete'} onClose={() => setProductionModal(null)} onConfirm={() => selectedProduction && run(() => onDeleteProduction?.(selectedProduction.id), 'Releve supprime', () => setProductionModal(null))} itemLabel={selectedProduction ? `${selectedProduction.date} - ${selectedProduction.lot_name || selectedProduction.lot_id}` : ''} loading={saving} />
  </div>;
}
