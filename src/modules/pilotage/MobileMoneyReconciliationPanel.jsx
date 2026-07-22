import { useMemo, useState } from 'react';
import { Smartphone, CheckCircle2 } from 'lucide-react';
import { buildMobileMoneyReconciliation } from '../../services/mobileMoneyReconciliation.js';
import { openFormModal } from '../../services/formModalManager.js';
import { fmtCurrency } from '../../utils/format';

const STATUS_CHIP = {
  matched: 'bg-positive-bg text-positive',
  ambiguous: 'bg-vigilance-bg text-horizon-dark',
  unmatched: 'bg-neutral-bg text-slate',
  duplicate: 'bg-neutral-bg text-slate',
  ignored: 'bg-neutral-bg text-slate',
};
const STATUS_LABEL = { matched: 'Rapprochée', ambiguous: 'À choisir', unmatched: 'Non trouvée', duplicate: 'Doublon', ignored: 'Sortante' };

/**
 * Rapprochement Mobile Money : coller un relevé / SMS Wave-OM → chaque virement
 * reçu est rapproché d'une commande impayée, avec un encaissement pré-rempli à
 * valider. Aucun encaissement automatique.
 */
export default function MobileMoneyReconciliationPanel({ data = {} }) {
  const [statement, setStatement] = useState('');
  const result = useMemo(() => {
    if (!statement.trim()) return null;
    try {
      return buildMobileMoneyReconciliation({
        statement,
        orders: data.sales_orders || data.salesOrders || [],
        clients: data.clients || [],
        payments: data.payments || [],
      });
    } catch { return null; }
  }, [statement, data]);

  const encaisser = (item) => {
    openFormModal({
      module: 'commercial',
      draft: {
        primary_module: 'commercial',
        form_type: 'payment_record',
        intent_label: 'Encaissement Mobile Money',
        status: 'draft_ready',
        draft_fields: item.draft,
        context: { clientId: item.clientId },
      },
    });
  };

  return (
    <section className="hf-card space-y-3">
      <p className="flex items-center gap-2 text-label font-semibold uppercase text-earth">
        <Smartphone size={15} aria-hidden="true" /> Rapprochement Mobile Money
      </p>
      <p className="text-sm text-slate">Collez le relevé / les SMS Wave ou Orange Money : les virements reçus sont rapprochés des commandes impayées.</p>
      <textarea
        value={statement}
        onChange={(e) => setStatement(e.target.value)}
        rows={4}
        placeholder={'Wave: Vous avez reçu 25000 FCFA de 77 123 45 67. Réf TXN123 le 20/07/2026\nOrange Money: reçu 40000 FCFA de 78...'}
        className="w-full rounded-2xl border border-line bg-card p-3 text-sm text-earth"
      />
      {result ? (
        <>
          <div className="flex flex-wrap gap-2 text-meta font-semibold">
            <span className="rounded-full bg-positive-bg px-2.5 py-1 text-positive">{result.summary.matched} rapprochée(s)</span>
            <span className="rounded-full bg-vigilance-bg px-2.5 py-1 text-horizon-dark">{result.summary.ambiguous} à choisir</span>
            <span className="rounded-full bg-neutral-bg px-2.5 py-1 text-slate">{result.summary.unmatched} non trouvée(s)</span>
            <span className="rounded-full bg-card px-2.5 py-1 text-slate">Auto : {result.summary.autoMatchRate}%</span>
          </div>
          <ul className="space-y-2">
            {result.items.map((item, i) => (
              <li key={i} className="rounded-2xl border border-line bg-card p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-meta font-semibold ${STATUS_CHIP[item.status] || STATUS_CHIP.unmatched}`}>{STATUS_LABEL[item.status] || item.status}</span>
                      <span className="text-sm font-semibold text-earth tabular-nums">{fmtCurrency(item.transaction.amount)}</span>
                      <span className="text-meta uppercase text-slate">{item.transaction.provider}</span>
                    </div>
                    <p className="mt-1 text-meta text-slate">{item.reason}{item.orderId ? ` · commande ${item.orderId}` : ''}</p>
                  </div>
                  {item.status === 'matched' ? (
                    <button type="button" onClick={() => encaisser(item)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white">
                      <CheckCircle2 size={14} aria-hidden="true" /> Encaisser
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
