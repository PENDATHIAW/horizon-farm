import { Calendar, Leaf, Map, Sprout, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { calculateCultureMetrics } from '../utils/businessCalculations';
import Cultures from './Cultures.jsx';
import CultureCostOverview from './CultureCostOverview.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';

const tabs = ['Vue d’ensemble', 'Cultures', 'Parcelles', 'Campagnes', 'Performance'];
const parcelKey = (row = {}) => row.parcelle_code || row.parcelle_nom || row.parcelle || 'Parcelle non renseignée';
const campaignKey = (row = {}) => row.campagne || row.saison || row.date_debut_campagne || 'Campagne non renseignée';
const surface = (row = {}) => toNumber(row.surface_exploitable ?? row.surface);
const cost = (row = {}) => toNumber(row.cout_total_reel) || calculateCultureMetrics(row).costTotal;
const revenue = (row = {}) => toNumber(row.revenu_reel || row.revenu_estime || calculateCultureMetrics(row).revenueEstimated);
const margin = (row = {}) => toNumber(row.marge_reelle) || revenue(row) - cost(row) || calculateCultureMetrics(row).marginEstimated;

function aggregate(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    const item = map.get(key) || { id: key, nom: key, cultures: 0, surface: 0, cout: 0, revenu: 0, marge: 0, risques: 0 };
    const metrics = calculateCultureMetrics(row);
    item.cultures += 1;
    item.surface += surface(row);
    item.cout += cost(row);
    item.revenu += revenue(row);
    item.marge += margin(row);
    item.risques += metrics.healthScore < 80 || metrics.lossRate > 10 || row.statut === 'perdu' ? 1 : 0;
    map.set(key, item);
  });
  return Array.from(map.values());
}

const aggregateColumns = [
  { key: 'nom', label: 'Nom', sortable: true, render: (row) => <span className="font-black text-[#2f2415]">{row.nom}</span> },
  { key: 'cultures', label: 'Cultures', sortable: true },
  { key: 'surface', label: 'Surface', sortable: true, render: (row) => `${fmtNumber(row.surface)} m²` },
  { key: 'cout', label: 'Coût', sortable: true, render: (row) => fmtCurrency(row.cout) },
  { key: 'revenu', label: 'Revenu', sortable: true, render: (row) => fmtCurrency(row.revenu) },
  { key: 'marge', label: 'Marge', sortable: true, render: (row) => <span className={row.marge >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmtCurrency(row.marge)}</span> },
  { key: 'marge_m2', label: 'Marge/m²', render: (row) => fmtCurrency(row.surface ? row.marge / row.surface : 0) },
  { key: 'risques', label: 'Risques', sortable: true },
];

const performanceColumns = [
  { key: 'nom', label: 'Culture', sortable: true, render: (row) => <span className="font-bold text-[#2f2415]">{row.nom || row.type}</span> },
  { key: 'parcelle', label: 'Parcelle', render: parcelKey },
  { key: 'campagne', label: 'Campagne', render: campaignKey },
  { key: 'surface', label: 'Surface', render: (row) => `${fmtNumber(surface(row))} m²` },
  { key: 'cout', label: 'Coût réel/auto', render: (row) => fmtCurrency(cost(row)) },
  { key: 'revenu', label: 'Revenu réel/prévu', render: (row) => fmtCurrency(revenue(row)) },
  { key: 'marge', label: 'Marge', render: (row) => <span className={margin(row) >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmtCurrency(margin(row))}</span> },
  { key: 'liens', label: 'Liens BP/INV', render: (row) => row.business_plan_id || row.investment_id || '—' },
];

export default function CulturesV2(props) {
  const rows = Array.isArray(props.rows) ? props.rows : [];
  const [tab, setTab] = useState('Vue d’ensemble');
  const parcelles = useMemo(() => aggregate(rows, parcelKey), [rows]);
  const campagnes = useMemo(() => aggregate(rows, campaignKey), [rows]);
  const totalSurface = rows.reduce((sum, row) => sum + surface(row), 0);
  const totalCost = rows.reduce((sum, row) => sum + cost(row), 0);
  const totalMargin = rows.reduce((sum, row) => sum + margin(row), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Cultures, parcelles & campagnes</p>
          <h2 className="text-2xl font-black text-[#2f2415]">Pilotage végétal</h2>
          <p className="text-sm text-[#8a7456] mt-1">Suivi des cultures, parcelles, campagnes, coûts réels et rentabilité.</p>
        </div>
        <div className="flex flex-wrap gap-2">{tabs.map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === item ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}>{item}</button>)}</div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard icon={Sprout} label="Cultures" value={rows.length} />
          <KpiCard icon={Map} label="Parcelles" value={parcelles.length} />
          <KpiCard icon={Calendar} label="Campagnes" value={campagnes.length} />
          <KpiCard icon={Leaf} label="Surface" value={`${fmtNumber(totalSurface)} m²`} />
          <KpiCard icon={TrendingUp} label="Marge/m²" value={fmtCurrency(totalSurface ? totalMargin / totalSurface : 0)} />
        </div>
      </div>
      {tab === 'Vue d’ensemble' && <><Cultures {...props} /><CultureCostOverview rows={rows} businessEvents={props.businessEvents || []} /><DirectChargesBridge title="Charges directes cultures" subtitle="Ajoute les frais liés à une culture précise : semences complémentaires, engrais, irrigation, carburant, main-d’œuvre, transport ou traitement." targetType="cultures" targets={rows} businessEvents={props.businessEvents || []} onCreateBusinessEvent={props.onCreateBusinessEvent} onUpdateBusinessEvent={props.onUpdateBusinessEvent} onDeleteBusinessEvent={props.onDeleteBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} /></>}
      {tab === 'Cultures' && <Cultures {...props} />}
      {tab === 'Parcelles' && <DataTable title="Parcelles dérivées des cultures" rows={parcelles} columns={aggregateColumns} loading={props.loading} initialSortKey="nom" />}
      {tab === 'Campagnes' && <DataTable title="Campagnes dérivées des cultures" rows={campagnes} columns={aggregateColumns} loading={props.loading} initialSortKey="nom" />}
      {tab === 'Performance' && <DataTable title="Performance cultures" rows={rows} columns={performanceColumns} loading={props.loading} initialSortKey="nom" />}
    </div>
  );
}
