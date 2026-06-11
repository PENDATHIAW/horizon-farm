import { buildHumanDraftConfirmation } from '../services/assistantDraftHumanSummary.js';
import { HORIZON } from '../modules/assistant/horizonDesignTokens.js';

export default function HeyHorizonDraftSummary({ draft, variant = 'inline' }) {
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  const missing = draft.missing_fields || [];
  const { recordLines, consequenceLines } = buildHumanDraftConfirmation(draft);
  const isInline = variant === 'inline';
  const actionLabel = draft.ui?.title || draft.intent_label || 'cette action';

  return (
    <div
      className={isInline ? 'text-sm' : 'rounded-2xl border p-4 text-sm'}
      style={isInline ? { color: HORIZON.text } : { borderColor: HORIZON.border, background: HORIZON.surface, color: HORIZON.text }}
    >
      <p className="text-[15px] leading-relaxed">
        D'accord — je prépare {actionLabel.toLowerCase().startsWith('l') ? actionLabel.toLowerCase() : `l'enregistrement : ${actionLabel.toLowerCase()}`}.
      </p>

      {recordLines.length ? (
        <ul className="mt-3 space-y-1.5">
          {recordLines.map((line) => (
            <li key={line} className="text-[15px] leading-snug">{line}</li>
          ))}
        </ul>
      ) : null}

      {consequenceLines.length ? (
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: HORIZON.textMuted }}>
          {consequenceLines.join(' · ')}
        </p>
      ) : null}

      <p className="mt-3 text-[14px] leading-relaxed" style={{ color: HORIZON.textMuted }}>
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
