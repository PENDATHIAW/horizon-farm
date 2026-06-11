import { Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import HeyHorizonDraftSummary from '../components/HeyHorizonDraftSummary.jsx';
import HorizonDraftPanel from '../components/HorizonDraftPanel.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import useHeyHorizonCommand from '../hooks/useHeyHorizonCommand.js';
import {
  buildAssistantFarmHeader,
  buildAssistantWelcomeMessage,
} from '../services/assistantFarmSecretary.js';
import { formatStrategicHorizonAnswer, parseHorizonStructuredText } from '../services/assistantResponseFormatter.js';
import { normalizeAgriculturalText } from '../services/assistantUniversalIntents.js';
import { processContextualVoiceInput } from '../services/aiGateway/contextualVoiceService.js';
import { enrichAssistantDataMap } from '../utils/assistantDataMap.js';
import { HORIZON } from './assistant/horizonDesignTokens.js';
import HorizonStructuredMessage from './assistant/HorizonStructuredMessage.jsx';

function displayNameFromUser(user = {}) {
  const raw = user?.user_metadata?.name
    || user?.user_metadata?.login
    || user?.email?.split('@')[0]
    || 'Exploitant';
  const text = String(raw).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const structured = !isUser && !message.isWelcome
    ? (message.structured || parseHorizonStructuredText(message.text))
    : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`${isUser ? 'max-w-[min(85%,520px)]' : 'max-w-[min(92%,640px)]'} px-5 py-4`}
        style={{
          background: isUser ? HORIZON.userBubble : HORIZON.assistantBubble,
          color: isUser ? HORIZON.userBubbleText : HORIZON.text,
          borderRadius: HORIZON.radiusBubble,
          border: isUser ? 'none' : `1px solid ${HORIZON.border}`,
          boxShadow: isUser ? HORIZON.shadowSm : HORIZON.shadow,
        }}
      >
        {isUser ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>
        ) : message.isWelcome ? (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: HORIZON.text }}>
            {message.text}
          </p>
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
        className="w-full max-w-[min(92%,640px)] px-5 py-5"
        style={{
          background: HORIZON.assistantBubble,
          borderRadius: HORIZON.radiusBubble,
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

function isBusinessQuestion(text = '') {
  const q = normalizeAgriculturalText(text);
  const trimmed = String(text || '').trim();
  if (trimmed.endsWith('?')) return true;
  return /^(combien|quel|quelle|quels|quelles|qui|comment|est ce|ou |vais je|que dois|ai je|montre|donne)/.test(q)
    || /comment va/.test(q)
    || /(me doit|doivent|reste|stock|tresorerie|objectif|rentable|ferme|magasin|aliment)/.test(q);
}

function ThinkingBubble() {
  return (
    <div className="flex justify-start">
      <div
        className="px-5 py-4 text-sm"
        style={{
          background: HORIZON.assistantBubble,
          borderRadius: HORIZON.radiusBubble,
          border: `1px solid ${HORIZON.border}`,
          boxShadow: HORIZON.shadowSm,
          color: HORIZON.textMuted,
        }}
      >
        Un instant…
      </div>
    </div>
  );
}

function FarmHeader({ header }) {
  if (!header) return null;
  return (
    <header
      className="shrink-0 px-6 py-8 sm:px-10"
      style={{ borderBottom: `1px solid ${HORIZON.border}`, background: HORIZON.bg }}
    >
      <div className="mx-auto w-full" style={{ maxWidth: HORIZON.maxChatWidth }}>
        <div className="flex items-center gap-2.5">
          <span className="text-[26px] leading-none" aria-hidden="true">{header.brandEmoji || '🌿'}</span>
          <h1 className="text-[26px] font-semibold tracking-tight" style={{ color: HORIZON.primary }}>
            {header.brandName || header.farmName || 'Horizon'}
          </h1>
        </div>
        <p className="mt-2 text-[17px] font-medium tracking-tight" style={{ color: HORIZON.text }}>
          {header.tagline || 'Parlez à votre ferme'}
        </p>
        <p className="mt-2 text-sm" style={{ color: HORIZON.textMuted }}>
          {header.statsLine}
        </p>
      </div>
    </header>
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
  animaux,
  cultures,
  stocks,
  clients,
  lots,
  lotsData,
  vaccins,
  sante,
  taches,
  alimentationLogs,
  productionLogs,
}) {
  const { user } = useAuth();
  const displayName = displayNameFromUser(user);
  const [command, setCommand] = useState('');
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

  const secretaryProps = useMemo(() => ({
    dataMap: enrichedDataMap,
    salesOrdersAll,
    paymentsAll,
    transactionsAll: transactionsAll,
    businessEvents: businessEventsAll.length ? businessEventsAll : businessEvents,
    animaux,
    cultures,
    stocks,
    clients,
    lots: lotsData || lots,
    vaccins,
    sante,
    taches,
    alimentationLogs,
    productionLogs,
    periodScope,
  }), [
    enrichedDataMap,
    salesOrdersAll,
    paymentsAll,
    transactionsAll,
    businessEvents,
    businessEventsAll,
    animaux,
    cultures,
    stocks,
    clients,
    lots,
    lotsData,
    vaccins,
    sante,
    taches,
    alimentationLogs,
    productionLogs,
    periodScope,
  ]);

  const farmHeader = useMemo(
    () => buildAssistantFarmHeader(secretaryProps),
    [secretaryProps],
  );

  const welcomeMessage = useMemo(
    () => buildAssistantWelcomeMessage(displayName, secretaryProps),
    [displayName, secretaryProps],
  );

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    setMessages((prev) => {
      const conversation = prev.filter((message) => !message.isWelcome);
      if (!conversation.length && !prev.length) return [welcomeMessage];
      if (prev.some((message) => message.isWelcome)) return [welcomeMessage, ...conversation];
      return [welcomeMessage, ...prev];
    });
  }, [welcomeMessage]);

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
      if (!isBusinessQuestion(query)) {
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
      }

      const result = await runCommand(query, { autoOpenForm: false, navigateOnDraft: false });
      if (!result) {
        appendMessage('assistant', 'Je n\'ai pas bien saisi. Reformulez en une phrase simple — par exemple « mes ventes » ou « combien de bovins ».');
        return;
      }
      if (result.kind === 'redirect_pilotage') {
        appendMessage('assistant', result.assistantText || 'Je vous ouvre le bon espace.');
        return;
      }
      if (result.kind === 'strategic' || result.kind === 'llm' || result.kind === 'fallback') {
        const answerText = formatStrategicHorizonAnswer(result.strategic) || result.assistantText || 'Je n\'ai pas assez de données pour répondre.';
        appendMessage('assistant', answerText, { structured: result.strategic });
        return;
      }
      if (result.kind === 'draft') {
        return;
      }
      if (result.kind === 'error' || result.kind === 'empty') {
        appendMessage('assistant', result.assistantText || 'Reformulez votre demande sur la ferme.');
        return;
      }
      appendMessage('assistant', result.assistantText || 'Reformulez votre demande sur la ferme.');
    } catch (error) {
      toast.error(error.message || 'Analyse impossible');
      appendMessage('assistant', 'Un problème est survenu. Réessayez en précisant l\'action ou la question.');
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
      appendMessage('assistant', 'C\'est noté — tout est enregistré dans le carnet de la ferme.');
      cancelDraft();
    } catch {
      // toast handled in hook
    }
  };

  const handleCancel = () => {
    cancelDraft();
    appendMessage('assistant', 'D\'accord, je n\'ai rien enregistré. On continue — que voulez-vous faire ?');
  };

  const busy = voiceBusy || isProcessing;

  return (
    <div
      className="flex min-h-[calc(100vh-8rem)] flex-col"
      style={{ background: HORIZON.bg }}
    >
      <FarmHeader header={farmHeader} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-8 sm:px-10">
          <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: HORIZON.maxChatWidth }}>
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message} />
            ))}

            {busy && !draft ? <ThinkingBubble /> : null}

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

        <footer className="shrink-0 px-6 pb-8 pt-2 sm:px-10">
          <form
            className="mx-auto flex items-center gap-3"
            style={{ maxWidth: HORIZON.maxChatWidth }}
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
              className="min-h-[56px] flex-1 resize-none px-6 py-4 text-[15px] outline-none transition-shadow disabled:opacity-50"
              style={{
                background: HORIZON.surface,
                border: `1px solid ${HORIZON.border}`,
                borderRadius: HORIZON.radiusInput,
                color: HORIZON.text,
                boxShadow: HORIZON.shadowInput,
              }}
            />
            <button
              type="submit"
              disabled={busy || !command.trim()}
              className="flex h-14 w-14 shrink-0 items-center justify-center text-white transition-opacity disabled:opacity-35"
              style={{
                background: HORIZON.primary,
                borderRadius: HORIZON.radiusInput,
                boxShadow: HORIZON.shadow,
              }}
              aria-label="Envoyer"
            >
              <Send size={20} />
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
