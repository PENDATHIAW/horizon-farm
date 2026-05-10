import { Bot, Mic, Send, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';
import useVoiceRecognition from '../hooks/useVoiceRecognition';
import { interpretVoiceCommand } from '../services/voiceCommands';
import { searchERP } from '../services/globalSearchService';

const quickQuestionGroups = [
  {
    title: 'Décider maintenant',
    items: ['Priorités du jour', 'Quels sont les risques ?', 'Que dois-je traiter maintenant ?', 'Que dois-je renforcer ?'],
  },
  {
    title: 'Argent & ventes',
    items: ['Quel est mon CA ?', 'Combien j’ai encaissé ?', 'Créances à relancer', 'Quelle est ma marge ?'],
  },
  {
    title: 'Terrain & opérations',
    items: ['Stocks critiques', 'Situation santé', 'Situation avicole', 'Tâches en retard'],
  },
  {
    title: 'Valeur ERP',
    items: ['Ce que l’ERP a permis de faire', 'Données utiles pour la banque', 'Situation globale'],
  },
];

export default function AssistantPanel({ open, onClose, dataMap, onNavigate }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Assistant ERP prêt. Je peux aider à décider quoi faire, suivre le chiffre d’affaires, les encaissements, les stocks, les ventes, la santé, les alertes et la valeur créée par l’ERP.' },
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
    <aside className="fixed right-3 bottom-3 md:right-4 md:bottom-4 z-50 w-[min(460px,calc(100vw-1.5rem))] bg-[#ffffff]/95 backdrop-blur border border-[#d6c3a0] rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#d6c3a0] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Bot size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#2f2415]">Assistant ERP</p>
          <p className="text-xs text-[#8a7456] truncate">Décisions, chiffres, alertes et actions guidées</p>
        </div>
        <button type="button" onClick={onClose} className="p-2 text-[#8a7456] hover:text-[#2f2415]">
          <X size={16} />
        </button>
      </div>

      <div className="max-h-[62vh] md:max-h-[28rem] overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
              message.role === 'assistant' ? 'bg-[#fffdf8] text-[#7d6a4a]' : 'bg-emerald-500/10 text-emerald-600'
            }`}
          >
            {message.text}
          </div>
        ))}

        {messages.length <= 1 ? (
          <div className="space-y-3">
            {quickQuestionGroups.map((group) => (
              <div key={group.title}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#b39b78] mb-1.5">{group.title}</p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => handleAsk(question, { inputMode: 'text' })}
                      className="rounded-full border border-[#d6c3a0] bg-[#fffdf8] px-3 py-1.5 text-xs font-semibold text-[#7d6a4a] hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

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
          className="flex-1 min-w-0 bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-emerald-500"
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
