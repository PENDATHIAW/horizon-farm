import { CheckCircle2, MessageCircle, Play, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  analyzeWhatsAppMessage,
  executeWhatsAppDraft,
  journalizeWhatsAppEvent,
  validateWhatsAppDraft,
  WHATSAPP_WORKFLOW_LABELS,
} from '../services/whatsappHorizon/whatsappDraftService.js';
import { WHATSAPP_DEMO_MESSAGES } from '../services/whatsappHorizon/whatsappDemoMessages.js';
import { TARGET_WORKFLOWS } from '../services/aiGateway/aiActionDrafts.js';

function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'warn'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${cls}`}>{children}</span>;
}

function DraftPreview({ draft }) {
  if (!draft) return null;
  const fields = draft.draft?.fields || draft.draft?.preview || {};
  const entries = Object.entries(fields).filter(([, v]) => v !== null && v !== undefined && v !== '');
  return (
    <div className="mt-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm space-y-2">
      <p className="font-black text-[#2f2415]">{draft.draft?.title || draft.intent}</p>
      {draft.draft?.subtitle ? <p className="text-xs text-[#8a7456]">{draft.draft.subtitle}</p> : null}
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {entries.slice(0, 8).map(([key, value]) => (
          <div key={key} className="text-xs">
            <span className="text-[#8a7456]">{key} : </span>
            <span className="font-semibold text-[#2f2415]">{String(value)}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-[#8a7456]">
        Workflow : {WHATSAPP_WORKFLOW_LABELS[draft.target_workflow] || draft.target_workflow}
        {' · '}
        Confiance {Math.round((draft.confidence || 0) * 100)}%
      </p>
      {draft.warnings?.length ? (
        <ul className="text-xs text-amber-800">
          {draft.warnings.map((w) => <li key={w}>• {w}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export default function WhatsAppHorizonDemoPanel({
  dataMap = {},
  onNavigate,
  onCreateWhatsappLog,
  workflowHandlers = {},
}) {
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [validatedDraft, setValidatedDraft] = useState(null);
  const [busy, setBusy] = useState('');

  const primaryDraft = result?.primaryDraft || result?.drafts?.[0] || null;
  const clarify = result?.clarify || '';
  const handlers = useMemo(
    () => ({ onCreateWhatsappLog, ...workflowHandlers }),
    [onCreateWhatsappLog, workflowHandlers],
  );

  const runAnalyze = async (text = message) => {
    const query = String(text || '').trim();
    if (!query) {
      toast.error('Saisissez un message WhatsApp simulé.');
      return;
    }
    setBusy('analyze');
    setValidatedDraft(null);
    try {
      const parsed = await analyzeWhatsAppMessage({
        message: query,
        dataMap,
        handlers,
      });
      setMessage(query);
      setResult(parsed);
      if (parsed.clarify && !parsed.drafts?.length) {
        toast(parsed.clarify, { icon: '⚠️' });
        return;
      }
      if (parsed.drafts?.length) {
        toast.success('Brouillon IA préparé — validez avant exécution.');
      } else {
        toast.error('Message non reconnu.');
      }
    } catch (e) {
      toast.error(e.message || 'Analyse impossible');
    } finally {
      setBusy('');
    }
  };

  const runValidate = async () => {
    if (!primaryDraft) return;
    setBusy('validate');
    try {
      const validated = validateWhatsAppDraft(primaryDraft);
      setValidatedDraft(validated);
      await journalizeWhatsAppEvent({
        message: validated.raw_input || message,
        status: 'validated',
        draft: validated,
        handlers,
        meta: { reason: 'user_validation' },
      });
      toast.success('Brouillon validé — vous pouvez exécuter le workflow.');
    } catch (e) {
      toast.error(e.message || 'Validation impossible');
    } finally {
      setBusy('');
    }
  };

  const runExecute = async () => {
    const draft = validatedDraft || primaryDraft;
    if (!draft) return;
    if (!validatedDraft) {
      toast.error('Validez d\'abord le brouillon.');
      return;
    }
    setBusy('execute');
    try {
      const execResult = await executeWhatsAppDraft(validatedDraft, {
        handlers,
        dataMap,
        onNavigate,
      });
      if (!execResult.ok) {
        toast.error(execResult.error || 'Exécution refusée');
        return;
      }
      if (execResult.openedForm) {
        toast.success(execResult.message || 'Formulaire ouvert.');
      } else {
        toast.success(`Workflow exécuté : ${WHATSAPP_WORKFLOW_LABELS[execResult.workflow] || execResult.workflow}`);
      }
      setResult(null);
      setValidatedDraft(null);
    } catch (e) {
      toast.error(e.message || 'Exécution impossible');
    } finally {
      setBusy('');
    }
  };

  const canExecute = Boolean(validatedDraft?.user_validated)
    && validatedDraft?.target_workflow !== TARGET_WORKFLOWS.INSIGHT_ONLY;

  return (
    <section className="rounded-3xl border border-[#25D366]/40 bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#128C7E] font-black">
          <MessageCircle size={14} />
          WhatsApp Horizon — démo interne
        </p>
        <p className="mt-1 text-sm text-[#8a7456]">
          Simule un message WhatsApp/Telegram → brouillon IA (AI Gateway) → validation → workflow métier. Aucune écriture sans confirmation.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-black uppercase tracking-[0.2em] text-[#8a7456]">Message WhatsApp reçu</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Ex. J'ai vendu 20 tablettes d'œufs à 70 000 FCFA, payé par Orange Money."
          className="w-full rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4 text-sm text-[#2f2415] outline-none focus:border-emerald-400"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy === 'analyze'}
          onClick={() => runAnalyze()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#128C7E] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          <Sparkles size={14} />
          {busy === 'analyze' ? 'Analyse…' : 'Analyser'}
        </button>
        <button
          type="button"
          disabled={!primaryDraft || busy === 'validate'}
          onClick={runValidate}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-900 disabled:opacity-50"
        >
          <CheckCircle2 size={14} />
          {busy === 'validate' ? 'Validation…' : 'Valider'}
        </button>
        <button
          type="button"
          disabled={!canExecute || busy === 'execute'}
          onClick={runExecute}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          <Play size={14} />
          {busy === 'execute' ? 'Exécution…' : 'Exécuter via workflow'}
        </button>
      </div>

      {clarify ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{clarify}</p>
      ) : null}

      <DraftPreview draft={validatedDraft || primaryDraft} />

      {validatedDraft?.user_validated ? (
        <p className="text-xs text-emerald-800 font-semibold">Brouillon validé — prêt pour exécution workflow.</p>
      ) : primaryDraft ? (
        <p className="text-xs text-[#8a7456]">Étape suivante : valider le brouillon, puis exécuter via le workflow métier.</p>
      ) : null}

      <div>
        <p className="text-xs font-black text-[#8a7456] mb-2">Exemples démo</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {WHATSAPP_DEMO_MESSAGES.map((demo) => (
            <button
              key={demo.id}
              type="button"
              onClick={() => {
                setMessage(demo.text);
                runAnalyze(demo.text);
              }}
              className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left hover:bg-[#dcfce7]"
            >
              <p className="font-black text-[#2f2415] text-sm">{demo.label}</p>
              <p className="mt-1 text-xs text-[#7d6a4a] line-clamp-2">{demo.text}</p>
              <Pill tone="good">{demo.module}</Pill>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
