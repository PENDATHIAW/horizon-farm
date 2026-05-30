import { Bot, CheckCircle2, ClipboardList, Mic, Send, Sparkles, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { buildRecommendationsFromData, draftToFormRequest, loadLocalRecommendations, saveLocalRecommendation } from '../services/aiRecommendationsService';
import { detectStrategicQuery, buildStrategicAnswer } from '../services/heyHorizonStrategicAnswers.js';
import { openFormModal } from '../services/formModalManager';
import { fmtCurrency, fmtNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const n = (value = 0) => Number(value || 0);
const amount = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const open = (row = {}) => !['termine', 'terminé', 'done', 'closed', 'clos', 'resolu', 'résolu'].includes(lower(row.status || row.statut || row.state));
const isLowStock = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock) <= n(row.seuil ?? row.threshold) && n(row.seuil ?? row.threshold) > 0;
const label = (row = {}) => row.title || row.nom || row.name || row.libelle || row.produit || row.id || 'Élément';
const moneyInText = (text = '') => { const matches = String(text).replace(/\s/g, '').match(/\d{4,}/g); return matches?.[0] ? Number(matches[0]) : null; };
const qtyInText = (text = '') => { const matches = String(text).match(/\b\d+\b/g); return matches?.[0] ? Number(matches[0]) : null; };

const QUICK_COMMANDS = [
  { title: 'Créances clients', text: 'Quels clients me doivent de l\'argent ?', target: 'Commercial' },
  { title: 'Lots rentables', text: 'Quels sont mes lots les moins rentables ?', target: 'Élevage' },
  { title: 'Baisse de marge', text: 'Pourquoi ma marge baisse ?', target: 'Finance & Pilotage' },
  { title: 'Coût équipements', text: 'Quels équipements coûtent le plus cher ?', target: 'Opérations & Ressources' },
  { title: 'Risques du mois', text: 'Quels sont mes risques du mois ?', target: 'Vision & Croissance' },
  { title: 'Vente complète', text: 'Créer une vente de 10 poulets, livrée et payée en espèces', target: 'Commercial' },
  { title: 'Achat aliment', text: 'J\'ai acheté 10 sacs d\'aliments à 18500 le sac', target: 'Achats & Stock' },
  { title: 'Preuves finance', text: 'Afficher les dépenses sans justificatif', target: 'Documents & Rapports' },
];
const MODULES = ['Commercial', 'Élevage', 'Achats & Stock', 'Finance & Pilotage', 'Activité & Suivi', 'Documents & Rapports', 'Opérations & Ressources', 'Vision & Croissance'];

function Stat({ label, value, tone = 'neutral' }) { const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]'; return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>; }
function Section({ icon: Icon, title, children, action }) { return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>; }
function Pill({ children, tone = 'neutral' }) { const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'; return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>; }
function Row({ title, detail, value, tone = 'neutral' }) { return <div className="grid grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center"><b className="text-[#2f2415]">{title}</b><span className="text-sm text-[#8a7456]">{detail}</span><Pill tone={tone}>{value}</Pill></div>; }
function Empty({ label }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>; }

function inferIntent(text) {
  const query = lower(text);
  if (/vente|vendu|client|payer|payé|livrer|facture/.test(query)) return { type: 'vente', module: 'Commercial', action: 'Préparer une vente complète', route: 'commercial', confidence: 0.88 };
  if (/panne|maintenance|tracteur|equipement|équipement|capteur|camera|caméra/.test(query)) return { type: 'maintenance', module: 'Opérations & Ressources', action: 'Préparer une intervention maintenance', route: 'equipements', confidence: 0.82 };
  if (/stock|acheter|achat|fournisseur|aliment|seuil|rupture/.test(query)) return { type: 'achat_stock', module: 'Achats & Stock', action: 'Préparer un mouvement stock ou un achat', route: 'achats_stock', confidence: 0.85 };
  if (/animal|bovin|ovin|caprin|pondeuse|chair|vaccin|malade|mortalité|santé/.test(query)) return { type: 'elevage', module: 'Élevage', action: 'Préparer une action élevage', route: 'elevage', confidence: 0.84 };
  if (/dépense|recette|finance|paiement|justificatif|preuve|compta|invest/.test(query)) return { type: 'finance', module: 'Finance & Pilotage', action: 'Préparer une action financière', route: 'finance_pilotage', confidence: 0.83 };
  if (/tâche|alerte|retard|suivi|historique|trace/.test(query)) return { type: 'suivi', module: 'Activité & Suivi', action: 'Préparer une action de suivi', route: 'activite_suivi', confidence: 0.8 };
  if (/rapport|document|facture|reçu|export|preuve/.test(query)) return { type: 'document', module: 'Documents & Rapports', action: 'Préparer un document ou un rapport', route: 'documents_rapports', confidence: 0.79 };
  return { type: 'decision', module: 'Vision & Croissance', action: 'Analyser et proposer une décision', route: 'centre_ia', confidence: 0.65 };
}

function buildDraft(text) {
  const intent = inferIntent(text);
  const qte = qtyInText(text);
  const montant = moneyInText(text);
  const scenarios = {
    vente: { fiches: ['Commande / vente', 'Ligne de vente', 'Livraison', 'Paiement', 'Facture', 'Transaction finance', 'Événement métier'], champs: ['Client', 'Produit vendu', 'Quantité', 'Prix unitaire', 'Mode paiement', 'Statut livraison'], impacts: ['Commercial', 'Stock ou production', 'Finance', 'Documents', 'Historique'] },
    achat_stock: { fiches: ['Achat', 'Entrée stock', 'Fournisseur', 'Dépense finance', 'Document preuve', 'Événement métier'], champs: ['Produit', 'Quantité', 'Prix unitaire', 'Fournisseur', 'Mode paiement', 'Justificatif'], impacts: ['Stock', 'Finance', 'Fournisseurs', 'Documents', 'Alertes seuil'] },
    elevage: { fiches: ['Action élevage', 'Tâche', 'Santé ou lot', 'Événement métier'], champs: ['Animal ou lot', 'Type action', 'Date', 'Responsable', 'Coût éventuel'], impacts: ['Élevage', 'Activité', 'Finance si coût', 'Historique'] },
    maintenance: { fiches: ['Panne / maintenance', 'Tâche urgente', 'Alerte', 'Dépense éventuelle', 'Événement métier'], champs: ['Équipement', 'Panne', 'Priorité', 'Responsable', 'Coût estimé'], impacts: ['Équipements', 'Activité', 'Finance', 'Audit'] },
    finance: { fiches: ['Transaction finance', 'Preuve/document', 'Événement métier'], champs: ['Type', 'Montant', 'Catégorie', 'Date', 'Justificatif'], impacts: ['Finance', 'Documents', 'Pilotage'] },
    suivi: { fiches: ['Tâche', 'Alerte', 'Événement métier'], champs: ['Sujet', 'Priorité', 'Échéance', 'Module lié'], impacts: ['Activité', 'Module source', 'Historique'] },
    document: { fiches: ['Document', 'Lien transaction', 'Tâche de conformité'], champs: ['Type document', 'Module lié', 'Transaction liée', 'Statut preuve'], impacts: ['Documents', 'Finance', 'Audit'] },
    decision: { fiches: ['Analyse décisionnelle', 'Plan d’action', 'Risque ou opportunité'], champs: ['Objectif', 'Horizon', 'Budget', 'Impact attendu'], impacts: ['Vision', 'Finance', 'Activité'] },
  };
  const scenario = scenarios[intent.type] || scenarios.decision;
  const confidence_score = Math.round((intent.confidence + (qte || montant ? 0.08 : 0)) * 100);
  return { text, ...intent, ...scenario, estimation: { qte, montant }, confidence_score, pret: false };
}

function DraftPreview({ draft, onNavigate, onPrefill }) {
  return <Section icon={Wand2} title="Fiche ERP préparée" action={<div className="flex flex-wrap gap-2"><button type="button" onClick={onPrefill} className="rounded-xl bg-[#22c55e] px-3 py-2 text-xs font-black text-[#052e16]">Préremplir formulaire</button><button type="button" onClick={() => onNavigate?.(draft.route)} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Ouvrir {draft.module}</button></div>}>
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Module</p><p className="mt-1 font-black text-[#2f2415]">{draft.module}</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Action proposée</p><p className="mt-1 font-black text-[#2f2415]">{draft.action}</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Confiance IA</p><p className="mt-1 font-black text-[#2f2415]">{draft.confidence_score}%</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Estimation</p><p className="mt-1 font-black text-[#2f2415]">{draft.estimation.qte ? `${draft.estimation.qte} unité(s)` : 'Quantité à confirmer'} · {draft.estimation.montant ? fmtCurrency(draft.estimation.montant) : 'Montant à confirmer'}</p></div></div>
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3"><div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Fiches à créer</p><div className="mt-3 flex flex-wrap gap-2">{draft.fiches.map((item) => <Pill key={item} tone="good">{item}</Pill>)}</div></div><div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Champs à confirmer</p><div className="mt-3 flex flex-wrap gap-2">{draft.champs.map((item) => <Pill key={item}>{item}</Pill>)}</div></div><div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><p className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Impacts ERP</p><div className="mt-3 flex flex-wrap gap-2">{draft.impacts.map((item) => <Pill key={item} tone="good">{item}</Pill>)}</div></div></div>
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Validation humaine obligatoire : Hey Horizon prépare le formulaire prérempli. Tu confirmes avant toute création ERP.</div>
  </Section>;
}

function StrategicAnswerPanel({ answer, onNavigate }) {
  if (!answer) return null;
  return (
    <Section icon={Sparkles} title={answer.title} action={<button type="button" onClick={() => onNavigate?.(answer.route)} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Ouvrir module</button>}>
      <p className="mb-4 text-sm text-[#8a7456]">{answer.summary}</p>
      <div className="divide-y divide-[#eadcc2]/70">
        {answer.rows?.length ? answer.rows.map((row) => (
          <button key={`${row.title}-${row.detail}`} type="button" onClick={() => onNavigate?.(row.module || answer.route)} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]">
            <b className="text-[#2f2415]">{row.title}</b>
            <span className="text-sm text-[#8a7456]">{row.detail}</span>
            <Pill tone="warn">{row.value}</Pill>
          </button>
        )) : <Empty label="Aucune donnée structurée pour cette question." />}
      </div>
      <p className="mt-3 text-xs text-emerald-800">Confiance analyse : {answer.confidence}% · Réponse basée sur les données ERP réelles.</p>
    </Section>
  );
}

export default function HeyHorizonModule({ dataMap = {}, onOpenAssistant, onNavigate }) {
  const [command, setCommand] = useState('');
  const [draft, setDraft] = useState(null);
  const [strategic, setStrategic] = useState(null);
  const [journalTab, setJournalTab] = useState(false);
  const data = useMemo(() => {
    const stocks = arr(dataMap.stock || dataMap.stocks);
    const sales = arr(dataMap.sales_orders || dataMap.salesOrders);
    const finances = arr(dataMap.finances || dataMap.transactions);
    const tasks = arr(dataMap.taches || dataMap.tasks);
    const alertes = arr(dataMap.alertes || dataMap.alertes_center);
    const documents = arr(dataMap.documents);
    const lowStocks = stocks.filter(isLowStock);
    const unpaid = finances.filter((row) => ['impaye', 'impayé', 'partiel', 'a_payer'].includes(lower(row.statut || row.status || row.payment_status)));
    const openTasks = tasks.filter(open);
    const openAlerts = alertes.filter(open);
    const missingProof = finances.filter((row) => amount(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id);
    const aiRecommendations = buildRecommendationsFromData(dataMap);
    return { stocks, sales, finances, tasks, alertes, documents, lowStocks, unpaid, openTasks, openAlerts, missingProof, aiRecommendations };
  }, [dataMap]);
  const journal = useMemo(() => loadLocalRecommendations(), [draft]);
  const runDraft = (text = command) => {
    const query = text || command;
    setCommand(query);
    const strategicType = detectStrategicQuery(query);
    if (strategicType) {
      const answer = buildStrategicAnswer(strategicType, dataMap);
      setStrategic(answer);
      setDraft(null);
      saveLocalRecommendation({ type: 'strategic', text: query, module: answer.route, confidence_score: answer.confidence, action: answer.title });
      return;
    }
    setStrategic(null);
    const next = buildDraft(query);
    setDraft(next);
    saveLocalRecommendation({ type: 'draft', text: query, module: next.module, confidence_score: next.confidence_score, action: next.action });
  };
  const prefillForm = () => {
    if (!draft) return;
    const req = draftToFormRequest(draft);
    openFormModal(req);
    onNavigate?.(draft.route);
  };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-6 shadow-sm overflow-hidden relative"><div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-emerald-200/50 blur-2xl" /><div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black"><Bot size={16} /> Assistant ERP</p><h1 className="mt-2 text-3xl font-black text-[#2f2415]">Hey Horizon</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#7d6a4a]">Détection d'intention, score de confiance, préremplissage formulaire et journal des recommandations — validation humaine obligatoire.</p></div><button type="button" onClick={onOpenAssistant} className="rounded-2xl bg-[#2f2415] px-5 py-3 text-sm font-black text-white shadow-lg"><Mic size={17} className="inline mr-2" /> Ouvrir le panneau</button></div></section>
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-6"><Stat label="Stocks bas" value={fmtNumber(data.lowStocks.length)} tone={data.lowStocks.length ? 'warn' : 'good'} /><Stat label="Impayés" value={fmtNumber(data.unpaid.length)} tone={data.unpaid.length ? 'warn' : 'good'} /><Stat label="Tâches ouvertes" value={fmtNumber(data.openTasks.length)} tone={data.openTasks.length ? 'warn' : 'good'} /><Stat label="Alertes" value={fmtNumber(data.openAlerts.length)} tone={data.openAlerts.length ? 'warn' : 'good'} /><Stat label="Preuves manquantes" value={fmtNumber(data.missingProof.length)} tone={data.missingProof.length ? 'warn' : 'good'} /><Stat label="Recommandations IA" value={fmtNumber(data.aiRecommendations.length)} tone={data.aiRecommendations.length ? 'warn' : 'good'} /></div>
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="rounded-3xl border border-[#eadcc2] bg-[#fffdf8] p-4"><label className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Demander à Hey Horizon</label><div className="mt-3 flex flex-col gap-3 lg:flex-row"><textarea value={command} onChange={(event) => setCommand(event.target.value)} rows={3} placeholder="Exemple : J’ai vendu 10 poulets à Aminata, livré et payé 65 000 FCFA" className="min-h-[96px] flex-1 rounded-2xl border border-[#d6c3a0] bg-white p-4 text-sm text-[#2f2415] outline-none focus:border-emerald-400" /><div className="flex lg:flex-col gap-2"><button type="button" onClick={() => runDraft()} className="rounded-2xl bg-[#22c55e] px-4 py-3 text-sm font-black text-[#052e16]"><Send size={16} className="inline mr-1" /> Préparer</button><button type="button" onClick={onOpenAssistant} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#2f2415]"><Mic size={16} className="inline mr-1" /> Voix</button></div></div></div></section>
    {strategic ? <StrategicAnswerPanel answer={strategic} onNavigate={onNavigate} /> : null}
    {draft ? <DraftPreview draft={draft} onNavigate={onNavigate} onPrefill={prefillForm} /> : null}
    <Section icon={Sparkles} title="Actions rapides"><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{QUICK_COMMANDS.map((item) => <button key={item.title} type="button" onClick={() => runDraft(item.text)} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left hover:bg-[#dcfce7]"><p className="font-black text-[#2f2415]">{item.title}</p><p className="mt-1 text-sm text-[#7d6a4a]">{item.text}</p><Pill tone="good">{item.target}</Pill></button>)}</div></Section>
    <Section icon={ClipboardList} title="Informations utiles détectées"><div>{data.lowStocks.slice(0, 4).map((row) => <Row key={`stock-${row.id || label(row)}`} title={label(row)} detail="Stock sous seuil" value="Acheter" tone="warn" />)}{data.missingProof.slice(0, 4).map((row) => <Row key={`proof-${row.id || label(row)}`} title={label(row)} detail="Justificatif manquant" value={fmtCurrency(amount(row))} tone="warn" />)}{data.aiRecommendations.slice(0, 4).map((row) => <Row key={row.id} title={row.title} detail={row.action_recommandee} value={`${row.confidence_score}%`} tone="warn" />)}{!data.lowStocks.length && !data.missingProof.length && !data.aiRecommendations.length ? <Empty label="Aucune priorité automatique détectée." /> : null}</div></Section>
    <Section icon={ClipboardList} title="Journal des recommandations IA" action={<button type="button" onClick={() => setJournalTab((v) => !v)} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black">{journalTab ? 'Masquer' : 'Afficher'}</button>}>{journalTab ? (journal.length ? journal.slice(0, 12).map((entry, idx) => <Row key={`${entry.saved_at}-${idx}`} title={entry.action || entry.text || 'Recommandation'} detail={`${entry.module || '—'} · ${entry.saved_at ? new Date(entry.saved_at).toLocaleString('fr-FR') : '—'}`} value={entry.confidence_score ? `${entry.confidence_score}%` : '—'} />) : <Empty label="Aucune recommandation enregistrée." />) : <Empty label="Le journal enregistre chaque analyse Hey Horizon avec score de confiance." />}</Section>
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Modules compris par Hey Horizon</p><div className="mt-3 flex flex-wrap gap-2">{MODULES.map((module) => <Pill key={module} tone="good"><CheckCircle2 size={13} className="inline mr-1" /> {module}</Pill>)}</div></section>
  </div>;
}
