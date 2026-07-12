import { X } from 'lucide-react';
/* eslint-disable react-refresh/only-export-components */
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  connectedUserId,
  DAILY_ENTRY_TYPES,
  dailyEntryConfirmation,
} from '../../utils/dailyQuickEntryContract.js';
import {
  commitElevageEggProduction,
  commitElevageFeeding,
  commitElevageMortality,
  commitElevageWeighing,
} from '../../utils/elevageWorkflow.js';
import { toNumber } from '../../utils/format.js';
import { makeId } from '../../utils/ids.js';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);
const arr = (value) => (Array.isArray(value) ? value : []);
const uniqueId = (rows = []) => (arr(rows).length === 1 ? String(rows[0].id || '') : '');
const inputClass = 'min-h-[42px] w-full rounded-lg border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]';

function Field({ label, children }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-bold text-[#7d6a4a]">{label}</span>{children}</label>;
}

function Modal({ open, title, onClose, children, onSubmit, submitLabel = 'Enregistrer', busy, testId }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-testid={`${testId}-modal`}>
      <form className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-xl" onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }} data-testid={`${testId}-form`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#2f2415]">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-[42px] rounded-lg border border-[#d6c3a0] px-4 text-sm font-black">Annuler</button>
          <button type="submit" disabled={busy} className="min-h-[42px] rounded-lg bg-[#22c55e] px-4 text-sm font-black text-[#052e16] disabled:opacity-50" data-testid={`${testId}-submit`}>{busy ? 'Enregistrement...' : submitLabel}</button>
        </div>
      </form>
    </div>
  );
}

function TargetField({ isAnimaux, lots, animaux, value, onChange }) {
  return (
    <Field label={isAnimaux ? 'Animal' : 'Lot'}>
      <select className={inputClass} value={value || ''} onChange={(event) => onChange(event.target.value)} required data-testid="daily-elevage-target">
        <option value="">Choisir</option>
        {(isAnimaux ? animaux : lots).map((row) => <option key={row.id} value={row.id}>{row.nom || row.name || row.id}</option>)}
      </select>
    </Field>
  );
}

export function useElevageWorkflowContext(props = {}) {
  return useMemo(() => ({
    lots: arr(props.lots),
    animaux: arr(props.animaux),
    stocks: arr(props.stocks),
    transactions: arr(props.transactions),
    tasks: arr(props.tasks),
    alertes: arr(props.alertes),
    businessEvents: arr(props.businessEvents),
    alimentationLogs: arr(props.alimentationLogs),
    productionLogs: arr(props.productionLogs),
    weightRecords: arr(props.weightRecords),
    sante: arr(props.sante),
    stockMovements: arr(props.stockMovements),
    userId: connectedUserId(props.user),
    farmId: props.activeFarm?.id || props.farm?.id || '',
    activeFarm: props.activeFarm || props.farm || null,
  }), [props]);
}

export function buildElevageHandlers(props = {}) {
  return {
    onCreateAlimentation: props.onCreateAlimentation,
    onUpdateStock: props.onUpdateStock,
    onCreateStockMovement: props.onCreateStockMovement,
    onRefreshStockMovements: props.onRefreshStockMovements,
    existingStockMovements: arr(props.stockMovements),
    onCreateFinanceTransaction: props.onCreateFinanceTransaction,
    onCreateBusinessEvent: props.onCreateBusinessEvent,
    onCreateHealth: props.onCreateHealth,
    onUpdateHealth: props.onUpdateHealth,
    onUpdateLot: props.onUpdateLot,
    onUpdateAnimal: props.onUpdateAnimal,
    onCreateTask: props.onCreateTask,
    onCreateAlert: props.onCreateAlert,
    onCreateDocument: props.onCreateDocument,
    onCreateProduction: props.onCreateProduction,
    onCreateWeightRecord: props.onCreateWeightRecord,
    onNavigate: props.onNavigate,
  };
}

export default function ElevageWorkflowPanels({
  activeModal,
  onClose,
  context = {},
  handlers,
  feedStocks = [],
  lots = [],
  animaux = [],
  pondeuseLots = [],
  scope = 'avicole',
  onSuccess,
}) {
  const isAnimaux = scope === 'animaux';
  const [busy, setBusy] = useState(false);
  const [feeding, setFeeding] = useState(() => ({ entry_id: makeId('ENTRY'), date: today(), stock_id: uniqueId(feedStocks), lot_id: isAnimaux ? '' : uniqueId(lots), animal_id: isAnimaux ? uniqueId(animaux) : '', quantite: '', notes: '' }));
  const [mortality, setMortality] = useState(() => ({ entry_id: makeId('ENTRY'), date: today(), lot_id: isAnimaux ? '' : uniqueId(lots), animal_id: isAnimaux ? uniqueId(animaux) : '', quantite: '', notes: '' }));
  const [eggs, setEggs] = useState(() => ({ entry_id: makeId('ENTRY'), date: today(), lot_id: uniqueId(pondeuseLots), oeufs_produits: '', oeufs_casses: '', packaging_stock_id: '', packaging_qty: '' }));
  const [transform, setTransform] = useState(() => ({ entry_id: makeId('ENTRY'), date: today(), lot_id: uniqueId(lots), kind: 'pret_vente', notes: '' }));
  const [weighing, setWeighing] = useState(() => ({ entry_id: makeId('ENTRY'), date: today(), lot_id: isAnimaux ? '' : uniqueId(lots), animal_id: isAnimaux ? uniqueId(animaux) : '', poids: '', unite: 'kg', notes: '' }));

  const packagingStocks = useMemo(() => arr(context.stocks).filter((row) => /emballage|alveole|alvéole|tablette|plateau|carton|caisse/i.test(`${row.produit || ''} ${row.nom || ''} ${row.categorie || ''}`)), [context.stocks]);
  const feedingStock = arr(feedStocks).find((row) => String(row.id) === String(feeding.stock_id));

  const run = async (type, commit) => {
    try {
      setBusy(true);
      const result = await commit();
      if (result.packagingGap) toast(result.packagingGap);
      if (result.stockGap) toast(result.stockGap);
      toast.success(dailyEntryConfirmation(type, result));
      await onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={activeModal === 'feeding'} title="Distribution aliment" onClose={onClose} busy={busy} testId="daily-feeding" onSubmit={() => run(DAILY_ENTRY_TYPES.FEEDING, () => commitElevageFeeding({ form: { ...feeding, quantite: num(feeding.quantite), recorded_by: context.userId }, context, handlers }))}>
        <Field label="Aliment"><select className={inputClass} value={feeding.stock_id || ''} onChange={(event) => setFeeding({ ...feeding, stock_id: event.target.value })} required data-testid="daily-feeding-stock"><option value="">Choisir</option>{feedStocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.produit || stock.nom || stock.id} · {stock.quantite} {stock.unite}</option>)}</select></Field>
        <TargetField isAnimaux={isAnimaux} lots={lots} animaux={animaux} value={isAnimaux ? feeding.animal_id : feeding.lot_id} onChange={(value) => setFeeding({ ...feeding, lot_id: isAnimaux ? '' : value, animal_id: isAnimaux ? value : '' })} />
        <Field label={`Quantité (${feedingStock?.unite || 'kg'})`}><input className={inputClass} type="number" min="0.01" step="0.01" value={feeding.quantite || ''} onChange={(event) => setFeeding({ ...feeding, quantite: event.target.value })} required data-testid="daily-feeding-quantity" /></Field>
        <details className="rounded-lg border border-[#eadcc2] p-3"><summary className="cursor-pointer text-sm font-black">Détails</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Date"><input className={inputClass} type="date" value={feeding.date || ''} onChange={(event) => setFeeding({ ...feeding, date: event.target.value })} /></Field><Field label="Notes"><input className={inputClass} value={feeding.notes || ''} onChange={(event) => setFeeding({ ...feeding, notes: event.target.value })} /></Field></div></details>
      </Modal>

      <Modal open={activeModal === 'mortality'} title="Mortalité" onClose={onClose} busy={busy} testId="daily-mortality" onSubmit={() => run(DAILY_ENTRY_TYPES.MORTALITY, () => commitElevageMortality({ form: { ...mortality, quantite: num(mortality.quantite), recorded_by: context.userId }, context, handlers }))}>
        <TargetField isAnimaux={isAnimaux} lots={lots} animaux={animaux} value={isAnimaux ? mortality.animal_id : mortality.lot_id} onChange={(value) => setMortality({ ...mortality, lot_id: isAnimaux ? '' : value, animal_id: isAnimaux ? value : '' })} />
        <Field label="Nombre"><input className={inputClass} type="number" min="1" value={mortality.quantite || ''} onChange={(event) => setMortality({ ...mortality, quantite: event.target.value })} required data-testid="daily-mortality-quantity" /></Field>
        <details className="rounded-lg border border-[#eadcc2] p-3"><summary className="cursor-pointer text-sm font-black">Détails</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Date"><input className={inputClass} type="date" value={mortality.date || ''} onChange={(event) => setMortality({ ...mortality, date: event.target.value })} /></Field><Field label="Motif"><input className={inputClass} value={mortality.notes || ''} onChange={(event) => setMortality({ ...mortality, notes: event.target.value })} /></Field></div></details>
      </Modal>

      <Modal open={activeModal === 'eggs'} title="Ramassage œufs" onClose={onClose} busy={busy} testId="daily-eggs" onSubmit={() => run(DAILY_ENTRY_TYPES.EGGS, () => commitElevageEggProduction({ form: { ...eggs, oeufs_produits: num(eggs.oeufs_produits), oeufs_casses: num(eggs.oeufs_casses), packaging_qty: num(eggs.packaging_qty), recorded_by: context.userId }, context, handlers }))}>
        <Field label="Lot pondeuse"><select className={inputClass} value={eggs.lot_id || ''} onChange={(event) => setEggs({ ...eggs, lot_id: event.target.value })} required data-testid="daily-eggs-target"><option value="">Choisir</option>{pondeuseLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name || lot.nom || lot.id}</option>)}</select></Field>
        <Field label="Œufs ramassés"><input className={inputClass} type="number" min="1" value={eggs.oeufs_produits || ''} onChange={(event) => setEggs({ ...eggs, oeufs_produits: event.target.value })} required data-testid="daily-eggs-quantity" /></Field>
        <details className="rounded-lg border border-[#eadcc2] p-3"><summary className="cursor-pointer text-sm font-black">Détails</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Date"><input className={inputClass} type="date" value={eggs.date || ''} onChange={(event) => setEggs({ ...eggs, date: event.target.value })} /></Field><Field label="Cassés"><input className={inputClass} type="number" min="0" value={eggs.oeufs_casses || ''} onChange={(event) => setEggs({ ...eggs, oeufs_casses: event.target.value })} /></Field><Field label="Emballage"><select className={inputClass} value={eggs.packaging_stock_id || ''} onChange={(event) => setEggs({ ...eggs, packaging_stock_id: event.target.value })}><option value="">Aucun</option>{packagingStocks.map((stock) => <option key={stock.id} value={stock.id}>{stock.produit || stock.nom || stock.id}</option>)}</select></Field><Field label="Quantité emballages"><input className={inputClass} type="number" min="0" value={eggs.packaging_qty || ''} onChange={(event) => setEggs({ ...eggs, packaging_qty: event.target.value })} /></Field></div></details>
      </Modal>

      <Modal open={activeModal === 'transform'} title="Transformation" onClose={onClose} busy={busy} testId="daily-transform" submitLabel="Ouvrir" onSubmit={() => { onClose?.(); handlers?.onNavigate?.('elevage', { tab: 'Transformation' }); }}>
        <Field label="Type"><select className={inputClass} value={transform.kind || 'pret_vente'} onChange={(event) => setTransform({ ...transform, kind: event.target.value })}><option value="pret_vente">Prêt vente</option><option value="reforme">Réforme</option><option value="abattage">Abattage</option></select></Field>
        <Field label="Lot"><select className={inputClass} value={transform.lot_id || ''} onChange={(event) => setTransform({ ...transform, lot_id: event.target.value })}><option value="">Choisir</option>{lots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name || lot.nom || lot.id}</option>)}</select></Field>
      </Modal>

      <Modal open={activeModal === 'weighing'} title="Pesée" onClose={onClose} busy={busy} testId="daily-weighing" onSubmit={() => run(DAILY_ENTRY_TYPES.WEIGHING, () => commitElevageWeighing({ form: { ...weighing, poids: num(weighing.poids), recorded_by: context.userId }, context, handlers }))}>
        <TargetField isAnimaux={isAnimaux} lots={lots} animaux={animaux} value={isAnimaux ? weighing.animal_id : weighing.lot_id} onChange={(value) => setWeighing({ ...weighing, lot_id: isAnimaux ? '' : value, animal_id: isAnimaux ? value : '' })} />
        <Field label="Poids (kg)"><input className={inputClass} type="number" min="0.01" step="0.01" value={weighing.poids || ''} onChange={(event) => setWeighing({ ...weighing, poids: event.target.value })} required data-testid="daily-weighing-weight" /></Field>
        <details className="rounded-lg border border-[#eadcc2] p-3"><summary className="cursor-pointer text-sm font-black">Détails</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><Field label="Date"><input className={inputClass} type="date" value={weighing.date || ''} onChange={(event) => setWeighing({ ...weighing, date: event.target.value })} /></Field><Field label="Commentaire"><input className={inputClass} value={weighing.notes || ''} onChange={(event) => setWeighing({ ...weighing, notes: event.target.value })} /></Field></div></details>
      </Modal>
    </>
  );
}
