import { useCallback, useMemo, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

export default function useVoiceRecognition({
  lang = 'fr-FR',
  onResult,
  onInterim,
  continuous = false,
  autoRestart = false,
} = {}) {
  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const supported = Boolean(SpeechRecognition);

  const stop = useCallback(() => {
    shouldRestartRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Reconnaissance vocale non supportee par ce navigateur.');
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stale recognition instance errors.
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = continuous;
    shouldRestartRef.current = Boolean(autoRestart || continuous);

    recognition.onstart = () => {
      setError('');
      setListening(true);
    };

    recognition.onerror = (event) => {
      setError(event.error || 'Erreur microphone');
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        shouldRestartRef.current = false;
      }
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      if (shouldRestartRef.current) {
        window.setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {
            // Browser may refuse rapid restart; next user action can restart.
          }
        }, 450);
      }
    };

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      setTranscript(text);
      onInterim?.(text);

      const finalText = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      if (finalText) onResult?.(finalText);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (startError) {
      setError(startError?.message || 'Impossible de demarrer le micro');
      setListening(false);
    }
  }, [lang, onResult, onInterim, continuous, autoRestart]);

  return useMemo(
    () => ({ supported, listening, transcript, error, start, stop, setTranscript }),
    [supported, listening, transcript, error, start, stop]
  );
}
