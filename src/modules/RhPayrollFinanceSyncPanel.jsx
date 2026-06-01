import { RefreshCw, Users, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { auditRhPayrollFinanceGaps, syncRhPayrollToFinance } from '../services/rhPayrollFinanceSyncService.js';
import { fmtCurrency } from '../utils/format.js';
import { getRhDirectory } from '../utils/rhDirectory.js';

export default function RhPayrollFinanceSyncPanel({
  team = [],
  transactions = [],
  onCreateFinanceTransaction,
  onCreateDocument,
  onCreateBusinessEvent,
  onRefreshFinances,
  onRefreshDocuments,
  onRefreshBusinessEvents,
}) {
  const [busy, setBusy] = useState(false);
  const audit = useMemo(() => auditRhPayrollFinanceGaps({ rh: team, transactions }), [team, transactions]);

  const sync = async () => {
    if (busy) return;
    if (!audit.gaps.length) return toast.success('Salaires déjà reflétés en Finances');
    try {
      setBusy(true);
      const result = await syncRhPayrollToFinance({
        data: { rh: team, transactions },
        teams: getRhDirectory(),
        handlers: {
          onCreateFinanceTransaction,
          onCreateDocument,
          onCreateBusinessEvent,
          onRefreshFinances,
          onRefreshDocuments,
          onRefreshBusinessEvents,
        },
      });
      toast.success(`${result.created} ligne(s) salaire synchronisée(s)`);
    } catch (error) {
      toast.error(error.message || 'Synchronisation RH impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]">
            <Users size={14} /> RH ↔ Finances
          </p>
          <h3 className="mt-3 text-xl font-black text-[#2f2415]">Paie du mois ({audit.period})</h3>
          <p className="mt-1 text-sm text-[#8a7456]">Chaque salaire actif doit générer une écriture Finances traçable.</p>
        </div>
        <button type="button" disabled={busy || !audit.gaps.length || !onCreateFinanceTransaction} onClick={sync} className="rounded-xl bg-[#2f2415] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
          {busy ? <RefreshCw size={14} className="inline animate-spin" /> : <Wrench size={14} className="inline" />}
          {' '}
          Synchroniser salaires
        </button>
      </div>
      {audit.gaps.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-black text-amber-900">{audit.gaps.length} salaire(s) sans écriture · {fmtCurrency(audit.totalMissing)}</p>
          {audit.gaps.slice(0, 6).map((gap) => (
            <div key={gap.dedupeKey} className="flex items-center justify-between rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm">
              <span className="font-bold text-[#2f2415]">{gap.label}</span>
              <span className="font-black text-amber-800">{fmtCurrency(gap.amount)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">Paie alignée avec Finances.</div>
      )}
    </section>
  );
}
