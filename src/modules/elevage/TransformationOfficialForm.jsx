import { AlertTriangle, Camera, ShieldCheck, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import QuickInputModal from '../../components/QuickInputModal.jsx';
import {
  blockSanitaryAction,
  findActiveWithdrawals,
  formatWithdrawalLabel,
  SANITARY_ACTIONS,
} from '../../utils/sanitaryWithdrawal.js';
import {
  commitOfficialTransformation,
  computeCarcassYield,
  computeTransformationCosting,
  getTransformTypeProfile,
  PRODUIT_FINI_TYPES,
  TRANSFORM_TYPES,
  validateOfficialTransformationForm,
} from '../../utils/elevageTransformationWorkflow.js';
import {
  TRANSFORMATION_FORM_ID,
  TRANSFORMATION_TERRAIN_BANNER,
  navigateToCommercialAfterTransform,
} from '../../utils/elevageTransformationNavigation.js';
import { avicoleActiveCount } from '../../utils/avicoleMetrics.js';
import { fmtCurrency } from '../../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const today = () => new Date().toISOString().slice(0, 10);
const lower = (v) => String(v || '').toLowerCase();
const isClosedAnimal = (a) => ['vendu', 'mort', 'abattu', 'vole', 'perdu'].some((w) => lower(a.status || a.statut).includes(w));
const isChairLot = (l) => lower(`${l.type || ''} ${l.activity || ''} ${l.activite || ''}`).includes('chair');

function Field({ label, children, className = '' }) {
  return <label className={`space-y-1 ${className}`}><span className="text-xs text-slate">{label}</span>{children}</label>;
}
function Input({ value, onChange, type = 'text', ...rest }) {
  return <input type={type} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
function Select({ value, onChange, options }) {
  return (
    <select className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function ProofInput({ form, onChange }) {
  const handleFile = (file) => {
    if (!file) return onChange({});
    if (!file.type?.startsWith('image/')) return toast.error('Photo/image uniquement');
    const reader = new FileReader();
    reader.onload = () => onChange({
      preuve_photo_data: String(reader.result || ''),
      preuve_file_name: file.name,
      preuve_type: 'preuve_carcasse',
    });
    reader.readAsDataURL(file);
  };
  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-horizon bg-card px-3 py-4 text-sm font-semibold text-slate">
        <Upload size={18} /> Photo carcasse / certificat / ticket pesée
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      </label>
      {form.preuve_photo_data ? (
        <img src={form.preuve_photo_data} alt="preuve" className="h-16 w-16 rounded-lg object-cover border border-positive" />
      ) : (
        <p className="text-xs text-slate"><Camera size={13} className="inline" /> Aucune photo - recommandée pour abattage.</p>
      )}
    </div>
  );
}

export default function TransformationOfficialForm(props) {
  const permissions = props.permissions || {
    canView: true,
    canWrite: true,
    canValidate: true,
    canViewCosts: true,
    canOverrideSanitary: true,
  };
  const readOnly = !permissions.canWrite;
  const animals = arr(props.animaux).filter((a) => a.id && !isClosedAnimal(a));
  const lots = arr(props.lots).filter((l) => l.id && avicoleActiveCount(l) > 0);
  const chairLots = lots.filter(isChairLot);

  const [form, setForm] = useState({
    date: today(),
    transform_type: 'abattage',
    source_type: 'animal',
    animal_id: '',
    lot_id: '',
    effectif: '',
    poids_vif: '',
    poids_carcasse: '',
    pertes: '',
    frais_abattage: '',
    frais_decoupe: '',
    frais_emballage: '',
    frais_transport: '',
    autres_frais: '',
    produit_fini_type: 'viande_fraiche',
    produit_fini_nom: '',
    quantite_produit: '',
    unite: 'kg',
    emplacement: 'Chambre froide 1',
    dlc: '',
    destination: 'stock',
    responsable: '',
    notes: '',
    create_stock: true,
    confirmed: false,
    sanitary_override: false,
    sanitary_override_reason: '',
  });
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const applyTypeDefaults = (type) => {
    const p = getTransformTypeProfile(type);
    setForm((prev) => ({
      ...prev,
      transform_type: type,
      source_type: p.defaults.source_type || (p.sources.includes('lot_avicole') && !p.sources.includes('animal') ? 'lot_avicole' : prev.source_type),
      destination: p.defaults.destination ?? prev.destination,
      create_stock: p.defaults.create_stock ?? prev.create_stock,
      produit_fini_type: p.defaults.produit_fini_type || prev.produit_fini_type,
      animal_id: p.defaults.source_type === 'lot_avicole' ? '' : prev.animal_id,
    }));
  };

  const profile = useMemo(() => getTransformTypeProfile(form.transform_type), [form.transform_type]);
  const lotOptions = profile.lotScope === 'chair' ? chairLots : lots;
  const sourceOptions = [
    profile.sources.includes('animal') ? { value: 'animal', label: 'Animal individuel' } : null,
    profile.sources.includes('lot_avicole') ? { value: 'lot_avicole', label: 'Lot avicole / bande' } : null,
  ].filter(Boolean);

  useEffect(() => {
    if (!props.transformationDraft) return;
    const d = props.transformationDraft;
    queueMicrotask(() => {
      setForm((prev) => ({
        ...prev,
        ...d,
        animal_id: d.animal_id || prev.animal_id,
        lot_id: d.lot_id || prev.lot_id,
        source_type: d.source_type || (d.animal_id ? 'animal' : d.lot_id ? 'lot_avicole' : prev.source_type),
        transform_type: d.transform_type || prev.transform_type,
      }));
    });
    window.setTimeout(() => {
      document.getElementById(TRANSFORMATION_FORM_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [props.transformationDraft]);

  const animal = animals.find((a) => String(a.id) === String(form.animal_id));
  const lot = lots.find((l) => String(l.id) === String(form.lot_id));

  const sanitaryBlock = useMemo(() => blockSanitaryAction({
    healthRows: props.healthRows || [],
    action: SANITARY_ACTIONS.TRANSFORM,
    animalId: form.animal_id,
    lotId: form.lot_id,
  }), [props.healthRows, form.animal_id, form.lot_id]);

  const activeWithdrawals = useMemo(() => findActiveWithdrawals(props.healthRows || []).filter((row) => {
    if (form.animal_id && cleanId(row.animal_id) === form.animal_id) return true;
    if (form.lot_id && cleanId(row.lot_id) === form.lot_id) return true;
    return !form.animal_id && !form.lot_id;
  }), [props.healthRows, form.animal_id, form.lot_id]);

  const costing = computeTransformationCosting({
    form: { ...form, quantite_produit: form.poids_carcasse || form.quantite_produit },
    animal,
    lot,
    alimentationLogs: props.alimentationLogs || [],
    productionLogs: props.productionLogs || [],
    healthRows: props.healthRows || [],
    businessEvents: props.businessEvents || [],
  });

  const rendement = computeCarcassYield(form.poids_vif, form.poids_carcasse);

  const submit = async () => {
    if (sanitaryBlock.blocked && !form.sanitary_override) {
      toast.error(sanitaryBlock.message);
      return;
    }
    const validation = validateOfficialTransformationForm(form);
    if (validation) return toast.error(validation);
    if (!form.confirmed) return toast.error('Cochez la confirmation avant validation');

    setSaving(true);
    try {
      const result = await commitOfficialTransformation({
        form: { ...form, quantite_produit: form.poids_carcasse || form.quantite_produit },
        context: {
          animaux: props.animaux,
          lots: props.lots,
          stocks: props.stocks,
          health: props.healthRows,
          alimentationLogs: props.alimentationLogs,
          productionLogs: props.productionLogs,
          businessEvents: props.businessEvents,
          opportunities: props.opportunities || [],
          transactions: props.transactions || [],
        },
        handlers: props.handlers || {},
      });
      setLastResult(result);
      toast.success('Transformation enregistrée - stock créé après validation');
      props.onClearDraft?.();
      props.onSuccess?.(result);
      setForm((prev) => ({
        ...prev,
        confirmed: false,
        sanitary_override: false,
        sanitary_override_reason: '',
        poids_carcasse: '',
        poids_vif: '',
        notes: '',
        preuve_photo_data: '',
      }));
    } catch (e) {
      toast.error(e.message || 'Transformation impossible');
    } finally {
      setSaving(false);
    }
  };

  const requestOverride = () => {
    setOverrideReason(form.sanitary_override_reason || '');
    setOverrideOpen(true);
  };

  const submitOverride = () => {
    if (!overrideReason.trim()) {
      toast.error('Justification obligatoire');
      return;
    }
    update('sanitary_override', true);
    update('sanitary_override_reason', overrideReason.trim());
    setOverrideOpen(false);
    toast('Dérogation sanitaire enregistrée - sera tracée à la validation', { icon: '⚠️' });
  };

  return (
    <div id={TRANSFORMATION_FORM_ID} className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-normal text-slate">Canal officiel</p>
        <h3 className="font-semibold text-earth">Transformation · vivant → produit fini</h3>
        {props.transformationDraft ? (
          <p className="mt-2 rounded-xl border border-line bg-neutral-bg px-3 py-2 text-sm text-neutral">{TRANSFORMATION_TERRAIN_BANNER}</p>
        ) : null}
      </div>

      {sanitaryBlock.blocked && !form.sanitary_override ? (
        <div className="rounded-xl border border-urgent bg-urgent-bg p-3 text-sm text-urgent" role="alert">
          <p className="font-semibold flex items-center gap-2"><AlertTriangle size={16} /> Transformation bloquée - délai sanitaire actif</p>
          <p className="mt-1">{sanitaryBlock.message}</p>
          {activeWithdrawals.map((w) => (
            <p key={w.id} className="text-xs mt-1">{formatWithdrawalLabel(w)}</p>
          ))}
          {permissions.canOverrideSanitary ? (
            <button type="button" className="mt-2 text-xs font-semibold underline" onClick={requestOverride}>
              Dérogation exceptionnelle (justification obligatoire)
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate">{profile.hint}</p>

      {readOnly ? <p className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate">Consultation uniquement pour ce rôle.</p> : null}
      <fieldset disabled={readOnly} className="space-y-4 border-0 p-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Date"><Input type="date" value={form.date} onChange={(v) => update('date', v)} /></Field>
        <Field label="Type">
          <Select value={form.transform_type} onChange={(v) => applyTypeDefaults(v)} options={TRANSFORM_TYPES} />
        </Field>
        <Field label="Source">
          <Select
            value={form.source_type}
            onChange={(v) => update('source_type', v)}
            options={sourceOptions}
          />
        </Field>
        {form.source_type === 'animal' && profile.sources.includes('animal') ? (
          <Field label="Animal">
            <Select
              value={form.animal_id || ''}
              onChange={(v) => update('animal_id', v)}
              options={[{ value: '', label: '-' }, ...animals.map((a) => ({ value: a.id, label: `${a.type || 'Animal'} · ${a.name || a.tag || a.id}` }))]}
            />
          </Field>
        ) : null}
        {form.source_type === 'lot_avicole' && profile.sources.includes('lot_avicole') ? (
          <Field label="Lot avicole">
            <Select
              value={form.lot_id || ''}
              onChange={(v) => update('lot_id', v)}
              options={[{ value: '', label: '-' }, ...lotOptions.map((l) => ({ value: l.id, label: `${l.name || l.nom || l.id} · ${avicoleActiveCount(l)} actifs` }))]}
            />
          </Field>
        ) : null}
        {profile.show.effectif && form.source_type === 'lot_avicole' ? (
          <Field label="Effectif / sujets"><Input type="number" value={form.effectif} onChange={(v) => update('effectif', v)} /></Field>
        ) : null}
        {profile.show.poids_vif ? (
          <Field label="Poids vif (kg)"><Input type="number" value={form.poids_vif} onChange={(v) => update('poids_vif', v)} /></Field>
        ) : null}
        {profile.show.poids_carcasse ? (
          <Field label="Poids carcasse / produit fini (kg)"><Input type="number" value={form.poids_carcasse} onChange={(v) => update('poids_carcasse', v)} /></Field>
        ) : null}
        {profile.show.rendement ? (
          <Field label="Rendement carcasse"><div className="rounded-lg border border-line bg-card px-3 py-2 text-sm">{rendement != null ? `${rendement} %` : '-'}</div></Field>
        ) : null}
        {profile.show.pertes && permissions.canViewCosts ? (
          <Field label="Pertes (F)"><Input type="number" value={form.pertes} onChange={(v) => update('pertes', v)} /></Field>
        ) : null}
        {profile.show.frais_abattage && permissions.canViewCosts ? (
          <Field label="Frais abattage"><Input type="number" value={form.frais_abattage} onChange={(v) => update('frais_abattage', v)} /></Field>
        ) : null}
        {profile.show.frais_decoupe && permissions.canViewCosts ? (
          <Field label="Frais découpe"><Input type="number" value={form.frais_decoupe} onChange={(v) => update('frais_decoupe', v)} /></Field>
        ) : null}
        {profile.show.frais_emballage && permissions.canViewCosts ? (
          <Field label="Emballage"><Input type="number" value={form.frais_emballage} onChange={(v) => update('frais_emballage', v)} /></Field>
        ) : null}
        {profile.show.frais_transport && permissions.canViewCosts ? (
          <Field label="Transport"><Input type="number" value={form.frais_transport} onChange={(v) => update('frais_transport', v)} /></Field>
        ) : null}
        {profile.show.autres_frais && permissions.canViewCosts ? (
          <Field label="Autres frais"><Input type="number" value={form.autres_frais} onChange={(v) => update('autres_frais', v)} /></Field>
        ) : null}
        {profile.show.produit_fini ? (
          <Field label="Produit fini"><Select value={form.produit_fini_type} onChange={(v) => update('produit_fini_type', v)} options={PRODUIT_FINI_TYPES} /></Field>
        ) : null}
        {profile.show.stock_fields ? (
          <>
            <Field label="Nom produit stock"><Input value={form.produit_fini_nom} onChange={(v) => update('produit_fini_nom', v)} placeholder="Auto si vide" /></Field>
            <Field label="Unité"><Input value={form.unite} onChange={(v) => update('unite', v)} /></Field>
            <Field label="Emplacement"><Input value={form.emplacement} onChange={(v) => update('emplacement', v)} /></Field>
            <Field label="DLC"><Input type="date" value={form.dlc} onChange={(v) => update('dlc', v)} /></Field>
            <Field label="Destination">
              <Select
                value={form.destination}
                onChange={(v) => update('destination', v)}
                options={[
                  { value: 'stock', label: 'Stock viande' },
                  { value: 'vente_directe', label: 'Réservé vente' },
                  { value: 'perte', label: 'Perte - pas de stock' },
                ]}
              />
            </Field>
          </>
        ) : null}
        <Field label="Responsable"><Input value={form.responsable} onChange={(v) => update('responsable', v)} /></Field>
        <Field label="Notes" className="md:col-span-2"><Input value={form.notes} onChange={(v) => update('notes', v)} /></Field>
        {profile.show.proof ? (
          <div className="md:col-span-3"><ProofInput form={form} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} /></div>
        ) : null}
      </div>

      {permissions.canViewCosts ? <div className="rounded-xl border border-line bg-card p-3 text-sm text-slate space-y-1">
        <p><b>Coût de revient total :</b> {fmtCurrency(costing.totalCost)} · <b>/kg :</b> {costing.costPerKg ? fmtCurrency(costing.costPerKg) : '-'}</p>
        {costing.marginEstimee != null ? <p><b>Marge estimée :</b> {fmtCurrency(costing.marginEstimee)}</p> : null}
        {costing.incomplete ? (
          <p className="text-horizon-dark font-semibold">{costing.costMessage}</p>
        ) : (
          <p className="text-positive">Coût calculé sur achat + alimentation + santé enregistrés (sans double charge Finance).</p>
        )}
        {animal ? <p><b>Animal :</b> {animal.name || animal.tag} · {animal.type}</p> : null}
        {lot ? <p><b>Lot :</b> {lot.name || lot.nom} · {avicoleActiveCount(lot)} actifs</p> : null}
      </div> : null}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={form.create_stock} onChange={(e) => update('create_stock', e.target.checked)} className="mt-1" disabled={!profile.show.stock_fields} />
        <span>Créer / mettre à jour le stock produit fini après validation (confirmation requise)</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={form.confirmed} onChange={(e) => update('confirmed', e.target.checked)} className="mt-1" />
        <span>Je confirme la sortie vivant et la conversion vers produit fini (action irréversible).</span>
      </label>
      </fieldset>

      <div className="flex flex-wrap gap-2 justify-end">
        {lastResult?.stockId ? (
          <button
            type="button"
            className="rounded-xl border border-line px-4 py-2 text-sm font-semibold"
            onClick={() => navigateToCommercialAfterTransform(props.onNavigate, {
              stockId: lastResult.stockId,
              produit_fini_nom: form.produit_fini_nom,
              quantite_produit: form.poids_carcasse,
              cout_revient_kg: lastResult.costing?.costPerKg,
              prix_plancher: lastResult.prixPlancher,
              transformation_id: lastResult.transformId,
            })}
          >
            Préparer vente (Commercial)
          </button>
        ) : null}
        {permissions.canValidate ? (
          <Btn icon={ShieldCheck} onClick={submit} disabled={saving || (sanitaryBlock.blocked && !form.sanitary_override)}>
            {saving ? 'Validation…' : 'Valider transformation'}
          </Btn>
        ) : null}
      </div>
      <QuickInputModal
        open={overrideOpen}
        title="Dérogation sanitaire"
        description="Justification obligatoire - sera tracée à la validation."
        label="Motif de dérogation"
        type="textarea"
        value={overrideReason}
        onChange={setOverrideReason}
        submitLabel="Confirmer la dérogation"
        onClose={() => setOverrideOpen(false)}
        onSubmit={submitOverride}
      />
    </div>
  );
}

function cleanId(v) {
  return String(v || '').trim();
}
