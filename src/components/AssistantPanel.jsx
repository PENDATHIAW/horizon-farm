import { Bot, Ear, Mic, RefreshCw, Send, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HorizonDraftPanel from './HorizonDraftPanel';
import HorizonWakeAnimation from './HorizonWakeAnimation';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { interpretHorizonCommand, updateHorizonDraft } from '../services/aiIntentEngine';
import { interpretVoiceCommand } from '../services/voiceCommands';
import { searchERP } from '../services/globalSearchService';

const QUICK_PROMPTS = ['Quel est mon CA ?', 'Combien j’ai encaissé ?', 'Quelle est ma marge ?', 'Situation globale'];
const moduleLabel = (key = '') => ({ dashboard: 'Accueil', ventes: 'Ventes', finances: 'Finances', clients: 'Clients', stock: 'Stock', sante: 'Santé', avicole: 'Avicole', animaux: 'Animaux', cultures: 'Cultures', documents: 'Documents', taches: 'Tâches', alertes: 'Alertes', sync_activity: 'Vérifications', impact_business: 'Impact & Valeur', fournisseurs: 'Fournisseurs', tracabilite: 'Traçabilité', centre_ia: 'Centre IA' }[key] || 'Espace lié');
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const stripWakeWord = (value = '') => value.replace(/hey\s+horizon/gi, '').trim();

export default function AssistantPanel({ open, onClose, dataMap, onNavigate }) {
  const [localOpen, setLocalOpen] = useState(false);
  const [wakeState, setWakeState] = useState('idle');
  const [terrainMode, setTerrainMode] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Assistant prêt. Active Terrain ON, puis dis “Hey Horizon”.' }]);
  const silenceTimerRef = useRef(null);
  const lastHeardRef = useRef('');
  const speech = useSpeechSynthesis();

  const wakeHorizon = () => {
    setWakeState('wake_detected');
    window.setTimeout(() => setWakeState('circuit'), 120);
    window.setTimeout(() => setWakeState('sun'), 2050);
    window.setTimeout(() => {
      setWakeState('listening');
      setLocalOpen(true);
    }, 2350);
  };

  const buildAssistantTextFromDraft = (nextDraft) => {
    if (!nextDraft || nextDraft.status === 'unsupported') return null;
    const missing = nextDraft.missing_fields || [];
    const impacted = (nextDraft.impacted_modules || []).map(moduleLabel).join(', ');
    if (missing.length) return `J’ai préparé un brouillon. Il reste ${missing.length} champ(s) à compléter. Modules concernés : ${impacted}.`;
    if (nextDraft.next_required_form) return `J’ai préparé le brouillon, mais un formulaire lié est requis : ${nextDraft.next_required_form.title}.`;
    return `Brouillon prêt à valider. Modules concernés : ${impacted}.`;
  };

  const processCommand = (rawText, { fromSilence = false } = {}) => {
    const cleaned = stripWakeWord(rawText || '').trim();
    if (!cleaned) return;

    setIsThinking(true);
    window.setTimeout(() => setIsThinking(false), 700);

    const nextDraft = draft ? updateHorizonDraft(draft, cleaned, dataMap) : interpretHorizonCommand(cleaned, dataMap);
    const draftText = buildAssistantTextFromDraft(nextDraft);

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: cleaned },
      { role: 'assistant', text: draftText || interpretVoiceCommand(cleaned, dataMap).answer },
    ]);

    if (draftText) {
      setDraft(nextDraft);
      if (nextDraft.primary_module) onNavigate?.(nextDraft.primary_module);
      speech.speak(draftText);
    } else {
      const response = interpretVoiceCommand(cleaned, dataMap);
      if (response.moduleKey) onNavigate?.(response.moduleKey);
      speech.speak(response.answer);
    }

    setQuery('');

    if (fromSilence && terrainMode && voice.supported && !voice.listening) {
      window.setTimeout(() => voice.start(), 900);
    }
  };

  const scheduleSilenceProcessing = (text) => {
    const cleaned = stripWakeWord(text || '').trim();
    if (!cleaned || cleaned === lastHeardRef.current) return;
    lastHeardRef.current = cleaned;
    window.clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      processCommand(cleaned, { fromSilence: true });
    }, 1600);
  };

  const voice = useVoiceRecognition({
    continuous: terrainMode,
    autoRestart: terrainMode,
    onInterim: (text) => {
      const normalized = normalize(text);
      if (terrainMode && normalized.includes('hey horizon')) {
        wakeHorizon();
        setQuery(stripWakeWord(text));
        scheduleSilenceProcessing(text);
      } else if (wakeState === 'listening' || panelOpen) {
        setQuery(text);
        scheduleSilenceProcessing(text);
      }
    },
    onResult: (text) => {
      const normalized = normalize(text);
      if (terrainMode && normalized.includes('hey horizon')) {
        wakeHorizon();
        scheduleSilenceProcessing(text);
        return;
      }
      scheduleSilenceProcessing(text);
    },
  });

  useEffect(() => {
    if (!terrainMode) {
      voice.stop();
      return;
    }
    if (!voice.listening) voice.start();
  }, [terrainMode]);

  useEffect(() => () => window.clearTimeout(silenceTimerRef.current), []);

  const results = useMemo(() => searchERP(dataMap, query).slice(0, 5), [dataMap, query]);
  const panelOpen = open || localOpen;

  const resetConversation = () => {
    speech.stop();
    setDraft(null);
    lastHeardRef.current = '';
    setMessages([{ role: 'assistant', text: 'Nouvelle conversation ouverte. Dis ta commande, puis marque une pause : Horizon traitera automatiquement.' }]);
    setQuery('');
  };

  const toggleTerrainMode = () => {
    if (!voice.supported) {
      toast.error('La reconnaissance vocale n’est pas disponible ici');
      return;
    }
    setTerrainMode((prev) => {
      const next = !prev;
      if (next) {
        setLocalOpen(true);
        toast.success('Terrain ON. Dis “Hey Horizon”.');
      } else {
        toast('Terrain désactivé.');
      }
      return next;
    });
  };

  const toggleVoiceReplies = () => {
    if (!speech.supported) { toast.error('La réponse vocale n’est pas disponible ici'); return; }
    if (speech.enabled) { speech.disable(); toast.success('Réponses vocales désactivées'); return; }
    speech.enable();
    speech.test();
    toast.success('Réponses vocales activées');
  };

  const validateDraft = () => {
    if (!draft) return;
    const impacted = (draft.impacted_modules || []).map(moduleLabel).join(', ');
    setMessages((prev) => [...prev, { role: 'assistant', text: `Nécessaire préparé. Validation simulée pour le moment. Modules à mettre à jour : ${impacted}.` }]);
    toast.success('Brouillon validé côté assistant');
    setDraft(null);
  };

  const updateDraftField = (key, value) => {
    setDraft((current) => current ? ({ ...current, draft_fields: { ...(current.draft_fields || {}), [key]: value }, missing_fields: (current.missing_fields || []).filter((field) => field !== key) }) : current);
  };

  const closePanel = () => { speech.stop(); setLocalOpen(false); setWakeState('idle'); onClose?.(); };

  return <>
    <HorizonWakeAnimation state={wakeState} onWake={wakeHorizon} terrainMode={terrainMode} />

    <button type="button" onClick={toggleTerrainMode} className={`fixed right-4 bottom-20 z-[66] rounded-full border px-3 py-2 text-xs font-black shadow-xl ${terrainMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#7d6a4a]'}`}>
      <Ear size={13} className="inline mr-1" /> {terrainMode ? 'Terrain ON' : 'Terrain OFF'}
    </button>

    {panelOpen ? <aside className="fixed right-4 bottom-4 z-50 w-[min(460px,calc(100vw-2rem))] max-h-[88vh] bg-[#ffffff]/95 backdrop-blur border border-[#d6c3a0] rounded-3xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex items-center gap-3 bg-[#fffdf8]"><div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-200"><Bot size={19} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-black text-[#2f2415]">Horizon</p><span className="inline-flex items-center gap-1 rounded-full bg-[#2f2415] px-2 py-0.5 text-[10px] font-black text-white"><Zap size={10} /> IA</span>{terrainMode ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"><Ear size={10} /> écoute</span> : null}</div><p className="text-xs text-[#8a7456]">Parle, marque une pause, je prépare le brouillon.</p></div><button type="button" onClick={resetConversation} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Nouvelle conversation"><RefreshCw size={16} /></button><button type="button" onClick={closePanel} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Fermer"><X size={16} /></button></div>

      <div className="px-4 py-3 border-b border-[#eadcc2] bg-white space-y-3"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-[#2f2415]">Mode Terrain</p><p className="text-[11px] text-[#8a7456]">“Hey Horizon” + détection de silence.</p></div><button type="button" onClick={toggleTerrainMode} className={`rounded-xl border px-3 py-1.5 text-xs font-black ${terrainMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{terrainMode ? 'ON' : 'Activer'}</button></div><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-[#2f2415]">Réponse vocale</p><p className="text-[11px] text-[#8a7456]">Lecture audio des réponses.</p></div><button type="button" onClick={toggleVoiceReplies} className={`rounded-xl border px-3 py-1.5 text-xs font-black ${speech.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{speech.enabled ? <Volume2 size={14} className="inline" /> : <VolumeX size={14} className="inline" />} {speech.enabled ? 'ON' : 'OFF'}</button></div>{terrainMode ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700 font-bold">🎤 {voice.listening ? 'J’écoute. Parle puis marque une pause.' : 'Micro en attente de permission ou redémarrage.'}</div> : null}</div></div>

      <div className="max-h-[52vh] overflow-y-auto p-4 space-y-3">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === 'assistant' ? 'bg-[#fffdf8] border border-[#eadcc2] text-[#7d6a4a]' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'}`}>{message.text}</div>)}{isThinking ? <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700">Horizon comprend la demande...</div> : null}<HorizonDraftPanel draft={draft} onChangeField={updateDraftField} onValidate={validateDraft} onCancel={() => setDraft(null)} onOpenModule={onNavigate} />{results.length > 0 && !draft ? <div className="space-y-2"><p className="text-[11px] uppercase tracking-widest text-[#8a7456] font-bold">Résultats trouvés</p>{results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { onNavigate?.(result.moduleKey); toast.success(`Ouverture ${moduleLabel(result.moduleKey)}`); }} className="w-full text-left bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-2 hover:border-emerald-500 transition-colors"><div className="text-sm font-semibold text-[#2f2415]">{result.title}</div><div className="text-xs text-[#8a7456]">{moduleLabel(result.moduleKey)} · {result.subtitle}</div></button>)}</div> : null}</div>

      <div className="p-3 border-t border-[#d6c3a0] flex gap-2 bg-[#fffdf8]"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') processCommand(query); }} className="flex-1 bg-white border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-emerald-500" placeholder={voice.listening ? voice.transcript || 'J’écoute...' : 'Écris ou active Terrain ON...'} /><button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`p-2 rounded-xl border ${voice.listening ? 'border-emerald-500 text-emerald-500 animate-pulse' : 'border-[#d6c3a0] text-[#8a7456]'}`}><Mic size={16} /></button><button type="button" onClick={() => processCommand(query)} className="p-2 rounded-xl bg-emerald-500 text-white"><Send size={16} /></button></div>
    </aside> : null}
  </>;
}
