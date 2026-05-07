import { useCallback, useMemo, useRef, useState } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition || null
    : null;

export default function useVoiceRecognition({ lang = 'fr-FR', onResult } = {}) {
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const supported = Boolean(SpeechRecognition);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Reconnaissance vocale non supportee par ce navigateur.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setError('');
      setListening(true);
    };

    recognition.onerror = (event) => {
      setError(event.error || 'Erreur microphone');
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      setTranscript(text);

      const finalText = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();

      if (finalText) onResult?.(finalText);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onResult]);

  return useMemo(
    () => ({ supported, listening, transcript, error, start, stop, setTranscript }),
    [supported, listening, transcript, error, start, stop]
  );
}
