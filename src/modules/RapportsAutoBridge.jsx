import { BarChart2, CheckCircle2, FileText, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const monthKey = () => today().slice(0, 7);
const clean = (value) => String(value || '').trim();
const reportKey = (type, period) => `auto_report:${type}:${period}`;
const money = (value) => toNumber(value);

function activeCount(row = {}) {
  return Math.max(0, toNumber(row.current_count ?? row.effectif_actuel ?? row.initial_count ?? 0) - toNumber(row.mortality ?? row.morts) - toNumber(row.vendus) - toNumber(row.reformes) - toNumber(row.sorties));
}

function totalSales(orders = []) {
  return arr(orders).reduce((sum, order) => sum + money(order.montant_total ?? order.total ?? order.amount), 0);
}

function totalPaid(payments = [], orders = []) {
  const paymentSum = arr(payments).reduce((sum, payment) => sum + money(payment.montant_paye ?? payment.montant ?? payment.amount), 0);
  const orderPaid = arr(orders).reduce((sum, order) => sum + money(order.montant_paye ?? order.paid_amount), 0);
  return Math.max(paymentSum, orderPaid);
}

function reportContent(data = {}) {
  const sales = totalSales(data.salesOrders);
  const paid = totalPaid(data.payments, data.salesOrders);
  const stockValue = arr(data.stocks).reduce((sum, row) => sum + money(row.quantite) * money(row.prixUnit ?? row.prixunit ?? row.prix_unitaire), 0);
  const stockCritical = arr(data.stocks).filter((row) => money(row.seuil) > 0 && money(row.quantite) <= money(row.seuil)).length;
  const animals = arr(data.animaux).length;
  const sickAnimals = arr(data.animaux).filter((row) => ['malade', 'sous_traitement'].includes(clean(row.health_status || row.statut_sante).toLowerCase())).length;
  const avicoleActive = arr(data.lots).reduce((sum, row) => sum + activeCount(row), 0);
  const healthCost = arr(data.sante).reduce((sum, row) => sum + money(row.cout_intervention ?? row.cout ?? row.amount), 0);
  const cultures = arr(data.cultures).filter((row) => !['parcelle', 'campagne', 'performance'].includes(clean(row.record_type || row.type_fiche).toLowerCase()));
  const cultureRevenue = cultures.reduce((sum, row) => sum + money(row.revenu_reel || row.revenu_estime), 0);
  const financeIn = arr(data.transactions).filter((row) => clean(row.type).toLowerCase() === 'entree').reduce((sum, row) => sum + money(row.montant), 0);
  const financeOut = arr(data.transactions).filter((row) => clean(row.type).toLowerCase() === 'sortie').reduce((sum, row) => sum + money(row.montant), 0);
  const margin = Math.max(sales, financeIn) - financeOut;
  return {
    sales,
    paid,
    receivables: Math.max(0, sales - paid),
    stockValue,
    stockCritical,
    animals,
    sickAnimals,
    avicoleActive,
    healthCost,
    cultures: cultures.length,
    cultureRevenue,
    financeIn,
    financeOut,
    margin,
    summary: [
      `Ventes: ${fmtCurrency(sales)} dont encaissé ${fmtCurrency(paid)}.`,
      `Créances estimées: ${fmtCurrency(Math.max(0, sales - paid))}.`,
      `Stock: ${fmtCurrency(stockValue)} avec ${stockCritical} produit(s) critique(s).`,
      `Animaux: ${fmtNumber(animals)} animal(aux), ${fmtNumber(sickAnimals)} malade(s).`,
      `Avicole: ${fmtNumber(avicoleActive)} sujet(s) actifs.`,
      `Cultures: ${fmtNumber(cultures.length)} culture(s), revenu estimé/réel ${fmtCurrency(cultureRevenue)}.`,
      `Santé: coûts renseignés ${fmtCurrency(healthCost)}.`,
      `Marge pilotage estimée: ${fmtCurrency(margin)}.`,
    ].join('\n'),
  };
}

function existingReport(rows = [], type, period) {
  const key = reportKey(type, period);
  return arr(rows).find((row) => clean(row.report_key) === key || (clean(row.report_type) === type && clean(row.period) === period));
}

export default function RapportsAutoBridge({ rows = [], data = {}, onCreate, onUpdate, onRefresh, onCreateDocument, onRefreshDocuments, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [saving, setSaving] = useState('');
  const period = monthKey();
  const content = useMemo(() => reportContent(data), [data]);
  const monthly = existingReport(rows, 'mensuel_erp', period);
  const weekly = existingReport(rows, 'hebdo_erp', today());

  const generate = async (type, selectedPeriod) => {
    try {
      setSaving(type);
      const existing = existingReport(rows, type, selectedPeriod);
      const reportId = existing?.id || makeId('RPT');
      const docId = makeId('DOC');
      const payload = {
        id: reportId,
        title: type === 'mensuel_erp' ? `Rapport mensuel ERP ${selectedPeriod}` : `Rapport hebdo ERP ${selectedPeriod}`,
        report_type: type,
        period: selectedPeriod,
        status: 'genere',
        channel: 'PDF',
        report_key: reportKey(type, selectedPeriod),
        generated_at: now(),
        summary: content.summary,
        sales_total: content.sales,
        paid_total: content.paid,
        receivables_total: content.receivables,
        stock_value: content.stockValue,
        stock_critical_count: content.stockCritical,
        margin_estimated: content.margin,
      };
      if (existing?.id && onUpdate) await onUpdate(existing.id, payload);
      else await onCreate?.(payload);
      await onCreateDocument?.({ id: docId, title: payload.title, document_category: 'rapport', module_source: 'rapports', entity_type: 'rapport', entity_id: reportId, related_id: reportId, content: content.summary, status: 'genere', generated_at: now() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'rapport_erp_genere', module_source: 'rapports', entity_type: 'rapport', entity_id: reportId, title: payload.title, description: `${fmtCurrency(content.sales)} ventes · ${fmtCurrency(content.margin)} marge`, event_date: today(), severity: 'info', linked_document_id: docId, saisies_evitees: 6 });
      await Promise.allSettled([onRefresh?.(), onRefreshDocuments?.(), onRefreshBusinessEvents?.()]);
      toast.success(existing ? 'Rapport mis à jour' : 'Rapport généré');
    } catch {
      toast.error('Génération rapport impossible');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Rapports automatiques</p>
          <h3 className="font-black text-[#2f2415]">Synthèse ERP prête à générer</h3>
          <p className="text-sm text-[#8a7456] mt-1">Les données connectées alimentent ventes, finances, stock, santé, cultures, animaux et avicole.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2"><BarChart2 size={14} className="inline" /> {fmtCurrency(content.sales)}</div>
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2"><FileText size={14} className="inline" /> {fmtCurrency(content.margin)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Metric label="Ventes" value={fmtCurrency(content.sales)} />
        <Metric label="Encaissements" value={fmtCurrency(content.paid)} />
        <Metric label="Stock critique" value={content.stockCritical} />
        <Metric label="Marge estimée" value={fmtCurrency(content.margin)} />
      </div>
      <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a] whitespace-pre-line">{content.summary}</div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={saving === 'hebdo_erp'} className="rounded-xl bg-[#c9a96a] px-4 py-2 text-sm font-bold text-white disabled:opacity-60" onClick={() => generate('hebdo_erp', today())}>{saving === 'hebdo_erp' ? <RefreshCw size={14} className="inline animate-spin" /> : <CheckCircle2 size={14} className="inline" />} {weekly ? 'Mettre à jour hebdo' : 'Générer hebdo'}</button>
        <button type="button" disabled={saving === 'mensuel_erp'} className="rounded-xl border border-[#d6c3a0] px-4 py-2 text-sm font-bold text-[#2f2415] disabled:opacity-60" onClick={() => generate('mensuel_erp', period)}>{saving === 'mensuel_erp' ? <RefreshCw size={14} className="inline animate-spin" /> : <FileText size={14} className="inline" />} {monthly ? 'Mettre à jour mensuel' : 'Générer mensuel'}</button>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415]">{value}</p></div>;
}
