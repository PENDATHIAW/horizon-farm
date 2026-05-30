import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';
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
const orderAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.ca ?? row.ca_total ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const transactionAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.credit ?? row.credit_amount ?? 0);
const oppAmount = (opp = {}) => toNumber(opp.montant_estime ?? opp.estimated_amount ?? opp.valeur_estimee ?? opp.amount ?? opp.total ?? opp.ca_potentiel ?? 0);
const physicalIdOf = (row = {}) => row.boucle_numero || row.qr_code || row.tag || row.id;

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), charges_aliments: 0, charges_soins: 0, charges_autres: 0, ca_ventes: 0, encaisse: 0, marge: 0, poids_total: 0, poids_count: 0, poids_moyen: 0, croissance_total: 0, croissance_count: 0, croissance_moyenne: 0, gmq_total: 0, gmq_count: 0, gmq_moyen: 0, poids_sortie_total: 0, poids_sortie_count: 0, poids_sortie_projete: 0, cout_jour_total: 0, cout_jour_count: 0, cout_jour: 0, effectif: 0, malades: 0, pertes: 0, prets: 0, vendus: 0, reproduction: 0, taux_mortalite: 0 }); return map.get(key); }
function rowText(item = {}) { return lower(`${item.module || ''} ${item.source_module || ''} ${item.activity || ''} ${item.activite || ''} ${item.type || ''} ${item.nature || ''} ${item.category || ''} ${item.categorie || ''} ${item.espece || ''} ${item.species || ''} ${item.produit || ''} ${item.product_name || ''} ${item.libelle || ''} ${item.title || ''} ${item.description || ''} ${item.notes || ''} ${item.nom || ''}`); }
function isIncome(row = {}) { const text = rowText(row); if (/(sortie|charge|depense|dépense|frais|cout|coût|debit|débit|expense|achat|aliment|soin|vaccin|maintenance)/.test(text)) return false; return /(entree|entrée|revenu|recette|vente|encaisse|encaissement|client|credit|crédit|income|revenue|sale|ca\b)/.test(text); }
function animalKeywordMatches(item = {}) { return /(animal|animaux|bovin|boeuf|bœuf|ovin|mouton|caprin|chevre|chèvre|cheptel|embouche)/.test(rowText(item)); }
function matchAnimal(item = {}, animal = {}) { const id = String(animal.id || ''); const code = String(physicalIdOf(animal) || ''); const values = [item.animal_id, item.source_id, item.source_record_id, item.related_id, item.cible_id, item.target_id, item.entity_id, item.boucle_numero, item.qr_code, item.tag, item.product_id, item.article_id].map((v) => String(v || '')); if (values.some((v) => v && (v === id || v === code))) return true; const text = rowText(item); return Boolean(code && text.includes(lower(code))) || Boolean(id && text.includes(lower(id))); }
function financeSalesForAnimal(animal = {}, transactions = []) { const rows = arr(transactions).filter((tx) => isIncome(tx) && (matchAnimal(tx, animal) || animalKeywordMatches(tx))); return { rows, total: rows.reduce((sum, tx) => sum + transactionAmount(tx), 0) }; }
function linkedSalesForAnimal(animal = {}, salesOrders = [], payments = [], transactions = []) { const orders = arr(salesOrders).filter((order) => !['annule', 'annulee', 'annulé', 'cancelled'].includes(lower(order.statut || order.status)) && matchAnimal(order, animal)); const totalOrders = orders.reduce((sum, order) => sum + orderAmount(order), 0); const orderIds = orders.map((order) => String(order.id || '')).filter(Boolean); const paidOrders = arr(payments).filter((payment) => orderIds.includes(String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '')) || matchAnimal(payment, animal)).reduce((sum, payment) => sum + paymentAmount(payment), 0); const finance = totalOrders > 0 ? { rows: [], total: 0 } : financeSalesForAnimal(animal, transactions); const total = totalOrders + finance.total; const paid = paidOrders + finance.total; return { orders, financeRows: finance.rows, total, paid, remaining: Math.max(0, total - paid) }; }
function animalSaleValue(animal, salesOrders = [], payments = [], transactions = []) { const linked = linkedSalesForAnimal(animal, salesOrders, payments, transactions); if (linked.total > 0) return linked.total; const pricing = calculateAnimalSalePricing({ animal, metrics: { totalCost: purchaseCost(animal) } }); return toNumber(animal.prix_vente_reel ?? animal.sale_price ?? animal.prix_vente ?? pricing.recommendedSalePrice ?? animal.prix_vente_estime_auto ?? animal.prix_vente_estime ?? 0); }
function SmallMetric({ label, value, hint, danger = false }) { return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-xs text-[#8a7456] mt-1">{hint}</p> : null}</div>; }
function Header({ priority, onNavigate }) { const PriorityIcon = priority.icon; return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><TrendingUp size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution embouche interactive</p><p className="text-xs text-[#8a7456] mt-1">Coût de revient, GMQ, poids projeté, ventes, marge, santé et pertes.</p></div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button></div></div>; }
function costDetailMap(summary = {}) { return new Map(arr(summary.details).map((item) => [String(item.animalId), item])); }
function detailFor(animal = {}, map = new Map()) { return map.get(String(animal.id)) || { baseCost: purchaseCost(animal), realFeedCost: 0, healthCost: 0, otherDirectCost: 0, totalCost: purchaseCost(animal), costComplete: false, costMissing: true, gmq: 0, projectedExitWeight: 0, costPerKg: 0, costPerDay: 0 }; }
function buildMonthly({ rows = [], opportunities = [], salesOrders = [], payments = [], transactions = [], details = new Map() }) {
  const map = new Map();
  arr(rows).forEach((animal) => { const bucket = ensure(map, monthKey(rowDate(animal))); const detail = detailFor(animal, details); if (isActiveAnimalForFeeding(animal)) bucket.effectif += 1; if (isSick(animal)) bucket.malades += 1; if (isLoss(animal)) bucket.pertes += 1; if (isReady(animal)) bucket.prets += 1; if (isSold(animal)) bucket.vendus += 1; const current = weight(animal); if (current > 0) { bucket.poids_total += current; bucket.poids_count += 1; } const start = initialWeight(animal); if (current > 0 && start > 0) { bucket.croissance_total += Math.max(0, current - start); bucket.croissance_count += 1; } if (lower(animal.sexe) === 'femelle' && (lower(animal.status_reproduction || animal.reproduction_status).includes('gest') || lower(animal.status_reproduction || animal.reproduction_status).includes('mise_bas'))) bucket.reproduction += 1; bucket.charges_aliments += toNumber(detail.realFeedCost); bucket.charges_soins += toNumber(detail.healthCost); bucket.charges_autres += toNumber(detail.baseCost) + toNumber(detail.otherDirectCost); if (detail.gmq > 0) { bucket.gmq_total += detail.gmq; bucket.gmq_count += 1; } if (detail.projectedExitWeight > 0) { bucket.poids_sortie_total += detail.projectedExitWeight; bucket.poids_sortie_count += 1; } if (detail.costPerDay > 0) { bucket.cout_jour_total += detail.costPerDay; bucket.cout_jour_count += 1; } const linked = linkedSalesForAnimal(animal, salesOrders, payments, transactions); if (isSold(animal) || linked.total > 0) { bucket.ca_ventes += animalSaleValue(animal, salesOrders, payments, transactions); bucket.encaisse += linked.paid; } });
  arr(opportunities).forEach((opp) => { const source = lower(`${opp.source_module || ''} ${opp.created_from || ''} ${opp.type || ''} ${opp.title || ''}`); if (!source.includes('animaux') && !source.includes('animal')) return; ensure(map, monthKey(opp.created_at || opp.updated_at || opp.date)).ca_ventes += oppAmount(opp); });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => { const poids = row.poids_count ? row.poids_total / row.poids_count : 0; const croissance = row.croissance_count ? row.croissance_total / row.croissance_count : 0; const charges = row.charges_aliments + row.charges_soins + row.charges_autres; const marge = row.ca_ventes - charges; const base = Math.max(1, row.effectif + row.pertes); return { ...row, charges_total: charges, poids_moyen: Number(poids.toFixed(2)), croissance_moyenne: Number(croissance.toFixed(2)), gmq_moyen: row.gmq_count ? Number((row.gmq_total / row.gmq_count).toFixed(3)) : 0, poids_sortie_projete: row.poids_sortie_count ? Number((row.poids_sortie_total / row.poids_sortie_count).toFixed(2)) : 0, cout_jour: row.cout_jour_count ? Number((row.cout_jour_total / row.cout_jour_count).toFixed(0)) : 0, marge: Number(marge.toFixed(0)), taux_marge: row.ca_ventes > 0 ? Number(((marge / row.ca_ventes) * 100).toFixed(1)) : 0, taux_mortalite: Number(((row.pertes / base) * 100).toFixed(1)) }; });
}
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }
function labels(rows) { return rows.map((row) => row.mois); }
export default function AnimauxEvolution({ rows = [], alimentationLogs = [], vaccins = [], opportunities = [], businessEvents = [], salesOrders = [], payments = [], transactions = [], onNavigate }) {
  const animals = arr(rows);
  const costSummary = summarizeAnimalCosts({ rows: animals, alimentationLogs, vaccins, slaughterEvents: businessEvents, directCharges: businessEvents, healthEvents: businessEvents, defaultPricePerKg: 0 });
  const details = costDetailMap(costSummary);
  const costDetails = animals.map((animal) => detailFor(animal, details));
  const complete = costDetails.filter((item) => item.costComplete);
  const totalCost = costDetails.reduce((sum, item) => sum + toNumber(item.totalCost), 0);
  const totalFeed = costDetails.reduce((sum, item) => sum + toNumber(item.realFeedCost), 0);
  const totalHealth = costDetails.reduce((sum, item) => sum + toNumber(item.healthCost), 0);
  const avgCost = complete.length ? complete.reduce((sum, item) => sum + toNumber(item.totalCost), 0) / complete.length : 0;
  const avgCostPerKg = complete.filter((item) => item.costPerKg > 0).length ? complete.filter((item) => item.costPerKg > 0).reduce((sum, item) => sum + item.costPerKg, 0) / complete.filter((item) => item.costPerKg > 0).length : 0;
  const avgGMQ = costDetails.filter((item) => item.gmq > 0).length ? costDetails.filter((item) => item.gmq > 0).reduce((sum, item) => sum + item.gmq, 0) / costDetails.filter((item) => item.gmq > 0).length : 0;
  const avgProjectedWeight = costDetails.filter((item) => item.projectedExitWeight > 0).length ? costDetails.filter((item) => item.projectedExitWeight > 0).reduce((sum, item) => sum + item.projectedExitWeight, 0) / costDetails.filter((item) => item.projectedExitWeight > 0).length : 0;
  const monthly = buildMonthly({ rows, opportunities, salesOrders, payments, transactions, details });
  const chargePie = {
    aliment: costDetails.reduce((sum, item) => sum + toNumber(item.realFeedCost), 0),
    sante: costDetails.reduce((sum, item) => sum + toNumber(item.healthCost), 0),
    autres: costDetails.reduce((sum, item) => sum + toNumber(item.baseCost) + toNumber(item.otherDirectCost), 0),
  };

  if (!animals.length) return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucun animal — graphiques indisponibles.</div>;

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Animaux" compact title="CA vs encaissé" subtitle="Histogramme — ventes embouche" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'CA ventes', type: 'bar', unit: 'FCFA', data: values(monthly, 'ca_ventes') },
        { name: 'Encaissé', type: 'bar', unit: 'FCFA', data: values(monthly, 'encaisse') },
      ]} />
      <SmartEvolutionChart moduleName="Animaux" compact title="Marge mensuelle" subtitle="Courbe — CA − charges" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Marge', type: 'line', unit: 'FCFA', data: values(monthly, 'marge') },
      ]} />
      <SmartPieChart moduleName="Animaux" compact title="Structure des charges" subtitle="Camembert — aliment / santé / achat" unit="FCFA" items={[
        { name: 'Alimentation', value: chargePie.aliment },
        { name: 'Santé', value: chargePie.sante },
        { name: 'Achat + frais', value: chargePie.autres },
      ]} />
      <SmartEvolutionChart moduleName="Animaux" compact title="Poids moyen vs GMQ" subtitle="Courbes — performance croissance" months={labels(monthly)} leftUnit="kg" rightUnit="kg/j" series={[
        { name: 'Poids moyen', type: 'line', unit: 'kg', data: values(monthly, 'poids_moyen') },
        { name: 'GMQ moyen', type: 'line', axis: 'right', unit: 'kg/j', data: values(monthly, 'gmq_moyen') },
      ]} />
      <SmartEvolutionChart moduleName="Animaux" compact title="Effectif vs malades" subtitle="Histogramme — cheptel actif" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Effectif actif', type: 'bar', data: values(monthly, 'effectif') },
        { name: 'Malades', type: 'bar', data: values(monthly, 'malades') },
      ]} />
      <SmartEvolutionChart moduleName="Animaux" compact title="Prêts vente vs pertes" subtitle="Histogramme — sorties cheptel" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Prêts vente', type: 'bar', data: values(monthly, 'prets') },
        { name: 'Pertes', type: 'bar', data: values(monthly, 'pertes') },
      ]} />
    </ChartsGrid>
  );
}
