import { Bird, ShoppingBag, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount, avicoleDeadCount, avicoleSickCount } from '../utils/avicoleMetrics';
import { summarizeAvicoleCosts } from '../utils/costEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const eggs = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity ?? log.quantite);
const broken = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses ?? log.pertes);
const activeCount = avicoleActiveCount;
const deadCount = avicoleDeadCount;
const sickCount = avicoleSickCount;
const avgWeight = (lot = {}) => toNumber(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.average_weight ?? lot.current_weight ?? lot.poids_moyen ?? lot.weight);
const lotInitial = (lot = {}) => toNumber(lot.initial_count ?? lot.effectif_initial ?? lot.quantite_initiale ?? activeCount(lot) + deadCount(lot));
const readyForSale = (lot = {}) => {
  const status = lower(lot.status || lot.statut);
  return ['pret_a_la_vente', 'pret_a_vendre_reforme', 'pret_vente', 'ready'].includes(status) || Boolean(lot.pret_vente_recommande || lot.pret_vente_confirme);
};
const logQty = (log = {}) => toNumber(log.quantite ?? log.quantity ?? log.qty ?? log.amount);
const logCost = (log = {}) => toNumber(log.cout_total ?? log.total_cost ?? log.montant ?? log.amount ?? log.cost ?? 0);
const logDate = (row = {}) => row.date || row.created_at || row.updated_at;
const oppAmount = (opp = {}) => toNumber(opp.montant_estime ?? opp.estimated_amount ?? opp.valeur_estimee ?? opp.amount ?? opp.total ?? opp.ca_potentiel ?? 0);
const orderAmount = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount ?? order.ca ?? order.ca_total ?? 0);
const paymentAmount = (payment = {}) => toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount ?? 0);
const paymentOrderId = (payment = {}) => String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '').trim();
const linkedLotId = (row = {}) => String(row.lot_id || row.cible_id || row.target_id || row.entity_id || row.source_id || row.source_record_id || row.related_id || '').trim();
const isCancelled = (row = {}) => ['annule', 'annulee', 'annulé', 'cancelled'].includes(lower(row.statut || row.status || row.statut_commande));
const linkedToExistingLot = (row = {}, lotIds = new Set()) => {
  if (!lotIds.size) return false;
  const id = linkedLotId(row);
  if (!id) return false;
  return lotIds.has(id);
};
function orderMatchesActivity(order = {}, lotIds = new Set(), keywords = []) {
  const lotId = linkedLotId(order);
  if (lotId) return lotIds.has(lotId);
  const text = lower(`${order.type || ''} ${order.produit || ''} ${order.product_name || ''} ${order.title || ''} ${order.description || ''} ${order.notes || ''}`);
  return keywords.some((keyword) => text.includes(keyword));
}
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
  if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), charges_aliments: 0, charges_soins: 0, ca: 0, encaisse: 0, marge: 0, poids_moyen: 0, taux_mortalite: 0, effectif: 0, morts: 0, malades: 0, prets: 0, oeufs: 0, vendables: 0, casses: 0, taux_ponte: 0, taux_casse: 0, pondeuses: 0, dates: new Set(), sales_real: 0, sales_estimated: 0 });
  return map.get(key);
}
function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}
function Header({ title, subtitle, priority, onNavigate }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Bird size={18} /></div><div><p className="font-black text-[#2f2415]">{title}</p><p className="text-xs text-[#8a7456] mt-1">{subtitle}</p></div></div>{priority ? <button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><ShoppingBag size={15} />{priority.label}</button> : null}</div></div>;
}
function addRealSalesToMonthly({ map, salesOrders = [], payments = [], lotIds = new Set(), keywords = [] }) {
  const realOrders = arr(salesOrders).filter((order) => !isCancelled(order) && orderMatchesActivity(order, lotIds, keywords));
  const orderIds = new Set(realOrders.map((order) => String(order.id || '')).filter(Boolean));
  realOrders.forEach((order) => {
    const bucket = ensure(map, monthKey(order.date || order.created_at || order.updated_at));
    bucket.ca += orderAmount(order);
    bucket.sales_real += orderAmount(order);
  });
  arr(payments).forEach((payment) => {
    const orderId = paymentOrderId(payment);
    const lotLinked = linkedToExistingLot(payment, lotIds);
    if (!orderIds.has(orderId) && !lotLinked) return;
    const bucket = ensure(map, monthKey(payment.date || payment.created_at || payment.paid_at || payment.date_paiement));
    bucket.encaisse += paymentAmount(payment);
  });
  return realOrders.length;
}
function buildChairMonthly({ rows = [], alimentationLogs = [], opportunities = [], salesOrders = [], payments = [] }) {
  const chair = filterLotsByActivity(rows, 'Chair');
  const chairIds = new Set(chair.map((lot) => String(lot.id)));
  if (!chairIds.size) return [];
  const map = new Map();
  const fallbackKey = monthKey(new Date());
  chair.forEach((lot) => {
    const key = monthKey(lot.updated_at || lot.created_at || fallbackKey);
    const bucket = ensure(map, key);
    bucket.effectif += activeCount(lot);
    bucket.morts += deadCount(lot);
    bucket.malades += sickCount(lot);
    bucket.prets += readyForSale(lot) ? 1 : 0;
    bucket.poids_total = toNumber(bucket.poids_total) + avgWeight(lot);
    bucket.poids_count = toNumber(bucket.poids_count) + (avgWeight(lot) > 0 ? 1 : 0);
    const base = Math.max(1, lotInitial(lot));
    bucket.taux_mortalite = ((bucket.morts / base) * 100);
  });
  arr(alimentationLogs).forEach((log) => {
    if (!linkedToExistingLot(log, chairIds)) return;
    const bucket = ensure(map, monthKey(logDate(log)));
    const cost = logCost(log) || logQty(log) * toNumber(log.prix_unitaire ?? log.unit_price ?? 0);
    bucket.charges_aliments += cost;
  });
  const realSales = addRealSalesToMonthly({ map, salesOrders, payments, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler'] });
  if (!realSales) arr(opportunities).forEach((opp) => {
    const source = lower(`${opp.source_module || ''} ${opp.type || ''} ${opp.produit || ''} ${opp.title || ''}`);
    const lotId = linkedLotId(opp);
    const looksChair = source.includes('chair') || (lotId && chairIds.has(lotId));
    if (!looksChair || (lotId && !chairIds.has(lotId))) return;
    const bucket = ensure(map, monthKey(opp.created_at || opp.updated_at || opp.date));
    bucket.ca += oppAmount(opp);
    bucket.sales_estimated += oppAmount(opp);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const poids = row.poids_count ? row.poids_total / row.poids_count : 0;
    const marge = row.ca - row.charges_aliments - row.charges_soins;
    return { ...row, poids_moyen: Number(poids.toFixed(2)), marge: Number(marge.toFixed(0)), taux_marge: row.ca > 0 ? Number(((marge / row.ca) * 100).toFixed(1)) : 0, taux_mortalite: Number(row.taux_mortalite.toFixed(1)) };
  });
}
function buildPonteMonthly({ rows = [], productionLogs = [], alimentationLogs = [], opportunities = [], salesOrders = [], payments = [] }) {
  const pondeuses = filterLotsByActivity(rows, 'Pondeuse');
  const pondeuseIds = new Set(pondeuses.map((lot) => String(lot.id)));
  if (!pondeuseIds.size) return [];
  const activePondeuses = pondeuses.reduce((sum, lot) => sum + activeCount(lot), 0);
  const map = new Map();
  arr(productionLogs).forEach((log) => {
    if (!linkedToExistingLot(log, pondeuseIds)) return;
    const produced = eggs(log);
    const casse = broken(log);
    if (produced <= 0 && casse <= 0) return;
    const bucket = ensure(map, monthKey(logDate(log)));
    bucket.oeufs += produced;
    bucket.casses += casse;
    bucket.vendables += Math.max(0, produced - casse);
    bucket.pondeuses = activePondeuses;
    if (log.date) bucket.dates.add(String(log.date));
  });
  arr(alimentationLogs).forEach((log) => {
    if (!linkedToExistingLot(log, pondeuseIds)) return;
    const bucket = ensure(map, monthKey(logDate(log)));
    const cost = logCost(log) || logQty(log) * toNumber(log.prix_unitaire ?? log.unit_price ?? 0);
    bucket.charges_aliments += cost;
  });
  const realSales = addRealSalesToMonthly({ map, salesOrders, payments, lotIds: pondeuseIds, keywords: ['oeuf', 'œuf', 'ponte', 'pondeuse'] });
  if (!realSales) arr(opportunities).forEach((opp) => {
    const lotId = linkedLotId(opp);
    if (lotId && !pondeuseIds.has(lotId)) return;
    const source = lower(`${opp.source_module || ''} ${opp.type || ''} ${opp.produit || ''} ${opp.title || ''}`);
    if (!lotId && !source.includes('oeuf') && !source.includes('œuf') && !source.includes('ponte')) return;
    const bucket = ensure(map, monthKey(opp.created_at || opp.updated_at || opp.date));
    bucket.ca += oppAmount(opp);
    bucket.sales_estimated += oppAmount(opp);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const days = Math.max(1, row.dates?.size || 1);
    const tauxPonte = activePondeuses > 0 ? (row.oeufs / (activePondeuses * days)) * 100 : 0;
    const tauxCasse = row.oeufs > 0 ? (row.casses / row.oeufs) * 100 : 0;
    const marge = row.ca - row.charges_aliments - row.charges_soins;
    return { ...row, pondeuses: activePondeuses, taux_ponte: Number(tauxPonte.toFixed(1)), taux_casse: Number(tauxCasse.toFixed(1)), marge: Number(marge.toFixed(0)), taux_marge: row.ca > 0 ? Number(((marge / row.ca) * 100).toFixed(1)) : 0 };
  });
}
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }
function labels(rows) { return rows.map((row) => row.mois); }
function average(list, key) {
  const valuesList = arr(list).map((row) => toNumber(row[key])).filter((value) => value > 0);
  return valuesList.length ? valuesList.reduce((sum, value) => sum + value, 0) / valuesList.length : 0;
}
function EmptyState() {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucun lot avicole actif dans cette vue. Les anciens logs orphelins ne sont plus repris dans les coûts, œufs, CA ou graphes.</div>;
}

export default function AvicoleEvolution({ rows = [], productionLogs = [], alimentationLogs = [], opportunities = [], businessEvents = [], salesOrders = [], payments = [], onNavigate }) {
  const activeRows = arr(rows).filter((row) => row?.id);
  const activeLotIds = new Set(activeRows.map((row) => String(row.id)));
  const chairRows = filterLotsByActivity(activeRows, 'Chair');
  const ponteRows = filterLotsByActivity(activeRows, 'Pondeuse');
  const showChair = chairRows.length > 0;
  const showPonte = ponteRows.length > 0;
  const linkedAlimentationLogs = arr(alimentationLogs).filter((log) => linkedToExistingLot(log, activeLotIds));
  const linkedProductionLogs = arr(productionLogs).filter((log) => linkedToExistingLot(log, activeLotIds));
  const linkedBusinessEvents = arr(businessEvents).filter((event) => {
    const id = linkedLotId(event);
    return id && activeLotIds.has(id);
  });
  const costs = activeRows.length ? summarizeAvicoleCosts({ rows: activeRows, alimentationLogs: linkedAlimentationLogs, productionLogs: linkedProductionLogs, slaughterEvents: linkedBusinessEvents }) : { details: [], realFeedCost: 0, estimatedFeedCost: 0 };
  const chairCosts = costs.details.filter((item) => item.type === 'chair');
  const ponteCosts = costs.details.filter((item) => item.type === 'ponte');
  const realCostLots = costs.details.filter((item) => item.realFeedCost > 0).length;
  const chair = showChair ? buildChairMonthly({ rows: activeRows, alimentationLogs: linkedAlimentationLogs, opportunities, salesOrders, payments }) : [];
  const ponte = showPonte ? buildPonteMonthly({ rows: activeRows, productionLogs: linkedProductionLogs, alimentationLogs: linkedAlimentationLogs, opportunities, salesOrders, payments }) : [];
  const lastChair = chair[chair.length - 1] || {};
  const lastPonte = ponte[ponte.length - 1] || {};
  const readyLots = chair.reduce((sum, row) => sum + row.prets, 0);
  const healthIssues = activeRows.reduce((sum, lot) => sum + deadCount(lot) + sickCount(lot), 0);
  const totalEggs = ponte.reduce((sum, row) => sum + row.oeufs, 0);
  const totalSellable = ponte.reduce((sum, row) => sum + row.vendables, 0);
  const totalSalesReal = [...chair, ...ponte].reduce((sum, row) => sum + toNumber(row.sales_real), 0);
  const totalSalesEstimated = [...chair, ...ponte].reduce((sum, row) => sum + toNumber(row.sales_estimated), 0);
  const totalEncaisse = [...chair, ...ponte].reduce((sum, row) => sum + toNumber(row.encaisse), 0);
  const priority = !activeRows.length ? null : healthIssues > 0 ? { module: 'sante', label: 'Traiter santé avicole' } : readyLots > 0 ? { module: 'ventes', label: 'Confirmer les ventes chair' } : { module: 'avicole', label: showPonte ? 'Mettre à jour pontes' : 'Mettre à jour pesées chair' };
  const avgChairCostLive = average(chairCosts, 'costPerLiveSubject');
  const avgChairCostKg = average(chairCosts, 'costPerKg');
  const avgPonteCostEgg = average(ponteCosts, 'costPerEgg');
  const mortalityImpact = average(chairCosts, 'costPerLiveSubject') - average(chairCosts, 'costPerInitialSubject');

  return <div className="space-y-5">
    <Header title={showPonte && !showChair ? 'Évolution Pondeuses interactive' : showChair && !showPonte ? 'Évolution Chair interactive' : 'Évolution Avicole interactive'} subtitle={showPonte && !showChair ? 'Lecture pondeuses uniquement : coûts, ponte, œufs vendables, casse et marge.' : showChair && !showPonte ? 'Lecture poulets de chair uniquement : coûts, ventes, marge, poids et mortalité.' : 'Deux lectures séparées : Chair et Ponte.'} priority={priority} onNavigate={onNavigate} />
    {!activeRows.length ? <EmptyState /> : null}
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{showChair ? <><SmallMetric label="Coût moyen sujet chair" value={fmtCurrency(avgChairCostLive)} hint="coût / sujet vivant" /><SmallMetric label="Coût / kg poulet" value={fmtCurrency(avgChairCostKg)} hint="si abattage enregistré" /><SmallMetric label="Impact mortalité" value={fmtCurrency(Math.max(0, mortalityImpact))} hint="sur coût/sujet chair" danger={mortalityImpact > 0} /></> : null}{showPonte ? <SmallMetric label="Coût / œuf vendable" value={fmtCurrency(avgPonteCostEgg)} hint="ponte" /> : null}<SmallMetric label="Aliment réel" value={fmtCurrency(costs.realFeedCost)} hint={`${fmtNumber(realCostLots)}/${fmtNumber(costs.details.length)} lots`} /><SmallMetric label="Aliment estimé" value={fmtCurrency(costs.estimatedFeedCost)} hint="si pas de sortie réelle" /><SmallMetric label="CA réel" value={fmtCurrency(totalSalesReal)} hint={totalSalesReal ? 'commandes liées' : 'non lié'} /><SmallMetric label="Encaissé" value={fmtCurrency(totalEncaisse)} hint={totalSalesEstimated ? `estimé: ${fmtCurrency(totalSalesEstimated)}` : 'paiements liés'} /></div></div>

    {showChair ? <section className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <p className="font-black text-[#2f2415]">Évolution Chair</p>
        <p className="text-xs text-[#8a7456] mt-1">Poulets de chair : coûts, ventes réelles ou estimées, marge, poids moyen, mortalité et coût par sujet.</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-4"><SmallMetric label="Effectif chair" value={fmtNumber(lastChair.effectif || 0)} hint="dernier mois" /><SmallMetric label="Poids moyen" value={`${Number(lastChair.poids_moyen || 0).toFixed(2)} kg`} hint="dernier mois" /><SmallMetric label="Mortalité" value={`${Number(lastChair.taux_mortalite || 0).toFixed(1)}%`} hint={`${fmtNumber(lastChair.morts || 0)} morts`} danger={(lastChair.taux_mortalite || 0) > 0} /><SmallMetric label="Coût sujet" value={fmtCurrency(avgChairCostLive)} hint="vivant/vendable" /><SmallMetric label="Lots prêts" value={fmtNumber(readyLots)} hint="vente/réforme" /><SmallMetric label="Marge chair" value={fmtCurrency(chair.reduce((sum, row) => sum + row.marge, 0))} hint={chair.some((row) => row.sales_real > 0) ? 'réelle' : 'estimée'} /></div>
      </div>
      <SmartEvolutionChart title="Chair — économie mensuelle" subtitle="Barres : charges, CA, encaissé, marge. Courbe : poids moyen." months={labels(chair)} leftUnit="FCFA" rightUnit="kg" series={[{ name: 'Charges aliments', type: 'bar', unit: 'FCFA', data: values(chair, 'charges_aliments') }, { name: 'CA ventes chair', type: 'bar', unit: 'FCFA', data: values(chair, 'ca') }, { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: values(chair, 'encaisse') }, { name: 'Marge chair', type: 'bar', unit: 'FCFA', data: values(chair, 'marge') }, { name: 'Poids moyen', type: 'line', axis: 'right', unit: 'kg', data: values(chair, 'poids_moyen') }]} />
      <SmartEvolutionChart title="Chair — performance opérationnelle" subtitle="Effectif, morts, malades, lots prêts et taux de mortalité." months={labels(chair)} leftUnit="" rightUnit="%" series={[{ name: 'Effectif vivant', type: 'bar', data: values(chair, 'effectif') }, { name: 'Morts', type: 'bar', data: values(chair, 'morts') }, { name: 'Malades', type: 'bar', data: values(chair, 'malades') }, { name: 'Lots prêts', type: 'bar', data: values(chair, 'prets') }, { name: 'Taux mortalité', type: 'line', axis: 'right', unit: '%', data: values(chair, 'taux_mortalite') }]} />
    </section> : null}

    {showPonte ? <section className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <p className="font-black text-[#2f2415]">Évolution Ponte</p>
        <p className="text-xs text-[#8a7456] mt-1">Pondeuses : coûts, CA œufs, encaissé, marge, production, vendables, taux de ponte et coût par œuf.</p>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mt-4"><SmallMetric label="Pondeuses" value={fmtNumber(lastPonte.pondeuses || 0)} hint="actives" /><SmallMetric label="Œufs produits" value={fmtNumber(totalEggs)} hint="cumul" /><SmallMetric label="Œufs vendables" value={fmtNumber(totalSellable)} hint="cumul" /><SmallMetric label="Coût / œuf" value={fmtCurrency(avgPonteCostEgg)} hint="œuf vendable" /><SmallMetric label="Taux casse" value={`${Number(lastPonte.taux_casse || 0).toFixed(1)}%`} hint="dernier mois" danger={(lastPonte.taux_casse || 0) > 5} /><SmallMetric label="Marge ponte" value={fmtCurrency(ponte.reduce((sum, row) => sum + row.marge, 0))} hint={ponte.some((row) => row.sales_real > 0) ? 'réelle' : 'estimée'} /></div>
      </div>
      <SmartEvolutionChart title="Ponte — économie mensuelle" subtitle="Barres : charges, CA œufs, encaissé, marge. Courbes : taux de ponte et casse." months={labels(ponte)} leftUnit="FCFA" rightUnit="%" series={[{ name: 'Charges aliments ponte', type: 'bar', unit: 'FCFA', data: values(ponte, 'charges_aliments') }, { name: 'CA œufs', type: 'bar', unit: 'FCFA', data: values(ponte, 'ca') }, { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: values(ponte, 'encaisse') }, { name: 'Marge ponte', type: 'bar', unit: 'FCFA', data: values(ponte, 'marge') }, { name: 'Taux ponte', type: 'line', axis: 'right', unit: '%', data: values(ponte, 'taux_ponte') }, { name: 'Taux casse', type: 'line', axis: 'right', unit: '%', data: values(ponte, 'taux_casse') }]} />
      <SmartEvolutionChart title="Ponte — production mensuelle" subtitle="Œufs produits, vendables, casses et effectif pondeuses." months={labels(ponte)} leftUnit="" rightUnit="%" series={[{ name: 'Œufs produits', type: 'bar', data: values(ponte, 'oeufs') }, { name: 'Œufs vendables', type: 'bar', data: values(ponte, 'vendables') }, { name: 'Casses', type: 'bar', data: values(ponte, 'casses') }, { name: 'Pondeuses actives', type: 'line', data: values(ponte, 'pondeuses') }, { name: 'Taux ponte', type: 'line', axis: 'right', unit: '%', data: values(ponte, 'taux_ponte') }]} />
    </section> : null}

    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {!activeRows.length ? 'Aucun lot actif. Les anciens logs restent archivés mais ne sont pas repris dans cette vue.' : totalSalesReal > 0 ? 'Les graphes utilisent les commandes et paiements réellement liés aux lots avicoles.' : totalSalesEstimated > 0 ? 'Aucune vente réelle liée : les graphes utilisent encore les opportunités estimées.' : realCostLots < costs.details.length ? `Coût réel disponible pour ${fmtNumber(realCostLots)}/${fmtNumber(costs.details.length)} lot(s), estimation utilisée pour les autres.` : healthIssues > 0 ? `${fmtNumber(healthIssues)} point(s) santé/mortalité à traiter.` : showChair && readyLots > 0 ? `${fmtNumber(readyLots)} lot(s) chair à convertir en ventes.` : showPonte ? 'Vue pondeuses cohérente : suivre ponte, casses, aliment et marge œufs.' : 'Compléter les coûts et ventes liées pour affiner les marges.'}</div></div>
    {priority ? <div className={`${healthIssues ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><ShoppingBag size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div> : null}
  </div>;
}
