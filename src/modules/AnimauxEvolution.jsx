import { HeartPulse, Scale, ShoppingBag, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import { buildGrowthSummary } from '../utils/animalGrowth';
import { getAnimalSaleReadiness, calculateAnimalSalePricing } from '../utils/animalSalePricing';
import { summarizeAnimalCosts } from '../utils/costEngine';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const weight = (row = {}) => toNumber(row.poids ?? row.weight ?? row.current_weight ?? row.last_weight ?? row.poids_actuel);
const initialWeight = (row = {}) => toNumber(row.poids_entree ?? row.entry_weight ?? row.initial_weight ?? row.birth_weight ?? row.poids_initial);
const purchaseCost = (row = {}) => toNumber(row.purchase_cost ?? row.prix_achat ?? row.cout_achat ?? row.cout_total ?? row.cost);
const isSick = (row = {}) => ['malade', 'blesse', 'blessé', 'sous_traitement', 'a_surveiller'].includes(lower(row.health_status || row.sante_status || row.sante));
const isSold = (row = {}) => ['vendu', 'sold'].includes(lower(row.status || row.statut));
const isLoss = (row = {}) => ['mort', 'vole', 'volé', 'perdu'].includes(lower(row.status || row.statut));
const isReady = (row = {}) => Boolean(row.pret_vente_confirme || row.ready_for_sale || row.sale_ready || row.pret_a_la_vente || lower(row.status || row.statut) === 'pret_a_la_vente' || row.pret_vente_recommande || getAnimalSaleReadiness({ animal: row }).recommended);
const rowDate = (row = {}) => row.date_entree_ferme || row.date_achat || row.created_at || row.updated_at || row.naissance || row.date_naissance;
const eventDate = (row = {}) => row.date || row.created_at || row.updated_at || row.paid_at || row.payment_date || row.date_commande || row.date_operation || row.date_paiement;
const eventAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.cout ?? row.coût ?? row.cost ?? 0);
const orderAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.ca ?? row.ca_total ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const transactionAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.credit ?? row.credit_amount ?? 0);
const oppAmount = (opp = {}) => toNumber(opp.montant_estime ?? opp.estimated_amount ?? opp.valeur_estimee ?? opp.amount ?? opp.total ?? opp.ca_potentiel ?? 0);
const logQty = (log = {}) => toNumber(log.quantite ?? log.quantity ?? log.qty ?? log.amount);
const logCost = (log = {}) => toNumber(log.cout_total ?? log.total_cost ?? log.montant ?? log.amount ?? log.cost ?? log.cout ?? log.coût ?? 0);
const logDate = (row = {}) => row.date || row.created_at || row.updated_at;
const physicalIdOf = (row = {}) => row.boucle_numero || row.qr_code || row.tag || row.id;

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), charges_aliments: 0, charges_soins: 0, charges_autres: 0, ca_ventes: 0, encaisse: 0, marge: 0, taux_marge: 0, poids_total: 0, poids_count: 0, poids_moyen: 0, croissance_total: 0, croissance_count: 0, croissance_moyenne: 0, effectif: 0, malades: 0, pertes: 0, prets: 0, vendus: 0, reproduction: 0, taux_mortalite: 0 }); return map.get(key); }

function rowText(item = {}) {
  return lower(`${item.module || ''} ${item.source_module || ''} ${item.activity || ''} ${item.activite || ''} ${item.type || ''} ${item.nature || ''} ${item.category || ''} ${item.categorie || ''} ${item.espece || ''} ${item.species || ''} ${item.produit || ''} ${item.product_name || ''} ${item.product_type || ''} ${item.libelle || ''} ${item.title || ''} ${item.description || ''} ${item.notes || ''} ${item.nom || ''}`);
}
function isIncome(row = {}) {
  const text = rowText(row);
  if (/(sortie|charge|depense|dépense|frais|cout|coût|debit|débit|expense|achat|aliment|soin|vaccin|maintenance)/.test(text)) return false;
  return /(entree|entrée|revenu|recette|vente|encaisse|encaissement|client|credit|crédit|income|revenue|sale|ca\b)/.test(text);
}
function animalKeywordMatches(item = {}) {
  const text = rowText(item);
  return /(animal|animaux|bovin|bœuf|boeuf|ovin|mouton|caprin|chevre|chèvre|cheptel|embouche)/.test(text);
}
function matchAnimal(item = {}, animal = {}) {
  const id = String(animal.id || '');
  const code = String(physicalIdOf(animal) || '');
  const values = [item.animal_id, item.source_id, item.source_record_id, item.related_id, item.cible_id, item.target_id, item.entity_id, item.boucle_numero, item.qr_code, item.tag, item.product_id, item.article_id].map((v) => String(v || ''));
  if (values.some((v) => v && (v === id || v === code))) return true;
  const text = rowText(item);
  return Boolean(code && text.includes(lower(code))) || Boolean(id && text.includes(lower(id)));
}
function financeSalesForAnimal(animal = {}, transactions = []) {
  const rows = arr(transactions).filter((tx) => isIncome(tx) && (matchAnimal(tx, animal) || animalKeywordMatches(tx)));
  const total = rows.reduce((sum, tx) => sum + transactionAmount(tx), 0);
  return { rows, total };
}
function linkedSalesForAnimal(animal = {}, salesOrders = [], payments = [], transactions = []) {
  const orders = arr(salesOrders).filter((order) => !['annule', 'annulee', 'annulé', 'cancelled'].includes(lower(order.statut || order.status)) && matchAnimal(order, animal));
  const totalOrders = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  const orderIds = orders.map((order) => String(order.id || '')).filter(Boolean);
  const paidOrders = arr(payments).filter((payment) => orderIds.includes(String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '')) || matchAnimal(payment, animal)).reduce((sum, payment) => sum + paymentAmount(payment), 0);
  const finance = totalOrders > 0 ? { rows: [], total: 0 } : financeSalesForAnimal(animal, transactions);
  const total = totalOrders + finance.total;
  const paid = paidOrders + finance.total;
  return { orders, financeRows: finance.rows, total, paid, remaining: Math.max(0, total - paid) };
}

function animalSaleValue(animal, salesOrders = [], payments = [], transactions = []) {
  const linked = linkedSalesForAnimal(animal, salesOrders, payments, transactions);
  if (linked.total > 0) return linked.total;
  const pricing = calculateAnimalSalePricing({ animal, metrics: { totalCost: purchaseCost(animal) } });
  return toNumber(animal.prix_vente_reel ?? animal.sale_price ?? animal.prix_vente ?? pricing.recommendedSalePrice ?? animal.prix_vente_estime_auto ?? animal.prix_vente_estime ?? 0);
}

function animalDirectCost(animal = {}, alimentationLogs = [], vaccins = [], businessEvents = []) {
  const directAchat = purchaseCost(animal);
  const directFeed = toNumber(animal.alimentation ?? animal.cout_alimentation ?? animal.feed_cost ?? animal.cout_nourriture);
  const linkedFeed = arr(alimentationLogs).filter((log) => matchAnimal(log, animal)).reduce((sum, log) => sum + (logCost(log) || logQty(log) * toNumber(log.prix_unitaire ?? log.unit_price ?? 0)), 0);
  const directHealth = toNumber(animal.sante ?? animal.cout_sante ?? animal.health_cost ?? animal.vet_cost);
  const linkedHealth = arr(vaccins).filter((event) => matchAnimal(event, animal)).reduce((sum, event) => sum + eventAmount(event), 0);
  const directOther = toNumber(animal.autres_frais ?? animal.frais_directs ?? animal.other_costs ?? animal.direct_costs);
  const events = arr(businessEvents).filter((event) => matchAnimal(event, animal)).reduce((sum, event) => sum + eventAmount(event), 0);
  const totalDirect = toNumber(animal.cout_total ?? animal.total_cost ?? animal.cost_total);
  const calc = directAchat + directFeed + linkedFeed + directHealth + linkedHealth + directOther + events;
  return { achat: directAchat, feed: directFeed + linkedFeed, health: directHealth + linkedHealth, other: directOther + events, total: totalDirect > 0 ? Math.max(totalDirect, calc) : calc };
}

function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}
function Header({ priority, onNavigate }) { const PriorityIcon = priority.icon; return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><TrendingUp size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution Animaux interactive</p><p className="text-xs text-[#8a7456] mt-1">Lecture mensuelle : charges, ventes, marge, poids, croissance, mortalité, coût par animal et coût par kg.</p></div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button></div></div>; }

function buildMonthly({ rows = [], alimentationLogs = [], vaccins = [], opportunities = [], businessEvents = [], salesOrders = [], payments = [], transactions = [] }) {
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
    const costs = animalDirectCost(animal, alimentationLogs, vaccins, businessEvents);
    bucket.charges_aliments += costs.feed;
    bucket.charges_soins += costs.health;
    bucket.charges_autres += costs.achat + costs.other;
    const linked = linkedSalesForAnimal(animal, salesOrders, payments, transactions);
    if (isSold(animal) || linked.total > 0) {
      bucket.ca_ventes += animalSaleValue(animal, salesOrders, payments, transactions);
      bucket.encaisse += linked.paid;
    }
  });
  arr(alimentationLogs).forEach((log) => {
    if (animals.some((animal) => matchAnimal(log, animal))) return;
    const bucket = ensure(map, monthKey(logDate(log)));
    bucket.charges_aliments += logCost(log) || logQty(log) * toNumber(log.prix_unitaire ?? log.unit_price ?? 0);
  });
  arr(vaccins).forEach((event) => {
    if (animals.some((animal) => matchAnimal(event, animal))) return;
    const target = lower(`${event.target_type || ''} ${event.espece || ''} ${event.module || ''}`);
    const looksAnimal = !target || target.includes('animal') || target.includes('bovin') || target.includes('ovin') || target.includes('caprin');
    if (!looksAnimal) return;
    ensure(map, monthKey(eventDate(event))).charges_soins += eventAmount(event) || toNumber(event.cout_total ?? event.cost ?? event.prix ?? 0);
  });
  arr(opportunities).forEach((opp) => {
    const source = lower(`${opp.source_module || ''} ${opp.created_from || ''} ${opp.type || ''} ${opp.title || ''}`);
    if (!source.includes('animaux') && !source.includes('animal')) return;
    ensure(map, monthKey(opp.created_at || opp.updated_at || opp.date)).ca_ventes += oppAmount(opp);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const poids = row.poids_count ? row.poids_total / row.poids_count : 0;
    const croissance = row.croissance_count ? row.croissance_total / row.croissance_count : 0;
    const marge = row.ca_ventes - row.charges_aliments - row.charges_soins - row.charges_autres;
    const base = Math.max(1, row.effectif + row.pertes);
    return { ...row, charges_total: row.charges_aliments + row.charges_soins + row.charges_autres, poids_moyen: Number(poids.toFixed(2)), croissance_moyenne: Number(croissance.toFixed(2)), marge: Number(marge.toFixed(0)), taux_marge: row.ca_ventes > 0 ? Number(((marge / row.ca_ventes) * 100).toFixed(1)) : 0, taux_mortalite: Number(((row.pertes / base) * 100).toFixed(1)) };
  });
}
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }
function labels(rows) { return rows.map((row) => row.mois); }

export default function AnimauxEvolution({ rows = [], alimentationLogs = [], vaccins = [], opportunities = [], businessEvents = [], salesOrders = [], payments = [], transactions = [], onNavigate }) {
  const animals = arr(rows);
  const costSummary = summarizeAnimalCosts({ rows: animals, alimentationLogs, vaccins, slaughterEvents: businessEvents });
  const directDetails = animals.map((animal) => animalDirectCost(animal, alimentationLogs, vaccins, businessEvents));
  const totalDirectCost = directDetails.reduce((sum, item) => sum + item.total, 0);
  const totalFeed = directDetails.reduce((sum, item) => sum + item.feed, 0);
  const totalHealth = directDetails.reduce((sum, item) => sum + item.health, 0);
  const realCostAnimals = directDetails.filter((item) => item.total > 0).length;
  const avgCost = animals.length ? totalDirectCost / animals.length : 0;
  const avgCostPerKg = animals.filter((animal) => weight(animal) > 0).reduce((sum, animal) => sum + (animalDirectCost(animal, alimentationLogs, vaccins, businessEvents).total / Math.max(1, weight(animal))), 0) / Math.max(1, animals.filter((animal) => weight(animal) > 0).length);
  const monthly = buildMonthly({ rows, alimentationLogs, vaccins, opportunities, businessEvents, salesOrders, payments, transactions });
  const active = animals.filter(isActiveAnimalForFeeding).length;
  const sick = animals.filter(isSick).length;
  const ready = animals.filter(isReady).length;
  const sold = animals.filter(isSold).length;
  const losses = animals.filter(isLoss).length;
  const slowGrowth = animals.filter((animal) => ['croissance_lente', 'perte_poids'].includes(buildGrowthSummary(animal).status)).length;
  const avgWeight = active ? animals.filter(isActiveAnimalForFeeding).reduce((sum, animal) => sum + weight(animal), 0) / Math.max(1, animals.filter((animal) => isActiveAnimalForFeeding(animal) && weight(animal) > 0).length) : 0;
  const openOpps = arr(opportunities).filter((opp) => String(opp.source_module || opp.created_from || '').includes('animaux') && !['fermee', 'fermée', 'gagnee', 'gagnée', 'perdue'].includes(lower(opp.status || opp.statut))).length;
  const salesRevenue = animals.reduce((sum, animal) => sum + (isSold(animal) || linkedSalesForAnimal(animal, salesOrders, payments, transactions).total > 0 ? animalSaleValue(animal, salesOrders, payments, transactions) : 0), 0);
  const salesPaid = animals.reduce((sum, animal) => sum + linkedSalesForAnimal(animal, salesOrders, payments, transactions).paid, 0);
  const potentialCA = animals.filter((animal) => isReady(animal) && !isSold(animal)).reduce((sum, animal) => sum + animalSaleValue(animal, salesOrders, payments, transactions), 0);
  const totalMargin = salesRevenue + potentialCA - totalDirectCost;
  const priority = sick > 0 ? { module: 'sante', label: 'Traiter le suivi santé', icon: HeartPulse } : ready > 0 ? { module: 'ventes', label: 'Convertir les animaux prêts', icon: ShoppingBag } : slowGrowth > 0 ? { module: 'animaux', label: 'Vérifier les croissances lentes', icon: Scale } : { module: 'animaux', label: 'Mettre à jour les pesées', icon: Scale };
  const PriorityIcon = priority.icon;
  const interpretation = sick > 0 ? `${fmtNumber(sick)} animal(aux) nécessitent un suivi santé.` : realCostAnimals < animals.length ? `Coût réel disponible pour ${fmtNumber(realCostAnimals)}/${fmtNumber(animals.length)} animal(aux), estimation utilisée pour le reste.` : ready > 0 ? `${fmtNumber(ready)} animal(aux) sont prêts ou presque prêts à vendre.` : slowGrowth > 0 ? `${fmtNumber(slowGrowth)} animal(aux) ont une croissance à surveiller.` : 'Cheptel stable : maintenir les pesées et le suivi sanitaire.';

  return <div className="space-y-5">
    <Header priority={priority} onNavigate={onNavigate} />
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><SmallMetric label="Actifs" value={fmtNumber(active)} hint="bovins/ovins/caprins" /><SmallMetric label="Malades" value={fmtNumber(sick)} hint="à suivre" danger={sick > 0} /><SmallMetric label="Coût moyen animal" value={fmtCurrency(avgCost || costSummary.averageCost)} hint={`${fmtNumber(realCostAnimals)} réel(s), ${fmtNumber(Math.max(0, animals.length - realCostAnimals))} à compléter`} /><SmallMetric label="Coût / kg" value={fmtCurrency(avgCostPerKg || 0)} hint="si poids disponible" /><SmallMetric label="Prêts vente" value={fmtNumber(ready)} hint={`${fmtNumber(openOpps)} opportunité(s)`} /><SmallMetric label="Marge estimée" value={fmtCurrency(totalMargin)} hint={`CA vendu ${fmtCurrency(salesRevenue)} · encaissé ${fmtCurrency(salesPaid)} · potentiel ${fmtCurrency(potentialCA)}`} danger={totalMargin < 0} /></div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="grid grid-cols-2 lg:grid-cols-5 gap-3"><SmallMetric label="Aliment réel" value={fmtCurrency(totalFeed || costSummary.realFeedCost)} hint="fiche + sorties stock/logs" /><SmallMetric label="Soins / santé" value={fmtCurrency(totalHealth)} hint="fiche + actes santé" /><SmallMetric label="Poids moyen" value={`${Number(avgWeight || 0).toFixed(2)} kg`} hint="actifs pesés" /><SmallMetric label="Pertes" value={fmtNumber(losses)} hint={`${fmtNumber(sold)} vendu(s)`} danger={losses > 0} /><SmallMetric label="Coût total cheptel" value={fmtCurrency(totalDirectCost || costSummary.totalCost)} hint="achat + aliment + soins + frais" /></div></div>
    <SmartEvolutionChart title="Animaux — économie mensuelle" subtitle="Barres : charges, CA, encaissé, marge. Courbes : poids moyen et taux de marge. La légende est cliquable." months={labels(monthly)} leftUnit="FCFA" rightUnit="kg" series={[{ name: 'Charges aliments', type: 'bar', unit: 'FCFA', data: values(monthly, 'charges_aliments') }, { name: 'Charges soins', type: 'bar', unit: 'FCFA', data: values(monthly, 'charges_soins') }, { name: 'Autres charges', type: 'bar', unit: 'FCFA', data: values(monthly, 'charges_autres') }, { name: 'CA ventes', type: 'bar', unit: 'FCFA', data: values(monthly, 'ca_ventes') }, { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: values(monthly, 'encaisse') }, { name: 'Marge', type: 'bar', unit: 'FCFA', data: values(monthly, 'marge') }, { name: 'Poids moyen', type: 'line', axis: 'right', unit: 'kg', data: values(monthly, 'poids_moyen') }, { name: 'Taux marge', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_marge') }]} />
    <SmartEvolutionChart title="Animaux — performance opérationnelle mensuelle" subtitle="Effectif, animaux prêts, malades, pertes, croissance et mortalité. Zoom disponible en bas du graphe." months={labels(monthly)} leftUnit="" rightUnit="%" series={[{ name: 'Effectif actif', type: 'bar', data: values(monthly, 'effectif') }, { name: 'Prêts vente', type: 'bar', data: values(monthly, 'prets') }, { name: 'Malades', type: 'bar', data: values(monthly, 'malades') }, { name: 'Pertes', type: 'bar', data: values(monthly, 'pertes') }, { name: 'Reproduction', type: 'bar', data: values(monthly, 'reproduction') }, { name: 'Croissance moyenne', type: 'line', axis: 'right', unit: 'kg', data: values(monthly, 'croissance_moyenne') }, { name: 'Taux mortalité', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_mortalite') }]} />
    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${sick || losses || slowGrowth ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
