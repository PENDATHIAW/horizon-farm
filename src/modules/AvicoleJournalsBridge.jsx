import { useMemo, useState } from 'react';
import { Edit, Egg, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount } from '../utils/avicoleMetrics';
import { brokenEggs as brokenEggsShared, eggCount as eggCountShared, sellableEggs as sellableEggsShared, syncEggStockFromProduction, tabletLabel as tabletLabelShared, tabletsFromEggs } from '../services/eggStockSyncService.js';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const eventType = (row = {}) => String(row.type_evenement || row.event_type || row.type || '').toLowerCase();
const isEggLog = (row = {}) => eventType(row).includes('ramassage') || eventType(row).includes('oeufs') || eventType(row).includes('œufs') || row.oeufs_produits !== undefined;
const activeCount = avicoleActiveCount;
const eventLotId = (row = {}) => String(row.lot_id || row.related_id || row.source_record_id || row.entity_id || row.cible_id || row.target_id || '').trim();
const linkedToLot = (row = {}, lotIds = new Set()) => {
  if (!lotIds.size) return false;
  const id = eventLotId(row);
  return Boolean(id && lotIds.has(id));
};

async function syncWithoutBlocking(fn, message) {
  try {
    await fn?.();
  } catch (error) {
    console.warn(message, error);
    toast.error(message);
  }
}

function Field({ label, children }) { return <label className="text-xs font-bold text-[#8a7456] space-y-1"><span>{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function Select(props) { return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function ActionButton({ children, onClick, icon: Icon, danger = false, type = 'button', disabled = false }) { return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${danger ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#fffdf8] text-[#2f2415] border border-[#d6c3a0]'} disabled:opacity-50`}><Icon size={14} />{children}</button>; }

function EggJournal({ rows, productionLogs, stockCrud, onCreateProduction, onCommitEggProduction, onUpdateProduction, onDeleteProduction, onRefreshProduction }) {
  const [editing, setEditing] = useState(null);
  const pondeuses = useMemo(() => filterLotsByActivity(rows, 'Pondeuse').filter((lot) => activeCount(lot) > 0), [rows]);
  const pondeuseIds = useMemo(() => new Set(pondeuses.map((lot) => String(lot.id))), [pondeuses]);
  const logs = useMemo(() => arr(productionLogs).filter((log) => isEggLog(log) && linkedToLot(log, pondeuseIds)).sort((a, b) => String(b.date || b.created_at).localeCompare(String(a.date || a.created_at))), [productionLogs, pondeuseIds]);
  const initial = { id: `PROD-${Date.now()}`, lot_id: pondeuses[0]?.id || '', date: today(), heure_ramassage: '', oeufs_produits: '', oeufs_casses: 0, responsable: '', notes: '' };
  const [form, setForm] = useState(initial);
  if (!pondeuses.length) return null;
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const lot = pondeuses.find((item) => item.id === form.lot_id);
    if (!lot) return toast.error('Choisir un lot pondeuse actif');
    const produced = eggCountShared(form); const broken = brokenEggsShared(form);
    if (produced <= 0) return toast.error('Nombre d’œufs obligatoire');
    if (broken > produced) return toast.error('Les œufs cassés ne peuvent pas dépasser le total');
    const sellable = Math.max(0, produced - broken);
    const converted = tabletsFromEggs(sellable);
    const payload = { ...form, id: form.id || `PROD-${Date.now()}`, lot_id: lot.id, lot_name: lot.name || lot.id, date: form.date || today(), oeufs_produits: produced, oeufs_casses: broken, oeufs_vendables: sellable, tablettes: converted.tablettes, tablettes_vendables: converted.tablettes, plateaux: converted.tablettes, oeufs_restants: converted.oeufs_restants, oeufs_reliquat: converted.oeufs_restants, oeufs_par_tablette: 30, unite_vente: 'tablette', type_evenement: 'ramassage_oeufs', source_module: 'avicole', related_id: lot.id };
    if (editing) {
      await onUpdateProduction?.(editing.id, payload);
      await syncWithoutBlocking(() => syncEggStockFromProduction({ stockCrud, log: payload, previousLog: editing }), 'Stock œufs/tablettes non synchronisé');
    } else if (onCommitEggProduction) {
      await onCommitEggProduction({ ...payload, heure_ramassage: form.heure_ramassage, responsable: form.responsable, notes: form.notes });
    } else {
      await onCreateProduction?.(payload);
      await syncWithoutBlocking(() => syncEggStockFromProduction({ stockCrud, log: payload, previousLog: editing }), 'Stock œufs/tablettes non synchronisé');
    }
    await syncWithoutBlocking(() => onRefreshProduction?.(), 'Rafraîchissement production indisponible');
    toast.success(editing ? `Ramassage modifié · ${tabletLabelShared(sellable)}` : `Ramassage enregistré · ${tabletLabelShared(sellable)}`);
    setEditing(null); setForm(initial);
  };
  const startEdit = (log) => { setEditing(log); setForm({ ...log, lot_id: eventLotId(log), date: log.date || today(), oeufs_produits: eggCountShared(log), oeufs_casses: brokenEggsShared(log) }); };
  const remove = async (log) => { await onDeleteProduction?.(log.id); await syncWithoutBlocking(() => syncEggStockFromProduction({ stockCrud, log: {}, previousLog: log }), 'Stock œufs/tablettes non resynchronisé'); await syncWithoutBlocking(() => onRefreshProduction?.(), 'Rafraîchissement production indisponible'); toast.success(`Ramassage supprimé · stock corrigé (${tabletLabelShared(sellableEggsShared(log))})`); };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Egg size={20} /> Journal de ramassage des œufs</p><p className="mt-1 text-sm text-[#8a7456]">Visible uniquement pour les lots pondeuses actifs. Chaque ramassage alimente le stock en tablettes : 1 tablette = 30 œufs.</p></div><ActionButton icon={RefreshCw} onClick={onRefreshProduction}>Actualiser</ActionButton></div><form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-7 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Field label="Lot pondeuse"><Select value={form.lot_id || ''} onChange={(e) => update('lot_id', e.target.value)}><option value="">Choisir</option>{pondeuses.map((lot, index) => <option key={`${lot.id || 'lot'}-${index}`} value={lot.id}>{lot.name || lot.id}</option>)}</Select></Field><Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => update('date', e.target.value)} /></Field><Field label="Heure"><Input value={form.heure_ramassage || ''} onChange={(e) => update('heure_ramassage', e.target.value)} placeholder="ex: 08:30" /></Field><Field label="Œufs ramassés"><Input type="number" min="0" value={form.oeufs_produits || ''} onChange={(e) => update('oeufs_produits', e.target.value)} /></Field><Field label="Cassés"><Input type="number" min="0" value={form.oeufs_casses || 0} onChange={(e) => update('oeufs_casses', e.target.value)} /></Field><Field label="Vendables"><Input readOnly value={`${fmtNumber(sellableEggsShared(form))} œufs · ${tabletLabelShared(sellableEggsShared(form))}`} /></Field><div className="flex items-end gap-2"><ActionButton type="submit" icon={editing ? Save : Plus}>{editing ? 'Modifier' : 'Ajouter'}</ActionButton>{editing ? <ActionButton icon={X} onClick={() => { setEditing(null); setForm(initial); }}>Annuler</ActionButton> : null}</div></form><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-xs uppercase text-[#8a7456] border-b border-[#eadcc2]"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Œufs</th><th className="py-2 pr-4">Cassés</th><th className="py-2 pr-4">Stock ajouté</th><th className="py-2 pr-4">Responsable</th><th className="py-2 pr-4">Actions</th></tr></thead><tbody>{logs.map((log, index) => { const sellable = sellableEggsShared(log); return <tr key={`${log.id || eventLotId(log) || 'ramassage'}-${index}`} className="border-b border-[#f0e5d0]"><td className="py-3 pr-4">{log.date || '—'}</td><td className="py-3 pr-4 font-bold">{log.lot_name || eventLotId(log)}</td><td className="py-3 pr-4"><b>{fmtNumber(eggCountShared(log))}</b><p className="text-[11px] text-[#8a7456]">{tabletLabelShared(eggCountShared(log))}</p></td><td className="py-3 pr-4">{fmtNumber(brokenEggsShared(log))}</td><td className="py-3 pr-4 font-bold text-emerald-700"><b>+{fmtNumber(sellable)} œufs</b><p className="text-[11px] text-emerald-700">{tabletLabelShared(sellable)}</p></td><td className="py-3 pr-4">{log.responsable_label || log.responsable || '—'}</td><td className="py-3 pr-4"><div className="flex gap-1"><ActionButton icon={Edit} onClick={() => startEdit(log)}>Modifier</ActionButton>{onDeleteProduction ? <ActionButton icon={Trash2} danger onClick={() => remove(log)}>Supprimer</ActionButton> : null}</div></td></tr>; })}{!logs.length ? <tr><td colSpan="7" className="py-4 text-center text-[#8a7456]">Aucun ramassage enregistré pour les lots pondeuses actifs.</td></tr> : null}</tbody></table></div></section>;
}

export default function AvicoleJournalsBridge(props) {
  const stockCrud = useCrudModule('stock');
  return <div className="space-y-5"><EggJournal {...props} stockCrud={stockCrud} /></div>;
}
