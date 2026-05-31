import { Bot, Ear, Mic, RefreshCw, Send, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HeyHorizonDraftSummary from './HeyHorizonDraftSummary';
import HorizonDraftPanel from './HorizonDraftPanel';
import HorizonWakeAnimation from './HorizonWakeAnimation';
import useHeyHorizonCommand from '../hooks/useHeyHorizonCommand';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { parseConversationControl } from '../services/aiIntentEngine';
import {
  heyHorizonModuleLabel,
  normalizeHeyHorizonText,
  openHeyHorizonForm,
  shouldAutoOpenHeyHorizonForm,
} from '../services/heyHorizonAssistantService.js';
import { searchERP } from '../services/globalSearchService';
import { resolveSearchNavigation } from '../utils/commercialNavigation';
import { launchProductionQuestion } from '../utils/productionNavigation.js';

const hasWakeWord = (value = '') => { const text = normalizeHeyHorizonText(value); return text.includes('hey horizon') || text.includes('he horizon') || text.includes('horizon'); };
const stripWakeWord = (value = '') => normalizeHeyHorizonText(value).replace(/\b(hey|he|eh|e)\s+horizon\b/g, '').replace(/\bhorizon\b/g, '').trim();
const QUICK_ACTIONS = [
  { label: 'Créer vente', text: 'Créer une vente', module: 'commercial' },
  { label: 'Vaccin / soin', text: 'J’ai vacciné ', module: 'elevage' },
  { label: 'Ramassage œufs', text: 'J’ai ramassé ', module: 'elevage' },
  { label: 'Utiliser stock', text: 'J’ai utilisé ', module: 'achats_stock' },
  { label: 'Mortalité', text: 'Mortalité de ', module: 'elevage' },
  { label: 'Dépense', text: 'Ajouter une dépense de ', module: 'finance_pilotage' },
  { label: 'Tâche', text: 'Créer une tâche ', module: 'activite_suivi' },
  { label: 'Cycles bandes', text: '', module: 'elevage', pilotage: 'new_layer_band' },
];
function DraftSummary({ draft }) {
  return <HeyHorizonDraftSummary draft={draft} />;
}

export default function AssistantPanel({ open, onClose, dataMap, onNavigate, onCreateBusinessEvent }) {
  const [localOpen, setLocalOpen] = useState(false);
  const [wakeState, setWakeState] = useState('idle');
  const [terrainMode, setTerrainMode] = useState(false);
  const [query, setQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hey Horizon — actions terrain uniquement. Dis : vente, vaccin, stock, œufs, tâche, dépense. Pour bandes, objectifs ou risques, j’ouvre le Centre décisionnel.' }]);
  const silenceTimerRef = useRef(null);
  const lastHeardRef = useRef('');
  const speech = useSpeechSynthesis();
  const {
    draft,
    isValidating,
    runCommand,
    updateDraftField,
    cancelDraft,
    loadDraft,
    validateDraft,
  } = useHeyHorizonCommand({ dataMap, onNavigate, onCreateBusinessEvent });
  const voice = useVoiceRecognition({ continuous: terrainMode, autoRestart: terrainMode, onInterim: (text) => { if (!text) return; if (hasWakeWord(text) && wakeState === 'idle') wakeHorizon(); if (terrainMode && wakeState === 'idle') setWakeState('listening'); setLocalOpen(true); const withoutWake = stripWakeWord(text); setQuery(withoutWake || text); scheduleSilenceProcessing(withoutWake || text); }, onResult: (text) => { if (!text) return; if (hasWakeWord(text) && wakeState === 'idle') wakeHorizon(); setLocalOpen(true); scheduleSilenceProcessing(stripWakeWord(text) || text); } });

  const wakeHorizon = () => { setWakeState('wake_detected'); window.setTimeout(() => setWakeState('circuit'), 120); window.setTimeout(() => setWakeState('sun'), 1450); window.setTimeout(() => { setWakeState('idle'); setLocalOpen(true); }, 3000); };

  const handleValidateDraft = async () => {
    try {
      const result = await validateDraft();
      if (result?.message) {
        setMessages((prev) => [...prev, { role: 'assistant', text: result.message }]);
        speech.speak(result.message);
      }
    } catch (error) {
      const message = `Je n’ai pas pu valider : ${error.message}`;
      setMessages((prev) => [...prev, { role: 'assistant', text: message }]);
    }
  };

  const handleCancelDraft = (reason = 'Action annulée.') => {
    cancelDraft();
    setQuery('');
    lastHeardRef.current = '';
    setMessages((prev) => [...prev, { role: 'assistant', text: reason }]);
    speech.speak(reason);
  };

  const resetConversation = () => { speech.stop(); cancelDraft(); lastHeardRef.current = ''; setMessages([{ role: 'assistant', text: 'Nouvelle demande ouverte. Clique Parler, écris une action ou choisis un raccourci.' }]); setQuery(''); };

  const loadExternalDraft = (nextDraft, sourceLabel = 'Centre IA') => {
    if (!nextDraft) return;
    loadDraft(nextDraft);
    setLocalOpen(true);
    setWakeState('idle');
    const text = `${sourceLabel} a préparé une action. Vérifie, complète si besoin, puis valide.`;
    setMessages((prev) => [...prev, { role: 'assistant', text }]);
    speech.speak(text);
    if (shouldAutoOpenHeyHorizonForm(nextDraft)) openHeyHorizonForm(nextDraft, onNavigate);
  };

  const processCommand = async (rawText, { fromSilence = false } = {}) => {
    const cleaned = stripWakeWord(rawText || '').trim() || normalizeHeyHorizonText(rawText || '').trim();
    const rawNormalized = normalizeHeyHorizonText(rawText || '').trim();
    if (!cleaned) {
      setLocalOpen(true);
      const text = 'Je suis prêt. Dis-moi maintenant l’action à faire : vaccin, vente, stock, œufs, tâche…';
      setMessages((prev) => [...prev, { role: 'assistant', text }]);
      speech.speak(text);
      return;
    }
    const control = parseConversationControl(cleaned || rawNormalized);
    if (control === 'wake') { const text = 'Je suis prêt. Quelle action veux-tu faire ?'; setMessages((prev) => [...prev, { role: 'assistant', text }]); speech.speak(text); setQuery(''); return; }
    if (control === 'validate') { await handleValidateDraft(); setQuery(''); return; }
    if (control === 'cancel') { handleCancelDraft(); return; }
    if (control === 'reset') { resetConversation(); return; }
    setIsThinking(true);
    window.setTimeout(() => setIsThinking(false), 700);
    const result = await runCommand(cleaned, { mergeDraft: Boolean(draft), autoOpenForm: true, navigateOnDraft: true });
    const assistantText = result?.assistantText || 'Je n’ai pas assez compris. Choisis une action rapide ou précise : vente, vaccin, stock, œufs, tâche, dépense.';
    setMessages((prev) => [...prev, { role: 'user', text: cleaned }, { role: 'assistant', text: assistantText }]);
    if (result?.kind === 'redirect_pilotage') {
      // Navigation handled in useHeyHorizonCommand
    } else if (result?.kind === 'strategic') onNavigate?.('assistant_erp');
    speech.speak(assistantText);
    setQuery('');
    if (fromSilence && terrainMode && voice.supported && !voice.listening) window.setTimeout(() => voice.start(), 900);
  };
  const scheduleSilenceProcessing = (text) => { const cleaned = stripWakeWord(text || '').trim() || normalizeHeyHorizonText(text || '').trim(); if (!cleaned || cleaned === lastHeardRef.current) return; lastHeardRef.current = cleaned; window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = window.setTimeout(() => processCommand(cleaned, { fromSilence: true }), 1400); };

  useEffect(() => { if (!terrainMode) { voice.stop(); return; } if (!voice.listening) voice.start(); }, [terrainMode]);
  useEffect(() => () => window.clearTimeout(silenceTimerRef.current), []);
  useEffect(() => { const handler = (event) => loadExternalDraft(event.detail?.draft, event.detail?.sourceLabel || 'Centre IA'); window.addEventListener('horizon-open-draft', handler); return () => window.removeEventListener('horizon-open-draft', handler); }, [speech, onNavigate]);

  useEffect(() => {
    const handler = async (event) => {
      const query = event.detail?.query;
      if (!query) return;
      setLocalOpen(true);
      setQuery(query);
      const result = await runCommand(query, { autoOpenForm: false, navigateOnDraft: false });
      if (result?.assistantText) {
        setMessages((prev) => [...prev, { role: 'assistant', text: result.assistantText }]);
      }
    };
    window.addEventListener('horizon-assistant-query', handler);
    return () => window.removeEventListener('horizon-assistant-query', handler);
  }, [runCommand]);

  const results = useMemo(() => searchERP(dataMap, query).slice(0, 4), [dataMap, query]);
  const panelOpen = open || localOpen;
  const toggleTerrainMode = () => { if (!voice.supported) { toast.error('Reconnaissance vocale non supportée ici'); setLocalOpen(true); setMessages((prev) => [...prev, { role: 'assistant', text: voice.hint || 'Utilise le champ texte : la reconnaissance vocale n’est pas disponible dans ce navigateur.' }]); return; } setTerrainMode((prev) => { const next = !prev; if (next) { setLocalOpen(true); setWakeState('idle'); toast.success('Micro Horizon activé. Parle puis marque une pause.'); window.setTimeout(() => voice.start(), 250); } else { voice.stop(); toast('Micro Horizon désactivé.'); } return next; }); };
  const toggleVoiceReplies = () => { if (!speech.supported) return toast.error('Réponse vocale non disponible ici'); if (speech.enabled) { speech.disable(); toast.success('Réponses vocales désactivées'); return; } speech.enable(); speech.test(); toast.success('Réponses vocales activées'); };
  const updateDraftFieldHandler = updateDraftField;
  const closePanel = () => { speech.stop(); setLocalOpen(false); setWakeState('idle'); onClose?.(); };
  const quickAction = (item) => {
    setLocalOpen(true);
    if (item.pilotage) {
      launchProductionQuestion({ questionId: item.pilotage, moduleId: 'elevage', onNavigate });
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Question production : ouverture Élevage → Cycles.' }]);
      return;
    }
    setQuery(item.text);
    onNavigate?.(item.module);
    setMessages((prev) => [...prev, { role: 'assistant', text: `D’accord. Je prépare : ${item.label}. Complète la phrase ou parle.` }]);
  };

  return <>
    <HorizonWakeAnimation state={wakeState} onClose={() => setWakeState('idle')} />
    {panelOpen ? <aside className="fixed right-4 top-[72px] z-50 w-[min(470px,calc(100vw-2rem))] max-h-[calc(100vh-90px)] bg-white/96 backdrop-blur border border-[#d6c3a0] rounded-3xl shadow-2xl overflow-hidden max-md:top-auto max-md:bottom-[92px] max-md:right-3 max-md:left-3 max-md:w-auto max-md:max-h-[calc(100vh-170px)]">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex items-center gap-3 bg-[#fffdf8]">
        <div className="w-11 h-11 rounded-full bg-amber-100 text-[#9a6b12] flex items-center justify-center border border-amber-200 shadow-inner"><Sun size={22} /></div>
        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-black text-[#2f2415]">Hey Horizon</p><span className="rounded-full bg-[#2f2415] px-2 py-0.5 text-[10px] font-black text-white">Actions terrain</span>{voice.listening ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"><Ear size={10} className="inline" /> écoute</span> : null}</div><p className="text-xs text-[#8a7456]">Vente, vaccin, stock… · Pilotage → Centre décisionnel</p></div>
        <button type="button" onClick={resetConversation} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Nouvelle demande"><RefreshCw size={16} /></button>
        <button type="button" onClick={closePanel} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Fermer"><X size={16} /></button>
      </div>
      <div className="p-3 border-b border-[#eadcc2] bg-white space-y-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 max-sm:grid-cols-1"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') processCommand(query); }} className="bg-white border border-[#d6c3a0] rounded-xl px-3 py-3 text-sm text-[#2f2415] outline-none focus:border-emerald-500" placeholder={voice.listening ? voice.transcript || 'J’écoute...' : 'Ex : J’ai vacciné BOV002, vendu 10 poulets…'} /><button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`min-h-[46px] rounded-xl border px-3 text-sm font-black ${voice.listening ? 'border-emerald-500 bg-emerald-50 text-emerald-700 animate-pulse' : 'border-[#d6c3a0] bg-[#fffdf8] text-[#7d6a4a]'}`} title={voice.listening ? 'Arrêter le micro' : 'Parler à Horizon'}><Mic size={16} className="inline mr-1" /> {voice.listening ? 'Stop' : 'Parler'}</button><button type="button" onClick={() => processCommand(query)} className="min-h-[46px] rounded-xl bg-emerald-600 px-3 text-sm font-black text-white" title="Envoyer"><Send size={16} className="inline mr-1" /> Envoyer</button></div>
        <div className="flex flex-wrap gap-2">{QUICK_ACTIONS.map((item) => <button key={item.label} type="button" onClick={() => quickAction(item)} className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#7d6a4a] hover:border-[#c9a96a]">{item.label}</button>)}</div>
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-xs"><div><b className="text-[#2f2415]">Micro continu</b><p className="text-[#8a7456]">Optionnel : Horizon traite après une pause.</p></div><button type="button" onClick={toggleTerrainMode} className={`rounded-xl border px-3 py-1.5 font-black ${terrainMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{terrainMode ? 'ON' : 'OFF'}</button><button type="button" onClick={toggleVoiceReplies} className={`rounded-xl border px-3 py-1.5 font-black ${speech.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{speech.enabled ? <Volume2 size={14} className="inline" /> : <VolumeX size={14} className="inline" />}</button></div>
        {terrainMode ? <div className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${voice.listening ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>🎤 {voice.listening ? 'J’écoute. Parle puis marque une pause.' : `Micro non actif : ${voice.error || voice.hint || 'autorisation à vérifier.'}`}</div> : null}
      </div>
      <div className="max-h-[44vh] overflow-y-auto p-4 space-y-3 max-md:max-h-[38vh]">
        <DraftSummary draft={draft} />
        <HorizonDraftPanel draft={draft} onChangeField={updateDraftFieldHandler} onValidate={handleValidateDraft} onCancel={() => handleCancelDraft()} onOpenModule={onNavigate} />
        {messages.slice(-5).map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === 'assistant' ? 'bg-[#fffdf8] border border-[#eadcc2] text-[#7d6a4a]' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'}`}>{message.text}</div>)}
        {isThinking || isValidating ? <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700">{isValidating ? 'Horizon valide et rafraîchit les modules...' : 'Horizon comprend la demande...'}</div> : null}
        {results.length > 0 && !draft && query.trim() ? <div className="space-y-2"><p className="text-[11px] uppercase tracking-widest text-[#8a7456] font-bold">Résultats ERP</p>{results.map((result) => { const target = resolveSearchNavigation(result.moduleKey); return <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { onNavigate?.(target.module, target.tab ? { tab: target.tab } : {}); toast.success(`Ouverture ${heyHorizonModuleLabel(target.module)}`); }} className="w-full text-left bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-2 hover:border-emerald-500 transition-colors"><div className="text-sm font-semibold text-[#2f2415]">{result.title}</div><div className="text-xs text-[#8a7456]">{heyHorizonModuleLabel(target.module)} · {result.subtitle}</div></button>; })}</div> : null}
      </div>
    </aside> : null}
  </>;
}
