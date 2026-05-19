import { ShoppingBag, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount, avicoleDeadCount, avicoleSickCount } from '../utils/avicoleMetrics';
import { summarizeAvicoleCosts } from '../utils/costEngine';

const EGGS_PER_TABLET = 30;
const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const eggs = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity ?? log.quantite);
const broken = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses ?? log.pertes);
const activeCount = avicoleActiveCount;
const deadCount = avicoleDeadCount;
const sickCount = avicoleSickCount;
const lotInitial = (lot = {}) => toNumber(lot.initial_count ?? lot.effectif_initial ?? lot.quantite_initiale ?? activeCount(lot) + deadCount(lot));
const soldOrExitedCount = (lot = {}) => toNumber(lot.vendus ?? lot.sold_count ?? lot.sorties ?? lot.abattus ?? lot.reformes ?? lot.reformed_count ?? lot.slaughtered_count ?? 0);
const avgWeight = (lot = {}) => toNumber(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.average_weight ?? lot.current_weight ?? lot.poids_moyen ?? lot.weight);
const followedChairCount = (lot = {}) => activeCount(lot) || soldOrExitedCount(lot) || Math.max(0, lotInitial(lot) - deadCount(lot));
const tabletsFromEggs = (value = 0) => ({ tablets: Math.floor(Math.max(0, toNumber(value)) / EGGS_PER_TABLET), remaining: Math.max(0, toNumber(value)) % EGGS_PER_TABLET });
const readyForSale = (lot = {}) => { const status = lower(`${lot.status || ''} ${lot.statut || ''} ${lot.phase || ''}`); return /pret|prêt|ready|vendu|vente|reforme|réforme/.test(status) || Boolean(lot.pret_vente_recommande || lot.pret_vente_confirme); };
const logQty = (log = {}) => toNumber(log.quantite ?? log.quantity ?? log.qty ?? log.amount);
const logCost = (log = {}) => toNumber(log.cout_total ?? log.total_cost ?? log.montant ?? log.amount ?? log.cost ?? log.cout ?? 0);
const logDate = (row = {}) => row.date || row.created_at || row.updated_at || row.event_date || row.date_operation || row.date_commande || row.date_paiement;
const orderAmount = (order = {}) => toNumber(order.montant_total ?? order.total ?? order.amount ?? order.total_amount ?? order.ca ?? order.ca_total ?? 0);
const paymentAmount = (payment = {}) => toNumber(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount ?? 0);
const transactionAmount = (tx = {}) => toNumber(tx.montant ?? tx.amount ?? tx.total ?? tx.montant_total ?? tx.total_amount ?? tx.credit ?? tx.credit_amount ?? 0);
const paymentOrderId = (payment = {}) => String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '').trim();
const linkedLotId = (row = {}) => String(row.lot_id || row.cible_id || row.target_id || row.entity_id || row.source_id || row.source_record_id || row.related_id || row.product_id || row.article_id || '').trim();
const isCancelled = (row = {}) => ['annule', 'annulee', 'annulé', 'cancelled'].includes(lower(row.statut || row.status || row.statut_commande));
const linkedToExistingLot = (row = {}, lotIds = new Set()) => Boolean(lotIds.size && linkedLotId(row) && lotIds.has(linkedLotId(row)));

function rowText(row = {}) { return lower(`${row.module || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.activity || ''} ${row.activite || ''} ${row.type || ''} ${row.nature || ''} ${row.category || ''} ${row.categorie || ''} ${row.produit || ''} ${row.product_name || ''} ${row.product_type || ''} ${row.title || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''} ${row.nom || ''}`); }
function isIncome(row = {}) { const text = rowText(row); if (/(sortie|charge|depense|frais|cout|debit|expense|achat|aliment|soin|vaccin|maintenance)/.test(text)) return false; return /(entree|revenu|recette|vente|encaisse|client|credit|income|revenue|sale|ca\b)/.test(text); }
function isCostRow(row = {}) { const text = rowText(row); return /(sortie|charge|depense|frais|cout|debit|expense|achat|aliment|soin|vaccin|maintenance|emballage|transport|tablette|plateau|alvéole|alveole)/.test(text); }
function isPackagingRow(row = {}) { return /(emballage|tablette|plateau|alvéole|alveole|carton|conditionnement)/.test(rowText(row)); }
function matchesKeywords(row = {}, keywords = []) { const text = rowText(row); return keywords.some((keyword) => text.includes(lower(keyword))); }
function matchesActivity(row = {}, lotIds = new Set(), keywords = []) { return linkedToExistingLot(row, lotIds) || matchesKeywords(row, keywords); }
function orderMatchesActivity(order = {}, lotIds = new Set(), keywords = []) { const lotId = linkedLotId(order); if (lotId) return lotIds.has(lotId); return matchesKeywords(order, keywords); }
function financeMatchesActivity(tx = {}, lotIds = new Set(), keywords = []) { const lotId = linkedLotId(tx); if (lotId) return lotIds.has(lotId); return matchesKeywords(tx, keywords) || rowText(tx).includes('avicole'); }
function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), charges_aliments: 0, charges_soins: 0, charges_autres: 0, charges_emballages: 0, ca: 0, encaisse: 0, marge: 0, poids_moyen: 0, taux_mortalite: 0, effectif: 0, morts: 0, malades: 0, vendus: 0, prets: 0, oeufs: 0, vendables: 0, casses: 0, tablettes: 0, reliquat_oeufs: 0, taux_ponte: 0, taux_casse: 0, pondeuses: 0, dates: new Set(), sales_real: 0, cost_incomplete: false, cost_rows: 0 }); return map.get(key); }
function SmallMetric({ label, value, hint, danger = false }) { return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-xs text-[#8a7456] mt-1">{hint}</p> : null}</div>; }

function addRealSalesToMonthly({ map, salesOrders = [], payments = [], transactions = [], lotIds = new Set(), keywords = [] }) {
  const realOrders = arr(salesOrders).filter((order) => !isCancelled(order) && orderMatchesActivity(order, lotIds, keywords));
  const orderIds = new Set(realOrders.map((order) => String(order.id || '')).filter(Boolean));
  realOrders.forEach((order) => { const amount = orderAmount(order); const bucket = ensure(map, monthKey(logDate(order))); bucket.ca += amount; bucket.sales_real += amount; });
  arr(payments).forEach((payment) => { const orderId = paymentOrderId(payment); const lotLinked = linkedToExistingLot(payment, lotIds); const textLinked = matchesKeywords(payment, keywords) || rowText(payment).includes('avicole'); if (!orderIds.has(orderId) && !lotLinked && !textLinked) return; const bucket = ensure(map, monthKey(logDate(payment))); bucket.encaisse += paymentAmount(payment); });
  arr(transactions).forEach((tx) => { if (!isIncome(tx) || !financeMatchesActivity(tx, lotIds, keywords)) return; const amount = transactionAmount(tx); if (amount <= 0) return; const bucket = ensure(map, monthKey(logDate(tx))); bucket.ca += amount; bucket.encaisse += amount; bucket.sales_real += amount; });
}

function addRealCostsToMonthly({ map, rows = [], lotIds = new Set(), keywords = [] }) {
  arr(rows).forEach((row) => {
    if (!matchesActivity(row, lotIds, keywords) || !isCostRow(row)) return;
    const amount = logCost(row) || logQty(row) * toNumber(row.prix_unitaire ?? row.unit_price ?? row.price ?? 0);
    if (amount <= 0) return;
    const bucket = ensure(map, monthKey(logDate(row)));
    const text = rowText(row);
    if (/aliment|provende|feed|ration|mais|son|tourteau/.test(text)) bucket.charges_aliments += amount;
    else if (/sante|soin|vaccin|traitement|veto|veterinaire|biosecurite/.test(text)) bucket.charges_soins += amount;
    else if (isPackagingRow(row)) bucket.charges_emballages += amount;
    else bucket.charges_autres += amount;
    bucket.cost_rows += 1;
  });
}

function realCostOfDetail(detail = {}) { return toNumber(detail.purchaseCost) + toNumber(detail.realFeedCost) + toNumber(detail.healthCost) + toNumber(detail.otherDirectCost); }
function packagingUnitCost(totalPackaging = 0, tabletCount = 0) { return tabletCount > 0 ? toNumber(totalPackaging) / tabletCount : 0; }

function buildChairMonthly({ rows = [], alimentationLogs = [], businessEvents = [], salesOrders = [], payments = [], transactions = [] }) {
  const chair = filterLotsByActivity(rows, 'Chair');
  const chairIds = new Set(chair.map((lot) => String(lot.id)));
  if (!chairIds.size) return [];
  const map = new Map();
  chair.forEach((lot) => { const bucket = ensure(map, monthKey(lot.date_sortie || lot.sale_date || lot.date_vente || lot.updated_at || lot.created_at || new Date())); const effective = followedChairCount(lot); bucket.effectif += effective; bucket.morts += deadCount(lot); bucket.malades += sickCount(lot); bucket.vendus += soldOrExitedCount(lot); bucket.prets += readyForSale(lot) ? 1 : 0; bucket.poids_total = toNumber(bucket.poids_total) + avgWeight(lot); bucket.poids_count = toNumber(bucket.poids_count) + (avgWeight(lot) > 0 ? 1 : 0); bucket.taux_mortalite = lotInitial(lot) > 0 ? (bucket.morts / lotInitial(lot)) * 100 : 0; });
  addRealCostsToMonthly({ map, rows: alimentationLogs, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole', 'aliment'] });
  addRealCostsToMonthly({ map, rows: businessEvents, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole', 'sante', 'charge'] });
  addRealCostsToMonthly({ map, rows: transactions, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole', 'aliment', 'sante'] });
  addRealSalesToMonthly({ map, salesOrders, payments, transactions, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole'] });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => { const poids = row.poids_count ? row.poids_total / row.poids_count : 0; const charges = row.charges_aliments + row.charges_soins + row.charges_autres + row.charges_emballages; return { ...row, poids_moyen: Number(poids.toFixed(2)), marge: Number((row.ca - charges).toFixed(0)), cost_incomplete: charges <= 0 && row.effectif > 0, taux_mortalite: Number(row.taux_mortalite.toFixed(1)) }; });
}

function buildPonteMonthly({ rows = [], productionLogs = [], alimentationLogs = [], businessEvents = [], salesOrders = [], payments = [], transactions = [], pondeuseCosts = null }) {
  const pondeuses = filterLotsByActivity(rows, 'Pondeuse');
  const pondeuseIds = new Set(pondeuses.map((lot) => String(lot.id)));
  if (!pondeuseIds.size) return [];
  const activePondeuses = pondeuses.reduce((sum, lot) => sum + activeCount(lot), 0);
  const map = new Map();
  arr(productionLogs).forEach((log) => { if (!matchesActivity(log, pondeuseIds, ['oeuf', 'ponte', 'pondeuse'])) return; const produced = eggs(log); const casse = broken(log); if (produced <= 0 && casse <= 0) return; const sellable = Math.max(0, produced - casse); const tablet = tabletsFromEggs(sellable); const bucket = ensure(map, monthKey(logDate(log))); bucket.oeufs += produced; bucket.casses += casse; bucket.vendables += sellable; bucket.tablettes += tablet.tablets; bucket.pondeuses = activePondeuses; if (log.date) bucket.dates.add(String(log.date)); });
  addRealCostsToMonthly({ map, rows: alimentationLogs, lotIds: pondeuseIds, keywords: ['pondeuse', 'ponte', 'oeuf', 'avicole', 'aliment'] });
  addRealCostsToMonthly({ map, rows: businessEvents, lotIds: pondeuseIds, keywords: ['pondeuse', 'ponte', 'oeuf', 'avicole', 'sante', 'charge', 'emballage', 'tablette', 'plateau', 'alvéole'] });
  addRealCostsToMonthly({ map, rows: transactions, lotIds: pondeuseIds, keywords: ['pondeuse', 'ponte', 'oeuf', 'avicole', 'aliment', 'sante', 'emballage', 'tablette', 'plateau', 'alvéole'] });
  addRealSalesToMonthly({ map, salesOrders, payments, transactions, lotIds: pondeuseIds, keywords: ['oeuf', 'ponte', 'pondeuse', 'tablette', 'plateau', 'avicole'] });
  const cumulativeCost = toNumber(pondeuseCosts?.totalRealCost);
  const cumulativePackaging = toNumber(pondeuseCosts?.packagingCost);
  const cumulativeSellable = toNumber(pondeuseCosts?.sellableEggs);
  const cumulativeTablets = tabletsFromEggs(cumulativeSellable).tablets;
  const costPerEggCumulative = cumulativeCost > 0 && cumulativeSellable > 0 ? cumulativeCost / cumulativeSellable : 0;
  const costPerTabletPackaging = packagingUnitCost(cumulativePackaging, cumulativeTablets);
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => { const days = Math.max(1, row.dates?.size || 1); const monthlyCharges = row.charges_aliments + row.charges_soins + row.charges_autres + row.charges_emballages; const tablet = tabletsFromEggs(row.vendables); const imputedCost = row.vendables > 0 && costPerEggCumulative > 0 ? row.vendables * costPerEggCumulative : 0; const charges = monthlyCharges > 0 ? monthlyCharges : imputedCost; const packagingForMonth = row.charges_emballages || (tablet.tablets > 0 ? tablet.tablets * costPerTabletPackaging : 0); const productionOnlyCost = Math.max(0, charges - packagingForMonth); const costPerEgg = row.vendables > 0 && charges > 0 ? charges / row.vendables : 0; const costPerTablet = costPerEgg > 0 ? (costPerEgg * EGGS_PER_TABLET) + costPerTabletPackaging : 0; return { ...row, charges_aliments: monthlyCharges > 0 ? row.charges_aliments : productionOnlyCost, charges_soins: monthlyCharges > 0 ? row.charges_soins : 0, charges_autres: monthlyCharges > 0 ? row.charges_autres : 0, charges_emballages: packagingForMonth, tablettes: row.tablettes || tablet.tablets, reliquat_oeufs: tablet.remaining, pondeuses: activePondeuses, taux_ponte: activePondeuses > 0 ? Number(((row.oeufs / (activePondeuses * days)) * 100).toFixed(1)) : 0, taux_casse: row.oeufs > 0 ? Number(((row.casses / row.oeufs) * 100).toFixed(1)) : 0, cout_oeuf: costPerEgg, cout_tablette: costPerTablet, cost_incomplete: row.vendables > 0 && charges <= 0, marge: Number((row.ca - charges).toFixed(0)) }; });
}

const values = (rows, key) => rows.map((row) => toNumber(row[key]));
const labels = (rows) => rows.map((row) => row.mois);
function average(list, key) { const valuesList = arr(list).map((row) => toNumber(row[key])).filter((value) => value > 0); return valuesList.length ? valuesList.reduce((sum, value) => sum + value, 0) / valuesList.length : 0; }
function costLabel(value, incomplete) { return incomplete ? 'Coût incomplet' : fmtCurrency(value); }

export default function AvicoleEvolution({ rows = [], productionLogs = [], alimentationLogs = [], businessEvents = [], salesOrders = [], payments = [], transactions = [], onNavigate }) {
  const activeRows = arr(rows).filter((row) => row?.id);
  const activeLotIds = new Set(activeRows.map((row) => String(row.id)));
  const chairRows = filterLotsByActivity(activeRows, 'Chair');
  const ponteRows = filterLotsByActivity(activeRows, 'Pondeuse');
  const showChair = chairRows.length > 0;
  const showPonte = ponteRows.length > 0;
  const linkedAlimentationLogs = arr(alimentationLogs).filter((log) => matchesActivity(log, activeLotIds, ['avicole', 'aliment', 'ponte', 'pondeuse', 'chair', 'poulet']));
  const linkedBusinessEvents = arr(businessEvents).filter((event) => matchesActivity(event, activeLotIds, ['avicole', 'sante', 'charge', 'chair', 'poulet', 'ponte', 'pondeuse', 'oeuf', 'emballage', 'tablette', 'plateau', 'alvéole']));
  const costs = summarizeAvicoleCosts({ rows: activeRows, alimentationLogs: linkedAlimentationLogs, productionLogs, slaughterEvents: linkedBusinessEvents, directCharges: linkedBusinessEvents, healthEvents: linkedBusinessEvents, defaultPricePerKg: 0 });
  const pondeuseCostDetails = costs.details.filter((item) => item.type === 'ponte');
  const pondeuseCosts = { totalRealCost: pondeuseCostDetails.reduce((sum, item) => sum + realCostOfDetail(item), 0), packagingCost: [...linkedBusinessEvents, ...arr(transactions)].filter((row) => matchesActivity(row, new Set(ponteRows.map((lot) => String(lot.id))), ['pondeuse', 'ponte', 'oeuf', 'emballage', 'tablette', 'plateau', 'alvéole']) && isPackagingRow(row)).reduce((sum, row) => sum + (logCost(row) || logQty(row) * toNumber(row.prix_unitaire ?? row.unit_price ?? row.price ?? 0)), 0), sellableEggs: pondeuseCostDetails.reduce((sum, item) => sum + toNumber(item.sellableEggs), 0) };
  const chair = showChair ? buildChairMonthly({ rows: activeRows, alimentationLogs: linkedAlimentationLogs, businessEvents: linkedBusinessEvents, salesOrders, payments, transactions }) : [];
  const ponte = showPonte ? buildPonteMonthly({ rows: activeRows, productionLogs, alimentationLogs: linkedAlimentationLogs, businessEvents: linkedBusinessEvents, salesOrders, payments, transactions, pondeuseCosts }) : [];
  const lastChair = [...chair].reverse().find((row) => row.effectif || row.ca || row.poids_moyen) || chair[chair.length - 1] || {};
  const lastPonte = [...ponte].reverse().find((row) => row.pondeuses || row.oeufs || row.vendables) || ponte[ponte.length - 1] || {};
  const readyLots = chair.reduce((sum, row) => sum + row.prets, 0);
  const healthIssues = activeRows.reduce((sum, lot) => sum + deadCount(lot) + sickCount(lot), 0);
  const totalEggs = ponte.reduce((sum, row) => sum + row.oeufs, 0);
  const totalSellable = ponte.reduce((sum, row) => sum + row.vendables, 0);
  const totalTabletsData = tabletsFromEggs(totalSellable);
  const totalSalesReal = [...chair, ...ponte].reduce((sum, row) => sum + toNumber(row.sales_real), 0);
  const totalEncaisse = [...chair, ...ponte].reduce((sum, row) => sum + toNumber(row.encaisse), 0);
  const totalRealCharges = [...chair, ...ponte].reduce((sum, row) => sum + row.charges_aliments + row.charges_soins + row.charges_autres + row.charges_emballages, 0);
  const totalPackaging = ponte.reduce((sum, row) => sum + toNumber(row.charges_emballages), 0);
  const costIncomplete = [...chair, ...ponte].some((row) => row.cost_incomplete);
  const priority = !activeRows.length ? null : costIncomplete ? { module: 'stock', label: 'Compléter les coûts réels' } : healthIssues > 0 ? { module: 'sante', label: 'Traiter santé avicole' } : readyLots > 0 ? { module: 'ventes', label: 'Confirmer les ventes chair' } : { module: 'avicole', label: showPonte ? 'Mettre à jour pontes' : 'Mettre à jour pesées chair' };
  const avgChairCostLive = average(costs.details.filter((item) => item.type === 'chair' && realCostOfDetail(item) > 0), 'costPerLiveSubject');
  const avgPonteCostEgg = average(ponte, 'cout_oeuf');
  const avgPonteCostTablet = average(ponte, 'cout_tablette');

  if (!activeRows.length) return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucun lot avicole dans cette vue.</div>;

  return <div className="space-y-5">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="font-black text-[#2f2415]">Synthèse unique {showPonte && !showChair ? 'pondeuses' : showChair && !showPonte ? 'chair' : 'avicole'}</p><p className="text-xs text-[#8a7456] mt-1">Une seule lecture : effectifs, coûts réels, production/ventes, santé, marge et graphes associés.</p></div>{priority ? <button type="button" onClick={() => onNavigate?.(priority.module)} className="inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white"><ShoppingBag size={15} />{priority.label}</button> : null}</div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">{showChair ? <><SmallMetric label="Effectif chair" value={fmtNumber(lastChair.effectif || 0)} hint="actif ou vendu suivi" /><SmallMetric label="Poids moyen" value={`${Number(lastChair.poids_moyen || 0).toFixed(2)} kg`} /><SmallMetric label="Morts / malades" value={`${fmtNumber(lastChair.morts || 0)} / ${fmtNumber(lastChair.malades || 0)}`} danger={(lastChair.morts || lastChair.malades) > 0} /><SmallMetric label="Vendus / sorties" value={fmtNumber(lastChair.vendus || 0)} /><SmallMetric label="Coût sujet" value={costLabel(avgChairCostLive, !avgChairCostLive && chair.length)} danger={!avgChairCostLive && chair.length} /><SmallMetric label="Marge chair" value={fmtCurrency(chair.reduce((sum, row) => sum + row.marge, 0))} hint="CA réel - coûts réels" /></> : null}{showPonte ? <><SmallMetric label="Pondeuses" value={fmtNumber(lastPonte.pondeuses || 0)} hint="actives" /><SmallMetric label="Œufs produits" value={fmtNumber(totalEggs)} hint={`${fmtNumber(tabletsFromEggs(totalEggs).tablets)} tablette(s) + ${fmtNumber(tabletsFromEggs(totalEggs).remaining)} œuf(s)`} /><SmallMetric label="Œufs vendables" value={fmtNumber(totalSellable)} hint={`${fmtNumber(totalTabletsData.tablets)} tablette(s) + ${fmtNumber(totalTabletsData.remaining)} œuf(s)`} /><SmallMetric label="Coût / œuf" value={costLabel(avgPonteCostEgg, !avgPonteCostEgg && totalSellable > 0)} danger={!avgPonteCostEgg && totalSellable > 0} /><SmallMetric label="Coût / tablette" value={costLabel(avgPonteCostTablet, !avgPonteCostTablet && totalSellable > 0)} hint={totalPackaging > 0 ? 'œufs + emballage' : 'œufs seulement'} danger={!avgPonteCostTablet && totalSellable > 0} /><SmallMetric label="Marge ponte" value={fmtCurrency(ponte.reduce((sum, row) => sum + row.marge, 0))} hint="CA réel - coûts réels" /></> : null}</div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><SmallMetric label="Charges réelles" value={fmtCurrency(totalRealCharges)} hint="aliment + santé + autres + emballages" danger={costIncomplete} /><SmallMetric label="Emballages" value={fmtCurrency(totalPackaging)} hint="tablettes / plateaux" /><SmallMetric label="CA réel" value={fmtCurrency(totalSalesReal)} hint={totalSalesReal ? 'ventes/finances liées' : 'aucune vente liée'} /><SmallMetric label="Encaissé" value={fmtCurrency(totalEncaisse)} hint="paiements/finances liés" /></div>
      {costIncomplete ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Coût incomplet : des productions existent mais aucun coût réel lié n’a été trouvé. Compléter stock, achats, santé, charges, emballages/tablettes ou transport.</div> : null}
    </div>

    {showChair ? <><SmartEvolutionChart title="Chair — économie mensuelle" subtitle="Charges réelles, CA réel, encaissé, marge et poids moyen." months={labels(chair)} leftUnit="FCFA" rightUnit="kg" series={[{ name: 'Charges aliments', type: 'bar', unit: 'FCFA', data: values(chair, 'charges_aliments') }, { name: 'Charges santé/autres', type: 'bar', unit: 'FCFA', data: chair.map((row) => row.charges_soins + row.charges_autres + row.charges_emballages) }, { name: 'CA ventes chair', type: 'bar', unit: 'FCFA', data: values(chair, 'ca') }, { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: values(chair, 'encaisse') }, { name: 'Marge chair', type: 'bar', unit: 'FCFA', data: values(chair, 'marge') }, { name: 'Poids moyen', type: 'line', axis: 'right', unit: 'kg', data: values(chair, 'poids_moyen') }]} /><SmartEvolutionChart title="Chair — effectifs" subtitle="Effectif, morts, malades, vendus et taux de mortalité." months={labels(chair)} leftUnit="" rightUnit="%" series={[{ name: 'Effectif suivi', type: 'bar', data: values(chair, 'effectif') }, { name: 'Morts', type: 'bar', data: values(chair, 'morts') }, { name: 'Malades', type: 'bar', data: values(chair, 'malades') }, { name: 'Vendus / sorties', type: 'bar', data: values(chair, 'vendus') }, { name: 'Taux mortalité', type: 'line', axis: 'right', unit: '%', data: values(chair, 'taux_mortalite') }]} /></> : null}
    {showPonte ? <><SmartEvolutionChart title="Ponte — économie mensuelle" subtitle="Charges réelles, CA tablettes, encaissé, marge, taux de ponte et casse." months={labels(ponte)} leftUnit="FCFA" rightUnit="%" series={[{ name: 'Charges aliments ponte', type: 'bar', unit: 'FCFA', data: values(ponte, 'charges_aliments') }, { name: 'Charges santé/autres', type: 'bar', unit: 'FCFA', data: ponte.map((row) => row.charges_soins + row.charges_autres) }, { name: 'Emballages tablettes', type: 'bar', unit: 'FCFA', data: values(ponte, 'charges_emballages') }, { name: 'CA tablettes', type: 'bar', unit: 'FCFA', data: values(ponte, 'ca') }, { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: values(ponte, 'encaisse') }, { name: 'Marge ponte', type: 'bar', unit: 'FCFA', data: values(ponte, 'marge') }, { name: 'Taux ponte', type: 'line', axis: 'right', unit: '%', data: values(ponte, 'taux_ponte') }, { name: 'Taux casse', type: 'line', axis: 'right', unit: '%', data: values(ponte, 'taux_casse') }]} /><SmartEvolutionChart title="Ponte — production mensuelle" subtitle="Œufs produits, vendables, tablettes, casses et effectif pondeuses." months={labels(ponte)} leftUnit="" rightUnit="%" series={[{ name: 'Œufs produits', type: 'bar', data: values(ponte, 'oeufs') }, { name: 'Œufs vendables', type: 'bar', data: values(ponte, 'vendables') }, { name: 'Tablettes vendables', type: 'bar', data: values(ponte, 'tablettes') }, { name: 'Casses', type: 'bar', data: values(ponte, 'casses') }, { name: 'Pondeuses actives', type: 'line', data: values(ponte, 'pondeuses') }, { name: 'Taux ponte', type: 'line', axis: 'right', unit: '%', data: values(ponte, 'taux_ponte') }]} /></> : null}
    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {costIncomplete ? 'Des coûts réels manquent : pas d’estimation automatique, la marge reste à compléter.' : totalSalesReal > 0 ? 'Les graphes utilisent les commandes, paiements ou revenus Finance réellement liés aux lots avicoles.' : healthIssues > 0 ? `${fmtNumber(healthIssues)} point(s) santé/mortalité à traiter.` : showChair && readyLots > 0 ? `${fmtNumber(readyLots)} lot(s) chair à convertir en ventes.` : showPonte ? `Vue pondeuses : suivre pontes, casses, coûts réels, tablettes (${fmtNumber(totalTabletsData.tablets)} complètes) et marge.` : 'Compléter les coûts et ventes liées pour affiner les marges.'}</div></div>
  </div>;
}
