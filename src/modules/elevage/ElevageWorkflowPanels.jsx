import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { makeId } from '../../utils/ids.js';
import { toNumber } from '../../utils/format.js';
import {
  commitElevageEggProduction,
  commitElevageFeeding,
  commitElevageMortality,
  commitElevageTransformation,
  commitElevageWeighing,
} from '../../utils/elevageWorkflow.js';
import {
  buildBusinessEventAutomationPlan,
  commitBusinessEventAutomationPlan,
} from '../../services/businessEvents/businessEventAutomationService.js';

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
    onCreateStock: props.onCreateStock,
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

/** Modales workflow Élevage — activeModal: feeding | biosecurity | mortality | eggs | transform | weighing | null (santé → onglet Santé / SanteV6) */
export default function ElevageWorkflowPanels({
  activeModal,
  onClose,
  context,
  handlers,
  feedStocks = [],
  lots = [],
  animaux = [],
  pondeuseLots = [],
  scope = 'avicole',
  onSuccess,
}) {
  const isAnimaux = scope === 'animaux';
  const isAvicole = !isAnimaux;
  const [busy, setBusy] = useState(false);
  const [feeding, setFeeding] = useState({ date: today(), stock_id: feedStocks[0]?.id || '', lot_id: '', animal_id: '', quantite: '', notes: '' });
  const [mortality, setMortality] = useState({ date: today(), lot_id: lots[0]?.id || '', quantite: '', notes: '' });
  const [biosecurity, setBiosecurity] = useState({
    date: today(),
    building_id: lots[0]?.building_id || lots[0]?.poulailler_id || '',
    cleaning_type: 'fin_de_bande',
    responsible_person: '',
    bags_collected: '',
    estimated_weight_per_bag: '25',
    organic_material_type: 'litiere_usee',
    sanitary_status: 'normal',
    destination: 'compostage',
    next_step: 'desinfection',
  });
  const [eggs, setEggs] = useState({ date: today(), lot_id: pondeuseLots[0]?.id || '', oeufs_produits: '', oeufs_casses: '', packaging_stock_id: '', packaging_qty: '' });
  const [transform, setTransform] = useState({ date: today(), lot_id: lots[0]?.id || '', kind: 'pret_vente', notes: '' });
  const [weighing, setWeighing] = useState({ date: today(), lot_id: lots[0]?.id || '', animal_id: '', poids: '', unite: 'kg', notes: '' });

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

  const commitBiosecurityCleaning = async () => {
    const payload = {
      ...biosecurity,
      bags_collected: num(biosecurity.bags_collected),
      estimated_weight_per_bag: num(biosecurity.estimated_weight_per_bag),
    };
    const plan = buildBusinessEventAutomationPlan('biosecurity_cleaning', payload, {
      ...context,
      stock: context.stocks,
      business_events: context.businessEvents,
      alertes_center: context.alertes,
      taches: context.tasks,
    });
    if (!plan.ok) throw new Error(plan.errors?.[0] || 'Nettoyage biosécurité incomplet.');
    const results = await commitBusinessEventAutomationPlan(plan, handlers);
    const skipped = results.filter((row) => row.skipped).length;
    if (skipped > 0) toast(`${skipped} impact(s) préparé(s) mais sans handler connecté`, { icon: 'ℹ️' });
    if (plan.derived.crop_destination_blocked) toast('Matière suspecte : valorisation culture bloquée.', { icon: '⚠️' });
    return plan;
  };

  return (
    <>
      <Modal open={activeModal === 'feeding'} title={isAnimaux ? 'Distribution aliment — Cheptel' : 'Distribution aliment — Lots avicoles'} onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageFeeding({
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
        {isAvicole ? (
          <Field label="Lot avicole / bande">
            <select className={inputCls} value={feeding.lot_id} onChange={(e) => setFeeding({ ...feeding, lot_id: e.target.value, animal_id: '' })}>
              <option value="">—</option>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.nom || l.id}</option>)}
            </select>
          </Field>
        ) : null}
        {isAnimaux ? (
          <Field label="Animal (obligatoire)">
            <select className={inputCls} value={feeding.animal_id} onChange={(e) => setFeeding({ ...feeding, animal_id: e.target.value, lot_id: '' })} required>
              <option value="">Choisir…</option>
              {animaux.map((a) => <option key={a.id} value={a.id}>{a.nom || a.name || a.id}</option>)}
            </select>
          </Field>
        ) : (
          <Field label="Animal (optionnel)">
            <select className={inputCls} value={feeding.animal_id} onChange={(e) => setFeeding({ ...feeding, animal_id: e.target.value, lot_id: '' })}>
              <option value="">—</option>
              {animaux.map((a) => <option key={a.id} value={a.id}>{a.nom || a.name || a.id}</option>)}
            </select>
          </Field>
        )}
        <Field label="Quantité"><input type="number" min="0" className={inputCls} value={feeding.quantite} onChange={(e) => setFeeding({ ...feeding, quantite: e.target.value })} required /></Field>
        <Field label="Notes"><input className={inputCls} value={feeding.notes} onChange={(e) => setFeeding({ ...feeding, notes: e.target.value })} /></Field>
      </Modal>

      <Modal open={activeModal === 'biosecurity'} title="Nettoyage box / bâtiment — Biosécurité" onClose={onClose} busy={busy} onSubmit={() => run(() => commitBiosecurityCleaning()).then(() => toast.success('Nettoyage biosécurité enregistré'))}>
        <Field label="Date"><input type="date" className={inputCls} value={biosecurity.date} onChange={(e) => setBiosecurity({ ...biosecurity, date: e.target.value })} /></Field>
        <Field label="Box / bâtiment / poulailler"><input className={inputCls} value={biosecurity.building_id} onChange={(e) => setBiosecurity({ ...biosecurity, building_id: e.target.value })} placeholder="Ex : Poulailler 1 / Box bovin 2" required /></Field>
        <Field label="Type de nettoyage">
          <select className={inputCls} value={biosecurity.cleaning_type} onChange={(e) => setBiosecurity({ ...biosecurity, cleaning_type: e.target.value })} required>
            <option value="routine">Routine</option>
            <option value="fin_de_bande">Fin de bande</option>
            <option value="vide_sanitaire">Vide sanitaire</option>
            <option value="urgence_sanitaire">Urgence sanitaire</option>
          </select>
        </Field>
        <Field label="Responsable"><input className={inputCls} value={biosecurity.responsible_person} onChange={(e) => setBiosecurity({ ...biosecurity, responsible_person: e.target.value })} required /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Sacs collectés"><input type="number" min="0" className={inputCls} value={biosecurity.bags_collected} onChange={(e) => setBiosecurity({ ...biosecurity, bags_collected: e.target.value })} required /></Field>
          <Field label="Kg estimés / sac"><input type="number" min="0" className={inputCls} value={biosecurity.estimated_weight_per_bag} onChange={(e) => setBiosecurity({ ...biosecurity, estimated_weight_per_bag: e.target.value })} required /></Field>
        </div>
        <Field label="Matière collectée">
          <select className={inputCls} value={biosecurity.organic_material_type} onChange={(e) => setBiosecurity({ ...biosecurity, organic_material_type: e.target.value })} required>
            <option value="fientes">Fientes</option>
            <option value="fumier">Fumier</option>
            <option value="litiere_usee">Litière usée</option>
            <option value="melange">Mélange</option>
          </select>
        </Field>
        <Field label="Statut sanitaire">
          <select className={inputCls} value={biosecurity.sanitary_status} onChange={(e) => setBiosecurity({ ...biosecurity, sanitary_status: e.target.value })} required>
            <option value="normal">Normal</option>
            <option value="a_surveiller">À surveiller</option>
            <option value="suspect">Suspect — bloquer culture</option>
            <option value="contamine">Contaminé — quarantaine</option>
          </select>
        </Field>
        <Field label="Destination">
          <select className={inputCls} value={biosecurity.destination} onChange={(e) => setBiosecurity({ ...biosecurity, destination: e.target.value })} required>
            <option value="compostage">Compostage</option>
            <option value="stockage_temporaire">Stockage temporaire</option>
            <option value="parcelle">Parcelle</option>
            <option value="evacuation">Évacuation</option>
          </select>
        </Field>
        <Field label="Next step">
          <select className={inputCls} value={biosecurity.next_step} onChange={(e) => setBiosecurity({ ...biosecurity, next_step: e.target.value })} required>
            <option value="desinfection">Désinfection</option>
            <option value="vide_sanitaire">Vide sanitaire</option>
            <option value="retournement_compost">Retournement compost</option>
            <option value="transfert_parcelle">Transfert parcelle</option>
            <option value="controle_sanitaire">Contrôle sanitaire</option>
          </select>
        </Field>
        <p className="rounded-2xl border border-[#eadcc2] bg-white px-3 py-2 text-xs text-[#8a7456]">
          Cette saisie crée la matière organique en stock, calcule les kg collectés, crée la prochaine tâche et bloque la valorisation agricole si le statut est suspect.
        </p>
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

      <Modal open={activeModal === 'transform'} title="Transformation — canal officiel" onClose={onClose} busy={busy} onSubmit={() => { onClose(); toast('Ouvrez Élevage → Transformation pour le formulaire officiel (stock viande après validation explicite).'); }}>
        <p className="text-sm text-[#8a7456] mb-3">L&apos;abattage et la conversion vivant → produit fini passent par l&apos;onglet <b>Transformation</b>. Cette entrée légère évite une double saisie sans créer le stock viande.</p>
        <Field label="Date"><input type="date" className={inputCls} value={transform.date} onChange={(e) => setTransform({ ...transform, date: e.target.value })} /></Field>
        <Field label="Type">
          <select className={inputCls} value={transform.kind} onChange={(e) => setTransform({ ...transform, kind: e.target.value })}>
            <option value="pret_vente">Prêt vente</option>
            <option value="reforme">Réforme</option>
            <option value="abattage">Abattage</option>
          </select>
        </Field>
        <Field label="Lot"><select className={inputCls} value={transform.lot_id} onChange={(e) => setTransform({ ...transform, lot_id: e.target.value })}><option value="">—</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.id}</option>)}</select></Field>
        <Field label="Notes"><input className={inputCls} value={transform.notes} onChange={(e) => setTransform({ ...transform, notes: e.target.value })} /></Field>
      </Modal>

      <Modal open={activeModal === 'weighing'} title={isAnimaux ? 'Pesée — Animal' : 'Pesée — Lot ou animal'} onClose={onClose} busy={busy} onSubmit={() => run(() => commitElevageWeighing({
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
        {isAvicole ? (
          <Field label="Lot avicole">
            <select className={inputCls} value={weighing.lot_id} onChange={(e) => setWeighing({ ...weighing, lot_id: e.target.value, animal_id: '' })}>
              <option value="">—</option>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.name || l.nom || l.id}</option>)}
            </select>
          </Field>
        ) : null}
        <Field label={isAnimaux ? 'Animal (obligatoire)' : 'Animal (optionnel)'}>
          <select className={inputCls} value={weighing.animal_id} onChange={(e) => setWeighing({ ...weighing, animal_id: e.target.value, lot_id: '' })} required={isAnimaux}>
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
