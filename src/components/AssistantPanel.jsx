import { Bot, Mic, Send, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { interpretVoiceCommand } from '../services/voiceCommands';
import { searchERP } from '../services/globalSearchService';

export default function AssistantPanel({ open, onClose, dataMap, onNavigate }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Assistant ERP prêt. Pose une question sur les alertes, les stocks, les clients, les ventes, la santé, les finances ou les priorités du jour.' },
  ]);
  const speech = useSpeechSynthesis();

  const handleAsk = useCallback(
    (forcedQuery, options = {}) => {
      const text = (forcedQuery ?? query).trim();
      if (!text) return;

      const inputMode = options.inputMode || 'text';
      const response = interpretVoiceCommand(text, dataMap);
      setMessages((prev) => [...prev, { role: 'user', text }, { role: 'assistant', text: response.answer }]);
      setQuery('');

      if (response.moduleKey) onNavigate?.(response.moduleKey);
      if (inputMode === 'voice') speech.speak(response.answer);
    },
    [dataMap, onNavigate, query, speech]
  );

  const voice = useVoiceRecognition({
    onResult: (text) => {
      setQuery(text);
      handleAsk(text, { inputMode: 'voice' });
    },
  });

  const results = useMemo(() => searchERP(dataMap, query).slice(0, 5), [dataMap, query]);

  if (!open) return null;

  return (
    <aside className="fixed right-4 bottom-4 z-50 w-[min(420px,calc(100vw-2rem))] bg-[#ffffff]/95 backdrop-blur border border-[#d6c3a0] rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Bot size={18} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-[#2f2415]">Assistant ERP</p>
          <p className="text-xs text-[#8a7456]">Recherche, alertes et actions guidées</p>
        </div>
        <button type="button" onClick={onClose} className="p-2 text-[#8a7456] hover:text-[#2f2415]">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-xl px-3 py-2 text-sm ${
              message.role === 'assistant' ? 'bg-[#fffdf8] text-[#7d6a4a]' : 'bg-emerald-500/10 text-emerald-600'
            }`}
          >
            {message.text}
          </div>
        ))}

        {results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result) => (
              <button
                key={`${result.moduleKey}-${result.id}`}
                type="button"
                onClick={() => {
                  onNavigate?.(result.moduleKey);
                  toast.success(`Ouverture ${result.moduleKey}`);
                }}
                className="w-full text-left bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-2 hover:border-emerald-500 transition-colors"
              >
                <div className="text-sm font-semibold text-[#2f2415]">{result.title}</div>
                <div className="text-xs text-[#8a7456]">{result.moduleKey} - {result.subtitle}</div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="p-3 border-t border-[#d6c3a0] flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleAsk(undefined, { inputMode: 'text' });
          }}
          className="flex-1 bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-emerald-500"
          placeholder={voice.listening ? voice.transcript || 'Écoute...' : 'Question ERP...'}
        />
        <button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`p-2 rounded-lg border ${voice.listening ? 'border-emerald-500 text-emerald-400 animate-pulse' : 'border-[#d6c3a0] text-[#8a7456]'}`} title={voice.listening ? 'Arrêter le micro' : 'Parler à l’assistant'}>
          <Mic size={16} />
        </button>
        <button type="button" onClick={() => handleAsk(undefined, { inputMode: 'text' })} className="p-2 rounded-lg bg-emerald-500 text-black" title="Envoyer la question">
          <Send size={16} />
        </button>
      </div>
    </aside>
  );
}
