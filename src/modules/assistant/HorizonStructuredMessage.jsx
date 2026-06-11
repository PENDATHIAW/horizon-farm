import {
  formatConversationalHorizonAnswer,
  parseHorizonStructuredText,
} from '../../services/assistantResponseFormatter.js';
import { HORIZON } from './horizonDesignTokens.js';

/** Réponses conversationnelles — prose naturelle, sans labels SCA visibles */
export default function HorizonStructuredMessage({ text = '', structured = null }) {
  const parsed = structured?.situation || structured?.cause || structured?.action
    ? parseHorizonStructuredText(structured)
    : parseHorizonStructuredText(text);

  const displayText = parsed
    ? formatConversationalHorizonAnswer(parsed)
    : cleanDisplayText(text);

  const [body, sourceLine] = splitSourceFootnote(displayText);

  return (
    <div>
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: HORIZON.text }}>
        {body}
      </p>
      {sourceLine ? (
        <p className="mt-3 text-[13px] leading-snug" style={{ color: HORIZON.textMuted }}>
          {sourceLine}
        </p>
      ) : null}
    </div>
  );
}

function cleanDisplayText(value = '') {
  const raw = String(value || '').trim();
  if (!raw || /^Situation\s*$/im.test(raw)) return raw;
  if (/^Situation\s*:/im.test(raw)) {
    const parsed = parseHorizonStructuredText(raw);
    if (parsed) return formatConversationalHorizonAnswer(parsed);
  }
  return raw;
}

function splitSourceFootnote(text = '') {
  const parts = String(text || '').split(/\n\n— /);
  if (parts.length < 2) return [text, ''];
  return [parts[0].trim(), `— ${parts.slice(1).join('\n\n— ').trim()}`];
}
