import { Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HeyHorizonDraftSummary from '../components/HeyHorizonDraftSummary.jsx';
import HorizonDraftPanel from '../components/HorizonDraftPanel.jsx';
import useHeyHorizonCommand from '../hooks/useHeyHorizonCommand.js';
import { formatStrategicHorizonAnswer } from '../services/assistantResponseFormatter.js';
import { processContextualVoiceInput } from '../services/aiGateway/contextualVoiceService.js';
import { enrichAssistantDataMap } from '../utils/assistantDataMap.js';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: 'Bonjour. Parlez à votre ferme : déclarez une vente, une récolte, un paiement — ou demandez la trésorerie, les créances, les priorités du jour.',
};

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'bg-[#2f2415] text-white'
            : 'border border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'
        }`}
      >
        {message.text}
      </div>
    </div>
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
  onNavigate,
  onCreateBusinessEvent,
}) {
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const chatEndRef = useRef(null);

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
    isValidating,
    isProcessing,
    runCommand,
    updateDraftField,
    cancelDraft,
    validateDraft,
    loadDraft,
  } = useHeyHorizonCommand({ dataMap: enrichedDataMap, onNavigate, allowWeakDraft: true, onCreateBusinessEvent });

  const appendMessage = useCallback((role, text, extra = {}) => {
    setMessages((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, role, text, ...extra }]);
  }, []);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, draft, scrollToBottom]);

  const handleSubmit = useCallback(async (text = command) => {
    const query = String(text || '').trim();
    if (!query || voiceBusy || isProcessing) return;
    setCommand('');
    appendMessage('user', query);
    setVoiceBusy(true);
    try {
      const parsed = await processContextualVoiceInput({
        phrase: query,
        dataMap: enrichedDataMap,
        handlers: { onCreateBusinessEvent },
      });
      if (parsed.drafts?.length) {
        const primary = parsed.primaryDraft;
        if (primary?.draft?.legacy_hey) {
          loadDraft(primary.draft.legacy_hey);
        } else if (primary) {
          loadDraft({
            status: primary.status,
            intent: primary.intent,
            confidence: primary.confidence,
            raw_input: query,
            primary_module: primary.draft?.primary_module,
            form_type: primary.draft?.form_type,
            draft_fields: primary.draft?.fields || primary.draft?.draft_fields || {},
            missing_fields: primary.missing_fields || [],
            warnings: primary.warnings || [],
            requires_validation: true,
            impacted_modules: primary.draft?.impacted_modules || [],
            ui: primary.draft?.ui,
          });
        }
        return;
      }
      if (parsed.clarify && !parsed.drafts?.length) {
        appendMessage('assistant', parsed.clarify);
        return;
      }
      const result = await runCommand(query, { autoOpenForm: false, navigateOnDraft: false });
      if (result?.kind === 'redirect_pilotage') {
        appendMessage('assistant', result.assistantText || 'Module ouvert pour approfondir.');
        return;
      }
      if (result?.kind === 'strategic' || result?.kind === 'llm') {
        const answerText = formatStrategicHorizonAnswer(result.strategic) || result.assistantText || 'Réponse indisponible.';
        appendMessage('assistant', answerText, { strategic: result.strategic });
        return;
      }
      if (result?.kind === 'draft') {
        return;
      }
      appendMessage('assistant', result?.assistantText || 'Je n\'ai pas compris. Reformulez votre action ou question.');
    } catch (error) {
      toast.error(error.message || 'Analyse impossible');
      appendMessage('assistant', 'Une erreur est survenue. Réessayez ou précisez votre demande.');
    } finally {
      setVoiceBusy(false);
    }
  }, [appendMessage, cancelDraft, command, enrichedDataMap, isProcessing, loadDraft, onCreateBusinessEvent, runCommand, voiceBusy]);

  useEffect(() => {
    if (!draft) return;
    const text = draft.raw_input
      ? `Brouillon préparé pour : « ${draft.raw_input} ». Vérifiez le résumé et validez pour enregistrer.`
      : 'Brouillon préparé. Vérifiez le résumé et validez pour enregistrer.';
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.draftId === draft.raw_input) return prev;
      return [...prev, { id: `draft-${Date.now()}`, role: 'assistant', text, draftId: draft.raw_input }];
    });
  }, [draft]);

  useEffect(() => {
    const handler = (event) => {
      const query = event.detail?.query;
      if (!query) return;
      setCommand(query);
      handleSubmit(query);
    };
    window.addEventListener('horizon-assistant-query', handler);
    return () => window.removeEventListener('horizon-assistant-query', handler);
  }, [handleSubmit]);

  const handleValidate = async () => {
    try {
      await validateDraft();
      appendMessage('assistant', 'Action validée et enregistrée dans l\'ERP.');
      cancelDraft();
    } catch {
      // toast handled in hook
    }
  };

  const handleCancel = () => {
    cancelDraft();
    appendMessage('assistant', 'Brouillon annulé. Que souhaitez-vous faire ?');
  };

  const busy = voiceBusy || isProcessing;

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] shadow-sm">
      <header className="shrink-0 border-b border-[#eadcc2] px-6 py-5">
        <h1 className="text-2xl font-black text-[#2f2415]">Horizon</h1>
        <p className="mt-1 text-sm text-[#8a7456]">Je parle à ma ferme.</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {draft ? (
            <div className="mx-auto w-full max-w-3xl space-y-3">
              <HeyHorizonDraftSummary draft={draft} />
              <HorizonDraftPanel
                draft={draft}
                onChangeField={updateDraftField}
                onValidate={handleValidate}
                onCancel={handleCancel}
                onOpenModule={onNavigate}
              />
              <p className="text-center text-xs text-[#8a7456]">
                {isValidating ? 'Validation en cours…' : 'Aucune écriture sans validation — bouton VALIDER requis.'}
              </p>
            </div>
          ) : null}

          <div ref={chatEndRef} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-[#eadcc2] bg-white px-4 py-4 sm:px-6">
        <form
          className="mx-auto flex max-w-3xl items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <label className="sr-only" htmlFor="horizon-chat-input">Parlez à votre ferme</label>
          <textarea
            id="horizon-chat-input"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            rows={2}
            placeholder="Parlez à votre ferme"
            disabled={busy}
            className="min-h-[52px] flex-1 resize-none rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm text-[#2f2415] outline-none focus:border-emerald-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy || !command.trim()}
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#22c55e] text-[#052e16] disabled:opacity-50"
            aria-label="Envoyer"
          >
            <Send size={20} />
          </button>
        </form>
      </footer>
    </div>
  );
}
