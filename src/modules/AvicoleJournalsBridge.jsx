import { useMemo, useState } from 'react';
import { Drumstick, Edit, Egg, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtNumber, toNumber } from '../utils/format';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount } from '../utils/avicoleMetrics';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const eventType = (row = {}) => String(row.type_evenement || row.event_type || row.type || '').toLowerCase();
const isEggLog = (row = {}) => eventType(row).includes('ramassage') || eventType(row).includes('oeufs') || eventType(row).includes('œufs') || row.oeufs_produits !== undefined;
const isSlaughter = (row = {}) => eventType(row).includes('abattage') || eventType(row).includes('slaughter');
const eggCount = (row = {}) => toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
const brokenEggs = (row = {}) => toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
const activeCount = avicoleActiveCount;
const eventLotId = (row = {}) => row.lot_id || row.related_id || row.source_record_id || row.entity_id;
const slaughterCount = (row = {}) => toNumber(row.nombre_abattu ?? row.abattus ?? row.quantity ?? row.quantite);
const avgSlaughterWeight = (row = {}) => toNumber(row.poids_moyen_abattage ?? row.poids_moyen ?? row.average_weight ?? row.weight_avg);
const totalSlaughterWeight = (row = {}) => toNumber(row.poids_total_abattage ?? row.poids_total ?? row.total_weight) || slaughterCount(row) * avgSlaughterWeight(row);
const SLAUGHTER_KEY = 'horizon_farm_avicole_slaughter_journal';

function readLocalSlaughters() {
  if (typeof window === 'undefined') return [];
  try { const parsed = JSON.parse(window.localStorage.getItem(SLAUGHTER_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function writeLocalSlaughters(rows) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SLAUGHTER_KEY, JSON.stringify(arr(rows).slice(0, 200)));
}

function Field({ label, children }) { return <label className="text-xs font-bold text-[#8a7456] space-y-1"><span>{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function Select(props) { return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function ActionButton({ children, onClick, icon: Icon, danger = false, type = 'button', disabled = false }) { return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${danger ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#fffdf8] text-[#2f2415] border border-[#d6c3a0]'} disabled:opacity-50`}><Icon size={14} />{children}</button>; }

function EggJournal({ rows, productionLogs, onCreateProduction, onUpdateProduction, onDeleteProduction, onRefreshProduction }) {
  const [editing, setEditing] = useState(null);
  const pondeuses = useMemo(() => filterLotsByActivity(rows, 'Pondeuse').filter((lot) => activeCount(lot) > 0), [rows]);
  const logs = useMemo(() => arr(productionLogs).filter(isEggLog).sort((a, b) => String(b.date || b.created_at).localeCompare(String(a.date || a.created_at))), [productionLogs]);
  const initial = { id: `PROD-${Date.now()}`, lot_id: pondeuses[0]?.id || '', date: today(), heure_ramassage: '', oeufs_produits: '', oeufs_casses: 0, responsable: '', notes: '' };
  const [form, setForm] = useState(initial);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    const lot = pondeuses.find((item) => item.id === form.lot_id);
    if (!lot) return toast.error('Choisir un lot pondeuse actif');
    const produced = eggCount(form); const broken = brokenEggs(form);
    if (produced <= 0) return toast.error('Nombre d’œufs obligatoire');
    if (broken > produced) return toast.error('Les œufs cassés ne peuvent pas dépasser le total');
    const payload = { ...form, id: form.id || `PROD-${Date.now()}`, lot_id: lot.id, lot_name: lot.name || lot.id, date: form.date || today(), oeufs_produits: produced, oeufs_casses: broken, oeufs_vendables: Math.max(0, produced - broken), type_evenement: 'ramassage_oeufs', source_module: 'avicole', related_id: lot.id };
    if (editing) await onUpdateProduction?.(editing.id, payload); else await onCreateProduction?.(payload);
    await onRefreshProduction?.(); toast.success(editing ? 'Ramassage modifié' : 'Ramassage enregistré'); setEditing(null); setForm(initial);
  };
  const startEdit = (log) => { setEditing(log); setForm({ ...log, lot_id: eventLotId(log), date: log.date || today(), oeufs_produits: eggCount(log), oeufs_casses: brokenEggs(log) }); };
  const remove = async (log) => { await onDeleteProduction?.(log.id); await onRefreshProduction?.(); toast.success('Ramassage supprimé'); };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Egg size={20} /> Journal de ramassage des œufs</p><p className="mt-1 text-sm text-[#8a7456]">Ajoute, modifie et contrôle les ramassages par lot pondeuse.</p></div><ActionButton icon={RefreshCw} onClick={onRefreshProduction}>Actualiser</ActionButton></div><form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-7 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Field label="Lot pondeuse"><Select value={form.lot_id || ''} onChange={(e) => update('lot_id', e.target.value)}><option value="">Choisir</option>{pondeuses.map((lot) => <option key={lot.id} value={lot.id}>{lot.name || lot.id}</option>)}</Select></Field><Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => update('date', e.target.value)} /></Field><Field label="Heure"><Input value={form.heure_ramassage || ''} onChange={(e) => update('heure_ramassage', e.target.value)} placeholder="ex: 08:30" /></Field><Field label="Œufs ramassés"><Input type="number" min="0" value={form.oeufs_produits || ''} onChange={(e) => update('oeufs_produits', e.target.value)} /></Field><Field label="Cassés"><Input type="number" min="0" value={form.oeufs_casses || 0} onChange={(e) => update('oeufs_casses', e.target.value)} /></Field><Field label="Vendables"><Input readOnly value={Math.max(0, eggCount(form) - brokenEggs(form))} /></Field><div className="flex items-end gap-2"><ActionButton type="submit" icon={editing ? Save : Plus}>{editing ? 'Modifier' : 'Ajouter'}</ActionButton>{editing ? <ActionButton icon={X} onClick={() => { setEditing(null); setForm(initial); }}>Annuler</ActionButton> : null}</div></form><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-xs uppercase text-[#8a7456] border-b border-[#eadcc2]"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Œufs</th><th className="py-2 pr-4">Cassés</th><th className="py-2 pr-4">Vendables</th><th className="py-2 pr-4">Responsable</th><th className="py-2 pr-4">Actions</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b border-[#f0e5d0]"><td className="py-3 pr-4">{log.date || '—'}</td><td className="py-3 pr-4 font-bold">{log.lot_name || eventLotId(log)}</td><td className="py-3 pr-4">{fmtNumber(eggCount(log))}</td><td className="py-3 pr-4">{fmtNumber(brokenEggs(log))}</td><td className="py-3 pr-4">{fmtNumber(Math.max(0, eggCount(log) - brokenEggs(log)))}</td><td className="py-3 pr-4">{log.responsable_label || log.responsable || '—'}</td><td className="py-3 pr-4"><div className="flex gap-1"><ActionButton icon={Edit} onClick={() => startEdit(log)}>Modifier</ActionButton>{onDeleteProduction ? <ActionButton icon={Trash2} danger onClick={() => remove(log)}>Supprimer</ActionButton> : null}</div></td></tr>)}{!logs.length ? <tr><td colSpan="7" className="py-4 text-center text-[#8a7456]">Aucun ramassage enregistré.</td></tr> : null}</tbody></table></div></section>;
}

function SlaughterJournal({ rows, businessEvents, onCreateBusinessEvent, onUpdateBusinessEvent, onDeleteBusinessEvent, onRefreshBusinessEvents, onUpdate, onRefresh }) {
  const [editing, setEditing] = useState(null);
  const [localEvents, setLocalEvents] = useState(() => readLocalSlaughters());
  const chairLots = useMemo(() => filterLotsByActivity(rows, 'Chair').filter((lot) => activeCount(lot) > 0), [rows]);
  const events = useMemo(() => {
    const merged = [...arr(businessEvents).filter(isSlaughter), ...arr(localEvents).filter(isSlaughter)];
    return merged.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).sort((a, b) => String(b.date || b.created_at).localeCompare(String(a.date || a.created_at)));
  }, [businessEvents, localEvents]);
  const initial = { id: `ABAT-${Date.now()}`, lot_id: chairLots[0]?.id || '', date: today(), nombre_abattu: '', poids_moyen_abattage: '', destination: 'stock', responsable: '', notes: '' };
  const [form, setForm] = useState(initial);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const saveLocal = (next) => { setLocalEvents(next); writeLocalSlaughters(next); };

  const applyCountDelta = async (lot, delta) => { if (!lot || !delta) return; const next = Math.max(0, activeCount(lot) - delta); await onUpdate?.(lot.id, { current_count: next, effectif_actuel: next, abattus: Math.max(0, toNumber(lot.abattus) + delta), status: next <= 0 ? 'cloture' : lot.status, phase: next <= 0 ? 'Clôturé' : lot.phase }); await onRefresh?.(); };

  const submit = async (e) => {
    e.preventDefault();
    const lot = chairLots.find((item) => item.id === form.lot_id) || rows.find((item) => item.id === form.lot_id);
    if (!lot) return toast.error('Choisir un lot chair');
    const count = slaughterCount(form); const avg = avgSlaughterWeight(form);
    if (count <= 0) return toast.error('Nombre abattu obligatoire');
    if (count > activeCount(lot) && !editing) return toast.error('Nombre abattu supérieur à l’effectif actif');
    if (avg <= 0) return toast.error(count === 1 ? 'Saisir le poids du poulet abattu' : 'Saisir le poids moyen à l’abattage');
    const previousCount = editing ? slaughterCount(editing) : 0; const delta = count - previousCount;
    const payload = { ...form, id: form.id || `ABAT-${Date.now()}`, lot_id: lot.id, lot_name: lot.name || lot.id, related_id: lot.id, date: form.date || today(), nombre_abattu: count, poids_moyen_abattage: avg, poids_total_abattage: Number((count * avg).toFixed(2)), destination: form.destination || 'stock', type_evenement: 'abattage_chair', source_module: 'avicole', module_lie: 'avicole', title: `Abattage chair: ${lot.name || lot.id}`, message: `${fmtNumber(count)} sujet(s) abattu(s), poids total ${(count * avg).toFixed(2)} kg`, status: 'genere' };
    if (editing && onUpdateBusinessEvent) await onUpdateBusinessEvent(editing.id, payload);
    if (!editing && onCreateBusinessEvent) await onCreateBusinessEvent(payload);
    const nextLocal = editing ? localEvents.map((item) => item.id === editing.id ? payload : item) : [payload, ...localEvents];
    saveLocal(nextLocal);
    if (delta !== 0) await applyCountDelta(lot, delta);
    await onRefreshBusinessEvents?.(); toast.success(editing ? 'Abattage modifié' : 'Abattage enregistré'); setEditing(null); setForm(initial);
  };
  const startEdit = (event) => { setEditing(event); setForm({ ...event, lot_id: eventLotId(event), date: event.date || today(), nombre_abattu: slaughterCount(event), poids_moyen_abattage: avgSlaughterWeight(event), destination: event.destination || 'stock' }); };
  const remove = async (event) => { const lot = rows.find((item) => item.id === eventLotId(event)); await applyCountDelta(lot, -slaughterCount(event)); if (onDeleteBusinessEvent) await onDeleteBusinessEvent(event.id); saveLocal(localEvents.filter((item) => item.id !== event.id)); await onRefreshBusinessEvents?.(); toast.success('Abattage supprimé'); };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Drumstick size={20} /> Journal d’abattage chair</p><p className="mt-1 text-sm text-[#8a7456]">Historise les abattages, diminue le lot chair et calcule le poids total.</p></div><ActionButton icon={RefreshCw} onClick={() => { setLocalEvents(readLocalSlaughters()); onRefreshBusinessEvents?.(); }}>Actualiser</ActionButton></div><form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-8 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Field label="Lot chair"><Select value={form.lot_id || ''} onChange={(e) => update('lot_id', e.target.value)}><option value="">Choisir</option>{chairLots.map((lot) => <option key={lot.id} value={lot.id}>{lot.name || lot.id} · {fmtNumber(activeCount(lot))} actifs</option>)}</Select></Field><Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => update('date', e.target.value)} /></Field><Field label="Nombre abattu"><Input type="number" min="0" value={form.nombre_abattu || ''} onChange={(e) => update('nombre_abattu', e.target.value)} /></Field><Field label={slaughterCount(form) <= 1 ? 'Poids du poulet (kg)' : 'Poids moyen (kg)'}><Input type="number" step="0.01" min="0" value={form.poids_moyen_abattage || ''} onChange={(e) => update('poids_moyen_abattage', e.target.value)} /></Field><Field label="Poids total"><Input readOnly value={`${totalSlaughterWeight(form).toFixed(2)} kg`} /></Field><Field label="Destination"><Select value={form.destination || 'stock'} onChange={(e) => update('destination', e.target.value)}><option value="stock">Stock viande</option><option value="vente_directe">Vente directe</option><option value="consommation_interne">Consommation interne</option><option value="perte">Perte / réforme</option></Select></Field><Field label="Responsable"><Input value={form.responsable || ''} onChange={(e) => update('responsable', e.target.value)} /></Field><div className="flex items-end gap-2"><ActionButton type="submit" icon={editing ? Save : Plus}>{editing ? 'Modifier' : 'Ajouter'}</ActionButton>{editing ? <ActionButton icon={X} onClick={() => { setEditing(null); setForm(initial); }}>Annuler</ActionButton> : null}</div></form><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-xs uppercase text-[#8a7456] border-b border-[#eadcc2]"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Lot</th><th className="py-2 pr-4">Abattus</th><th className="py-2 pr-4">Poids moyen</th><th className="py-2 pr-4">Poids total</th><th className="py-2 pr-4">Destination</th><th className="py-2 pr-4">Actions</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b border-[#f0e5d0]"><td className="py-3 pr-4">{event.date || '—'}</td><td className="py-3 pr-4 font-bold">{event.lot_name || eventLotId(event)}</td><td className="py-3 pr-4">{fmtNumber(slaughterCount(event))}</td><td className="py-3 pr-4">{avgSlaughterWeight(event).toFixed(2)} kg</td><td className="py-3 pr-4">{totalSlaughterWeight(event).toFixed(2)} kg</td><td className="py-3 pr-4">{event.destination || 'stock'}</td><td className="py-3 pr-4"><div className="flex gap-1"><ActionButton icon={Edit} onClick={() => startEdit(event)}>Modifier</ActionButton><ActionButton icon={Trash2} danger onClick={() => remove(event)}>Supprimer</ActionButton></div></td></tr>)}{!events.length ? <tr><td colSpan="7" className="py-4 text-center text-[#8a7456]">Aucun abattage enregistré.</td></tr> : null}</tbody></table></div></section>;
}

export default function AvicoleJournalsBridge(props) { return <div className="space-y-5"><EggJournal {...props} /><SlaughterJournal {...props} /></div>; }
