import { AlertTriangle, CheckCircle2, RefreshCw, Scale, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { auditBusinessChargeGaps, syncBusinessChargesToFinance } from '../services/businessChargeSyncService.js';
import { buildConsolidationInput, consolidateFinance } from '../utils/financeConsolidationEngine.js';
import { fmtCurrency } from '../utils/format.js';

export default function BusinessChargeSyncPanel(props) {
  const [busy, setBusy] = useState(false);
  const input = useMemo(() => buildConsolidationInput(props), [props]);
  const audit = useMemo(() => auditBusinessChargeGaps({
    finances: input.transactions,
    transactions: input.transactions,
    salesOrders: input.salesOrders,
    payments: input.payments,
    fournisseurs: input.fournisseurs,
    stocks: input.stocks,
    animaux: input.animaux,
    lots: input.lots,
    cultures: input.cultures,
    sante: input.sante,
    alimentationLogs: input.alimentationLogs,
    investissements: input.investissements,
    businessEvents: input.businessEvents,
  }), [input]);
  const finance = useMemo(() => consolidateFinance(input), [input]);

  const sync = async () => {
    if (busy) return;
    if (!audit.gaps.length) return toast.success('Charges métier déjà visibles en finance');
    try {
      setBusy(true);
      const result = await syncBusinessChargesToFinance({
        data: {
          finances: input.transactions,
          salesOrders: input.salesOrders,
          payments: input.payments,
          fournisseurs: input.fournisseurs,
          stocks: input.stocks,
          animaux: input.animaux,
          lots: input.lots,
          cultures: input.cultures,
          sante: input.sante,
          alimentationLogs: input.alimentationLogs,
          investissements: input.investissements,
          businessEvents: input.businessEvents,
        },
        handlers: {
          onCreateFinanceTransaction: props.onCreateFinanceTransaction,
          onRefreshFinances: props.onRefreshFinances,
        },
      });
      toast.success(`${result.created} charge(s) métier synchronisée(s) vers Finances/Comptabilité`);
    } catch (error) {
      toast.error(error.message || 'Synchronisation charges impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-slate">
            <Scale size={14} /> Charges métier
          </p>
          <h3 className="mt-3 text-xl font-semibold text-earth">Synchroniser coûts métier → Finances</h3>
          <p className="mt-1 text-sm text-slate">
            Alimentation, santé, élevage, cultures et investissements alimentent la comptabilité sans double saisie manuelle.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || !audit.gaps.length}
          onClick={sync}
          className="rounded-xl bg-earth px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <RefreshCw size={14} className="inline animate-spin" /> : <Wrench size={14} className="inline" />}
          {' '}
          Synchroniser charges
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Charges métier" value={fmtCurrency(finance.chargesMetier || 0)} />
        <Metric label="Déjà comptabilisées" value={fmtCurrency(finance.chargesComptabilisees || 0)} good />
        <Metric label="À synchroniser" value={fmtCurrency(audit.totalMissing || 0)} warn={audit.totalMissing > 0} />
        <Metric label="Catégories manquantes" value={audit.gaps.length} warn={audit.gaps.length > 0} />
      </div>

      {audit.gaps.length ? (
        <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 space-y-2">
          <p className="font-semibold text-horizon-dark flex items-center gap-2"><AlertTriangle size={16} /> Coûts visibles en modules mais absents des lignes finance</p>
          {audit.gaps.map((gap) => (
            <div key={gap.key} className="flex items-center justify-between rounded-xl border border-vigilance bg-white px-3 py-2 text-sm">
              <span className="font-semibold text-earth">{gap.label}</span>
              <span className="font-semibold text-horizon-dark">{fmtCurrency(gap.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm font-semibold text-positive">
          <CheckCircle2 size={14} className="inline" /> Charges métier alignées avec Finances et Comptabilité.
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, warn = false, good = false }) {
  const cls = warn ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : good ? 'border-positive bg-positive-bg text-positive' : 'border-line bg-card text-earth';
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <p className="text-xs uppercase tracking-normal opacity-80">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
