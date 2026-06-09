import { BarChart3, BrainCircuit, ClipboardList, Download, FileText, FolderOpen, Search, ShieldCheck, Zap } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation, createMissingProofTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { rowsOf } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { aggregateMissingProofItems, buildDocumentsCoherenceRows, buildDocumentsHealthSnapshot } from './documents/documentsVisionHelpers.js';
import { filterDocumentsByQuery } from '../services/documentsOrphanSyncService.js';
import DocumentsOrphanSyncPanel from './DocumentsOrphanSyncPanel.jsx';
import { resolveDocumentsTab } from '../utils/commercialNavigation.js';

const arr = (v) => Array.isArray(v) ? v : [];
const low = (v) => String(v || '').toLowerCase();
const dateOf = (r = {}) => r.date || r.created_at || r.updated_at || r.event_date || '—';
const labelOf = (r = {}) => r.title || r.nom || r.name || r.filename || r.libelle || r.id || 'Document';
const typeOf = (r = {}) => r.type || r.categorie || r.category || r.module_source || 'Document';
const detailOf = (r = {}) => r.description || r.notes || r.module_source || r.related_type || r.entity_type || '—';
const amountOf = (r = {}) => Number(r.montant || r.amount || r.total || r.montant_total || 0);
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);
const docIsProof = (r = {}) => /preuve|recu|reçu|facture|paiement|justificatif|finance|achat|vente/.test(low(`${typeOf(r)} ${labelOf(r)}`));
const docIsReport = (r = {}) => /rapport|report|bilan|analyse|export/.test(low(`${typeOf(r)} ${labelOf(r)}`));
const docIsMedia = (r = {}) => /image|photo|media|jpeg|jpg|png/.test(low(`${typeOf(r)} ${labelOf(r)} ${r.mime_type || ''}`));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Section({ icon: Icon, title, children, action }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>;
}
function Button({ children, onClick }) { return <button type="button" onClick={onClick} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">{children}</button>; }
function Pill({ children, tone = 'neutral' }) { const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'; return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>; }
function Row({ title, detail, value, tone = 'neutral', onClick }) { return <button type="button" onClick={onClick} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]"><span className="font-black text-[#2f2415]">{title}</span><span className="text-sm text-[#8a7456]">{detail}</span><Pill tone={tone}>{value}</Pill></button>; }
function Field({ label, value }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className="mt-1 font-black text-[#2f2415]">{value}</p></div>; }
function Empty({ label }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>; }
function Tabs({ active, onChange }) { return <ModuleTabsBar moduleId="documents_rapports" active={active} onChange={onChange} />; }

function DocumentsIaPanel({ findings = [], predictions = [], onApply, busyId, onNavigate, setTab }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <Section icon={BrainCircuit} title="Surveillance IA documentaire">
      <p className="mb-3 text-sm text-[#8a7456]">Preuves, factures, rapports et cohérence finance → documents → conformité.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { onNavigate?.('finance_pilotage'); setTab('Preuves'); }} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Finance</button>
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : f.auto_action === 'create_alert' ? 'Créer alerte' : 'Créer tâche'}</button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 2).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm"><b>{p.title}</b><p className="text-xs text-[#8a7456]">{p.description}</p></div>
        ))}
      </div>
    </Section>
  );
}

function CoherencePanel({ rows = [], onApply, busyId, setTab, onNavigate }) {
  if (!rows.length) return null;
  return (
    <Section icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab(row.type === 'facture' ? 'Rapports' : 'Preuves')} className="text-left"><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => row.finding && onApply?.(row.finding)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">{busyId === row.id ? '…' : 'Corriger'}</button>
        </div>
      ))}
    </Section>
  );
}

function Summary({ data, setTab, onApply, onAttachProof, busyId, onNavigate, actionHandlers }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
        <Stat label="Santé docs" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Documents" value={fmtNumber(data.documents.length)} />
        <Stat label="Preuves" value={fmtNumber(data.proofs.length)} tone="good" />
        <Stat label="Rapports" value={fmtNumber(data.reports.length)} />
        <Stat label="Sans preuve" value={fmtNumber(data.missingProof.length)} tone={data.missingProof.length ? 'warn' : 'good'} />
        <Stat label="Montant à justifier" value={fmtCurrency(data.missingProofAmount)} tone={data.missingProofAmount ? 'warn' : 'good'} />
        <Stat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
        <Stat label="Médias" value={fmtNumber(data.media.length)} />
      </div>
      <DocumentsIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} onNavigate={onNavigate} setTab={setTab} />
      <DocumentsOrphanSyncPanel documents={data.documents} onApply={onApply} busyId={busyId} setTab={setTab} onNavigate={onNavigate} actionHandlers={actionHandlers} />
      <CoherencePanel rows={data.coherenceRows} onApply={onApply} busyId={busyId} setTab={setTab} onNavigate={onNavigate} />
      <Section icon={ClipboardList} title="Priorités documentaires" action={<Button onClick={() => setTab('Preuves')}>Voir preuves</Button>}>
        {data.priorities.length ? data.priorities.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setTab('Preuves')} className="text-left"><b className="text-[#2f2415]">{item.title}</b><p className="text-xs text-[#8a7456]">{item.detail}</p></button>
            <button type="button" disabled={busyId === item.id} onClick={() => onAttachProof?.(item)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === item.id ? '…' : 'Créer tâche preuve'}</button>
          </div>
        )) : <Empty label="Aucune priorité documentaire." />}
      </Section>
      <Section icon={FolderOpen} title="Parcours documents">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <button type="button" onClick={() => { emitHorizonForm('documents', 'supplier_invoice', 'Joindre facture', { date: new Date().toISOString().slice(0, 10) }); setTab('Bibliothèque'); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Document</b><p className="mt-1 text-sm text-[#8a7456]">Facture, reçu, preuve.</p></button>
          <button type="button" onClick={() => setTab('Bibliothèque')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Bibliothèque</b><p className="mt-1 text-sm text-[#8a7456]">Tous les fichiers.</p></button>
          <button type="button" onClick={() => setTab('Exports')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Exports</b><p className="mt-1 text-sm text-[#8a7456]">Dossier financeur PDF.</p></button>
          <button type="button" onClick={() => setTab('Modèles')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Modèles</b><p className="mt-1 text-sm text-[#8a7456]">Reçus et fiches types.</p></button>
        </div>
      </Section>
    </div>
  );
}

function Library({ data, selected, setSelected, query, setQuery }) {
  const filtered = useMemo(() => filterDocumentsByQuery(data.documents, query), [data.documents, query]);
  const row = selected || filtered[0] || data.documents[0];
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
      <Section icon={FolderOpen} title="Bibliothèque" action={<div className="relative w-full max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7456]" /><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher document…" className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] py-2 pl-9 pr-3 text-sm" /></div>}>
        {filtered.length ? filtered.slice(0, 24).map((doc) => (
          <Row key={doc.id || labelOf(doc)} title={labelOf(doc)} detail={`${typeOf(doc)} · ${dateOf(doc)} · ${detailOf(doc)}`} value={docIsProof(doc) ? 'Preuve' : docIsReport(doc) ? 'Rapport' : 'Doc'} tone={docIsProof(doc) ? 'good' : 'neutral'} onClick={() => setSelected(doc)} />
        )) : <Empty label={query ? 'Aucun document pour cette recherche.' : 'Aucun document.'} />}
      </Section>
      <Section icon={Search} title="Fiche document">
        <div className="space-y-3">{row ? <><Field label="Document" value={labelOf(row)} /><Field label="Type" value={typeOf(row)} /><Field label="Date" value={dateOf(row)} /><Field label="Origine" value={row.module_source || row.related_type || '—'} /><Field label="Détail" value={detailOf(row)} /></> : <Empty label="Aucun document sélectionné." />}</div>
      </Section>
    </div>
  );
}

function Proofs({ data, onNavigate, onAttachProof, busyId }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Preuves" value={fmtNumber(data.proofs.length)} tone="good" />
        <Stat label="Sans preuve" value={fmtNumber(data.missingProof.length)} tone={data.missingProof.length ? 'warn' : 'good'} />
        <Stat label="Montant à justifier" value={fmtCurrency(data.missingProofAmount)} tone={data.missingProofAmount ? 'warn' : 'good'} />
        <Stat label="Factures/reçus" value={fmtNumber(data.invoiceDocs.length)} />
      </div>
      <Section icon={ShieldCheck} title="Éléments sans preuve">
        {data.missingProof.length ? data.missingProof.slice(0, 14).map((row) => (
          <div key={row.id || labelOf(row)} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => onNavigate?.('finance_pilotage')} className="text-left"><b className="text-[#2f2415]">{labelOf(row)}</b><p className="text-xs text-[#8a7456]">{dateOf(row)} · preuve à joindre</p></button>
            <div className="flex gap-2">
              <span className="text-sm font-black text-amber-700">{fmtCurrency(amountOf(row))}</span>
              <button type="button" disabled={busyId === row.id} onClick={() => onAttachProof?.({ id: row.id, title: labelOf(row), amount: amountOf(row) })} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === row.id ? '…' : 'Tâche'}</button>
            </div>
          </div>
        )) : <Empty label="Aucune preuve manquante détectée." />}
      </Section>
    </div>
  );
}

function Reports({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Rapports" value={fmtNumber(data.reports.length)} />
        <Stat label="Modules couverts" value={fmtNumber(data.coveredModules.length)} />
        <Stat label="Exports" value={fmtNumber(data.exports.length)} />
        <Stat label="Modèles" value={fmtNumber(data.templates.length)} />
      </div>
      <Section icon={BarChart3} title="Rapports disponibles">
        {data.reports.length ? data.reports.slice(0, 14).map((row) => <Row key={row.id || labelOf(row)} title={labelOf(row)} detail={`${typeOf(row)} · ${dateOf(row)} · ${detailOf(row)}`} value="Rapport" />) : <Empty label="Aucun rapport enregistré." />}
      </Section>
    </div>
  );
}

function Exports({ data, onNavigate }) {
  return (
    <Section icon={Download} title="Exports">
      <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-black text-emerald-900">Dossier financeur PDF</p>
          <p className="text-sm text-emerald-800">DER, FONGIP, BNDE, CNCAS — actifs, production, CA, rentabilité, risques et prévisions.</p>
        </div>
        <Button onClick={() => onNavigate?.('rapports')}>Générer dossier financeur</Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Export ventes" value={`${fmtNumber(data.salesOrders.length)} vente(s)`} />
        <Field label="Export finance" value={`${fmtNumber(data.transactions.length)} mouvement(s)`} />
        <Field label="Export élevage" value={`${fmtNumber(data.animaux.length + data.lots.length)} élément(s)`} />
        <Field label="Export stock" value={`${fmtNumber(data.stocks.length)} produit(s)`} />
        <Field label="Export cultures" value={`${fmtNumber(data.cultures.length)} culture(s)`} />
        <Field label="Export clients" value={`${fmtNumber(data.clients.length)} client(s)`} />
      </div>
    </Section>
  );
}

function Templates({ data }) {
  const templates = data.templates.length ? data.templates : [
    { id: 'vente', title: 'Reçu de vente', type: 'Modèle' },
    { id: 'finance', title: 'Justificatif dépense', type: 'Modèle' },
    { id: 'stock', title: 'Fiche inventaire', type: 'Modèle' },
    { id: 'sante', title: 'Fiche sanitaire', type: 'Modèle' },
  ];
  return <Section icon={FileText} title="Modèles de documents">{templates.map((row) => <Row key={row.id || labelOf(row)} title={labelOf(row)} detail={`${typeOf(row)} · prêt à utiliser`} value="Modèle" />)}</Section>;
}

export default function DocumentsRapportsModule(props) {
  const [tab, setTab] = useState(() => resolveDocumentsTab(props.initialTab));
  useEffect(() => {
    if (props.initialTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation pilotée par props.initialTab
      setTab(resolveDocumentsTab(props.initialTab));
    }
  }, [props.initialTab]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [busyId, setBusyId] = useState(null);
  const docsCrud = useCrudModule('documents');
  const financesCrud = useCrudModule('finances');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const periodFiltered = Boolean(props.periodFiltered);
  const documents = rowsOf(props.documents, docsCrud, periodFiltered);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);
  const payments = rowsOf(props.payments, paymentsCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const data = useMemo(() => {
    const docs = [...documents, ...arr(props.rapports), ...arr(props.reports)].filter(Boolean);
    const tx = transactions.length ? transactions : [];
    const proofs = docs.filter(docIsProof);
    const invoiceDocs = docs.filter((d) => /facture|recu|reçu|paiement/.test(low(`${typeOf(d)} ${labelOf(d)}`)));
    const reportDocs = docs.filter(docIsReport);
    const media = docs.filter(docIsMedia);
    const templates = docs.filter((d) => /modele|modèle|template/.test(low(`${typeOf(d)} ${labelOf(d)}`)));
    const exportsList = docs.filter((d) => /export|csv|excel|pdf/.test(low(`${typeOf(d)} ${labelOf(d)}`)));
    const missingProofItems = aggregateMissingProofItems(tx, docs);
    const missingProof = missingProofItems.map((item) => tx.find((r) => r.id === item.id)).filter(Boolean);
    const missingProofAmount = missingProofItems.reduce((sum, row) => sum + row.amount, 0);
    const coveredModules = [...new Set(docs.map((d) => d.module_source || d.module || d.related_type).filter(Boolean))];
    const healthSnap = buildDocumentsHealthSnapshot({ documents: docs, transactions: tx, salesOrders });
    const coherenceRows = buildDocumentsCoherenceRows(docs, tx, salesOrders);
    const priorities = missingProofItems.slice(0, 8).map((row) => ({ id: `proof-${row.id}`, title: row.title, detail: `${String(row.date || '—').slice(0, 10)} · justificatif manquant`, amount: row.amount, trxId: row.id }));
    const history = [...docs, ...businessEvents].sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))));
    return {
      documents: docs,
      proofs,
      invoiceDocs,
      reports: reportDocs,
      media,
      templates,
      exports: exportsList,
      missingProof,
      missingProofAmount,
      coveredModules,
      priorities,
      history,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      transactions: tx,
      salesOrders,
      payments,
      animaux: arr(props.animaux),
      lots: arr(props.lots),
      cultures: arr(props.cultures),
      stocks: arr(props.stocks),
      clients: arr(props.clients),
      fournisseurs: arr(props.fournisseurs),
      businessPlans: arr(props.businessPlans),
      investissements: arr(props.investissements),
    };
  }, [documents, props.rapports, props.reports, transactions, salesOrders, payments, props.animaux, props.lots, props.cultures, props.stocks, props.clients, props.fournisseurs, props.businessPlans, props.investissements, businessEvents]);
  const actionHandlers = {
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  };
  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action IA créée');
      else { toast.success('Module ouvert'); setTab('Preuves'); }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const attachProof = async (item) => {
    setBusyId(item.id);
    try {
      await createMissingProofTask({
        transactionLabel: item.title,
        amount: fmtCurrency(item.amount),
        transactionId: item.trxId || item.id,
        handlers: actionHandlers,
      });
      toast.success(`Tâche preuve créée pour ${item.title}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const content = tab === 'Résumé' ? <Summary data={data} setTab={setTab} onApply={applyFinding} onAttachProof={attachProof} busyId={busyId} onNavigate={props.onNavigate} actionHandlers={actionHandlers} /> : tab === 'Bibliothèque' ? <Library data={data} selected={selectedDocument} setSelected={setSelectedDocument} query={libraryQuery} setQuery={setLibraryQuery} /> : tab === 'Preuves' ? <Proofs data={data} onNavigate={props.onNavigate} onAttachProof={attachProof} busyId={busyId} /> : tab === 'Rapports' ? <Reports data={data} /> : tab === 'Exports' ? <Exports data={data} onNavigate={props.onNavigate} /> : tab === 'Modèles' ? <Templates data={data} /> : <ModuleGraphiquesTab moduleId="documents_rapports" periodFiltered={periodFiltered} transactions={data.transactions} finances={data.transactions} clients={data.clients} salesOrders={data.salesOrders} payments={data.payments} onNavigate={props.onNavigate} />;
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Dossiers</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Documents & Rapports</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Bibliothèque, preuves, exports — cohérence IA finance et conformité.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div>
            <Button onClick={() => setTab('Bibliothèque')}>Bibliothèque</Button>
            <Button onClick={() => setTab('Exports')}>Exports</Button>
          </div>
        </div>
      </div>
      <Tabs active={tab} onChange={setTab} />
      {content}
    </div>
  );
}
