import { Activity, AlertTriangle, Bird, Beef, DollarSign, HeartPulse, Package, Receipt, ShieldCheck, TrendingUp } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const safeArray = (value) => Array.isArray(value) ? value : [];
const money = (value) => fmtCurrency(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;

const isIncome = (trx = {}) => {
  const type = String(trx.type || trx.category || trx.categorie || '').toLowerCase();
  return ['revenu', 'recette', 'vente', 'income', 'encaissement'].some((key) => type.includes(key));
};

const isExpense = (trx = {}) => {
  const type = String(trx.type || trx.category || trx.categorie || '').toLowerCase();
  return ['depense', 'dépense', 'achat', 'charge', 'expense', 'sortie'].some((key) => type.includes(key));
};

const amount = (row = {}) => toNumber(row.amount ?? row.montant ?? row.total ?? row.value ?? row.valeur ?? 0);
const currentAnimalWeight = (animal = {}) => toNumber(animal.weight ?? animal.poids ?? animal.current_weight ?? animal.poids_actuel);
const targetAnimalWeight = (animal = {}) => toNumber(animal.target_weight ?? animal.poids_objectif ?? animal.objectif_poids);
const lotMortality = (lot = {}) => toNumber(lot.mortality ?? lot.morts ?? lot.pertes ?? 0);
const lotSick = (lot = {}) => toNumber(lot.malades ?? lot.sick_count ?? lot.malade_count ?? 0);
const lotInitial = (lot = {}) => Math.max(toNumber(lot.initial_count), toNumber(lot.current_count), toNumber(lot.effectif_actuel));
const lotCurrent = (lot = {}) => Math.max(0, toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count) - lotMortality(lot) - toNumber(lot.vendus) - toNumber(lot.reformes));
const eggs = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenEggs = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);

function calcFinancials({ transactions = [], salesOrders = [], payments = [] }) {
  const tx = safeArray(transactions);
  const orders = safeArray(salesOrders);
  const pay = safeArray(payments);
  const incomeFromTx = tx.filter(isIncome).reduce((sum, item) => sum + amount(item), 0);
  const expenseFromTx = tx.filter(isExpense).reduce((sum, item) => sum + amount(item), 0);
  const salesTotal = orders.reduce((sum, item) => sum + amount(item), 0);
  const paidTotal = pay.reduce((sum, item) => sum + amount(item), 0);
  const revenue = Math.max(incomeFromTx, salesTotal, paidTotal);
  const margin = revenue - expenseFromTx;
  const marginRate = revenue > 0 ? (margin / revenue) * 100 : 0;
  return { revenue, expenses: expenseFromTx, margin, marginRate };
}

function calcAnimals(animaux = []) {
  const rows = safeArray(animaux);
  const active = rows.filter((a) => !['vendu', 'mort', 'sorti'].includes(String(a.status || a.statut || '').toLowerCase()));
  const sick = rows.filter((a) => String(a.health_status || a.sante || '').toLowerCase().includes('malade')).length;
  const ready = active.filter((a) => {
    const target = targetAnimalWeight(a);
    const weight = currentAnimalWeight(a);
    return target > 0 && weight >= target;
  }).length;
  const avgProgress = active.length ? active.reduce((sum, a) => {
    const target = targetAnimalWeight(a);
    return sum + (target > 0 ? Math.min(100, (currentAnimalWeight(a) / target) * 100) : 0);
  }, 0) / active.length : 0;
  return { total: rows.length, active: active.length, sick, ready, avgProgress };
}

function calcAvicole(lots = [], productionLogs = []) {
  const rows = safeArray(lots);
  const chair = rows.filter((lot) => String(lot.type || '').toLowerCase().includes('chair'));
  const pondeuses = rows.filter((lot) => String(lot.type || '').toLowerCase().includes('pondeuse'));
  const morts = rows.reduce((sum, lot) => sum + lotMortality(lot), 0);
  const malades = rows.reduce((sum, lot) => sum + lotSick(lot), 0);
  const initial = rows.reduce((sum, lot) => sum + lotInitial(lot), 0);
  const mortalityRate = initial > 0 ? (morts / initial) * 100 : 0;
  const prod = safeArray(productionLogs);
  const totalEggs = prod.reduce((sum, log) => sum + eggs(log), 0);
  const broken = prod.reduce((sum, log) => sum + brokenEggs(log), 0);
  const brokenRate = totalEggs > 0 ? (broken / totalEggs) * 100 : 0;
  const pondeuseCount = pondeuses.reduce((sum, lot) => sum + lotCurrent(lot), 0);
  const latestDate = prod.map((log) => log.date).filter(Boolean).sort().pop();
  const latestEggs = prod.filter((log) => log.date === latestDate).reduce((sum, log) => sum + eggs(log), 0);
  const layingRate = pondeuseCount > 0 ? Math.min(100, (latestEggs / pondeuseCount) * 100) : 0;
  return { chair: chair.length, pondeuses: pondeuses.length, morts, malades, mortalityRate, totalEggs, broken, brokenRate, layingRate, latestDate };
}

function calcHealth(sante = []) {
  const rows = safeArray(sante);
  const late = rows.filter((v) => ['retard', 'en_retard', 'overdue'].includes(String(v.statut || v.status || '').toLowerCase())).length;
  const planned = rows.filter((v) => ['planifie', 'prévu', 'prevu', 'a_faire'].includes(String(v.statut || v.status || '').toLowerCase())).length;
  const done = rows.filter((v) => ['fait', 'termine', 'réalisé', 'realise'].includes(String(v.statut || v.status || '').toLowerCase())).length;
  const healthCosts = rows.reduce((sum, item) => sum + amount(item), 0);
  return { total: rows.length, late, planned, done, healthCosts };
}

function calcStocks(stocks = []) {
  const rows = safeArray(stocks);
  const critical = rows.filter((s) => toNumber(s.quantite ?? s.quantity) <= toNumber(s.seuil ?? s.threshold)).length;
  const value = rows.reduce((sum, s) => sum + toNumber(s.quantite ?? s.quantity) * toNumber(s.prix_unitaire ?? s.unit_price ?? s.price), 0);
  return { total: rows.length, critical, value };
}

function ImpactRow({ title, value, detail, status = 'neutre' }) {
  const color = status === 'danger' ? 'border-red-200 bg-red-50/70' : status === 'good' ? 'border-emerald-200 bg-emerald-50/70' : 'border-[#d6c3a0] bg-[#fffdf8]';
  return (
    <div className={`border rounded-xl p-4 ${color}`}>
      <p className="text-sm font-black text-[#2f2415]">{title}</p>
      <p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p>
      <p className="text-xs text-[#7d6a4a] mt-1">{detail}</p>
    </div>
  );
}

export default function ImpactBusiness({
  animaux = [],
  lots = [],
  productionLogs = [],
  sante = [],
  stocks = [],
  transactions = [],
  salesOrders = [],
  payments = [],
  onNavigate,
}) {
  const finances = calcFinancials({ transactions, salesOrders, payments });
  const animalStats = calcAnimals(animaux);
  const avicole = calcAvicole(lots, productionLogs);
  const health = calcHealth(sante);
  const stock = calcStocks(stocks);

  const riskScore = Math.min(100,
    (health.late * 12) +
    (stock.critical * 10) +
    (animalStats.sick * 8) +
    (avicole.malades * 5) +
    (avicole.mortalityRate * 3) +
    (avicole.brokenRate * 2)
  );
  const opportunityScore = Math.min(100,
    (animalStats.ready * 12) +
    (finances.marginRate > 0 ? finances.marginRate : 0) +
    (avicole.layingRate * 0.3)
  );

  const actionPlan = [
    health.late > 0 ? { title: 'Vaccins en retard', value: health.late, target: 'sante', detail: 'Priorité santé: réduire le risque sanitaire et les pertes.' } : null,
    stock.critical > 0 ? { title: 'Stocks critiques', value: stock.critical, target: 'stock', detail: 'Priorité stock: éviter rupture aliment / médicaments.' } : null,
    animalStats.ready > 0 ? { title: 'Animaux prêts à vendre', value: animalStats.ready, target: 'animaux', detail: 'Transformer en opportunités avant perte de marge.' } : null,
    avicole.brokenRate > 5 ? { title: 'Casse œufs élevée', value: pct(avicole.brokenRate), target: 'avicole', detail: 'Vérifier nids, calcium, ramassage et manipulation.' } : null,
    avicole.mortalityRate > 3 ? { title: 'Mortalité avicole à surveiller', value: pct(avicole.mortalityRate), target: 'avicole', detail: 'Analyser alimentation, santé et conditions du poulailler.' } : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <SectionHeader title="Impact Business" sub="Mesure de la valeur créée par l'ERP: chiffre d'affaires, marge, pertes évitées, santé et performance opérationnelle." />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={DollarSign} label="CA suivi" value={money(finances.revenue)} color="bg-emerald-500/20 text-emerald-500" />
        <KpiCard icon={TrendingUp} label="Marge estimée" value={money(finances.margin)} sub={pct(finances.marginRate)} color="bg-sky-500/20 text-sky-500" />
        <KpiCard icon={ShieldCheck} label="Risque business" value={`${Math.round(riskScore)}%`} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={Activity} label="Opportunité" value={`${Math.round(opportunityScore)}%`} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={Receipt} label="Actions prioritaires" value={fmtNumber(actionPlan.length)} color="bg-purple-500/20 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ImpactRow title="Animaux" value={`${fmtNumber(animalStats.ready)} prêts`} detail={`${fmtNumber(animalStats.active)} actifs · ${fmtNumber(animalStats.sick)} malades · croissance objectif ${pct(animalStats.avgProgress)}`} status={animalStats.ready > 0 ? 'good' : animalStats.sick > 0 ? 'danger' : 'neutre'} />
        <ImpactRow title="Avicole" value={`${fmtNumber(avicole.totalEggs)} œufs`} detail={`Taux ponte ${pct(avicole.layingRate)} · casse ${pct(avicole.brokenRate)} · mortalité ${pct(avicole.mortalityRate)}`} status={avicole.mortalityRate > 3 || avicole.brokenRate > 5 ? 'danger' : 'good'} />
        <ImpactRow title="Santé & vaccins" value={`${fmtNumber(health.late)} retards`} detail={`${fmtNumber(health.done)} faits · ${fmtNumber(health.planned)} planifiés · coûts santé ${money(health.healthCosts)}`} status={health.late > 0 ? 'danger' : 'good'} />
        <ImpactRow title="Stock" value={`${fmtNumber(stock.critical)} critiques`} detail={`${fmtNumber(stock.total)} articles · valeur stock estimée ${money(stock.value)}`} status={stock.critical > 0 ? 'danger' : 'good'} />
        <ImpactRow title="Finance" value={money(finances.margin)} detail={`CA ${money(finances.revenue)} · dépenses ${money(finances.expenses)} · marge ${pct(finances.marginRate)}`} status={finances.margin >= 0 ? 'good' : 'danger'} />
        <ImpactRow title="Avicole sanitaire" value={`${fmtNumber(avicole.morts)} morts`} detail={`${fmtNumber(avicole.malades)} malades · ${fmtNumber(avicole.chair)} lots chair · ${fmtNumber(avicole.pondeuses)} lots pondeuses`} status={avicole.morts || avicole.malades ? 'danger' : 'good'} />
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-amber-600" />
          <h3 className="font-black text-[#2f2415]">Plan d'action business</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actionPlan.length ? actionPlan.map((item) => (
            <button key={item.title} type="button" onClick={() => onNavigate?.(item.target)} className="text-left bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4 hover:border-[#b6975f] transition-all">
              <p className="font-bold text-[#2f2415]">{item.title}</p>
              <p className="text-2xl font-black text-[#2f2415] mt-1">{item.value}</p>
              <p className="text-xs text-[#8a7456] mt-1">{item.detail}</p>
            </button>
          )) : <div className="md:col-span-2 text-sm text-[#8a7456] bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4">Aucune action prioritaire détectée pour l'instant. Le module sera enrichi au fur et à mesure des prochains modules.</div>}
        </div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <h3 className="font-black text-[#2f2415] mb-3">Modules à reconnecter à Impact Business</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><Beef size={16} className="mb-2" /><b>Animaux</b><p className="text-[#8a7456] mt-1">Croissance, coût par animal, vente au bon moment, marge réelle.</p></div>
          <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><Bird size={16} className="mb-2" /><b>Avicole</b><p className="text-[#8a7456] mt-1">Ponte, casse, mortalité, marge par lot, décision vente.</p></div>
          <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><Package size={16} className="mb-2" /><b>Stock / Santé</b><p className="text-[#8a7456] mt-1">Ruptures évitées, vaccins en retard, soins, coût sanitaire.</p></div>
        </div>
      </div>
    </div>
  );
}
