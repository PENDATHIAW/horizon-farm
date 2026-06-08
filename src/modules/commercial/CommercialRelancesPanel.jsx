import { MessageCircle } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { whatsAppStatusLabel } from '../../utils/whatsappCommercial.js';

export default function CommercialRelancesPanel({
  rows = [],
  onOpenClient,
  onPrepareWhatsApp,
}) {
  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#8a7456] flex items-center gap-2">
            <MessageCircle size={14} className="text-[#25D366]" />
            Relances clients
          </p>
          <p className="text-sm text-[#8a7456]">Priorité, canal et message proposé — envoi manuel uniquement.</p>
        </div>
        <span className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#2f2415]">
          {rows.length}
        </span>
      </div>
      <div className="space-y-2">
        {rows.slice(0, 6).map((row) => (
          <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${row.priority === 'Urgent' ? 'bg-red-100 text-red-800' : row.priority === 'Prioritaire' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'}`}>
                    {row.priority}
                  </span>
                  <span className="text-xs font-bold text-[#8a7456]">{row.type}</span>
                  <span className="text-xs text-[#8a7456]">{row.channel}</span>
                </div>
                <p className="mt-1 font-black text-[#2f2415]">{row.clientName}</p>
                <p className="text-xs text-[#8a7456]">
                  {fmtCurrency(row.amount)}
                  {row.overdueDays != null ? ` · ${row.overdueDays} j` : ''}
                  {row.segment ? ` · ${row.segment}` : ''}
                </p>
                <p className="mt-2 text-xs text-[#7d6a4a] italic">&ldquo;{row.message}&rdquo;</p>
                <p className="mt-1 text-[11px] font-bold text-[#9a6b12]">{row.recommendedAction}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                {onOpenClient ? (
                  <button type="button" onClick={() => onOpenClient(row.clientId)} className="rounded-lg border border-[#eadcc2] bg-white px-2 py-1 text-[11px] font-black text-[#2f2415]">
                    Client
                  </button>
                ) : null}
                {onPrepareWhatsApp && row.channel === 'WhatsApp' ? (
                  <button
                    type="button"
                    onClick={() => onPrepareWhatsApp(row)}
                    className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-2 py-1 text-[11px] font-black text-[#128C7E]"
                  >
                    Préparer WhatsApp
                  </button>
                ) : null}
                {row.whatsappStatus ? (
                  <span className="self-center text-[10px] font-bold text-[#8a7456]">
                    {whatsAppStatusLabel(row.whatsappStatus)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
