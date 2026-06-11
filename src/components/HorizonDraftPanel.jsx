import { AlertTriangle, CheckCircle, Edit3, Layers, X } from 'lucide-react';
import { HORIZON } from '../modules/assistant/horizonDesignTokens.js';

const labels = {
  product_name: 'Produit', quantity: 'Quantité', unit: 'Unité', unit_weight_kg: 'Poids unitaire kg', total_weight_kg: 'Poids total kg', supplier_name: 'Fournisseur', supplier_id: 'ID fournisseur', payment_status: 'Paiement', payment_amount: 'Montant payé', date: 'Date', notes: 'Notes', source_id: 'Source', client_name: 'Client',
  target_id: 'Cible', animal_id: 'Animal / lot', action_type: 'Action santé', soin_type: 'Type de soin', product_label: 'Produit / intervention', next_due_date: 'Prochain rappel', cost: 'Coût', vet_name: 'Vétérinaire', weight_kg: 'Poids kg', status: 'Statut',
  search: 'Recherche', filter: 'Filtre', culture_name: 'Culture', title: 'Titre', document_category: 'Type document', module_source: 'Module source', amount: 'Montant', verification_status: 'État preuve',
};
const moduleLabel = (module = '') => ({ stock: 'Stock', finances: 'Finances', fournisseurs: 'Fournisseurs', tracabilite: 'Traçabilité', centre_ia: 'Centre IA', ventes: 'Ventes', clients: 'Clients', avicole: 'Avicole', animaux: 'Animaux', sante: 'Santé', cultures: 'Cultures', alertes: 'Alertes', taches: 'Tâches', documents: 'Documents', investissements: 'Investissements', dashboard: 'Accueil', smartfarm: 'Smart Farm', comptabilite: 'Comptabilité' }[module] || module);
const valueLabel = (value) => { if (value === null || value === undefined || value === '') return 'À renseigner'; if (value === 'paid') return 'Payé'; if (value === 'credit') return 'À crédit'; if (value === 'partial') return 'Partiel'; if (value === 'unknown') return 'À confirmer'; return String(value); };
const draftTargetModule = (draft = {}) => draft.primary_module || draft.target_module || (draft.impacted_modules || [])[0] || 'dashboard';
const formTitle = (draft = {}) => draft.form_type === 'health_action' ? `Ouvrir fiche ${draft.draft_fields?.action_type === 'deparasitage' ? 'déparasitage' : draft.draft_fields?.action_type === 'soin' ? 'soin' : 'vaccination'}` : draft.form_type === 'sale_record' ? 'Ouvrir vente guidée' : draft.form_type?.startsWith('animal_') ? 'Ouvrir fiche animal' : `Modifier dans ${moduleLabel(draftTargetModule(draft))}`;

function InlineDraftActions({ draft, onValidate, onCancel, isValidating = false }) {
  const missing = draft.missing_fields || [];
  const hasBlockingMissing = missing.length > 0;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        disabled={hasBlockingMissing || isValidating}
        onClick={onValidate}
        className="rounded-lg px-4 py-2 text-xs font-semibold tracking-wide text-white disabled:opacity-40"
        style={{ background: HORIZON.primary }}
      >
        {isValidating ? 'VALIDATION…' : 'VALIDER'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isValidating}
        className="rounded-lg border px-4 py-2 text-xs font-semibold tracking-wide disabled:opacity-40"
        style={{ borderColor: HORIZON.border, color: HORIZON.text, background: HORIZON.surface }}
      >
        ANNULER
      </button>
    </div>
  );
}

function FullDraftPanel({ draft, onChangeField, onValidate, onCancel, onOpenModule }) {
  const fields = draft.draft_fields || {};
  const missing = draft.missing_fields || [];
  const warnings = draft.warnings || [];
  const hasBlockingMissing = missing.length > 0;
  const editModule = draftTargetModule(draft);
  const openForm = () => {
    onOpenModule?.(editModule);
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('horizon-open-form', { detail: { module: editModule, draft } })), 180);
  };

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-4 space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest font-black text-[#8a7456]">Brouillon Horizon</p>
          <h3 className="text-base font-black text-[#2f2415]">{draft.ui?.title || 'Action ERP à valider'}</h3>
          <p className="text-xs text-[#8a7456] mt-1">{draft.ui?.subtitle || 'Vérifie les données avant validation.'}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${hasBlockingMissing ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
          {hasBlockingMissing ? 'À compléter' : 'Prêt à valider'}
        </span>
      </div>
      {warnings.length ? (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <div key={warning} className="flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}
      {missing.length ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-black text-red-700 mb-2">Champs manquants</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((field) => (
              <span key={field} className="rounded-full bg-white border border-red-200 px-2 py-1 text-[11px] font-bold text-red-700">
                {labels[field] || field}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(fields).filter(([key]) => !['notes', 'product_id', 'supplier_id'].includes(key)).map(([key, value]) => (
          <label key={key} className="rounded-2xl border border-[#eadcc2] bg-white p-3 space-y-1">
            <span className="block text-[11px] font-black uppercase tracking-wide text-[#8a7456]">{labels[key] || key}</span>
            <input value={valueLabel(value)} onChange={(event) => onChangeField?.(key, event.target.value)} className="w-full bg-transparent text-sm font-bold text-[#2f2415] outline-none" />
          </label>
        ))}
      </div>
      {draft.next_required_form ? (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-3">
          <p className="text-xs font-black text-purple-800">Formulaire lié requis</p>
          <p className="text-sm font-bold text-[#2f2415] mt-1">{draft.next_required_form.title}</p>
          <p className="text-xs text-purple-700 mt-1">{draft.next_required_form.subtitle}</p>
        </div>
      ) : null}
      <div className="rounded-2xl border border-[#eadcc2] bg-white p-3">
        <p className="flex items-center gap-2 text-xs font-black text-[#2f2415] mb-2"><Layers size={14} /> Modules impactés</p>
        <div className="flex flex-wrap gap-2">
          {(draft.impacted_modules || []).map((module) => (
            <button key={module} type="button" onClick={() => onOpenModule?.(module)} className="rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-2.5 py-1 text-[11px] font-bold text-[#7d6a4a] hover:border-emerald-500 hover:text-emerald-700">
              {moduleLabel(module)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" onClick={onCancel} className="rounded-2xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#8a7456] hover:bg-[#fff8e8]"><X size={14} className="inline" /> Annuler</button>
        <button type="button" onClick={openForm} className="rounded-2xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#fff8e8]"><Edit3 size={14} className="inline" /> {formTitle(draft)}</button>
        <button type="button" disabled={hasBlockingMissing} onClick={onValidate} className="rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-black text-white disabled:opacity-45 disabled:cursor-not-allowed"><CheckCircle size={14} className="inline" /> VALIDER</button>
      </div>
    </div>
  );
}

export default function HorizonDraftPanel({
  draft,
  onChangeField,
  onValidate,
  onCancel,
  onOpenModule,
  variant = 'full',
  isValidating = false,
}) {
  if (!draft || !draft.intent || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  if (variant === 'inline') {
    return <InlineDraftActions draft={draft} onValidate={onValidate} onCancel={onCancel} isValidating={isValidating} />;
  }
  return (
    <FullDraftPanel
      draft={draft}
      onChangeField={onChangeField}
      onValidate={onValidate}
      onCancel={onCancel}
      onOpenModule={onOpenModule}
    />
  );
}
