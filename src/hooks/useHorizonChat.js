import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useCrudModule from './useCrudModule';
import { useAppData } from '../context/AppContext';
import useOnlineStatus from './useOnlineStatus';
import { getHorizonChatStats, getHorizonSensorAlerts, runHorizonAgent } from '../services/horizonAgent';
import { detectVoiceLanguage, speakHorizonText } from '../services/horizonVoice';
import { buildErpSearchContext } from '../services/horizonErpSearch';
import { isLikelyWolof, softenWolofAnswer, wolofFallbackByIntent, wolofIntentHints, wolofTtsPrep } from '../services/wolofStyle';

const localKey = (userId) => `horizon_chat_messages_${userId || 'local'}`;
const safeArray = (value) => Array.isArray(value) ? value : [];
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const welcomeMessage = {
  id: 'welcome-horizon-chat',
  direction: 'in',
  content: 'Bonjour Penda, je suis Horizon. Tu peux me parler en français, wolof ou anglais. Je peux vérifier le stock, la ponte, les ventes, les créances, les tâches, les capteurs et les caméras.',
  quick_replies: [{ label: 'Stock aliment' }, { label: 'Ponte du jour' }, { label: 'Créances' }, { label: 'Alertes capteurs' }],
  created_at: new Date().toISOString(),
};

function fromLocal(userId) {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(localKey(userId)) || '[]'); } catch { return []; }
}

function toLocal(userId, messages) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(userId), JSON.stringify(messages.slice(-100)));
}

function normalizeMessage(row) {
  return { id: row.id || makeId('msg'), direction: row.direction || 'in', content: row.content || '', data_card: row.data_card || row.dataCard || null, quick_replies: row.quick_replies || row.quickReplies || [], intent: row.intent || null, created_at: row.created_at || new Date().toISOString() };
}

function useOptionalCrud(moduleKey) {
  try { return useCrudModule(moduleKey); } catch { return { rows: [], create: null, refresh: null }; }
}

async function askConfiguredAi({ message, dataMap, stats, sensorAlerts, history }) {
  try {
    const context = buildErpSearchContext(dataMap, message, stats, sensorAlerts);
    const response = await fetch('/api/horizon-chat-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context, history }) });
    if (!response.ok) return null;
    const data = await response.json();
    const text = String(data?.text || '').trim();
    if (!text || data?.fallback) return null;
    return { text, provider: data.provider || 'ai', model: data.model || '', context };
  } catch { return null; }
}

function polishAnswerForUser({ question, response, stats }) {
  const wolof = isLikelyWolof(question);
  if (!wolof) return response;
  const hints = wolofIntentHints(question);
  const fallbackText = response.intent === 'fallback' ? wolofFallbackByIntent(response.intent, { stats, hints }) : null;
  return { ...response, language: 'wo', text: softenWolofAnswer(fallbackText || response.text), quickReplies: response.quickReplies?.length ? response.quickReplies : [{ label: 'Stock aliment bi' }, { label: 'Ku ma war xaalis ?' }, { label: 'Kaan moo feebar ?' }, { label: 'Ponte bi naka ?' }] };
}

export default function useHorizonChat({ user }) {
  const { dataMap } = useAppData();
  const { online } = useOnlineStatus();
  const chatCrud = useOptionalCrud('chat_messages');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const financesCrud = useCrudModule('finances');
  const invoicesCrud = useCrudModule('invoices');
  const documentsCrud = useCrudModule('documents');
  const healthCrud = useCrudModule('sante');
  const suppliersCrud = useCrudModule('fournisseurs');
  const eventsCrud = useCrudModule('business_events');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');

  const [localMessages, setLocalMessages] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => typeof window !== 'undefined' && window.localStorage.getItem('horizon_chat_voice') === 'true');
  const syncingLocalRef = useRef(false);
  const autoAlertsRef = useRef(new Set());
  const userId = user?.id || user?.email || 'local';

  useEffect(() => { setLocalMessages(fromLocal(userId)); }, [userId]);
  useEffect(() => { if (typeof window !== 'undefined') window.localStorage.setItem('horizon_chat_voice', voiceEnabled ? 'true' : 'false'); }, [voiceEnabled]);

  const remoteMessages = useMemo(() => safeArray(chatCrud.rows).filter((row) => !row.user_id || String(row.user_id) === String(userId)).map(normalizeMessage), [chatCrud.rows, userId]);
  const sensorAlerts = useMemo(() => getHorizonSensorAlerts(dataMap), [dataMap]);
  const stats = useMemo(() => getHorizonChatStats(dataMap), [dataMap]);

  useEffect(() => {
    if (!sensorAlerts.length) return;
    const newMessages = [];
    sensorAlerts.slice(0, 3).forEach((alert) => {
      const key = `${alert.type}-${alert.id}-${alert.text}`;
      if (autoAlertsRef.current.has(key)) return;
      autoAlertsRef.current.add(key);
      newMessages.push({ id: makeId(alert.type || 'sensor'), direction: 'in', content: `${alert.title} : ${alert.text}. Veux-tu que je crée une tâche de contrôle ?`, intent: alert.type || 'sensor_alert', data_card: { title: 'Alerte terrain', rows: [{ label: 'Type', value: alert.title }, { label: 'Détail', value: alert.text }] }, quick_replies: [{ label: 'Créer une tâche' }, { label: 'Voir capteurs' }, { label: 'Ignorer' }], created_at: new Date().toISOString() });
    });
    if (newMessages.length) {
      setLocalMessages((current) => { const next = [...current, ...newMessages]; toLocal(userId, next); return next; });
      if (voiceEnabled) newMessages.forEach((message) => speakHorizonText(message.content, detectVoiceLanguage(message.content)));
    }
  }, [sensorAlerts, userId, voiceEnabled]);

  const messages = useMemo(() => {
    const merged = [...remoteMessages, ...localMessages.map(normalizeMessage)];
    const seen = new Set();
    const unique = merged.filter((message) => { if (seen.has(message.id)) return false; seen.add(message.id); return true; }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return unique.length ? unique : [welcomeMessage];
  }, [remoteMessages, localMessages]);

  const persistMessage = useCallback(async (message) => {
    const row = normalizeMessage({ ...message, user_id: userId });
    if (!online || !chatCrud.create) {
      setLocalMessages((current) => { const next = [...current, row]; toLocal(userId, next); return next; });
      return row;
    }
    try {
      await chatCrud.create({ id: row.id, user_id: userId, direction: row.direction, content: row.content, data_card: row.data_card, quick_replies: row.quick_replies, intent: row.intent, created_at: row.created_at });
      await chatCrud.refresh?.();
      return row;
    } catch {
      setLocalMessages((current) => { const next = [...current, row]; toLocal(userId, next); return next; });
      return row;
    }
  }, [chatCrud, online, userId]);

  useEffect(() => {
    if (!online || !chatCrud.create || !localMessages.length || syncingLocalRef.current) return;
    let cancelled = false;
    syncingLocalRef.current = true;
    (async () => {
      try {
        const remaining = [];
        for (const message of localMessages) {
          if (cancelled) return;
          try { const row = normalizeMessage({ ...message, user_id: userId }); await chatCrud.create({ id: row.id, user_id: userId, direction: row.direction, content: row.content, data_card: row.data_card, quick_replies: row.quick_replies, intent: row.intent, created_at: row.created_at }); } catch { remaining.push(message); }
        }
        if (!cancelled) { setLocalMessages(remaining); toLocal(userId, remaining); await chatCrud.refresh?.(); }
      } finally { syncingLocalRef.current = false; }
    })();
    return () => { cancelled = true; };
  }, [chatCrud, localMessages, online, userId]);

  const sendMessage = useCallback(async (content) => {
    const clean = String(content || '').trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      const outMessage = { id: makeId('out'), direction: 'out', content: clean, created_at: new Date().toISOString() };
      await persistMessage(outMessage);
      const history = messages.slice(-8);
      const ai = !pendingAction ? await askConfiguredAi({ message: clean, dataMap, stats, sensorAlerts, history }) : null;
      let response;
      if (ai?.text) {
        response = { text: ai.text, intent: 'ai_answer', quickReplies: [], dataCard: null };
      } else {
        response = await runHorizonAgent({ message: clean, dataMap, pendingAction, actions: { production: productionCrud, sales: salesCrud, payments: paymentsCrud, finances: financesCrud, invoices: invoicesCrud, documents: documentsCrud, health: healthCrud, suppliers: suppliersCrud, events: eventsCrud, tasks: tasksCrud, alerts: alertsCrud } });
      }
      response = polishAnswerForUser({ question: clean, response, stats });
      setPendingAction(response.pendingAction || null);
      await persistMessage({ id: makeId('in'), direction: 'in', content: response.text, data_card: response.dataCard || null, quick_replies: response.quickReplies || [], intent: response.intent, created_at: new Date().toISOString() });
      if (voiceEnabled && response.text) {
        const voiceText = response.language === 'wo' ? wolofTtsPrep(response.text) : response.text;
        speakHorizonText(voiceText, response.language ? { fr: 'fr-FR', en: 'en-US', wo: 'wo-SN' }[response.language] : detectVoiceLanguage(voiceText));
      }
    } finally { setSending(false); }
  }, [alertsCrud, dataMap, documentsCrud, eventsCrud, financesCrud, healthCrud, invoicesCrud, messages, paymentsCrud, pendingAction, persistMessage, productionCrud, salesCrud, sending, sensorAlerts, stats, suppliersCrud, tasksCrud, voiceEnabled]);

  const toggleVoice = useCallback(() => setVoiceEnabled((value) => !value), []);
  const speakLast = useCallback(() => {
    const lastIncoming = [...messages].reverse().find((message) => message.direction !== 'out' && message.content);
    if (lastIncoming) { const voiceText = isLikelyWolof(lastIncoming.content) ? wolofTtsPrep(lastIncoming.content) : lastIncoming.content; speakHorizonText(voiceText, detectVoiceLanguage(voiceText)); }
  }, [messages]);

  return { messages, stats, sensorAlerts, sending, online, sendMessage, pendingAction, voiceEnabled, toggleVoice, speakLast };
}
