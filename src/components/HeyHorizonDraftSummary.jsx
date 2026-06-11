import { buildHumanDraftConfirmation } from '../services/assistantDraftHumanSummary.js';
import { HORIZON } from '../modules/assistant/horizonDesignTokens.js';

export default function HeyHorizonDraftSummary({ draft, variant = 'inline' }) {
  if (!draft || draft.status === 'unsupported' || draft.status === 'wake_only') return null;
  const missing = draft.missing_fields || [];
  const { recordLines, consequenceLines } = buildHumanDraftConfirmation(draft);
  const isInline = variant === 'inline';

  return (
    <div
      className={isInline ? 'text-sm' : 'rounded-2xl border p-4 text-sm'}
      style={isInline ? { color: HORIZON.text } : { borderColor: HORIZON.border, background: HORIZON.surface, color: HORIZON.text }}
    >
      <p className="text-[13px] font-medium" style={{ color: HORIZON.primary }}>
        Vous allez enregistrer :
      </p>
      <ul className="mt-2 space-y-1">
        {recordLines.map((line) => (
          <li key={line} className="text-sm leading-snug">• {line}</li>
        ))}
      </ul>

      <p className="mt-4 text-[13px] font-medium" style={{ color: HORIZON.primary }}>
        Conséquences :
      </p>
      <ul className="mt-2 space-y-1">
        {consequenceLines.map((line) => (
          <li key={line} className="text-sm leading-snug" style={{ color: HORIZON.textMuted }}>• {line}</li>
        ))}
      </ul>

      {missing.length ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: HORIZON.textMuted }}>
          Il manque encore : {missing.join(', ')}
        </p>
      ) : null}
    </div>
  );
}
