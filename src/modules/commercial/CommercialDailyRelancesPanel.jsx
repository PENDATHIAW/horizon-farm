import { useMemo, useState } from 'react';
import { CalendarClock, MessageCircle, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { buildDailyRelanceBatchSync } from '../../services/relanceAutomation.js';
import { buildClaudeRelanceDrafter } from '../../services/aiGateway/index.js';
import { buildWhatsappShareUrl } from '../../utils/whatsappShare.js';
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
 *
 * Le bouton « Améliorer » passe par la passerelle serveur : si une clé modèle est
 * posée côté serveur, le texte est affiné ; sinon on garde le modèle personnalisé
 * (repli transparent, jamais d'erreur bloquante).
 */
export default function CommercialDailyRelancesPanel({ clients = [], orders = [], payments = [] }) {
  const batch = useMemo(
    () => buildDailyRelanceBatchSync({ clients, orders, payments }),
    [clients, orders, payments],
  );
  const drafter = useMemo(() => buildClaudeRelanceDrafter(), []);
  const [openId, setOpenId] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [enhancingId, setEnhancingId] = useState(null);
  const [notice, setNotice] = useState({});

  if (!batch.items.length) return null;
  const { summary } = batch;

  const viewOf = (item) => overrides[item.id] || { message: item.message, whatsappUrl: item.whatsappUrl, source: item.messageSource };

  const enhance = async (item) => {
    setEnhancingId(item.id);
    setNotice((prev) => ({ ...prev, [item.id]: '' }));
    try {
      const text = await drafter(item.contextForAi || {});
      if (text && text.trim()) {
        setOverrides((prev) => ({
          ...prev,
          [item.id]: {
            message: text.trim(),
            whatsappUrl: buildWhatsappShareUrl({ title: `Relance ${item.levelLabel}`, message: text.trim() }, item.phone),
            source: 'ai',
          },
        }));
      } else {
        setNotice((prev) => ({ ...prev, [item.id]: 'Assistant indisponible - message personnalisé conservé.' }));
      }
    } catch {
      setNotice((prev) => ({ ...prev, [item.id]: 'Assistant indisponible - message personnalisé conservé.' }));
    } finally {
      setEnhancingId(null);
    }
  };

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
          const view = viewOf(item);
          const busy = enhancingId === item.id;
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
                    <a href={view.whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white">
                      <MessageCircle size={14} aria-hidden="true" /> Envoyer
                    </a>
                  ) : (
                    <span className="rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-xs font-semibold text-horizon-dark">Numéro manquant</span>
                  )}
                </div>
              </div>
              {open ? (
                <div className="mt-3 rounded-xl border border-line bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 text-meta font-semibold uppercase tracking-normal text-slate">
                      <Sparkles size={12} className="text-horizon-dark" aria-hidden="true" /> Message proposé ({view.source === 'ai' ? 'assisté' : 'modèle personnalisé'})
                    </p>
                    <button
                      type="button"
                      onClick={() => enhance(item)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-meta font-semibold text-earth disabled:opacity-60"
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Wand2 size={12} aria-hidden="true" />}
                      {busy ? 'Rédaction...' : 'Améliorer'}
                    </button>
                  </div>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-earth">{view.message}</p>
                  {notice[item.id] ? <p className="mt-1.5 text-meta text-slate">{notice[item.id]}</p> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <p className="text-meta text-slate">Chaque relance ouvre WhatsApp avec le message pré-rempli : vous vérifiez et vous envoyez.</p>
    </section>
  );
}
