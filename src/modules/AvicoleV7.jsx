import { AlertTriangle, Bird, HeartPulse, Package, Receipt, Scale, TrendingUp } from 'lucide-react';
import Btn from '../components/Btn';
import AvicoleV6 from './AvicoleV6.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { calculateLotMetrics, calculateLotSaleReadiness, suggestLotPhase } from '../utils/businessCalculations';
import { filterLotsByActivity, isChairLot, isPondeuseLot } from '../utils/avicoleActivity';

const money = (value) => fmtCurrency(Number(value || 0));
const safeArray = (value) => (Array.isArray(value) ? value : []);
const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenCount = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const BROILER_MIN_PRICE = 2500;
const BROILER_MAX_PRICE = 4000;
const BROILER_DEFAULT_PRICE = 3000;

const clampBroilerPrice = (value, fallback = BROILER_DEFAULT_PRICE) => {
  const n = toNumber(value);
  const base = n > 0 ? n : fallback;
  return Math.min(BROILER_MAX_PRICE, Math.max(BROILER_MIN_PRICE, base));
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

function normalizeBroilerLot(lot = {}) {
  if (!isChairLot(lot)) return lot;
  const expected = clampBroilerPrice(lot.prix_vente_prevu ?? lot.sale_price ?? lot.prix_unitaire);
  const real = toNumber(lot.prix_vente_reel) > 0 ? clampBroilerPrice(lot.prix_vente_reel) : lot.prix_vente_reel;
  return {
    ...lot,
    prix_vente_prevu: expected,
    prix_vente_reel: real,
    sale_price: expected,
    prix_unitaire: expected,
    // On neutralise une marge saisie trop haute pour forcer un recalcul depuis prix reel, couts et effectif.
    marge: '',
    marge_calculee_view: '',
  };
}

function normalizeRows(rows = []) {
  return safeArray(rows).map(normalizeBroilerLot);
}

function metricsForLot({ lot, alimentationLogs = [], productionLogs = [] }) {
  const normalized = normalizeBroilerLot(lot);
  const metrics = calculateLotMetrics({ lot: normalized, feedingLogs: alimentationLogs, productionLogs });
  if (!isChairLot(normalized)) return metrics;
  const unitPrice = clampBroilerPrice(normalized.prix_vente_reel || normalized.prix_vente_prevu);
  const count = metrics.currentCount || currentCount(normalized);
  const grossRevenue = unitPrice * count;
  const estimatedMargin = grossRevenue - toNumber(metrics.totalCosts);
  return {
    ...metrics,
    currentCount: count,
    broilerUnitPrice: unitPrice,
    grossRevenue,
    estimatedMargin,
    marginPerHead: count > 0 ? estimatedMargin / count : 0,
  };
}

function getPhaseLabel(lot = {}, readiness = {}, metrics = {}) {
  if (isChairLot(lot)) {
    const weight = toNumber(lot.weight_avg || lot.poids_moyen);
    return weight > 0 ? `Poids moyen ${weight.toFixed(2)} kg · Prix ${money(metrics.broilerUnitPrice || clampBroilerPrice(lot.prix_vente_prevu))}` : `Poids moyen a renseigner · Prix ${money(metrics.broilerUnitPrice || clampBroilerPrice(lot.prix_vente_prevu))}`;
  }
  if (isPondeuseLot(lot)) {
    const phase = suggestLotPhase(lot, metrics);
    return phase.label || lot.phase || lot.status || readiness.status || 'Phase de ponte a renseigner';
  }
  return lot.phase || lot.status || 'Phase a renseigner';
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
      const readiness = calculateLotSaleReadiness(lot, metrics);
      const ready = readiness.recommended || lot.pret_vente_recommande || lot.pret_vente_confirme || lot.status === 'pret_a_la_vente' || lot.status === 'pret_a_vendre_reforme';
      return { lot, metrics, readiness, ready };
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
        {readyLots.map(({ lot, metrics, readiness }) => (
          <div key={lot.id} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-black text-[#2f2415]">{lot.name || lot.id}</p>
                <p className="text-xs text-[#8a7456] mt-1">{isChairLot(lot) ? 'Chair' : 'Pondeuse'} · {getPhaseLabel(lot, readiness, metrics)}</p>
              </div>
              <span className="text-xs font-semibold rounded-full px-2 py-1 bg-emerald-100 text-emerald-700">Pret</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div><p className="text-[#8a7456]">Effectif</p><p className="font-bold text-[#2f2415]">{fmtNumber(metrics.currentCount || currentCount(lot))}</p></div>
              <div><p className="text-[#8a7456]">Score</p><p className="font-bold text-[#2f2415]">{readiness.score || 0}%</p></div>
              <div><p className="text-[#8a7456]">Marge/tete</p><p className="font-bold text-[#2f2415]">{money(metrics.marginPerHead)}</p></div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Btn icon={TrendingUp} small onClick={() => onCreateOpportunity?.({
                opportunity_type: isChairLot(lot) ? 'lot_chair' : 'pondeuse_reforme',
                source_type: 'lot_avicole',
                source_id: lot.id,
                title: `${lot.name || lot.id} - pret a la vente`,
                description: getPhaseLabel(lot, readiness, metrics),
                quantity: metrics.currentCount || currentCount(lot),
                unit: 'tete',
                unit_price: isChairLot(lot) ? metrics.broilerUnitPrice : undefined,
                estimated_value: metrics.grossRevenue,
                estimated_margin: metrics.estimatedMargin,
                score: readiness.score,
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

function ContextualLinks({ rows = [], productionLogs = [] }) {
  const pondeuses = filterLotsByActivity(rows, 'Pondeuse');
  const chair = filterLotsByActivity(rows, 'Chair');
  const issues = getDailyProductionIssues({ productionLogs, lots: rows });
  const readyChair = chair.filter((lot) => lot.status === 'pret_a_la_vente' || lot.pret_vente_recommande || lot.pret_vente_confirme).length;

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

export default function AvicoleV7(props) {
  const rows = normalizeRows(props.rows || []);
  const normalizedProps = { ...props, rows };

  return (
    <div className="space-y-6">
      <ContextualLinks rows={rows} productionLogs={props.productionLogs} />
      <SaleReadyPanel rows={rows} alimentationLogs={props.alimentationLogs} productionLogs={props.productionLogs} onCreateOpportunity={props.onCreateOpportunity} />
      <AvicoleV6 {...normalizedProps} />
    </div>
  );
}
