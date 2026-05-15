import { Bot, Ear, Mic, RefreshCw, Send, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HorizonDraftPanel from './HorizonDraftPanel';
import HorizonWakeAnimation from './HorizonWakeAnimation';
import { useAppData } from '../context/AppContext';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { supabase } from '../lib/supabase';
import { interpretHorizonCommand, updateHorizonDraft } from '../services/aiIntentEngine';
import { interpretVoiceCommand } from '../services/voiceCommands';
import { searchERP } from '../services/globalSearchService';

const moduleLabel = (key = '') => ({ dashboard: 'Accueil', ventes: 'Ventes', finances: 'Finances', clients: 'Clients', stock: 'Stock', sante: 'Santé', avicole: 'Avicole', animaux: 'Animaux', cultures: 'Cultures', documents: 'Documents', taches: 'Tâches', alertes: 'Alertes', sync_activity: 'Vérifications', impact_business: 'Impact & Valeur', fournisseurs: 'Fournisseurs', tracabilite: 'Traçabilité', centre_ia: 'Centre IA' }[key] || 'Espace lié');
const normalize = (value = '') => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const hasWakeWord = (value = '') => { const text = normalize(value); return text.includes('hey horizon') || text.includes('he horizon') || text.includes('horizon'); };
const stripWakeWord = (value = '') => normalize(value).replace(/\b(hey|he|eh|e)\s+horizon\b/g, '').replace(/\bhorizon\b/g, '').trim();

const REFRESH_KEYS_BY_MODULE = {
  dashboard: ['animaux', 'avicole', 'sante', 'finances', 'stock', 'clients', 'fournisseurs', 'cultures', 'taches', 'alertes_center', 'business_events', 'sales_orders', 'payments'],
  centre_ia: ['stock', 'finances', 'avicole', 'animaux', 'cultures', 'alertes_center', 'business_events', 'sales_orders', 'payments', 'sensor_devices', 'camera_devices'],
  stock: ['stock', 'alimentation_logs', 'business_events'],
  finances: ['finances', 'payments', 'business_events'],
  fournisseurs: ['fournisseurs', 'finances', 'stock', 'business_events'],
  clients: ['clients', 'sales_orders', 'payments', 'business_events'],
  ventes: ['sales_orders', 'sales_order_items', 'deliveries', 'invoices', 'payments', 'stock', 'clients', 'business_events'],
  animaux: ['animaux', 'sante', 'alimentation_logs', 'sales_opportunities', 'business_events'],
  avicole: ['avicole', 'production_oeufs_logs', 'alimentation_logs', 'sales_opportunities', 'business_events'],
  sante: ['sante', 'veterinaires', 'stock', 'finances', 'taches', 'business_events'],
  cultures: ['cultures', 'stock', 'finances', 'sales_opportunities', 'business_events'],
  documents: ['documents', 'finances', 'sales_orders', 'business_events'],
  taches: ['taches', 'alertes_center', 'business_events'],
  alertes: ['alertes_center', 'whatsapp_logs', 'taches', 'business_events'],
  tracabilite: ['tracabilite', 'business_events'],
  smartfarm: ['sensor_devices', 'camera_devices', 'alertes_center', 'taches', 'business_events'],
  equipements: ['equipements', 'taches', 'finances', 'documents', 'business_events'],
  rh: ['finances', 'taches', 'business_events'],
};

const buildRefreshKeys = (result = {}, draft = {}) => {
  const modules = new Set([...(result.impacted_modules || []), draft.primary_module, 'dashboard', 'centre_ia', 'alertes', 'tracabilite'].filter(Boolean));
  const keys = new Set();
  modules.forEach((module) => (REFRESH_KEYS_BY_MODULE[module] || [module]).forEach((key) => keys.add(key)));
  return [...keys];
};

export default function AssistantPanel({ open, onClose, dataMap, onNavigate }) {
  const [localOpen, setLocalOpen] = useState(false);
  const [wakeState, setWakeState] = useState('idle');
  const [terrainMode, setTerrainMode] = useState(false);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Assistant prêt. Active Terrain ON : je traiterai ta phrase après une pause.' }]);
  const silenceTimerRef = useRef(null);
  const lastHeardRef = useRef('');
  const speech = useSpeechSynthesis();
  const { refreshModule } = useAppData();

  const wakeHorizon = () => { setWakeState('wake_detected'); window.setTimeout(() => setWakeState('circuit'), 120); window.setTimeout(() => setWakeState('sun'), 2050); window.setTimeout(() => { setWakeState('listening'); setLocalOpen(true); }, 2350); };
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
    setIsThinking(true); window.setTimeout(() => setIsThinking(false), 700);
    const nextDraft = draft ? updateHorizonDraft(draft, cleaned, dataMap) : interpretHorizonCommand(cleaned, dataMap);
    const draftText = buildAssistantTextFromDraft(nextDraft);
    const fallback = interpretVoiceCommand(cleaned, dataMap);
    setMessages((prev) => [...prev, { role: 'user', text: cleaned }, { role: 'assistant', text: draftText || fallback.answer }]);
    if (draftText) { setDraft(nextDraft); if (nextDraft.primary_module) onNavigate?.(nextDraft.primary_module); speech.speak(draftText); }
    else { if (fallback.moduleKey) onNavigate?.(fallback.moduleKey); speech.speak(fallback.answer); }
    setQuery('');
    if (fromSilence && terrainMode && voice.supported && !voice.listening) window.setTimeout(() => voice.start(), 900);
  };

  const scheduleSilenceProcessing = (text) => { const cleaned = stripWakeWord(text || '').trim(); if (!cleaned || cleaned === lastHeardRef.current) return; lastHeardRef.current = cleaned; window.clearTimeout(silenceTimerRef.current); silenceTimerRef.current = window.setTimeout(() => processCommand(cleaned, { fromSilence: true }), 1600); };

  const voice = useVoiceRecognition({
    continuous: terrainMode,
    autoRestart: terrainMode,
    onInterim: (text) => { if (!text) return; if (hasWakeWord(text) && wakeState === 'idle') wakeHorizon(); if (terrainMode && wakeState === 'idle') setWakeState('listening'); setLocalOpen(true); setQuery(stripWakeWord(text) || text); scheduleSilenceProcessing(text); },
    onResult: (text) => { if (!text) return; if (hasWakeWord(text) && wakeState === 'idle') wakeHorizon(); setLocalOpen(true); scheduleSilenceProcessing(text); },
  });

  useEffect(() => { if (!terrainMode) { voice.stop(); return; } if (!voice.listening) voice.start(); }, [terrainMode]);
  useEffect(() => () => window.clearTimeout(silenceTimerRef.current), []);

  const results = useMemo(() => searchERP(dataMap, query).slice(0, 5), [dataMap, query]);
  const panelOpen = open || localOpen;
  const resetConversation = () => { speech.stop(); setDraft(null); lastHeardRef.current = ''; setMessages([{ role: 'assistant', text: 'Nouvelle conversation ouverte. Parle puis marque une pause : Horizon traitera automatiquement.' }]); setQuery(''); };

  const toggleTerrainMode = () => {
    if (!voice.supported) { toast.error('Reconnaissance vocale non supportée par ce navigateur/app'); setLocalOpen(true); setMessages((prev) => [...prev, { role: 'assistant', text: 'La reconnaissance vocale Web n’est pas disponible ici. Il faudra utiliser le bouton micro, ou une vraie couche native plus tard.' }]); return; }
    setTerrainMode((prev) => { const next = !prev; if (next) { setLocalOpen(true); setWakeState('listening'); toast.success('Terrain ON. Autorise le micro, parle, puis marque une pause.'); window.setTimeout(() => voice.start(), 250); } else { voice.stop(); setWakeState('idle'); toast('Terrain désactivé.'); } return next; });
  };

  const toggleVoiceReplies = () => { if (!speech.supported) { toast.error('La réponse vocale n’est pas disponible ici'); return; } if (speech.enabled) { speech.disable(); toast.success('Réponses vocales désactivées'); return; } speech.enable(); speech.test(); toast.success('Réponses vocales activées'); };

  const refreshImpactedModules = async (result, validatedDraft) => {
    const keys = buildRefreshKeys(result, validatedDraft);
    if (!keys.length) return;
    await Promise.allSettled(keys.map((key) => refreshModule(key)));
    toast.success(`Modules rafraîchis : ${keys.slice(0, 4).join(', ')}${keys.length > 4 ? '…' : ''}`);
  };

  const validateDraft = async () => {
    if (!draft || isValidating) return;
    setIsValidating(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const response = await fetch('/api/assistant/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ draft, confirmed: true, execute: true, user_id: sessionData?.session?.user?.id || null }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || result.execution?.results?.find?.((item) => item.error)?.error || 'Validation impossible');
      const message = result.message || 'Nécessaire fait.';
      setMessages((prev) => [...prev, { role: 'assistant', text: message }]);
      speech.speak(message);
      toast.success(result.executed ? 'Action exécutée' : 'Action préparée');
      await refreshImpactedModules(result, draft);
      window.dispatchEvent(new CustomEvent('horizon-assistant-executed', { detail: result }));
      if (draft.primary_module) onNavigate?.(draft.primary_module);
      setDraft(null);
    } catch (error) {
      const message = `Je n’ai pas pu valider : ${error.message}`;
      setMessages((prev) => [...prev, { role: 'assistant', text: message }]);
      toast.error(error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const updateDraftField = (key, value) => setDraft((current) => current ? ({ ...current, draft_fields: { ...(current.draft_fields || {}), [key]: value }, missing_fields: (current.missing_fields || []).filter((field) => field !== key) }) : current);
  const closePanel = () => { speech.stop(); setLocalOpen(false); setWakeState('idle'); onClose?.(); };

  return <>
    <HorizonWakeAnimation state={wakeState} onWake={wakeHorizon} terrainMode={terrainMode} />
    <button type="button" onClick={toggleTerrainMode} className={`fixed right-4 bottom-20 z-[66] rounded-full border px-3 py-2 text-xs font-black shadow-xl ${terrainMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#7d6a4a]'}`}><Ear size={13} className="inline mr-1" /> {terrainMode ? (voice.listening ? 'Horizon écoute' : 'Micro bloqué') : 'Activer Horizon' }</button>
    {panelOpen ? <aside className="fixed right-4 bottom-4 z-50 w-[min(460px,calc(100vw-2rem))] max-h-[88vh] bg-[#ffffff]/95 backdrop-blur border border-[#d6c3a0] rounded-3xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex items-center gap-3 bg-[#fffdf8]"><div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-200"><Bot size={19} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><p className="font-black text-[#2f2415]">Horizon</p><span className="inline-flex items-center gap-1 rounded-full bg-[#2f2415] px-2 py-0.5 text-[10px] font-black text-white"><Zap size={10} /> IA</span>{terrainMode ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${voice.listening ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><Ear size={10} /> {voice.listening ? 'écoute' : 'micro en attente'}</span> : null}</div><p className="text-xs text-[#8a7456]">Terrain ON : parle, marque une pause, je traite.</p></div><button type="button" onClick={resetConversation} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Nouvelle conversation"><RefreshCw size={16} /></button><button type="button" onClick={closePanel} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Fermer"><X size={16} /></button></div>
      <div className="px-4 py-3 border-b border-[#eadcc2] bg-white space-y-3"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-[#2f2415]">Mode Terrain</p><p className="text-[11px] text-[#8a7456]">Le wake word est un bonus. Terrain ON traite aussi sans “Hey Horizon”.</p></div><button type="button" onClick={toggleTerrainMode} className={`rounded-xl border px-3 py-1.5 text-xs font-black ${terrainMode ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{terrainMode ? 'ON' : 'Activer'}</button></div><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black text-[#2f2415]">Réponse vocale</p><p className="text-[11px] text-[#8a7456]">Lecture audio des réponses.</p></div><button type="button" onClick={toggleVoiceReplies} className={`rounded-xl border px-3 py-1.5 text-xs font-black ${speech.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>{speech.enabled ? <Volume2 size={14} className="inline" /> : <VolumeX size={14} className="inline" />} {speech.enabled ? 'ON' : 'OFF'}</button></div>{terrainMode ? <div className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${voice.listening ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>🎤 {voice.listening ? 'J’écoute. Dis ta commande puis arrête-toi.' : `Micro non actif : ${voice.error || 'permission/compatibilité à vérifier.'}`}</div> : null}</div></div>
      <div className="max-h-[52vh] overflow-y-auto p-4 space-y-3">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === 'assistant' ? 'bg-[#fffdf8] border border-[#eadcc2] text-[#7d6a4a]' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'}`}>{message.text}</div>)}{isThinking || isValidating ? <div className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700">{isValidating ? 'Horizon valide, exécute et rafraîchit les modules...' : 'Horizon comprend la demande...'}</div> : null}<HorizonDraftPanel draft={draft} onChangeField={updateDraftField} onValidate={validateDraft} onCancel={() => setDraft(null)} onOpenModule={onNavigate} />{results.length > 0 && !draft ? <div className="space-y-2"><p className="text-[11px] uppercase tracking-widest text-[#8a7456] font-bold">Résultats trouvés</p>{results.map((result) => <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { onNavigate?.(result.moduleKey); toast.success(`Ouverture ${moduleLabel(result.moduleKey)}`); }} className="w-full text-left bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-2 hover:border-emerald-500 transition-colors"><div className="text-sm font-semibold text-[#2f2415]">{result.title}</div><div className="text-xs text-[#8a7456]">{moduleLabel(result.moduleKey)} · {result.subtitle}</div></button>)}</div> : null}</div>
      <div className="p-3 border-t border-[#d6c3a0] flex gap-2 bg-[#fffdf8]"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') processCommand(query); }} className="flex-1 bg-white border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-emerald-500" placeholder={voice.listening ? voice.transcript || 'J’écoute...' : 'Écris ou active Horizon...'} /><button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`p-2 rounded-xl border ${voice.listening ? 'border-emerald-500 text-emerald-500 animate-pulse' : 'border-[#d6c3a0] text-[#8a7456]'}`}><Mic size={16} /></button><button type="button" onClick={() => processCommand(query)} className="p-2 rounded-xl bg-emerald-500 text-white"><Send size={16} /></button></div>
    </aside> : null}
  </>;
}
