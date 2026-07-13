import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount, avicoleDeadCount, avicoleSickCount } from '../utils/avicoleMetrics';
import { summarizeUnifiedFarmCosts } from '../services/unifiedCostService.js';

const EGGS_PER_TABLET = 30;
const DEFAULT_LAYING_DAYS = 540;
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
function isCostRow(row = {}) { const text = rowText(row); return /(sortie|charge|depense|frais|cout|debit|expense|achat|aliment|soin|vaccin|maintenance|emballage|transport|tablette|plateau|alvéole|alveole|eau|electricite|électricité|chauffage|litiere|litière|gaz|charbon|copeaux|nettoyage|desinfection|désinfection)/.test(text); }
function isPackagingRow(row = {}) { return /(emballage|tablette|plateau|alvéole|alveole|carton|conditionnement)/.test(rowText(row)); }
function matchesKeywords(row = {}, keywords = []) { const text = rowText(row); return keywords.some((keyword) => text.includes(lower(keyword))); }
function matchesActivity(row = {}, lotIds = new Set(), keywords = []) { return linkedToExistingLot(row, lotIds) || matchesKeywords(row, keywords); }
function orderMatchesActivity(order = {}, lotIds = new Set(), keywords = []) { const lotId = linkedLotId(order); if (lotId) return lotIds.has(lotId); return matchesKeywords(order, keywords); }
function financeMatchesActivity(tx = {}, lotIds = new Set(), keywords = []) { const lotId = linkedLotId(tx); if (lotId) return lotIds.has(lotId); return matchesKeywords(tx, keywords) || rowText(tx).includes('avicole'); }
function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), charges_aliments: 0, charges_soins: 0, charges_autres: 0, charges_emballages: 0, ca: 0, encaisse: 0, marge: 0, poids_moyen: 0, taux_mortalite: 0, effectif: 0, morts: 0, malades: 0, vendus: 0, vendables: 0, prets: 0, oeufs: 0, vendables_oeufs: 0, casses: 0, tablettes: 0, reliquat_oeufs: 0, taux_ponte: 0, taux_casse: 0, pondeuses: 0, dates: new Set(), sales_real: 0, cost_incomplete: false, cost_rows: 0 }); return map.get(key); }

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
    else if (/sante|soin|vaccin|vitamine|traitement|veto|veterinaire|biosecurite|prophylax|nettoyage|desinfection|désinfection/.test(text)) bucket.charges_soins += amount;
    else if (isPackagingRow(row)) bucket.charges_emballages += amount;
    else bucket.charges_autres += amount;
    bucket.cost_rows += 1;
  });
}
function realProductionCostOfDetail(detail = {}) { return toNumber(detail.purchaseCost) + toNumber(detail.realFeedCost) + toNumber(detail.healthCost) + toNumber(detail.otherDirectCost); }
function packagingUnitCost(totalPackaging = 0, tabletCount = 0) { return tabletCount > 0 ? toNumber(totalPackaging) / tabletCount : 0; }
function layingDaysOf(lot = {}) { return toNumber(lot.jours_ponte_prevus ?? lot.duree_ponte_jours ?? lot.laying_days ?? lot.production_days ?? lot.amortissement_jours) || DEFAULT_LAYING_DAYS; }
function purchaseCostOf(lot = {}) { return toNumber(lot.purchase_cost ?? lot.prix_achat ?? lot.cout_achat ?? lot.cout_total_achat ?? lot.cout_sujets ?? lot.achat_sujets ?? lot.cost_purchase ?? lot.cout_total ?? lot.cost); }
function buildPondeuseCostContext({ lots = [], costDetails = [], packagingCost = 0, sellableEggs = 0 }) {
  const activeBirds = lots.reduce((sum, lot) => sum + activeCount(lot), 0);
  const totalPurchase = costDetails.reduce((sum, item) => sum + toNumber(item.purchaseCost), 0) || lots.reduce((sum, lot) => sum + purchaseCostOf(lot), 0);
  const totalFeed = costDetails.reduce((sum, item) => sum + toNumber(item.realFeedCost), 0);
  const totalHealth = costDetails.reduce((sum, item) => sum + toNumber(item.healthCost), 0);
  const totalOther = costDetails.reduce((sum, item) => sum + toNumber(item.otherDirectCost), 0);
  const totalLayingDays = lots.reduce((sum, lot) => sum + Math.max(1, activeCount(lot) || lotInitial(lot)) * layingDaysOf(lot), 0);
  const amortizationPerHenDay = totalLayingDays > 0 ? totalPurchase / totalLayingDays : 0;
  const observedDays = Math.max(1, Math.min(30, Math.ceil(toNumber(sellableEggs) / Math.max(1, activeBirds))) || 30);
  const currentHenDays = Math.max(1, activeBirds * observedDays);
  const operatingPerHenDay = currentHenDays > 0 ? (totalFeed + totalHealth + totalOther) / currentHenDays : 0;
  const productionPerHenDay = amortizationPerHenDay + operatingPerHenDay;
  const layingRate = activeBirds > 0 && observedDays > 0 ? Math.min(1.5, Math.max(0, toNumber(sellableEggs) / (activeBirds * observedDays))) : 0;
  const costPerEggByRate = layingRate > 0 ? productionPerHenDay / layingRate : 0;
  const tablets = tabletsFromEggs(sellableEggs).tablets;
  const packagingPerTablet = packagingUnitCost(packagingCost, tablets);
  return { activeBirds, productionCost: totalPurchase + totalFeed + totalHealth + totalOther, packagingCost, sellableEggs, layingRate, costPerEggByRate, packagingPerTablet };
}
function buildChairCostMap(costDetails = []) {
  const map = new Map();
  arr(costDetails).filter((item) => item.type === 'chair').forEach((item) => map.set(String(item.lotId), item));
  return map;
}
function buildChairMonthly({ rows = [], alimentationLogs = [], businessEvents = [], salesOrders = [], payments = [], transactions = [], chairCostDetails = [] }) {
  const chair = filterLotsByActivity(rows, 'Chair');
  const chairIds = new Set(chair.map((lot) => String(lot.id)));
  const costMap = buildChairCostMap(chairCostDetails);
  if (!chairIds.size) return [];
  const map = new Map();
  chair.forEach((lot) => {
    const bucket = ensure(map, monthKey(lot.date_sortie || lot.sale_date || lot.date_vente || lot.updated_at || lot.created_at || new Date()));
    const detail = costMap.get(String(lot.id));
    const effective = followedChairCount(lot);
    const sellable = toNumber(detail?.sellableSubjects ?? detail?.producedSubjects ?? effective);
    const bandCost = realProductionCostOfDetail(detail);
    bucket.effectif += effective;
    bucket.vendables += sellable;
    bucket.morts += deadCount(lot);
    bucket.malades += sickCount(lot);
    bucket.vendus += soldOrExitedCount(lot);
    bucket.prets += readyForSale(lot) ? 1 : 0;
    bucket.band_cost = toNumber(bucket.band_cost) + bandCost;
    bucket.poids_total = toNumber(bucket.poids_total) + avgWeight(lot);
    bucket.poids_count = toNumber(bucket.poids_count) + (avgWeight(lot) > 0 ? 1 : 0);
    bucket.taux_mortalite = lotInitial(lot) > 0 ? (bucket.morts / lotInitial(lot)) * 100 : 0;
  });
  addRealCostsToMonthly({ map, rows: alimentationLogs, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole', 'aliment'] });
  addRealCostsToMonthly({ map, rows: businessEvents, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole', 'sante', 'charge', 'chauffage', 'litiere', 'litière', 'gaz', 'charbon', 'nettoyage'] });
  addRealCostsToMonthly({ map, rows: transactions, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole', 'aliment', 'sante', 'chauffage', 'litiere', 'litière', 'gaz', 'charbon'] });
  addRealSalesToMonthly({ map, salesOrders, payments, transactions, lotIds: chairIds, keywords: ['chair', 'poulet', 'broiler', 'avicole'] });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const poids = row.poids_count ? row.poids_total / row.poids_count : 0;
    const loggedCharges = row.charges_aliments + row.charges_soins + row.charges_autres + row.charges_emballages;
    const charges = row.band_cost > 0 ? row.band_cost : loggedCharges;
    return { ...row, charges_aliments: charges, charges_soins: 0, charges_autres: 0, charges_emballages: 0, cout_poulet: row.vendables > 0 && charges > 0 ? charges / row.vendables : 0, poids_moyen: Number(poids.toFixed(2)), marge: Number((row.ca - charges).toFixed(0)), cost_incomplete: charges <= 0 && row.effectif > 0, taux_mortalite: Number(row.taux_mortalite.toFixed(1)) };
  });
}
function buildPonteMonthly({ rows = [], productionLogs = [], alimentationLogs = [], businessEvents = [], salesOrders = [], payments = [], transactions = [], pondeuseCosts = null }) {
  const pondeuses = filterLotsByActivity(rows, 'Pondeuse');
  const pondeuseIds = new Set(pondeuses.map((lot) => String(lot.id)));
  if (!pondeuseIds.size) return [];
  const activePondeuses = pondeuses.reduce((sum, lot) => sum + activeCount(lot), 0);
  const map = new Map();
  arr(productionLogs).forEach((log) => { if (!matchesActivity(log, pondeuseIds, ['oeuf', 'ponte', 'pondeuse'])) return; const produced = eggs(log); const casse = broken(log); if (produced <= 0 && casse <= 0) return; const sellable = Math.max(0, produced - casse); const tablet = tabletsFromEggs(sellable); const bucket = ensure(map, monthKey(logDate(log))); bucket.oeufs += produced; bucket.casses += casse; bucket.vendables_oeufs += sellable; bucket.tablettes += tablet.tablets; bucket.pondeuses = activePondeuses; if (log.date) bucket.dates.add(String(log.date)); });
  addRealCostsToMonthly({ map, rows: alimentationLogs, lotIds: pondeuseIds, keywords: ['pondeuse', 'ponte', 'oeuf', 'avicole', 'aliment'] });
  addRealCostsToMonthly({ map, rows: businessEvents, lotIds: pondeuseIds, keywords: ['pondeuse', 'ponte', 'oeuf', 'avicole', 'sante', 'charge', 'emballage', 'tablette', 'plateau', 'alvéole'] });
  addRealCostsToMonthly({ map, rows: transactions, lotIds: pondeuseIds, keywords: ['pondeuse', 'ponte', 'oeuf', 'avicole', 'aliment', 'sante', 'emballage', 'tablette', 'plateau', 'alvéole'] });
  addRealSalesToMonthly({ map, salesOrders, payments, transactions, lotIds: pondeuseIds, keywords: ['oeuf', 'ponte', 'pondeuse', 'tablette', 'plateau', 'avicole'] });
  const costPerEggByRate = toNumber(pondeuseCosts?.costPerEggByRate);
  const packagingPerTablet = toNumber(pondeuseCosts?.packagingPerTablet);
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => { const days = Math.max(1, row.dates?.size || 1); const tablet = tabletsFromEggs(row.vendables_oeufs); const monthlyPackaging = row.charges_emballages || (tablet.tablets > 0 ? tablet.tablets * packagingPerTablet : 0); const monthlyProductionCost = row.vendables_oeufs > 0 && costPerEggByRate > 0 ? row.vendables_oeufs * costPerEggByRate : row.charges_aliments + row.charges_soins + row.charges_autres; const totalCost = monthlyProductionCost + monthlyPackaging; const costPerEgg = row.vendables_oeufs > 0 && monthlyProductionCost > 0 ? monthlyProductionCost / row.vendables_oeufs : 0; const costPerTablet = costPerEgg > 0 ? (costPerEgg * EGGS_PER_TABLET) + packagingPerTablet : 0; return { ...row, vendables: row.vendables_oeufs, charges_aliments: monthlyProductionCost, charges_soins: 0, charges_autres: 0, charges_emballages: monthlyPackaging, tablettes: row.tablettes || tablet.tablets, reliquat_oeufs: tablet.remaining, pondeuses: activePondeuses, taux_ponte: activePondeuses > 0 ? Number(((row.oeufs / (activePondeuses * days)) * 100).toFixed(1)) : 0, taux_casse: row.oeufs > 0 ? Number(((row.casses / row.oeufs) * 100).toFixed(1)) : 0, cout_oeuf: costPerEgg, cout_tablette: costPerTablet, cost_incomplete: row.vendables_oeufs > 0 && totalCost <= 0, marge: Number((row.ca - totalCost).toFixed(0)) }; });
}
const values = (rows, key) => rows.map((row) => toNumber(row[key]));
const labels = (rows) => rows.map((row) => row.mois);



export default function AvicoleEvolution({ rows = [], productionLogs = [], alimentationLogs = [], businessEvents = [], salesOrders = [], payments = [], transactions = [] }) {
  const activeRows = arr(rows).filter((row) => row?.id);
  const activeLotIds = new Set(activeRows.map((row) => String(row.id)));
  const chairRows = filterLotsByActivity(activeRows, 'Chair');
  const ponteRows = filterLotsByActivity(activeRows, 'Pondeuse');
  const ponteIds = new Set(ponteRows.map((lot) => String(lot.id)));
  const showChair = chairRows.length > 0;
  const showPonte = ponteRows.length > 0;
  const linkedAlimentationLogs = arr(alimentationLogs).filter((log) => matchesActivity(log, activeLotIds, ['avicole', 'aliment', 'ponte', 'pondeuse', 'chair', 'poulet']));
  const linkedBusinessEvents = arr(businessEvents).filter((event) => matchesActivity(event, activeLotIds, ['avicole', 'sante', 'charge', 'chair', 'poulet', 'ponte', 'pondeuse', 'oeuf', 'emballage', 'tablette', 'plateau', 'alvéole', 'chauffage', 'litiere', 'litière']));
  const costs = summarizeUnifiedFarmCosts({ lots: activeRows, alimentationLogs: linkedAlimentationLogs, productionLogs, healthEvents: linkedBusinessEvents, directCharges: linkedBusinessEvents }).avicole;
  const chairCostDetails = costs.details.filter((item) => item.type === 'chair');
  const pondeuseCostDetails = costs.details.filter((item) => item.type === 'ponte');
  const totalSellableFromLogs = arr(productionLogs).filter((log) => matchesActivity(log, ponteIds, ['oeuf', 'ponte', 'pondeuse'])).reduce((sum, log) => sum + Math.max(0, eggs(log) - broken(log)), 0);
  const packagingCost = [...linkedBusinessEvents, ...arr(transactions)].filter((row) => matchesActivity(row, ponteIds, ['pondeuse', 'ponte', 'oeuf', 'emballage', 'tablette', 'plateau', 'alvéole']) && isPackagingRow(row)).reduce((sum, row) => sum + (logCost(row) || logQty(row) * toNumber(row.prix_unitaire ?? row.unit_price ?? row.price ?? 0)), 0);
  const pondeuseCosts = buildPondeuseCostContext({ lots: ponteRows, costDetails: pondeuseCostDetails, packagingCost, sellableEggs: totalSellableFromLogs });
  const chair = showChair ? buildChairMonthly({ rows: activeRows, alimentationLogs: linkedAlimentationLogs, businessEvents: linkedBusinessEvents, salesOrders, payments, transactions, chairCostDetails }) : [];
  const ponte = showPonte ? buildPonteMonthly({ rows: activeRows, productionLogs, alimentationLogs: linkedAlimentationLogs, businessEvents: linkedBusinessEvents, salesOrders, payments, transactions, pondeuseCosts }) : [];

















  if (!activeRows.length) return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucun lot avicole — graphiques indisponibles.</div>;

  const chargePieChair = showChair ? [
    { name: 'Coût bande', value: chair.reduce((s, r) => s + toNumber(r.charges_aliments), 0) },
    { name: 'CA chair', value: chair.reduce((s, r) => s + toNumber(r.ca), 0) },
  ] : [];
  const chargePiePonte = showPonte ? [
    { name: 'Production', value: ponte.reduce((s, r) => s + toNumber(r.charges_aliments), 0) },
    { name: 'Emballages', value: ponte.reduce((s, r) => s + toNumber(r.charges_emballages), 0) },
    { name: 'CA tablettes', value: ponte.reduce((s, r) => s + toNumber(r.ca), 0) },
  ] : [];

  return (
    <ChartsGrid>
      {showChair ? <>
        <SmartEvolutionChart moduleName="Avicole" compact title="Chair — CA vs coût" subtitle="Histogramme — économie bande" months={labels(chair)} leftUnit="FCFA" rightUnit="" series={[
          { name: 'Coût bande', type: 'bar', unit: 'FCFA', data: values(chair, 'charges_aliments') },
          { name: 'CA ventes', type: 'bar', unit: 'FCFA', data: values(chair, 'ca') },
        ]} />
        <SmartEvolutionChart moduleName="Avicole" compact title="Chair — marge vs poids" subtitle="Barres + courbe — marge et poids moyen" months={labels(chair)} leftUnit="FCFA" rightUnit="kg" series={[
          { name: 'Marge', type: 'bar', unit: 'FCFA', data: values(chair, 'marge') },
          { name: 'Poids moyen', type: 'line', axis: 'right', unit: 'kg', data: values(chair, 'poids_moyen') },
        ]} />
        <SmartPieChart moduleName="Avicole" compact title="Chair — coût vs CA" subtitle="Camembert — structure bande" unit="FCFA" items={chargePieChair} />
        <SmartEvolutionChart moduleName="Avicole" compact title="Chair — effectifs vs morts" subtitle="Histogramme — suivi effectif" months={labels(chair)} leftUnit="" rightUnit="" series={[
          { name: 'Vendables', type: 'bar', data: values(chair, 'vendables') },
          { name: 'Morts', type: 'bar', data: values(chair, 'morts') },
        ]} />
        <SmartEvolutionChart moduleName="Avicole" compact title="Chair — taux mortalité" subtitle="Courbe — % pertes" months={labels(chair)} leftUnit="%" rightUnit="" series={[
          { name: 'Taux mortalité', type: 'line', unit: '%', data: values(chair, 'taux_mortalite') },
        ]} />
      </> : null}
      {showPonte ? <>
        <SmartEvolutionChart moduleName="Avicole" compact title="Ponte — CA vs coût" subtitle="Histogramme — économie mensuelle" months={labels(ponte)} leftUnit="FCFA" rightUnit="" series={[
          { name: 'Coût production', type: 'bar', unit: 'FCFA', data: values(ponte, 'charges_aliments') },
          { name: 'CA tablettes', type: 'bar', unit: 'FCFA', data: values(ponte, 'ca') },
        ]} />
        <SmartEvolutionChart moduleName="Avicole" compact title="Ponte — taux ponte vs casse" subtitle="Courbes — performance ponte" months={labels(ponte)} leftUnit="%" rightUnit="%" series={[
          { name: 'Taux ponte', type: 'line', unit: '%', data: values(ponte, 'taux_ponte') },
          { name: 'Taux casse', type: 'line', unit: '%', data: values(ponte, 'taux_casse') },
        ]} />
        <SmartPieChart moduleName="Avicole" compact title="Ponte — structure coûts" subtitle="Camembert — production / emballage / CA" unit="FCFA" items={chargePiePonte} />
        <SmartEvolutionChart moduleName="Avicole" compact title="Ponte — œufs vs tablettes" subtitle="Histogramme — production vendable" months={labels(ponte)} leftUnit="" rightUnit="" series={[
          { name: 'Œufs vendables', type: 'bar', data: values(ponte, 'vendables') },
          { name: 'Tablettes', type: 'bar', data: values(ponte, 'tablettes') },
        ]} />
        <SmartEvolutionChart moduleName="Avicole" compact title="Ponte — marge mensuelle" subtitle="Courbe — CA − charges" months={labels(ponte)} leftUnit="FCFA" rightUnit="" series={[
          { name: 'Marge ponte', type: 'line', unit: 'FCFA', data: values(ponte, 'marge') },
        ]} />
      </> : null}
    </ChartsGrid>
  );
}
