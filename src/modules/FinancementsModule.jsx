import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderOpen,
  Handshake,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import { resolveFinancementsTab } from '../utils/commercialNavigation.js';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import {
  FUNDING_ALERT_TYPES,
  buildFundingCockpit,
  buildFundingPublicSpace,
  createFundingReportVersion,
  validateFundingReportPublication,
} from '../services/financements/financementsService.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();
const money = (value) => `${Math.round(Number(value || 0)).toLocaleString('fr-FR')} FCFA`;
const number = (value) => Number(value || 0).toLocaleString('fr-FR');
const dateLabel = (value) => (value ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Non planifié');

function realFundingSeed(props = {}) {
  const dataMap = props.dataMap || {};
  const crud = props.crud || {};
  const documents = arr(props.documents);
  const businessEvents = arr(props.businessEvents);
  const businessPlans = arr(props.businessPlans);
  const transactions = arr(props.transactions);
  const auditLogs = arr(props.auditLogs);
  const reports = arr(props.rapports);

  const fundingDocs = documents.filter((doc) => {
    const text = lower(`${doc.title || ''} ${doc.nom || ''} ${doc.name || ''} ${doc.category || ''} ${doc.document_category || ''} ${doc.module_source || ''}`);
    return ['financement', 'financeur', 'subvention', 'banque', 'business plan', 'budget', 'convention', 'dossier'].some((token) => text.includes(token));
  });

  const opportunities = [
    ...arr(dataMap.funding_opportunities),
    ...arr(crud.funding_opportunities?.rows),
    ...arr(crud.bp_funding_sources?.rows).map((source) => ({
      id: `bp-source-${source.id}`,
      title: source.name || source.label || source.source_name || 'Source BP',
      institution: source.institution || source.source_name,
      type: source.type || 'subvention',
      status: 'identifiee',
      amount_requested: source.amount || source.montant,
      owner: source.owner,
      next_action: source.next_action,
    })),
  ];

  const contacts = [
    ...arr(dataMap.funding_contacts),
    ...arr(dataMap.investor_forum_contacts),
    ...arr(crud.funding_contacts?.rows),
    ...arr(crud.investor_forum_contacts?.rows),
  ];

  const applications = [
    ...arr(dataMap.funding_applications),
    ...arr(crud.funding_applications?.rows),
  ];
  if (!applications.length && (fundingDocs.length || businessPlans.length)) {
    applications.push({
      id: 'application-main',
      title: 'Dossier principal',
      target_institution: 'Financeurs',
      status: fundingDocs.length >= 3 ? 'ready' : 'draft',
      requested_amount: arr(crud.bp_funding_sources?.rows).reduce((sum, row) => sum + Number(row.amount || row.montant || 0), 0),
      required_documents: ['Business plan', 'Budget', 'Identité', 'Justificatifs financiers'],
      ready_documents: fundingDocs.slice(0, 4).map((doc) => doc.title || doc.nom || doc.name || doc.id),
    });
  }

  const agreements = [
    ...arr(dataMap.funding_agreements),
    ...arr(crud.funding_agreements?.rows),
    ...arr(crud.bp_funding_sources?.rows)
      .filter((source) => Number(source.amount_received || source.received || 0) > 0 || lower(source.status).includes('accord'))
      .map((source) => ({
        id: `agreement-${source.id}`,
        title: source.name || source.label || 'Convention BP',
        funder: source.institution || source.source_name,
        amount_granted: source.amount || source.montant,
        amount_received: source.amount_received || source.received || source.amount || source.montant,
        amount_spent: source.amount_spent || source.spent,
        status: source.status || 'signed',
      })),
  ];

  const expenseAllocations = [
    ...arr(dataMap.funding_expense_allocations),
    ...arr(crud.funding_expense_allocations?.rows),
    ...transactions
      .filter((row) => row.funding_agreement_id || row.agreement_id || lower(`${row.category || ''} ${row.categorie || ''} ${row.libelle || ''}`).includes('financement'))
      .map((row) => ({
        id: `allocation-${row.id}`,
        agreement_id: row.funding_agreement_id || row.agreement_id || agreements[0]?.id || null,
        transaction_id: row.id,
        document_id: row.document_id,
        amount: row.montant || row.amount,
        category: row.category || row.categorie,
        status: 'allocated',
      })),
  ];

  const journalEntries = businessEvents
    .filter((event) => {
      const text = lower(`${event.title || ''} ${event.description || ''} ${event.type || ''} ${event.category || ''}`);
      return ['financeur', 'financement', 'subvention', 'banque', 'convention', 'rapport'].some((token) => text.includes(token));
    })
    .map((event) => ({
      id: event.id,
      title: event.title || event.name || 'Avancement financement',
      date: event.date || event.created_at,
      status: event.published === false ? 'draft' : 'published',
      published: event.published !== false,
      summary: event.description || event.notes || '',
    }));

  return {
    opportunities,
    contacts,
    applications,
    documents: [
      ...arr(dataMap.funding_document_library),
      ...arr(crud.funding_document_library?.rows),
      ...fundingDocs.map((doc) => ({
        ...doc,
        visibility: doc.visibility || doc.access_level || (doc.published_at ? 'shared' : 'internal'),
        status: doc.status || (doc.published_at ? 'published' : 'draft'),
      })),
    ],
    agreements,
    expenseAllocations,
    reports: [
      ...arr(dataMap.funding_reports),
      ...arr(crud.funding_reports?.rows),
      ...reports.filter((report) => {
        const text = lower(`${report.title || ''} ${report.module || ''} ${report.category || ''}`);
        return ['financement', 'financeur', 'impact', 'budget'].some((token) => text.includes(token));
      }),
    ],
    journalEntries: [
      ...arr(dataMap.funding_project_journal),
      ...arr(crud.funding_project_journal?.rows),
      ...journalEntries,
    ],
    accessLogs: [
      ...arr(dataMap.funder_access_logs),
      ...arr(crud.funder_access_logs?.rows),
      ...auditLogs.filter((log) => lower(`${log.module || ''} ${log.action || ''}`).includes('financement')),
    ],
  };
}

function StatCard({ icon: Icon, label, value, detail, tone = 'default' }) {
  const toneClass = tone === 'danger'
    ? 'border-red-200 bg-red-50 text-red-900'
    : tone === 'good'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : 'border-[#e7d9bd] bg-white text-[#2f2415]';
  return (
    <div className={`rounded-lg border p-4 ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
          <p className="mt-2 text-2xl font-black">{value}</p>
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
        <h3 className="text-lg font-black text-[#2f2415] inline-flex items-center gap-2">
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
    <div className="rounded-lg border border-dashed border-[#d9c8a8] bg-[#fffdf8] p-6 text-sm font-semibold text-[#7d6a4a]">
      {children}
    </div>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const cls = tone === 'danger'
    ? 'bg-red-50 text-red-800 border-red-200'
    : tone === 'good'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : tone === 'amber'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-[#fff9ef] text-[#6d5531] border-[#e4d0ad]';
  return <span className={`rounded-full border px-2 py-1 text-xs font-black ${cls}`}>{children}</span>;
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
                <div key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-amber-900">{alert.title}</p>
                    <Badge tone={alert.severity === 'critique' || alert.severity === 'haute' ? 'danger' : 'amber'}>{alert.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>Aucune alerte financement active.</EmptyState>
          )}
        </Section>

        <Section title="Sources officielles" icon={ShieldCheck}>
          <div className="rounded-lg border border-[#e7d9bd] bg-white p-4 space-y-3">
            {Object.entries(sourceSnapshot.sources || {}).map(([key, source]) => (
              <div key={key} className="flex items-center justify-between gap-3 text-sm">
                <span className="font-bold text-[#2f2415]">{key}</span>
                <span className="text-right text-[#7d6a4a]">{source}</span>
              </div>
            ))}
            <div className="border-t border-[#efe3ca] pt-3 text-sm text-[#7d6a4a]">
              Hash snapshot: <span className="font-black text-[#2f2415]">{sourceSnapshot.hash}</span>
            </div>
          </div>
        </Section>
      </div>

      <Section title="Prochaine échéance" icon={CalendarDays}>
        {nextDeadline ? (
          <div className="rounded-lg border border-[#e7d9bd] bg-white p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-black text-[#2f2415]">{nextDeadline.title}</p>
              <p className="text-sm text-[#7d6a4a]">{nextDeadline.institution || 'Organisme à préciser'}</p>
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

function OpportunitiesTab({ cockpit }) {
  return (
    <Section title="Opportunités" icon={Handshake}>
      {cockpit.opportunities.length ? (
        <div className="overflow-hidden rounded-lg border border-[#e7d9bd] bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[#f8f1e4] text-left text-[#5d4b2f]">
              <tr>
                <th className="p-3">Opportunité</th>
                <th className="p-3">Type</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Montant</th>
                <th className="p-3">Échéance</th>
                <th className="p-3">Responsable</th>
                <th className="p-3">Prochaine action</th>
              </tr>
            </thead>
            <tbody>
              {cockpit.opportunities.map((item) => (
                <tr key={item.id} className="border-t border-[#efe3ca]">
                  <td className="p-3 font-black text-[#2f2415]">{item.title}<p className="text-xs font-semibold text-[#8a7456]">{item.institution}</p></td>
                  <td className="p-3"><Badge>{item.type}</Badge></td>
                  <td className="p-3">{item.status}</td>
                  <td className="p-3 font-bold">{item.amount_requested ? money(item.amount_requested) : '—'}</td>
                  <td className="p-3">{dateLabel(item.deadline)}</td>
                  <td className="p-3">{item.owner || '—'}</td>
                  <td className="p-3">{item.next_action || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>Aucune opportunité financement enregistrée.</EmptyState>
      )}
    </Section>
  );
}

function ContactsTab({ cockpit }) {
  return (
    <Section title="Contacts financeurs" icon={Users}>
      {cockpit.contacts.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {cockpit.contacts.map((contact) => (
            <div key={contact.id} className="rounded-lg border border-[#e7d9bd] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black text-[#2f2415]">{contact.name}</p>
                  <p className="text-sm text-[#7d6a4a]">{contact.organization || 'Organisation à préciser'} · {contact.role || 'Rôle à préciser'}</p>
                </div>
                <Badge>{contact.status}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#5d4b2f]">
                <span>{contact.email || 'Email non renseigné'}</span>
                <span>{contact.phone || 'Téléphone non renseigné'}</span>
                <span>{contact.organization_type}</span>
                <span>{dateLabel(contact.next_follow_up_at)}</span>
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

function AgreementsTab({ cockpit }) {
  return (
    <div className="space-y-6">
      <Section title="Conventions" icon={Banknote}>
        {cockpit.agreements.length ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {cockpit.agreements.map((agreement) => (
              <div key={agreement.id} className="rounded-lg border border-[#e7d9bd] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#2f2415]">{agreement.title}</p>
                    <p className="text-sm text-[#7d6a4a]">{agreement.funder || 'Financeur à préciser'}</p>
                  </div>
                  <Badge tone={agreement.spend_rate >= 80 ? 'amber' : 'good'}>{agreement.spend_rate}% utilisé</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div><p className="text-[#8a7456]">Accordé</p><p className="font-black">{money(agreement.amount_granted)}</p></div>
                  <div><p className="text-[#8a7456]">Reçu</p><p className="font-black">{money(agreement.amount_received)}</p></div>
                  <div><p className="text-[#8a7456]">Restant</p><p className="font-black">{money(agreement.amount_remaining)}</p></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>Aucune convention enregistrée.</EmptyState>
        )}
      </Section>

      <Section title="Affectations dépenses" icon={ReceiptText}>
        {cockpit.expenseAllocations.length ? (
          <div className="overflow-hidden rounded-lg border border-[#e7d9bd] bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#f8f1e4] text-left text-[#5d4b2f]">
                <tr>
                  <th className="p-3">Convention</th>
                  <th className="p-3">Transaction</th>
                  <th className="p-3">Catégorie</th>
                  <th className="p-3">Montant</th>
                  <th className="p-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {cockpit.expenseAllocations.map((row) => (
                  <tr key={row.id} className="border-t border-[#efe3ca]">
                    <td className="p-3">{row.agreement_id || '—'}</td>
                    <td className="p-3">{row.transaction_id || '—'}</td>
                    <td className="p-3">{row.category || '—'}</td>
                    <td className="p-3 font-black">{money(row.amount)}</td>
                    <td className="p-3">{row.status}</td>
                  </tr>
                ))}
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

function ApplicationsOnlyTab({ cockpit }) {
  return <Section title="Candidatures" icon={ClipboardCheck}>{cockpit.applications.length ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{cockpit.applications.map((application) => <div key={application.id} className="rounded-lg border border-[#e7d9bd] bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{application.title}</p><p className="text-sm text-[#7d6a4a]">{application.target_institution || 'Organisme à préciser'}</p></div><Badge tone={application.completion_rate >= 100 ? 'good' : 'amber'}>{application.completion_rate}%</Badge></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#f0e4cd]"><div className="h-full bg-emerald-500" style={{ width: `${application.completion_rate}%` }} /></div></div>)}</div> : <EmptyState>Aucune candidature structurée.</EmptyState>}</Section>;
}

function FundingDocumentsTab({ cockpit }) {
  return <Section title="Pièces du dossier" icon={FolderOpen}>{cockpit.documents.length ? <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">{cockpit.documents.map((doc) => <div key={doc.id} className="rounded-lg border border-[#e7d9bd] bg-white p-4"><p className="font-black text-[#2f2415]">{doc.title}</p><p className="mt-2 text-sm text-[#7d6a4a]">{doc.category}</p><div className="mt-3 flex gap-2"><Badge>{doc.visibility}</Badge><Badge tone={doc.status === 'published' ? 'good' : 'amber'}>{doc.status}</Badge></div></div>)}</div> : <EmptyState>Aucune pièce de dossier indexée.</EmptyState>}</Section>;
}

function FundingPublicationsTab({ cockpit, onCreateReport, onPublishReport, publishMessage }) {
  return <Section title="Publications" icon={FileText} right={<button type="button" onClick={onCreateReport} className="h-10 rounded-lg bg-[#2f2415] px-3 text-sm font-black text-white">Créer une version</button>}>{publishMessage ? <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">{publishMessage}</div> : null}{cockpit.reports.length ? <div className="space-y-2">{cockpit.reports.map((report) => <div key={`${report.id}-${report.version}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e7d9bd] bg-white p-4"><div><p className="font-black text-[#2f2415]">{report.title}</p><p className="text-xs text-[#8a7456]">v{report.version} · {report.source_snapshot_hash}</p></div><div className="flex items-center gap-2"><Badge tone={report.status === 'published' ? 'good' : 'amber'}>{report.status}</Badge>{report.status !== 'published' ? <button type="button" onClick={() => onPublishReport(report)} className="h-9 rounded-lg border border-[#2f2415] px-3 text-xs font-black">Publier</button> : null}</div></div>)}</div> : <EmptyState>Aucune publication préparée.</EmptyState>}</Section>;
}

function FundingAccessTab({ cockpit }) {
  return <Section title="Accès externes" icon={ShieldCheck}>{cockpit.accessLogs?.length ? <div className="space-y-2">{cockpit.accessLogs.map((log, index) => <div key={log.id || index} className="grid gap-2 rounded-lg border border-[#e7d9bd] bg-white p-3 text-sm sm:grid-cols-[1fr_auto]"><span className="font-black text-[#2f2415]">{log.funder || log.user_id || 'Financeur'}</span><span className="text-[#7d6a4a]">{log.action || 'lecture'} · {dateLabel(log.created_at || log.at)}</span></div>)}</div> : <EmptyState>Aucun accès externe journalisé.</EmptyState>}</Section>;
}

function FunderSpace({ tab, publicSpace, accessLogs, contact }) {
  if (tab === 'funder-reports') {
    return (
      <Section title="Rapports" icon={FileText}>
        {publicSpace.reports.length ? (
          <div className="space-y-2">
            {publicSpace.reports.map((report) => (
              <div key={`${report.id}-${report.version}`} className="rounded-lg border border-[#e7d9bd] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-[#2f2415]">{report.title}</p>
                    <p className="text-xs text-[#8a7456]">v{report.version} · {dateLabel(report.published_at || report.created_at)}</p>
                  </div>
                  <Badge tone="good">publié</Badge>
                </div>
                {report.public_summary ? <p className="mt-3 text-sm text-[#5d4b2f]">{report.public_summary}</p> : null}
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
              <div key={entry.id} className="rounded-lg border border-[#e7d9bd] bg-white p-4">
                <p className="font-black text-[#2f2415]">{entry.title}</p>
                <p className="mt-1 text-xs font-bold text-[#8a7456]">{dateLabel(entry.date || entry.created_at)}</p>
                {entry.summary ? <p className="mt-2 text-sm text-[#5d4b2f]">{entry.summary}</p> : null}
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
              <div key={doc.id} className="rounded-lg border border-[#e7d9bd] bg-white p-4">
                <p className="font-black text-[#2f2415]">{doc.title}</p>
                <p className="mt-2 text-sm text-[#7d6a4a]">{doc.category}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="good">partagé</Badge>
                  <Badge>{doc.version}</Badge>
                </div>
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
    return <Section title="Contact" icon={Users}><div className="rounded-lg border border-[#e7d9bd] bg-white p-4"><p className="font-black text-[#2f2415]">{contact?.name || 'Contact Horizon Farm'}</p><p className="mt-1 text-sm text-[#7d6a4a]">{contact?.email || 'Courriel à renseigner'} · {contact?.phone || 'Téléphone à renseigner'}</p></div></Section>;
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
              <div key={log.id || index} className="rounded-lg border border-[#e7d9bd] bg-white p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-[#2f2415]">{log.funder || log.user_id || 'Financeur'}</span>
                <span className="text-[#7d6a4a]">{log.action || 'read'} · {dateLabel(log.created_at || log.at)}</span>
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
  const [localReports, setLocalReports] = useState([]);
  const [publishMessage, setPublishMessage] = useState('');
  const activeTab = controlled ? resolveFinancementsTab(props.initialTab) : internalTab;

  const setTab = (value) => {
    const resolved = resolveFinancementsTab(value);
    if (!controlled) setInternalTab(resolved);
    props.onTabChange?.(resolved);
  };

  const seed = useMemo(() => realFundingSeed(props), [props]);
  const cockpit = useMemo(() => {
    const input = seed;
    return buildFundingCockpit({
      ...input,
      crud: props.crud,
      dataMap: props.dataMap,
      liveMeteo: props.meteo,
      salesOrders: props.salesOrdersAll || props.salesOrders,
      payments: props.paymentsAll || props.payments,
      clients: props.clients,
      documents: props.documents,
      stocks: props.stocks,
      transactions: props.transactionsAll || props.transactions,
      businessPlans: props.businessPlans,
      investissements: props.investissements,
      businessEvents: props.businessEvents,
      reports: [...arr(input.reports), ...localReports],
    });
  }, [seed, props, localReports]);

  const publicSpace = useMemo(() => buildFundingPublicSpace({
    cockpit,
    reports: cockpit.reports,
    documents: cockpit.documents,
    journalEntries: seed.journalEntries,
    account: { status: 'active', permissions: ['*'] },
    demoMode: false,
  }), [cockpit, seed.journalEntries]);

  const createReport = () => {
    const report = createFundingReportVersion({
      title: `Rapport financement ${new Date().toLocaleDateString('fr-FR')}`,
      status: 'ready',
      visibility: 'shared',
      sections: ['Indicateurs', 'Fonds', 'Avancement'],
      public_summary: `Montant accordé ${money(cockpit.kpis.granted_amount)} · solde ${money(cockpit.kpis.remaining_amount)}.`,
    }, cockpit.sourceSnapshot);
    setLocalReports((prev) => [report, ...prev]);
    setPublishMessage('');
  };

  const publishReport = (report) => {
    const validation = validateFundingReportPublication({ ...report, status: 'ready' }, cockpit.sourceSnapshot);
    if (!validation.ok) {
      setPublishMessage(`Publication bloquée: ${validation.errors.join(', ')}`);
      return;
    }
    setLocalReports((prev) => prev.map((item) => (
      item.id === report.id
        ? { ...item, status: 'published', published_at: new Date().toISOString() }
        : item
    )));
    setPublishMessage('');
  };

  const face = activeTab.startsWith('funder-') ? 'funder' : 'cockpit';

  return (
    <div className="min-h-screen bg-[#fbf6ec] text-[#2f2415]">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 space-y-5">
        <header className="flex flex-col gap-4 border-b border-[#decda9] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Pilotage</p>
            <h1 className="mt-1 text-3xl font-black tracking-normal text-[#2f2415]">FINANCEMENTS</h1>
            <p className="mt-2 text-sm font-semibold text-[#7d6a4a]">Cockpit financement · Espace Financeurs</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('cockpit-dashboard')}
              className={`h-10 rounded-lg border px-3 text-sm font-black ${face === 'cockpit' ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white border-[#d9c8a8] text-[#5d4b2f]'}`}
            >
              Cockpit
            </button>
            <button
              type="button"
              onClick={() => setTab('funder-overview')}
              className={`h-10 rounded-lg border px-3 text-sm font-black ${face === 'funder' ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white border-[#d9c8a8] text-[#5d4b2f]'}`}
            >
              Espace Financeurs
            </button>
          </div>
        </header>

        <ModuleTabsBar moduleId={face === 'cockpit' ? 'financements' : 'financements_externe'} active={activeTab} onChange={setTab} wrap activeFarm={props.activeFarm} role={face === 'funder' ? 'financeur_externe' : props.role} />

        {face === 'cockpit' ? (
          <>
            {activeTab === 'cockpit-dashboard' ? <DashboardTab cockpit={cockpit} /> : null}
            {activeTab === 'cockpit-opportunities' ? <OpportunitiesTab cockpit={cockpit} /> : null}
            {activeTab === 'cockpit-contacts' ? <ContactsTab cockpit={cockpit} /> : null}
            {activeTab === 'cockpit-applications' ? <ApplicationsOnlyTab cockpit={cockpit} /> : null}
            {activeTab === 'cockpit-documents' ? <FundingDocumentsTab cockpit={cockpit} /> : null}
            {activeTab === 'cockpit-funds' ? <AgreementsTab cockpit={cockpit} /> : null}
            {activeTab === 'cockpit-publications' ? <FundingPublicationsTab cockpit={cockpit} onCreateReport={createReport} onPublishReport={publishReport} publishMessage={publishMessage} /> : null}
            {activeTab === 'cockpit-access' ? <FundingAccessTab cockpit={cockpit} /> : null}
          </>
        ) : (
          <FunderSpace tab={activeTab} publicSpace={publicSpace} accessLogs={cockpit.accessLogs || seed.accessLogs || []} contact={cockpit.contacts?.[0]} />
        )}
      </div>
    </div>
  );
}
