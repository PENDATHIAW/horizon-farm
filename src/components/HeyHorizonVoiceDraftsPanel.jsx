import { CheckCircle2, Mic, MicOff, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { openHeyHorizonForm, validateHeyHorizonDraft } from '../services/heyHorizonAssistantService.js';
import {
  getLegacyDraftForValidation,
  getValidatableDrafts,
} from '../services/aiGateway/contextualVoiceService.js';
import { gatewayDraftToFormRequest } from '../services/aiGateway/gatewayFormBridge.js';

function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${cls}`}>{children}</span>;
}

export default function HeyHorizonVoiceDraftsPanel({
  voiceResult = null,
  onNavigate,
  onRefresh,
  onCreateBusinessEvent,
  onDismiss,
}) {
  const [validatingId, setValidatingId] = useState(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const drafts = voiceResult?.drafts || [];
  const clarify = voiceResult?.clarify || '';
  const validatable = voiceResult ? getValidatableDrafts(voiceResult) : [];

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
      if (text && voiceResult?.onPhrase) voiceResult.onPhrase(text);
    };
    rec.onerror = () => toast.error('Écoute interrompue');
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    toast.success('Écoute… parlez maintenant');
  }, [voiceResult]);

  useEffect(() => () => {
    try { recognitionRef.current?.stop?.(); } catch { /* ignore */ }
  }, []);

  const validateOne = async (gatewayDraft) => {
    if (gatewayDraft.meta?.role === 'chain' || gatewayDraft.status === 'chain_info') return;
    setValidatingId(gatewayDraft.id);
    try {
      const legacy = getLegacyDraftForValidation(gatewayDraft);
      const { openForm } = gatewayDraftToFormRequest(gatewayDraft);
      const result = await validateHeyHorizonDraft(legacy, {
        onNavigate,
        onCreateBusinessEvent,
        refreshModule: onRefresh,
      });
      if (result?.openedForm || openForm?.module) {
        openHeyHorizonForm(legacy, onNavigate);
      }
      toast.success(result?.message || 'Brouillon validé — formulaire ouvert');
    } catch (e) {
      toast.error(e.message || 'Validation impossible');
    } finally {
      setValidatingId(null);
    }
  };

  if (!voiceResult) return null;

  if (clarify && !drafts.length) {
    return (
      <section className="rounded-3xl border border-amber-300 bg-amber-50 p-5">
        <p className="font-black text-amber-900">Précision nécessaire</p>
        <p className="mt-2 text-sm text-amber-800">{clarify}</p>
        <button type="button" onClick={onDismiss} className="mt-3 rounded-xl border border-amber-400 px-3 py-2 text-xs font-black text-amber-900">
          Reformuler
        </button>
      </section>
    );
  }

  if (!drafts.length) return null;

  return (
    <section className="rounded-3xl border border-emerald-300 bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-800 font-black">
            <Sparkles size={14} />
            Saisie vocale contextuelle
          </p>
          <p className="mt-1 text-sm text-[#8a7456]">
            {drafts.length} élément(s) détecté(s) — validez chaque action (aucune écriture sans confirmation).
          </p>
          {voiceResult.phrase ? (
            <p className="mt-2 rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm italic text-[#2f2415]">
              « {voiceResult.phrase} »
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={listening ? () => recognitionRef.current?.stop?.() : startListening}
            className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415]"
          >
            {listening ? <MicOff size={14} className="inline mr-1" /> : <Mic size={14} className="inline mr-1" />}
            {listening ? 'Stop' : 'Réécouter'}
          </button>
          <button type="button" onClick={onDismiss} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#8a7456]">
            Effacer
          </button>
        </div>
      </div>

      {clarify ? <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{clarify}</p> : null}

      <div className="space-y-3">
        {drafts.map((draft, index) => {
          const isChain = draft.meta?.role === 'chain' || draft.status === 'chain_info';
          const canValidate = !isChain && draft.required_validation !== false;
          const title = draft.draft?.title || draft.draft?.legacy_hey?.ui?.title || draft.intent;
          const subtitle = draft.draft?.description || draft.draft?.subtitle || draft.draft?.legacy_hey?.ui?.subtitle || '';

          return (
            <div
              key={draft.id || index}
              className={`rounded-2xl border p-4 ${isChain ? 'border-[#eadcc2] bg-[#fffdf8]' : 'border-emerald-200 bg-emerald-50/40'}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-black text-[#2f2415]">
                    {index + 1}. {title}
                  </p>
                  {subtitle ? <p className="text-xs text-[#8a7456] mt-1">{subtitle}</p> : null}
                </div>
                <div className="flex flex-wrap gap-1">
                  {isChain ? <Pill>Étape liée</Pill> : <Pill tone="good">À valider</Pill>}
                  <Pill>{Math.round((draft.confidence || 0) * 100)}%</Pill>
                </div>
              </div>
              {draft.warnings?.length ? (
                <ul className="mt-2 text-xs text-amber-800">
                  {draft.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              ) : null}
              {canValidate ? (
                <button
                  type="button"
                  disabled={validatingId === draft.id}
                  onClick={() => validateOne(draft)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#166534] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  {validatingId === draft.id ? 'Validation…' : 'Valider ce brouillon'}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {validatable.length > 1 ? (
        <p className="text-xs text-[#8a7456]">
          Validez d&apos;abord l&apos;action principale, puis la tâche de suivi si proposée.
        </p>
      ) : null}
    </section>
  );
}
