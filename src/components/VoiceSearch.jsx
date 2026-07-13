import { Mic, Search } from 'lucide-react';
import useVoiceRecognition from '../hooks/useVoiceRecognition';

export default function VoiceSearch({ value, onChange, placeholder = 'Recherche vocale...' }) {
  const voice = useVoiceRecognition({
    onResult: (text) => onChange?.(text),
  });

  return (
    <div className="relative min-w-64">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={voice.listening ? voice.transcript || 'Ecoute...' : placeholder}
        className="w-full bg-card border border-line rounded-lg pl-12 pr-12 py-2 text-sm text-earth placeholder-slate outline-none focus:border-positive"
      />
      <button
        type="button"
        onClick={voice.listening ? voice.stop : voice.start}
        disabled={!voice.supported}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md transition-all ${
          voice.listening ? 'bg-positive text-positive animate-pulse' : 'text-slate hover:text-positive'
        }`}
        title={voice.supported ? 'Recherche vocale' : 'Micro non supporte'}
      >
        <Mic size={14} />
      </button>
    </div>
  );
}
