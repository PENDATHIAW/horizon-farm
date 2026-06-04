import { Bot, Mic, MicOff, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis.js';
import {
  BRIEF_QUERY_TYPES,
  buildWeeklyFarmBrief,
  isFarmBriefQuery,
  processHeyHorizonVoiceBrief,
} from '../services/heyHorizonVoice/farmBriefService.js';

const QUICK_BRIEFS = [
  { label: 'Brief de la semaine', phrase: 'Hey Horizon, fais-moi le brief de la semaine.', type: BRIEF_QUERY_TYPES.WEEKLY },
  { label: 'Encaissements', phrase: 'Combien ai-je encaissé ce mois-ci ?', type: BRIEF_QUERY_TYPES.ENCAISSEMENTS },
  { label: 'Lot rentable', phrase: 'Quel lot est le plus rentable ?', type: BRIEF_QUERY_TYPES.LOT_RENTABLE },
  { label: 'Risques', phrase: 'Quels sont mes risques actuels ?', type: BRIEF_QUERY_TYPES.RISQUES },
  { label: 'Stocks faibles', phrase: 'Quels stocks sont faibles ?', type: BRIEF_QUERY_TYPES.STOCKS },
  { label: 'Actions urgentes', phrase: 'Quelles actions urgentes aujourd’hui ?', type: BRIEF_QUERY_TYPES.URGENT },
];

function sectionToneClass(tone = 'ok') {
  if (tone === 'warn') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (tone === 'missing') return 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

export default function HeyHorizonVoiceBriefPanel({
  dataMap = {},
  onActionCommand,
}) {
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [brief, setBrief] = useState(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const speech = useSpeechSynthesis();

  const runBrief = useCallback(async (text, queryType = null) => {
    const query = String(text || '').trim();
    if (!query) return;

    if (!isFarmBriefQuery(query) && !queryType) {
      onActionCommand?.(query);
      return;
    }

    setBusy(true);
    setPhrase(query);
    try {
      const result = await processHeyHorizonVoiceBrief({
        phrase: query,
        dataMap,
        queryType: queryType || undefined,
      });
      if (!result.ok) {
        if (result.error === 'action_command') {
          onActionCommand?.(query);
          return;
        }
        toast.error(result.error || 'Brief impossible');
        return;
      }
      setBrief(result);
    } catch (error) {
      toast.error(error.message || 'Brief impossible');
    } finally {
      setBusy(false);
    }
  }, [dataMap, onActionCommand]);

  const runWeeklyBrief = useCallback(async () => {
    setBusy(true);
    setPhrase(QUICK_BRIEFS[0].phrase);
    try {
      const result = await buildWeeklyFarmBrief(dataMap);
      if (result.ok) setBrief(result);
      else toast.error(result.error || 'Brief impossible');
    } catch (error) {
      toast.error(error.message || 'Brief impossible');
    } finally {
      setBusy(false);
    }
  }, [dataMap]);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Reconnaissance vocale non supportée sur ce navigateur.');
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript;
      if (text) runBrief(text);
    };
    rec.onerror = () => toast.error('Écoute interrompue');
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    toast.success('Hey Horizon écoute… posez votre question.');
  }, [runBrief]);

  useEffect(() => () => {
    try { recognitionRef.current?.stop?.(); } catch { /* ignore */ }
    speech.stop?.();
  }, [speech]);

  const speakBrief = () => {
    if (!brief?.tts?.text) return;
    if (!speech.supported) {
      toast('Synthèse vocale non disponible sur ce navigateur.', { icon: 'ℹ️' });
      return;
    }
    if (!speech.enabled) {
      speech.enable();
      toast.success('Voix activée — relancez la lecture.');
      return;
    }
    const ok = speech.speak(brief.tts.text, { force: true });
    if (!ok) toast.error(speech.lastError || 'Lecture vocale impossible');
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]">
            <Bot size={14} />
            Hey Horizon Vocal
          </p>
          <h3 className="mt-3 text-xl font-black text-[#2f2415]">Brief vocal & textuel</h3>
          <p className="mt-1 text-sm text-[#8a7456]">
            Résumé lecture seule de la ferme — aucune écriture ERP. Réponse texte obligatoire, voix optionnelle.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={runWeeklyBrief}
            className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            <Sparkles size={15} className="inline mr-1" />
            Brief de la semaine
          </button>
          <button
            type="button"
            disabled={busy || listening}
            onClick={startListening}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-900 disabled:opacity-50"
          >
            {listening ? <MicOff size={15} className="inline mr-1" /> : <Mic size={15} className="inline mr-1" />}
            {listening ? 'Écoute…' : 'Micro'}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <input
          type="text"
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') runBrief(phrase);
          }}
          placeholder="Ex. : Combien ai-je encaissé ce mois-ci ?"
          className="flex-1 rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm text-[#2f2415] outline-none focus:border-emerald-400"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => runBrief(phrase)}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
        >
          {busy ? 'Analyse…' : 'Demander'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_BRIEFS.map((item) => (
          <button
            key={item.type}
            type="button"
            disabled={busy}
            onClick={() => runBrief(item.phrase, item.type)}
            className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1.5 text-xs font-black text-[#7d6a4a] hover:bg-[#dcfce7] disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {brief ? (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest font-black text-[#9a6b12]">{brief.title}</p>
              <p className="mt-1 text-lg font-black text-[#2f2415]">{brief.headline}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={speakBrief}
                className="rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-xs font-black text-[#2f2415]"
                title={speech.supported ? 'Lecture vocale (optionnelle)' : 'TTS non disponible'}
              >
                {speech.speaking ? <VolumeX size={14} className="inline mr-1" /> : <Volume2 size={14} className="inline mr-1" />}
                {speech.supported ? (speech.enabled ? 'Lire' : 'Activer voix') : 'Voix N/A'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(brief.allSections || brief.sections || []).map((item) => (
              <div
                key={item.key}
                className={`rounded-xl border p-3 ${sectionToneClass(item.tone)}`}
              >
                <p className="text-[10px] uppercase tracking-widest font-black opacity-80">{item.label}</p>
                <p className="mt-1 text-sm font-black">{item.value}</p>
                {item.detail ? <p className="mt-1 text-xs opacity-80">{item.detail}</p> : null}
              </div>
            ))}
          </div>

          <pre className="whitespace-pre-wrap rounded-xl border border-[#eadcc2] bg-white p-4 text-sm leading-relaxed text-[#2f2415] font-sans">
            {brief.text}
          </pre>

          {brief.tts ? (
            <p className="text-xs text-[#8a7456]">
              Synthèse vocale prête ({brief.tts.lang}) — {brief.tts.supported ? 'Web Speech API' : 'API TTS non configurée'}.
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">
          Demandez un brief ou utilisez le micro. Les actions terrain (« J&apos;ai vendu… ») restent dans la zone Action terrain ci-dessous.
        </div>
      )}
    </section>
  );
}
