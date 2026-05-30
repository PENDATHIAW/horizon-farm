import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { useAppData } from '../context/AppContext';
import {
  openHeyHorizonForm,
  processHeyHorizonCommand,
  updateHeyHorizonDraftField,
  validateHeyHorizonDraft,
} from '../services/heyHorizonAssistantService.js';

export default function useHeyHorizonCommand({
  dataMap = {},
  onNavigate,
  allowWeakDraft = false,
} = {}) {
  const { refreshModule } = useAppData();
  const [draft, setDraft] = useState(null);
  const [strategic, setStrategic] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const runCommand = useCallback(async (rawText = '', options = {}) => {
    const text = String(rawText || '').trim();
    if (!text) return null;
    setIsProcessing(true);
    try {
      const result = processHeyHorizonCommand(text, {
        dataMap,
        currentDraft: options.mergeDraft ? draft : null,
        allowWeakDraft,
      });
      if (result.kind === 'strategic') {
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
  }, [allowWeakDraft, dataMap, draft, onNavigate]);

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
      const result = await validateHeyHorizonDraft(draft, { refreshModule, onNavigate });
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
  }, [draft, isValidating, onNavigate, refreshModule]);

  return {
    draft,
    strategic,
    isValidating,
    isProcessing,
    runCommand,
    updateDraftField,
    cancelDraft,
    loadDraft,
    validateDraft,
    setDraft,
    setStrategic,
  };
}
