import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getSpeechRecognition() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function isSecureBrowserContext() {
  if (typeof window === 'undefined') return false;
  return window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
}

function supportMessage() {
  if (typeof window === 'undefined') return 'Assistant vocal disponible uniquement dans le navigateur.';
  if (!isSecureBrowserContext()) return 'Le micro vocal nécessite HTTPS ou localhost.';
  if (!getSpeechRecognition()) return 'Reconnaissance vocale non disponible dans ce navigateur. Essaie Chrome ou Edge récent.';
  return '';
}

function friendlyError(error = '') {
  const value = String(error || '').toLowerCase();
  if (value.includes('not-allowed') || value.includes('permission-denied')) return 'Permission micro refusée. Autorise le micro dans les paramètres du site puis réessaie.';
  if (value.includes('service-not-allowed')) return 'Service vocal bloqué par le navigateur. Essaie Chrome/Edge en HTTPS.';
  if (value.includes('audio-capture')) return 'Aucun micro utilisable détecté. Vérifie que le micro est branché et non utilisé ailleurs.';
  if (value.includes('network')) return 'Service vocal indisponible. Vérifie la connexion internet puis réessaie.';
  if (value.includes('no-speech')) return 'Aucune parole détectée. Réessaie en parlant après le bip/indicateur du navigateur.';
  if (value.includes('aborted')) return 'Écoute interrompue. Clique de nouveau sur le micro.';
  return error || 'Micro vocal indisponible pour le moment.';
}

export default function useVoiceRecognition({
  lang = 'fr-FR',
  onResult,
  onInterim,
  continuous = false,
  autoRestart = false,
} = {}) {
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const startingRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    const message = supportMessage();
    queueMicrotask(() => {
      setSupported(!message);
      setHint(message || 'Micro prêt. Clique puis parle clairement en français.');
    });
    return () => {
      shouldRestartRef.current = false;
      try { recognitionRef.current?.stop?.(); } catch { /* ignore cleanup */ }
    };
  }, []);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    startingRef.current = false;
    try { recognitionRef.current?.stop?.(); } catch { /* ignore stale recognition */ }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognition();
    const message = supportMessage();
    setSupported(!message);
    setHint(message || 'Écoute en cours… parle maintenant.');
    if (message || !Recognition) {
      setError(message || 'Reconnaissance vocale non disponible.');
      setListening(false);
      return false;
    }
    if (startingRef.current || listening) return true;

    try { recognitionRef.current?.abort?.(); } catch { /* ignore stale instance */ }

    try {
      startingRef.current = true;
      const recognition = new Recognition();
      recognition.lang = lang;
      recognition.interimResults = true;
      recognition.continuous = continuous;
      recognition.maxAlternatives = 1;
      shouldRestartRef.current = Boolean(autoRestart || continuous);

      recognition.onstart = () => {
        startingRef.current = false;
        setError('');
        setListening(true);
        setHint('Écoute active. Dicte ta commande Horizon Farm.');
      };

      recognition.onerror = (event = {}) => {
        const nextError = friendlyError(event.error);
        setError(nextError);
        setHint(nextError);
        if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(event.error)) {
          shouldRestartRef.current = false;
        }
        startingRef.current = false;
        setListening(false);
      };

      recognition.onend = () => {
        startingRef.current = false;
        setListening(false);
        if (shouldRestartRef.current) {
          window.setTimeout(() => {
            try { recognitionRef.current?.start?.(); } catch { /* browser may reject rapid restart */ }
          }, 650);
        }
      };

      recognition.onresult = (event) => {
        const results = Array.from(event.results || []);
        const text = results.map((result) => result[0]?.transcript || '').join(' ').trim();
        if (text) {
          setTranscript(text);
          onInterim?.(text);
        }
        const finalText = results.filter((result) => result.isFinal).map((result) => result[0]?.transcript || '').join(' ').trim();
        if (finalText) {
          setTranscript(finalText);
          setHint('Commande reçue. Analyse en cours.');
          onResult?.(finalText);
          if (!continuous && !autoRestart) shouldRestartRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      return true;
    } catch (startError) {
      const nextError = friendlyError(startError?.message || 'aborted');
      startingRef.current = false;
      shouldRestartRef.current = false;
      setError(nextError);
      setHint(nextError);
      setListening(false);
      return false;
    }
  }, [lang, onResult, onInterim, continuous, autoRestart, listening]);

  return useMemo(
    () => ({ supported, listening, transcript, error, hint, start, stop, setTranscript }),
    [supported, listening, transcript, error, hint, start, stop]
  );
}
