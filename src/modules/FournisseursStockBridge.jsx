import { AlertTriangle, CheckCircle2, Package, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { runSupplierReceptionSideEffects } from '../utils/supplierSideEffects';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const clean = (value) => String(value || '').trim();
const supplierName = (supplier = {}) => supplier.nom || supplier.name || supplier.id || 'Fournisseur';
const productName = (row = {}) => row.produit || row.nom || row.name || row.id || 'Produit';
const supplierIdOfStock = (row = {}) => clean(row.fournisseur_id || row.supplier_id || row.fournisseur || row.supplier);
const quantityOf = (row = {}) => toNumber(row.quantite ?? row.quantity);
const thresholdOf = (row = {}) => toNumber(row.seuil ?? row.threshold);
const maxOf = (row = {}) => toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
const unitPriceOf = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);
const reorderQty = (row = {}) => maxOf(row) > 0 ? Math.max(0, maxOf(row) - quantityOf(row)) : Math.max(0, thresholdOf(row) - quantityOf(row));
const isCritical = (row = {}) => thresholdOf(row) > 0 && quantityOf(row) <= thresholdOf(row);
const taskKey = (supplier, row) => `supplier_order:${clean(supplier.id)}:${clean(row.id)}`;
const isDone = (task = {}) => ['termine', 'terminé', 'annule', 'annulé', 'done', 'closed'].includes(clean(task.status || task.statut).toLowerCase());

function linkedSupplier(stock, suppliers = []) {
  const id = supplierIdOfStock(stock);
  return arr(suppliers).find((supplier) => clean(supplier.id) === id || clean(supplier.nom || supplier.name) === id);
}

function existingTaskFor(supplier, stock, tasks = []) {
  const key = taskKey(supplier, stock);
  return arr(tasks).find((task) => !isDone(task) && (clean(task.task_dedupe_key || task.action_key) === key || (clean(task.source_module) === 'fournisseurs' && clean(task.related_id) === clean(supplier.id) && clean(task.stock_id) === clean(stock.id))));
}

export default function FournisseursStockBridge({ suppliers = [], stocks = [], tasks = [], onUpdateStock, onRefreshStock, onCreateTask, onRefreshTasks, onCreateAlert, onRefreshAlertes, onCreateBusinessEvent, onRefreshBusinessEvents, onUpdateSupplier, onRefreshSuppliers }) {
  const [savingKey, setSavingKey] = useState('');
  const financesCrud = useCrudModule('finances');
  const documentsCrud = useCrudModule('documents');
  const tasksCrud = useCrudModule('taches');
  const candidates = useMemo(() => arr(stocks)
    .filter(isCritical)
    .map((stock) => ({ stock, supplier: linkedSupplier(stock, suppliers) }))
    .filter(({ supplier }) => Boolean(supplier?.id))
    .map(({ stock, supplier }) => ({ stock, supplier, task: existingTaskFor(supplier, stock, tasks) }))
    .slice(0, 8), [stocks, suppliers, tasks]);

  const createOrderTask = async (supplier, stock) => {
    const key = taskKey(supplier, stock);
    const existing = existingTaskFor(supplier, stock, tasks);
    if (existing) return toast.success('Commande fournisseur déjà en suivi');
    try {
      setSavingKey(key);
      const qty = reorderQty(stock);
      const amount = qty * unitPriceOf(stock);
      const taskId = makeId('TSK');
      await onCreateTask?.({
        id: taskId,
        title: `Commander ${productName(stock)} — ${supplierName(supplier)}`,
        module_lie: 'fournisseurs',
        source_module: 'fournisseurs',
        related_id: supplier.id,
        fournisseur_id: supplier.id,
        stock_id: stock.id,
        task_dedupe_key: key,
        action_key: key,
        due_date: today(),
        priority: quantityOf(stock) <= 0 ? 'critique' : 'haute',
        status: 'a_faire',
        checklist: 'Confirmer disponibilité; Valider prix; Confirmer délai; Réceptionner dans Stock; Joindre facture',
        notes: `Produit: ${productName(stock)}. Stock actuel ${fmtNumber(quantityOf(stock))} ${stock.unite || ''}. Quantité conseillée ${fmtNumber(qty)} ${stock.unite || ''}. Budget estimé ${fmtCurrency(amount)}.`,
      });
      await onUpdateStock?.(stock.id, {
        statut: 'en_attente_fournisseur',
        stock_status: 'en_attente_fournisseur',
        pending_supplier_id: supplier.id,
        pending_reorder_qty: qty,
        pending_reorder_amount: amount,
        last_reorder_task_id: taskId,
        last_reorder_at: now(),
      });
      await onUpdateSupplier?.(supplier.id, { derniere_commande: today(), last_order_task_id: taskId });
      await onCreateAlert?.({ id: makeId('ALT'), title: `Commande fournisseur à confirmer: ${productName(stock)}`, message: `${supplierName(supplier)} · ${fmtNumber(qty)} ${stock.unite || ''} à commander.`, module_source: 'fournisseurs', entity_type: 'fournisseur', entity_id: supplier.id, related_id: stock.id, severity: quantityOf(stock) <= 0 ? 'critique' : 'warning', status: 'nouvelle', action_recommandee: 'Confirmer la commande fournisseur puis réceptionner dans Stock.', alert_dedupe_key: key, linked_task_id: taskId });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'commande_fournisseur_stock_preparee', module_source: 'fournisseurs', entity_type: 'fournisseur', entity_id: supplier.id, related_stock_id: stock.id, title: `Commande fournisseur ${supplierName(supplier)}`, description: `${productName(stock)} · ${fmtNumber(qty)} ${stock.unite || ''} · ${fmtCurrency(amount)}`, event_date: today(), severity: 'info', linked_task_id: taskId, saisies_evitees: 3 });
      await Promise.allSettled([onRefreshTasks?.(), onRefreshStock?.(), onRefreshAlertes?.(), onRefreshBusinessEvents?.(), onRefreshSuppliers?.()]);
      toast.success('Commande fournisseur préparée');
    } catch {
      toast.error('Préparation commande impossible');
    } finally {
      setSavingKey('');
    }
  };

  const receiveStock = async (supplier, stock) => {
    const key = taskKey(supplier, stock);
    const qty = reorderQty(stock);
    const task = existingTaskFor(supplier, stock, tasks);
    if (qty <= 0) return toast.error('Quantité à réceptionner non calculée');
    try {
      setSavingKey(`receive:${key}`);
      await runSupplierReceptionSideEffects({
        supplier,
        stock,
        qty,
        unitPrice: unitPriceOf(stock),
        date: today(),
        tasks,
        alertes: [],
        transactions: financesCrud.rows || [],
        handlers: {
          onUpdateStock,
          onUpdateSupplier,
          onCreateFinanceTransaction: financesCrud.create,
          onCreateDocument: documentsCrud.create,
          onCreateBusinessEvent,
          onCreateTask,
          onCreateAlert,
          onUpdateTask: tasksCrud.update,
          existingDocuments: documentsCrud.rows || [],
        },
      });
      if (task?.id) await tasksCrud.update?.(task.id, { status: 'termine', statut: 'termine', completed_at: now() });
      await Promise.allSettled([onRefreshStock?.(), financesCrud.refresh?.(), documentsCrud.refresh?.(), tasksCrud.refresh?.(), onRefreshBusinessEvents?.(), onRefreshSuppliers?.()]);
      toast.success('Réception enregistrée : stock, dette, document et comptabilité synchronisés');
    } catch {
      toast.error('Réception fournisseur impossible');
    } finally {
      setSavingKey('');
    }
  };

  if (!candidates.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate">Achats à préparer</p>
          <h3 className="font-semibold text-earth">Stocks critiques liés aux fournisseurs</h3>
          <p className="text-sm text-slate mt-1">Prépare la commande fournisseur et marque le stock en attente sans ressaisie.</p>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate"><AlertTriangle size={14} className="inline" /> {candidates.length} achat(s)</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {candidates.map(({ stock, supplier, task }) => {
          const key = taskKey(supplier, stock);
          const qty = reorderQty(stock);
          return (
            <div key={key} className="rounded-xl border border-line bg-card p-3">
              <p className="font-semibold text-earth"><Truck size={14} className="inline" /> {supplierName(supplier)}</p>
              <p className="text-xs text-slate mt-1"><Package size={13} className="inline" /> {productName(stock)}</p>
              <p className="text-xs text-slate mt-1">Stock: {fmtNumber(quantityOf(stock))} / seuil {fmtNumber(thresholdOf(stock))}</p>
              <p className="text-xs text-slate mt-1">À commander: <b>{fmtNumber(qty)} {stock.unite || ''}</b> · {fmtCurrency(qty * unitPriceOf(stock))}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {task ? <p className="text-xs font-semibold text-positive"><CheckCircle2 size={13} className="inline" /> Déjà en suivi</p> : <button type="button" disabled={savingKey === key} className="text-sm font-semibold text-positive disabled:opacity-60" onClick={() => createOrderTask(supplier, stock)}><CheckCircle2 size={14} className="inline" /> {savingKey === key ? 'Préparation...' : 'Préparer commande'}</button>}
                <button type="button" disabled={savingKey === `receive:${key}`} className="text-sm font-semibold text-earth disabled:opacity-60" onClick={() => receiveStock(supplier, stock)}><Package size={14} className="inline" /> {savingKey === `receive:${key}` ? 'Réception...' : 'Réceptionner'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
