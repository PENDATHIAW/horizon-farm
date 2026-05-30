import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppData } from '../context/AppContext';
import {
  openHeyHorizonForm,
  processHeyHorizonCommandAsync,
  updateHeyHorizonDraftField,
  validateHeyHorizonDraft,
} from '../services/heyHorizonAssistantService.js';

export default function useHeyHorizonCommand({
  dataMap = {},
  onNavigate,
  allowWeakDraft = false,
  onCreateBusinessEvent,
  forceLlm = false,
} = {}) {
  const { refreshModule } = useAppData();
  const [draft, setDraft] = useState(null);
  const [strategic, setStrategic] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastSource, setLastSource] = useState('rules');

  const runCommand = useCallback(async (rawText = '', options = {}) => {
    const text = String(rawText || '').trim();
    if (!text) return null;
    setIsProcessing(true);
    try {
      const result = await processHeyHorizonCommandAsync(text, {
        dataMap,
        currentDraft: options.mergeDraft ? draft : null,
        allowWeakDraft,
        forceLlm: options.forceLlm ?? forceLlm,
      });
      setLastSource(result.source || (result.kind === 'strategic' ? 'rules' : 'rules'));
      if (result.kind === 'strategic' || result.kind === 'llm') {
        setStrategic(result.strategic);
        setDraft(null);
      } else if (result.kind === 'draft') {
        setStrategic(null);
        setDraft(result.draft);
        if (result.autoOpenForm && options.autoOpenForm !== false) {
          openHeyHorizonForm(result.draft, onNavigate);
        } else if (result.draft?.primary_module && options.navigateOnDraft) {
          onNavigate?.(result.draft.primary_module);
        }
      } else {
        setStrategic(null);
        setDraft(null);
        if (result.fallbackModule && result.fallbackModule !== 'ventes') {
          onNavigate?.(result.fallbackModule);
        }
      }
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [allowWeakDraft, dataMap, draft, forceLlm, onNavigate]);

  const updateDraftField = useCallback((key, value) => {
    setDraft((current) => updateHeyHorizonDraftField(current, key, value));
  }, []);

  const cancelDraft = useCallback(() => {
    setDraft(null);
    setStrategic(null);
  }, []);

  const loadDraft = useCallback((nextDraft) => {
    if (!nextDraft) return;
    setDraft(nextDraft);
    setStrategic(null);
  }, []);

  const validateDraft = useCallback(async () => {
    if (!draft || isValidating) return null;
    setIsValidating(true);
    try {
      const result = await validateHeyHorizonDraft(draft, { refreshModule, onNavigate, onCreateBusinessEvent });
      if (result.openedForm) {
        toast.success(result.message);
      } else {
        toast.success(result.executed ? 'Action exécutée' : 'Action préparée');
      }
      setDraft(null);
      return result;
    } catch (error) {
      toast.error(error.message || 'Validation impossible');
      throw error;
    } finally {
      setIsValidating(false);
    }
  }, [draft, isValidating, onCreateBusinessEvent, onNavigate, refreshModule]);

  return {
    draft,
    strategic,
    isValidating,
    isProcessing,
    lastSource,
    runCommand,
    updateDraftField,
    cancelDraft,
    loadDraft,
    validateDraft,
    setDraft,
    setStrategic,
  };
}
