import { AlertTriangle, BarChart3, HeartPulse, Scale, ShoppingBag, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import { buildGrowthSummary } from '../utils/animalGrowth';
import { getAnimalSaleReadiness, calculateAnimalSalePricing } from '../utils/animalSalePricing';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const weight = (row = {}) => toNumber(row.poids ?? row.weight ?? row.current_weight ?? row.last_weight);
const isSick = (row = {}) => ['malade', 'blesse', 'blessé', 'sous_traitement', 'a_surveiller'].includes(lower(row.health_status || row.sante_status));
const isSold = (row = {}) => ['vendu', 'sold'].includes(lower(row.status || row.statut));
const isLoss = (row = {}) => ['mort', 'vole', 'volé', 'perdu'].includes(lower(row.status || row.statut));
const isReady = (row = {}) => Boolean(row.pret_vente_confirme || row.ready_for_sale || row.sale_ready || row.pret_a_la_vente || lower(row.status || row.statut) === 'pret_a_la_vente' || row.pret_vente_recommande || getAnimalSaleReadiness({ animal: row }).recommended);
const rowDate = (row = {}) => row.date_entree_ferme || row.date_achat || row.created_at || row.updated_at || row.naissance || row.date_naissance;

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
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="mb-3">
        <p className="font-black text-[#2f2415] flex items-center gap-2"><BarChart3 size={16} />{title}</p>
        <p className="text-xs text-[#8a7456] mt-1">{subtitle}</p>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

function SmallMetric({ label, value, hint, danger = false }) {
  return (
    <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
      {hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}
    </div>
  );
}

function NumberLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{fmtNumber(value)}</text>;
}

function WeightLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{Number(value || 0).toFixed(1)}</text>;
}

function buildByActivity(rows = []) {
  const map = new Map();
  arr(rows).forEach((animal) => {
    const key = animal.type || animal.activite || 'Autre';
    if (!map.has(key)) map.set(key, { activite: key, actifs: 0, malades: 0, prets: 0, vendus: 0, pertes: 0, poids_total: 0, poids_count: 0, poids_moyen: 0, ca_potentiel: 0 });
    const bucket = map.get(key);
    if (isActiveAnimalForFeeding(animal)) bucket.actifs += 1;
    if (isSick(animal)) bucket.malades += 1;
    if (isReady(animal)) bucket.prets += 1;
    if (isSold(animal)) bucket.vendus += 1;
    if (isLoss(animal)) bucket.pertes += 1;
    if (weight(animal) > 0) { bucket.poids_total += weight(animal); bucket.poids_count += 1; }
    const pricing = calculateAnimalSalePricing({ animal, metrics: { totalCost: toNumber(animal.purchase_cost || animal.cout_total || 0) } });
    bucket.ca_potentiel += toNumber(pricing.recommendedSalePrice || animal.prix_vente_estime_auto || animal.prix_vente_estime || animal.sale_price || 0);
  });
  return [...map.values()].map((row) => ({ ...row, poids_moyen: row.poids_count ? Number((row.poids_total / row.poids_count).toFixed(1)) : 0 })).sort((a, b) => b.actifs - a.actifs);
}

function buildMonthly(rows = []) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), entrees: 0, vendus: 0, pertes: 0, malades: 0, prets: 0 });
    return map.get(key);
  };
  arr(rows).forEach((animal) => {
    const bucket = ensure(monthKey(rowDate(animal)));
    bucket.entrees += 1;
    if (isSold(animal)) bucket.vendus += 1;
    if (isLoss(animal)) bucket.pertes += 1;
    if (isSick(animal)) bucket.malades += 1;
    if (isReady(animal)) bucket.prets += 1;
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export default function AnimauxEvolution({ rows = [], opportunities = [], onNavigate }) {
  const animals = arr(rows);
  const byActivity = buildByActivity(animals);
  const monthly = buildMonthly(animals);
  const active = animals.filter(isActiveAnimalForFeeding).length;
  const sick = animals.filter(isSick).length;
  const ready = animals.filter(isReady).length;
  const sold = animals.filter(isSold).length;
  const losses = animals.filter(isLoss).length;
  const slowGrowth = animals.filter((animal) => ['croissance_lente', 'perte_poids'].includes(buildGrowthSummary(animal).status)).length;
  const avgWeight = active ? animals.filter(isActiveAnimalForFeeding).reduce((sum, animal) => sum + weight(animal), 0) / Math.max(1, animals.filter((animal) => isActiveAnimalForFeeding(animal) && weight(animal) > 0).length) : 0;
  const openOpps = arr(opportunities).filter((opp) => String(opp.source_module || opp.created_from || '').includes('animaux') && !['fermee', 'fermée', 'gagnee', 'gagnée', 'perdue'].includes(lower(opp.status || opp.statut))).length;
  const potentialCA = byActivity.reduce((sum, row) => sum + row.ca_potentiel, 0);
  const priority = sick > 0 ? { module: 'sante', label: 'Traiter le suivi santé', icon: HeartPulse } : ready > 0 ? { module: 'ventes', label: 'Convertir les animaux prêts', icon: ShoppingBag } : slowGrowth > 0 ? { module: 'animaux', label: 'Vérifier les croissances lentes', icon: Scale } : { module: 'animaux', label: 'Mettre à jour les pesées', icon: Scale };
  const PriorityIcon = priority.icon;
  const interpretation = sick > 0
    ? `${fmtNumber(sick)} animal(aux) nécessitent un suivi santé.`
    : ready > 0
      ? `${fmtNumber(ready)} animal(aux) sont prêts ou presque prêts à vendre.`
      : slowGrowth > 0
        ? `${fmtNumber(slowGrowth)} animal(aux) ont une croissance à surveiller.`
        : 'Cheptel stable : maintenir les pesées et le suivi sanitaire.';

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><TrendingUp size={18} /></div>
            <div>
              <p className="font-black text-[#2f2415]">Évolution Animaux</p>
              <p className="text-xs text-[#8a7456] mt-1">Lecture décisionnelle : effectifs, santé, poids, vente et croissance.</p>
            </div>
          </div>
          <button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <SmallMetric label="Actifs" value={fmtNumber(active)} hint="bovins/ovins/caprins" />
          <SmallMetric label="Malades" value={fmtNumber(sick)} hint="à suivre" danger={sick > 0} />
          <SmallMetric label="Prêts vente" value={fmtNumber(ready)} hint={`${fmtNumber(openOpps)} opportunité(s)`} />
          <SmallMetric label="Poids moyen" value={`${Number(avgWeight || 0).toFixed(1)} kg`} hint="actifs pesés" />
          <SmallMetric label="Pertes" value={fmtNumber(losses)} hint={`${fmtNumber(sold)} vendu(s)`} danger={losses > 0} />
          <SmallMetric label="CA potentiel" value={fmtCurrency(potentialCA)} hint="prix estimé" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Effectif et risques par activité" subtitle="Grand graphique principal : actifs, malades, prêts à vendre et pertes par activité.">
          {byActivity.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={byActivity} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="activite" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="actifs" name="Actifs"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="malades" name="Malades"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="prets" name="Prêts vente"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="pertes" name="Pertes"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun animal exploitable.</p>}
        </ChartCard>

        <ChartCard title="Poids moyen par activité" subtitle="Permet de suivre l’engraissement et la préparation à la vente.">
          {byActivity.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={byActivity} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="activite" /><YAxis /><Tooltip formatter={(value) => `${Number(value || 0).toFixed(1)} kg`} /><Legend /><Bar dataKey="poids_moyen" name="Poids moyen kg"><LabelList content={<WeightLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun poids moyen exploitable.</p>}
        </ChartCard>
      </div>

      <ChartCard title="Entrées, ventes et points de risque" subtitle="Lecture mensuelle des mouvements enregistrés sur les animaux.">
        {monthly.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="entrees" name="Entrées" strokeWidth={3}><LabelList content={<NumberLabel />} /></Line><Line type="monotone" dataKey="prets" name="Prêts vente"><LabelList content={<NumberLabel />} /></Line><Line type="monotone" dataKey="malades" name="Malades"><LabelList content={<NumberLabel />} /></Line><Line type="monotone" dataKey="pertes" name="Pertes"><LabelList content={<NumberLabel />} /></Line></LineChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée datée disponible.</p>}
      </ChartCard>

      <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3">
        <TrendingUp size={18} className="text-[#9a6b12] mt-0.5" />
        <div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div>
      </div>

      <div className={`${sick || losses || slowGrowth ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}>
        <div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div>
        <button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button>
      </div>
    </div>
  );
}
