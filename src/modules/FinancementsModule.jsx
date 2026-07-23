import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BookOpen,
  CalendarDays,
  Check,
  ClipboardCheck,
  ExternalLink,
  FileText,
  FolderOpen,
  Handshake,
  LockKeyhole,
  Pencil,
  Plus,
  ReceiptText,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { resolveFinancementsTab } from '../utils/commercialNavigation.js';
import { normalizeErpRole } from '../config/erpRoles.js';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import FundingFormModal from './financements/FundingFormModal.jsx';
import { fundingValueLabel } from './financements/fundingLabels.js';
import {
  fundingFormDefaults,
  prepareFundingOperation,
} from '../services/financements/fundingOperations.js';
import {
  FUNDING_ALERT_TYPES,
  buildFundingCockpit,
  buildFundingPublicSpace,
  validateFundingReportPublication,
} from '../services/financements/financementsService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (value) => `${Math.round(Number(value || 0)).toLocaleString('fr-FR')} FCFA`;
const number = (value) => Number(value || 0).toLocaleString('fr-FR');
const dateLabel = (value) => (value ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Non planifié');
const nextVersionLabel = (value) => {
  const current = String(value || 'v1').trim();
  const match = current.match(/^v?(\d+)$/i);
  return match ? `v${Number(match[1]) + 1}` : `${current}.1`;
};
const FUNDING_ALERT_LABELS = {
  overdue_deadline: 'Échéance dépassée',
  deadline_without_owner: 'Échéance sans responsable',
  missing_required_document: 'Pièce obligatoire manquante',
  agreement_without_allocation: 'Fonds reçus sans affectation',
  spend_above_80: 'Fonds utilisés à plus de 80 %',
  report_snapshot_outdated: 'Rapport à mettre à jour',
  shared_document_not_published: 'Partage incomplet',
  funder_access_anomaly: 'Accès financeur à vérifier',
  event_without_next_action: 'Prochaine action manquante',
  allocation_above_received: 'Affectation supérieure aux fonds reçus',
};
const FUNDING_SOURCE_LABELS = {
  commercial: ['Ventes et encaissements', 'Ventes enregistrées'],
  finance: ['Comptes et trésorerie', 'Opérations financières enregistrées'],
  stock: ['Valeur des stocks', 'Stocks enregistrés'],
  business_plan: ['Plan d’affaires', 'Plan d’affaires Horizon Farm'],
  profile: ['Présentation du projet', 'Informations du projet'],
};
const fundingAlertLabel = (type) => FUNDING_ALERT_LABELS[type] || String(type || 'Alerte').replaceAll('_', ' ');
const fundingSourceLabel = (key, source) => FUNDING_SOURCE_LABELS[key] || [String(key || ''), String(source || '')];

function realFundingSeed(props = {}) {
  const dataMap = props.dataMap || {};
  const crud = props.crud || {};
  const selectedFarmId = props.farmScope?.mode === 'all' ? null : props.activeFarm?.id || props.farmScope?.farmId || null;
  const scoped = (items) => arr(items).filter((row) => {
    if (!selectedFarmId) return true;
    const rowFarmId = row?.farm_id || row?.farmId || null;
    return Boolean(rowFarmId) && String(rowFarmId) === String(selectedFarmId);
  });
  const sourceCrud = Object.fromEntries(Object.entries(crud).map(([key, resource]) => [
    key,
    resource && typeof resource === 'object'
      ? { ...resource, rows: scoped(resource.rows) }
      : resource,
  ]));
  const sourceDataMap = Object.fromEntries(Object.entries(dataMap).map(([key, value]) => [
    key,
    Array.isArray(value) ? scoped(value) : value,
  ]));
  const documents = scoped(props.documents);
  const businessEvents = scoped(props.businessEvents);
  const auditLogs = scoped(props.auditLogs);
  const reports = scoped(props.rapports);
  const fundingRows = (key) => scoped(arr(dataMap[key]).length ? dataMap[key] : crud[key]?.rows);

  const fundingDocs = documents.filter((doc) => {
    const source = lower(doc.module_source || doc.source_module || doc.module || '');
    return source === 'financements' || Boolean(doc.funding_application_id || doc.funding_agreement_id);
  });

  const opportunities = fundingRows('funding_opportunities');
  const suggestedOpportunities = scoped(crud.bp_funding_sources?.rows).map((source) => ({
      id: `bp-source-${source.id}`,
      title: source.name || source.label || source.source_name || 'Source BP',
      institution: source.institution || source.source_name,
      type: source.type || 'subvention',
      status: 'identifiee',
      amount_requested: source.amount || source.montant,
      owner: source.owner,
      next_action: source.next_action,
      source: 'business_plan',
    }));

  const contacts = [
    ...fundingRows('funding_contacts'),
  ];

  const applications = fundingRows('funding_applications');
  const agreements = fundingRows('funding_agreements');
  const expenseAllocations = fundingRows('funding_expense_allocations');

  const journalEntries = businessEvents
    .filter((event) => {
      const eventType = lower(event.event_type || event.type_evenement || event.type || '');
      const source = lower(event.module_source || event.source_module || event.module || '');
      return source === 'financements' || eventType.startsWith('funding_') || eventType === 'monthly_financier_report';
    })
    .map((event) => ({
      id: event.id,
      title: event.title || event.name || 'Avancement financement',
      date: event.date || event.created_at,
      status: event.published === true || lower(event.status || event.statut) === 'published' ? 'published' : 'draft',
      published: event.published === true || lower(event.status || event.statut) === 'published',
      visibility: event.visibility || 'shared',
      summary: event.description || event.notes || '',
    }));

  return {
    opportunities,
    suggestedOpportunities,
    contacts,
    applications,
    documents: [
      ...fundingRows('funding_document_library'),
      ...fundingDocs.map((doc) => ({
        ...doc,
        visibility: doc.visibility || doc.access_level || (doc.published_at ? 'shared' : 'internal'),
        status: doc.status || (doc.published_at ? 'published' : 'draft'),
      })),
    ],
    agreements,
    expenseAllocations,
    reports: [
      ...fundingRows('funding_reports'),
      ...reports.filter((report) => {
        const source = lower(report.module || report.module_source || report.source_module || report.category || '');
        return source === 'financements' || source === 'financement';
      }),
    ],
    journalEntries: [
      ...fundingRows('funding_project_journal'),
      ...journalEntries,
    ],
    accessLogs: [
      ...fundingRows('funder_access_logs'),
      ...auditLogs.filter((log) => lower(`${log.module || ''} ${log.action || ''}`).includes('financement')),
    ],
    accounts: fundingRows('funder_accounts'),
    sourceCrud,
    sourceDataMap,
    sourceDocuments: documents,
    sourceSalesOrders: scoped(props.salesOrdersAll || props.salesOrders),
    sourcePayments: scoped(props.paymentsAll || props.payments),
    sourceClients: scoped(props.clients),
    sourceDeliveries: scoped(props.deliveriesAll || props.deliveries || crud.deliveries?.rows),
    sourceInvoices: scoped(props.invoicesAll || props.invoices || crud.invoices?.rows),
    sourceStocks: scoped(props.stocks),
    sourceTransactions: scoped(props.transactionsAll || props.transactions),
    sourceBusinessPlans: scoped(props.businessPlans),
    sourceInvestissements: scoped(props.investissements),
    sourceBusinessEvents: businessEvents,
  };
}

function StatCard({ icon: Icon, label, value, detail, tone = 'default' }) {
  const toneClass = tone === 'danger'
    ? 'border-urgent bg-urgent-bg text-urgent'
    : tone === 'good'
      ? 'border-positive bg-positive-bg text-positive'
      : 'border-line bg-white text-earth';
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
          {detail ? <p className="mt-1 text-xs opacity-75">{detail}</p> : null}
        </div>
        <Icon size={20} className="shrink-0 opacity-75" />
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, right, children }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-earth inline-flex items-center gap-2">
          <Icon size={18} />
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-card p-6 text-sm font-semibold text-slate">
      {children}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const cls = tone === 'danger'
    ? 'bg-urgent-bg text-urgent border-urgent'
    : tone === 'good'
      ? 'bg-positive-bg text-positive border-positive'
      : tone === 'amber'
        ? 'bg-vigilance-bg text-horizon-dark border-vigilance'
        : 'bg-vigilance-bg text-slate border-line';
  return <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${cls}`}>{children}</span>;
}

function ActionButton({ icon: Icon, children, onClick, primary = false, disabled = false, title = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || undefined}
      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
        primary ? 'border-earth bg-earth text-white' : 'border-line bg-white text-earth hover:bg-card'
      }`}
    >
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

function inlineDate(value) {
  return value ? dateLabel(value) : 'À planifier';
}

function DashboardTab({ cockpit }) {
  const { kpis, alerts, nextDeadline, sourceSnapshot } = cockpit;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard icon={Banknote} label="Montant demandé" value={money(kpis.requested_amount)} detail={`${number(kpis.active_opportunities)} opportunité(s) active(s)`} />
        <StatCard icon={Handshake} label="Montant accordé" value={money(kpis.granted_amount)} detail={`${money(kpis.received_amount)} reçu(s)`} tone={kpis.granted_amount ? 'good' : 'default'} />
        <StatCard icon={ReceiptText} label="Solde fonds" value={money(kpis.remaining_amount)} detail={`${money(kpis.spent_amount)} affecté(s)`} />
        <StatCard icon={AlertTriangle} label="Alertes financement" value={number(alerts.length)} detail={`${FUNDING_ALERT_TYPES.length} familles suivies`} tone={alerts.length ? 'danger' : 'good'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-4">
        <Section title="Alertes" icon={AlertTriangle}>
          {alerts.length ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-lg border border-vigilance bg-vigilance-bg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-horizon-dark">{alert.title}</p>
                    <Badge tone={alert.severity === 'critique' || alert.severity === 'haute' ? 'danger' : 'amber'}>{fundingAlertLabel(alert.type)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Aucune alerte financement active.</EmptyState>
          )}
        </Section>

        <Section title="Sources officielles" icon={ShieldCheck}>
          <div className="rounded-lg border border-line bg-white p-4 space-y-3">
            {Object.entries(sourceSnapshot.sources || {}).map(([key, source]) => (
              <div key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-earth">{fundingSourceLabel(key, source)[0]}</span>
                <span className="text-right text-slate">{fundingSourceLabel(key, source)[1]}</span>
              </div>
            ))}
            <div className="border-t border-line pt-3 text-sm text-slate">
              Données mises à jour : <span className="font-semibold text-earth">{dateLabel(sourceSnapshot.generated_at)}</span>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Prochaine échéance" icon={CalendarDays}>
        {nextDeadline ? (
          <div className="rounded-lg border border-line bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-earth">{nextDeadline.title}</p>
              <p className="text-sm text-slate">{nextDeadline.institution || 'Organisme à préciser'}</p>
            </div>
            <Badge tone="amber">{dateLabel(nextDeadline.deadline)}</Badge>
          </div>
        ) : (
          <EmptyState>Aucune échéance enregistrée.</EmptyState>
        )}
      </Section>
    </div>
  );
}

function OpportunitiesTab({ cockpit, onAdd, onEdit, onCreateApplication, onAcceptSuggestion, canWrite }) {
  return (
    <div className="space-y-6">
      <Section title="Opportunités suivies" icon={Handshake} right={<ActionButton icon={Plus} onClick={onAdd} primary disabled={!canWrite}>Ajouter</ActionButton>}>
        {cockpit.opportunities.length ? (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-vigilance-bg text-left text-slate">
                <tr>
                  <th className="p-3">Opportunité</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Montant</th>
                  <th className="p-3">Échéance</th>
                  <th className="p-3">Responsable</th>
                  <th className="p-3">Prochaine action</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cockpit.opportunities.map((item) => (
                  <tr key={item.id} className="border-t border-line align-top">
                    <td className="p-3 font-semibold text-earth">{item.title}<p className="text-xs font-semibold text-slate">{item.institution || 'Organisme à préciser'}</p></td>
                    <td className="p-3"><Badge>{fundingValueLabel(item.type)}</Badge></td>
                    <td className="p-3">{fundingValueLabel(item.status)}</td>
                    <td className="p-3 font-semibold">{item.amount_requested ? money(item.amount_requested) : 'À chiffrer'}</td>
                    <td className="p-3">{inlineDate(item.deadline)}</td>
                    <td className="p-3">{item.owner || 'À attribuer'}</td>
                    <td className="p-3">{item.next_action || 'À définir'}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <ActionButton icon={ClipboardCheck} onClick={() => onCreateApplication(item)} disabled={!canWrite} title="Créer un dossier">Dossier</ActionButton>
                        <ActionButton icon={Pencil} onClick={() => onEdit(item)} disabled={!canWrite} title="Modifier l’opportunité">Modifier</ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>Aucune opportunité validée. Ajoute la première ou qualifie une suggestion ci-dessous.</EmptyState>
        )}
      </Section>

      <Section title="Suggestions à qualifier" icon={ClipboardCheck}>
        {cockpit.suggestedOpportunities?.length ? (
          <div className="divide-y divide-line rounded-lg border border-line bg-white">
            {cockpit.suggestedOpportunities.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-earth">{item.title}</p>
                  <p className="text-sm text-slate">{item.institution || fundingValueLabel(item.type)}{item.amount_requested ? ` · ${money(item.amount_requested)}` : ''}</p>
                </div>
                <ActionButton icon={Check} onClick={() => onAcceptSuggestion(item)} disabled={!canWrite}>Ajouter au suivi</ActionButton>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Aucune suggestion issue du business plan ou du journal.</EmptyState>
        )}
      </Section>
    </div>
  );
}

function ContactsTab({ cockpit, onAdd, onEdit, canWrite }) {
  return (
    <Section title="Contacts financeurs" icon={Users} right={<ActionButton icon={Plus} onClick={onAdd} primary disabled={!canWrite}>Ajouter</ActionButton>}>
      {cockpit.contacts.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {cockpit.contacts.map((contact) => (
            <div key={contact.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-earth">{contact.name}</p>
                  <p className="text-sm text-slate">{contact.organization || 'Organisation à préciser'} · {contact.role || 'Rôle à préciser'}</p>
                </div>
                <Badge>{fundingValueLabel(contact.status)}</Badge>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-slate sm:grid-cols-2">
                <span>{contact.email ? <a href={`mailto:${contact.email}`} className="underline">{contact.email}</a> : 'Courriel non renseigné'}</span>
                <span>{contact.phone ? <a href={`tel:${contact.phone}`} className="underline">{contact.phone}</a> : 'Téléphone non renseigné'}</span>
                <span>{fundingValueLabel(contact.organization_type)}</span>
                <span>Relance : {inlineDate(contact.next_follow_up_at)}</span>
              </div>
              <div className="mt-4 flex justify-end">
                <ActionButton icon={Pencil} onClick={() => onEdit(contact)} disabled={!canWrite}>Modifier</ActionButton>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState>Aucun contact financeur enregistré.</EmptyState>
      )}
    </Section>
  );
}

function AgreementsTab({
  cockpit,
  transactions,
  documents,
  onAddAgreement,
  onEditAgreement,
  onAddAllocation,
  onEditAllocation,
  canWrite,
}) {
  const agreementById = new Map(cockpit.agreements.map((row) => [String(row.id), row]));
  const transactionById = new Map(arr(transactions).map((row) => [String(row.id), row]));
  const documentById = new Map(arr(documents).map((row) => [String(row.id), row]));
  return (
    <div className="space-y-6">
      <Section title="Conventions" icon={Banknote} right={<ActionButton icon={Plus} onClick={onAddAgreement} primary disabled={!canWrite}>Ajouter</ActionButton>}>
        {cockpit.agreements.length ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {cockpit.agreements.map((agreement) => (
              <div key={agreement.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-earth">{agreement.title}</p>
                    <p className="text-sm text-slate">{agreement.funder || 'Financeur à préciser'}</p>
                  </div>
                  <Badge tone={agreement.amount_remaining < 0 ? 'danger' : agreement.spend_rate >= 80 ? 'amber' : 'good'}>{agreement.spend_rate}% utilisé</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-slate">Accordé</p><p className="font-semibold">{money(agreement.amount_granted)}</p></div>
                  <div><p className="text-slate">Reçu</p><p className="font-semibold">{money(agreement.amount_received)}</p></div>
                  <div><p className="text-slate">Restant</p><p className="font-semibold">{money(agreement.amount_remaining)}</p></div>
                </div>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <ActionButton icon={ReceiptText} onClick={() => onAddAllocation(agreement)} disabled={!canWrite || agreement.amount_received <= 0}>Affecter une dépense</ActionButton>
                  <ActionButton icon={Pencil} onClick={() => onEditAgreement(agreement)} disabled={!canWrite}>Modifier</ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Aucune convention enregistrée.</EmptyState>
        )}
      </Section>

      <Section title="Affectations des dépenses" icon={ReceiptText} right={<ActionButton icon={Plus} onClick={() => onAddAllocation(null)} disabled={!canWrite || !cockpit.agreements.length}>Ajouter</ActionButton>}>
        {cockpit.expenseAllocations.length ? (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-vigilance-bg text-left text-slate">
                <tr>
                  <th className="p-3">Convention</th>
                  <th className="p-3">Dépense</th>
                  <th className="p-3">Justificatif</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Montant</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {cockpit.expenseAllocations.map((row) => {
                  const agreement = agreementById.get(String(row.agreement_id));
                  const transaction = transactionById.get(String(row.transaction_id));
                  const document = documentById.get(String(row.document_id));
                  return (
                    <tr key={row.id} className="border-t border-line">
                      <td className="p-3 font-semibold text-earth">{agreement?.title || 'Convention introuvable'}</td>
                      <td className="p-3">{transaction?.libelle || transaction?.label || 'Dépense introuvable'}</td>
                      <td className="p-3">{document?.title || document?.nom || document?.name || 'Justificatif introuvable'}</td>
                      <td className="p-3">{row.category || 'À préciser'}</td>
                      <td className="p-3 font-semibold">{money(row.amount)}</td>
                      <td className="p-3">{fundingValueLabel(row.status)}</td>
                      <td className="p-3 text-right"><ActionButton icon={Pencil} onClick={() => onEditAllocation(row)} disabled={!canWrite}>Modifier</ActionButton></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>Aucune affectation de dépense liée à un fonds.</EmptyState>
        )}
      </Section>
    </div>
  );
}

function ApplicationsOnlyTab({ cockpit, onAdd, onEdit, onAddDocument, onCreateAgreement, canWrite }) {
  return (
    <Section title="Dossiers de financement" icon={ClipboardCheck} right={<ActionButton icon={Plus} onClick={onAdd} primary disabled={!canWrite}>Ajouter</ActionButton>}>
      {cockpit.applications.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {cockpit.applications.map((application) => {
            const ready = new Set(arr(application.ready_documents).map(lower));
            const missing = arr(application.required_documents).filter((item) => !ready.has(lower(item)));
            return (
              <div key={application.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-earth">{application.title}</p>
                    <p className="text-sm text-slate">{application.target_institution || 'Organisme à préciser'} · {fundingValueLabel(application.status)}</p>
                  </div>
                  <Badge tone={application.completion_rate >= 100 ? 'good' : 'amber'}>{application.completion_rate}%</Badge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-vigilance-bg">
                  <div className="h-full bg-positive" style={{ width: `${application.completion_rate}%` }} />
                </div>
                <p className="mt-3 text-sm text-slate">
                  {missing.length ? `${missing.length} pièce(s) à compléter : ${missing.join(', ')}` : 'Toutes les pièces déclarées sont prêtes.'}
                </p>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <ActionButton icon={FolderOpen} onClick={() => onAddDocument(application)} disabled={!canWrite}>Ajouter une pièce</ActionButton>
                  <ActionButton icon={Banknote} onClick={() => onCreateAgreement(application)} disabled={!canWrite || !['approved', 'ready'].includes(application.status)}>Créer la convention</ActionButton>
                  <ActionButton icon={Pencil} onClick={() => onEdit(application)} disabled={!canWrite}>Modifier</ActionButton>
                </div>
              </div>
            );
          })}
        </div>
      ) : <EmptyState>Aucun dossier enregistré. Crée un dossier depuis une opportunité validée.</EmptyState>}
    </Section>
  );
}

function FundingDocumentsTab({ cockpit, onAdd, onEdit, onOpen, canWrite }) {
  return (
    <Section title="Pièces du dossier" icon={FolderOpen} right={<ActionButton icon={Plus} onClick={onAdd} primary disabled={!canWrite}>Ajouter</ActionButton>}>
      {cockpit.documents.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {cockpit.documents.map((doc) => (
            <div key={doc.id} className="rounded-lg border border-line bg-white p-4">
              <p className="font-semibold text-earth">{doc.title}</p>
              <p className="mt-2 text-sm text-slate">{doc.category}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{fundingValueLabel(doc.visibility)}</Badge>
                <Badge tone={doc.status === 'published' ? 'good' : 'amber'}>{fundingValueLabel(doc.status)}</Badge>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                {doc.file_url ? <ActionButton icon={ExternalLink} onClick={() => onOpen(doc)}>Ouvrir</ActionButton> : null}
                <ActionButton
                  icon={doc.status === 'published' || doc.status === 'archived' ? Plus : Pencil}
                  onClick={() => onEdit(doc)}
                  disabled={!canWrite}
                >
                  {doc.status === 'published' || doc.status === 'archived' ? 'Nouvelle version' : 'Modifier'}
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      ) : <EmptyState>Aucune pièce liée à un dossier ou à une convention.</EmptyState>}
    </Section>
  );
}

function FundingPublicationsTab({
  cockpit,
  journalEntries,
  onCreateReport,
  onEditReport,
  onPrepareReport,
  onPublishReport,
  onAddJournal,
  onEditJournal,
  publishMessage,
  canWrite,
}) {
  return (
    <div className="space-y-6">
      <Section title="Rapports financeurs" icon={FileText} right={<ActionButton icon={Plus} onClick={onCreateReport} primary disabled={!canWrite}>Créer une version</ActionButton>}>
        {publishMessage ? <div className="mb-3 rounded-lg border border-vigilance bg-vigilance-bg p-3 text-sm font-semibold text-horizon-dark">{publishMessage}</div> : null}
        {cockpit.reports.length ? (
          <div className="space-y-2">
            {cockpit.reports.map((report) => (
              <div key={`${report.id}-${report.version}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-white p-4">
                <div>
                  <p className="font-semibold text-earth">{report.title}</p>
                  <p className="text-xs text-slate">Version {report.version}{report.source_snapshot_generated_at ? ` · Données du ${dateLabel(report.source_snapshot_generated_at)}` : ''} · {fundingValueLabel(report.visibility)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={report.status === 'published' ? 'good' : 'amber'}>{fundingValueLabel(report.status)}</Badge>
                  {report.status === 'draft' ? <ActionButton icon={Pencil} onClick={() => onEditReport(report)} disabled={!canWrite}>Modifier</ActionButton> : null}
                  {report.status === 'draft' ? <ActionButton icon={Check} onClick={() => onPrepareReport(report)} disabled={!canWrite}>Préparer le partage</ActionButton> : null}
                  {report.status === 'ready' ? <ActionButton icon={Check} onClick={() => onPublishReport(report)} disabled={!canWrite} primary>Publier</ActionButton> : null}
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyState>Aucun rapport enregistré.</EmptyState>}
      </Section>

      <Section title="Journal partagé du projet" icon={BookOpen} right={<ActionButton icon={Plus} onClick={onAddJournal} disabled={!canWrite}>Ajouter</ActionButton>}>
        {arr(journalEntries).length ? (
          <div className="divide-y divide-line rounded-lg border border-line bg-white">
            {arr(journalEntries).map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-earth">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate">{entry.summary || 'Résumé à compléter'}</p>
                  <p className="mt-1 text-xs text-slate">{inlineDate(entry.event_date || entry.date || entry.created_at)} · {fundingValueLabel(entry.status)}</p>
                </div>
                <ActionButton icon={Pencil} onClick={() => onEditJournal(entry)} disabled={!canWrite}>Modifier</ActionButton>
              </div>
            ))}
          </div>
        ) : <EmptyState>Aucune mise à jour du projet enregistrée.</EmptyState>}
      </Section>
    </div>
  );
}

function FundingAccessTab({ cockpit, accounts, onAddAccount, onEditAccount, onRevokeAccount, canWrite }) {
  return (
    <div className="space-y-6">
      <Section title="Comptes financeurs" icon={Users} right={<ActionButton icon={Plus} onClick={onAddAccount} primary disabled={!canWrite}>Inviter</ActionButton>}>
        {arr(accounts).length ? (
          <div className="overflow-x-auto rounded-lg border border-line bg-white">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-vigilance-bg text-left text-slate">
                <tr><th className="p-3">Financeur</th><th className="p-3">Organisation</th><th className="p-3">Statut</th><th className="p-3">Fin d’accès</th><th className="p-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {arr(accounts).map((account) => (
                  <tr key={account.id} className="border-t border-line">
                    <td className="p-3"><p className="font-semibold text-earth">{account.display_name || account.email}</p><p className="text-xs text-slate">{account.email}</p></td>
                    <td className="p-3">{account.organization || 'À préciser'}</td>
                    <td className="p-3"><Badge tone={account.status === 'active' ? 'good' : account.status === 'revoked' ? 'danger' : 'amber'}>{fundingValueLabel(account.status)}</Badge></td>
                    <td className="p-3">{account.expires_at ? dateLabel(account.expires_at) : 'Sans date de fin'}</td>
                    <td className="p-3"><div className="flex justify-end gap-2"><ActionButton icon={Pencil} onClick={() => onEditAccount(account)} disabled={!canWrite}>Modifier</ActionButton>{account.status !== 'revoked' ? <ActionButton onClick={() => onRevokeAccount(account)} disabled={!canWrite}>Révoquer</ActionButton> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <EmptyState>Aucun accès financeur créé.</EmptyState>}
      </Section>

      <Section title="Historique des consultations" icon={ShieldCheck}>
        {cockpit.accessLogs?.length ? (
          <div className="space-y-2">
            {cockpit.accessLogs.map((log, index) => (
              <div key={log.id || index} className="grid gap-2 rounded-lg border border-line bg-white p-3 text-sm sm:grid-cols-[1fr_auto]">
                <span className="font-semibold text-earth">{log.funder || log.user_id || 'Financeur'}</span>
                <span className="text-slate">{fundingValueLabel(log.action || 'read')} · {dateLabel(log.created_at || log.at)}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState>Aucune consultation externe enregistrée.</EmptyState>}
      </Section>
    </div>
  );
}

function FunderSpace({ tab, publicSpace, accessLogs, contact, onOpenResource }) {
  if (publicSpace.accessDenied) {
    return (
      <div className="rounded-lg border border-vigilance bg-vigilance-bg p-5">
        <p className="font-semibold text-horizon-dark">Accès financeur non actif</p>
        <p className="mt-1 text-sm text-slate">Ton invitation doit être active et non expirée pour consulter les informations partagées.</p>
      </div>
    );
  }
  const sectionByTab = {
    'funder-overview': 'overview',
    'funder-reports': 'reports',
    'funder-journal': 'project_journal',
    'funder-documents': 'shared_documents',
  };
  const requiredSection = sectionByTab[tab];
  if (requiredSection && !publicSpace.sectionAccess?.[requiredSection]) {
    return (
      <div className="rounded-lg border border-line bg-white p-5">
        <p className="font-semibold text-earth">Rubrique non partagée</p>
        <p className="mt-1 text-sm text-slate">Le gestionnaire du dossier n’a pas ouvert cette rubrique à ton compte.</p>
      </div>
    );
  }
  if (tab === 'funder-reports') {
    return (
      <Section title="Rapports" icon={FileText}>
        {publicSpace.reports.length ? (
          <div className="space-y-2">
            {publicSpace.reports.map((report) => (
              <div key={`${report.id}-${report.version}`} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-earth">{report.title}</p>
                    <p className="text-xs text-slate">v{report.version} · {dateLabel(report.published_at || report.created_at)}</p>
                  </div>
                  <Badge tone="good">publié</Badge>
                </div>
                {report.public_summary ? <p className="mt-3 text-sm text-slate">{report.public_summary}</p> : null}
                {report.file_url ? <div className="mt-3 flex justify-end"><ActionButton icon={ExternalLink} onClick={() => onOpenResource(report, 'report')}>Ouvrir le rapport</ActionButton></div> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Aucun rapport publié.</EmptyState>
        )}
      </Section>
    );
  }

  if (tab === 'funder-journal') {
    return (
      <Section title="Journal du projet" icon={BookOpen}>
        {publicSpace.project_journal.length ? (
          <div className="space-y-2">
            {publicSpace.project_journal.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-line bg-white p-4">
                <p className="font-semibold text-earth">{entry.title}</p>
                <p className="mt-1 text-xs font-semibold text-slate">{dateLabel(entry.date || entry.created_at)}</p>
                {entry.summary ? <p className="mt-2 text-sm text-slate">{entry.summary}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Aucune entrée publiée.</EmptyState>
        )}
      </Section>
    );
  }

  if (tab === 'funder-documents') {
    return (
      <Section title="Documents partagés" icon={LockKeyhole}>
        {publicSpace.shared_documents.length ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {publicSpace.shared_documents.map((doc) => (
              <div key={doc.id} className="rounded-lg border border-line bg-white p-4">
                <p className="font-semibold text-earth">{doc.title}</p>
                <p className="mt-2 text-sm text-slate">{doc.category}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="good">partagé</Badge>
                  <Badge>{doc.version}</Badge>
                </div>
                {doc.file_url ? <div className="mt-3 flex justify-end"><ActionButton icon={ExternalLink} onClick={() => onOpenResource(doc, 'document')}>Ouvrir</ActionButton></div> : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Aucun document partagé.</EmptyState>
        )}
      </Section>
    );
  }

  if (tab === 'funder-contact') {
    return <Section title="Contact" icon={Users}><div className="rounded-lg border border-line bg-white p-4"><p className="font-semibold text-earth">{contact?.name || 'Contact Horizon Farm'}</p><p className="mt-1 text-sm text-slate">{contact?.email || 'Courriel à renseigner'} · {contact?.phone || 'Téléphone à renseigner'}</p></div></Section>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard icon={Banknote} label="CA consolidé" value={money(publicSpace.overview.public_kpis?.ca)} detail="Source Commercial" />
        <StatCard icon={WalletCards} label="Encaissé" value={money(publicSpace.overview.public_kpis?.collected)} detail="Paiements liés" />
        <StatCard icon={FolderOpen} label="Documents" value={number(publicSpace.overview.public_kpis?.documents_count)} detail="Bibliothèque publiée" />
        <StatCard icon={ShieldCheck} label="Accès" value="Lecture seule" detail={`${number(accessLogs.length)} log(s)`} tone="good" />
      </div>
      <Section title="Traçabilité des accès" icon={ShieldCheck}>
        {accessLogs.length ? (
          <div className="space-y-2">
            {accessLogs.slice(0, 6).map((log, index) => (
              <div key={log.id || index} className="rounded-lg border border-line bg-white p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-earth">{log.funder || log.user_id || 'Financeur'}</span>
                <span className="text-slate">{log.action || 'read'} · {dateLabel(log.created_at || log.at)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Aucun accès financeur journalisé.</EmptyState>
        )}
      </Section>
    </div>
  );
}

export default function FinancementsModule(props) {
  const controlled = Object.prototype.hasOwnProperty.call(props, 'initialTab');
  const [internalTab, setInternalTab] = useState(() => resolveFinancementsTab(props.initialTab));
  const [publishMessage, setPublishMessage] = useState('');
  const [formState, setFormState] = useState({ open: false, kind: null, initial: {} });
  const [formBusy, setFormBusy] = useState(false);
  const [formErrors, setFormErrors] = useState([]);
  const accessLogRef = useRef('');
  const role = normalizeErpRole(props.role, 'terrain');
  const externalRole = role === 'financeur_externe';
  const requestedTab = controlled ? resolveFinancementsTab(props.initialTab) : internalTab;
  const activeTab = externalRole && !requestedTab.startsWith('funder-') ? 'funder-overview' : requestedTab;
  const selectedFarmId = props.farmScope?.mode === 'all' ? '' : props.activeFarm?.id || props.farmScope?.farmId || '';
  const canWrite = ['promotrice_direction', 'finance', 'admin_support'].includes(role) && Boolean(selectedFarmId);

  const setTab = (value) => {
    const resolved = resolveFinancementsTab(value);
    if (externalRole && !resolved.startsWith('funder-')) return;
    if (!controlled) setInternalTab(resolved);
    props.onTabChange?.(resolved);
  };

  const seed = useMemo(() => realFundingSeed(props), [props]);
  const cockpit = useMemo(() => {
    const input = seed;
    return buildFundingCockpit({
      ...input,
      crud: input.sourceCrud,
      dataMap: input.sourceDataMap,
      liveMeteo: props.meteo,
      salesOrders: input.sourceSalesOrders,
      payments: input.sourcePayments,
      clients: input.sourceClients,
      deliveries: input.sourceDeliveries,
      invoices: input.sourceInvoices,
      documents: input.sourceDocuments,
      stocks: input.sourceStocks,
      transactions: input.sourceTransactions,
      businessPlans: input.sourceBusinessPlans,
      investissements: input.sourceInvestissements,
      businessEvents: input.sourceBusinessEvents,
      reports: input.reports,
    });
  }, [seed, props]);

  const currentFunderAccount = useMemo(() => {
    if (!externalRole) return { status: 'active', permissions: ['*'] };
    return arr(seed.accounts)
      .filter((account) => (
        (account.user_id && String(account.user_id) === String(props.user?.id || ''))
        || (account.email && lower(account.email) === lower(props.user?.email))
      ))
      .sort((left, right) => {
        if (left.status === 'active' && right.status !== 'active') return -1;
        if (right.status === 'active' && left.status !== 'active') return 1;
        return String(right.created_at || '').localeCompare(String(left.created_at || ''));
      })[0] || { status: 'revoked', permissions: [] };
  }, [externalRole, props.user?.email, props.user?.id, seed.accounts]);

  const publicSpace = useMemo(() => buildFundingPublicSpace({
    cockpit,
    reports: cockpit.reports,
    documents: cockpit.documents,
    journalEntries: seed.journalEntries,
    account: currentFunderAccount,
    demoMode: false,
  }), [cockpit, currentFunderAccount, seed.journalEntries]);

  useEffect(() => {
    if (!externalRole || !currentFunderAccount?.id || publicSpace.accessDenied) return;
    const sectionByTab = {
      'funder-overview': 'overview',
      'funder-reports': 'reports',
      'funder-journal': 'project_journal',
      'funder-documents': 'shared_documents',
    };
    const section = sectionByTab[activeTab];
    if (section && !publicSpace.sectionAccess?.[section]) return;
    const createLog = props.crud?.funder_access_logs?.create;
    if (typeof createLog !== 'function') return;
    const logKey = `${currentFunderAccount.id}:${activeTab}`;
    if (accessLogRef.current === logKey) return;
    accessLogRef.current = logKey;
    void createLog({
      farm_id: currentFunderAccount.farm_id || selectedFarmId,
      funder_account_id: currentFunderAccount.id,
      user_id: props.user?.id || null,
      action: 'read',
      resource_type: activeTab,
      resource_id: null,
      status: 'allowed',
      reason: 'Consultation d’une rubrique de l’espace financeur',
    })
      .then(() => props.crud?.funder_access_logs?.refresh?.())
      .catch(() => {
        accessLogRef.current = '';
      });
  }, [
    activeTab,
    currentFunderAccount.farm_id,
    currentFunderAccount.id,
    externalRole,
    props.crud,
    props.user?.id,
    publicSpace.accessDenied,
    publicSpace.sectionAccess,
    selectedFarmId,
  ]);

  const nextReportVersion = cockpit.reports.reduce((max, report) => Math.max(max, Number(report.version || 0)), 0) + 1;
  const operationContext = useMemo(() => ({
    farmId: selectedFarmId,
    opportunities: cockpit.opportunities,
    applications: cockpit.applications,
    agreements: cockpit.agreements,
    allocations: cockpit.expenseAllocations,
    transactions: seed.sourceTransactions,
    documents: seed.sourceDocuments,
    erpDocuments: seed.sourceDocuments,
    sourceSnapshot: cockpit.sourceSnapshot,
    nextReportVersion,
  }), [
    cockpit.agreements,
    cockpit.applications,
    cockpit.expenseAllocations,
    cockpit.opportunities,
    cockpit.sourceSnapshot,
    nextReportVersion,
    seed.sourceDocuments,
    seed.sourceTransactions,
    selectedFarmId,
  ]);

  const openForm = (kind, initial = {}) => {
    if (!canWrite) {
      toast.error(selectedFarmId ? 'Ton rôle ne permet pas cette modification.' : 'Choisis une ferme avant d’enregistrer.');
      return;
    }
    setFormErrors([]);
    setFormState({ open: true, kind, initial });
  };

  const closeForm = () => {
    if (formBusy) return;
    setFormErrors([]);
    setFormState({ open: false, kind: null, initial: {} });
  };

  const crudKeyByKind = {
    opportunity: 'funding_opportunities',
    contact: 'funding_contacts',
    application: 'funding_applications',
    document: 'funding_document_library',
    agreement: 'funding_agreements',
    allocation: 'funding_expense_allocations',
    report: 'funding_reports',
    account: 'funder_accounts',
    journal: 'funding_project_journal',
  };

  const saveForm = async (form) => {
    const kind = formState.kind;
    const operation = prepareFundingOperation(kind, form, operationContext);
    if (!operation.ok) {
      setFormErrors(operation.errors);
      return;
    }
    const target = props.crud?.[crudKeyByKind[kind]];
    const persist = formState.initial?.id ? target?.update : target?.create;
    if (typeof persist !== 'function') {
      setFormErrors(['Enregistrement indisponible pour le moment. Recharge le module puis réessaie.']);
      return;
    }
    setFormBusy(true);
    setFormErrors([]);
    try {
      if (formState.initial?.id) await persist(formState.initial.id, operation.payload);
      else await persist(operation.payload);

      let followUpWarning = '';
      if (kind === 'application' && form.opportunity_id) {
        const opportunity = cockpit.opportunities.find((row) => String(row.id) === String(form.opportunity_id));
        if (opportunity && ['identifiee', 'a_qualifier'].includes(opportunity.status)) {
          try {
            await props.crud?.funding_opportunities?.update?.(opportunity.id, { status: 'en_preparation' });
          } catch {
            followUpWarning = 'Le dossier est enregistré, mais le statut de l’opportunité reste à mettre à jour.';
          }
        }
      }
      await Promise.allSettled([
        target.refresh?.(),
        props.crud?.funding_opportunities?.refresh?.(),
        props.crud?.funding_agreements?.refresh?.(),
        props.crud?.funding_expense_allocations?.refresh?.(),
        props.crud?.funding_reports?.refresh?.(),
        props.crud?.funding_project_journal?.refresh?.(),
      ]);
      setFormState({ open: false, kind: null, initial: {} });
      toast.success(formState.initial?.id ? 'Modification enregistrée.' : 'Enregistrement créé.');
      if (followUpWarning) toast(followUpWarning);
    } catch (error) {
      setFormErrors([error?.message || 'Enregistrement impossible pour le moment.']);
    } finally {
      setFormBusy(false);
    }
  };

  const prepareReport = async (report) => {
    const target = props.crud?.funding_reports;
    if (!target?.update || !canWrite) {
      setPublishMessage('La préparation du rapport est indisponible pour le moment.');
      return;
    }
    const form = fundingFormDefaults('report', {
      ...report,
      status: 'ready',
      visibility: 'shared',
      source_snapshot_hash: cockpit.sourceSnapshot.hash,
      source_snapshot_generated_at: cockpit.sourceSnapshot.generated_at,
    }, operationContext);
    const operation = prepareFundingOperation('report', form, operationContext);
    if (!operation.ok) {
      setPublishMessage(operation.errors.join(' '));
      return;
    }
    try {
      await target.update(report.id, operation.payload);
      await target.refresh?.();
      setPublishMessage('');
      toast.success('Rapport figé et prêt à publier.');
    } catch (error) {
      setPublishMessage(error?.message || 'Préparation du rapport impossible.');
    }
  };

  const publishReport = async (report) => {
    const validation = validateFundingReportPublication({ ...report, status: 'ready' }, cockpit.sourceSnapshot);
    if (!validation.ok) {
      const labels = {
        report_not_immutable: 'Le rapport doit être figé.',
        missing_source_snapshot_hash: 'Les données du rapport ne sont pas figées.',
        snapshot_changed_since_freeze: 'Les données ont changé. Prépare une nouvelle version avant de publier.',
        missing_public_content: 'Le rapport ne contient aucun résumé partageable.',
        report_not_ready: 'Le rapport n’est pas prêt à publier.',
        report_not_shared: 'Le rapport doit être explicitement partagé.',
      };
      setPublishMessage(validation.errors.map((error) => labels[error] || 'Publication bloquée.').join(' '));
      return;
    }
    const updateReport = props.crud?.funding_reports?.update;
    if (typeof updateReport !== 'function') {
      setPublishMessage('La publication est indisponible pour le moment.');
      return;
    }
    try {
      await updateReport(report.id, {
        status: 'published',
        visibility: ['shared', 'public'].includes(report.visibility) ? report.visibility : 'shared',
        published_at: new Date().toISOString(),
      });
      await props.crud?.funding_reports?.refresh?.();
      setPublishMessage('');
      toast.success('Rapport publié dans l’espace financeur.');
    } catch (error) {
      setPublishMessage(error?.message || 'Publication impossible pour le moment.');
    }
  };

  const revokeAccount = async (account) => {
    if (!canWrite) return;
    const updateAccount = props.crud?.funder_accounts?.update;
    if (typeof updateAccount !== 'function') {
      toast.error('La révocation est indisponible pour le moment.');
      return;
    }
    try {
      await updateAccount(account.id, { status: 'revoked' });
      await props.crud?.funder_accounts?.refresh?.();
      toast.success('Accès révoqué.');
    } catch (error) {
      toast.error(error?.message || 'Révocation impossible.');
    }
  };

  const openResource = async (resource, resourceType, logAccess = false) => {
    const url = resource?.file_url;
    if (!url) {
      toast.error('Aucun fichier n’est associé à cet élément.');
      return;
    }
    if (logAccess && externalRole && currentFunderAccount?.id) {
      const createLog = props.crud?.funder_access_logs?.create;
      if (typeof createLog !== 'function') {
        toast.error('La consultation ne peut pas être journalisée pour le moment.');
        return;
      }
      const resourceId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(String(resource.id || '')) ? resource.id : null;
      try {
        await createLog({
          farm_id: selectedFarmId || currentFunderAccount.farm_id,
          funder_account_id: currentFunderAccount.id,
          user_id: props.user?.id || null,
          action: 'read',
          resource_type: resourceType,
          resource_id: resourceId,
          status: 'allowed',
          reason: 'Consultation depuis l’espace financeur',
        });
        await props.crud?.funder_access_logs?.refresh?.();
      } catch {
        toast.error('Le fichier est disponible, mais la consultation n’a pas pu être journalisée.');
        return;
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const face = activeTab.startsWith('funder-') ? 'funder' : 'cockpit';
  const fundingKeys = [
    'funding_opportunities',
    'funding_contacts',
    'funding_applications',
    'funding_document_library',
    'funding_agreements',
    'funding_expense_allocations',
    'funding_reports',
    'funding_project_journal',
    'funder_accounts',
    'funder_access_logs',
  ];
  const loading = fundingKeys.some((key) => props.crud?.[key]?.loading);
  const loadErrors = fundingKeys.map((key) => props.crud?.[key]?.error).filter(Boolean);

  return (
    <div className="min-h-screen bg-mist text-earth">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-slate">Pilotage</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-normal text-earth">SUIVI DES FINANCEMENTS</h1>
            <p className="mt-2 text-sm font-semibold text-slate">Opportunités, dossiers, fonds reçus, justificatifs et rapports</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!externalRole ? (
              <button
                type="button"
                onClick={() => setTab('cockpit-dashboard')}
                className={`h-10 rounded-lg border px-3 text-sm font-semibold ${face === 'cockpit' ? 'bg-earth text-white border-earth' : 'bg-white border-line text-slate'}`}
              >
                Gestion interne
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setTab('funder-overview')}
              className={`h-10 rounded-lg border px-3 text-sm font-semibold ${face === 'funder' ? 'bg-earth text-white border-earth' : 'bg-white border-line text-slate'}`}
            >
              Espace Financeurs
            </button>
          </div>
        </header>

        <ModuleTabsBar moduleId={face === 'cockpit' ? 'financements' : 'financements_externe'} active={activeTab} onChange={setTab} wrap activeFarm={props.activeFarm} role={face === 'funder' ? 'financeur_externe' : role || null} />

        {loading ? <div className="rounded-lg border border-line bg-white p-3 text-sm font-semibold text-slate">Actualisation des financements…</div> : null}
        {loadErrors.length ? <div role="alert" className="rounded-lg border border-urgent bg-urgent-bg p-3 text-sm text-urgent">Certaines données de financement n’ont pas pu être chargées. Recharge le module avant d’enregistrer.</div> : null}
        {!externalRole && !selectedFarmId ? <div role="alert" className="rounded-lg border border-vigilance bg-vigilance-bg p-3 text-sm font-semibold text-horizon-dark">Choisis une ferme précise pour créer ou modifier un financement.</div> : null}

        {face === 'cockpit' ? (
          <>
            {activeTab === 'cockpit-dashboard' ? <DashboardTab cockpit={cockpit} /> : null}
            {activeTab === 'cockpit-opportunities' ? (
              <OpportunitiesTab
                cockpit={cockpit}
                canWrite={canWrite}
                onAdd={() => openForm('opportunity')}
                onEdit={(item) => openForm('opportunity', item)}
                onAcceptSuggestion={(item) => openForm('opportunity', { ...item, id: '', opportunity_type: item.type })}
                onCreateApplication={(item) => openForm('application', {
                  opportunity_id: item.id,
                  title: `Dossier · ${item.title}`,
                  target_institution: item.institution,
                  requested_amount: item.amount_requested,
                  required_documents: item.required_documents,
                })}
              />
            ) : null}
            {activeTab === 'cockpit-contacts' ? <ContactsTab cockpit={cockpit} canWrite={canWrite} onAdd={() => openForm('contact')} onEdit={(item) => openForm('contact', item)} /> : null}
            {activeTab === 'cockpit-applications' ? (
              <ApplicationsOnlyTab
                cockpit={cockpit}
                canWrite={canWrite}
                onAdd={() => openForm('application')}
                onEdit={(item) => openForm('application', item)}
                onAddDocument={(item) => openForm('document', { application_id: item.id, title: `Pièce · ${item.title}` })}
                onCreateAgreement={(item) => openForm('agreement', {
                  application_id: item.id,
                  title: `Convention · ${item.title}`,
                  funder: item.target_institution,
                  amount_granted: item.requested_amount,
                  amount_received: 0,
                })}
              />
            ) : null}
            {activeTab === 'cockpit-documents' ? (
              <FundingDocumentsTab
                cockpit={cockpit}
                canWrite={canWrite}
                onAdd={() => openForm('document')}
                onEdit={(item) => openForm('document', (
                  item.status === 'published' || item.status === 'archived'
                    ? {
                      ...item,
                      id: '',
                      status: 'draft',
                      visibility: 'internal',
                      version_label: nextVersionLabel(item.version),
                      published_at: null,
                    }
                    : item
                ))}
                onOpen={(item) => openResource(item, 'document')}
              />
            ) : null}
            {activeTab === 'cockpit-funds' ? (
              <AgreementsTab
                cockpit={cockpit}
                transactions={seed.sourceTransactions}
                documents={seed.sourceDocuments}
                canWrite={canWrite}
                onAddAgreement={() => openForm('agreement')}
                onEditAgreement={(item) => openForm('agreement', item)}
                onAddAllocation={(agreement) => openForm('allocation', { agreement_id: agreement?.id || '' })}
                onEditAllocation={(item) => openForm('allocation', item)}
              />
            ) : null}
            {activeTab === 'cockpit-publications' ? (
              <FundingPublicationsTab
                cockpit={cockpit}
                journalEntries={seed.journalEntries}
                canWrite={canWrite}
                onCreateReport={() => openForm('report', {
                  public_summary: `Montant accordé ${money(cockpit.kpis.granted_amount)} · solde disponible ${money(cockpit.kpis.remaining_amount)}.`,
                })}
                onEditReport={(item) => openForm('report', item)}
                onPrepareReport={prepareReport}
                onPublishReport={publishReport}
                onAddJournal={() => openForm('journal')}
                onEditJournal={(item) => openForm('journal', item)}
                publishMessage={publishMessage}
              />
            ) : null}
            {activeTab === 'cockpit-access' ? <FundingAccessTab cockpit={cockpit} accounts={seed.accounts} canWrite={canWrite} onAddAccount={() => openForm('account')} onEditAccount={(item) => openForm('account', item)} onRevokeAccount={revokeAccount} /> : null}
          </>
        ) : (
          <FunderSpace
            tab={activeTab}
            publicSpace={publicSpace}
            accessLogs={cockpit.accessLogs || seed.accessLogs || []}
            contact={{
              name: props.activeFarm?.settings?.contact_name || props.activeFarm?.legal_name || props.activeFarm?.name || 'Horizon Farm',
              email: props.activeFarm?.settings?.email || '',
              phone: props.activeFarm?.settings?.phone || '',
            }}
            onOpenResource={(item, type) => openResource(item, type, true)}
          />
        )}
      </div>
      {formState.open ? (
        <FundingFormModal
          open
          kind={formState.kind}
          initial={formState.initial}
          context={operationContext}
          busy={formBusy}
          validationErrors={formErrors}
          onClose={closeForm}
          onSubmit={saveForm}
        />
      ) : null}
    </div>
  );
}
