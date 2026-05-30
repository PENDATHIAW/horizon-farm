import { BarChart3, PiggyBank, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleListHub from '../components/module/ModuleListHub.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { runErpHealthEngine } from '../services/erpHealthEngine';
import { fmtCurrency, fmtNumber } from '../utils/format';
import FinancesV12 from './FinancesV12';
import InvestissementsV9 from './InvestissementsV9';

const arr = (v) => Array.isArray(v) ? v : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.valeur ?? r.value);
const isIncome = (r = {}) => ['entree', 'entrée', 'income', 'recette', 'vente'].includes(low(r.type || r.nature || r.sens || r.transaction_type));
const isExpense = (r = {}) => ['sortie', 'expense', 'depense', 'dépense', 'achat', 'charge'].includes(low(r.type || r.nature || r.sens || r.transaction_type));
const isUnpaid = (r = {}) => ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(low(r.statut || r.status || r.payment_status));
const isReceivable = (r = {}) => isUnpaid(r) && (['vente', 'client', 'recette'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.client_id);
const isPayable = (r = {}) => isUnpaid(r) && (['achat', 'fournisseur', 'depense', 'dépense', 'charge'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.fournisseur_id);
const remainingOf = (order = {}, payments = []) => Math.max(0, n(order.montant_total ?? order.total ?? order.amount) - n(order.montant_paye ?? order.paid_amount) - payments.filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + n(p.montant ?? p.amount), 0));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);

function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="finance_pilotage" active={active} onChange={onChange} />;
}
function CreancesPanel({ data, onNavigate }) {
  return (
    <ModuleListHub
      title="Créances clients"
      intro="Ventes et encaissements restants à recouvrer."
      stats={[
        { label: 'Créances', value: fmtNumber(data.receivables.length), tone: data.receivables.length ? 'warn' : 'good' },
        { label: 'Montant', value: fmtCurrency(data.receivableAmount), tone: 'warn' },
        { label: 'Clients', value: fmtNumber(data.clients.length) },
        { label: 'Impayés finance', value: fmtNumber(data.unpaidTx.length), tone: data.unpaidTx.length ? 'warn' : 'good' },
      ]}
      rows={data.receivables.map((row) => ({
        id: row.id || row.title,
        title: row.title,
        detail: row.detail,
        value: fmtCurrency(row.amount),
        module: 'commercial',
      }))}
      emptyLabel="Aucune créance ouverte."
      onNavigate={onNavigate}
    />
  );
}
function DettesPanel({ data, onNavigate }) {
  return (
    <ModuleListHub
      title="Dettes fournisseurs"
      intro="Achats et charges restant à payer."
      stats={[
        { label: 'Dettes', value: fmtNumber(data.payables.length), tone: data.payables.length ? 'warn' : 'good' },
        { label: 'Montant', value: fmtCurrency(data.payableAmount), tone: 'warn' },
        { label: 'Fournisseurs', value: fmtNumber(data.suppliers.length) },
        { label: 'Dettes fiches', value: fmtCurrency(data.supplierDebt), tone: data.supplierDebt ? 'warn' : 'good' },
      ]}
      rows={data.payables.map((row) => ({
        id: row.id || row.title,
        title: row.title,
        detail: row.detail,
        value: fmtCurrency(row.amount),
        module: 'achats_stock',
      }))}
      emptyLabel="Aucune dette ouverte."
      onNavigate={onNavigate}
    />
  );
}
function RentabilitePanel({ data, onNavigate }) {
  return (
    <ModuleListHub
      title="Rentabilité"
      intro="Marges, charges et alertes de rentabilité détectées par le moteur ERP."
      stats={[
        { label: 'Marge nette', value: fmtCurrency(data.margin), tone: data.margin >= 0 ? 'good' : 'bad' },
        { label: 'Recettes', value: fmtCurrency(data.income), tone: 'good' },
        { label: 'Dépenses', value: fmtCurrency(data.expenses), tone: 'warn' },
        { label: 'Alertes renta.', value: fmtNumber(data.profitAlerts.length), tone: data.profitAlerts.length ? 'warn' : 'good' },
      ]}
      rows={data.profitAlerts.map((row) => ({
        id: row.id || row.title,
        title: row.title,
        detail: row.detail || row.recommended_action || '—',
        value: row.level || row.severity || 'Alerte',
        module: row.module || 'finance_pilotage',
      }))}
      emptyLabel="Aucune alerte de rentabilité détectée."
      onNavigate={onNavigate}
    />
  );
}
function Summary({ data, setTab }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-6"><Stat label="Solde" value={fmtCurrency(data.balance)} tone={data.balance >= 0 ? 'good' : 'bad'} /><Stat label="Recettes" value={fmtCurrency(data.income)} tone="good" /><Stat label="Dépenses" value={fmtCurrency(data.expenses)} tone={data.expenses ? 'warn' : 'neutral'} /><Stat label="Marge" value={fmtCurrency(data.margin)} tone={data.margin >= 0 ? 'good' : 'bad'} /><Stat label="Sans preuve" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} /><Stat label="Investissements" value={fmtNumber(data.investments.length)} /></div><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><BarChart3 size={20} /> Workflows financiers récupérés</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Finance & Pilotage remet les anciens moteurs : saisie finance Hey Horizon, trésorerie, santé comptable, preuves, business plan, paiement d’investissement, création d’actifs, documents et événements métier.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"><button type="button" onClick={() => setTab('Trésorerie')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Trésorerie</b><p className="mt-1 text-sm text-[#8a7456]">Recettes, dépenses, preuves, paiements, cohérence comptable.</p></button><button type="button" onClick={() => setTab('Investissements')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Investissements</b><p className="mt-1 text-sm text-[#8a7456]">Budget, projections, paiements, actifs et financeurs.</p></button><button type="button" onClick={() => setTab('Créances')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Créances</b><p className="mt-1 text-sm text-[#8a7456]">Restes à encaisser.</p></button><button type="button" onClick={() => setTab('Dettes')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Dettes</b><p className="mt-1 text-sm text-[#8a7456]">Charges et fournisseurs à payer.</p></button><button type="button" onClick={() => setTab('Rentabilité')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Rentabilité</b><p className="mt-1 text-sm text-[#8a7456]">Marges et alertes ERP.</p></button></div></section></div>;
}

export default function FinancePilotageRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const financesCrud = useCrudModule('finances');
  const investmentsCrud = useCrudModule('investissements');
  const businessPlansCrud = useCrudModule('business_plans');
  const bpInvestmentLinesCrud = useCrudModule('bp_investment_lines');
  const bpRecurringCostsCrud = useCrudModule('bp_recurring_costs');
  const bpRevenueProjectionsCrud = useCrudModule('bp_revenue_projections');
  const bpFundingSourcesCrud = useCrudModule('bp_funding_sources');
  const bpLinksCrud = useCrudModule('bp_links');
  const bpRisksCrud = useCrudModule('bp_risks');
  const documentsCrud = useCrudModule('documents');
  const eventsCrud = useCrudModule('business_events');
  const paymentsCrud = useCrudModule('payments');
  const salesCrud = useCrudModule('sales_orders');
  const clientsCrud = useCrudModule('clients');
  const suppliersCrud = useCrudModule('fournisseurs');
  const animalsCrud = useCrudModule('animaux');
  const lotsCrud = useCrudModule('avicole');
  const culturesCrud = useCrudModule('cultures');
  const equipementsCrud = useCrudModule('equipements');
  const stockCrud = useCrudModule('stock');
  const payments = rowsOf(props.payments, paymentsCrud);
  const salesOrders = rowsOf(props.salesOrders, salesCrud);
  const clients = rowsOf(props.clients, clientsCrud);
  const suppliers = rowsOf(props.fournisseurs, suppliersCrud);
  const transactions = rowsOf(props.transactions || props.finances || props.rows, financesCrud);
  const investments = rowsOf(props.investissements, investmentsCrud);
  const businessPlans = rowsOf(props.businessPlans, businessPlansCrud);
  const data = useMemo(() => {
    const income = transactions.filter(isIncome).reduce((s, r) => s + amount(r), 0);
    const expenses = transactions.filter((r) => isExpense(r) || (!isIncome(r) && amount(r) > 0)).reduce((s, r) => s + amount(r), 0);
    const unpaidTx = transactions.filter(isUnpaid);
    const unpaid = unpaidTx.reduce((s, r) => s + amount(r), 0);
    const missingProof = transactions.filter((r) => amount(r) > 0 && !hasProof(r)).length;
    const orderReceivables = salesOrders.map((order) => ({ id: order.id, title: order.client_nom || order.customer_name || 'Vente', detail: `${order.date || order.created_at || '—'} · commande`, amount: remainingOf(order, payments) })).filter((row) => row.amount > 0);
    const txReceivables = transactions.filter(isReceivable).map((row) => ({ id: row.id, title: row.libelle || row.title || 'Créance', detail: `${row.date || row.created_at || '—'} · finance`, amount: amount(row) }));
    const receivables = [...orderReceivables, ...txReceivables];
    const supplierDebt = suppliers.reduce((s, r) => s + n(r.dettes ?? r.dette ?? r.solde ?? r.balance), 0);
    const txPayables = transactions.filter(isPayable).map((row) => ({ id: row.id, title: row.libelle || row.title || 'Dette', detail: `${row.date || row.created_at || '—'} · finance`, amount: amount(row) }));
    const supplierPayables = suppliers.filter((r) => n(r.dettes ?? r.dette ?? r.solde) > 0).map((r) => ({ id: r.id, title: r.nom || r.name || 'Fournisseur', detail: 'Dette fournisseur', amount: n(r.dettes ?? r.dette ?? r.solde) }));
    const payables = [...txPayables, ...supplierPayables];
    const health = runErpHealthEngine({ transactions, salesOrders, payments, investissements: investments, stocks: rowsOf(props.stocks, stockCrud) });
    const profitAlerts = health.findings.filter((f) => f.category === 'rentabilite' || /marge|rentab|charge|coût|cout/.test(low(`${f.title || ''} ${f.detail || ''}`)));
    return {
      income,
      expenses,
      balance: income - expenses,
      margin: income - expenses,
      unpaid,
      unpaidTx,
      missingProof,
      investments,
      clients,
      suppliers,
      receivables,
      receivableAmount: receivables.reduce((s, r) => s + r.amount, 0),
      payables,
      payableAmount: payables.reduce((s, r) => s + r.amount, 0) + supplierDebt,
      supplierDebt,
      profitAlerts,
    };
  }, [transactions, investments, salesOrders, payments, clients, suppliers, props.stocks, stockCrud]);
  const financeProps = { rows: transactions, transactions, finances: transactions, documents: rowsOf(props.documents, documentsCrud), investissements: investments, salesOrders: rowsOf(props.salesOrders, salesCrud), payments: rowsOf(props.payments, paymentsCrud), fournisseurs: rowsOf(props.fournisseurs, suppliersCrud), clients: rowsOf(props.clients, clientsCrud), onCreate: props.onCreateFinanceTransaction || financesCrud.create, onUpdate: props.onUpdateFinanceTransaction || financesCrud.update, onDelete: props.onDeleteFinanceTransaction || financesCrud.remove, onRefresh: props.onRefreshFinances || financesCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  const investmentProps = { rows: investments, investissements: investments, businessPlans: rowsOf(props.businessPlans, businessPlansCrud), bpInvestmentLines: rowsOf(props.bpInvestmentLines, bpInvestmentLinesCrud), bpRecurringCosts: rowsOf(props.bpRecurringCosts, bpRecurringCostsCrud), bpRevenueProjections: rowsOf(props.bpRevenueProjections, bpRevenueProjectionsCrud), bpFundingSources: rowsOf(props.bpFundingSources, bpFundingSourcesCrud), bpLinks: rowsOf(props.bpLinks, bpLinksCrud), bpRisks: rowsOf(props.bpRisks, bpRisksCrud), transactions, lots: rowsOf(props.lots, lotsCrud), animaux: rowsOf(props.animaux, animalsCrud), cultures: rowsOf(props.cultures, culturesCrud), onCreate: props.onCreateInvestment || investmentsCrud.create, onUpdate: props.onUpdateInvestment || investmentsCrud.update, onDelete: props.onDeleteInvestment || investmentsCrud.remove, onRefresh: props.onRefreshInvestments || investmentsCrud.refresh, onCreateBusinessPlan: props.onCreateBusinessPlan || businessPlansCrud.create, onUpdateBusinessPlan: props.onUpdateBusinessPlan || businessPlansCrud.update, onDeleteBusinessPlan: props.onDeleteBusinessPlan || businessPlansCrud.remove, onRefreshBusinessPlans: props.onRefreshBusinessPlans || businessPlansCrud.refresh, onCreateBpInvestmentLine: props.onCreateBpInvestmentLine || bpInvestmentLinesCrud.create, onUpdateBpInvestmentLine: props.onUpdateBpInvestmentLine || bpInvestmentLinesCrud.update, onDeleteBpInvestmentLine: props.onDeleteBpInvestmentLine || bpInvestmentLinesCrud.remove, onRefreshBpInvestmentLines: props.onRefreshBpInvestmentLines || bpInvestmentLinesCrud.refresh, onCreateBpRecurringCost: props.onCreateBpRecurringCost || bpRecurringCostsCrud.create, onUpdateBpRecurringCost: props.onUpdateBpRecurringCost || bpRecurringCostsCrud.update, onDeleteBpRecurringCost: props.onDeleteBpRecurringCost || bpRecurringCostsCrud.remove, onRefreshBpRecurringCosts: props.onRefreshBpRecurringCosts || bpRecurringCostsCrud.refresh, onCreateBpRevenueProjection: props.onCreateBpRevenueProjection || bpRevenueProjectionsCrud.create, onUpdateBpRevenueProjection: props.onUpdateBpRevenueProjection || bpRevenueProjectionsCrud.update, onDeleteBpRevenueProjection: props.onDeleteBpRevenueProjection || bpRevenueProjectionsCrud.remove, onRefreshBpRevenueProjections: props.onRefreshBpRevenueProjections || bpRevenueProjectionsCrud.refresh, onCreateBpFundingSource: props.onCreateBpFundingSource || bpFundingSourcesCrud.create, onUpdateBpFundingSource: props.onUpdateBpFundingSource || bpFundingSourcesCrud.update, onDeleteBpFundingSource: props.onDeleteBpFundingSource || bpFundingSourcesCrud.remove, onRefreshBpFundingSources: props.onRefreshBpFundingSources || bpFundingSourcesCrud.refresh, onCreateBpLink: props.onCreateBpLink || bpLinksCrud.create, onUpdateBpLink: props.onUpdateBpLink || bpLinksCrud.update, onDeleteBpLink: props.onDeleteBpLink || bpLinksCrud.remove, onRefreshBpLinks: props.onRefreshBpLinks || bpLinksCrud.refresh, onCreateBpRisk: props.onCreateBpRisk || bpRisksCrud.create, onUpdateBpRisk: props.onUpdateBpRisk || bpRisksCrud.update, onDeleteBpRisk: props.onDeleteBpRisk || bpRisksCrud.remove, onRefreshBpRisks: props.onRefreshBpRisks || bpRisksCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || documentsCrud.create, onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh, onCreateLot: props.onCreateLot || lotsCrud.create, onRefreshLots: props.onRefreshLots || lotsCrud.refresh, onCreateAnimal: props.onCreateAnimal || animalsCrud.create, onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh, onCreateCulture: props.onCreateCulture || culturesCrud.create, onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh, onCreateEquipement: props.onCreateEquipement || equipementsCrud.create, onRefreshEquipements: props.onRefreshEquipements || equipementsCrud.refresh, onCreateStock: props.onCreateStock || stockCrud.create, onRefreshStock: props.onRefreshStock || stockCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Pilotage</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Finance & Pilotage</h1><p className="mt-1 text-sm text-[#8a7456]">Trésorerie, créances, dettes, investissements, rentabilité et graphiques.</p></section><Tabs active={tab} onChange={setTab} />{tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Trésorerie' ? <FinancesV12 {...financeProps} /> : tab === 'Créances' ? <CreancesPanel data={data} onNavigate={props.onNavigate} /> : tab === 'Dettes' ? <DettesPanel data={data} onNavigate={props.onNavigate} /> : tab === 'Investissements' ? <InvestissementsV9 {...investmentProps} /> : tab === 'Rentabilité' ? <RentabilitePanel data={data} onNavigate={props.onNavigate} /> : <ModuleGraphiquesTab moduleId="finance_pilotage" transactions={transactions} payments={payments} salesOrders={salesOrders} investissements={investments} businessPlans={businessPlans} onNavigate={props.onNavigate} />}</div>;
}
