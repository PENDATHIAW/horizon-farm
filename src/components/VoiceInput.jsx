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
      className={`inline-flex items-center justify-center rounded-lg border px-2.5 py-2 transition-all ${
        voice.listening
          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 animate-pulse'
          : 'border-[#d6c3a0] bg-[#fffdf8] text-[#8a7456] hover:text-emerald-400'
      } ${className}`}
      title={voice.supported ? voice.transcript || 'Dicter' : 'Micro non supporte'}
      disabled={!voice.supported}
    >
      {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
  );
}
