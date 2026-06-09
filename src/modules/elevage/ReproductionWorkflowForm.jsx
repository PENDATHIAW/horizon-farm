import { Camera, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { enrichAnimalEntryPayload } from '../../services/animalEntryDefaults.js';
import { resolveAnimalScan } from '../../services/animalQrScanService.js';
import { makeId } from '../../utils/ids';
import { getParentLabel } from '../../utils/animalLifecycle.js';
import {
  gestationDaysFor,
  isActiveFemale,
  isFemaleAnimal,
  predictDueDate,
  speciesKey,
  buildReproductionProofDocument,
} from '../../utils/reproductionMetrics.js';
import { REPRODUCTION_TERRAIN_BANNER, REPRODUCTION_WORKFLOW_FORM_ID } from '../../utils/elevageReproductionNavigation.js';
import { ELEVAGE_FORM_GRID } from './elevageUi.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => Number(value || 0);
const labelOf = (row = {}) => row?.name || row?.nom || row?.boucle_numero || row?.tag || row?.id || 'Animal';

export default function ReproductionWorkflowForm({
  draft,
  animaux = [],
  documents = [],
  onUpdateAnimal,
  onCreateAnimal,
  onCreateBusinessEvent,
  onCreateDocument,
  onCreateAlert,
  onRefresh,
  onRefreshBusinessEvents,
  onRefreshDocuments,
  onRefreshAlertes,
  onClose,
  onOpenBirthDraft,
}) {
  const fields = draft?.draft_fields || {};
  const formType = draft?.form_type || '';
  const workflow =
    fields.workflow ||
    (formType === 'reproduction_saillie'
      ? 'saillie'
      : formType === 'reproduction_mise_bas'
        ? 'mise_bas'
        : 'gestation');

  const females = useMemo(() => animaux.filter(isActiveFemale), [animaux]);
  const males = useMemo(
    () =>
      animaux.filter((row) => {
        const sexe = String(row.sexe || row.sex || '').toLowerCase();
        return (sexe === 'm' || sexe === 'male' || sexe === 'mâle') && !['vendu', 'mort'].includes(String(row.status || row.statut || '').toLowerCase());
      }),
    [animaux],
  );

  const [animalId, setAnimalId] = useState(fields.animal_id || fields.target_id || '');
  const [maleId, setMaleId] = useState(fields.male_id || '');
  const [date, setDate] = useState(fields.date || today());
  const [notes, setNotes] = useState(fields.notes || draft?.raw_input || '');
  const [porteeSize, setPorteeSize] = useState(String(fields.portee_size || 1));
  const [scanValue, setScanValue] = useState('');
  const [documentTitle, setDocumentTitle] = useState(fields.document_title || 'Photo portée');
  const [proofPhoto, setProofPhoto] = useState({
    preuve_photo_data: fields.preuve_photo_data || '',
    preuve_file_name: fields.preuve_file_name || '',
    preuve_mime_type: fields.preuve_mime_type || '',
  });
  const [saving, setSaving] = useState(false);

  const selectedFemale = animaux.find((row) => String(row.id) === String(animalId)) || null;
  const predictedDue = selectedFemale ? predictDueDate(selectedFemale, date) : '';

  useEffect(() => {
    setAnimalId(fields.animal_id || fields.target_id || '');
    setMaleId(fields.male_id || '');
    setDate(fields.date || today());
    setNotes(fields.notes || draft?.raw_input || '');
    setPorteeSize(String(fields.portee_size || 1));
  }, [draft, fields.animal_id, fields.target_id, fields.male_id, fields.date, fields.notes, fields.portee_size, draft?.raw_input]);

  const applyScan = () => {
    const result = resolveAnimalScan(scanValue, animaux);
    if (!result.found) {
      toast.error('Animal introuvable pour ce scan');
      return;
    }
    if (!isFemaleAnimal(result.animal)) {
      toast.error('Scan mère : sélectionnez une femelle reproductrice');
      return;
    }
    setAnimalId(result.animalId);
    toast.success(`Mère ${result.displayName} identifiée`);
  };

  const pushReproAlert = async (alert = {}) => {
    if (!onCreateAlert) return;
    const dedupe = alert.dedupe_key || `repro:${alert.entity_id || animalId}:${alert.kind || workflow}`;
    await onCreateAlert({
      id: makeId('ALR'),
      dedupe_key: dedupe,
      module_source: 'reproduction',
      entity_type: 'animal',
      entity_id: alert.entity_id || animalId,
      title: alert.title,
      message: alert.message,
      severity: alert.severity || 'warning',
      status: 'ouverte',
      statut: 'ouverte',
      action_recommandee: alert.action || 'Consulter Reproduction',
    });
    await onRefreshAlertes?.();
  };

  const submitSaillie = async () => {
    if (!animalId) throw new Error('Femelle obligatoire');
    await onUpdateAnimal?.(animalId, {
      male_reproducteur_id: maleId || undefined,
      statut_reproduction: 'disponible',
      notes_reproduction: [selectedFemale?.notes_reproduction, `Saillie ${date}${maleId ? ` · mâle ${maleId}` : ''}`, notes].filter(Boolean).join('\n'),
    });
    await onCreateBusinessEvent?.({
      id: makeId('EVT'),
      event_type: 'saillie',
      module_source: 'reproduction',
      entity_type: 'animal',
      entity_id: animalId,
      title: `Saillie · ${animalId}`,
      description: `Saillie enregistrée${maleId ? ` avec ${getParentLabel(animaux, maleId)}` : ''}. ${notes || ''}`.trim(),
      event_date: date,
      severity: 'info',
    });
  };

  const submitGestation = async () => {
    if (!animalId) throw new Error('Femelle obligatoire');
    const due = predictedDue || predictDueDate(selectedFemale || {}, date);
    await onUpdateAnimal?.(animalId, {
      en_gestation: true,
      date_debut_gestation: date,
      date_prevue_mise_bas: due,
      male_reproducteur_id: maleId || selectedFemale?.male_reproducteur_id || undefined,
      statut_reproduction: 'en_gestation',
      notes_reproduction: [selectedFemale?.notes_reproduction, `Gestation déclarée ${date} · prévue ${due}`, notes].filter(Boolean).join('\n'),
    });
    await onCreateBusinessEvent?.({
      id: makeId('EVT'),
      event_type: 'gestation',
      module_source: 'reproduction',
      entity_type: 'animal',
      entity_id: animalId,
      title: `Gestation · ${animalId}`,
      description: `Mise bas prévue ${due} (${gestationDaysFor(selectedFemale || {})} j). ${notes || ''}`.trim(),
      event_date: date,
      severity: 'info',
    });
    const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
    if (days <= 14) {
      await pushReproAlert({
        dedupe_key: `repro:gestation:${animalId}`,
        entity_id: animalId,
        kind: 'gestation',
        title: `Mise bas proche · ${animalId}`,
        message: `Mise bas prévue dans ${days} jour(s) (${due}).`,
        severity: days < 0 ? 'danger' : 'warning',
      });
    }
  };

  const submitMiseBas = async () => {
    if (!animalId) throw new Error('Mère obligatoire');
    const count = Math.max(1, num(porteeSize));
    const porteeId = makeId('PORT');
    const species = speciesKey(selectedFemale || {});
    const prefix = species === 'Ovin' ? 'OVI' : species === 'Caprin' ? 'CAP' : 'BOV';
    const created = [];

    for (let i = 0; i < count; i += 1) {
      const id = makeId(prefix);
      const payload = enrichAnimalEntryPayload({
        id,
        boucle_numero: id,
        name: `${species} ${id}`,
        nom: `${species} ${id}`,
        type: species,
        espece: species,
        sexe: 'M',
        status: 'actif',
        statut: 'actif',
        health_status: 'sain',
        mode_acquisition: fields.mode_acquisition || 'naissance_ferme',
        date_naissance: date,
        date_entree_ferme: date,
        mere_id: animalId,
        portee_id: porteeId,
        poids_entree: 0,
        notes: notes || `Portée ${porteeId}`,
        source_module: 'reproduction',
      });
      await onCreateAnimal?.(payload);
      created.push(id);
    }

    await onUpdateAnimal?.(animalId, {
      en_gestation: false,
      statut_reproduction: 'a_reposer',
      date_prevue_mise_bas: '',
      notes_reproduction: [selectedFemale?.notes_reproduction, `Mise bas ${date} · portée ${porteeId} (${count})`, notes].filter(Boolean).join('\n'),
    });

    await onCreateBusinessEvent?.({
      id: makeId('EVT'),
      event_type: 'mise_bas',
      module_source: 'reproduction',
      entity_type: 'animal',
      entity_id: animalId,
      title: `Mise bas · ${animalId}`,
      description: `Portée ${porteeId} : ${count} jeune(s) enregistré(s). ${notes || ''}`.trim(),
      event_date: date,
      severity: 'info',
    });

    if (documentTitle && onCreateDocument) {
      await onCreateDocument({
        id: makeId('DOC'),
        title: documentTitle,
        document_category: 'photo_portee',
        module_source: 'reproduction',
        entity_type: 'portee',
        entity_id: porteeId,
        animal_id: animalId,
        portee_id: porteeId,
        date: date,
        notes: notes || `Portée ${porteeId}`,
        verification_status: 'preuve_manquante',
      });
      await onRefreshDocuments?.();
    }

    return created;
  };

  const submit = async () => {
    try {
      setSaving(true);
      if (workflow === 'saillie') await submitSaillie();
      else if (workflow === 'gestation') await submitGestation();
      else await submitMiseBas();
      await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
      toast.success('Reproduction enregistrée');
      onClose?.();
    } catch (error) {
      toast.error(error.message || 'Enregistrement reproduction impossible');
    } finally {
      setSaving(false);
    }
  };

  const title =
    workflow === 'saillie'
      ? 'Saillie'
      : workflow === 'mise_bas'
        ? 'Workflow portée (mise bas)'
        : 'Déclaration gestation';

  const handleProofFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProofPhoto({
        preuve_photo_data: String(reader.result || ''),
        preuve_file_name: file.name,
        preuve_mime_type: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  if (formType === 'reproduction_document') {
    return (
      <section id={REPRODUCTION_WORKFLOW_FORM_ID} className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-700 font-black">Preuve reproduction</p>
            <h3 className="mt-1 text-xl font-black text-[#2f2415]">Joindre preuve</h3>
            <p className="mt-1 text-sm text-emerald-800">Mère obligatoire · photo stockée dans Documents · lien animal + module reproduction.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button>
        </div>
        <div className={ELEVAGE_FORM_GRID}>
          <label className="space-y-1">
            <span className="text-xs font-bold text-emerald-800">Mère (obligatoire)</span>
            <select
              value={animalId}
              onChange={(e) => setAnimalId(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Choisir la mère</option>
              {females.map((row) => (
                <option key={row.id} value={row.id}>{labelOf(row)} · {row.id}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold text-emerald-800">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-bold text-emerald-800">Titre</span>
            <input value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs font-bold text-emerald-800">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold text-emerald-800">Photo preuve</span>
          <label className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-white px-3 py-4 text-sm font-bold text-emerald-800 hover:bg-emerald-50">
            <Upload size={18} /> Prendre / importer une photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleProofFile(e.target.files?.[0])} />
          </label>
          {proofPhoto.preuve_photo_data ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-white p-2">
              <img src={proofPhoto.preuve_photo_data} alt="preuve" className="h-14 w-14 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-emerald-800">{proofPhoto.preuve_file_name || 'Photo ajoutée'}</p>
                <p className="text-xs text-emerald-700">Stockée avec le document reproduction.</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <Camera size={13} className="inline mr-1" /> Sans photo : métadonnée seule (preuve_manquante).
            </p>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!animalId) {
                toast.error('Sélectionnez la mère reproductrice');
                return;
              }
              setSaving(true);
              try {
                const docId = makeId('DOC');
                const payload = buildReproductionProofDocument({
                  id: docId,
                  title: documentTitle,
                  animalId,
                  date,
                  notes,
                  preuve_photo_data: proofPhoto.preuve_photo_data,
                  preuve_file_name: proofPhoto.preuve_file_name,
                  preuve_mime_type: proofPhoto.preuve_mime_type,
                });
                await onCreateDocument?.(payload);
                await onCreateBusinessEvent?.({
                  id: makeId('EVT'),
                  event_type: 'document_reproduction',
                  module_source: 'reproduction',
                  entity_type: 'animal',
                  entity_id: animalId,
                  title: `Preuve reproduction · ${animalId}`,
                  description: `${documentTitle}${notes ? ` — ${notes}` : ''}`,
                  event_date: date,
                  severity: 'info',
                });
                await Promise.allSettled([
                  onRefreshDocuments?.(),
                  onRefreshBusinessEvents?.(),
                ]);
                toast.success(proofPhoto.preuve_photo_data ? 'Preuve reproduction rattachée' : 'Métadonnée reproduction enregistrée');
                onClose?.();
              } catch {
                toast.error('Document impossible');
              } finally {
                setSaving(false);
              }
            }}
            className="min-h-[48px] rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60"
          >
            {saving ? '…' : 'Rattacher'}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id={REPRODUCTION_WORKFLOW_FORM_ID} className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2">
            <Camera size={15} /> Workflow reproduction
          </p>
          <h3 className="mt-1 text-xl font-black text-[#2f2415]">{title}</h3>
          <p className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">{REPRODUCTION_TERRAIN_BANNER}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button>
      </div>

      {workflow === 'mise_bas' ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-1">
            <span className="text-xs font-bold text-emerald-800">Scan mère (QR / boucle)</span>
            <input value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="BOV-001 ou scan" className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
          </label>
          <button type="button" onClick={applyScan} className="min-h-[48px] rounded-xl border border-emerald-300 bg-white px-4 text-sm font-black text-emerald-800">Identifier mère</button>
        </div>
      ) : null}

      <div className={ELEVAGE_FORM_GRID}>
        <label className="space-y-1">
          <span className="text-xs font-bold text-emerald-800">Femelle</span>
          <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm">
            <option value="">Choisir</option>
            {females.map((row) => (
              <option key={row.id} value={row.id}>{labelOf(row)} · {row.id}</option>
            ))}
          </select>
        </label>

        {workflow !== 'gestation' ? (
          <label className="space-y-1">
            <span className="text-xs font-bold text-emerald-800">Mâle reproducteur</span>
            <select value={maleId} onChange={(e) => setMaleId(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm">
              <option value="">Optionnel</option>
              {males.map((row) => (
                <option key={row.id} value={row.id}>{labelOf(row)} · {row.id}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="space-y-1">
          <span className="text-xs font-bold text-emerald-800">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
        </label>

        {workflow === 'gestation' && predictedDue ? (
          <label className="space-y-1">
            <span className="text-xs font-bold text-emerald-800">Mise bas prévue (IA règles)</span>
            <input readOnly value={predictedDue} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-[#fffdf8] px-3 py-2 text-sm font-black" />
          </label>
        ) : null}

        {workflow === 'mise_bas' ? (
          <>
            <label className="space-y-1">
              <span className="text-xs font-bold text-emerald-800">Nombre de jeunes</span>
              <input type="number" min={1} value={porteeSize} onChange={(e) => setPorteeSize(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-emerald-800">Document portée</span>
              <input value={documentTitle} onChange={(e) => setDocumentTitle(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
            </label>
          </>
        ) : null}

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-bold text-emerald-800">Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full min-h-[48px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {workflow === 'mise_bas' && onOpenBirthDraft ? (
          <button
            type="button"
            onClick={() => onOpenBirthDraft({ animalId, date, notes, portee_size: porteeSize })}
            className="min-h-[48px] rounded-xl border border-emerald-300 bg-white px-4 text-sm font-black text-emerald-800"
          >
            Fiche jeune (1 animal)
          </button>
        ) : null}
        <button type="button" onClick={submit} disabled={saving} className="min-h-[48px] rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">
          {saving ? 'Validation…' : 'Valider'}
        </button>
      </div>
    </section>
  );
}
