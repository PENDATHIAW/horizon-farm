import { Bot, Mic, RefreshCw, Send, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { interpretVoiceCommand } from '../services/voiceCommands';
import { searchERP } from '../services/globalSearchService';

const QUICK_PROMPTS = [
  'Quel est mon CA ?',
  'Combien j’ai encaissé ?',
  'Quelle est ma marge ?',
  'Situation globale',
  'Que dois-je renforcer ?',
  'Suis-je bancable ?',
];

export default function AssistantPanel({ open, onClose, dataMap, onNavigate }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Assistant ERP Décision v3 prêt. Je peux analyser CA, encaissements, créances, marge, stock, ventes, clients, santé, avicole, tâches, documents et bancabilité.' },
  ]);
  const speech = useSpeechSynthesis();
  const voice = useVoiceRecognition({
    onResult: (text) => {
      setQuery(text);
      handleAsk(text);
    },
  });

  const results = useMemo(() => searchERP(dataMap, query).slice(0, 5), [dataMap, query]);

  const handleAsk = (forcedQuery) => {
    const text = (forcedQuery ?? query).trim();
    if (!text) return;
    const response = interpretVoiceCommand(text, dataMap);
    setMessages((prev) => [...prev, { role: 'user', text }, { role: 'assistant', text: response.answer }]);
    setQuery('');
    if (response.moduleKey) onNavigate?.(response.moduleKey);
    speech.speak(response.answer);
  };

  const resetConversation = () => {
    speech.stop();
    setMessages([{ role: 'assistant', text: 'Nouvelle conversation ERP ouverte. Demande-moi un diagnostic, une marge, un CA, une priorité ou un point de bancabilité.' }]);
    setQuery('');
  };

  const toggleVoiceReplies = () => {
    if (!speech.supported) {
      toast.error('Réponse vocale non supportée par ce navigateur');
      return;
    }
    if (speech.enabled) {
      speech.disable();
      toast.success('Réponses vocales désactivées');
      return;
    }
    speech.enable();
    const ok = speech.test();
    if (ok) toast.success('Réponses vocales activées');
    else toast.error('Le navigateur a bloqué la lecture audio. Clique à nouveau sur Test voix.');
  };

  const closePanel = () => {
    speech.stop();
    onClose?.();
  };

  if (!open) return null;

  return (
    <aside className="fixed right-4 bottom-4 z-50 w-[min(460px,calc(100vw-2rem))] bg-[#ffffff]/95 backdrop-blur border border-[#d6c3a0] rounded-3xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex items-center gap-3 bg-[#fffdf8]">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center border border-emerald-200">
          <Bot size={19} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-[#2f2415]">Assistant ERP</p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#2f2415] px-2 py-0.5 text-[10px] font-black text-white"><Zap size={10} /> ERP Décision v3</span>
            {speech.enabled ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"><Volume2 size={10} /> Voix ON</span> : null}
          </div>
          <p className="text-xs text-[#8a7456]">Recherche, diagnostic, chiffres et actions guidées</p>
        </div>
        <button type="button" onClick={resetConversation} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Nouvelle conversation">
          <RefreshCw size={16} />
        </button>
        <button type="button" onClick={closePanel} className="p-2 text-[#8a7456] hover:text-[#2f2415]" title="Fermer">
          <X size={16} />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-[#eadcc2] bg-white space-y-3">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-[#8a7456] font-bold mb-2">Raccourcis décisionnels</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt) => (
              <button key={prompt} type="button" onClick={() => handleAsk(prompt)} className="rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-3 py-1.5 text-xs font-bold text-[#2f2415] hover:bg-[#f4ead4]">
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-[#2f2415]">Réponse vocale</p>
              <p className="text-[11px] text-[#8a7456]">Active la voix pour entendre les réponses de l’assistant.</p>
            </div>
            <div className="flex gap-1">
              <button type="button" onClick={toggleVoiceReplies} className={`rounded-xl border px-3 py-1.5 text-xs font-black ${speech.enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#d6c3a0] bg-white text-[#8a7456]'}`}>
                {speech.enabled ? <Volume2 size={14} className="inline" /> : <VolumeX size={14} className="inline" />} {speech.enabled ? 'Activée' : 'Activer'}
              </button>
              <button type="button" disabled={!speech.supported} onClick={() => { if (speech.test()) toast.success('Test vocal lancé'); }} className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-1.5 text-xs font-black text-[#2f2415] disabled:opacity-40">Test</button>
              {speech.speaking ? <button type="button" onClick={speech.stop} className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">Stop</button> : null}
            </div>
          </div>
          {!speech.supported ? <p className="mt-2 text-[11px] text-red-600">Ce navigateur ne supporte pas la synthèse vocale.</p> : null}
          {speech.lastError ? <p className="mt-2 text-[11px] text-amber-700">Audio : {speech.lastError}. Essaie de cliquer sur “Test” après avoir ouvert l’assistant.</p> : null}
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-2xl px-3 py-2 text-sm leading-relaxed ${message.role === 'assistant' ? 'bg-[#fffdf8] border border-[#eadcc2] text-[#7d6a4a]' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700'}`}>
            {message.text}
          </div>
        ))}

        {results.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-[#8a7456] font-bold">Résultats ERP</p>
            {results.map((result) => (
              <button key={`${result.moduleKey}-${result.id}`} type="button" onClick={() => { onNavigate?.(result.moduleKey); toast.success(`Ouverture ${result.moduleKey}`); }} className="w-full text-left bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-2 hover:border-emerald-500 transition-colors">
                <div className="text-sm font-semibold text-[#2f2415]">{result.title}</div>
                <div className="text-xs text-[#8a7456]">{result.moduleKey} · {result.subtitle}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="p-3 border-t border-[#d6c3a0] flex gap-2 bg-[#fffdf8]">
        <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleAsk(); }} className="flex-1 bg-white border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-emerald-500" placeholder={voice.listening ? voice.transcript || 'Écoute...' : 'Question ERP, CA, marge, stock, bancabilité...'} />
        <button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`p-2 rounded-xl border ${voice.listening ? 'border-emerald-500 text-emerald-500 animate-pulse' : 'border-[#d6c3a0] text-[#8a7456]'}`} title={voice.listening ? 'Arrêter écoute' : 'Parler'}>
          <Mic size={16} />
        </button>
        <button type="button" onClick={() => handleAsk()} className="p-2 rounded-xl bg-emerald-500 text-white" title="Envoyer">
          <Send size={16} />
        </button>
      </div>
    </aside>
  );
}
