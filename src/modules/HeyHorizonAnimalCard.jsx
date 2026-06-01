import { Scale, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { makeId } from '../utils/ids';

const toNumber = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const statusOf = (row = {}) => String(row.status || row.statut || '').trim().toLowerCase();
const lossValueOf = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.purchase_cost ?? row.cout_achat ?? row.prix_achat);
const labelOf = (row = {}) => row.name || row.nom || row.boucle_numero || row.tag || row.id || 'Animal';
const targetFrom = (draft = {}) => draft.draft_fields?.target_id || draft.draft_fields?.animal_id || '';
const findAnimal = (id = '', rows = []) => rows.find((row) => [row.id, row.boucle_numero, row.qr_code, row.tag].map((v) => String(v || '').toUpperCase()).includes(String(id || '').toUpperCase())) || null;
const speciesFromType = (type = '') => String(type || '').toLowerCase().includes('ovin') ? 'Ovin' : String(type || '').toLowerCase().includes('caprin') ? 'Caprin' : 'Bovin';

export default function HeyHorizonAnimalCard({ draft, rows, species, onCreate, onUpdate, onCreateBusinessEvent, onRefresh, onRefreshBusinessEvents, onClose }) {
  const fields = draft?.draft_fields || {};
  const formType = draft?.form_type;
  const [targetId, setTargetId] = useState(targetFrom(draft));
  const [weight, setWeight] = useState(fields.weight_kg || '');
  const [date, setDate] = useState(fields.date || today());
  const [status, setStatus] = useState(fields.status || 'mort');
  const [name, setName] = useState(fields.name || '');
  const [type, setType] = useState(speciesFromType(fields.type || species));
  const [note, setNote] = useState(fields.notes || draft?.raw_input || '');
  const [saving, setSaving] = useState(false);
  const animal = useMemo(() => findAnimal(targetId, rows), [targetId, rows]);
  const title = formType === 'animal_weighing' ? 'Pesée animal' : formType === 'animal_loss' ? 'Incident / sortie animal' : 'Création animal';
  const submit = async () => {
    try {
      setSaving(true);
      if (formType === 'animal_creation') {
        const id = fields.id || makeId(type === 'Ovin' ? 'OVI' : type === 'Caprin' ? 'CAP' : 'BOV');
        await onCreate?.({ id, boucle_numero: id, name: name || id, nom: name || id, type, espece: type, status: 'actif', statut: 'actif', health_status: 'sain', date_entree_ferme: date, date_derniere_pesee: date, poids: toNumber(weight), poids_entree: toNumber(weight), notes: note, source_module: 'hey_horizon' });
        await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'creation_animal', module_source: 'animaux', entity_type: 'animal', entity_id: id, title: `Animal créé · ${id}`, description: note, event_date: date, severity: 'info' });
      } else {
        if (!targetId) throw new Error('Animal obligatoire');
        const patch = formType === 'animal_weighing'
          ? { poids: toNumber(weight), poids_actuel: toNumber(weight), date_derniere_pesee: date, last_weight: toNumber(weight), last_weight_date: date, notes_pesee: note }
          : { status, statut: status, date_deces: status === 'mort' ? date : undefined, date_sortie: date, cause_deces: note, notes_sortie: note };
        await onUpdate?.(animal?.id || targetId, patch);
        await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: formType === 'animal_weighing' ? 'pesee_animal' : 'perte_animal', module_source: 'animaux', entity_type: 'animal', entity_id: animal?.id || targetId, source_id: animal?.id || targetId, title: `${title} · ${targetId}`, description: note || draft?.raw_input || '', event_date: date, severity: formType === 'animal_loss' ? 'critical' : 'info', amount: formType === 'animal_loss' ? lossValueOf(animal || {}) : 0 });
      }
      await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
      toast.success(`${title} enregistrée`);
      onClose?.();
    } catch (error) { toast.error(error.message || 'Action animal impossible'); } finally { setSaving(false); }
  };
  return (
    <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><Scale size={15} /> Fiche animal</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">{title}</h3></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {formType === 'animal_creation' ? <><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Espèce</span><select value={type} onChange={(e) => setType(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option>Bovin</option><option>Ovin</option><option>Caprin</option></select></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Nom / repère</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label></> : <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Animal</span><select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value={targetId}>{animal ? `${labelOf(animal)} · ${targetId}` : targetId || 'Choisir'}</option>{rows.filter((row) => String(row.id) !== String(targetId)).map((row) => <option key={row.id} value={row.id}>{labelOf(row)} · {row.id}</option>)}</select></label>}
        {formType === 'animal_loss' ? <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Statut</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="mort">Mort</option><option value="perdu">Perdu</option><option value="vole">Volé</option></select></label> : <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Poids kg</span><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>}
        <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>
      </div>
      <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Validation...' : 'Valider'}</button></div>
    </section>
  );
}
