import { BarChart3, Bird, ShoppingBag, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtNumber, toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount, avicoleDeadCount, avicoleSickCount } from '../utils/avicoleMetrics';

const arr = (value) => Array.isArray(value) ? value : [];
const eggs = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity ?? log.quantite);
const broken = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses ?? log.pertes);
const activeCount = avicoleActiveCount;
const deadCount = avicoleDeadCount;
const sickCount = avicoleSickCount;
const avgWeight = (lot = {}) => toNumber(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.average_weight ?? lot.current_weight ?? lot.poids_moyen ?? lot.weight);
const readyForSale = (lot = {}) => {
  const status = String(lot.status || lot.statut || '').toLowerCase();
  return ['pret_a_la_vente', 'pret_a_vendre_reforme', 'pret_vente', 'ready'].includes(status) || Boolean(lot.pret_vente_recommande || lot.pret_vente_confirme);
};

function asDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value) {
  const date = asDate(value);
  if (!date) return 'Sans date';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  if (key === 'Sans date') return key;
  const [year, month] = key.split('-');
  return `${month}/${String(year).slice(-2)}`;
}

function ChartCard({ title, subtitle, children }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="mb-3"><p className="font-black text-[#2f2415] flex items-center gap-2"><BarChart3 size={16} />{title}</p><p className="text-xs text-[#8a7456] mt-1">{subtitle}</p></div><div className="h-72">{children}</div></div>;
}

function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function NumberLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{fmtNumber(value)}</text>;
}

function WeightLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{Number(value || 0).toFixed(2)}</text>;
}

function buildPonte({ rows = [], productionLogs = [] }) {
  const pondeuses = filterLotsByActivity(rows, 'Pondeuse');
  const pondeuseIds = new Set(pondeuses.map((lot) => String(lot.id)));
  const activePondeuses = pondeuses.reduce((sum, lot) => sum + activeCount(lot), 0);
  const map = new Map();

  arr(productionLogs).forEach((log) => {
    if (log.lot_id && pondeuseIds.size && !pondeuseIds.has(String(log.lot_id))) return;
    const produced = eggs(log);
    const casse = broken(log);
    if (produced <= 0 && casse <= 0) return;
    const key = monthKey(log.date || log.created_at || log.updated_at);
    if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), oeufs: 0, casses: 0, vendables: 0, dates: new Set() });
    const bucket = map.get(key);
    bucket.oeufs += produced;
    bucket.casses += casse;
    bucket.vendables += Math.max(0, produced - casse);
    if (log.date) bucket.dates.add(String(log.date));
  });

  const monthly = [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((item) => {
    const days = Math.max(1, item.dates.size || 1);
    const rate = activePondeuses > 0 ? (item.oeufs / (activePondeuses * days)) * 100 : 0;
    return { ...item, jours: days, taux_ponte: Number(rate.toFixed(1)) };
  });

  return { pondeuses, activePondeuses, monthly };
}

function buildChair(rows = []) {
  return filterLotsByActivity(rows, 'Chair').map((lot) => ({
    id: lot.id,
    lot: lot.name || lot.nom || lot.id,
    actifs: activeCount(lot),
    morts: deadCount(lot),
    malades: sickCount(lot),
    poids: avgWeight(lot),
    pret: readyForSale(lot) ? 1 : 0,
  })).filter((row) => row.actifs > 0 || row.morts > 0 || row.malades > 0 || row.poids > 0).slice(0, 8);
}

export default function AvicoleEvolution({ rows = [], productionLogs = [], onNavigate }) {
  const ponte = buildPonte({ rows, productionLogs });
  const chairLots = buildChair(rows);
  const totalEggs = ponte.monthly.reduce((sum, row) => sum + row.oeufs, 0);
  const totalBroken = ponte.monthly.reduce((sum, row) => sum + row.casses, 0);
  const totalSellable = ponte.monthly.reduce((sum, row) => sum + row.vendables, 0);
  const chairActive = chairLots.reduce((sum, row) => sum + row.actifs, 0);
  const chairDead = chairLots.reduce((sum, row) => sum + row.morts, 0);
  const chairSick = chairLots.reduce((sum, row) => sum + row.malades, 0);
  const readyLots = chairLots.filter((row) => row.pret).length;
  const priority = chairSick > 0 || chairDead > 0 ? { module: 'sante', label: 'Traiter santé avicole' } : readyLots > 0 ? { module: 'ventes', label: 'Confirmer les ventes chair' } : { module: 'avicole', label: 'Mettre à jour les pesées / pontes' };
  const interpretation = chairSick > 0 || chairDead > 0
    ? `${fmtNumber(chairDead)} mort(s) et ${fmtNumber(chairSick)} malade(s) à surveiller sur les lots chair.`
    : readyLots > 0
      ? `${fmtNumber(readyLots)} lot(s) chair semblent prêts à convertir en vente.`
      : totalEggs > 0
        ? `Ponte suivie : ${fmtNumber(totalSellable)} œufs vendables sur ${fmtNumber(totalEggs)} ramassés.`
        : 'Aucune tendance forte : compléter les pontes, pesées et sorties pour enrichir l’évolution.';

  return <div className="space-y-4">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Bird size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution Avicole</p><p className="text-xs text-[#8a7456] mt-1">Lecture séparée ponte et chair : production, pertes, effectif, mortalité, poids et lots prêts.</p></div></div>
        <button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><ShoppingBag size={15} />{priority.label}</button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <SmallMetric label="Pondeuses actives" value={fmtNumber(ponte.activePondeuses)} hint="lots pondeuses" />
        <SmallMetric label="Œufs ramassés" value={fmtNumber(totalEggs)} hint="données réelles" />
        <SmallMetric label="Œufs vendables" value={fmtNumber(totalSellable)} hint={`${fmtNumber(totalBroken)} pertes`} />
        <SmallMetric label="Chair active" value={fmtNumber(chairActive)} hint="effectif vivant" />
        <SmallMetric label="Mortalité chair" value={fmtNumber(chairDead)} hint={`${fmtNumber(chairSick)} malade(s)`} danger={chairDead > 0 || chairSick > 0} />
        <SmallMetric label="Lots prêts" value={fmtNumber(readyLots)} hint="vente/réforme" />
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartCard title="Ponte — œufs, casses et vendables" subtitle="Grand graphique principal : évolution mensuelle de la ponte.">
        {ponte.monthly.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={ponte.monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis /><Tooltip /><Legend /><Bar dataKey="oeufs" name="Œufs ramassés"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="vendables" name="Œufs vendables"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="casses" name="Casses / pertes"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée de ponte datée disponible.</p>}
      </ChartCard>

      <ChartCard title="Chair — effectif et mortalité par lot" subtitle="Permet de voir quels lots de chair concentrent les pertes.">
        {chairLots.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chairLots} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="lot" /><YAxis /><Tooltip /><Legend /><Bar dataKey="actifs" name="Actifs"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="morts" name="Morts"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="malades" name="Malades"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun lot de chair actif ou exploitable.</p>}
      </ChartCard>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartCard title="Ponte — taux estimé" subtitle="Œufs ramassés / pondeuses actives / jours de relevé.">
        {ponte.monthly.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={ponte.monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis tickFormatter={(v) => `${v}%`} /><Tooltip formatter={(value) => `${value}%`} /><Legend /><Line type="monotone" dataKey="taux_ponte" name="Taux de ponte estimé" strokeWidth={3}><LabelList dataKey="taux_ponte" position="top" formatter={(value) => `${value}%`} /></Line></LineChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun taux de ponte calculable.</p>}
      </ChartCard>

      <ChartCard title="Chair — poids moyen par lot" subtitle="À utiliser avec l’objectif 1,5 kg pour confirmer les lots prêts à vendre.">
        {chairLots.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chairLots} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="lot" /><YAxis /><Tooltip formatter={(value) => `${Number(value || 0).toFixed(2)} kg`} /><Legend /><Bar dataKey="poids" name="Poids moyen kg"><LabelList content={<WeightLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun poids moyen exploitable pour les lots de chair.</p>}
      </ChartCard>
    </div>

    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${chairSick || chairDead ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><ShoppingBag size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
