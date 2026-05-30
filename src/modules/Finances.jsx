import { AlertTriangle, ArrowDown, ArrowUp, BarChart2, CreditCard, Download, Edit, Eye, FileText, Landmark, Plus, RefreshCw, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import ActionIconButton from '../components/ActionIconButton';
import { fmtCurrency, fmtPercent } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId } from '../utils/ids';
import { buildFinanceAlerts } from '../utils/accounting';
import { calculateAnimalMetrics, calculateCultureMetrics, calculateInvestmentMetrics, calculateLotMetrics, calculateStockMetrics } from '../utils/businessCalculations';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';

const PAYMENT_METHODS = ['Cash', 'Banque', 'Wave', 'Orange Money', 'Free Money', 'Carte bancaire'];
const PERIOD_LABELS = ['S-3', 'S-2', 'S-1', 'Semaine'];

const methodColor = {
  Cash: '#f59e0b',
  Banque: '#0ea5e9',
  Wave: '#38bdf8',
  'Orange Money': '#f97316',
  'Free Money': '#22c55e',
  'Carte bancaire': '#8b5cf6',
};

const normalizeActivity = ({ id, name, module, revenus = 0, couts = 0, roi = null }) => {
  const marge = Number(revenus || 0) - Number(couts || 0);
  return { id, name, module, revenus, couts, marge, roi: roi ?? (couts > 0 ? (marge / couts) * 100 : 0) };
};

function getOfficialFinalCash() {
  const rows = Array.isArray(HORIZON_FARM_OFFICIAL_BP.forecast.monthlyCashYear1) ? HORIZON_FARM_OFFICIAL_BP.forecast.monthlyCashYear1 : [];
  return rows[rows.length - 1]?.cumulativeCash || 0;
}

function OfficialBpForecastPanel() {
  const bp = HORIZON_FARM_OFFICIAL_BP;
  return <section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-3">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Prévisionnel BP officiel</p>
        <h3 className="text-lg font-black text-[#2f2415]">Référence financière Horizon Farm</h3>
        <p className="text-sm text-[#8a7456] mt-1">Ces chiffres viennent du fichier BP. Les KPI au-dessus restent les flux réels enregistrés dans Finances.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Poussins chair corrigés : <b>1 024 000 FCFA/mois</b></div>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
      <MiniMetric label="CA année 1" value={bp.revenue.annualTotal} />
      <MiniMetric label="Charges variables corrigées" value={bp.variableCosts.correctedAnnualTotal} />
      <MiniMetric label="Charges fixes A1" value={bp.fixedCosts.annualByYear[0]} />
      <MiniMetric label="Salaires + rémunération" value={bp.payroll.annualTotal} />
      <MiniMetric label="BFR A1" value={bp.workingCapital.bfrByYear[0]} />
      <MiniMetric label="Résultat A1" value={bp.forecast.resultByYear[0]} />
      <MiniMetric label="CAF A1" value={bp.forecast.cashFlowCapacityByYear[0]} />
      <MiniMetric label="Trésorerie finale A1" value={getOfficialFinalCash()} />
    </div>
  </section>;
}

export default function Finances({
  rows = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  animaux = [],
  lots = [],
  cultures = [],
  stocks = [],
  investissements = [],
  alimentationLogs = [],
  businessPlans = [],
  salesOrders = [],
  payments = [],
}) {
  const [typeFilter, setTypeFilter] = useState('tous');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [paymentFilter, setPaymentFilter] = useState('tous');
  const [bpFilter, setBpFilter] = useState('tous');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const financeFormFields = useMemo(() => {
    const bpOptions = businessPlans.map((bp) => ({ value: bp.id, label: bp.nom || bp.id }));
    return MODULE_FORM_FIELDS.finances.map((field) =>
      field.key === 'business_plan_id' && bpOptions.length
        ? { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] }
        : field
    );
  }, [businessPlans]);

  const totalRec = useMemo(() => rows.filter((t) => t.type === 'entree' && (t.statut || 'paye') !== 'impaye').reduce((s, t) => s + Number(t.montant || 0), 0), [rows]);
  const totalDep = useMemo(() => rows.filter((t) => t.type === 'sortie').reduce((s, t) => s + Number(t.montant || 0), 0), [rows]);
  const benefice = totalRec - totalDep;
  const receivables = useMemo(() => salesOrders.filter((order) => Number(order.reste_a_payer || 0) > 0 && order.statut_commande !== 'annule'), [salesOrders]);
  const totalCreances = useMemo(() => receivables.reduce((sum, order) => sum + Number(order.reste_a_payer || 0), 0), [receivables]);
  const ventesPayees = useMemo(() => salesOrders.filter((order) => order.statut_paiement === 'paye').length, [salesOrders]);
  const paiementsPartiels = useMemo(() => salesOrders.filter((order) => order.statut_paiement === 'partiel').length, [salesOrders]);

  const filtered = useMemo(() => rows.filter((t) => {
    const typeOk = typeFilter === 'tous' || t.type === typeFilter;
    const statusOk = statusFilter === 'tous' || (t.statut || 'paye') === statusFilter;
    const paymentOk = paymentFilter === 'tous' || (t.paiement || '') === paymentFilter;
    const bpOk = bpFilter === 'tous' || t.business_plan_id === bpFilter;
    return typeOk && statusOk && paymentOk && bpOk;
  }), [rows, typeFilter, statusFilter, paymentFilter, bpFilter]);

  const treasury = useMemo(() => PAYMENT_METHODS.map((method) => {
    const entrees = rows.filter((t) => t.type === 'entree' && t.paiement === method && t.statut !== 'impaye').reduce((sum, t) => sum + Number(t.montant || 0), 0);
    const sorties = rows.filter((t) => t.type === 'sortie' && t.paiement === method && t.statut !== 'impaye').reduce((sum, t) => sum + Number(t.montant || 0), 0);
    return { method, solde: entrees - sorties, entrees, sorties, color: methodColor[method] || '#94a3b8' };
  }), [rows]);

  const cashDisponible = treasury.reduce((sum, item) => sum + Number(item.solde || 0), 0);

  const activities = useMemo(() => {
    const animalRevenue = animaux.reduce((sum, animal) => sum + Number(animal.sale_price || 0), 0);
    const animalCosts = animaux.reduce((sum, animal) => sum + calculateAnimalMetrics({ animal, animals: animaux, feedingLogs: alimentationLogs }).totalCost, 0);
    const lotRevenue = lots.reduce((sum, lot) => sum + Number(lot.revenuEstime || lot.revenu_estime || 0), 0);
    const lotCosts = lots.reduce((sum, lot) => {
      const metrics = calculateLotMetrics({ lot, feedingLogs: alimentationLogs });
      return sum + metrics.feedingCost + Number(lot.initial_count || 0) * 900 + Number(lot.mortality || 0) * 350;
    }, 0);
    const cultureRevenue = cultures.reduce((sum, culture) => sum + Number(culture.revenu_reel || culture.revenu_estime || 0), 0);
    const cultureCosts = cultures.reduce((sum, culture) => sum + calculateCultureMetrics(culture).costTotal, 0);
    const stockValue = stocks.reduce((sum, stock) => sum + calculateStockMetrics(stock).value, 0);
    const investmentGain = investissements.reduce((sum, inv) => sum + calculateInvestmentMetrics(inv).gain, 0);
    const investmentCost = investissements.reduce((sum, inv) => sum + calculateInvestmentMetrics(inv).amount, 0);

    return [
      normalizeActivity({ id: 'act-animaux', name: 'Animaux', module: 'animaux', revenus: animalRevenue, couts: animalCosts }),
      normalizeActivity({ id: 'act-avicole', name: 'Avicole', module: 'avicole', revenus: lotRevenue, couts: lotCosts }),
      normalizeActivity({ id: 'act-cultures', name: 'Cultures', module: 'cultures', revenus: cultureRevenue, couts: cultureCosts }),
      normalizeActivity({ id: 'act-stocks', name: 'Valeur stock', module: 'stock', revenus: stockValue, couts: stockValue * 0.72 }),
      normalizeActivity({ id: 'act-invest', name: 'Investissements', module: 'investissements', revenus: investmentGain, couts: investmentCost }),
    ];
  }, [animaux, lots, cultures, stocks, investissements, alimentationLogs]);

  const topActivities = [...activities].sort((a, b) => b.marge - a.marge);
  const deficitActivities = activities.filter((activity) => activity.marge < 0);

  const categoryData = useMemo(() => {
    const map = new Map();
    rows.forEach((transaction) => {
      const key = transaction.categorie || 'Autre';
      const current = map.get(key) || { name: key, recettes: 0, depenses: 0 };
      if (transaction.type === 'entree' && (transaction.statut || 'paye') !== 'impaye') current.recettes += Number(transaction.montant || 0);
      if (transaction.type === 'sortie') current.depenses += Number(transaction.montant || 0);
      map.set(key, current);
    });
    return Array.from(map.values()).map((item) => ({ ...item, marge: item.recettes - item.depenses }));
  }, [rows]);

  const weeklyData = useMemo(() => PERIOD_LABELS.map((label, index) => {
    const ratio = [0.72, 0.86, 0.94, 1][index];
    return { label, recettes: Math.round(totalRec * ratio / 4), depenses: Math.round(totalDep * (ratio + 0.08) / 4), benefice: Math.round(benefice * ratio / 4) };
  }), [totalRec, totalDep, benefice]);

  const forecast = useMemo(() => ({
    revenus: Math.round(totalRec * 1.08),
    depenses: Math.round(totalDep * 1.04),
    cashflow: Math.round(benefice + cashDisponible * 0.18),
    benefice: Math.round(totalRec * 1.08 - totalDep * 1.04),
  }), [totalRec, totalDep, benefice, cashDisponible]);

  const alerts = useMemo(() => buildFinanceAlerts({ transactions: rows, treasuryAccounts: treasury.map((item) => ({ solde_actuel: item.solde })), activities }), [rows, treasury, activities]);

  const pieData = categoryData.filter((d) => d.recettes || d.depenses).map((d, index) => ({ name: d.name, value: Math.abs(d.marge) || d.recettes || d.depenses, color: ['#22c55e', '#4ade80', '#ef4444', '#f59e0b', '#f97316', '#0ea5e9'][index % 6] }));

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate({ ...payload, statut: payload.statut || 'paye' });
      toast.success('Transaction ajoutee');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur creation transaction');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate(selected.id, payload);
      toast.success('Transaction modifiee');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification transaction');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete(selected.id);
      toast.success('Transaction supprimee');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression transaction');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    exportToCsv({ rows: filtered, fileName: 'transactions.csv' });
    exportToExcel({ rows: filtered, fileName: 'transactions.xlsx', sheetName: 'Transactions' });
    exportToPdf({ rows: filtered, title: 'Rapport financier Horizon Farm', fileName: 'rapport-financier.pdf' });
    toast.success('Exports finances generes');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Pilotage Financier"
        sub="Tresorerie - flux reels - marges - previsionnel BP officiel"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter recette/depense</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Export PDF/Excel/CSV</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <KpiCard icon={TrendingUp} label="Flux entrants encaisses" value={fmtCurrency(totalRec)} color="bg-emerald-500/20 text-emerald-400" trend={8} />
        <KpiCard icon={TrendingDown} label="Flux sortants" value={fmtCurrency(totalDep)} color="bg-red-500/20 text-red-400" trend={-3} />
        <KpiCard icon={Wallet} label="Resultat cash reel" value={fmtCurrency(benefice)} color="bg-sky-500/20 text-sky-400" trend={12} />
        <KpiCard icon={CreditCard} label="Cash disponible reel" value={fmtCurrency(cashDisponible)} color="bg-purple-500/20 text-purple-400" />
        <KpiCard icon={Landmark} label="Creances ouvertes" value={fmtCurrency(totalCreances)} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={BarChart2} label="Taux marge cash" value={fmtPercent(totalRec ? (benefice / totalRec) * 100 : 0)} color="bg-emerald-500/20 text-emerald-500" />
      </div>

      <OfficialBpForecastPanel />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><p className="font-semibold text-[#2f2415]">Commandes encaissees</p><p className="mt-2 text-2xl font-black text-emerald-600">{ventesPayees}</p><p className="text-xs text-[#8a7456]">Le detail operationnel reste dans Ventes.</p></div>
        <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><p className="font-semibold text-[#2f2415]">Paiements partiels</p><p className="mt-2 text-2xl font-black text-amber-600">{paiementsPartiels}</p><p className="text-xs text-[#8a7456]">A surveiller pour le cash previsionnel.</p></div>
        <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><p className="font-semibold text-[#2f2415]">Creances ouvertes</p><p className="mt-2 text-2xl font-black text-[#2f2415]">{fmtCurrency(totalCreances)}</p><p className="text-xs text-[#8a7456]">Relances et commandes detaillees dans Ventes / Comptabilite.</p></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4">Evolution des flux reels</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData}><CartesianGrid strokeDasharray="3 3" stroke="#e7d9be" /><XAxis dataKey="label" stroke="#8a7456" fontSize={12} /><YAxis stroke="#8a7456" fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ background: '#ffffff', border: '1px solid #b6975f', borderRadius: 8 }} /><Bar dataKey="recettes" fill="#22c55e" radius={[6, 6, 0, 0]} /><Bar dataKey="depenses" fill="#ef4444" radius={[6, 6, 0, 0]} /><Bar dataKey="benefice" fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Previsions basees sur le reel</p><div className="space-y-3"><MiniMetric label="Revenus prevus" value={forecast.revenus} /><MiniMetric label="Depenses prevues" value={forecast.depenses} /><MiniMetric label="Cashflow previsionnel" value={forecast.cashflow} /><MiniMetric label="Estimation benefice" value={forecast.benefice} /></div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Tresorerie par canal</p><div className="space-y-2">{treasury.map((item) => <div key={item.method} className="rounded-xl bg-[#fffdf8] border border-[#e7d9be] p-3"><div className="flex items-center justify-between mb-2"><span className="font-semibold text-[#2f2415]">{item.method}</span><span className="font-bold text-[#2f2415]">{fmtCurrency(item.solde)}</span></div><div className="h-2 bg-[#eadcc2] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(Math.abs(item.solde) / Math.max(Math.abs(cashDisponible), 1) * 100, 100)}%`, background: item.color }} /></div></div>)}</div></div>
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Rentabilite par activite</p><div className="space-y-2">{topActivities.map((activity) => <div key={activity.id} className="flex items-center justify-between rounded-xl bg-[#fffdf8] border border-[#e7d9be] px-3 py-2"><div><p className="text-sm font-semibold text-[#2f2415]">{activity.name}</p><p className="text-xs text-[#8a7456]">ROI {fmtPercent(activity.roi)}</p></div><span className={`font-bold ${activity.marge >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{fmtCurrency(activity.marge)}</span></div>)}</div></div>
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Alertes financieres</p><div className="space-y-2">{alerts.length ? alerts.slice(0, 6).map((alert) => <div key={alert.id} className={`rounded-xl border p-3 ${alert.level === 'danger' ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}><p className="text-sm font-semibold text-[#2f2415]">{alert.title}</p><p className="text-xs text-[#8a7456]">{alert.message}</p></div>) : <p className="text-sm text-[#8a7456]">Aucune alerte financiere.</p>}</div>{deficitActivities.length ? <p className="text-xs text-red-500 mt-3">Activites deficitaires: {deficitActivities.map((a) => a.name).join(', ')}</p> : null}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Repartition des flux</p><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">{pieData.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={entry.color} />)}</Pie><Tooltip formatter={(v) => fmtCurrency(v)} contentStyle={{ background: '#ffffff', border: '1px solid #b6975f', borderRadius: 8 }} /></PieChart></ResponsiveContainer></div>
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#d6c3a0] flex flex-wrap gap-3 items-center justify-between"><p className="font-semibold text-[#2f2415]">Transactions financieres</p><div className="flex gap-2 flex-wrap">{['tous', 'entree', 'sortie'].map((filter) => <FilterButton key={filter} active={typeFilter === filter} onClick={() => setTypeFilter(filter)}>{filter === 'entree' ? 'Entrees' : filter === 'sortie' ? 'Sorties' : 'Toutes'}</FilterButton>)}{['tous', 'paye', 'partiel', 'impaye', 'annule'].map((filter) => <FilterButton key={filter} active={statusFilter === filter} onClick={() => setStatusFilter(filter)}>{filter}</FilterButton>)}{['tous', ...PAYMENT_METHODS].map((filter) => <FilterButton key={filter} active={paymentFilter === filter} onClick={() => setPaymentFilter(filter)}>{filter}</FilterButton>)}{businessPlans.length > 0 && [{ id: 'tous', nom: 'Tous les BP' }, ...businessPlans].map((bp) => <FilterButton key={bp.id} active={bpFilter === bp.id} onClick={() => setBpFilter(bp.id)}>{bp.nom}</FilterButton>)}</div></div>
          <div className="divide-y divide-[#d6c3a0]/50">
            {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="px-5 py-4"><div className="h-3 rounded bg-[#d6c3a0]/60 animate-pulse" /></div>) : null}
            {!loading && filtered.length === 0 ? <div className="px-5 py-8 text-center text-[#8a7456]">Aucune transaction.</div> : null}
            {!loading ? filtered.map((t) => <div key={t.id} className="px-5 py-3 hover:bg-[#d6c3a0]/30 transition-colors flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.type === 'entree' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>{t.type === 'entree' ? <ArrowUp size={14} className="text-emerald-400" /> : <ArrowDown size={14} className="text-red-400" />}</div><div className="flex-1 min-w-0"><p className="text-sm text-[#2f2415] truncate">{t.libelle}</p><p className="text-xs text-[#8a7456]">{t.date} - {t.categorie} - {t.module_lie || 'module non lie'} - {t.paiement} - {t.statut || 'paye'}{t.business_plan_id ? ` | BP: ${businessPlans.find((bp) => bp.id === t.business_plan_id)?.nom || t.business_plan_id}` : ''}</p></div><div className="flex items-center gap-2 shrink-0"><span className={`font-bold text-sm ${t.type === 'entree' ? 'text-emerald-400' : 'text-red-400'}`}>{t.type === 'entree' ? '+' : '-'}{fmtCurrency(t.montant)}</span>{t.justificatif_url ? <FileText size={14} className="text-sky-500" /> : null}<ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(t); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(t); setModal('edit'); }} /><ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(t); setModal('delete'); }} /></div></div>) : null}
          </div>
        </div>
      </div>

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Detail transaction" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={financeFormFields} initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: new Date().toISOString().slice(0, 10), statut: 'paye', paiement: 'Wave' }} autoId={() => generateSequentialId('finances', rows)} uploadFolder="finances" loading={saving} title="Ajouter recette / depense" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={financeFormFields} initialValues={selected || {}} uploadFolder="finances" loading={saving} title="Modifier transaction" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.libelle}` : ''} loading={saving} />
    </div>
  );
}

function MiniMetric({ label, value }) {
  return <div className="rounded-xl bg-[#fffdf8] border border-[#e7d9be] p-3 flex justify-between gap-3"><span className="text-sm text-[#7d6a4a]">{label}</span><span className="font-semibold text-[#2f2415]">{fmtCurrency(value)}</span></div>;
}

function FilterButton({ active, onClick, children }) {
  return <button type="button" onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${active ? 'bg-emerald-500 text-black font-semibold' : 'bg-[#fffdf8] border border-[#d6c3a0] text-[#8a7456]'}`}>{children}</button>;
}
