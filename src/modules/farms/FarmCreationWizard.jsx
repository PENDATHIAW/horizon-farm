import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { FARM_ACTIVITY_TYPES } from '../../config/farmActivities.js';
import {
  buildFarmCreationSummary,
  FARM_ACCESS_ROLE_LABELS,
  FARM_CREATION_STEPS,
  getCapacityFieldsForActivities,
  validateFarmCreationStep,
} from '../../config/farmCreationModel.js';
import { FARM_ACCESS_ROLES } from '../../config/farmActivities.js';

const inputClass = 'w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-leaf';
const labelClass = 'block text-xs font-semibold uppercase tracking-normal text-slate mb-1';

function Field({ label, children }) {
  return <label className="block space-y-1">{label ? <span className={labelClass}>{label}</span> : null}{children}</label>;
}

function StepGeneral({ draft, updateGeneral }) {
  const general = draft.general || {};
  const set = (key, value) => updateGeneral({ [key]: value });
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Nom de la ferme *"><input className={inputClass} value={general.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
      <Field label="Nom juridique"><input className={inputClass} value={general.legal_name || ''} onChange={(e) => set('legal_name', e.target.value)} /></Field>
      <Field label="Type d'entité"><input className={inputClass} value={general.legal_entity_type || ''} onChange={(e) => set('legal_entity_type', e.target.value)} /></Field>
      <Field label="Numéro d'enregistrement"><input className={inputClass} value={general.registration_number || ''} onChange={(e) => set('registration_number', e.target.value)} /></Field>
      <Field label="Responsable principal"><input className={inputClass} value={general.manager_name || ''} onChange={(e) => set('manager_name', e.target.value)} /></Field>
      <Field label="Téléphone"><input className={inputClass} value={general.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
      <Field label="Email"><input type="email" className={inputClass} value={general.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
      <Field label="Statut">
        <select className={inputClass} value={general.status || 'active'} onChange={(e) => set('status', e.target.value)}>
          <option value="active">Active</option>
          <option value="paused">En pause</option>
        </select>
      </Field>
      <Field label="Date de démarrage prévue"><input type="date" className={inputClass} value={general.start_date || ''} onChange={(e) => set('start_date', e.target.value)} /></Field>
      <div className="md:col-span-2">
        <Field label="Description"><textarea className={`${inputClass} min-h-[96px]`} value={general.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
      </div>
    </div>
  );
}

function StepLocation({ draft, updateLocation }) {
  const location = draft.location || {};
  const set = (key, value) => updateLocation({ [key]: value });
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Pays"><input className={inputClass} value={location.country || 'SN'} onChange={(e) => set('country', e.target.value)} /></Field>
      <Field label="Région"><input className={inputClass} value={location.region || ''} onChange={(e) => set('region', e.target.value)} /></Field>
      <Field label="Département"><input className={inputClass} value={location.department || ''} onChange={(e) => set('department', e.target.value)} /></Field>
      <Field label="Commune"><input className={inputClass} value={location.commune || ''} onChange={(e) => set('commune', e.target.value)} /></Field>
      <div className="md:col-span-2"><Field label="Adresse"><input className={inputClass} value={location.address || ''} onChange={(e) => set('address', e.target.value)} /></Field></div>
      <Field label="Latitude"><input type="number" className={inputClass} value={location.latitude ?? ''} onChange={(e) => set('latitude', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Longitude"><input type="number" className={inputClass} value={location.longitude ?? ''} onChange={(e) => set('longitude', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Superficie (ha)"><input type="number" className={inputClass} value={location.surface_area ?? ''} onChange={(e) => set('surface_area', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Accès eau"><input className={inputClass} value={location.water_access || ''} onChange={(e) => set('water_access', e.target.value)} /></Field>
      <Field label="Accès électricité"><input className={inputClass} value={location.electricity_access || ''} onChange={(e) => set('electricity_access', e.target.value)} /></Field>
      <Field label="Accès route"><input className={inputClass} value={location.road_access || ''} onChange={(e) => set('road_access', e.target.value)} /></Field>
    </div>
  );
}

function StepActivities({ draft, updateActivities }) {
  const selected = draft.activities?.activity_type || [];
  const toggle = (key) => {
    const next = selected.includes(key) ? selected.filter((entry) => entry !== key) : [...selected, key];
    updateActivities({ activity_type: next.filter((entry) => entry !== 'mixte') });
  };
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {FARM_ACTIVITY_TYPES.filter((entry) => entry.key !== 'mixte').map((entry) => (
        <label key={entry.key} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 cursor-pointer ${selected.includes(entry.key) ? 'border-leaf bg-positive-bg' : 'border-line bg-card'}`}>
          <input type="checkbox" checked={selected.includes(entry.key)} onChange={() => toggle(entry.key)} />
          <span className="text-sm font-semibold text-earth">{entry.label}</span>
        </label>
      ))}
    </div>
  );
}

function StepCapacities({ draft, updateCapacities }) {
  const fields = getCapacityFieldsForActivities(draft.activities?.activity_type || []);
  const capacities = draft.capacities || {};
  if (!fields.length) {
    return <p className="text-sm text-slate">Sélectionnez des activités à l’étape précédente pour afficher les capacités associées.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <Field key={field.key} label={field.label}>
          {field.type === 'checkbox' ? (
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-earth">
              <input type="checkbox" checked={Boolean(capacities[field.key])} onChange={(e) => updateCapacities({ [field.key]: e.target.checked })} />
              Oui
            </label>
          ) : (
            <input
              type={field.type === 'number' ? 'number' : 'text'}
              className={inputClass}
              value={capacities[field.key] ?? ''}
              onChange={(e) => updateCapacities({
                [field.key]: field.type === 'number'
                  ? (e.target.value ? Number(e.target.value) : null)
                  : e.target.value,
              })}
            />
          )}
        </Field>
      ))}
    </div>
  );
}

function StepFinance({ draft, updateFinance }) {
  const finance = draft.finance || {};
  const set = (key, value) => updateFinance({ [key]: value });
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Devise"><input className={inputClass} value={finance.currency || 'XOF'} onChange={(e) => set('currency', e.target.value)} /></Field>
      <Field label="Budget démarrage"><input type="number" className={inputClass} value={finance.startup_budget ?? ''} onChange={(e) => set('startup_budget', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Capital disponible"><input type="number" className={inputClass} value={finance.available_capital ?? ''} onChange={(e) => set('available_capital', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Besoin financement"><input type="number" className={inputClass} value={finance.funding_need ?? ''} onChange={(e) => set('funding_need', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Objectif CA annuel"><input type="number" className={inputClass} value={finance.annual_revenue_target ?? ''} onChange={(e) => set('annual_revenue_target', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Objectif marge (%)"><input type="number" className={inputClass} value={finance.margin_target ?? ''} onChange={(e) => set('margin_target', e.target.value ? Number(e.target.value) : null)} /></Field>
      <Field label="Banque principale"><input className={inputClass} value={finance.primary_bank || ''} onChange={(e) => set('primary_bank', e.target.value)} /></Field>
      <Field label="Niveau de risque accepté"><input className={inputClass} value={finance.risk_tolerance || ''} onChange={(e) => set('risk_tolerance', e.target.value)} /></Field>
    </div>
  );
}

function StepCommercial({ draft, updateCommercial }) {
  const commercial = draft.commercial || {};
  const setList = (key, value) => updateCommercial({ [key]: value.split(',').map((entry) => entry.trim()).filter(Boolean) });
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Field label="Marchés cibles (séparés par virgule)"><input className={inputClass} value={(commercial.target_markets || []).join(', ')} onChange={(e) => setList('target_markets', e.target.value)} /></Field>
      <Field label="Zones de livraison"><input className={inputClass} value={(commercial.delivery_zones || []).join(', ')} onChange={(e) => setList('delivery_zones', e.target.value)} /></Field>
      <Field label="Canaux de vente"><input className={inputClass} value={(commercial.sales_channels || []).join(', ')} onChange={(e) => setList('sales_channels', e.target.value)} /></Field>
      <Field label="Types de clients"><input className={inputClass} value={(commercial.client_types || []).join(', ')} onChange={(e) => setList('client_types', e.target.value)} /></Field>
      <Field label="Conditions de paiement"><input className={inputClass} value={commercial.payment_terms || ''} onChange={(e) => updateCommercial({ payment_terms: e.target.value })} /></Field>
      <Field label="Politique livraison"><input className={inputClass} value={commercial.delivery_policy || ''} onChange={(e) => updateCommercial({ delivery_policy: e.target.value })} /></Field>
      <Field label="Prix par défaut"><input type="number" className={inputClass} value={commercial.default_price ?? ''} onChange={(e) => updateCommercial({ default_price: e.target.value ? Number(e.target.value) : null })} /></Field>
    </div>
  );
}

function StepUsers({ draft, updateUsers, user }) {
  const assignments = draft.users?.assignments || [];
  const addRow = () => updateUsers({ assignments: [...assignments, { user_id: user?.id || '', access_role: 'farm_manager', label: user?.email || 'Créateur' }] });
  const updateRow = (index, patch) => {
    const next = assignments.map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    updateUsers({ assignments: next });
  };
  const removeRow = (index) => updateUsers({ assignments: assignments.filter((_, idx) => idx !== index) });

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate">Affectez des utilisateurs à la ferme. Si aucun utilisateur n’est ajouté, le créateur sera automatiquement responsable / direction.</p>
      {assignments.map((row, index) => (
        <div key={`${row.user_id}-${index}`} className="grid grid-cols-1 gap-3 rounded-2xl border border-line p-4 md:grid-cols-[1fr_220px_auto]">
          <Field label="Identifiant utilisateur">
            <input className={inputClass} value={row.user_id || ''} onChange={(e) => updateRow(index, { user_id: e.target.value })} placeholder="UUID utilisateur" />
          </Field>
          <Field label="Rôle">
            <select className={inputClass} value={row.access_role || 'farm_agent'} onChange={(e) => updateRow(index, { access_role: e.target.value })}>
              {FARM_ACCESS_ROLES.filter((role) => role !== 'super_admin').map((role) => (
                <option key={role} value={role}>{FARM_ACCESS_ROLE_LABELS[role] || role}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={() => removeRow(index)} className="rounded-xl border border-urgent px-3 py-3 text-xs font-semibold text-urgent">Retirer</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addRow} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-earth">Ajouter un utilisateur</button>
    </div>
  );
}

function StepValidation({ draft }) {
  const summary = useMemo(() => buildFarmCreationSummary(draft), [draft]);
  const sections = [
    ['Activités choisies', summary.activities],
    ['Modules activés', summary.enabledModules],
    ['Modules réduits', summary.reducedModules],
    ['KPI activés', summary.kpis],
    ['Alertes activées', summary.alerts],
    ['Documents recommandés', summary.recommendedDocuments],
    ['Prochaines étapes', summary.nextSteps],
  ];
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-positive bg-positive-bg p-4">
        <p className="text-xs font-semibold uppercase tracking-normal text-positive">Résumé</p>
        <h3 className="mt-1 text-xl font-semibold text-earth">{summary.name}</h3>
      </div>
      {sections.map(([title, items]) => (
        <div key={title} className="rounded-2xl border border-line bg-card p-4">
          <p className="text-sm font-semibold text-earth">{title}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate">
            {(items || []).length ? items.map((item) => <li key={String(item)}>• {item}</li>) : <li>—</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function FarmCreationWizard({
  initialDraft,
  mode = 'create',
  farmName = '',
  user = null,
  onClose,
  onComplete,
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = FARM_CREATION_STEPS[step];

  const updateSection = (section) => (patch) => setDraft((value) => ({ ...value, [section]: { ...value[section], ...patch } }));

  const goNext = () => {
    const message = validateFarmCreationStep(current.id, draft);
    if (message) { setError(message); return; }
    setError('');
    setStep((value) => Math.min(FARM_CREATION_STEPS.length - 1, value + 1));
  };

  const goPrev = () => { setError(''); setStep((value) => Math.max(0, value - 1)); };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await onComplete?.(draft, mode);
    } finally {
      setBusy(false);
    }
  };

  const content = {
    general: <StepGeneral draft={draft} updateGeneral={updateSection('general')} />,
    location: <StepLocation draft={draft} updateLocation={updateSection('location')} />,
    activities: <StepActivities draft={draft} updateActivities={updateSection('activities')} />,
    capacities: <StepCapacities draft={draft} updateCapacities={updateSection('capacities')} />,
    finance: <StepFinance draft={draft} updateFinance={updateSection('finance')} />,
    commercial: <StepCommercial draft={draft} updateCommercial={updateSection('commercial')} />,
    users: <StepUsers draft={draft} updateUsers={updateSection('users')} user={user} />,
    validation: <StepValidation draft={draft} />,
  }[current.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-earth/30 p-3">
      <div className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-3xl border border-line bg-white shadow-float">
        <div className="flex items-start justify-between border-b border-line p-6">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate">
              {mode === 'edit' ? `Modifier ${farmName || 'la ferme'}` : 'Créer une ferme'}
            </p>
            <h2 className="text-xl font-semibold text-earth">{current.title}</h2>
            <p className="text-sm text-slate mt-1">Étape {step + 1} / {FARM_CREATION_STEPS.length}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="hidden md:grid md:grid-cols-8 gap-1 border-b border-line bg-card p-3">
          {FARM_CREATION_STEPS.map((item, index) => (
            <div key={item.id} className={`rounded-xl px-2 py-2 text-center text-meta font-semibold ${index === step ? 'bg-earth text-white' : index < step ? 'bg-positive-bg text-positive' : 'text-slate'}`}>
              {item.title}
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error ? <div className="rounded-xl border border-urgent bg-urgent-bg p-3 text-sm text-urgent">{error}</div> : null}
          {content}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button type="button" onClick={goPrev} disabled={step === 0} className="inline-flex items-center gap-1 rounded-xl border border-line px-4 py-2 text-sm font-semibold disabled:opacity-40">
              <ChevronLeft size={16} />
              Précédent
            </button>
            {step < FARM_CREATION_STEPS.length - 1 ? (
              <button type="button" onClick={goNext} className="inline-flex items-center gap-1 rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-earth">
                Suivant
                <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={busy} className="inline-flex items-center gap-1 rounded-xl bg-leaf px-4 py-2 text-sm font-semibold text-earth disabled:opacity-50">
                <CheckCircle2 size={16} />
                {busy ? 'Enregistrement…' : mode === 'edit' ? 'Enregistrer la ferme' : 'Créer la ferme'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
