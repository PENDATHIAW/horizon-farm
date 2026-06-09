import { Scale, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { enrichAnimalEntryPayload } from '../services/animalEntryDefaults.js';
import { resolveAnimalScan } from '../services/animalQrScanService.js';
import { makeId } from '../utils/ids';

const toNumber = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const statusOf = (row = {}) => String(row.status || row.statut || '').trim().toLowerCase();
const lossValueOf = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.purchase_cost ?? row.cout_achat ?? row.prix_achat);
const labelOf = (row = {}) => row.name || row.nom || row.boucle_numero || row.tag || row.id || 'Animal';
const targetFrom = (draft = {}) => draft.draft_fields?.target_id || draft.draft_fields?.animal_id || '';
const findAnimal = (id = '', rows = []) => rows.find((row) => [row.id, row.boucle_numero, row.qr_code, row.tag].map((v) => String(v || '').toUpperCase()).includes(String(id || '').toUpperCase())) || null;
const speciesFromType = (type = '') => String(type || '').toLowerCase().includes('ovin') ? 'Ovin' : String(type || '').toLowerCase().includes('caprin') ? 'Caprin' : 'Bovin';
const isBirthMode = (mode = '') => ['naissance_ferme', 'reproduction_interne'].includes(String(mode || '').toLowerCase());

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
  const [modeAcquisition, setModeAcquisition] = useState(fields.mode_acquisition || 'achat');
  const [mereId, setMereId] = useState(fields.mere_id || '');
  const [pereId, setPereId] = useState(fields.pere_id || fields.male_id || '');
  const [sexe, setSexe] = useState(fields.sexe || 'M');
  const [scanValue, setScanValue] = useState('');
  const [saving, setSaving] = useState(false);
  const animal = useMemo(() => findAnimal(targetId, rows), [targetId, rows]);
  const females = useMemo(() => rows.filter((row) => String(row.sexe || row.sex || '').toLowerCase().startsWith('f')), [rows]);
  const males = useMemo(() => rows.filter((row) => String(row.sexe || row.sex || '').toLowerCase().startsWith('m')), [rows]);
  const title = formType === 'animal_weighing' ? 'Pesée animal' : formType === 'animal_loss' ? 'Incident / sortie animal' : 'Création animal';

  useEffect(() => {
    if (fields.mode_acquisition) setModeAcquisition(fields.mode_acquisition);
    if (fields.mere_id) setMereId(fields.mere_id);
    if (fields.pere_id || fields.male_id) setPereId(fields.pere_id || fields.male_id);
    if (fields.sexe) setSexe(fields.sexe);
  }, [fields.mode_acquisition, fields.mere_id, fields.pere_id, fields.male_id, fields.sexe]);

  const applyMotherScan = () => {
    const result = resolveAnimalScan(scanValue, rows);
    if (!result.found) {
      toast.error('Mère introuvable pour ce scan');
      return;
    }
    setMereId(result.animalId);
    toast.success(`Mère ${result.displayName} pré-remplie`);
  };

  const submit = async () => {
    try {
      setSaving(true);
      if (formType === 'animal_creation') {
        const id = fields.id || makeId(type === 'Ovin' ? 'OVI' : type === 'Caprin' ? 'CAP' : 'BOV');
        const porteeId = fields.portee_id || (isBirthMode(modeAcquisition) ? makeId('PORT') : '');
        const payload = enrichAnimalEntryPayload({
          id,
          boucle_numero: id,
          name: name || id,
          nom: name || id,
          type,
          espece: type,
          sexe,
          status: 'actif',
          statut: 'actif',
          health_status: 'sain',
          mode_acquisition: modeAcquisition,
          date_naissance: isBirthMode(modeAcquisition) ? date : fields.date_naissance,
          date_entree_ferme: date,
          date_derniere_pesee: date,
          poids: toNumber(weight),
          poids_entree: toNumber(weight),
          mere_id: mereId || undefined,
          pere_id: pereId || undefined,
          portee_id: porteeId || undefined,
          notes: note,
          source_module: 'reproduction',
        });
        await onCreate?.(payload);
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
        {formType === 'animal_creation' ? (
          <>
            <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Mode acquisition</span><select value={modeAcquisition} onChange={(e) => setModeAcquisition(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="achat">Achat</option><option value="naissance_ferme">Naissance ferme</option><option value="reproduction_interne">Reproduction interne</option></select></label>
            <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Espèce</span><select value={type} onChange={(e) => setType(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option>Bovin</option><option>Ovin</option><option>Caprin</option></select></label>
            <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Sexe jeune</span><select value={sexe} onChange={(e) => setSexe(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="M">Mâle</option><option value="F">Femelle</option></select></label>
            <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Nom / repère</span><input value={name} onChange={(e) => setName(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>
            {isBirthMode(modeAcquisition) ? (
              <>
                <label className="space-y-1 md:col-span-2"><span className="text-xs font-bold text-emerald-800">Scan mère</span><div className="flex gap-2"><input value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="QR / boucle" className="flex-1 min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /><button type="button" onClick={applyMotherScan} className="min-h-[48px] rounded-xl border border-emerald-300 bg-white px-3 text-xs font-black">Scan</button></div></label>
                <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Mère</span><select value={mereId} onChange={(e) => setMereId(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="">Choisir</option>{females.map((row) => <option key={row.id} value={row.id}>{labelOf(row)}</option>)}</select></label>
                <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Père (optionnel)</span><select value={pereId} onChange={(e) => setPereId(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="">—</option>{males.map((row) => <option key={row.id} value={row.id}>{labelOf(row)}</option>)}</select></label>
              </>
            ) : null}
          </>
        ) : (
          <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Animal</span><select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value={targetId}>{animal ? `${labelOf(animal)} · ${targetId}` : targetId || 'Choisir'}</option>{rows.filter((row) => String(row.id) !== String(targetId)).map((row) => <option key={row.id} value={row.id}>{labelOf(row)} · {row.id}</option>)}</select></label>
        )}
        {formType === 'animal_loss' ? <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Statut</span><select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="mort">Mort</option><option value="perdu">Perdu</option><option value="vole">Volé</option></select></label> : <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Poids kg</span><input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>}
        <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>
        <label className="space-y-1 md:col-span-3"><span className="text-xs font-bold text-emerald-800">Note</span><input value={note} onChange={(e) => setNote(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label>
      </div>
      <div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Validation...' : 'Valider'}</button></div>
    </section>
  );
}
