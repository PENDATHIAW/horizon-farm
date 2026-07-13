import 'react';
import { HORIZON_DESIGN as D } from './horizonDesignTokens.js';
import {
  formatConversationalHorizonAnswer,
  parseHorizonStructuredText,
} from '../../services/assistantResponseFormatter.js';

/** Réponses conversationnelles — prose naturelle, zéro source technique. */
export default function HorizonStructuredMessage({ text = '', structured = null }) {
  const parsed = structured?.situation || structured?.cause || structured?.action
    ? parseHorizonStructuredText(structured)
    : parseHorizonStructuredText(text);

  const displayText = parsed
    ? formatConversationalHorizonAnswer(parsed)
    : cleanDisplayText(text);

  const paragraphs = String(displayText || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (!paragraphs.length) return null;

  return (
    <div className="space-y-2">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-[15px] leading-relaxed whitespace-pre-wrap"
          style={{ color: D.assistantBubbleText }}
        >
          {paragraph}
        </p>
      ))}
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
