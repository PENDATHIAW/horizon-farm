import { Bot, CheckCircle2, Ear, Mic, RefreshCw, Send, Sparkles, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HorizonDraftPanel from './HorizonDraftPanel';
import HorizonWakeAnimation from './HorizonWakeAnimation';
import { useAppData } from '../context/AppContext';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { supabase } from '../lib/supabase';
import { interpretHorizonCommand, parseConversationControl, updateHorizonDraft } from '../services/aiIntentEngine';
import { interpretVoiceCommand } from '../services/voiceCommands';
import { searchERP } from '../services/globalSearchService';

const moduleLabel = (key = '') => ({ dashboard: 'Accueil', ventes: 'Ventes', finances: 'Finances', clients: 'Clients', stock: 'Stock', sante: 'Santé', avicole: 'Avicole', animaux: 'Animaux', cultures: 'Cultures', documents: 'Documents', taches: 'Tâches', alertes: 'Alertes', sync_activity: 'Vérifications', impact_business: 'Impact & Valeur', fournisseurs: 'Fournisseurs', tracabilite: 'Traçabilité', centre_ia: 'Centre IA', rapports: 'Rapports', equipements: 'Équipements', smartfarm: 'Smart Farm' }[key] || 'Espace lié');
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const hasWakeWord = (value = '') => { const text = normalize(value); return text.includes('hey horizon') || text.includes('he horizon') || text.includes('horizon'); };
const stripWakeWord = (value = '') => normalize(value).replace(/\b(hey|he|eh|e)\s+horizon\b/g, '').replace(/\bhorizon\b/g, '').trim();
const isWeakDraft = (draft = {}, text = '') => {
  const cleaned = normalize(text);
  if (!draft || draft.status === 'unsupported') return true;
  if (draft.primary_module !== 'ventes') return false;
  return !/(vend|vente|vends|client|paiement|paye|payé|commande|livr|facture|poulet|chair|oeuf|œuf|tablette)/.test(cleaned);
};
const QUICK_ACTIONS = [
  { label: 'Créer vente', text: 'Créer une vente', module: 'ventes' },
  { label: 'Vaccin / soin', text: 'J’ai vacciné ', module: 'sante' },
  { label: 'Ramassage œufs', text: 'J’ai ramassé ', module: 'avicole' },
  { label: 'Utiliser stock', text: 'J’ai utilisé ', module: 'stock' },
  { label: 'Mortalité', text: 'Mortalité de ', module: 'avicole' },
  { label: 'Dépense', text: 'Ajouter une dépense de ', module: 'finances' },
  { label: 'Tâche', text: 'Créer une tâche ', module: 'taches' },
  { label: 'Rapport', text: 'Générer un rapport ', module: 'rapports' },
];
const REFRESH_KEYS_BY_MODULE = {
  dashboard: ['animaux', 'avicole', 'sante', 'finances', 'stock', 'clients', 'fournisseurs', 'cultures', 'taches', 'alertes_center', 'business_events', 'sales_orders', 'payments'], centre_ia: ['stock', 'finances', 'avicole', 'animaux', 'cultures', 'alertes_center', 'business_events', 'sales_orders', 'payments', 'sensor_devices', 'camera_devices'], stock: ['stock', 'alimentation_logs', 'business_events'], finances: ['finances', 'payments', 'business_events'], fournisseurs: ['fournisseurs', 'finances', 'stock', 'business_events'], clients: ['clients', 'sales_orders', 'payments', 'business_events'], ventes: ['sales_orders', 'sales_order_items', 'deliveries', 'invoices', 'payments', 'stock', 'clients', 'business_events'], animaux: ['animaux', 'sante', 'alimentation_logs', 'sales_opportunities', 'business_events'], avicole: ['avicole', 'production_oeufs_logs', 'alimentation_logs', 'sales_opportunities', 'business_events'], sante: ['sante', 'veterinaires', 'stock', 'finances', 'taches', 'business_events'], cultures: ['cultures', 'stock', 'finances', 'sales_opportunities', 'business_events'], documents: ['documents', 'finances', 'sales_orders', 'business_events'], taches: ['taches', 'alertes_center', 'business_events'], alertes: ['alertes_center', 'whatsapp_logs', 'taches', 'business_events'], tracabilite: ['tracabilite', 'business_events'], smartfarm: ['sensor_devices', 'camera_devices', 'alertes_center', 'taches', 'business_events'], equipements: ['equipements', 'taches', 'finances', 'documents', 'business_events'], rh: ['finances', 'taches', 'business_events'],
};
const buildRefreshKeys = (result = {}, draft = {}) => { const modules = new Set([...(result.impacted_modules || []), draft.primary_module, 'dashboard', 'centre_ia', 'alertes', 'tracabilite'].filter(Boolean)); const keys = new Set(); modules.forEach((module) => (REFRESH_KEYS_BY_MODULE[module] || [module]).forEach((key) => keys.add(key))); return [...keys]; };

function DraftSummary({ draft }) {
  if (!draft || draft.status === 'unsupported') return null;
  const fields = draft.draft_fields || {};
  const missing = draft.missing_fields || [];
  const impacted = (draft.impacted_modules || []).map(moduleLabel).filter(Boolean);
  const action = draft.intent_label || draft.intent || draft.action || 'Action ERP';
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
    <p className="flex items-center gap-2 font-black"><CheckCircle2 size={15} /> Ce que Horizon a compris</p>
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      <span><b>Action :</b> {action}</span>
      <span><b>Module :</b> {moduleLabel(draft.primary_module)}</span>
      {fields.entity_id || fields.target_id || fields.source_id ? <span><b>Cible :</b> {fields.entity_id || fields.target_id || fields.source_id}</span> : null}
      {fields.date || fields.event_date ? <span><b>Date :</b> {fields.date || fields.event_date}</span> : null}
      {impacted.length ? <span className="sm:col-span-2"><b>Impacts :</b> {impacted.join(', ')}</span> : null}
    </div>
    {missing.length ? <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><b>À compléter :</b> {missing.join(', ')}</p> : null}
  </div>;
}

export default function AssistantPanel({ open, onClose, dataMap, onNavigate }) {
  const [localOpen, setLocalOpen] = useState(false);
  const [wakeState, setWakeState] = useState('idle');
  const [terrainMode, setTerrainMode] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hey Horizon est prêt. Dis ou écris une action simple : vente, vaccin, œufs, stock, tâche, dépense…' }]);
  const silenceTimerRef = useRef(null);
  const lastHeardRef = useRef('');
  const speech = useSpeechSynthesis();
  const { refreshModule } = useAppData();
  const voice = useVoiceRecognition({ continuous: terrainMode, autoRestart: terrainMode, onInterim: (text) => { if (!text) return; if (hasWakeWord(text) && wakeState === 'idle') wakeHorizon(); if (terrainMode && wakeState === 'idle') setWakeState('listening'); setLocalOpen(true); setQuery(stripWakeWord(text) || text); scheduleSilenceProcessing(text); }, onResult: (text) => { if (!text) return; if (hasWakeWord(text) && wakeState === 'idle') wakeHorizon(); setLocalOpen(true); scheduleSilenceProcessing(text); } });

  const wakeHorizon = () => {
    setWakeState('wake_detected');
    window.setTimeout(() => setWakeState('circuit'), 120);
    window.setTimeout(() => setWakeState('sun'), 1450);
    window.setTimeout(() => { setWakeState('idle'); setLocalOpen(true); }, 3000);
  };
  const buildAssistantTextFromDraft = (nextDraft) => {
    if (!nextDraft || nextDraft.status === 'unsupported') return null;
    const missing = nextDraft.missing_fields || [];
    const impacted = (nextDraft.impacted_modules || []).map(moduleLabel).join(', ');
    if (missing.length) return `J’ai compris l’action. Il reste ${missing.length} champ(s) à compléter. Modules concernés : ${impacted || moduleLabel(nextDraft.primary_module)}.`;
    if (nextDraft.next_required_form) return `J’ai compris, mais un formulaire lié est requis : ${nextDraft.next_required_form.title}.`;
    return `Action prête à valider. Modules concernés : ${impacted || moduleLabel(nextDraft.primary_module)}.`;
  };
  const refreshImpactedModules = async (result, validatedDraft) => { const keys = buildRefreshKeys(result, validatedDraft); if (!keys.length) return; await Promise.allSettled(keys.map((key) => refreshModule(key))); toast.success(`Modules rafraîchis : ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`); };
  const validateDraft = async () => {
    if (!draft || isValidating) return;
    setIsValidating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch('/api/assistant/validate', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ draft, confirmed: true, execute: true, user_id: sessionData?.session?.user?.id || null }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.execution?.results?.find?.((item) => item.error)?.error || 'Validation impossible');
      const message = result.message || 'Action exécutée.';
      setMessages((prev) => [...prev, { role: 'assistant', text: message }]);
      speech.speak(message);
      toast.success(result.executed ? 'Action exécutée' : 'Action préparée');
      await refreshImpactedModules(result, draft);
      window.dispatchEvent(new CustomEvent('horizon-assistant-executed', { detail: result }));
      if (draft.primary_module) onNavigate?.(draft.primary_module);
      setDraft(null);
    } catch (error) { const message = `Je n’ai pas pu valider : ${error.message}`; setMessages((prev) => [...prev, { role: 'assistant', text: message }]); toast.error(error.message); }
    finally { setIsValidating(false); }
  };
  const cancelDraft = (reason = 'Action annulée.') => { setDraft(null); setQuery(''); lastHeardRef.current = ''; setMessages((prev) => [...prev, { role: 'assistant', text: reason }]); speech.speak(reason); };
  const resetConversation = () => { speech.stop(); setDraft(null); lastHeardRef.current = ''; setMessages([{ role: 'assistant', text: 'Nouvelle demande ouverte. Dis une action simple ou choisis un raccourci.' }]); setQuery(''); };
  const loadExternalDraft = (nextDraft, sourceLabel = 'Centre IA') => { if (!nextDraft) return; setDraft(nextDraft); setLocalOpen(true); setWakeState('idle'); const text = `${sourceLabel} a préparé une action. Vérifie, complète si besoin, puis valide.`; setMessages((prev) => [...prev, { role: 'assistant', text }]); speech.speak(text); };
  const processCommand = (rawText, { fromSilence = false } = {}) => {
    const cleaned = stripWakeWord(rawText || '').trim();
    if (!cleaned) return;
    const control = parseConversationControl(cleaned);
    if (control === 'validate') { validateDraft(); setQuery(''); return; }
    if (control === 'cancel') { cancelDraft(); return; }
    if (control === 'reset') { resetConversation(); return; }
    setIsThinking(true); window.setTimeout(() => setIsThinking(false), 700);
    const nextDraft = draft ? updateHorizonDraft(draft, cleaned, dataMap) : interpretHorizonCommand(cleaned, dataMap);
    const weak = isWeakDraft(nextDraft, cleaned);
    const draftText = weak ? null : buildAssistantTextFromDraft(nextDraft);
    const fallback = interpretVoiceCommand(cleaned, dataMap);
    const assistantText = draftText || fallback.answer || 'Je n’ai pas assez compris. Choisis une action rapide ou précise : vente, vaccin, stock, œufs, tâche, dépense.';
    setMessages((prev) => [...prev, { role: 'user', text: cleaned }, { role: 'assistant', text: assistantText }]);
    if (draftText) { setDraft(nextDraft); if (nextDraft.primary_module) onNavigate?.(nextDraft.primary_module); speech.speak(draftText); }
    else { setDraft(null); if (fallback.moduleKey && fallback.moduleKey !== 'ventes') onNavigate?.(fallback.moduleKey); speech.speak(assistantText); }
    setQuery('');
    if (fromSilence && terrainMode && voice.supported && !voice.listening) window.setTimeout(() => voice.start(), 900);
  };
  const scheduleSilenceProcessing = (text) => { const cleaned = stripWakeWord(text || '').trim(); if (!cleaned || cleaned === lastHeardRef.current) return; lastHeardRef.current = cleaned; window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = window.setTimeout(() => processCommand(cleaned, { fromSilence: true }), 1400); };

  useEffect(() => { if (!terrainMode) { voice.stop(); return; } if (!voice.listening) voice.start(); }, [terrainMode]);
  useEffect(() => () => window.clearTimeout(silenceTimerRef.current), []);
  useEffect(() => { const handler = (event) => loadExternalDraft(event.detail?.draft, event.detail?.sourceLabel || 'Centre IA'); window.addEventListener('horizon-open-draft', handler); return () => window.removeEventListener('horizon-open-draft', handler); }, [speech, onNavigate]);

  const results = useMemo(() => searchERP(dataMap, query).slice(0, 4), [dataMap, query]);
  const panelOpen = open || localOpen;
  const toggleTerrainMode = () => {
    if (!voice.supported) { toast.error('Reconnaissance vocale non supportée ici'); setLocalOpen(true); setMessages((prev) => [...prev, { role: 'assistant', text: voice.hint || 'Utilise le champ texte : la reconnaissance vocale n’est pas disponible dans ce navigateur.' }]); return; }
    setTerrainMode((prev) => { const next = !prev; if (next) { setLocalOpen(true); setWakeState('idle'); toast.success('Micro Horizon activé. Parle puis marque une pause.'); window.setTimeout(() => voice.start(), 250); } else { voice.stop(); toast('Micro Horizon désactivé.'); } return next; });
  };
  const toggleVoiceReplies = () => { if (!speech.supported) return toast.error('Réponse vocale non disponible ici'); if (speech.enabled) { speech.disable(); toast.success('Réponses vocales désactivées'); return; } speech.enable(); speech.test(); toast.success('Réponses vocales activées'); };
  const updateDraftField = (key, value) => setDraft((current) => current ? { ...current, draft_fields: { ...(current.draft_fields || {}), [key]: value }, missing_fields: (current.missing_fields || []).filter((field) => field !== key) } : current);
  const closePanel = () => { speech.stop(); setLocalOpen(false); setWakeState('idle'); onClose?.(); };
  const quickAction = (item) => { setLocalOpen(true); setQuery(item.text); onNavigate?.(item.module); setMessages((prev) => [...prev, { role: 'assistant', text: `D’accord. Je prépare : ${item.label}. Complète la phrase ou parle.` }]); };

  return <>
    <HorizonWakeAnimation state={wakeState} onClose={() => setWakeState('idle')} />
    {panelOpen ? <aside className="fixed right-4 top-[72px] z-50 w-[min(470px,calc(100vw-2rem))] max-h-[calc(100vh-90px)] bg-white/96 backdrop-blur border border-[#d6c3a0] rounded-3xl shadow-2xl overflow-hidden max-md:top-auto max-md:bottom-[92px] max-md:right-3 max-md:left-3 max-md:w-auto max-md:max-h-[calc(100vh-170px)]">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex items-center gap-3 bg-[#fffdf8]">
        <div className="w-11 h-11 rounded-full bg-amber-100 text-[#9a6b12] flex items-center justify-center border border-amber-200 shadow-inner"><Sun size={22} /></div>
        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-black text-[#2f2415]">Hey Horizon</p><span className="rounded-full bg-[#2f2415] px-2 py-0.5 text-[10px] font-black text-white">Assistant global</span>{voice.listening ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"><Ear size={10} className="inline" /> écoute</span> : null}</div><p className="text-xs text-[#8a7456]">Parle ou écris une action. Horizon choisit le bon module.</p></div>
        <button type="button" onClick={resetConversation} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Nouvelle demande"><RefreshCw size={16} /></button>
        <button type="button" onClick={closePanel} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Fermer"><X size={16} /></button>
      </div>
      <div className="p-3 border-b border-[#eadcc2] bg-white space-y-3">
        <div className="flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') processCommand(query); }} className="flex-1 bg-white border border-[#d6c3a0] rounded-xl px-3 py-3 text-sm text-[#2f2415] outline-none focus:border-emerald-500" placeholder={voice.listening ? voice.transcript || 'J’écoute...' : 'Ex : J’ai vacciné BOV002, vendu 10 poulets, ramassé 12 tablettes…'} /><button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`min-w-[44px] rounded-xl border ${voice.listening ? 'border-emerald-500 text-emerald-500 animate-pulse' : 'border-[#d6c3a0] text-[#8a7456]'}`} title="Micro"><Mic size={17} className="mx-auto" /></button><button type="button" onClick={() => processCommand(query)} className="min-w-[44px] rounded-xl bg-emerald-600 text-white" title="Envoyer"><Send size={17} className="mx-auto" /></button></div>
        <div className="flex flex-wrap gap-2">{QUICK_ACTIONS.map((item) => <button key={item.label} type="button" onClick={() => quickAction(item)} className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#7d6a4a] hover:border-[#c9a96a]">{item.label}</button>)}</div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-xs"><div><b className="text-[#2f2415]">Micro continu</b><p className="text-[#8a7456]">Optionnel : Horizon traite après une pause.</p></div><button type="button" onClick={toggleTerrainMode} className={`rounded-xl border px-3 py-1.5 font-black ${terrainMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{terrainMode ? 'ON' : 'OFF'}</button><button type="button" onClick={toggleVoiceReplies} className={`rounded-xl border px-3 py-1.5 font-black ${speech.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{speech.enabled ? <Volume2 size={14} className="inline" /> : <VolumeX size={14} className="inline" />}</button></div>
        {terrainMode ? <div className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${voice.listening ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>🎤 {voice.listening ? 'J’écoute. Parle puis marque une pause.' : `Micro non actif : ${voice.error || voice.hint || 'autorisation à vérifier.'}`}</div> : null}
      </div>
      <div className="max-h-[44vh] overflow-y-auto p-4 space-y-3 max-md:max-h-[38vh]">
        <DraftSummary draft={draft} />
        <HorizonDraftPanel draft={draft} onChangeField={updateDraftField} onValidate={validateDraft} onCancel={() => cancelDraft()} onOpenModule={onNavigate} />
        {messages.slice(-5).map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === 'assistant' ? 'bg-[#fffdf8] border border-[#eadcc2] text-[#7d6a4a]' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'}`}>{message.text}</div>)}
        {isThinking || isValidating ? <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700">{isValidating ? 'Horizon valide et rafraîchit les modules...' : 'Horizon comprend la demande...'}</div> : null}
        {results.length > 0 && !draft && query.trim() ? <div className="space-y-2"><p className="text-[11px] uppercase tracking-widest text-[#8a7456] font-bold">Résultats ERP</p>{results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { onNavigate?.(result.moduleKey); toast.success(`Ouverture ${moduleLabel(result.moduleKey)}`); }} className="w-full text-left bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-2 hover:border-emerald-500 transition-colors"><div className="text-sm font-semibold text-[#2f2415]">{result.title}</div><div className="text-xs text-[#8a7456]">{moduleLabel(result.moduleKey)} · {result.subtitle}</div></button>)}</div> : null}
      </div>
    </aside> : null}
  </>;
}
