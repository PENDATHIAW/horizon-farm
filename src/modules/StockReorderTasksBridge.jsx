import { AlertTriangle, CheckCircle2, ListChecks, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const clean = (value) => String(value || '').trim();
const productName = (row = {}) => row.produit || row.nom || row.name || row.id || 'Stock';
const unitPriceOf = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price);
const quantityOf = (row = {}) => toNumber(row.quantite ?? row.quantity);
const thresholdOf = (row = {}) => toNumber(row.seuil ?? row.threshold);
const maxOf = (row = {}) => toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
const reorderQty = (row = {}) => maxOf(row) > 0 ? Math.max(0, maxOf(row) - quantityOf(row)) : Math.max(0, thresholdOf(row) - quantityOf(row));
const taskKey = (row = {}) => `stock_reorder:${clean(row.id)}`;
const isDone = (task = {}) => ['termine', 'terminé', 'annule', 'annulé', 'done', 'closed'].includes(clean(task.status || task.statut).toLowerCase());

function isCritical(row = {}) {
  const threshold = thresholdOf(row);
  return threshold > 0 && quantityOf(row) <= threshold;
}

function existingTaskFor(row, tasks = []) {
  const key = taskKey(row);
  const id = clean(row.id);
  return arr(tasks).find((task) => !isDone(task) && (clean(task.task_dedupe_key || task.alert_dedupe_key || task.action_key) === key || (clean(task.source_module) === 'stock' && clean(task.source_record_id || task.related_id) === id)));
}

export default function StockReorderTasksBridge({ rows = [], taches = [], fournisseurs = [], onCreateTask, onUpdateTask, onRefreshTasks, onCreateAlert, onRefreshAlertes, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [savingId, setSavingId] = useState('');
  const critical = useMemo(() => arr(rows)
    .filter(isCritical)
    .map((row) => ({ row, task: existingTaskFor(row, taches) }))
    .slice(0, 8), [rows, taches]);

  const createTask = async (row) => {
    if (!row?.id) return toast.error('Stock invalide');
    const existing = existingTaskFor(row, taches);
    if (existing) return toast.success('Une tâche ouverte existe déjà');
    try {
      setSavingId(row.id);
      const qty = reorderQty(row);
      const amount = qty * unitPriceOf(row);
      const supplier = arr(fournisseurs).find((f) => clean(f.id) === clean(row.fournisseur_id));
      const taskId = makeId('TSK');
      const key = taskKey(row);
      await onCreateTask?.({
        id: taskId,
        title: `Réapprovisionner ${productName(row)}`,
        module_lie: 'stock',
        source_module: 'stock',
        source_record_id: row.id,
        related_id: row.id,
        task_dedupe_key: key,
        action_key: key,
        due_date: today(),
        priority: quantityOf(row) <= 0 ? 'critique' : 'haute',
        status: 'a_faire',
        notes: `Stock actuel ${fmtNumber(quantityOf(row))} ${row.unite || ''}. Quantité conseillée ${fmtNumber(qty)} ${row.unite || ''}. Fournisseur: ${supplier?.nom || supplier?.name || row.fournisseur_id || 'à choisir'}. Budget estimé ${fmtCurrency(amount)}.`,
      });
      await onCreateAlert?.({ id: makeId('ALT'), title: `Réapprovisionnement requis: ${productName(row)}`, message: `${productName(row)} est sous le seuil. Quantité conseillée: ${fmtNumber(qty)} ${row.unite || ''}.`, module_source: 'stock', entity_type: 'stock', entity_id: row.id, severity: quantityOf(row) <= 0 ? 'critique' : 'warning', status: 'nouvelle', action_recommandee: 'Créer ou confirmer la commande fournisseur.', alert_dedupe_key: key, linked_task_id: taskId });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'tache_reapprovisionnement_stock', module_source: 'stock', entity_type: 'stock', entity_id: row.id, title: `Tâche réapprovisionnement ${productName(row)}`, description: `${fmtNumber(qty)} ${row.unite || ''} · ${fmtCurrency(amount)}`, event_date: today(), severity: quantityOf(row) <= 0 ? 'critique' : 'warning', linked_task_id: taskId, saisies_evitees: 2 });
      await Promise.allSettled([onRefreshTasks?.(), onRefreshAlertes?.(), onRefreshBusinessEvents?.()]);
      toast.success('Tâche de réapprovisionnement créée');
    } catch {
      toast.error('Création tâche impossible');
    } finally {
      setSavingId('');
    }
  };

  const markDone = async (row, task) => {
    if (!task?.id || !onUpdateTask) return;
    try {
      setSavingId(row.id);
      await onUpdateTask(task.id, { status: 'termine', completed_at: now() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'tache_reapprovisionnement_cloturee', module_source: 'stock', entity_type: 'stock', entity_id: row.id, title: `Réapprovisionnement clôturé ${productName(row)}`, description: task.title || '', event_date: today(), severity: 'info', linked_task_id: task.id });
      await Promise.allSettled([onRefreshTasks?.(), onRefreshBusinessEvents?.()]);
      toast.success('Tâche clôturée');
    } catch {
      toast.error('Clôture tâche impossible');
    } finally {
      setSavingId('');
    }
  };

  if (!critical.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate">Réapprovisionnement</p>
          <h3 className="font-semibold text-earth">Stocks critiques à traiter</h3>
          <p className="text-sm text-slate mt-1">Un stock sous seuil peut générer une tâche, une alerte et une trace sans ressaisie.</p>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate"><AlertTriangle size={14} className="inline" /> {critical.length} critique(s)</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {critical.map(({ row, task }) => {
          const qty = reorderQty(row);
          return (
            <div key={row.id} className="rounded-xl border border-line bg-card p-3">
              <p className="font-semibold text-earth"><Truck size={14} className="inline" /> {productName(row)}</p>
              <p className="text-xs text-slate mt-1">Stock: {fmtNumber(quantityOf(row))} / seuil {fmtNumber(thresholdOf(row))} {row.unite || ''}</p>
              <p className="text-xs text-slate mt-1">À commander: <b>{fmtNumber(qty)} {row.unite || ''}</b> · {fmtCurrency(qty * unitPriceOf(row))}</p>
              {task ? (
                <div className="mt-3 flex gap-3 items-center"><span className="text-xs font-semibold text-positive"><ListChecks size={13} className="inline" /> Tâche ouverte</span><button type="button" disabled={savingId === row.id} className="text-xs font-semibold text-horizon-dark disabled:opacity-60" onClick={() => markDone(row, task)}>Clôturer</button></div>
              ) : (
                <button type="button" disabled={savingId === row.id} className="mt-3 text-sm font-semibold text-positive disabled:opacity-60" onClick={() => createTask(row)}><CheckCircle2 size={14} className="inline" /> {savingId === row.id ? 'Création...' : 'Créer tâche'}</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
