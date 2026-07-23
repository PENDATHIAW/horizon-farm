import { MessageCircle } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';
import { whatsAppStatusLabel } from '../../utils/whatsappCommercial.js';

export default function CommercialRelancesPanel({
  rows = [],
  onOpenClient,
  onPrepareWhatsApp,
  onSchedule,
}) {
  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-slate flex items-center gap-2">
            <MessageCircle size={14} className="text-positive" />
            Relances clients
          </p>
          <p className="text-sm text-slate">Priorité, canal et message proposé - envoi manuel uniquement.</p>
        </div>
        <span className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-earth">
          {rows.length}
        </span>
      </div>
      <div className="space-y-2">
        {rows.slice(0, 6).map((row) => (
          <div key={row.id} className="rounded-xl border border-line bg-card p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-meta font-semibold ${row.priority === 'Urgent' ? 'bg-urgent-bg text-urgent' : row.priority === 'Prioritaire' ? 'bg-vigilance-bg text-horizon-dark' : 'bg-neutral-bg text-neutral'}`}>
                    {row.priority}
                  </span>
                  <span className="text-xs font-semibold text-slate">{row.type}</span>
                  <span className="text-xs text-slate">{row.channel}</span>
                </div>
                <p className="mt-1 font-semibold text-earth">{row.clientName}</p>
                <p className="text-xs text-slate">
                  {fmtCurrency(row.amount)}
                  {row.overdueDays != null ? ` · ${row.overdueDays} j` : ''}
                  {row.segment ? ` · ${row.segment}` : ''}
                </p>
                <p className="mt-2 text-xs text-slate italic">&ldquo;{row.message}&rdquo;</p>
                <p className="mt-1 text-meta font-semibold text-horizon-dark">{row.recommendedAction}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-1">
                {onOpenClient ? (
                  <button type="button" onClick={() => onOpenClient(row.clientId)} className="rounded-lg border border-line bg-white px-2 py-1 text-meta font-semibold text-earth">
                    Client
                  </button>
                ) : null}
                {onPrepareWhatsApp && row.channel === 'WhatsApp' ? (
                  <button
                    type="button"
                    onClick={() => onPrepareWhatsApp(row)}
                    className="rounded-lg border border-positive/40 bg-positive/10 px-2 py-1 text-meta font-semibold text-positive"
                  >
                    Préparer WhatsApp
                  </button>
                ) : null}
                {onSchedule ? (
                  <button
                    type="button"
                    onClick={() => onSchedule(row)}
                    className="rounded-lg border border-earth px-2 py-1 text-meta font-semibold text-earth"
                  >
                    {row.scheduled ? `Planifiée ${row.scheduledDate}` : 'Planifier'}
                  </button>
                ) : null}
                {row.whatsappStatus ? (
                  <span className="self-center text-meta font-semibold text-slate">
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
