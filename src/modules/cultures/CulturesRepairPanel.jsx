import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildCulturesGapRows } from '../../utils/culturesIntegrity.js';
import { applyStockMovement } from '../../utils/stockWorkflows.js';
import { makeId } from '../../utils/ids.js';
import { buildCultureIssueKey, CULTURE_DOMAINS } from '../../utils/culturesWorkflow.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export default function CulturesRepairPanel({
  cultures = [],
  stocks = [],
  businessEvents = [],
  transactions = [],
  salesOrders = [],
  onCreateBusinessEvent,
  onUpdateStock,
  onRefresh,
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const gaps = useMemo(() => buildCulturesGapRows({
    cultures,
    stocks,
    businessEvents,
    transactions,
    salesOrders,
  }), [cultures, stocks, businessEvents, transactions, salesOrders]);

  const repair = async (gap) => {
    setBusy(gap.issue_key);
    try {
      if (gap.repair === 'harvest_stock' && gap.culture_id) {
        const culture = cultures.find((c) => c.id === gap.culture_id);
        const qty = Number(gap.detail?.match(/\d+/)?.[0] || culture?.quantite_recoltee || 0);
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'entree_stock_recolte',
          module_source: 'cultures',
          entity_type: 'culture',
          entity_id: gap.culture_id,
          title: 'Réparation · entrée stock récolte',
          description: 'Reconstitué par contrôle qualité',
          linked_harvest_id: gap.record_id,
          side_effects_managed: true,
        });
        toast('Créer le stock manuellement dans Récolte si besoin.');
      } else if (gap.repair === 'sale_stock_out' && gap.stock_id) {
        const stock = stocks.find((s) => s.id === gap.stock_id);
        if (stock && onUpdateStock) {
          const movement = applyStockMovement(stock, { type: 'sortie', qty: 1, motif: 'Réparation vente culture', date: new Date().toISOString().slice(0, 10) });
          await onUpdateStock(stock.id, movement.stock);
          await onCreateBusinessEvent?.({
            id: makeId('EVT'),
            event_type: 'sortie_stock',
            module_source: 'commercial',
            entity_id: gap.stock_id,
            linked_order_id: gap.record_id,
            title: 'Sortie stock réparation',
            issue_key: buildCultureIssueKey(CULTURE_DOMAINS.SALE, gap.record_id, 'repair'),
          });
        }
      } else {
        toast('Réparation manuelle dans le module source.');
        return;
      }
      toast.success('Réparation appliquée');
      await onRefresh?.();
    } catch (e) {
      toast.error(e.message || 'Échec');
    } finally {
      setBusy(null);
    }
  };

  if (!gaps.length) return null;

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-black text-amber-900">Contrôle qualité cultures ({gaps.length})</span>
        <span className="text-xs font-bold text-amber-800">{open ? 'Replier' : 'Déplier'}</span>
      </button>
      {open ? (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {gaps.map((gap) => (
            <li key={gap.issue_key} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><b className="text-sm text-[#2f2415]">{gap.title}</b><p className="text-xs text-[#8a7456]">{gap.detail}</p></div>
              <button type="button" disabled={busy === gap.issue_key} onClick={() => repair(gap)} className="shrink-0 rounded-lg bg-[#22c55e] px-3 py-1.5 text-xs font-black text-[#052e16] disabled:opacity-50">{busy === gap.issue_key ? '…' : 'Réparer'}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
