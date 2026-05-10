import { HeartPulse, Scale, ShoppingBag, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import { buildGrowthSummary } from '../utils/animalGrowth';
import { getAnimalSaleReadiness, calculateAnimalSalePricing } from '../utils/animalSalePricing';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const weight = (row = {}) => toNumber(row.poids ?? row.weight ?? row.current_weight ?? row.last_weight ?? row.poids_actuel);
const initialWeight = (row = {}) => toNumber(row.poids_entree ?? row.entry_weight ?? row.initial_weight ?? row.birth_weight ?? row.poids_initial);
const purchaseCost = (row = {}) => toNumber(row.purchase_cost ?? row.prix_achat ?? row.cout_achat ?? row.cout_total ?? row.cost);
const isSick = (row = {}) => ['malade', 'blesse', 'blessé', 'sous_traitement', 'a_surveiller'].includes(lower(row.health_status || row.sante_status));
const isSold = (row = {}) => ['vendu', 'sold'].includes(lower(row.status || row.statut));
const isLoss = (row = {}) => ['mort', 'vole', 'volé', 'perdu'].includes(lower(row.status || row.statut));
const isReady = (row = {}) => Boolean(row.pret_vente_confirme || row.ready_for_sale || row.sale_ready || row.pret_a_la_vente || lower(row.status || row.statut) === 'pret_a_la_vente' || row.pret_vente_recommande || getAnimalSaleReadiness({ animal: row }).recommended);
const rowDate = (row = {}) => row.date_entree_ferme || row.date_achat || row.created_at || row.updated_at || row.naissance || row.date_naissance;
const eventDate = (row = {}) => row.date || row.created_at || row.updated_at || row.paid_at || row.payment_date || row.date_commande;
const eventAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? 0);
const oppAmount = (opp = {}) => toNumber(opp.montant_estime ?? opp.estimated_amount ?? opp.valeur_estimee ?? opp.amount ?? opp.total ?? opp.ca_potentiel ?? 0);
const logQty = (log = {}) => toNumber(log.quantite ?? log.quantity ?? log.qty ?? log.amount);
const logCost = (log = {}) => toNumber(log.cout_total ?? log.total_cost ?? log.montant ?? log.amount ?? log.cost ?? 0);
const logDate = (row = {}) => row.date || row.created_at || row.updated_at;

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

function ensure(map, key) {
  if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), charges_aliments: 0, charges_soins: 0, ca_ventes: 0, marge: 0, taux_marge: 0, poids_total: 0, poids_count: 0, poids_moyen: 0, croissance_total: 0, croissance_count: 0, croissance_moyenne: 0, effectif: 0, malades: 0, pertes: 0, prets: 0, vendus: 0, reproduction: 0, taux_mortalite: 0 });
  return map.get(key);
}

function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function Header({ priority, onNavigate }) {
  const PriorityIcon = priority.icon;
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><TrendingUp size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution Animaux interactive</p><p className="text-xs text-[#8a7456] mt-1">Lecture mensuelle : charges, ventes, marge, poids, croissance, mortalité et préparation à la vente.</p></div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button></div></div>;
}

function animalSaleValue(animal) {
  const pricing = calculateAnimalSalePricing({ animal, metrics: { totalCost: purchaseCost(animal) } });
  return toNumber(pricing.recommendedSalePrice || animal.prix_vente_estime_auto || animal.prix_vente_estime || animal.sale_price || animal.prix_vente || 0);
}

function buildMonthly({ rows = [], alimentationLogs = [], vaccins = [], opportunities = [] }) {
  const animals = arr(rows);
  const map = new Map();
  const nowKey = monthKey(new Date());

  animals.forEach((animal) => {
    const key = monthKey(rowDate(animal) || nowKey);
    const bucket = ensure(map, key);
    if (isActiveAnimalForFeeding(animal)) bucket.effectif += 1;
    if (isSick(animal)) bucket.malades += 1;
    if (isLoss(animal)) bucket.pertes += 1;
    if (isReady(animal)) bucket.prets += 1;
    if (isSold(animal)) bucket.vendus += 1;
    const current = weight(animal);
    if (current > 0) { bucket.poids_total += current; bucket.poids_count += 1; }
    const start = initialWeight(animal);
    if (current > 0 && start > 0) { bucket.croissance_total += Math.max(0, current - start); bucket.croissance_count += 1; }
    if (lower(animal.sexe) === 'femelle' && (lower(animal.status_reproduction || animal.reproduction_status).includes('gest') || lower(animal.status_reproduction || animal.reproduction_status).includes('mise_bas'))) bucket.reproduction += 1;
  });

  arr(alimentationLogs).forEach((log) => {
    const bucket = ensure(map, monthKey(logDate(log)));
    const cost = logCost(log) || logQty(log) * toNumber(log.prix_unitaire ?? log.unit_price ?? 0);
    bucket.charges_aliments += cost;
  });

  arr(vaccins).forEach((event) => {
    const target = lower(`${event.target_type || ''} ${event.espece || ''} ${event.module || ''}`);
    const looksAnimal = !target || target.includes('animal') || target.includes('bovin') || target.includes('ovin') || target.includes('caprin');
    if (!looksAnimal) return;
    const bucket = ensure(map, monthKey(eventDate(event)));
    bucket.charges_soins += eventAmount(event) || toNumber(event.cout_total ?? event.cost ?? event.prix ?? 0);
  });

  arr(opportunities).forEach((opp) => {
    const source = lower(`${opp.source_module || ''} ${opp.created_from || ''} ${opp.type || ''} ${opp.title || ''}`);
    if (!source.includes('animaux') && !source.includes('animal')) return;
    ensure(map, monthKey(opp.created_at || opp.updated_at || opp.date)).ca_ventes += oppAmount(opp);
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const poids = row.poids_count ? row.poids_total / row.poids_count : 0;
    const croissance = row.croissance_count ? row.croissance_total / row.croissance_count : 0;
    const marge = row.ca_ventes - row.charges_aliments - row.charges_soins;
    const base = Math.max(1, row.effectif + row.pertes);
    return { ...row, poids_moyen: Number(poids.toFixed(2)), croissance_moyenne: Number(croissance.toFixed(2)), marge: Number(marge.toFixed(0)), taux_marge: row.ca_ventes > 0 ? Number(((marge / row.ca_ventes) * 100).toFixed(1)) : 0, taux_mortalite: Number(((row.pertes / base) * 100).toFixed(1)) };
  });
}

function values(rows, key) { return rows.map((row) => toNumber(row[key])); }
function labels(rows) { return rows.map((row) => row.mois); }

export default function AnimauxEvolution({ rows = [], alimentationLogs = [], vaccins = [], opportunities = [], onNavigate }) {
  const animals = arr(rows);
  const monthly = buildMonthly({ rows, alimentationLogs, vaccins, opportunities });
  const active = animals.filter(isActiveAnimalForFeeding).length;
  const sick = animals.filter(isSick).length;
  const ready = animals.filter(isReady).length;
  const sold = animals.filter(isSold).length;
  const losses = animals.filter(isLoss).length;
  const slowGrowth = animals.filter((animal) => ['croissance_lente', 'perte_poids'].includes(buildGrowthSummary(animal).status)).length;
  const avgWeight = active ? animals.filter(isActiveAnimalForFeeding).reduce((sum, animal) => sum + weight(animal), 0) / Math.max(1, animals.filter((animal) => isActiveAnimalForFeeding(animal) && weight(animal) > 0).length) : 0;
  const openOpps = arr(opportunities).filter((opp) => String(opp.source_module || opp.created_from || '').includes('animaux') && !['fermee', 'fermée', 'gagnee', 'gagnée', 'perdue'].includes(lower(opp.status || opp.statut))).length;
  const potentialCA = animals.filter(isReady).reduce((sum, animal) => sum + animalSaleValue(animal), 0);
  const totalMargin = monthly.reduce((sum, row) => sum + row.marge, 0);
  const priority = sick > 0 ? { module: 'sante', label: 'Traiter le suivi santé', icon: HeartPulse } : ready > 0 ? { module: 'ventes', label: 'Convertir les animaux prêts', icon: ShoppingBag } : slowGrowth > 0 ? { module: 'animaux', label: 'Vérifier les croissances lentes', icon: Scale } : { module: 'animaux', label: 'Mettre à jour les pesées', icon: Scale };
  const PriorityIcon = priority.icon;
  const interpretation = sick > 0 ? `${fmtNumber(sick)} animal(aux) nécessitent un suivi santé.` : ready > 0 ? `${fmtNumber(ready)} animal(aux) sont prêts ou presque prêts à vendre.` : slowGrowth > 0 ? `${fmtNumber(slowGrowth)} animal(aux) ont une croissance à surveiller.` : 'Cheptel stable : maintenir les pesées et le suivi sanitaire.';

  return <div className="space-y-5">
    <Header priority={priority} onNavigate={onNavigate} />

    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <SmallMetric label="Actifs" value={fmtNumber(active)} hint="bovins/ovins/caprins" />
        <SmallMetric label="Malades" value={fmtNumber(sick)} hint="à suivre" danger={sick > 0} />
        <SmallMetric label="Prêts vente" value={fmtNumber(ready)} hint={`${fmtNumber(openOpps)} opportunité(s)`} />
        <SmallMetric label="Poids moyen" value={`${Number(avgWeight || 0).toFixed(2)} kg`} hint="actifs pesés" />
        <SmallMetric label="Pertes" value={fmtNumber(losses)} hint={`${fmtNumber(sold)} vendu(s)`} danger={losses > 0} />
        <SmallMetric label="Marge estimée" value={fmtCurrency(totalMargin)} hint={`CA potentiel ${fmtCurrency(potentialCA)}`} />
      </div>
    </div>

    <SmartEvolutionChart title="Animaux — économie mensuelle" subtitle="Barres : charges, CA, marge. Courbes : poids moyen et taux de marge. La légende est cliquable." months={labels(monthly)} leftUnit="FCFA" rightUnit="kg" series={[{ name: 'Charges aliments', type: 'bar', unit: 'FCFA', data: values(monthly, 'charges_aliments') }, { name: 'Charges soins', type: 'bar', unit: 'FCFA', data: values(monthly, 'charges_soins') }, { name: 'CA ventes', type: 'bar', unit: 'FCFA', data: values(monthly, 'ca_ventes') }, { name: 'Marge', type: 'bar', unit: 'FCFA', data: values(monthly, 'marge') }, { name: 'Poids moyen', type: 'line', axis: 'right', unit: 'kg', data: values(monthly, 'poids_moyen') }, { name: 'Taux marge', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_marge') }]} />

    <SmartEvolutionChart title="Animaux — performance opérationnelle mensuelle" subtitle="Effectif, animaux prêts, malades, pertes, croissance et mortalité. Zoom disponible en bas du graphe." months={labels(monthly)} leftUnit="" rightUnit="%" series={[{ name: 'Effectif actif', type: 'bar', data: values(monthly, 'effectif') }, { name: 'Prêts vente', type: 'bar', data: values(monthly, 'prets') }, { name: 'Malades', type: 'bar', data: values(monthly, 'malades') }, { name: 'Pertes', type: 'bar', data: values(monthly, 'pertes') }, { name: 'Reproduction', type: 'bar', data: values(monthly, 'reproduction') }, { name: 'Croissance moyenne', type: 'line', axis: 'right', unit: 'kg', data: values(monthly, 'croissance_moyenne') }, { name: 'Taux mortalité', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_mortalite') }]} />

    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${sick || losses || slowGrowth ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
