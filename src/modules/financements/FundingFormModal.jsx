import { useMemo, useState } from 'react';
import BaseModal from '../../modals/BaseModal.jsx';
import { fundingFormDefaults } from '../../services/financements/fundingOperations.js';
import {
  ACCOUNT_STATUS_OPTIONS,
  AGREEMENT_STATUS_OPTIONS,
  APPLICATION_STATUS_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
  JOURNAL_STATUS_OPTIONS,
  OPPORTUNITY_STATUS_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
  REPORT_STATUS_OPTIONS,
  VISIBILITY_OPTIONS,
} from './fundingLabels.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const money = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;

export const FUNDING_FORM_TITLES = Object.freeze({
  opportunity: 'Opportunité de financement',
  contact: 'Contact financeur',
  application: 'Dossier de financement',
  document: 'Pièce du dossier',
  agreement: 'Convention de financement',
  allocation: 'Affectation d’une dépense',
  report: 'Rapport financeur',
  account: 'Accès financeur',
  journal: 'Mise à jour du projet',
});

function Field({ label, children, wide = false, hint = '' }) {
  return (
    <label className={`block space-y-1 ${wide ? 'md:col-span-2' : ''}`}>
      <span className="text-sm font-semibold text-earth">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-slate">{hint}</span> : null}
    </label>
  );
}

const inputClass = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-earth outline-none focus:border-earth';
const textareaClass = 'min-h-24 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-earth outline-none focus:border-earth';

function Input({ value, onChange, type = 'text', min, step, placeholder = '' }) {
  return (
    <input
      type={type}
      min={min}
      step={step}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={inputClass}
    />
  );
}

function Textarea({ value, onChange, placeholder = '' }) {
  return (
    <textarea
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={textareaClass}
    />
  );
}

function Select({ value, onChange, options = [], blank = null }) {
  return (
    <select value={value ?? ''} onChange={(event) => onChange(event.target.value)} className={inputClass}>
      {blank ? <option value="">{blank}</option> : null}
      {options.map((option) => {
        const item = Array.isArray(option) ? { value: option[0], label: option[1] } : option;
        return <option key={item.value} value={item.value}>{item.label}</option>;
      })}
    </select>
  );
}

function PermissionChoices({ value, onChange }) {
  const selected = new Set(String(value || '').split(',').map((item) => item.trim()).filter(Boolean));
  const choices = [
    ['overview', 'Vue d’ensemble'],
    ['reports', 'Rapports'],
    ['project_journal', 'Journal du projet'],
    ['shared_documents', 'Documents partagés'],
  ];
  const toggle = (permission) => {
    if (selected.has(permission)) selected.delete(permission);
    else selected.add(permission);
    onChange([...selected].join(', '));
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {choices.map(([permission, label]) => (
        <label key={permission} className="flex min-h-11 items-center gap-3 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-earth">
          <input type="checkbox" checked={selected.has(permission)} onChange={() => toggle(permission)} />
          <span>{label}</span>
        </label>
      ))}
    </div>
  );
}

function OpportunityFields({ form, set }) {
  return (
    <>
      <Field label="Opportunité" wide><Input value={form.title} onChange={set('title')} placeholder="Ex. Fonds agricole 2026" /></Field>
      <Field label="Organisme"><Input value={form.institution} onChange={set('institution')} /></Field>
      <Field label="Type"><Select value={form.opportunity_type} onChange={set('opportunity_type')} options={OPPORTUNITY_TYPE_OPTIONS} /></Field>
      <Field label="Statut"><Select value={form.status} onChange={set('status')} options={OPPORTUNITY_STATUS_OPTIONS} /></Field>
      <Field label="Montant demandé"><Input type="number" min="0" step="1000" value={form.amount_requested} onChange={set('amount_requested')} /></Field>
      <Field label="Échéance"><Input type="date" value={form.deadline} onChange={set('deadline')} /></Field>
      <Field label="Responsable"><Input value={form.owner_label} onChange={set('owner_label')} /></Field>
      <Field label="Prochaine action"><Input value={form.next_action} onChange={set('next_action')} /></Field>
      <Field label="Date de la prochaine action"><Input type="date" value={form.next_action_at} onChange={set('next_action_at')} /></Field>
      <Field label="Critères d’éligibilité" wide><Textarea value={form.eligibility} onChange={set('eligibility')} /></Field>
      <Field label="Pièces demandées" wide hint="Sépare les pièces par une virgule."><Textarea value={form.required_documents} onChange={set('required_documents')} placeholder="Business plan, budget, pièce d’identité" /></Field>
    </>
  );
}

function ContactFields({ form, set, context }) {
  return (
    <>
      <Field label="Nom"><Input value={form.name} onChange={set('name')} /></Field>
      <Field label="Organisation"><Input value={form.organization} onChange={set('organization')} /></Field>
      <Field label="Fonction"><Input value={form.role} onChange={set('role')} /></Field>
      <Field label="Type d’organisation"><Select value={form.organization_type} onChange={set('organization_type')} options={OPPORTUNITY_TYPE_OPTIONS} /></Field>
      <Field label="Pays"><Input value={form.country} onChange={set('country')} /></Field>
      <Field label="Statut"><Select value={form.status} onChange={set('status')} options={CONTACT_STATUS_OPTIONS} /></Field>
      <Field label="Courriel"><Input type="email" value={form.email} onChange={set('email')} /></Field>
      <Field label="Téléphone"><Input type="tel" value={form.phone} onChange={set('phone')} /></Field>
      <Field label="Dernier échange"><Input type="date" value={form.last_exchange_at} onChange={set('last_exchange_at')} /></Field>
      <Field label="Prochaine relance"><Input type="date" value={form.next_follow_up_at} onChange={set('next_follow_up_at')} /></Field>
      <Field label="Opportunité liée" wide>
        <Select
          value={form.linked_opportunity_id}
          onChange={set('linked_opportunity_id')}
          blank="Aucune"
          options={arr(context.opportunities).map((row) => ({ value: row.id, label: `${row.title}${row.institution ? ` · ${row.institution}` : ''}` }))}
        />
      </Field>
    </>
  );
}

function ApplicationFields({ form, set, context }) {
  return (
    <>
      <Field label="Dossier" wide><Input value={form.title} onChange={set('title')} /></Field>
      <Field label="Opportunité liée">
        <Select
          value={form.opportunity_id}
          onChange={set('opportunity_id')}
          blank="Aucune"
          options={arr(context.opportunities).map((row) => ({ value: row.id, label: row.title }))}
        />
      </Field>
      <Field label="Organisme destinataire"><Input value={form.target_institution} onChange={set('target_institution')} /></Field>
      <Field label="Statut"><Select value={form.status} onChange={set('status')} options={APPLICATION_STATUS_OPTIONS} /></Field>
      <Field label="Montant demandé"><Input type="number" min="0" step="1000" value={form.requested_amount} onChange={set('requested_amount')} /></Field>
      <Field label="Date de dépôt"><Input type="date" value={form.submitted_at} onChange={set('submitted_at')} /></Field>
      <Field label="Décision attendue"><Input type="date" value={form.decision_due_at} onChange={set('decision_due_at')} /></Field>
      <Field label="Pièces obligatoires" wide><Textarea value={form.required_documents} onChange={set('required_documents')} /></Field>
      <Field label="Pièces prêtes" wide><Textarea value={form.ready_documents} onChange={set('ready_documents')} /></Field>
    </>
  );
}

function DocumentFields({ form, set, context }) {
  return (
    <>
      <Field label="Titre" wide><Input value={form.title} onChange={set('title')} /></Field>
      <Field label="Catégorie"><Input value={form.category} onChange={set('category')} /></Field>
      <Field label="Version"><Input value={form.version_label} onChange={set('version_label')} /></Field>
      <Field label="Dossier lié">
        <Select value={form.application_id} onChange={set('application_id')} blank="Aucun" options={arr(context.applications).map((row) => ({ value: row.id, label: row.title }))} />
      </Field>
      <Field label="Convention liée">
        <Select value={form.agreement_id} onChange={set('agreement_id')} blank="Aucune" options={arr(context.agreements).map((row) => ({ value: row.id, label: row.title }))} />
      </Field>
      <Field label="Visibilité"><Select value={form.visibility} onChange={set('visibility')} options={VISIBILITY_OPTIONS} /></Field>
      <Field label="Statut"><Select value={form.status} onChange={set('status')} options={DOCUMENT_STATUS_OPTIONS} /></Field>
      <Field label="Document ERP">
        <Select
          value={form.erp_document_id}
          onChange={set('erp_document_id')}
          blank="Aucun"
          options={arr(context.erpDocuments).map((row) => ({ value: row.id, label: row.title || row.nom || row.name || row.id }))}
        />
      </Field>
      <Field label="Lien du fichier" wide><Input type="url" value={form.file_url} onChange={set('file_url')} placeholder="https://…" /></Field>
    </>
  );
}

function AgreementFields({ form, set, context }) {
  return (
    <>
      <Field label="Convention" wide><Input value={form.title} onChange={set('title')} /></Field>
      <Field label="Financeur"><Input value={form.funder} onChange={set('funder')} /></Field>
      <Field label="Dossier lié">
        <Select value={form.application_id} onChange={set('application_id')} blank="Aucun" options={arr(context.applications).map((row) => ({ value: row.id, label: row.title }))} />
      </Field>
      <Field label="Statut"><Select value={form.status} onChange={set('status')} options={AGREEMENT_STATUS_OPTIONS} /></Field>
      <Field label="Date de signature"><Input type="date" value={form.signed_at} onChange={set('signed_at')} /></Field>
      <Field label="Montant accordé"><Input type="number" min="0" step="1000" value={form.amount_granted} onChange={set('amount_granted')} /></Field>
      <Field label="Montant réellement reçu"><Input type="number" min="0" step="1000" value={form.amount_received} onChange={set('amount_received')} /></Field>
      <Field label="Prochain rapport attendu"><Input type="date" value={form.reporting_due_at} onChange={set('reporting_due_at')} /></Field>
      <Field label="Dépenses autorisées" wide><Textarea value={form.restrictions} onChange={set('restrictions')} placeholder="Équipement, intrants, formation" /></Field>
    </>
  );
}

function AllocationFields({ form, set, context }) {
  const transactions = useMemo(() => arr(context.transactions).filter((row) => (
    ['sortie', 'depense', 'dépense', 'expense', 'debit', 'débit'].includes(String(row.type || row.sens || row.transaction_type || '').toLowerCase())
  )), [context.transactions]);
  return (
    <>
      <Field label="Convention" wide>
        <Select value={form.agreement_id} onChange={set('agreement_id')} blank="Choisir" options={arr(context.agreements).map((row) => ({ value: row.id, label: `${row.title} · reste ${money(row.amount_remaining)}` }))} />
      </Field>
      <Field label="Dépense Finance" wide>
        <Select
          value={form.finance_transaction_id}
          onChange={set('finance_transaction_id')}
          blank="Choisir"
          options={transactions.map((row) => ({
            value: row.id,
            label: `${row.libelle || row.label || 'Dépense'} · ${money(row.montant ?? row.amount)}${row.date ? ` · ${row.date}` : ''}`,
          }))}
        />
      </Field>
      <Field label="Montant affecté"><Input type="number" min="0" step="1000" value={form.amount} onChange={set('amount')} /></Field>
      <Field label="Catégorie"><Input value={form.category} onChange={set('category')} /></Field>
      <Field label="Justificatif" wide>
        <Select
          value={form.document_id}
          onChange={set('document_id')}
          blank="Choisir"
          options={arr(context.erpDocuments).map((row) => ({ value: row.id, label: row.title || row.nom || row.name || row.id }))}
        />
      </Field>
    </>
  );
}

function ReportFields({ form, set }) {
  return (
    <>
      <Field label="Titre" wide><Input value={form.title} onChange={set('title')} /></Field>
      <Field label="Période"><Input value={form.period_label} onChange={set('period_label')} /></Field>
      <Field label="Statut">
        <Select
          value={form.status}
          onChange={set('status')}
          options={REPORT_STATUS_OPTIONS.filter(([value]) => value === 'draft')}
        />
      </Field>
      <Field label="Visibilité"><Select value={form.visibility} onChange={set('visibility')} options={VISIBILITY_OPTIONS} /></Field>
      <Field label="Version"><Input type="number" min="1" step="1" value={form.version_number} onChange={set('version_number')} /></Field>
      <Field label="Résumé destiné au financeur" wide><Textarea value={form.public_summary} onChange={set('public_summary')} /></Field>
      <Field label="Rubriques du rapport" wide><Input value={form.sections} onChange={set('sections')} /></Field>
      <Field label="Lien du rapport" wide><Input type="url" value={form.file_url} onChange={set('file_url')} placeholder="https://…" /></Field>
    </>
  );
}

function AccountFields({ form, set }) {
  return (
    <>
      <Field label="Courriel"><Input type="email" value={form.email} onChange={set('email')} /></Field>
      <Field label="Nom affiché"><Input value={form.display_name} onChange={set('display_name')} /></Field>
      <Field label="Organisation"><Input value={form.organization} onChange={set('organization')} /></Field>
      <Field label="Statut"><Select value={form.status} onChange={set('status')} options={ACCOUNT_STATUS_OPTIONS} /></Field>
      <Field label="Fin de l’accès"><Input type="date" value={form.expires_at} onChange={set('expires_at')} /></Field>
      <Field label="Rubriques accessibles" wide><PermissionChoices value={form.permissions} onChange={set('permissions')} /></Field>
    </>
  );
}

function JournalFields({ form, set }) {
  return (
    <>
      <Field label="Titre" wide><Input value={form.title} onChange={set('title')} /></Field>
      <Field label="Date"><Input type="date" value={form.event_date} onChange={set('event_date')} /></Field>
      <Field label="Statut"><Select value={form.status} onChange={set('status')} options={JOURNAL_STATUS_OPTIONS} /></Field>
      <Field label="Visibilité"><Select value={form.visibility} onChange={set('visibility')} options={VISIBILITY_OPTIONS.filter(([value]) => value !== 'restricted')} /></Field>
      <Field label="Résumé" wide><Textarea value={form.summary} onChange={set('summary')} /></Field>
    </>
  );
}

function FormFields({ kind, form, set, context }) {
  if (kind === 'opportunity') return <OpportunityFields form={form} set={set} />;
  if (kind === 'contact') return <ContactFields form={form} set={set} context={context} />;
  if (kind === 'application') return <ApplicationFields form={form} set={set} context={context} />;
  if (kind === 'document') return <DocumentFields form={form} set={set} context={context} />;
  if (kind === 'agreement') return <AgreementFields form={form} set={set} context={context} />;
  if (kind === 'allocation') return <AllocationFields form={form} set={set} context={context} />;
  if (kind === 'report') return <ReportFields form={form} set={set} />;
  if (kind === 'account') return <AccountFields form={form} set={set} />;
  if (kind === 'journal') return <JournalFields form={form} set={set} />;
  return null;
}

export default function FundingFormModal({
  open,
  kind,
  initial = {},
  context = {},
  busy = false,
  validationErrors = [],
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => fundingFormDefaults(kind, initial, context));

  if (!open || !kind) return null;
  const set = (key) => (value) => setForm((previous) => ({ ...previous, [key]: value }));

  return (
    <BaseModal
      open
      title={`${initial?.id ? 'Modifier' : 'Ajouter'} · ${FUNDING_FORM_TITLES[kind] || 'Financement'}`}
      onClose={onClose}
      footer={(
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-11 rounded-lg border border-line bg-white px-4 text-sm font-semibold text-earth">Annuler</button>
          <button type="button" disabled={busy} onClick={() => onSubmit?.(form)} className="h-11 rounded-lg bg-earth px-4 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        {validationErrors.length ? (
          <div role="alert" className="rounded-lg border border-urgent bg-urgent-bg p-3 text-sm text-urgent">
            {validationErrors.map((error) => <p key={error}>{error}</p>)}
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          <FormFields kind={kind} form={form} set={set} context={context} />
        </div>
      </div>
    </BaseModal>
  );
}
