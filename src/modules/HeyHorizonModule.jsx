import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import useHeyHorizonCommand from '../hooks/useHeyHorizonCommand.js';
import { buildAssistantWelcomeMessage } from '../services/assistantFarmSecretary.js';
import { fetchLlmStatus } from '../services/heyHorizonLlmService.js';
import { isDetailFollowUp } from '../services/assistantProgressiveResponse.js';
import { formatStrategicHorizonAnswer, stripTechnicalLeaks } from '../services/assistantResponseFormatter.js';
import { shouldRouteToAssistant } from '../services/assistantChatRouting.js';
import { enrichAssistantDataMap } from '../utils/assistantDataMap.js';
import { HORIZON_DESIGN as D } from './assistant/horizonDesignTokens.js';
import HorizonPhoneShell, {
  HorizonAssistantBubble,
  HorizonChatCanvas,
  HorizonChatComposer,
  HorizonPhoneHeader,
  HorizonUserBubble,
} from './assistant/HorizonPhoneShell.jsx';
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

function ThinkingBubble() {
  return (
    <HorizonAssistantBubble>
      <span style={{ color: D.textMuted }}>Un instant…</span>
    </HorizonAssistantBubble>
  );
}

function renderAssistantContent(message) {
  if (message.isWelcome || message.plain) {
    return <span className="whitespace-pre-wrap">{message.text}</span>;
  }
  return (
    <HorizonStructuredMessage
      text={message.text}
      structured={message.structured}
    />
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
  const chatScrollRef = useRef(null);
  const stickToBottomRef = useRef(true);
  const pendingProgressiveRef = useRef(null);

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
    transactionsAll,
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

  const welcomeMessage = useMemo(
    () => ({ ...buildAssistantWelcomeMessage(displayName, secretaryProps), time: messageTime() }),
    [displayName, secretaryProps],
  );

  const [messages, setMessages] = useState([]);
  const [llmStatus, setLlmStatus] = useState(null);

  useEffect(() => {
    let active = true;
    fetchLlmStatus()
      .then((status) => {
        if (active) setLlmStatus(status);
      })
      .catch(() => {
        if (active) setLlmStatus({ configured: false, llm_available: false });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      setMessages((prev) => {
        const conversation = prev.filter((message) => !message.isWelcome);
        if (!conversation.length && !prev.length) return [welcomeMessage];
        if (prev.some((message) => message.isWelcome)) return [welcomeMessage, ...conversation];
        return [welcomeMessage, ...prev];
      });
    });
  }, [welcomeMessage]);

  const { isProcessing, runCommand, cancelDraft } = useHeyHorizonCommand({
    dataMap: enrichedDataMap,
    onNavigate,
    allowWeakDraft: false,
  });

  const appendMessage = useCallback((role, text, extra = {}) => {
    const cleanText = stripTechnicalLeaks(String(text || ''));
    setMessages((prev) => [...prev, {
      id: `${Date.now()}-${prev.length}`,
      role,
      text: cleanText,
      time: messageTime(),
      ...extra,
    }]);
  }, []);

  const scrollToBottom = useCallback((force = false) => {
    const el = chatScrollRef.current;
    if (!el || (!force && !stickToBottomRef.current)) return;
    el.scrollTo({ top: el.scrollHeight, behavior: force ? 'smooth' : 'auto' });
  }, []);

  const handleChatScroll = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 96;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(async (text = command) => {
    const query = String(text || '').trim();
    if (!query || voiceBusy || isProcessing) return;

    if (isDetailFollowUp(query) && pendingProgressiveRef.current?.fullText) {
      setCommand('');
      appendMessage('user', query);
      appendMessage('assistant', pendingProgressiveRef.current.fullText, {
        structured: pendingProgressiveRef.current.structured,
      });
      pendingProgressiveRef.current = null;
      return;
    }

    setCommand('');
    appendMessage('user', query);
    stickToBottomRef.current = true;
    scrollToBottom(true);
    setVoiceBusy(true);
    try {
      if (!shouldRouteToAssistant(query)) {
        appendMessage('assistant', 'Je peux expliquer la marche à suivre, mais aucune saisie ne peut être créée depuis la conversation.', { plain: true });
        return;
      }

      const result = await runCommand(query, { autoOpenForm: false, navigateOnDraft: false });
      if (!result) {
        appendMessage('assistant', 'Je n\'ai pas bien saisi. Reformulez en une phrase simple - par exemple « mes ventes » ou « combien de bovins ».');
        return;
      }

      if (result.progressive?.hasDetail) {
        pendingProgressiveRef.current = {
          fullText: result.progressive.fullText,
          structured: result.strategic || result.answer,
        };
      } else {
        pendingProgressiveRef.current = null;
      }

      if (result.kind === 'redirect_pilotage') {
        appendMessage('assistant', result.assistantText || 'Très bien, je vous y emmène.');
        return;
      }
      if (result.kind === 'strategic' || result.kind === 'llm' || result.kind === 'fallback') {
        const answerText = stripTechnicalLeaks(
          result.assistantText
          || formatStrategicHorizonAnswer(result.strategic)
          || 'Je n\'ai pas assez de données pour répondre.',
        );
        appendMessage('assistant', answerText, { structured: result.strategic });
        return;
      }
      if (result.kind === 'draft') {
        cancelDraft();
        appendMessage('assistant', 'Suggestion préparée. Ouvrez le module concerné pour enregistrer la saisie.', { plain: true });
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
  }, [appendMessage, cancelDraft, command, isProcessing, runCommand, scrollToBottom, voiceBusy]);

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

  const handleMic = () => {
    toast('Micro bientôt disponible. Écrivez votre message pour l\'instant.');
  };

  const busy = voiceBusy || isProcessing;

  return (
    <HorizonPhoneShell>
      <HorizonPhoneHeader />
      {llmStatus && !llmStatus.configured ? (
        <div
          className="mx-4 mb-2 rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-meta text-horizon-dark"
          role="status"
        >
          L’assistant vocal avancé sera bientôt disponible. En attendant, décrivez simplement votre besoin (vente, achat, alerte…).
        </div>
      ) : null}
      <HorizonChatCanvas scrollRef={chatScrollRef} onScroll={handleChatScroll}>
        {messages.map((message) => (
          message.role === 'user' ? (
            <HorizonUserBubble key={message.id} time={message.time}>
              {message.text}
            </HorizonUserBubble>
          ) : (
            <HorizonAssistantBubble key={message.id} time={message.time}>
              {renderAssistantContent(message)}
            </HorizonAssistantBubble>
          )
        ))}

        {busy ? <ThinkingBubble /> : null}

        <div className="h-2 shrink-0" aria-hidden />
      </HorizonChatCanvas>

      <HorizonChatComposer
        value={command}
        onChange={setCommand}
        onSubmit={() => handleSubmit()}
        onAttach={() => toast('La conversation est en lecture seule. Ouvrez Documents & Rapports pour ajouter un fichier.')}
        onMic={handleMic}
        disabled={busy}
        placeholder="Parlez à votre ferme..."
      />
    </HorizonPhoneShell>
  );
}
