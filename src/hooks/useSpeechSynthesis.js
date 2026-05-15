import { useCallback, useEffect, useMemo, useState } from 'react';

function pickFrenchVoice(voices = [], lang = 'fr-FR') {
  const normalized = String(lang || 'fr-FR').toLowerCase();
  return voices.find((voice) => String(voice.lang || '').toLowerCase() === normalized)
    || voices.find((voice) => String(voice.lang || '').toLowerCase().startsWith('fr'))
    || voices[0]
    || null;
}

export default function useSpeechSynthesis({ lang = 'fr-FR' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem('horizon_farm_assistant_voice_enabled') === 'true'; } catch { return false; }
  });
  const [lastError, setLastError] = useState('');
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => {
    if (!supported) return undefined;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices?.() || []);
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if (window.speechSynthesis.onvoiceschanged === loadVoices) window.speechSynthesis.onvoiceschanged = null;
    };
  }, [supported]);

  useEffect(() => {
    try { localStorage.setItem('horizon_farm_assistant_voice_enabled', enabled ? 'true' : 'false'); } catch { /* noop */ }
  }, [enabled]);

  const speak = useCallback(
    (text, options = {}) => {
      if (!supported || !text) return false;
      if (!enabled && !options.force) return false;
      const cleanText = String(text).replace(/[*_#`]/g, '').replace(/\s+/g, ' ').trim();
      if (!cleanText) return false;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voice = pickFrenchVoice(voices, lang);
        if (voice) utterance.voice = voice;
        utterance.lang = voice?.lang || lang;
        utterance.rate = options.rate || 0.98;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume ?? 1;
        utterance.onstart = () => {
          setLastError('');
          setSpeaking(true);
        };
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = (event) => {
          setLastError(event?.error || 'Erreur synthèse vocale');
          setSpeaking(false);
        };
        window.speechSynthesis.speak(utterance);
        return true;
      } catch (error) {
        setLastError(error.message || 'Synthèse vocale indisponible');
        setSpeaking(false);
        return false;
      }
    },
    [enabled, lang, supported, voices]
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const enable = useCallback(() => {
    setEnabled(true);
    setLastError('');
  }, []);

  const disable = useCallback(() => {
    setEnabled(false);
    stop();
  }, [stop]);

  const toggle = useCallback(() => {
    setEnabled((value) => !value);
    if (enabled) stop();
  }, [enabled, stop]);

  const test = useCallback(() => speak('Réponse vocale activée. Je peux maintenant te répondre à l’oral.', { force: true }), [speak]);

  return useMemo(() => ({ supported, enabled, speaking, voices, lastError, speak, stop, enable, disable, toggle, test }), [supported, enabled, speaking, voices, lastError, speak, stop, enable, disable, toggle, test]);
}
