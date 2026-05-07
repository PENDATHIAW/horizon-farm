import { Mic, Search } from 'lucide-react';
import useVoiceRecognition from '../hooks/useVoiceRecognition';

export default function VoiceSearch({ value, onChange, placeholder = 'Recherche vocale...' }) {
  const voice = useVoiceRecognition({
    onResult: (text) => onChange?.(text),
  });

  return (
    <div className="relative min-w-64">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8a7456]" />
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={voice.listening ? voice.transcript || 'Ecoute...' : placeholder}
        className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg pl-9 pr-10 py-2 text-sm text-[#2f2415] placeholder-[#b39b78] outline-none focus:border-emerald-500"
      />
      <button
        type="button"
        onClick={voice.listening ? voice.stop : voice.start}
        disabled={!voice.supported}
        className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${
          voice.listening ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' : 'text-[#8a7456] hover:text-emerald-400'
        }`}
        title={voice.supported ? 'Recherche vocale' : 'Micro non supporte'}
      >
        <Mic size={14} />
      </button>
    </div>
  );
}
