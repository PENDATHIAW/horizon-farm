import { parseHorizonStructuredText } from '../../services/assistantResponseFormatter.js';
import { HORIZON } from './horizonDesignTokens.js';

function SectionLine({ label, children }) {
  if (!children) return null;
  return (
    <>
      <p className="mt-2.5 first:mt-0 text-[13px] font-medium" style={{ color: HORIZON.primary }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm leading-snug" style={{ color: HORIZON.text }}>
        {children}
      </p>
    </>
  );
}

/** Réponses naturelles SCA — max ~6 lignes de contenu, jamais en cartes */
export default function HorizonStructuredMessage({ text = '', structured = null }) {
  const parsed = structured?.situation || structured?.cause || structured?.action
    ? parseHorizonStructuredText(structured)
    : parseHorizonStructuredText(text);

  if (!parsed) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: HORIZON.text }}>{text}</p>;
  }

  return (
    <div className="text-sm">
      <SectionLine label="Situation">{parsed.situation}</SectionLine>
      <SectionLine label="Cause">{parsed.cause}</SectionLine>
      <SectionLine label="Action">{parsed.action}</SectionLine>
      {parsed.sources ? (
        <SectionLine label="Source ERP">{parsed.sources}</SectionLine>
      ) : null}
    </div>
  );
}
