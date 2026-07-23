import { createFundingReportVersion } from './financementsService.js';

export const FUNDING_FORM_KINDS = Object.freeze([
  'opportunity',
  'contact',
  'application',
  'document',
  'agreement',
  'allocation',
  'report',
  'account',
  'journal',
]);

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value ?? '').trim();
const lower = (value) => clean(value).toLowerCase();
const number = (value) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const sameId = (left, right) => clean(left) && clean(left) === clean(right);

export function fundingListValue(value) {
  const values = (Array.isArray(value) ? value : clean(value).split(/[\n,;]+/))
    .map(clean)
    .filter(Boolean);
  const seen = new Set();
  return values.filter((item) => {
    const key = lower(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function fundingListInput(value) {
  return Array.isArray(value) ? value.join(', ') : clean(value);
}

function amountOf(row = {}) {
  return Math.abs(number(row.montant ?? row.amount ?? row.montant_total ?? row.total));
}

function transactionIsExpense(row = {}) {
  return ['sortie', 'depense', 'dépense', 'expense', 'debit', 'débit'].includes(lower(row.type || row.sens || row.transaction_type));
}

function rowFarmId(row = {}) {
  return clean(row.farm_id || row.farmId);
}

function checkFarm(errors, row, farmId, label) {
  const recordFarmId = rowFarmId(row);
  if (farmId && recordFarmId && recordFarmId !== clean(farmId)) {
    errors.push(`${label} n’appartient pas à la ferme active.`);
  }
}

export function fundingFormDefaults(kind, initial = {}, context = {}) {
  const shared = { id: initial.id || '', farm_id: initial.farm_id || context.farmId || '' };
  if (kind === 'opportunity') {
    return {
      ...shared,
      title: initial.title || '',
      institution: initial.institution || '',
      opportunity_type: initial.opportunity_type || initial.type || 'subvention',
      status: initial.status || 'identifiee',
      amount_requested: initial.amount_requested ?? initial.amount ?? '',
      deadline: initial.deadline || '',
      owner_label: initial.owner_label || initial.owner || '',
      next_action: initial.next_action || '',
      next_action_at: initial.next_action_at || '',
      eligibility: initial.eligibility || '',
      required_documents: fundingListInput(initial.required_documents),
      source: initial.source || 'financements',
    };
  }
  if (kind === 'contact') {
    return {
      ...shared,
      name: initial.name || '',
      organization: initial.organization || '',
      role: initial.role || '',
      organization_type: initial.organization_type || 'subvention',
      country: initial.country || 'Sénégal',
      email: initial.email || '',
      phone: initial.phone || '',
      status: initial.status || 'prospect',
      last_exchange_at: initial.last_exchange_at || '',
      next_follow_up_at: initial.next_follow_up_at || '',
      linked_opportunity_id: initial.linked_opportunity_id || '',
      consent_status: initial.consent_status || 'non_precise',
    };
  }
  if (kind === 'application') {
    return {
      ...shared,
      opportunity_id: initial.opportunity_id || '',
      title: initial.title || '',
      target_institution: initial.target_institution || initial.institution || '',
      status: initial.status || 'draft',
      requested_amount: initial.requested_amount ?? initial.amount_requested ?? '',
      submitted_at: initial.submitted_at || '',
      decision_due_at: initial.decision_due_at || '',
      required_documents: fundingListInput(initial.required_documents),
      ready_documents: fundingListInput(initial.ready_documents),
      frozen_snapshot_hash: initial.frozen_snapshot_hash || '',
    };
  }
  if (kind === 'document') {
    return {
      ...shared,
      application_id: initial.application_id || initial.linked_application_id || '',
      agreement_id: initial.agreement_id || initial.linked_agreement_id || '',
      title: initial.title || '',
      category: initial.category || 'piece_dossier',
      version_label: initial.version_label || initial.version || 'v1',
      visibility: initial.visibility || 'internal',
      status: initial.status || 'draft',
      file_url: initial.file_url || '',
      erp_document_id: initial.erp_document_id || '',
      source: initial.source || 'financements',
      published_at: initial.published_at || null,
    };
  }
  if (kind === 'agreement') {
    return {
      ...shared,
      application_id: initial.application_id || '',
      title: initial.title || '',
      funder: initial.funder || '',
      status: initial.status || 'draft',
      amount_granted: initial.amount_granted ?? '',
      amount_received: initial.amount_received ?? '',
      amount_spent: initial.amount_spent ?? 0,
      signed_at: initial.signed_at || '',
      reporting_due_at: initial.reporting_due_at || '',
      restrictions: fundingListInput(initial.restrictions),
    };
  }
  if (kind === 'allocation') {
    return {
      ...shared,
      agreement_id: initial.agreement_id || '',
      finance_transaction_id: initial.finance_transaction_id || initial.transaction_id || '',
      document_id: initial.document_id || '',
      amount: initial.amount ?? '',
      category: initial.category || '',
      status: initial.status || 'allocated',
      allocated_at: initial.allocated_at || today(),
    };
  }
  if (kind === 'report') {
    return {
      ...shared,
      title: initial.title || `Rapport financement ${new Date().toLocaleDateString('fr-FR')}`,
      period_label: initial.period_label || initial.period || 'Toutes les périodes',
      status: initial.status || 'draft',
      visibility: initial.visibility || 'internal',
      version_number: initial.version_number || initial.version || context.nextReportVersion || 1,
      source_snapshot_hash: initial.source_snapshot_hash || context.sourceSnapshot?.hash || '',
      source_snapshot_generated_at: initial.source_snapshot_generated_at || context.sourceSnapshot?.generated_at || new Date().toISOString(),
      public_summary: initial.public_summary || '',
      sections: fundingListInput(initial.sections?.length ? initial.sections : ['Indicateurs', 'Fonds', 'Avancement']),
      file_url: initial.file_url || '',
      immutable: initial.immutable !== false,
    };
  }
  if (kind === 'account') {
    return {
      ...shared,
      email: initial.email || '',
      organization: initial.organization || '',
      display_name: initial.display_name || '',
      status: initial.status || 'invited',
      permissions: fundingListInput(initial.permissions?.length ? initial.permissions : ['overview', 'reports', 'project_journal', 'shared_documents']),
      expires_at: initial.expires_at ? String(initial.expires_at).slice(0, 10) : '',
      user_id: initial.user_id || '',
    };
  }
  if (kind === 'journal') {
    return {
      ...shared,
      title: initial.title || '',
      summary: initial.summary || '',
      event_date: initial.event_date || initial.date || today(),
      status: initial.status || 'draft',
      visibility: initial.visibility || 'shared',
    };
  }
  return shared;
}

function validateOpportunity(form, errors) {
  if (!clean(form.title)) errors.push('Le nom de l’opportunité est obligatoire.');
  if (number(form.amount_requested) < 0) errors.push('Le montant demandé ne peut pas être négatif.');
  if (form.deadline && !clean(form.owner_label)) errors.push('Un responsable est obligatoire lorsqu’une échéance est renseignée.');
}

function validateContact(form, errors, context) {
  if (!clean(form.name)) errors.push('Le nom du contact est obligatoire.');
  if (!clean(form.email) && !clean(form.phone)) errors.push('Renseigne un courriel ou un téléphone.');
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(form.email))) errors.push('Le courriel du contact n’est pas valide.');
  if (form.linked_opportunity_id) {
    const opportunity = arr(context.opportunities).find((row) => sameId(row.id, form.linked_opportunity_id));
    if (!opportunity) errors.push('L’opportunité liée est introuvable.');
    else checkFarm(errors, opportunity, context.farmId, 'L’opportunité');
  }
}

function validateApplication(form, errors, context) {
  if (!clean(form.title)) errors.push('Le nom du dossier est obligatoire.');
  if (!clean(form.target_institution)) errors.push('L’organisme destinataire est obligatoire.');
  if (number(form.requested_amount) <= 0) errors.push('Le montant demandé doit être supérieur à zéro.');
  if (form.opportunity_id) {
    const opportunity = arr(context.opportunities).find((row) => sameId(row.id, form.opportunity_id));
    if (!opportunity) errors.push('L’opportunité liée est introuvable.');
    else checkFarm(errors, opportunity, context.farmId, 'L’opportunité');
  }
  const required = fundingListValue(form.required_documents);
  const ready = new Set(fundingListValue(form.ready_documents).map(lower));
  const missing = required.filter((document) => !ready.has(lower(document)));
  if (['ready', 'submitted', 'under_review', 'approved'].includes(lower(form.status)) && missing.length) {
    errors.push(`Le dossier ne peut pas avancer : ${missing.length} pièce(s) obligatoire(s) manquante(s).`);
  }
  if (['submitted', 'under_review', 'approved'].includes(lower(form.status)) && !form.submitted_at) {
    errors.push('La date de dépôt est obligatoire pour ce statut.');
  }
}

function validateDocument(form, errors, context) {
  if (!clean(form.title)) errors.push('Le titre de la pièce est obligatoire.');
  if (!clean(form.category)) errors.push('La catégorie de la pièce est obligatoire.');
  if (form.application_id) {
    const application = arr(context.applications).find((row) => sameId(row.id, form.application_id));
    if (!application) errors.push('Le dossier lié est introuvable.');
    else checkFarm(errors, application, context.farmId, 'Le dossier');
  }
  if (form.agreement_id) {
    const agreement = arr(context.agreements).find((row) => sameId(row.id, form.agreement_id));
    if (!agreement) errors.push('La convention liée est introuvable.');
    else checkFarm(errors, agreement, context.farmId, 'La convention');
  }
  if (
    ['shared', 'public'].includes(lower(form.visibility))
    && lower(form.status) === 'published'
    && !clean(form.file_url)
    && !clean(form.erp_document_id)
  ) {
    errors.push('Une pièce publiée doit contenir un fichier ou un document ERP lié.');
  }
}

function validateAgreement(form, errors, context) {
  if (!clean(form.title)) errors.push('Le nom de la convention est obligatoire.');
  if (!clean(form.funder)) errors.push('Le financeur est obligatoire.');
  if (number(form.amount_granted) <= 0) errors.push('Le montant accordé doit être supérieur à zéro.');
  if (number(form.amount_received) < 0) errors.push('Le montant reçu ne peut pas être négatif.');
  if (number(form.amount_received) > number(form.amount_granted)) errors.push('Le montant reçu ne peut pas dépasser le montant accordé.');
  if (['signed', 'active', 'completed'].includes(lower(form.status)) && !form.signed_at) {
    errors.push('La date de signature est obligatoire pour une convention signée ou active.');
  }
  if (number(form.amount_received) > 0 && lower(form.status) === 'draft') {
    errors.push('Des fonds reçus ne peuvent pas rester rattachés à une convention en brouillon.');
  }
  if (form.application_id) {
    const application = arr(context.applications).find((row) => sameId(row.id, form.application_id));
    if (!application) errors.push('Le dossier lié est introuvable.');
    else checkFarm(errors, application, context.farmId, 'Le dossier');
  }
}

function validateAllocation(form, errors, context) {
  const agreement = arr(context.agreements).find((row) => sameId(row.id, form.agreement_id));
  const transaction = arr(context.transactions).find((row) => sameId(row.id, form.finance_transaction_id));
  const document = arr(context.documents).find((row) => sameId(row.id, form.document_id));
  const amount = number(form.amount);
  if (!agreement) errors.push('Choisis une convention valide.');
  if (!transaction) errors.push('Choisis une dépense Finance valide.');
  if (!document) errors.push('Choisis le justificatif de la dépense.');
  if (!clean(form.category)) errors.push('La catégorie d’utilisation est obligatoire.');
  if (amount <= 0) errors.push('Le montant affecté doit être supérieur à zéro.');
  if (agreement) checkFarm(errors, agreement, context.farmId, 'La convention');
  if (transaction) {
    checkFarm(errors, transaction, context.farmId, 'La dépense');
    if (!transactionIsExpense(transaction)) errors.push('Seule une dépense Finance peut être affectée à un financement.');
    if (amount > amountOf(transaction)) errors.push('Le montant affecté dépasse le montant de la dépense.');
  }
  if (document) {
    checkFarm(errors, document, context.farmId, 'Le justificatif');
    if (!clean(document.file_url || document.url)) {
      errors.push('Le justificatif doit contenir un fichier.');
    }
  }

  const otherAllocations = arr(context.allocations).filter((row) => !sameId(row.id, form.id));
  const transactionAllocated = otherAllocations
    .filter((row) => sameId(row.transaction_id || row.finance_transaction_id, form.finance_transaction_id))
    .reduce((sum, row) => sum + number(row.amount), 0);
  if (transaction && transactionAllocated + amount > amountOf(transaction)) {
    errors.push('Cette dépense est déjà affectée en totalité.');
  }
  const agreementAllocated = otherAllocations
    .filter((row) => sameId(row.agreement_id, form.agreement_id))
    .reduce((sum, row) => sum + number(row.amount), 0);
  if (agreement && agreementAllocated + amount > number(agreement.amount_received)) {
    errors.push('Le total affecté dépasserait les fonds réellement reçus.');
  }
}

function validateReport(form, errors) {
  if (!clean(form.title)) errors.push('Le titre du rapport est obligatoire.');
  if (!clean(form.source_snapshot_hash)) errors.push('Les données du rapport doivent être figées.');
  if (!fundingListValue(form.sections).length && !clean(form.public_summary)) errors.push('Ajoute au moins une section ou un résumé.');
  if (lower(form.status) === 'published' && !['shared', 'public'].includes(lower(form.visibility))) {
    errors.push('Un rapport publié doit être explicitement partagé.');
  }
}

function validateAccount(form, errors) {
  if (!clean(form.email)) errors.push('Le courriel du financeur est obligatoire.');
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(form.email))) errors.push('Le courriel du financeur n’est pas valide.');
  if (!fundingListValue(form.permissions).length) errors.push('Choisis au moins une rubrique accessible.');
  if (form.expires_at && new Date(`${form.expires_at}T23:59:59`).getTime() <= Date.now()) {
    errors.push('La date de fin d’accès doit être future.');
  }
}

function validateJournal(form, errors) {
  if (!clean(form.title)) errors.push('Le titre de la mise à jour est obligatoire.');
  if (!clean(form.summary)) errors.push('Le résumé de la mise à jour est obligatoire.');
  if (lower(form.status) === 'published' && !['shared', 'public'].includes(lower(form.visibility))) {
    errors.push('Une mise à jour publiée doit être partagée avec les financeurs.');
  }
}

export function validateFundingOperation(kind, form = {}, context = {}) {
  const errors = [];
  if (!FUNDING_FORM_KINDS.includes(kind)) errors.push('Type d’enregistrement inconnu.');
  if (!clean(context.farmId || form.farm_id)) errors.push('Choisis une ferme avant d’enregistrer.');
  if (kind === 'opportunity') validateOpportunity(form, errors);
  if (kind === 'contact') validateContact(form, errors, context);
  if (kind === 'application') validateApplication(form, errors, context);
  if (kind === 'document') validateDocument(form, errors, context);
  if (kind === 'agreement') validateAgreement(form, errors, context);
  if (kind === 'allocation') validateAllocation(form, errors, context);
  if (kind === 'report') validateReport(form, errors);
  if (kind === 'account') validateAccount(form, errors);
  if (kind === 'journal') validateJournal(form, errors);
  return { ok: errors.length === 0, errors };
}

function optional(value) {
  return clean(value) || null;
}

export function buildFundingOperationPayload(kind, form = {}, context = {}) {
  const farm_id = clean(context.farmId || form.farm_id);
  if (kind === 'opportunity') {
    return {
      farm_id,
      title: clean(form.title),
      institution: optional(form.institution),
      opportunity_type: lower(form.opportunity_type) || 'subvention',
      status: lower(form.status) || 'identifiee',
      amount_requested: number(form.amount_requested),
      deadline: optional(form.deadline),
      owner_label: optional(form.owner_label),
      next_action: optional(form.next_action),
      next_action_at: optional(form.next_action_at),
      eligibility: optional(form.eligibility),
      required_documents: fundingListValue(form.required_documents),
      source: clean(form.source) || 'financements',
    };
  }
  if (kind === 'contact') {
    return {
      farm_id,
      name: clean(form.name),
      organization: optional(form.organization),
      role: optional(form.role),
      organization_type: lower(form.organization_type) || 'subvention',
      country: optional(form.country),
      email: optional(form.email),
      phone: optional(form.phone),
      status: lower(form.status) || 'prospect',
      last_exchange_at: optional(form.last_exchange_at),
      next_follow_up_at: optional(form.next_follow_up_at),
      linked_opportunity_id: optional(form.linked_opportunity_id),
      consent_status: lower(form.consent_status) || 'non_precise',
    };
  }
  if (kind === 'application') {
    const required = fundingListValue(form.required_documents);
    const ready = fundingListValue(form.ready_documents);
    const readyKeys = new Set(ready.map(lower));
    const completedRequired = required.filter((document) => readyKeys.has(lower(document))).length;
    return {
      farm_id,
      opportunity_id: optional(form.opportunity_id),
      title: clean(form.title),
      target_institution: clean(form.target_institution),
      status: lower(form.status) || 'draft',
      requested_amount: number(form.requested_amount),
      submitted_at: optional(form.submitted_at),
      decision_due_at: optional(form.decision_due_at),
      required_documents: required,
      ready_documents: ready,
      completion_rate: required.length ? Math.round((completedRequired / required.length) * 100) : 0,
      frozen_snapshot_hash: optional(form.frozen_snapshot_hash),
    };
  }
  if (kind === 'document') {
    return {
      farm_id,
      application_id: optional(form.application_id),
      agreement_id: optional(form.agreement_id),
      title: clean(form.title),
      category: clean(form.category) || 'piece_dossier',
      version_label: clean(form.version_label) || 'v1',
      visibility: lower(form.visibility) || 'internal',
      status: lower(form.status) || 'draft',
      file_url: optional(form.file_url),
      erp_document_id: optional(form.erp_document_id),
      source: clean(form.source) || 'financements',
      published_at: lower(form.status) === 'published'
        ? form.published_at || new Date().toISOString()
        : null,
    };
  }
  if (kind === 'agreement') {
    return {
      farm_id,
      application_id: optional(form.application_id),
      title: clean(form.title),
      funder: clean(form.funder),
      status: lower(form.status) || 'draft',
      amount_granted: number(form.amount_granted),
      amount_received: number(form.amount_received),
      amount_spent: number(form.amount_spent),
      signed_at: optional(form.signed_at),
      reporting_due_at: optional(form.reporting_due_at),
      restrictions: fundingListValue(form.restrictions),
    };
  }
  if (kind === 'allocation') {
    return {
      farm_id,
      agreement_id: clean(form.agreement_id),
      finance_transaction_id: clean(form.finance_transaction_id),
      document_id: clean(form.document_id),
      amount: number(form.amount),
      category: clean(form.category),
      status: lower(form.status) || 'allocated',
      allocated_at: form.allocated_at ? new Date(`${form.allocated_at}T12:00:00`).toISOString() : new Date().toISOString(),
    };
  }
  if (kind === 'report') {
    const frozen = createFundingReportVersion({
      id: form.id || undefined,
      title: form.title,
      period: form.period_label,
      status: form.status,
      visibility: form.visibility,
      version: form.version_number,
      immutable: true,
      sections: fundingListValue(form.sections),
      public_summary: form.public_summary,
      created_at: form.created_at,
      published_at: form.published_at,
    }, context.sourceSnapshot || {
      hash: form.source_snapshot_hash,
      generated_at: form.source_snapshot_generated_at,
    }, { version: number(form.version_number) || 1 });
    return {
      farm_id,
      title: frozen.title,
      period_label: frozen.period,
      status: frozen.status,
      visibility: frozen.visibility,
      version_number: frozen.version,
      immutable: true,
      source_snapshot_hash: frozen.source_snapshot_hash,
      source_snapshot_generated_at: frozen.source_snapshot_generated_at,
      public_summary: frozen.public_summary,
      sections: frozen.sections,
      file_url: optional(form.file_url),
      published_at: frozen.published_at,
    };
  }
  if (kind === 'account') {
    return {
      farm_id,
      email: clean(form.email).toLowerCase(),
      organization: optional(form.organization),
      display_name: optional(form.display_name),
      status: lower(form.status) || 'invited',
      permissions: fundingListValue(form.permissions),
      expires_at: form.expires_at ? new Date(`${form.expires_at}T23:59:59`).toISOString() : null,
      user_id: optional(form.user_id),
    };
  }
  if (kind === 'journal') {
    return {
      farm_id,
      title: clean(form.title),
      summary: clean(form.summary),
      event_date: form.event_date || today(),
      status: lower(form.status) || 'draft',
      visibility: lower(form.visibility) || 'shared',
    };
  }
  return { farm_id };
}

export function prepareFundingOperation(kind, form = {}, context = {}) {
  const validation = validateFundingOperation(kind, form, context);
  if (!validation.ok) return { ...validation, payload: null };
  return { ok: true, errors: [], payload: buildFundingOperationPayload(kind, form, context) };
}
