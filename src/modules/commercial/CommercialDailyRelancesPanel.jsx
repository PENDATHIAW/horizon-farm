import { useMemo, useState } from 'react';
import { CalendarClock, MessageCircle, Sparkles } from 'lucide-react';
import { buildDailyRelanceBatchSync } from '../../services/relanceAutomation.js';
import { fmtCurrency } from '../../utils/format';

const priorityClass = (p) => p === 'Urgent'
  ? 'bg-urgent-bg text-urgent'
  : p === 'Prioritaire'
    ? 'bg-vigilance-bg text-horizon-dark'
    : 'bg-neutral-bg text-neutral';

/**
 * Relances du jour : détecte les créances échues, propose un message déjà rédigé
 * et un envoi WhatsApp en un clic. Détection et rédaction automatiques ; l'envoi
 * reste un geste humain (aucun message ne part tout seul).
 */
export default function CommercialDailyRelancesPanel({ clients = [], orders = [], payments = [] }) {
  const batch = useMemo(
    () => buildDailyRelanceBatchSync({ clients, orders, payments }),
    [clients, orders, payments],
  );
  const [openId, setOpenId] = useState(null);

  if (!batch.items.length) return null;
  const { summary } = batch;

  return (
    <section className="rounded-3xl border border-line bg-white p-4 shadow-card sm:p-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-horizon-dark">
            <CalendarClock size={15} aria-hidden="true" /> Relances du jour
          </p>
          <h2 className="mt-1 text-lg font-semibold text-earth">Créances à relancer aujourd'hui</h2>
          <p className="mt-1 text-sm text-slate">Détection et message automatiques - vous validez et envoyez.</p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-4 py-3 text-right">
          <p className="text-meta text-slate">À recouvrer</p>
          <p className="text-xl font-semibold text-earth tabular-nums">{summary.totalAmountLabel}</p>
          <p className="text-meta text-slate">{summary.count} relance(s) · {summary.sendableNow} prête(s) sur WhatsApp</p>
        </div>
      </div>

      <div className="space-y-2">
        {batch.items.map((item) => {
          const open = openId === item.id;
          return (
            <div key={item.id} className="rounded-2xl border border-line bg-card p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-meta font-semibold ${priorityClass(item.priority)}`}>{item.priority}</span>
                    <span className="rounded-full border border-line bg-white px-2 py-1 text-meta font-semibold text-slate">{item.levelLabel}</span>
                    <span className="text-xs text-slate">retard {item.overdueDays} j</span>
                  </div>
                  <p className="mt-1 truncate font-semibold text-earth">{item.clientName}</p>
                  <p className="text-sm text-slate tabular-nums">{fmtCurrency(item.amount)} · ton {item.tone}</p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setOpenId(open ? null : item.id)} className="rounded-xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth">
                    {open ? 'Masquer' : 'Voir le message'}
                  </button>
                  {item.channel === 'whatsapp' ? (
                    <a href={item.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white">
                      <MessageCircle size={14} aria-hidden="true" /> Envoyer
                    </a>
                  ) : (
                    <span className="rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-xs font-semibold text-horizon-dark">Numéro manquant</span>
                  )}
                </div>
              </div>
              {open ? (
                <div className="mt-3 rounded-xl border border-line bg-white p-3">
                  <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-normal text-slate">
                    <Sparkles size={12} className="text-horizon-dark" aria-hidden="true" /> Message proposé ({item.messageSource === 'ai' ? 'assisté' : 'modèle personnalisé'})
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-earth">{item.message}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-meta text-slate">Aucun message n'est envoyé automatiquement : chaque relance ouvre WhatsApp avec le texte pré-rempli, prêt à vérifier avant l'envoi.</p>
    </section>
  );
}
