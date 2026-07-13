import { Check, X } from 'lucide-react';
import { buildHumanDraftConfirmation } from '../services/assistantDraftHumanSummary.js';
import { buildDraftFieldChecklist } from '../services/assistantDocumentCompletion.js';
import { HORIZON } from '../modules/assistant/horizonDesignTokens.js';

export default function HeyHorizonDraftSummary({ draft, variant = 'inline' }) {
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return null;

  const completion = draft.documentCompletion;
  const isInline = variant === 'inline';
  const checklist = completion ? buildDraftFieldChecklist(draft) : [];
  const actionLabel = draft.ui?.title || 'Brouillon';

  if (completion) {
    return (
      <div
        className={isInline ? 'text-sm' : 'rounded-2xl border p-4 text-sm'}
        style={isInline ? { color: HORIZON.text } : { borderColor: HORIZON.border, background: HORIZON.surface, color: HORIZON.text }}
      >
        <p className="text-meta font-semibold uppercase tracking-normal" style={{ color: HORIZON.textMuted }}>
          {actionLabel}
        </p>

        {completion.confidence != null ? (
          <p className="mt-2 text-xs" style={{ color: HORIZON.textMuted }}>
            Confiance : {completion.confidence}%
            {completion.mode === 'validate' ? ' — validation possible' : ''}
            {completion.mode === 'confirm' ? ' — confirmation recommandée' : ''}
            {completion.mode === 'conversation' ? ' — complétons ensemble' : ''}
          </p>
        ) : null}

        {checklist.length ? (
          <ul className="mt-3 space-y-1">
            {checklist.map((item) => (
              <li key={item.key} className="flex items-center gap-2 text-body">
                {item.filled ? (
                  <Check size={14} className="shrink-0 text-positive" />
                ) : (
                  <X size={14} className="shrink-0 text-horizon-dark" />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {completion.pendingQuestion && completion.awaitingReply ? (
          <p className="mt-3 text-body leading-relaxed whitespace-pre-wrap">{completion.pendingQuestion}</p>
        ) : (
          <p className="mt-3 text-body leading-relaxed" style={{ color: HORIZON.textMuted }}>
            Vérifiez le brouillon et validez si tout est correct.
          </p>
        )}
      </div>
    );
  }

  const missing = draft.missing_fields || [];
  const { recordLines, consequenceLines } = buildHumanDraftConfirmation(draft);
  const legacyActionLabel = draft.ui?.title || draft.intent_label || 'cette action';

  return (
    <div
      className={isInline ? 'text-sm' : 'rounded-2xl border p-4 text-sm'}
      style={isInline ? { color: HORIZON.text } : { borderColor: HORIZON.border, background: HORIZON.surface, color: HORIZON.text }}
    >
      <p className="text-body leading-relaxed">
        D'accord — je prépare {legacyActionLabel.toLowerCase().startsWith('l') ? legacyActionLabel.toLowerCase() : `l'enregistrement : ${legacyActionLabel.toLowerCase()}`}.
      </p>

      {recordLines.length ? (
        <ul className="mt-3 space-y-2">
          {recordLines.map((line) => (
            <li key={line} className="text-body leading-snug">{line}</li>
          ))}
        </ul>
      ) : null}

      {consequenceLines.length ? (
        <p className="mt-3 text-body leading-relaxed" style={{ color: HORIZON.textMuted }}>
          {consequenceLines.join(' · ')}
        </p>
      ) : null}

      <p className="mt-3 text-body leading-relaxed" style={{ color: HORIZON.textMuted }}>
        Vérifiez ci-dessous et confirmez si tout est correct.
      </p>

      {missing.length ? (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: HORIZON.textMuted }}>
          Il me manque encore : {missing.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
