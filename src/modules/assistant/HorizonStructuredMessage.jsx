import { parseHorizonStructuredText } from '../../services/assistantResponseFormatter.js';
import { HORIZON } from './horizonDesignTokens.js';

function SectionBlock({ label, children }) {
  if (!children) return null;
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: HORIZON.secondary }}>
        {label}
      </p>
      <p className="mt-1 text-sm leading-relaxed" style={{ color: HORIZON.text }}>
        {children}
      </p>
    </div>
  );
}

/** Affiche Situation / Cause / Action / Source ERP — jamais en cartes */
export default function HorizonStructuredMessage({ text = '', structured = null }) {
  const parsed = structured?.situation || structured?.cause || structured?.action
    ? parseHorizonStructuredText(structured)
    : parseHorizonStructuredText(text);
  if (!parsed) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: HORIZON.text }}>{text}</p>;
  }
  return (
    <div>
      <SectionBlock label="Situation">{parsed.situation}</SectionBlock>
      <SectionBlock label="Cause">{parsed.cause}</SectionBlock>
      <SectionBlock label="Action">{parsed.action}</SectionBlock>
      {parsed.sources ? (
        <SectionBlock label="Source ERP">{parsed.sources}</SectionBlock>
      ) : null}
    </div>
  );
}
