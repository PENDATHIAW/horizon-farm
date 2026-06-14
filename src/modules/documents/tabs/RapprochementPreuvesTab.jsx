import { ShieldCheck } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../../utils/format';
import DocumentsWorkflowBridge from '../DocumentsWorkflowBridge.jsx';
import { Empty, Section, Stat, amountOf, dateOf, labelOf } from '../documentsModuleUi.jsx';

export default function RapprochementPreuvesTab({
  props,
  data,
  onNavigate,
  onAttachProof,
  busyId,
  onLinked,
  navigateDocuments,
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Preuves" value={fmtNumber(data.proofs.length)} tone="good" />
        <Stat label="Sans preuve" value={fmtNumber(data.missingProof.length)} tone={data.missingProof.length ? 'warn' : 'good'} />
        <Stat label="Montant à justifier" value={fmtCurrency(data.missingProofAmount)} tone={data.missingProofAmount ? 'warn' : 'good'} />
        <Stat label="Écarts" value={fmtNumber(data.gaps.length)} tone={data.gaps.length ? 'warn' : 'good'} />
      </div>
      <DocumentsWorkflowBridge
        props={props}
        documents={data.documents}
        transactions={data.transactions}
        salesOrders={data.salesOrders}
        payments={data.payments}
        invoices={data.invoices}
        stocks={data.stocks}
        healthRecords={data.healthRecords}
        equipment={data.equipment}
        cultures={data.cultures}
        onLinked={onLinked}
        onOpenProofsTab={() => navigateDocuments?.('Rapprochement & preuves')}
      />
      <Section icon={ShieldCheck} title="Transactions sans preuve">
        {data.missingProof.length ? data.missingProof.slice(0, 14).map((row) => (
          <div key={row.id || labelOf(row)} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} className="text-left">
              <b className="text-[#2f2415]">{labelOf(row)}</b>
              <p className="text-xs text-[#8a7456]">{dateOf(row)} · preuve à joindre</p>
            </button>
            <div className="flex gap-2">
              <span className="text-sm font-black text-amber-700">{fmtCurrency(amountOf(row))}</span>
              <button type="button" disabled={busyId === row.id} onClick={() => onAttachProof?.({ id: row.id, title: labelOf(row), amount: amountOf(row), trxId: row.id })} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === row.id ? '…' : 'Tâche'}</button>
            </div>
          </div>
        )) : <Empty label="Aucune preuve manquante détectée." />}
      </Section>
    </div>
  );
}
