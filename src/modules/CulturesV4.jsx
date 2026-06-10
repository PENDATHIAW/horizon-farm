import { AlertTriangle, BarChart3, CloudSun, ClipboardList, Package, Sprout } from 'lucide-react';
import Btn from '../components/Btn';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import useCrudModule from '../hooks/useCrudModule';
import useLiveWeather from '../hooks/useLiveWeather';
import { fmtNumber } from '../utils/format';
import { calculateCultureMetricsWithLoss } from '../utils/lossAdjustedMetrics';
import CultureOperationalHealthPanel from './CultureOperationalHealthPanel.jsx';
import CulturesV3 from './CulturesV3.jsx';
import CulturesEvolution from './CulturesEvolution.jsx';
import ManureEconomyPanel from '../components/ManureEconomyPanel.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';
import { getRealCultureRows } from './CulturesTabActionsBridge.jsx';

const toNumber = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const lossQty = (row = {}) => toNumber(row.pertes ?? row.quantite_perdue ?? row.quantite_sinistree);
const lossValue = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.perte_estimee ?? row.montant_sinistre);
const isLossStatus = (row = {}) => ['sinistre', 'perdu'].includes(String(row.statut || '').toLowerCase());
const lower = (value = '') => String(value || '').toLowerCase();
const isCultureInput = (row = {}) => {
  const text = lower(`${row.produit || ''} ${row.name || ''} ${row.nom || ''} ${row.categorie || ''} ${row.category || ''} ${row.type || ''}`);
  return ['semence', 'engrais', 'intrant', 'irrigation', 'eau', 'traitement', 'phytosanitaire', 'substrat', 'terreau', 'culture', 'maraichage', 'maraîchage'].some((word) => text.includes(word));
};
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const stockLabel = (row = {}) => row.produit || row.name || row.nom || row.id || 'Intrant';
const uniqueById = (rows = []) => {
  const map = new Map();
  rows.forEach((row, index) => {
    const key = String(row?.id || row?.culture_id || row?.nom || `culture-${index}`);
    if (!map.has(key)) map.set(key, { ...row, id: row?.id || key });
    else map.set(key, { ...map.get(key), ...row, id: key });
  });
  return Array.from(map.values());
};

function withCultureLossMetrics(row = {}) {
  const metrics = calculateCultureMetricsWithLoss(row);
  return {
    ...row,
    valeur_perte_estimee: lossValue(row) || metrics.lossValue,
    quantite_disponible: toNumber(row.quantite_disponible) || metrics.availableQty,
    cout_total_reel: toNumber(row.cout_total_reel) || metrics.totalCostWithLoss,
    marge_reelle: toNumber(row.marge_reelle) || metrics.marginReal || metrics.marginEstimated,
    score_sante: toNumber(row.score_sante) || metrics.healthScore,
  };
}

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function CultureInputsWeatherPanel({ stocks = [], meteo = null, weatherLoading = false, onNavigate }) {
  const cultureInputs = stocks.filter(isCultureInput);
  const criticalInputs = cultureInputs.filter((row) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row));
  const readyInputs = cultureInputs.filter((row) => stockQty(row) > 0).slice(0, 4);
  const weatherLabel = meteo?.condition || meteo?.description || meteo?.weather || meteo?.summary || 'Météo non renseignée';
  const temp = meteo?.temperature ?? meteo?.temp ?? meteo?.current?.temperature ?? meteo?.main?.temp;
  const humidity = meteo?.humidity ?? meteo?.humidite ?? meteo?.current?.humidity;
  const rain = meteo?.rain ?? meteo?.pluie ?? meteo?.precipitation ?? meteo?.current?.precipitation;

  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
    <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="flex items-center gap-2 font-black text-[#2f2415]"><Package size={17} className="text-[#9a6b12]" /> Intrants cultures</p>
      <p className="mt-1 text-sm text-[#8a7456]">Semences, engrais, traitements et irrigation détectés dans le stock.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Mini label="Intrants suivis" value={cultureInputs.length} />
        <Mini label="Sous seuil" value={criticalInputs.length} danger={criticalInputs.length > 0} />
      </div>
      <div className="mt-3 space-y-2 text-sm">
        {criticalInputs.slice(0, 3).map((row) => <div key={row.id || stockLabel(row)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800"><AlertTriangle size={14} className="inline" /> {stockLabel(row)} · {fmtNumber(stockQty(row))} {row.unite || ''}</div>)}
        {!criticalInputs.length ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">Aucun intrant culture sous seuil.</div> : null}
      </div>
      <div className="mt-3 flex justify-end"><Btn small variant="outline" onClick={() => onNavigate?.('stock')}>Ouvrir stock</Btn></div>
    </article>

    <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="flex items-center gap-2 font-black text-[#2f2415]"><CloudSun size={17} className="text-[#9a6b12]" /> Météo cultures</p>
      <p className="mt-1 text-sm text-[#8a7456]">Contexte météo utile pour l’arrosage, les traitements et le risque de stress.</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Mini label="État" value={weatherLoading ? 'Chargement' : weatherLabel} />
        <Mini label="Température" value={temp !== undefined && temp !== null ? `${fmtNumber(temp)}°C` : '—'} />
        <Mini label="Humidité" value={humidity !== undefined && humidity !== null ? `${fmtNumber(humidity)}%` : '—'} />
        <Mini label="Pluie" value={rain !== undefined && rain !== null ? `${fmtNumber(rain)} mm` : '—'} />
      </div>
      <div className="mt-3 flex justify-end"><Btn small variant="outline" onClick={() => onNavigate?.('smartfarm')}>Ouvrir Smart Farm</Btn></div>
    </article>

    <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="font-black text-[#2f2415]">Intrants disponibles</p>
      <div className="mt-3 space-y-2 text-sm">
        {readyInputs.length ? readyInputs.map((row) => <div key={row.id || stockLabel(row)} className="rounded-xl bg-white border border-[#eadcc2] px-3 py-2"><b className="text-[#2f2415]">{stockLabel(row)}</b><p className="text-xs text-[#8a7456]">{fmtNumber(stockQty(row))} {row.unite || ''} disponible(s)</p></div>) : <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-[#8a7456]">Aucun intrant culture identifié dans le stock.</div>}
      </div>
    </article>
  </div>;
}

function Mini({ label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><p className="text-xs text-[#8a7456]">{label}</p><b className="block text-[#2f2415] break-words">{value}</b></div>;
}

export default function CulturesV4(props) {
  const stockCrud = useCrudModule('stock');
  const { weather: liveMeteo, loading: liveWeatherLoading } = useLiveWeather();
  const adjustedRows = uniqueById(props.rows || []).map(withCultureLossMetrics);
  const adjustedProps = { ...props, rows: adjustedRows };
  const stocks = props.stocks || stockCrud.rows || [];
  const meteo = props.meteo || liveMeteo;
  const dataMap = {
    sales_orders: props.salesOrders || [],
    payments: props.payments || [],
    finances: props.transactions || [],
    cultures: adjustedRows,
    stock: stocks,
    stocks,
    meteo,
  };

  const createLossEvent = async (before = {}, after = {}, source = 'modification culture') => {
    const qtyIncrease = lossQty(after) > lossQty(before);
    const valueIncrease = lossValue(after) > lossValue(before);
    const statusBecameLoss = !isLossStatus(before) && isLossStatus(after);
    if (!qtyIncrease && !valueIncrease && !statusBecameLoss) return;
    const deltaValue = Math.max(0, lossValue(after) - lossValue(before));
    try {
      await props.onCreateBusinessEvent?.({
        id: `EVT-CULT-${Date.now()}`,
        module: 'cultures',
        source_type: 'culture',
        source_id: after.id,
        title: `Perte culturale · ${after.nom || after.type || after.id}`,
        description: [
          `Source: ${source}`,
          `Statut: ${after.statut || 'non renseigné'}`,
          `Pertes: ${lossQty(before)} → ${lossQty(after)} ${after.unite_recolte || ''}`.trim(),
          `Valeur estimée: ${lossValue(before)} → ${lossValue(after)}`,
        ].join('\n'),
        severity: after.statut === 'perdu' ? 'critique' : 'warning',
        status: 'nouveau',
        date: today(),
        type_evenement: 'perte_culturale',
        montant: deltaValue || lossValue(after),
      });
      await props.onRefreshBusinessEvents?.();
    } catch (error) {
      console.warn('Perte culturale non consignée en événement', error);
    }
  };

  const wrappedCreate = async (payload) => {
    await props.onCreate?.(payload);
    await createLossEvent({}, payload, 'création culture');
  };

  const wrappedUpdate = async (id, payload) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdate?.(id, payload);
    await createLossEvent(before, after, 'modification fiche culture');
  };

  return <div className="space-y-6 cultures-mobile-structured"><style>{`@media (max-width: 640px){.cultures-mobile-structured .rounded-2xl{border-radius:18px}.cultures-mobile-structured table{font-size:12px}.cultures-mobile-structured th,.cultures-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.cultures-mobile-structured .text-2xl{font-size:1.35rem}.cultures-mobile-structured .grid{gap:.75rem}.cultures-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <CultureOperationalHealthPanel rows={adjustedRows} salesOrders={props.salesOrders || []} onNavigate={props.onNavigate} />
    <ObjectivePerformanceCard dataMap={dataMap} activity="cultures" title="Objectif & Performance cultures" onNavigate={props.onNavigate} />
    <ManureEconomyPanel
      stocks={stocks}
      salesOrders={props.salesOrders || []}
      cultures={getRealCultureRows(adjustedRows)}
      businessEvents={props.businessEvents || []}
      dataMap={dataMap}
    />
    <ModuleSection icon={Package} title="Intrants & météo" subtitle="Relie les cultures au stock disponible, aux seuils d’intrants et au contexte météo."><CultureInputsWeatherPanel stocks={stocks} meteo={meteo} weatherLoading={liveWeatherLoading} onNavigate={props.onNavigate} /></ModuleSection>
    <ModuleSection icon={Sprout} title="Gestion des cultures" subtitle="Parcelles, campagnes, coûts, récoltes, marge et risques."><CulturesV3 {...adjustedProps} initialTab={props.initialTab} harvestPanel={props.harvestPanel} onCreate={wrappedCreate} onUpdate={wrappedUpdate} /></ModuleSection>
    <ModuleSection icon={ClipboardList} title="Cycle et historique cultures" subtitle="Entrées, sorties, ventes, pertes, récoltes et événements importants."><LifecycleHistoryPanel mode="cultures" rows={adjustedRows} salesOrders={props.salesOrders || []} deliveries={props.deliveriesList || props.deliveries || []} businessEvents={props.businessEvents || []} /></ModuleSection>
    <ModuleSection icon={BarChart3} title="Évolution cultures" subtitle="Rendement, coûts, récoltes, ventes, pertes et valeur."><CulturesEvolution rows={adjustedRows} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
