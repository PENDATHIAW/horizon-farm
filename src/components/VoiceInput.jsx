import { Mic, MicOff } from 'lucide-react';
import useVoiceRecognition from '../hooks/useVoiceRecognition';

export default function VoiceInput({ onText, className = '' }) {
  const voice = useVoiceRecognition({
    onResult: (text) => onText?.(text),
  });

  return (
    <button
      type="button"
      onClick={voice.listening ? voice.stop : voice.start}
      className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 transition-all ${
        voice.listening
          ? 'border-positive bg-positive text-positive animate-pulse'
          : 'border-line bg-card text-slate hover:text-positive'
      } ${className}`}
      title={voice.supported ? voice.transcript || 'Dicter' : 'Micro non supporte'}
      disabled={!voice.supported}
    >
      {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
  );
}
