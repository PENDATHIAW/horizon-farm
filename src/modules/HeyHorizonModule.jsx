import { Bot, CheckCircle2, ClipboardList, Mic, Send, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import HeyHorizonDraftSummary from '../components/HeyHorizonDraftSummary.jsx';
import HeyHorizonFeedbackBar from '../components/HeyHorizonFeedbackBar.jsx';
import HorizonDraftPanel from '../components/HorizonDraftPanel.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import useHeyHorizonCommand from '../hooks/useHeyHorizonCommand.js';
import { buildRecommendationsFromData, buildAssistantJournal, loadLocalRecommendations, saveLocalRecommendation } from '../services/aiRecommendationsService';
import { createClientFollowUpTask } from '../services/heyHorizonRecommendationActions.js';
import { runErpHealthEngine } from '../services/erpHealthEngine.js';
import { isHeyHorizonLlmEnabled } from '../services/heyHorizonLlmService.js';
import { launchProductionQuestion } from '../utils/productionNavigation.js';
import { countOpenReceivables, enrichAssistantDataMap } from '../utils/assistantDataMap.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import AssistantERPInsights from './AssistantERPInsights.jsx';
import AssistantERPQuickAnswers from './AssistantERPQuickAnswers.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const n = (value = 0) => Number(value || 0);
const amount = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const open = (row = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(lower(row.status || row.statut || row.state));
const isLowStock = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock) <= n(row.seuil ?? row.threshold) && n(row.seuil ?? row.threshold) > 0;
const label = (row = {}) => row.title || row.nom || row.name || row.libelle || row.produit || row.id || 'Élément';

const QUICK_COMMANDS = [
  { title: 'Vente complète', text: 'Créer une vente de 10 poulets, livrée et payée en espèces', target: 'Commercial' },
  { title: 'Achat aliment', text: 'J\'ai acheté 10 sacs d\'aliments à 18500 le sac', target: 'Achats & Stock' },
  { title: 'Vaccin / soin', text: 'J\'ai vacciné le lot pondeuses A', target: 'Élevage' },
  { title: 'Ramassage œufs', text: 'J\'ai ramassé 120 œufs ce matin', target: 'Élevage' },
  { title: 'Mortalité lot', text: 'Mortalité de 5 sujets sur le lot chair B', target: 'Élevage' },
  { title: 'Dépense', text: 'Ajouter une dépense de 25000 FCFA carburant', target: 'Finance & Pilotage' },
  { title: 'Tâche', text: 'Créer une tâche nettoyage poulailler demain', target: 'Activité & Suivi' },
  { title: 'Utiliser stock', text: 'J\'ai utilisé 2 sacs d\'aliment pondeuse', target: 'Achats & Stock' },
];
const MODULES = ['Commercial', 'Élevage', 'Achats & Stock', 'Finance & Pilotage', 'Activité & Suivi', 'Documents & Rapports', 'Opérations & Ressources', 'Centre décisionnel'];

function Stat({ label, value, tone = 'neutral' }) { const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]'; return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>; }
function Section({ icon: Icon, title, children, action }) { return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>; }
function Pill({ children, tone = 'neutral' }) { const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'; return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>; }
function Row({ title, detail, value, tone = 'neutral', onClick }) {
  const inner = <><b className="text-[#2f2415]">{title}</b><span className="text-sm text-[#8a7456]">{detail}</span><Pill tone={tone}>{value}</Pill></>;
  const cls = 'grid grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center';
  if (onClick) return <button type="button" onClick={onClick} className={`${cls} w-full text-left hover:bg-[#fffdf8]`}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}
function Empty({ label }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>; }

function StrategicAnswerPanel({ answer, onNavigate, onRelanceClient, busyId, lastQuery, lastSource, onFeedback }) {
  if (!answer) return null;
  return (
    <Section icon={Sparkles} title={answer.title} action={<button type="button" onClick={() => onNavigate?.(answer.route)} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Ouvrir module</button>}>
      <p className="mb-4 text-sm text-[#8a7456]">{answer.summary}</p>
      <div className="divide-y divide-[#eadcc2]/70">
        {answer.rows?.length ? answer.rows.map((row) => (
          <div key={`${row.title}-${row.detail}`} className="grid grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
            <button type="button" onClick={() => onNavigate?.(row.module || answer.route)} className="grid w-full grid-cols-1 gap-2 text-left md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]">
              <b className="text-[#2f2415]">{row.title}</b>
              <span className="text-sm text-[#8a7456]">{row.detail}</span>
              <Pill tone="warn">{row.value}</Pill>
            </button>
            {answer.type === 'clients_debt' && row.orderId ? (
              <button type="button" disabled={busyId === row.orderId} onClick={() => onRelanceClient?.(row)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 disabled:opacity-50">
                {busyId === row.orderId ? 'Création…' : 'Créer relance'}
              </button>
            ) : null}
          </div>
        )) : <Empty label="Aucune donnée structurée pour cette question." />}
      </div>
      <p className="mt-3 text-xs text-emerald-800">Confiance analyse : {answer.confidence}% · Réponse basée sur les données ERP réelles.</p>
      <HeyHorizonFeedbackBar
        query={lastQuery}
        answerText={answer.summary}
        source={lastSource || (answer.type === 'llm_answer' ? 'llm' : 'rules')}
        confidence={answer.confidence}
        onFeedback={onFeedback}
      />
    </Section>
  );
}

function PilotageBanner({ count, onNavigate }) {
  if (!count) return null;
  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black text-[#2f2415]">{count} signal(aux) IA détecté(s)</p>
        <p className="text-sm text-[#8a7456]">Recommandations complètes, prévisions et cycles dans le Centre décisionnel.</p>
      </div>
      <button type="button" onClick={() => onNavigate?.('centre_ia', { tab: 'À traiter' })} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white shrink-0">
        Centre décisionnel →
      </button>
    </section>
  );
}

export default function HeyHorizonModule({
  dataMap = {},
  salesOrdersAll = [],
  paymentsAll = [],
  transactionsAll = [],
  businessEvents = [],
  businessEventsAll = [],
  periodFiltered = false,
  periodLabel = '',
  periodScope,
  onOpenAssistant,
  onNavigate,
  onCreateTask,
  onCreateAlert,
  onUpdateAlert,
  onCreateBusinessEvent,
  existingTasks = [],
  existingAlerts = [],
}) {
  const [command, setCommand] = useState('');
  const [journalTab, setJournalTab] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [lastQuery, setLastQuery] = useState('');
  const [lastSource, setLastSource] = useState('rules');
  const enrichedDataMap = useMemo(
    () => enrichAssistantDataMap(dataMap, {
      salesOrdersAll,
      paymentsAll,
      transactionsAll,
      periodFiltered,
      periodScope,
      periodLabel,
    }),
    [dataMap, salesOrdersAll, paymentsAll, transactionsAll, periodFiltered, periodScope, periodLabel],
  );
  const {
    draft,
    strategic,
    isValidating,
    runCommand,
    updateDraftField,
    cancelDraft,
    validateDraft,
  } = useHeyHorizonCommand({ dataMap: enrichedDataMap, onNavigate, allowWeakDraft: true, onCreateBusinessEvent });
  const data = useMemo(() => {
    const stocks = arr(dataMap.stock || dataMap.stocks);
    const salesAll = arr(enrichedDataMap.salesOrdersAll);
    const paymentsSnapshot = arr(enrichedDataMap.paymentsAll);
    const finances = arr(dataMap.finances || dataMap.transactions);
    const tasks = arr(dataMap.taches || dataMap.tasks);
    const alertes = arr(dataMap.alertes || dataMap.alertes_center);
    const documents = arr(dataMap.documents);
    const lowStocks = stocks.filter(isLowStock);
    const openReceivables = countOpenReceivables(salesAll, paymentsSnapshot);
    const openTasks = tasks.filter(open);
    const openAlerts = alertes.filter(open);
    const missingProof = finances.filter((row) => amount(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id);
    const aiRecommendations = buildRecommendationsFromData(enrichedDataMap);
    const health = runErpHealthEngine(enrichedDataMap);
    const proactiveFindings = health.findings.filter((f) => f.recommended_action).slice(0, 12);
    return { stocks, finances, tasks, alertes, documents, lowStocks, openReceivables, openTasks, openAlerts, missingProof, aiRecommendations, proactiveFindings, healthScore: health.score };
  }, [dataMap, enrichedDataMap]);
  const journal = useMemo(
    () => buildAssistantJournal({
      localEntries: loadLocalRecommendations(),
      businessEvents: businessEventsAll.length ? businessEventsAll : businessEvents,
    }),
    [draft, strategic, businessEvents, businessEventsAll],
  );

  const runDraft = async (text = command) => {
    const query = text || command;
    if (!String(query || '').trim()) return;
    setCommand(query);
    setLastQuery(query);
    const result = await runCommand(query, { autoOpenForm: true, navigateOnDraft: false });
    setLastSource(result?.source || 'rules');
    if (result?.kind === 'error') toast.error(result.assistantText);
    if (result?.kind === 'redirect_pilotage' && result.assistantText) {
      toast.success(result.assistantText.slice(0, 140));
    }
  };

  useEffect(() => {
    const handler = (event) => {
      const query = event.detail?.query;
      if (!query) return;
      setCommand(query);
      runCommand(query, { autoOpenForm: false, navigateOnDraft: false });
    };
    window.addEventListener('horizon-assistant-query', handler);
    return () => window.removeEventListener('horizon-assistant-query', handler);
  }, [runCommand]);
  const actionHandlers = useMemo(() => ({
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    existingTasks,
    existingAlerts,
  }), [onNavigate, onCreateTask, onCreateAlert, onUpdateAlert, onCreateBusinessEvent, existingTasks, existingAlerts]);

  const relanceClient = async (row) => {
    setBusyId(row.orderId);
    try {
      await createClientFollowUpTask({
        clientName: row.title,
        amount: row.value,
        orderId: row.orderId,
        handlers: actionHandlers,
      });
      toast.success(`Relance créée pour ${row.title}`);
    } catch (e) {
      toast.error(e.message || 'Relance impossible');
    } finally {
      setBusyId(null);
    }
  };

  const updateDraftFieldHandler = updateDraftField;

  const validateDraftHandler = async () => {
    try {
      await validateDraft();
    } catch {
      // toast handled in hook
    }
  };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm overflow-hidden relative"><div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-200/50 blur-2xl" /><div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black"><Bot size={16} /> Assistant ERP</p><h1 className="mt-2 text-3xl font-black text-[#2f2415]">Hey Horizon</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#7d6a4a]">Actions terrain : vente, vaccin, stock, œufs, tâche, dépense. Validation humaine avant écriture ERP. Les questions « quand lancer une bande ? » sont dans Élevage → Cycles et Centre décisionnel.</p>{periodLabel ? <div className="mt-3"><PeriodScopeBadge label={periodLabel} /></div> : null}{isHeyHorizonLlmEnabled() ? <p className="mt-2 text-xs font-black text-emerald-800">Mode IA : auto (complète les actions ambiguës uniquement)</p> : null}</div><button type="button" onClick={onOpenAssistant} className="rounded-2xl bg-[#2f2415] px-5 py-3 text-sm font-black text-white shadow-lg"><Mic size={17} className="inline mr-2" /> Ouvrir le panneau</button></div></section>
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-amber-900">Pilotage production & stratégie</p><p className="text-sm text-amber-800">Bandes, cycles, objectifs CA, risques — pas ici.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => launchProductionQuestion({ questionId: 'new_layer_band', onNavigate })} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Élevage → Cycles</button><button type="button" onClick={() => onNavigate?.('centre_ia', { tab: 'À traiter' })} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900">Centre décisionnel</button><button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Performance' })} className="rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-900">Objectifs</button></div></section>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-7"><Stat label="Santé ERP" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : data.healthScore >= 50 ? 'warn' : 'bad'} /><Stat label="Stocks bas" value={fmtNumber(data.lowStocks.length)} tone={data.lowStocks.length ? 'warn' : 'good'} /><Stat label="Créances" value={fmtNumber(data.openReceivables)} tone={data.openReceivables ? 'warn' : 'good'} /><Stat label="Tâches ouvertes" value={fmtNumber(data.openTasks.length)} tone={data.openTasks.length ? 'warn' : 'good'} /><Stat label="Alertes" value={fmtNumber(data.openAlerts.length)} tone={data.openAlerts.length ? 'warn' : 'good'} /><Stat label="Preuves manquantes" value={fmtNumber(data.missingProof.length)} tone={data.missingProof.length ? 'warn' : 'good'} /><Stat label="Recommandations IA" value={fmtNumber(data.proactiveFindings.length)} tone={data.proactiveFindings.length ? 'warn' : 'good'} /></div>
    <AssistantERPInsights dataMap={enrichedDataMap} onNavigate={onNavigate} />
    <PilotageBanner count={data.proactiveFindings.length} onNavigate={onNavigate} />
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-4"><label className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Action terrain</label><p className="mt-1 text-xs text-[#8a7456]">Questions stratégiques → redirection automatique vers Centre décisionnel ou Élevage Cycles.</p><div className="mt-3 flex flex-col gap-3 lg:flex-row"><textarea value={command} onChange={(event) => setCommand(event.target.value)} rows={3} placeholder="Exemple : J’ai vendu 10 poulets à Aminata, livré et payé 65 000 FCFA" className="min-h-[96px] flex-1 rounded-2xl border border-[#d6c3a0] bg-white p-4 text-sm text-[#2f2415] outline-none focus:border-emerald-400" /><div className="flex lg:flex-col gap-2"><button type="button" onClick={() => runDraft()} className="rounded-2xl bg-[#22c55e] px-4 py-3 text-sm font-black text-[#052e16]"><Send size={16} className="inline mr-1" /> Préparer</button><button type="button" onClick={onOpenAssistant} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><Mic size={16} className="inline mr-1" /> Voix</button></div></div></div></section>
    {strategic ? <StrategicAnswerPanel answer={strategic} onNavigate={onNavigate} onRelanceClient={relanceClient} busyId={busyId} lastQuery={lastQuery} lastSource={lastSource} onFeedback={(rating) => toast.success(rating === 'up' ? 'Merci pour le retour' : 'Retour enregistré — on améliorera la réponse')} /> : null}
    {draft ? (
      <Section icon={Sparkles} title="Brouillon Hey Horizon">
        <HeyHorizonDraftSummary draft={draft} />
        <div className="mt-3">
          <HorizonDraftPanel
            draft={draft}
            onChangeField={updateDraftFieldHandler}
            onValidate={validateDraftHandler}
            onCancel={cancelDraft}
            onOpenModule={onNavigate}
          />
        </div>
        <p className="mt-3 text-xs text-[#8a7456]">
          {isValidating ? 'Validation en cours…' : 'Valider enregistre directement dans l’ERP (même chemin que le panneau Hey Horizon).'}
        </p>
      </Section>
    ) : null}
    <AssistantERPQuickAnswers dataMap={enrichedDataMap} onNavigate={onNavigate} />
    <Section icon={Sparkles} title="Actions rapides terrain"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{QUICK_COMMANDS.map((item) => <button key={item.title} type="button" onClick={() => runDraft(item.text)} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-[#dcfce7]"><p className="font-black text-[#2f2415]">{item.title}</p><p className="mt-1 text-sm text-[#7d6a4a]">{item.text}</p><Pill tone="good">{item.target}</Pill></button>)}</div></Section>
    <Section icon={ClipboardList} title="Priorités détectées (terrain)"><div>{data.lowStocks.slice(0, 3).map((row) => <Row key={`stock-${row.id || label(row)}`} title={label(row)} detail="Stock sous seuil" value="Acheter" tone="warn" onClick={() => onNavigate?.('achats_stock')} />)}{data.missingProof.slice(0, 3).map((row) => <Row key={`proof-${row.id || label(row)}`} title={label(row)} detail="Justificatif manquant" value={fmtCurrency(amount(row))} tone="warn" onClick={() => onNavigate?.('documents_rapports')} />)}{!data.lowStocks.length && !data.missingProof.length ? <Empty label="Aucune alerte terrain immédiate." /> : null}</div></Section>
    <Section icon={ClipboardList} title="Journal Hey Horizon" action={<button type="button" onClick={() => setJournalTab((v) => !v)} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">{journalTab ? 'Masquer' : 'Afficher'}</button>}>{journalTab ? (journal.length ? journal.slice(0, 12).map((entry, idx) => <Row key={`${entry.saved_at}-${idx}`} title={entry.action || entry.text || 'Recommandation'} detail={`${entry.module || '—'} · ${entry.source === 'erp' ? 'ERP' : 'local'} · ${entry.saved_at ? new Date(entry.saved_at).toLocaleString('fr-FR') : '—'}`} value={entry.confidence_score ? `${entry.confidence_score}%` : entry.type === 'event' ? 'Event' : '—'} />) : <Empty label="Aucune activité enregistrée." />) : <Empty label="Journal local + événements métier assistant (tâches, validations, one-click)." />}</Section>
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Modules compris par Hey Horizon</p><div className="mt-3 flex flex-wrap gap-2">{MODULES.map((module) => <Pill key={module} tone="good"><CheckCircle2 size={13} className="inline mr-1" /> {module}</Pill>)}</div></section>
  </div>;
}
