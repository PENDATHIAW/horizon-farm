import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildCultureHarvestWorkflow } from '../../utils/cultureWorkflows.js';
import { buildCulturesGapRows } from '../../utils/culturesIntegrity.js';
import { applyStockMovement } from '../../utils/stockWorkflows.js';
import { makeId } from '../../utils/ids.js';
import { buildCultureIssueKey, CULTURE_DOMAINS } from '../../utils/culturesWorkflow.js';



export default function CulturesRepairPanel({
  cultures = [],
  stocks = [],
  businessEvents = [],
  transactions = [],
  salesOrders = [],
  onCreateBusinessEvent,
  onCreateStock,
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
        if (!culture) throw new Error('Culture introuvable');
        const workflow = buildCultureHarvestWorkflow({
          before: culture,
          after: culture,
          stocks,
          opportunities: [],
          source: 'reparation_qualite',
        });
        if (workflow?.stock && onCreateStock) {
          await onCreateStock({
            ...workflow.stock,
            linked_harvest_id: gap.record_id,
            harvest_record_id: gap.record_id,
            side_effects_managed: true,
          });
        }
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'entree_stock_recolte',
          module_source: 'cultures',
          entity_type: 'culture',
          entity_id: gap.culture_id,
          title: 'Réparation · entrée stock récolte',
          description: 'Stock reconstitué par contrôle qualité',
          linked_harvest_id: gap.record_id,
          issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, gap.record_id, 'repair'),
          side_effects_managed: true,
        });
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
            side_effects_managed: true,
          });
        }
      } else if (gap.repair === 'stock_harvest_link' && gap.culture_id) {
        const culture = cultures.find((c) => c.id === gap.culture_id);
        const stock = stocks.find((s) => s.id === gap.record_id);
        if (culture && stock && onCreateBusinessEvent) {
          await onCreateBusinessEvent({
            id: makeId('EVT'),
            event_type: 'culture_harvest_record',
            module_source: 'cultures',
            entity_type: 'culture',
            entity_id: culture.id,
            title: `Lien récolte · ${culture.nom || culture.id}`,
            description: `Stock ${stock.produit || stock.id} rattaché`,
            stock_entry_ref: stock.id,
            side_effects_managed: true,
          });
        }
      } else if (gap.repair === 'margin_review' && gap.record_id) {
        await onCreateBusinessEvent?.({
          id: makeId('EVT'),
          event_type: 'revision_marge_culture',
          module_source: 'cultures',
          entity_type: 'culture',
          entity_id: gap.record_id,
          title: 'Révision rentabilité culture',
          description: 'À compléter via Récoltes ou Commercial',
          side_effects_managed: true,
        });
      } else {
        toast('Ouvrez le module source pour finaliser cette réparation.');
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
    <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-4">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-semibold text-horizon-dark">Contrôle qualité cultures ({gaps.length})</span>
        <span className="text-xs font-semibold text-horizon-dark">{open ? 'Replier' : 'Déplier'}</span>
      </button>
      {open ? (
        <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
          {gaps.map((gap) => (
            <li key={gap.issue_key} className="flex flex-col gap-2 rounded-xl border border-vigilance bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
              <div><b className="text-sm text-earth">{gap.title}</b><p className="text-xs text-slate">{gap.detail}</p></div>
              <button type="button" disabled={busy === gap.issue_key} onClick={() => repair(gap)} className="shrink-0 rounded-lg bg-leaf px-3 py-2 text-xs font-semibold text-earth disabled:opacity-50">{busy === gap.issue_key ? '…' : 'Réparer'}</button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
