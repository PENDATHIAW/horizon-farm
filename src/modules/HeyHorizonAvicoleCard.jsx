import { CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { avicoleActiveCount } from '../utils/avicoleMetrics';
import { fmtNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const num = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const labelOf = (lot = {}) => lot.name || lot.nom || lot.id || 'Lot avicole';
const currentOf = (lot = {}) => avicoleActiveCount(lot);
const mortalityOf = (lot = {}) => num(lot.mortality ?? lot.morts ?? lot.dead_count);
const draftActionLabel = (formType = '') => formType === 'egg_production' ? 'Ramassage œufs' : formType === 'poultry_mortality' ? 'Mortalité' : 'Clôture / réforme';

export default function HeyHorizonAvicoleCard({ draft, rows, onUpdate, onCreateProduction, onRefreshProduction, onCreateBusinessEvent, onRefresh, onRefreshBusinessEvents, onClose, onCreateEggOpportunity }) {
  const fields = draft?.draft_fields || {};
  const formType = draft?.form_type;
  const [lotId, setLotId] = useState(fields.lot_id || rows[0]?.id || '');
  const [quantity, setQuantity] = useState(fields.eggs_count || fields.quantity || '');
  const [date, setDate] = useState(fields.date || today());
  const [note, setNote] = useState(fields.notes || draft?.raw_input || '');
  const [saving, setSaving] = useState(false);
  const lot = rows.find((item) => String(item.id) === String(lotId)) || rows[0] || {};
  const actionLabel = draftActionLabel(formType);
  const nextCount = formType === 'poultry_mortality' || formType === 'poultry_close' ? Math.max(0, currentOf(lot) - num(quantity)) : currentOf(lot);
  const submit = async () => {
    if (!lot?.id) return toast.error('Lot obligatoire');
    if (formType !== 'poultry_close' && num(quantity) <= 0) return toast.error('Quantité obligatoire');
    try {
      setSaving(true);
      if (formType === 'egg_production') {
        const eggs = num(quantity);
        const tablettes = Math.floor(eggs / 30);
        await onCreateProduction?.({ id: makeId('PONTE'), lot_id: lot.id, related_id: lot.id, date, oeufs_produits: eggs, oeufs_casses: 0, oeufs_vendables: eggs, oeufs: eggs, eggs_count: eggs, tablettes, tablettes_vendables: tablettes, plateaux: tablettes, oeufs_restants: eggs % 30, oeufs_reliquat: eggs % 30, oeufs_par_tablette: 30, unite_vente: 'tablette', type_evenement: 'ramassage_oeufs', source_module: 'hey_horizon', source_record_id: lot.id, notes: note });
        try { await onCreateEggOpportunity?.(lot, eggs, date, note || draft?.raw_input || ''); } catch (error) { console.warn('Opportunité œufs non créée', error); toast.error('Ramassage enregistré, opportunité œufs à vérifier'); }
        try { await onRefreshProduction?.(); } catch (error) { console.warn('Rafraîchissement production impossible', error); }
      } else if (formType === 'poultry_mortality') {
        const newMortality = mortalityOf(lot) + num(quantity);
        await onUpdate?.(lot.id, { mortality: newMortality, morts: newMortality, current_count: nextCount, effectif_actuel: nextCount, status: nextCount === 0 ? 'perdu_mortalite' : (lot.status || lot.statut || 'actif'), statut: nextCount === 0 ? 'perdu_mortalite' : (lot.statut || lot.status || 'actif'), last_event_date: date, last_health_note: note });
      } else if (formType === 'poultry_close') {
        const qty = num(quantity) || currentOf(lot);
        const next = Math.max(0, currentOf(lot) - qty);
        await onUpdate?.(lot.id, { current_count: next, effectif_actuel: next, vendus: num(lot.vendus) + qty, sold_count: num(lot.sold_count) + qty, status: next === 0 ? (fields.action_type === 'reforme' ? 'reforme' : 'vendu') : 'sortie_partielle', statut: next === 0 ? (fields.action_type === 'reforme' ? 'reforme' : 'vendu') : 'sortie_partielle', date_sortie: date, notes_sortie: note });
      }
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: formType, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, source_id: lot.id, title: `${actionLabel} · ${labelOf(lot)}`, description: note || draft?.raw_input || '', event_date: date, severity: formType === 'poultry_mortality' ? 'warning' : 'info' });
      await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
      toast.success(`${actionLabel} enregistré`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Action avicole impossible'); } finally { setSaving(false); }
  };
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><CheckCircle2 size={15} /> Fiche avicole</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">{actionLabel}</h3></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Lot</span><select value={lotId} onChange={(e) => setLotId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm">{rows.map((item) => <option key={item.id} value={item.id}>{labelOf(item)} · {item.id} · {fmtNumber(currentOf(item))} actif(s)</option>)}</select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">{formType === 'egg_production' ? 'Œufs' : 'Quantité'}</span><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></div>
      <div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800">{formType === 'egg_production' ? <>Tablettes : <b>{Math.floor(num(quantity) / 30)}</b></> : <>Effectif après action : <b>{fmtNumber(nextCount)}</b></>}</div>
      <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Validation...' : 'Valider'}</button></div>
    </section>
  );
}
