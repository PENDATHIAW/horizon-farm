import { useMemo, useState } from 'react';
import { Edit, Egg, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../hooks/useWorkflowSubmit';
import useCrudModule from '../hooks/useCrudModule';
import { fmtNumber, toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount } from '../utils/avicoleMetrics';
import {
  buildEggProductionPayload,
  sellableEggsFromLog,
  syncEggStockFromLogs,
  tabletsFromEggs,
} from '../services/livestockStockBridge';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);
const eventType = (row = {}) => String(row.type_evenement || row.event_type || row.type || '').toLowerCase();
const isEggLog = (row = {}) => eventType(row).includes('ramassage') || eventType(row).includes('oeufs') || eventType(row).includes('œufs') || row.oeufs_produits !== undefined;
const eggCount = (row = {}) => toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
const brokenEggs = (row = {}) => toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
const sellableEggs = sellableEggsFromLog;
const tabletLabel = (value = 0) => { const converted = tabletsFromEggs(value); return `${fmtNumber(converted.tablettes)} tablette(s) + ${fmtNumber(converted.oeufs_restants)} œuf(s)`; };
const activeCount = avicoleActiveCount;
const eventLotId = (row = {}) => String(row.lot_id || row.related_id || row.source_record_id || row.entity_id || row.cible_id || row.target_id || '').trim();
const linkedToLot = (row = {}, lotIds = new Set()) => {
  if (!lotIds.size) return false;
  const id = eventLotId(row);
  return Boolean(id && lotIds.has(id));
};

function Field({ label, children }) { return <label className="text-xs font-bold text-[#8a7456] space-y-1"><span>{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function Select(props) { return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function ActionButton({ children, onClick, icon: Icon, danger = false, type = 'button', disabled = false }) { return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${danger ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#fffdf8] text-[#2f2415] border border-[#d6c3a0]'} disabled:opacity-50`}><Icon size={14} />{children}</button>; }

async function syncWithoutBlocking(action, fallbackMessage) {
  try {
    return await action?.();
  } catch (error) {
    console.warn(fallbackMessage, error);
    toast.error(`${fallbackMessage}. Le ramassage reste enregistré.`);
    return null;
  }
}

function EggJournal({ rows, productionLogs, stockCrud, onCreateProduction, onUpdateProduction, onDeleteProduction, onRefreshProduction }) {
  const [editing, setEditing] = useState(null);
  const pondeuses = useMemo(() => filterLotsByActivity(rows, 'Pondeuse').filter((lot) => activeCount(lot) > 0), [rows]);
  const pondeuseIds = useMemo(() => new Set(pondeuses.map((lot) => String(lot.id))), [pondeuses]);
  const logs = useMemo(() => arr(productionLogs).filter((log) => isEggLog(log) && linkedToLot(log, pondeuseIds)).sort((a, b) => String(b.date || b.created_at).localeCompare(String(a.date || a.created_at))), [productionLogs, pondeuseIds]);
  const initial = { id: `PROD-${Date.now()}`, lot_id: pondeuses[0]?.id || '', date: today(), heure_ramassage: '', oeufs_produits: '', oeufs_casses: 0, responsable: '', notes: '' };
  const [form, setForm] = useState(initial);
  const { submit: workflowSubmit, busy: workflowBusy } = useWorkflowSubmit();
  if (!pondeuses.length) return null;
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const lot = pondeuses.find((item) => item.id === form.lot_id);
    if (!lot) return toast.error('Choisir un lot pondeuse actif');
    const produced = eggCount(form);
    const broken = brokenEggs(form);
    if (produced <= 0) return toast.error('Nombre d’œufs obligatoire');
    if (broken > produced) return toast.error('Les œufs cassés ne peuvent pas dépasser le total');
    const sellable = sellableEggs(form);
    const payload = buildEggProductionPayload({ form, lot, previousId: editing?.id });
    const eggKey = `egg-journal:${lot.id}:${form.date}:${produced}`;
    const result = await workflowSubmit(eggKey, async () => {
      if (editing) await onUpdateProduction?.(editing.id, payload);
      else await onCreateProduction?.(payload);
    await syncWithoutBlocking(() => syncEggStockFromLogs({ stockCrud, log: payload, previousLog: editing }), 'Stock œufs/tablettes non synchronisé');
    await syncWithoutBlocking(() => onRefreshProduction?.(), 'Rafraîchissement production indisponible');
    toast.success(editing ? `Ramassage modifié · ${tabletLabel(sellable)}` : `Ramassage enregistré · ${tabletLabel(sellable)}`);
    });
    if (result?.skipped && result.reason === 'in_flight') return;
    setEditing(null);
    setForm(initial);
  };
  const startEdit = (log) => { setEditing(log); setForm({ ...log, lot_id: eventLotId(log), date: log.date || today(), oeufs_produits: eggCount(log), oeufs_casses: brokenEggs(log) }); };
  const remove = async (log) => {
    await onDeleteProduction?.(log.id);
    await syncWithoutBlocking(() => syncEggStockFromLogs({ stockCrud, log: {}, previousLog: log }), 'Stock œufs/tablettes non resynchronisé');
    await syncWithoutBlocking(() => onRefreshProduction?.(), 'Rafraîchissement production indisponible');
    toast.success(`Ramassage supprimé · stock corrigé (${tabletLabel(sellableEggs(log))})`);
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Egg size={20} /> Journal de ramassage des œufs</p>
          <p className="mt-1 text-sm text-[#8a7456]">Chaque ramassage alimente le stock « Tablettes d’œufs vendables » (30 œufs = 1 tablette).</p>
        </div>
        <ActionButton icon={RefreshCw} onClick={onRefreshProduction}>Actualiser</ActionButton>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-7 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
        <Field label="Lot pondeuse"><Select value={form.lot_id || ''} onChange={(e) => update('lot_id', e.target.value)}><option value="">Choisir</option>{pondeuses.map((lot, index) => <option key={`${lot.id || 'lot'}-${index}`} value={lot.id}>{lot.name || lot.id}</option>)}</Select></Field>
        <Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => update('date', e.target.value)} /></Field>
        <Field label="Heure"><Input value={form.heure_ramassage || ''} onChange={(e) => update('heure_ramassage', e.target.value)} placeholder="ex: 08:30" /></Field>
        <Field label="Œufs ramassés"><Input type="number" min="0" value={form.oeufs_produits || ''} onChange={(e) => update('oeufs_produits', e.target.value)} /></Field>
        <Field label="Cassés"><Input type="number" min="0" value={form.oeufs_casses || 0} onChange={(e) => update('oeufs_casses', e.target.value)} /></Field>
        <Field label="Vendables"><Input readOnly value={`${fmtNumber(sellableEggs(form))} œufs · ${tabletLabel(sellableEggs(form))}`} /></Field>
        <div className="flex items-end gap-2"><ActionButton type="submit" icon={editing ? Save : Plus} disabled={workflowBusy}>{workflowBusy ? '…' : (editing ? 'Modifier' : 'Ajouter')}</ActionButton>{editing ? <ActionButton icon={X} onClick={() => { setEditing(null); setForm(initial); }}>Annuler</ActionButton> : null}</div>
      </form>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-[#8a7456] border-b border-[#eadcc2]"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Œufs</th><th className="py-2 pr-4">Cassés</th><th className="py-2 pr-4">Stock ajouté</th><th className="py-2 pr-4">Responsable</th><th className="py-2 pr-4">Actions</th></tr></thead>
          <tbody>
            {logs.map((log, index) => {
              const sellable = sellableEggs(log);
              return (
                <tr key={`${log.id || eventLotId(log) || 'ramassage'}-${index}`} className="border-b border-[#f0e5d0]">
                  <td className="py-3 pr-4">{log.date || '—'}</td>
                  <td className="py-3 pr-4 font-bold">{log.lot_name || eventLotId(log)}</td>
                  <td className="py-3 pr-4"><b>{fmtNumber(eggCount(log))}</b><p className="text-[11px] text-[#8a7456]">{tabletLabel(eggCount(log))}</p></td>
                  <td className="py-3 pr-4">{fmtNumber(brokenEggs(log))}</td>
                  <td className="py-3 pr-4 font-bold text-emerald-700"><b>+{fmtNumber(sellable)} œufs</b><p className="text-[11px] text-emerald-700">{tabletLabel(sellable)}</p></td>
                  <td className="py-3 pr-4">{log.responsable_label || log.responsable || '—'}</td>
                  <td className="py-3 pr-4"><div className="flex gap-1"><ActionButton icon={Edit} onClick={() => startEdit(log)}>Modifier</ActionButton>{onDeleteProduction ? <ActionButton icon={Trash2} danger onClick={() => remove(log)}>Supprimer</ActionButton> : null}</div></td>
                </tr>
              );
            })}
            {!logs.length ? <tr><td colSpan="7" className="py-4 text-center text-[#8a7456]">Aucun ramassage enregistré pour les lots pondeuses actifs.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function AvicoleJournalsBridge(props) {
  const stockCrud = useCrudModule('stock');
  return <div className="space-y-5"><EggJournal {...props} stockCrud={stockCrud} /></div>;
}
