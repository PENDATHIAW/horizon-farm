import { AlertTriangle, CheckCircle, Edit3, Layers, X } from 'lucide-react';
import { HORIZON } from '../modules/assistant/horizonDesignTokens.js';
import { openFormModal } from '../services/formModalManager.js';

const labels = {
  product_name: 'Produit', quantity: 'Quantité', unit: 'Unité', unit_weight_kg: 'Poids unitaire kg', total_weight_kg: 'Poids total kg', supplier_name: 'Fournisseur', supplier_id: 'ID fournisseur', payment_status: 'Paiement', payment_amount: 'Montant payé', date: 'Date', notes: 'Notes', source_id: 'Source', client_name: 'Client',
  target_id: 'Cible', animal_id: 'Animal / lot', action_type: 'Action santé', soin_type: 'Type de soin', product_label: 'Produit / intervention', next_due_date: 'Prochain rappel', cost: 'Coût', vet_name: 'Vétérinaire', weight_kg: 'Poids kg', status: 'Statut',
  search: 'Recherche', filter: 'Filtre', culture_name: 'Culture', title: 'Titre', document_category: 'Type document', module_source: 'Module source', amount: 'Montant', verification_status: 'État preuve',
};
const moduleLabel = (module = '') => ({ stock: 'Stock', finances: 'Finances', fournisseurs: 'Fournisseurs', tracabilite: 'Traçabilité', centre_ia: 'Centre décisionnel', ventes: 'Ventes', clients: 'Clients', avicole: 'Avicole', animaux: 'Animaux', sante: 'Santé', cultures: 'Cultures', alertes: 'Alertes', taches: 'Tâches', documents: 'Documents', investissements: 'Investissements', dashboard: 'Accueil', smartfarm: 'Smart Farm', comptabilite: 'Comptabilité' }[module] || module);
const valueLabel = (value) => { if (value === null || value === undefined || value === '') return 'À renseigner'; if (value === 'paid') return 'Payé'; if (value === 'credit') return 'À crédit'; if (value === 'partial') return 'Partiel'; if (value === 'unknown') return 'À confirmer'; return String(value); };
const draftTargetModule = (draft = {}) => draft.primary_module || draft.target_module || (draft.impacted_modules || [])[0] || 'dashboard';
const formTitle = (draft = {}) => draft.form_type === 'health_action' ? `Ouvrir fiche ${draft.draft_fields?.action_type === 'deparasitage' ? 'déparasitage' : draft.draft_fields?.action_type === 'soin' ? 'soin' : 'vaccination'}` : draft.form_type === 'sale_record' ? 'Ouvrir vente guidée' : draft.form_type?.startsWith('animal_') ? 'Ouvrir fiche animal' : `Modifier dans ${moduleLabel(draftTargetModule(draft))}`;

function InlineDraftActions({
  draft,
  onValidate,
  onCancel,
  isValidating = false,
  onCompletionChoice,
}) {
  const missing = draft.missing_fields || [];
  const completion = draft.documentCompletion;
  const awaitingCompletion = completion?.awaitingReply;
  const hasBlockingMissing = missing.length > 0 || awaitingCompletion;
  const choices = completion?.choices || [];

  return (
    <div className="mt-4 space-y-3">
      {choices.length ? (
        <div className="flex flex-wrap gap-2">
          {choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={isValidating}
              onClick={() => onCompletionChoice?.(choice)}
              className="rounded-lg border px-3 py-2 text-xs font-semibold tracking-normal disabled:opacity-40"
              style={{ borderColor: HORIZON.border, color: HORIZON.text, background: HORIZON.surface }}
            >
              {choice.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={hasBlockingMissing || isValidating}
        onClick={onValidate}
        className="rounded-lg px-4 py-2 text-xs font-semibold tracking-normal text-white disabled:opacity-40"
        style={{ background: HORIZON.primary }}
      >
        {isValidating ? 'Confirmation…' : (completion ? 'VALIDER' : 'Confirmer')}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isValidating}
        className="rounded-lg border px-4 py-2 text-xs font-semibold tracking-normal disabled:opacity-40"
        style={{ borderColor: HORIZON.border, color: HORIZON.text, background: HORIZON.surface }}
      >
        Annuler
      </button>
      </div>
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
    openFormModal({ module: editModule, draft });
  };

  return (
    <div className="rounded-3xl border border-line bg-card p-4 space-y-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-meta uppercase tracking-normal font-semibold text-slate">Brouillon Horizon</p>
          <h3 className="text-base font-semibold text-earth">{draft.ui?.title || 'Action ERP à valider'}</h3>
          <p className="text-xs text-slate mt-1">{draft.ui?.subtitle || 'Vérifie les données avant validation.'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-meta font-semibold ${hasBlockingMissing ? 'bg-vigilance-bg text-horizon-dark border border-vigilance' : 'bg-positive-bg text-positive border border-positive'}`}>
          {hasBlockingMissing ? 'À compléter' : 'Prêt à valider'}
        </span>
      </div>
      {warnings.length ? (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <div key={warning} className="flex gap-2 rounded-2xl border border-vigilance bg-vigilance-bg px-3 py-2 text-xs text-horizon-dark">
              <AlertTriangle size={14} className="shrink-0 mt-1" />
              <span>{warning}</span>
            </div>
          ))}
        </div>
      ) : null}
      {missing.length ? (
        <div className="rounded-2xl border border-urgent bg-urgent-bg p-3">
          <p className="text-xs font-semibold text-urgent mb-2">Champs manquants</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((field) => (
              <span key={field} className="rounded-full bg-white border border-urgent px-2 py-1 text-meta font-semibold text-urgent">
                {labels[field] || field}
              </span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {Object.entries(fields).filter(([key]) => !['notes', 'product_id', 'supplier_id'].includes(key)).map(([key, value]) => (
          <label key={key} className="rounded-2xl border border-line bg-white p-3 space-y-1">
            <span className="block text-meta font-semibold uppercase tracking-normal text-slate">{labels[key] || key}</span>
            <input value={valueLabel(value)} onChange={(event) => onChangeField?.(key, event.target.value)} className="w-full bg-transparent text-sm font-semibold text-earth outline-none" />
          </label>
        ))}
      </div>
      {draft.next_required_form ? (
        <div className="rounded-2xl border border-line bg-neutral-bg p-3">
          <p className="text-xs font-semibold text-neutral">Formulaire lié requis</p>
          <p className="text-sm font-semibold text-earth mt-1">{draft.next_required_form.title}</p>
          <p className="text-xs text-neutral mt-1">{draft.next_required_form.subtitle}</p>
        </div>
      ) : null}
      <div className="rounded-2xl border border-line bg-white p-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-earth mb-2"><Layers size={14} /> Modules impactés</p>
        <div className="flex flex-wrap gap-2">
          {(draft.impacted_modules || []).map((module) => (
            <button key={module} type="button" onClick={() => onOpenModule?.(module)} className="rounded-full border border-line bg-card px-3 py-1 text-meta font-semibold text-slate hover:border-positive hover:text-positive">
              {moduleLabel(module)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button type="button" onClick={onCancel} className="rounded-2xl border border-line bg-white px-3 py-2 text-xs font-semibold text-slate hover:bg-vigilance-bg"><X size={14} className="inline" /> Annuler</button>
        <button type="button" onClick={openForm} className="rounded-2xl border border-line bg-white px-3 py-2 text-xs font-semibold text-earth hover:bg-vigilance-bg"><Edit3 size={14} className="inline" /> {formTitle(draft)}</button>
        <button type="button" disabled={hasBlockingMissing} onClick={onValidate} className="rounded-2xl bg-positive px-3 py-2 text-xs font-semibold text-white disabled:opacity-45 disabled:cursor-not-allowed"><CheckCircle size={14} className="inline" /> VALIDER</button>
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
  onCompletionChoice,
  variant = 'full',
  isValidating = false,
}) {
  if (!draft || !draft.intent || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  if (variant === 'inline') {
    return (
      <InlineDraftActions
        draft={draft}
        onValidate={onValidate}
        onCancel={onCancel}
        isValidating={isValidating}
        onCompletionChoice={onCompletionChoice}
      />
    );
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
