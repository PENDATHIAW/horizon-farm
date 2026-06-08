import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { makeId } from '../../utils/ids.js';
import { toNumber } from '../../utils/format.js';
import {
  commitElevageEggProduction,
  commitElevageFeeding,
  commitElevageHealth,
  commitElevageMortality,
  commitElevageTransformation,
  commitElevageWeighing,
} from '../../utils/elevageWorkflow.js';

const today = () => new Date().toISOString().slice(0, 10);
const num = (v) => toNumber(v);
const arr = (v) => (Array.isArray(v) ? v : []);

function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-bold text-[#2f2415]">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]';

function Modal({ open, title, onClose, children, onSubmit, submitLabel = 'Enregistrer', busy }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-xl"
        onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-[#2f2415]">{title}</h3>
          <button type="button" onClick={onClose} className="text-sm font-bold text-[#8a7456]">Fermer</button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[#d6c3a0] px-4 py-2 text-sm font-black">Annuler</button>
          <button type="submit" disabled={busy} className="rounded-xl bg-[#22c55e] px-4 py-2 text-sm font-black text-[#052e16] disabled:opacity-50">{busy ? '…' : submitLabel}</button>
        </div>
      </form>
    </div>
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
    sante: arr(props.sante),
    stockMovements: arr(props.stockMovements),
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
  };
}

/** Modales workflow Élevage — activeModal: feeding | health | mortality | eggs | transform | null */
export default function ElevageWorkflowPanels({
  activeModal,
  onClose,
  context,
  handlers,
  feedStocks = [],
  lots = [],
  animaux = [],
  pondeuseLots = [],
  onSuccess,
}) {
  const [busy, setBusy] = useState(false);
  const [feeding, setFeeding] = useState({ date: today(), stock_id: feedStocks[0]?.id || '', lot_id: '', animal_id: '', quantite: '', notes: '' });
  const [health, setHealth] = useState({ date: today(), lot_id: '', animal_id: '', nom: '', cout: '', stock_id: '', quantite_stock: '', date_rappel: '', delai_sanitaire_fin: '' });
  const [mortality, setMortality] = useState({ date: today(), lot_id: lots[0]?.id || '', quantite: '', notes: '' });
  const [eggs, setEggs] = useState({ date: today(), lot_id: pondeuseLots[0]?.id || '', oeufs_produits: '', oeufs_casses: '', packaging_stock_id: '', packaging_qty: '' });
  const [transform, setTransform] = useState({ date: today(), lot_id: lots[0]?.id || '', kind: 'pret_vente', notes: '' });
  const [weighing, setWeighing] = useState({ date: today(), lot_id: lots[0]?.id || '', animal_id: '', poids: '', unite: 'kg', notes: '' });

  const medStocks = useMemo(() => arr(context.stocks).filter((r) => /vaccin|medic|médic|antibio|vitamin/i.test(`${r.produit || ''} ${r.categorie || ''}`)), [context.stocks]);
  const packagingStocks = useMemo(() => arr(context.stocks).filter((r) => /emballage|alveole|alvéole|tablette|plateau|carton|caisse/i.test(`${r.produit || ''} ${r.nom || ''} ${r.categorie || ''}`)), [context.stocks]);

  const run = async (fn) => {
    try {
      setBusy(true);
      await fn();
      await onSuccess?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal open={activeModal === 'feeding'} title="Distribution aliment — Élevage" onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageFeeding({
        form: { ...feeding, id: makeId('ALIM'), quantite: num(feeding.quantite) },
        context,
        handlers,
      })).then(() => toast.success('Alimentation enregistrée'))}>
        <Field label="Date"><input type="date" className={inputCls} value={feeding.date} onChange={(e) => setFeeding({ ...feeding, date: e.target.value })} /></Field>
        <Field label="Stock aliment">
          <select className={inputCls} value={feeding.stock_id} onChange={(e) => setFeeding({ ...feeding, stock_id: e.target.value })} required>
            <option value="">Choisir…</option>
            {feedStocks.map((s) => <option key={s.id} value={s.id}>{s.produit || s.nom} ({s.quantite} {s.unite})</option>)}
          </select>
        </Field>
        <Field label="Lot avicole">
          <select className={inputCls} value={feeding.lot_id} onChange={(e) => setFeeding({ ...feeding, lot_id: e.target.value, animal_id: '' })}>
            <option value="">—</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.nom || l.id}</option>)}
          </select>
        </Field>
        <Field label="Animal">
          <select className={inputCls} value={feeding.animal_id} onChange={(e) => setFeeding({ ...feeding, animal_id: e.target.value, lot_id: '' })}>
            <option value="">—</option>
            {animaux.map((a) => <option key={a.id} value={a.id}>{a.nom || a.name || a.id}</option>)}
          </select>
        </Field>
        <Field label="Quantité"><input type="number" min="0" className={inputCls} value={feeding.quantite} onChange={(e) => setFeeding({ ...feeding, quantite: e.target.value })} required /></Field>
        <Field label="Notes"><input className={inputCls} value={feeding.notes} onChange={(e) => setFeeding({ ...feeding, notes: e.target.value })} /></Field>
      </Modal>

      <Modal open={activeModal === 'health'} title="Soin / vaccin — Élevage" onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageHealth({
        form: { ...health, id: makeId('VAC'), cout: num(health.cout), quantite_stock: num(health.quantite_stock) },
        context,
        handlers,
      })).then(() => toast.success('Soin enregistré'))}>
        <Field label="Date"><input type="date" className={inputCls} value={health.date} onChange={(e) => setHealth({ ...health, date: e.target.value })} /></Field>
        <Field label="Intitulé"><input className={inputCls} value={health.nom} onChange={(e) => setHealth({ ...health, nom: e.target.value })} required /></Field>
        <Field label="Lot"><select className={inputCls} value={health.lot_id} onChange={(e) => setHealth({ ...health, lot_id: e.target.value })}><option value="">—</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.id}</option>)}</select></Field>
        <Field label="Coût (FCFA)"><input type="number" className={inputCls} value={health.cout} onChange={(e) => setHealth({ ...health, cout: e.target.value })} /></Field>
        <Field label="Produit stock"><select className={inputCls} value={health.stock_id} onChange={(e) => setHealth({ ...health, stock_id: e.target.value })}><option value="">—</option>{medStocks.map((s) => <option key={s.id} value={s.id}>{s.produit}</option>)}</select></Field>
        <Field label="Qté produit"><input type="number" className={inputCls} value={health.quantite_stock} onChange={(e) => setHealth({ ...health, quantite_stock: e.target.value })} /></Field>
        <Field label="Date rappel"><input type="date" className={inputCls} value={health.date_rappel} onChange={(e) => setHealth({ ...health, date_rappel: e.target.value })} /></Field>
        <Field label="Fin délai sanitaire"><input type="date" className={inputCls} value={health.delai_sanitaire_fin} onChange={(e) => setHealth({ ...health, delai_sanitaire_fin: e.target.value })} /></Field>
      </Modal>

      <Modal open={activeModal === 'mortality'} title="Mortalité — Élevage" onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageMortality({
        form: { ...mortality, quantite: num(mortality.quantite) },
        context,
        handlers,
      })).then(() => toast.success('Mortalité enregistrée'))}>
        <Field label="Date"><input type="date" className={inputCls} value={mortality.date} onChange={(e) => setMortality({ ...mortality, date: e.target.value })} /></Field>
        <Field label="Lot"><select className={inputCls} value={mortality.lot_id} onChange={(e) => setMortality({ ...mortality, lot_id: e.target.value })} required><option value="">—</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.id}</option>)}</select></Field>
        <Field label="Nombre"><input type="number" min="1" className={inputCls} value={mortality.quantite} onChange={(e) => setMortality({ ...mortality, quantite: e.target.value })} required /></Field>
        <Field label="Motif"><input className={inputCls} value={mortality.notes} onChange={(e) => setMortality({ ...mortality, notes: e.target.value })} /></Field>
      </Modal>

      <Modal open={activeModal === 'eggs'} title="Ramassage œufs — Élevage" onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageEggProduction({
        form: { ...eggs, id: makeId('PROD'), oeufs_produits: num(eggs.oeufs_produits), oeufs_casses: num(eggs.oeufs_casses), packaging_qty: num(eggs.packaging_qty) },
        context,
        handlers,
      }).then((result) => {
        if (result.packagingGap) toast(result.packagingGap, { icon: 'ℹ️' });
        toast.success('Production enregistrée');
      }))}>
        <Field label="Date"><input type="date" className={inputCls} value={eggs.date} onChange={(e) => setEggs({ ...eggs, date: e.target.value })} /></Field>
        <Field label="Lot pondeuse"><select className={inputCls} value={eggs.lot_id} onChange={(e) => setEggs({ ...eggs, lot_id: e.target.value })} required><option value="">Choisir…</option>{pondeuseLots.map((l) => <option key={l.id} value={l.id}>{l.name || l.id}</option>)}</select></Field>
        <Field label="Œufs ramassés"><input type="number" className={inputCls} value={eggs.oeufs_produits} onChange={(e) => setEggs({ ...eggs, oeufs_produits: e.target.value })} required /></Field>
        <Field label="Cassés"><input type="number" className={inputCls} value={eggs.oeufs_casses} onChange={(e) => setEggs({ ...eggs, oeufs_casses: e.target.value })} /></Field>
        <Field label="Emballage (stock, optionnel)">
          <select className={inputCls} value={eggs.packaging_stock_id} onChange={(e) => setEggs({ ...eggs, packaging_stock_id: e.target.value })}>
            <option value="">— Sans traçabilité emballage —</option>
            {packagingStocks.map((s) => <option key={s.id} value={s.id}>{s.produit || s.nom || s.id}</option>)}
          </select>
        </Field>
        <Field label="Qté emballages consommés (optionnel, défaut = tablettes)"><input type="number" min="0" className={inputCls} value={eggs.packaging_qty} onChange={(e) => setEggs({ ...eggs, packaging_qty: e.target.value })} placeholder="Auto si vide" /></Field>
        <p className="text-xs text-[#8a7456]">Pour tracer les emballages, rattacher un article stock emballage à cette production.</p>
      </Modal>

      <Modal open={activeModal === 'transform'} title="Transformation — Élevage" onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageTransformation({
        form: transform,
        context,
        handlers,
      })).then(() => toast.success('Transformation enregistrée'))}>
        <Field label="Date"><input type="date" className={inputCls} value={transform.date} onChange={(e) => setTransform({ ...transform, date: e.target.value })} /></Field>
        <Field label="Type">
          <select className={inputCls} value={transform.kind} onChange={(e) => setTransform({ ...transform, kind: e.target.value })}>
            <option value="pret_vente">Prêt vente</option>
            <option value="reforme">Réforme</option>
            <option value="abattage">Abattage</option>
          </select>
        </Field>
        <Field label="Lot"><select className={inputCls} value={transform.lot_id} onChange={(e) => setTransform({ ...transform, lot_id: e.target.value })} required><option value="">—</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.id}</option>)}</select></Field>
        <Field label="Notes"><input className={inputCls} value={transform.notes} onChange={(e) => setTransform({ ...transform, notes: e.target.value })} /></Field>
      </Modal>

      <Modal open={activeModal === 'weighing'} title="Pesée — Élevage" onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageWeighing({
        form: { ...weighing, id: makeId('PES'), poids: num(weighing.poids) },
        context,
        handlers,
      }).then((result) => {
        if (result.targetWeight) {
          toast.success(result.onTarget ? 'Poids atteint ou proche de la cible' : 'Pesée enregistrée — suivi croissance');
        } else {
          toast.success('Pesée enregistrée');
        }
      }))}>
        <Field label="Date"><input type="date" className={inputCls} value={weighing.date} onChange={(e) => setWeighing({ ...weighing, date: e.target.value })} /></Field>
        <Field label="Lot avicole">
          <select className={inputCls} value={weighing.lot_id} onChange={(e) => setWeighing({ ...weighing, lot_id: e.target.value, animal_id: '' })}>
            <option value="">—</option>
            {lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.nom || l.id}</option>)}
          </select>
        </Field>
        <Field label="Animal">
          <select className={inputCls} value={weighing.animal_id} onChange={(e) => setWeighing({ ...weighing, animal_id: e.target.value, lot_id: '' })}>
            <option value="">—</option>
            {animaux.map((a) => <option key={a.id} value={a.id}>{a.nom || a.name || a.id}</option>)}
          </select>
        </Field>
        <Field label="Poids"><input type="number" min="0" step="0.01" className={inputCls} value={weighing.poids} onChange={(e) => setWeighing({ ...weighing, poids: e.target.value })} required /></Field>
        <Field label="Unité"><input className={inputCls} value={weighing.unite} onChange={(e) => setWeighing({ ...weighing, unite: e.target.value })} /></Field>
        <Field label="Commentaire"><input className={inputCls} value={weighing.notes} onChange={(e) => setWeighing({ ...weighing, notes: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
