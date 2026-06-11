const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function shortenAssistantAnswer(answer = '', maxLength = 220) {
  const text = String(answer || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const firstSentence = text.split(/(?<=[.!?])\s+/).find(Boolean) || text;
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, maxLength - 1).trim()}…`;
}

/**
 * Format officiel Horizon : Situation · Cause · Action · Source ERP
 */
export function formatHorizonAnswer({
  situation = '',
  cause = '',
  action = '',
  sources = [],
} = {}) {
  const lines = [
    'Situation',
    situation || '—',
    '',
    'Cause',
    cause || '—',
    '',
    'Action',
    action || '—',
  ];
  if (sources.length) {
    lines.push('', 'Source ERP', sources.join(' · '));
  }
  return lines.join('\n').trim();
}

/** Réponse agricole compacte — maximum 5 lignes (SCA + source). */
export function formatCompactHorizonAnswer(answer = {}) {
  if (!answer) return '';
  if (answer.summary && typeof answer.summary === 'string' && /Situation/i.test(answer.summary)) {
    return compactStructuredText(answer.summary);
  }
  const block = formatHorizonAnswer({
    situation: answer.situation,
    cause: answer.cause,
    action: answer.action,
    sources: answer.sources || [],
  });
  return compactStructuredText(block);
}

function compactStructuredText(text = '') {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const compact = [];
  let section = null;

  for (const line of lines) {
    const lower = line.toLowerCase().replace(/:$/, '');
    if (['situation', 'cause', 'action', 'source erp'].includes(lower)) {
      section = lower;
      continue;
    }
    if (!section) continue;
    if (section === 'source erp') {
      compact.push(`Source ERP : ${line}`);
      break;
    }
    compact.push(`${section.charAt(0).toUpperCase()}${section.slice(1)} : ${line}`);
    if (compact.length >= 4) break;
  }

  if (compact.length < 4) {
    const parsed = parseHorizonStructuredText(text);
    if (parsed) {
      return formatCompactHorizonAnswer(parsed);
    }
  }

  return compact.slice(0, 5).join('\n');
}

/** Parse un texte formaté Horizon en sections structurées. */
export function parseHorizonStructuredText(text = '') {
  if (text && typeof text === 'object') {
    if (!text.situation && !text.cause && !text.action) return null;
    return {
      situation: text.situation || '',
      cause: text.cause || '',
      action: text.action || '',
      sources: Array.isArray(text.sources) ? text.sources.join(' · ') : (text.sources || ''),
    };
  }

  const raw = String(text || '').trim();
  if (!raw) return null;

  const labelMap = {
    situation: 'situation',
    cause: 'cause',
    action: 'action',
    'source erp': 'sources',
  };

  const result = { situation: '', cause: '', action: '', sources: '' };
  let current = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const norm = trimmed.toLowerCase().replace(/:$/, '').trim();
    if (labelMap[norm]) {
      current = labelMap[norm];
      continue;
    }
    if (current) {
      result[current] = result[current] ? `${result[current]} ${trimmed}` : trimmed;
    }
  }

  if (!result.situation && !result.cause && !result.action) return null;
  return result;
}

/**
 * Normalise une réponse stratégique (finance, commercial, investisseur) au format Horizon.
 */
export function formatStrategicHorizonAnswer(answer = {}) {
  if (!answer) return '';
  if (answer.situation && answer.cause && answer.action) {
    return formatHorizonAnswer({
      situation: answer.situation,
      cause: answer.cause,
      action: answer.action,
      sources: answer.sources || [],
    });
  }
  if (answer.summary && /Situation\s*:/i.test(answer.summary)) {
    return answer.summary;
  }
  return shortenAssistantAnswer(answer.summary || answer.assistantText || '', 600);
}

export function formatDraftAssistantText(draft = {}) {
  const action = draft.intent_label || draft.ui?.title || draft.intent || 'Action détectée';
  const fields = draft.draft_fields || {};
  const details = [
    fields.product_name || fields.culture_name,
    fields.quantity ? `${fields.quantity} ${fields.unit || ''}`.trim() : null,
    fields.client_name || fields.supplier_name,
    fields.payment_amount ? `${fields.payment_amount} FCFA` : null,
  ].filter(Boolean).join(' · ');
  return formatHorizonAnswer({
    situation: `J'ai préparé : ${action}${details ? ` (${details})` : ''}.`,
    cause: 'C\'est ce que j\'ai compris de votre phrase.',
    action: 'Vérifiez ci-dessous puis validez pour enregistrer.',
    sources: ['Carnet Horizon'],
  });
}

export function formatAssistantResponse({ command = '', draftText = '', fallbackAnswer = '', moduleKey = '' } = {}) {
  if (draftText) return shortenAssistantAnswer(draftText, 220);

  const commandText = norm(command);
  const fallback = shortenAssistantAnswer(fallbackAnswer, 220);

  if (!fallback) {
    return 'Je n’ai pas assez d’éléments pour répondre. Dis-moi l’action ou la question sur ta ferme.';
  }

  const generic = ['je peux t aider', 'voici ce que je peux faire', 'commande non reconnue', 'je n ai pas compris'];
  const looksGeneric = generic.some((item) => norm(fallback).includes(item));

  if (looksGeneric) {
    if (commandText.includes('vente') || commandText.includes('vendre')) return 'Précise le produit, la quantité et le client pour enregistrer la vente.';
    if (commandText.includes('animal') || commandText.includes('bovin') || commandText.includes('ovin') || commandText.includes('caprin')) return 'Précise l’identifiant animal, le poids ou l’action santé à déclarer.';
    if (commandText.includes('chair') || commandText.includes('pondeuse') || commandText.includes('oeuf')) return 'Précise le lot, la quantité d’œufs ou l’action avicole.';
    if (commandText.includes('culture') || commandText.includes('recolte')) return 'Précise la culture, la parcelle et la quantité récoltée.';
    return moduleKey ? `Je peux ouvrir ${moduleKey}. Précise ensuite l’action attendue.` : 'Reformule avec l’action terrain ou la question sur ta ferme.';
  }

  return fallback;
}

export default formatAssistantResponse;
