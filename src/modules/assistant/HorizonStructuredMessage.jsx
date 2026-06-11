import { parseHorizonStructuredText } from '../../services/assistantResponseFormatter.js';
import { HORIZON } from './horizonDesignTokens.js';

function SectionLine({ label, children }) {
  if (!children) return null;
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-[13px] font-semibold tracking-wide" style={{ color: HORIZON.primary }}>
        {label}
        {' '}
        :
      </p>
      <p className="mt-1 text-[15px] leading-relaxed" style={{ color: HORIZON.text }}>
        {children}
      </p>
    </div>
  );
}

/** Réponses SCA premium — conversationnelles, sans cartes ni widgets */
export default function HorizonStructuredMessage({ text = '', structured = null }) {
  const parsed = structured?.situation || structured?.cause || structured?.action
    ? parseHorizonStructuredText(structured)
    : parseHorizonStructuredText(text);

  if (!parsed) {
    return (
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: HORIZON.text }}>
        {text}
      </p>
    );
  }

  return (
    <div>
      <SectionLine label="Situation">{parsed.situation}</SectionLine>
      <SectionLine label="Cause">{parsed.cause}</SectionLine>
      <SectionLine label="Action">{parsed.action}</SectionLine>
      {parsed.sources ? (
        <SectionLine label="Source ERP">{parsed.sources}</SectionLine>
      ) : null}
    </div>
  );
}
