import { CheckCheck, Mic, Send, Smile } from 'lucide-react';
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
import HorizonPhoneShell from './assistant/HorizonPhoneShell.jsx';
import HorizonStructuredMessage from './assistant/HorizonStructuredMessage.jsx';

function displayNameFromUser(user = {}) {
  const raw = user?.user_metadata?.name
    || user?.user_metadata?.login
    || user?.email?.split('@')[0]
    || 'Exploitant';
  const text = String(raw).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function messageTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  const structured = !isUser && !message.isWelcome
    ? (message.structured || parseHorizonStructuredText(message.text))
    : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[min(88%,520px)] px-3.5 py-2 text-[15px] leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-2xl rounded-tr-md'
            : 'rounded-2xl rounded-tl-md border border-black/5'
        }`}
        style={{
          background: isUser ? HORIZON.userBubble : HORIZON.assistantBubble,
          color: isUser ? HORIZON.userBubbleText : HORIZON.text,
        }}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : message.isWelcome ? (
          <p className="whitespace-pre-wrap">{message.text}</p>
        ) : (
          <HorizonStructuredMessage text={message.text} structured={structured} />
        )}
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${
            isUser ? 'text-[#5d7364]' : 'text-[#8a8a8a]'
          }`}
        >
          <span>{message.time || messageTime()}</span>
          {isUser ? <CheckCheck size={14} className="text-[#4fc3f7]" /> : null}
        </div>
      </div>
    </div>
  );
}

function ChatDraftBlock({ draft, isValidating, onValidate, onCancel }) {
  return (
    <div className="flex justify-start">
      <div
        className="w-full max-w-[min(92%,520px)] rounded-2xl rounded-tl-md border border-black/5 px-4 py-4 shadow-sm"
        style={{ background: HORIZON.assistantBubble, color: HORIZON.text }}
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
        className="rounded-2xl rounded-tl-md border border-black/5 px-4 py-3 text-sm shadow-sm"
        style={{ background: HORIZON.assistantBubble, color: HORIZON.textMuted }}
      >
        Un instant…
      </div>
    </div>
  );
}

function PhoneHeader({ header, displayName }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-xl ring-2 ring-white/15">
        <span aria-hidden="true">{header?.brandEmoji || '🌿'}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[19px] font-bold tracking-tight">
          {header?.brandName || 'Horizon'}
        </h1>
        <p className="truncate text-sm text-white/85">
          {header?.tagline || 'Parlez à votre ferme'}
          {header?.statsLine ? ` · ${header.statsLine}` : ''}
        </p>
        <p className="truncate text-xs text-white/65">{displayName} · en ligne</p>
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
    () => ({ ...buildAssistantWelcomeMessage(displayName, secretaryProps), time: messageTime() }),
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
    setMessages((prev) => [...prev, {
      id: `${Date.now()}-${prev.length}`,
      role,
      text,
      time: messageTime(),
      ...extra,
    }]);
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
  const canSend = command.trim().length > 0 && !busy;

  return (
    <HorizonPhoneShell
      header={<PhoneHeader header={farmHeader} displayName={displayName} />}
      footer={(
        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <label className="sr-only" htmlFor="horizon-chat-input">Parlez à votre ferme</label>
          <div
            className="flex min-w-0 flex-1 items-center gap-2 rounded-full px-3 py-2 shadow-sm"
            style={{ background: HORIZON.surface }}
          >
            <Smile size={22} className="shrink-0 text-[#7d8580]" aria-hidden="true" />
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
              className="max-h-28 min-h-[24px] min-w-0 flex-1 resize-none bg-transparent text-[15px] outline-none placeholder:text-[#8b948f] disabled:opacity-50"
              style={{ color: HORIZON.text }}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !canSend}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white shadow-lg transition-opacity disabled:opacity-40"
            style={{ background: canSend ? HORIZON.sendButton : HORIZON.primary }}
            aria-label={canSend ? 'Envoyer' : 'Micro'}
          >
            {canSend ? <Send size={20} /> : <Mic size={22} />}
          </button>
        </form>
      )}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
        <div
          className="mx-auto w-fit rounded-xl px-4 py-2 text-center text-xs font-semibold shadow-sm"
          style={{ background: '#FFF4CF', color: '#5F5333' }}
        >
          Parlez à votre ferme — données ERP en direct
        </div>

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
    </HorizonPhoneShell>
  );
}
