import { BrainCircuit, ClipboardList, FolderOpen, Zap } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../../../utils/format';
import { emitHorizonForm } from '../../../services/formModalManager';
import DocumentsOrphanSyncPanel from '../../DocumentsOrphanSyncPanel.jsx';
import GreenpreneursReadinessCard from '../../../components/greenpreneurs/GreenpreneursReadinessCard.jsx';
import { isSimulatedDataModeEnabled } from '../../../utils/uiPreferences.js';
import {
  Button,
  DomainGauge,
  Empty,
  Section,
  Stat,
} from '../documentsModuleUi.jsx';

function DocumentsIaPanel({ findings = [], predictions = [], onApply, busyId, onNavigate, navigateDocuments }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <Section icon={BrainCircuit} title="Surveillance IA documentaire">
      <p className="mb-3 text-sm text-[#8a7456]">Preuves, factures, rapports et cohérence finance → documents → conformité.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Finance</button>
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

function CoherencePanel({ rows = [], onApply, busyId, navigateDocuments }) {
  if (!rows.length) return null;
  return (
    <Section icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => navigateDocuments?.(row.type === 'facture' ? 'Rapports' : 'Rapprochement & preuves')} className="text-left"><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => row.finding && onApply?.(row.finding)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">{busyId === row.id ? '…' : 'Corriger'}</button>
        </div>
      ))}
    </Section>
  );
}

export default function CentreControleTab({
  data,
  navigateDocuments,
  onApply,
  onAttachProof,
  busyId,
  onNavigate,
  actionHandlers,
  greenpreneursExtras = {},
}) {
  const greenpreneursDataMap = {
    documents: data.documents,
    transactions: data.transactions,
    finances: data.transactions,
    sales_orders: data.salesOrders,
    payments: data.payments,
    stocks: data.stocks,
    cultures: data.cultures,
    animaux: data.animaux,
    avicole: data.lots,
    business_events: data.businessEvents,
    clients: data.clients,
    fournisseurs: data.fournisseurs,
    business_plans: data.businessPlans,
    investissements: data.investissements,
    ...greenpreneursExtras,
  };

  return (
    <div className="space-y-5">
      <GreenpreneursReadinessCard
        dataMap={greenpreneursDataMap}
        simulatedMode={isSimulatedDataModeEnabled()}
        compact
        onNavigate={onNavigate}
      />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Santé docs" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Documents" value={fmtNumber(data.documents.length)} />
        <Stat label="Preuves" value={fmtNumber(data.proofs.length)} tone="good" />
        <Stat label="Sans preuve" value={fmtNumber(data.missingProof.length)} tone={data.missingProof.length ? 'warn' : 'good'} />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {data.domainCoverage.map((domain) => (
          <DomainGauge key={domain.key} label={domain.label} pct={domain.pct} gapCount={domain.gaps} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Rapports" value={fmtNumber(data.reports.length)} />
        <Stat label="Montant à justifier" value={fmtCurrency(data.missingProofAmount)} tone={data.missingProofAmount ? 'warn' : 'good'} />
        <Stat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
        <Stat label="Écarts détectés" value={fmtNumber(data.gaps.length)} tone={data.gaps.length ? 'warn' : 'good'} />
      </div>
      <DocumentsIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} onNavigate={onNavigate} navigateDocuments={navigateDocuments} />
      <DocumentsOrphanSyncPanel documents={data.documents} onApply={onApply} busyId={busyId} setTab={navigateDocuments} onNavigate={onNavigate} actionHandlers={actionHandlers} />
      <CoherencePanel rows={data.coherenceRows} onApply={onApply} busyId={busyId} navigateDocuments={navigateDocuments} />
      <Section icon={ClipboardList} title="Priorités documentaires" action={<Button onClick={() => navigateDocuments('Rapprochement & preuves')}>Voir rapprochement</Button>}>
        {data.priorities.length ? data.priorities.map((item) => (
          <div key={item.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => navigateDocuments('Rapprochement & preuves')} className="text-left"><b className="text-[#2f2415]">{item.title}</b><p className="text-xs text-[#8a7456]">{item.detail}</p></button>
            <button type="button" disabled={busyId === item.id} onClick={() => onAttachProof?.(item)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === item.id ? '…' : 'Créer tâche preuve'}</button>
          </div>
        )) : <Empty label="Aucune priorité documentaire." />}
      </Section>
      <Section icon={FolderOpen} title="Accès rapides">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => { emitHorizonForm('documents', 'supplier_invoice', 'Joindre facture', { date: new Date().toISOString().slice(0, 10) }); navigateDocuments('Gestionnaire & OCR'); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Document</b><p className="mt-1 text-sm text-[#8a7456]">Facture, reçu, preuve.</p></button>
          <button type="button" onClick={() => navigateDocuments('Gestionnaire & OCR')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Bibliothèque & OCR</b><p className="mt-1 text-sm text-[#8a7456]">Scanner et importer.</p></button>
          <button type="button" onClick={() => onNavigate?.('finance_pilotage', { tab: 'Trésorerie' })} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left"><b className="text-[#2f2415]">Finance sans preuve</b><p className="mt-1 text-sm text-amber-800">{fmtNumber(data.missingProof.length)} transaction(s)</p></button>
          <button type="button" onClick={() => navigateDocuments('Rapports & exports')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Rapports & exports</b><p className="mt-1 text-sm text-[#8a7456]">Dossier financeur PDF.</p></button>
        </div>
      </Section>
    </div>
  );
}
