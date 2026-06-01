import { Sprout } from 'lucide-react';
import { useMemo } from 'react';
import { auditCultureWorkflow, summarizeCultureWorkflow } from '../services/cultureWorkflowBridgeService';
import { fmtCurrency, fmtNumber } from '../utils/format';

export default function CultureWorkflowBridgePanel({ cultures = [], stocks = [], salesOrders = [], businessEvents = [], onNavigate }) {
  const audit = useMemo(() => auditCultureWorkflow({ cultures, stocks, salesOrders, businessEvents }), [cultures, stocks, salesOrders, businessEvents]);
  const summary = useMemo(() => summarizeCultureWorkflow(audit), [audit]);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]">
            <Sprout size={14} /> Chaîne cultures
          </p>
          <h3 className="mt-3 text-xl font-black text-[#2f2415]">Récolte → Stock → Vente</h3>
          <p className="mt-1 text-sm text-[#8a7456]">{summary.coherent} culture(s) cohérente(s) · {summary.withGaps} écart(s) détecté(s)</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415]">Ouvrir ventes</button>
      </div>
      {summary.rows.length ? summary.rows.map((row) => (
        <div key={row.cultureId} className={`rounded-2xl border p-3 text-sm ${row.gaps.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-center justify-between gap-2">
            <b className="text-[#2f2415]">{row.label}</b>
            <span className="text-xs font-black">{row.gaps.length ? `${row.gaps.length} écart(s)` : 'OK'}</span>
          </div>
          <p className="mt-1 text-xs text-[#8a7456]">
            Récolte {fmtNumber(row.harvestedQty)} · Stock {fmtNumber(row.stockQty)} · Vendu {fmtNumber(row.soldQty)} ({fmtCurrency(row.soldAmount)})
          </p>
        </div>
      )) : (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune culture à auditer.</div>
      )}
    </section>
  );
}
