import { AlertTriangle, Bird, HeartPulse, Package, Receipt, Scale, TrendingUp } from 'lucide-react';
import Btn from '../components/Btn';
import AvicoleV6 from './AvicoleV6.jsx';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { calculateLotMetrics, suggestLotPhase } from '../utils/businessCalculations';
import { filterLotsByActivity, isChairLot, isPondeuseLot } from '../utils/avicoleActivity';

const money = (value) => fmtCurrency(Number(value || 0));
const safeArray = (value) => (Array.isArray(value) ? value : []);
const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenCount = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);

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

const clampPrice = (value, min, max, fallback) => {
  const n = toNumber(value);
  const base = n > 0 ? n : fallback;
  return Math.min(max, Math.max(min, base));
};

const clampBroilerPrice = (value, fallback = BROILER_DEFAULT_PRICE) => clampPrice(value, BROILER_MIN_PRICE, BROILER_MAX_PRICE, fallback);
const clampLayerPrice = (value, fallback = LAYER_DEFAULT_PRICE) => clampPrice(value, LAYER_MIN_PRICE, LAYER_MAX_PRICE, fallback);

const currentCount = (lot = {}) => Math.max(
  0,
  toNumber(lot.initial_count ?? lot.current_count ?? lot.effectif_actuel ?? lot.effectif_vendable) -
  toNumber(lot.mortality) -
  toNumber(lot.vols) -
  toNumber(lot.vendus) -
  toNumber(lot.reformes) -
  toNumber(lot.sorties)
);

const getAgeDays = (lot = {}) => {
  if (!lot.date_debut) return null;
  const start = new Date(lot.date_debut).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / 86400000));
};

const getWeight30 = (lot = {}) => toNumber(lot.poids_moyen_30j ?? lot.weight_day30 ?? lot.poids_30j ?? lot.poids_j30);

const suggestedBroilerPriceByWeight = (weight, fallback) => {
  if (toNumber(fallback) > 0) return clampBroilerPrice(fallback);
  if (weight >= 2) return 4000;
  if (weight >= 1.7) return 3500;
  if (weight >= 1.5) return 3000;
  return 2500;
};

function ensureAvicoleFormFields() {
  const fields = MODULE_FORM_FIELDS.avicole || [];
  if (!fields.some((field) => field.key === 'poids_moyen_30j')) {
    const index = Math.max(0, fields.findIndex((field) => field.key === 'weight_avg'));
    fields.splice(index + 1, 0,
      { key: 'poids_moyen_30j', label: 'Poids moyen a 30 jours (kg)', type: 'number', showWhen: (form) => form.type === 'Chair' },
      { key: 'date_pesee_30j', label: 'Date pesee 30 jours', type: 'date', showWhen: (form) => form.type === 'Chair' },
      { key: 'prix_chair_retenu_view', label: 'Prix chair retenu', type: 'readonly', showWhen: (form) => form.type === 'Chair' }
    );
  }
}

function normalizeBaseLot(lot = {}) {
  if (isChairLot(lot)) {
    const weight = toNumber(lot.weight_avg || lot.poids_moyen);
    const expected = suggestedBroilerPriceByWeight(weight, lot.prix_vente_prevu ?? lot.sale_price ?? lot.prix_unitaire);
    const real = toNumber(lot.prix_vente_reel) > 0 ? clampBroilerPrice(lot.prix_vente_reel) : lot.prix_vente_reel;
    return {
      ...lot,
      prix_vente_prevu: expected,
      prix_vente_reel: real,
      sale_price: expected,
      prix_unitaire: expected,
      marge: '',
      marge_calculee_view: '',
      prix_chair_retenu_view: money(real || expected),
    };
  }

  if (isPondeuseLot(lot)) {
    const expected = clampLayerPrice(lot.prix_vente_prevu ?? lot.valeur_residuelle ?? lot.sale_price, LAYER_DEFAULT_PRICE);
    const real = toNumber(lot.prix_vente_reel) > 0 ? clampLayerPrice(lot.prix_vente_reel) : lot.prix_vente_reel;
    return { ...lot, prix_vente_prevu: expected, prix_vente_reel: real, sale_price: expected };
  }

  return lot;
}

function metricsForLot({ lot, alimentationLogs = [], productionLogs = [] }) {
  const normalized = normalizeBaseLot(lot);
  const metrics = calculateLotMetrics({ lot: normalized, feedingLogs: alimentationLogs, productionLogs });

  if (isChairLot(normalized)) {
    const count = metrics.currentCount || currentCount(normalized);
    const unitPrice = clampBroilerPrice(normalized.prix_vente_reel || normalized.prix_vente_prevu);
    const grossRevenue = unitPrice * count;
    const estimatedMargin = grossRevenue - toNumber(metrics.totalCosts);
    return { ...metrics, currentCount: count, broilerUnitPrice: unitPrice, grossRevenue, estimatedMargin, marginPerHead: count > 0 ? estimatedMargin / count : 0 };
  }

  if (isPondeuseLot(normalized)) {
    const count = metrics.currentCount || currentCount(normalized);
    const unitPrice = clampLayerPrice(normalized.prix_vente_reel || normalized.prix_vente_prevu, LAYER_DEFAULT_PRICE);
    const grossRevenue = unitPrice * count;
    const estimatedMargin = grossRevenue - toNumber(metrics.totalCosts);
    return { ...metrics, currentCount: count, layerUnitPrice: unitPrice, grossRevenue, estimatedMargin, marginPerHead: count > 0 ? estimatedMargin / count : 0 };
  }

  return metrics;
}

function commercialDecision(lot = {}, metrics = {}) {
  const ageDays = getAgeDays(lot);
  const ageOk = ageDays !== null;
  const marginOk = toNumber(metrics.estimatedMargin) >= 0;

  if (isChairLot(lot)) {
    const weight = toNumber(lot.weight_avg || lot.poids_moyen);
    const weight30 = getWeight30(lot);
    const ageReady = ageOk && ageDays >= BROILER_READY_DAYS;
    const ageMax = ageOk && ageDays >= BROILER_MAX_DAYS;
    const weightReady = weight >= BROILER_READY_WEIGHT;
    const ready = marginOk && ((ageReady && weightReady) || ageMax);
    const missing = [];
    if (!ageOk) missing.push('date debut');
    else if (!ageReady) missing.push(`${BROILER_READY_DAYS} jours minimum`);
    if (!weightReady && !ageMax) missing.push(`${BROILER_READY_WEIGHT} kg minimum`);
    if (!marginOk) missing.push('marge positive');
    const score = ready ? 100 : Math.round(([ageReady, weightReady, marginOk].filter(Boolean).length / 3) * 100);
    const reason = ready
      ? (ageMax ? `Age maximum atteint (${ageDays} jours)` : `Age ${ageDays} jours et poids ${weight.toFixed(2)} kg`)
      : `Attendre: ${missing.join(', ')}`;
    return {
      ready,
      score,
      status: ready ? 'recommande_pret' : 'non_pret',
      reason,
      ageDays,
      weight,
      weight30,
      unitPrice: metrics.broilerUnitPrice || clampBroilerPrice(lot.prix_vente_prevu),
      label: ready ? 'Pret a la vente' : 'Pas pret',
      detail: weight > 0 ? `Poids moyen ${weight.toFixed(2)} kg${weight30 > 0 ? ` · J30 ${weight30.toFixed(2)} kg` : ''}` : 'Poids moyen a renseigner',
    };
  }

  if (isPondeuseLot(lot)) {
    const phase = suggestLotPhase(lot, metrics);
    const text = `${lot.phase || ''} ${lot.status || ''} ${phase.label || ''}`.toLowerCase();
    const oldEnough = ageOk && ageDays >= LAYER_REFORM_DAYS;
    const inActiveLaying = text.includes('en_ponte') || text.includes('en ponte') || text.includes('entree_ponte') || text.includes('entree en ponte');
    const finishing = text.includes('fin') || text.includes('reform') || text.includes('a_reformer') || text.includes('baisse_ponte') || text.includes('baisse ponte');
    const ready = oldEnough && !inActiveLaying && (finishing || !text.includes('croissance')) && marginOk;
    const missing = [];
    if (!ageOk) missing.push('date debut');
    else if (!oldEnough) missing.push('18 mois minimum');
    if (inActiveLaying) missing.push('encore en ponte');
    if (!marginOk) missing.push('marge positive');
    return {
      ready,
      score: ready ? 100 : Math.round(([oldEnough, !inActiveLaying, marginOk].filter(Boolean).length / 3) * 100),
      status: ready ? 'recommande_pret' : 'non_pret',
      reason: ready ? `Fin de cycle / reforme possible (${Math.floor((ageDays || 0) / 30)} mois)` : `Attendre: ${missing.join(', ')}`,
      ageDays,
      phase: phase.label,
      unitPrice: metrics.layerUnitPrice || clampLayerPrice(lot.prix_vente_prevu),
      label: ready ? 'Pret reforme' : 'Pas pret',
      detail: `Phase ${phase.label}`,
    };
  }

  return { ready: false, score: 0, status: 'non_pret', reason: 'Type non reconnu', label: 'Pas pret', detail: 'Phase a renseigner' };
}

function normalizeRows(rows = [], alimentationLogs = [], productionLogs = []) {
  return safeArray(rows).map((source) => {
    const lot = normalizeBaseLot(source);
    const metrics = metricsForLot({ lot, alimentationLogs, productionLogs });
    const decision = commercialDecision(lot, metrics);

    const cleanStatus = isChairLot(lot)
      ? (decision.ready ? 'pret_a_la_vente' : (lot.status === 'pret_a_la_vente' ? 'finition' : lot.status || 'en_croissance'))
      : isPondeuseLot(lot)
        ? (decision.ready ? 'pret_a_vendre_reforme' : (['pret_a_vendre_reforme', 'pret_a_la_vente'].includes(lot.status) ? 'en_ponte' : lot.status || 'en_ponte'))
        : lot.status;

    return {
      ...lot,
      status: cleanStatus,
      pret_vente_recommande: decision.ready,
      pret_vente_confirme: decision.ready ? lot.pret_vente_confirme : false,
      sale_readiness_score: String(decision.score),
      sale_readiness_status: decision.status,
      raison_pret_vente: decision.reason,
      phase_suggeree_view: decision.detail,
      marge_calculee_view: money(metrics.estimatedMargin),
    };
  });
}

function getPhaseLabel(lot = {}, metrics = {}) {
  return commercialDecision(lot, metrics).detail;
}

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const navButtons = Array.from(document.querySelectorAll('nav button'));
  const target = navButtons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()));
  target?.click();
}

function getDailyProductionIssues({ productionLogs = [], lots = [] }) {
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));
  const grouped = new Map();

  safeArray(productionLogs).forEach((log) => {
    const key = `${log.date || 'Sans date'}::${log.lot_id || ''}`;
    const item = grouped.get(key) || { date: log.date || 'Sans date', lot_id: log.lot_id, raw: 0, broken: 0 };
    item.raw += eggCount(log);
    item.broken += brokenCount(log);
    grouped.set(key, item);
  });

  return Array.from(grouped.values())
    .map((item) => {
      const lot = lotById.get(item.lot_id) || {};
      const capacity = currentCount(lot);
      const excess = Math.max(0, item.raw - capacity);
      const brokenRate = item.raw > 0 ? (item.broken / item.raw) * 100 : 0;
      return { ...item, lot, capacity, excess, brokenRate };
    })
    .filter((item) => item.excess > 0 || item.brokenRate > 5)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 4);
}

function QuickLink({ icon: Icon, title, desc, onClick }) {
  return (
    <button type="button" onClick={onClick} className="bg-white border border-[#d6c3a0] rounded-2xl p-4 text-left hover:border-[#b6975f] hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div>
        <div><p className="font-black text-[#2f2415]">{title}</p><p className="text-xs text-[#8a7456] mt-1">{desc}</p></div>
      </div>
    </button>
  );
}

function SaleReadyPanel({ rows = [], alimentationLogs = [], productionLogs = [], onCreateOpportunity }) {
  const readyLots = rows
    .map((lot) => {
      const metrics = metricsForLot({ lot, alimentationLogs, productionLogs });
      const decision = commercialDecision(lot, metrics);
      return { lot, metrics, decision, ready: decision.ready };
    })
    .filter((item) => item.ready)
    .slice(0, 4);

  if (!readyLots.length) return null;

  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div><p className="text-xs uppercase tracking-wide text-[#8a7456]">Pret a la vente</p><h3 className="text-lg font-black text-[#2f2415]">Lots a transformer en opportunites</h3></div>
        <Btn icon={Receipt} variant="outline" small onClick={() => openModule('Ventes')}>Voir ventes</Btn>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {readyLots.map(({ lot, metrics, decision }) => (
          <div key={lot.id} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-[#2f2415]">{lot.name || lot.id}</p>
                <p className="text-xs text-[#8a7456] mt-1">{isChairLot(lot) ? 'Chair' : 'Pondeuse'} · {decision.detail}</p>
              </div>
              <span className="text-xs font-semibold rounded-full px-2 py-1 bg-emerald-100 text-emerald-700">Pret</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div><p className="text-[#8a7456]">Effectif</p><p className="font-bold text-[#2f2415]">{fmtNumber(metrics.currentCount || currentCount(lot))}</p></div>
              <div><p className="text-[#8a7456]">Score</p><p className="font-bold text-[#2f2415]">{decision.score || 0}%</p></div>
              <div><p className="text-[#8a7456]">Marge/tete</p><p className="font-bold text-[#2f2415]">{money(metrics.marginPerHead)}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Btn icon={TrendingUp} small onClick={() => onCreateOpportunity?.({
                opportunity_type: isChairLot(lot) ? 'lot_chair' : 'pondeuse_reforme',
                source_type: 'lot_avicole',
                source_id: lot.id,
                title: `${lot.name || lot.id} - pret a la vente`,
                description: decision.reason,
                quantity: metrics.currentCount || currentCount(lot),
                unit: 'tete',
                unit_price: decision.unitPrice,
                estimated_value: metrics.grossRevenue,
                estimated_margin: metrics.estimatedMargin,
                score: decision.score,
                status: 'a_traiter',
              })}>Creer opportunite</Btn>
              <Btn icon={Receipt} variant="outline" small onClick={() => openModule('Ventes')}>Ouvrir ventes</Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContextualLinks({ rows = [], productionLogs = [], alimentationLogs = [] }) {
  const chair = filterLotsByActivity(rows, 'Chair');
  const issues = getDailyProductionIssues({ productionLogs, lots: rows });
  const readyChair = chair.filter((lot) => commercialDecision(lot, metricsForLot({ lot, alimentationLogs, productionLogs })).ready).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <QuickLink icon={Receipt} title="Ventes" desc={`${readyChair} lot(s) chair pret(s) ou a verifier`} onClick={() => openModule('Ventes')} />
        <QuickLink icon={Package} title="Stock alimentation" desc="Controler aliment avant baisse ponte/croissance" onClick={() => openModule('Stock')} />
        <QuickLink icon={HeartPulse} title="Sante" desc="Soins, vaccins et mortalite avicole" onClick={() => openModule('Sante')} />
        <QuickLink icon={Scale} title="Finances" desc="Marge, couts et rentabilite avicole" onClick={() => openModule('Finances')} />
      </div>

      {issues.length ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <p className="text-red-600 font-semibold flex items-center gap-2"><AlertTriangle size={16} />Infos a traiter</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
            {issues.map((issue) => (
              <button key={`${issue.date}-${issue.lot_id}`} type="button" onClick={() => openModule('Avicole')} className="bg-white border border-red-200 rounded-xl px-3 py-2 text-left text-sm text-[#7d6a4a] hover:border-red-400">
                <span className="font-semibold text-[#2f2415]">{issue.lot?.name || issue.lot_id}</span> — {issue.excess > 0 ? `${fmtNumber(issue.excess)} oeufs a verifier` : `casse ${issue.brokenRate.toFixed(1)}%`} le {issue.date}.
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Growth30Panel({ rows = [] }) {
  const chairRows = filterLotsByActivity(rows, 'Chair');
  if (!chairRows.length) return null;
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Bird size={18} /></div>
        <div>
          <p className="font-black text-[#2f2415]">Suivi croissance J30</p>
          <p className="text-xs text-[#8a7456]">Renseigne le poids moyen a 30 jours dans la fiche du lot pour declencher la bonne decision commerciale.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {chairRows.slice(0, 6).map((lot) => {
          const age = getAgeDays(lot);
          const weight = toNumber(lot.weight_avg || lot.poids_moyen);
          const weight30 = getWeight30(lot);
          const missing = age !== null && age >= 30 && weight30 <= 0;
          return (
            <div key={lot.id} className={`border rounded-xl p-3 ${missing ? 'border-amber-300 bg-amber-50/60' : 'border-[#d6c3a0] bg-[#fffdf8]'}`}>
              <p className="font-semibold text-[#2f2415]">{lot.name || lot.id}</p>
              <p className="text-xs text-[#8a7456] mt-1">Age: {age ?? '-'} j · Poids actuel: {weight ? `${weight.toFixed(2)} kg` : '-'}</p>
              <p className="text-xs text-[#8a7456]">J30: {weight30 ? `${weight30.toFixed(2)} kg` : 'a renseigner'}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AvicoleV7(props) {
  ensureAvicoleFormFields();
  const rows = normalizeRows(props.rows || [], props.alimentationLogs || [], props.productionLogs || []);
  const normalizedProps = { ...props, rows };

  return (
    <div className="space-y-6">
      <ContextualLinks rows={rows} productionLogs={props.productionLogs} alimentationLogs={props.alimentationLogs} />
      <SaleReadyPanel rows={rows} alimentationLogs={props.alimentationLogs} productionLogs={props.productionLogs} onCreateOpportunity={props.onCreateOpportunity} />
      <Growth30Panel rows={rows} />
      <AvicoleV6 {...normalizedProps} />
    </div>
  );
}
