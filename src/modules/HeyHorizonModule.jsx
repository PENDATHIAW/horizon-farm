import { Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HeyHorizonDraftSummary from '../components/HeyHorizonDraftSummary.jsx';
import HorizonDraftPanel from '../components/HorizonDraftPanel.jsx';
import useHeyHorizonCommand from '../hooks/useHeyHorizonCommand.js';
import { formatStrategicHorizonAnswer, parseHorizonStructuredText } from '../services/assistantResponseFormatter.js';
import { processContextualVoiceInput } from '../services/aiGateway/contextualVoiceService.js';
import { enrichAssistantDataMap } from '../utils/assistantDataMap.js';
import { HORIZON } from './assistant/horizonDesignTokens.js';
import HorizonStructuredMessage from './assistant/HorizonStructuredMessage.jsx';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: 'Situation\nVotre exploitation est prête.\n\nCause\nHorizon centralise ventes, stocks, finances et actions terrain.\n\nAction\nDéclarez ou demandez : vente, récolte, trésorerie, priorités du jour.',
};

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const structured = !isUser ? (message.structured || parseHorizonStructuredText(message.text)) : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[92%] rounded-2xl px-4 py-3"
        style={{
          background: isUser ? HORIZON.userBubble : HORIZON.assistantBubble,
          color: isUser ? '#FFFFFF' : HORIZON.text,
          border: isUser ? 'none' : `1px solid ${HORIZON.border}`,
          boxShadow: isUser ? HORIZON.shadow : HORIZON.shadow,
        }}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
        ) : (
          <HorizonStructuredMessage text={message.text} structured={structured} />
        )}
      </div>
    </div>
  );
}

function ChatDraftBlock({ draft, isValidating, onValidate, onCancel }) {
  return (
    <div className="flex justify-start">
      <div
        className="w-full max-w-[92%] rounded-2xl px-4 py-4"
        style={{
          background: HORIZON.assistantBubble,
          border: `1px solid ${HORIZON.border}`,
          boxShadow: HORIZON.shadow,
          color: HORIZON.text,
        }}
      >
        <HeyHorizonDraftSummary draft={draft} variant="inline" />
        <HorizonDraftPanel
          draft={draft}
          variant="inline"
          isValidating={isValidating}
          onValidate={onValidate}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

export default function HeyHorizonModule({
  dataMap = {},
  salesOrdersAll = [],
  paymentsAll = [],
  transactionsAll = [],
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
        appendMessage('assistant', answerText, { structured: result.strategic });
        return;
      }
      if (result?.kind === 'draft') {
        return;
      }
      appendMessage('assistant', result?.assistantText || 'Reformulez votre action ou question sur votre ferme.');
    } catch (error) {
      toast.error(error.message || 'Analyse impossible');
      appendMessage('assistant', 'Une erreur est survenue. Réessayez ou précisez votre demande.');
    } finally {
      setVoiceBusy(false);
    }
  }, [appendMessage, command, enrichedDataMap, isProcessing, loadDraft, onCreateBusinessEvent, runCommand, voiceBusy]);

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
    appendMessage('assistant', 'Action annulée. Que souhaitez-vous faire sur votre ferme ?');
  };

  const busy = voiceBusy || isProcessing;

  return (
    <div
      className="flex h-[calc(100vh-8rem)] min-h-[520px] flex-col"
      style={{ background: HORIZON.bg }}
    >
      <header
        className="shrink-0 px-6 py-5"
        style={{ borderBottom: `1px solid ${HORIZON.border}`, background: HORIZON.surface }}
      >
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: HORIZON.primary }}>
          Horizon
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: HORIZON.textMuted }}>
          Votre exploitation agricole
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}

          {draft ? (
            <ChatDraftBlock
              draft={draft}
              isValidating={isValidating}
              onValidate={handleValidate}
              onCancel={handleCancel}
            />
          ) : null}

          <div ref={chatEndRef} />
        </div>
      </div>

      <footer
        className="shrink-0 px-4 py-4 sm:px-6"
        style={{ borderTop: `1px solid ${HORIZON.border}`, background: HORIZON.surface }}
      >
        <form
          className="mx-auto flex max-w-2xl items-end gap-3"
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
            rows={1}
            placeholder="Parlez à votre ferme..."
            disabled={busy}
            className="min-h-[48px] flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50"
            style={{
              background: HORIZON.surface,
              border: `1px solid ${HORIZON.border}`,
              color: HORIZON.text,
            }}
          />
          <button
            type="submit"
            disabled={busy || !command.trim()}
            className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"
            style={{ background: HORIZON.primary }}
            aria-label="Envoyer"
          >
            <Send size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
