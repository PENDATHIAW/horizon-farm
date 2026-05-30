const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function shortenAssistantAnswer(answer = '', maxLength = 220) {
  const text = String(answer || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= maxLength) return text;
  const firstSentence = text.split(/(?<=[.!?])\s+/).find(Boolean) || text;
  if (firstSentence.length <= maxLength) return firstSentence;
  return `${firstSentence.slice(0, maxLength - 1).trim()}…`;
}

export function formatAssistantResponse({ command = '', draftText = '', fallbackAnswer = '', moduleKey = '' } = {}) {
  if (draftText) return shortenAssistantAnswer(draftText, 220);

  const commandText = norm(command);
  const fallback = shortenAssistantAnswer(fallbackAnswer, 220);

  if (!fallback) {
    return 'Je n’ai pas assez d’éléments pour répondre. Dis-moi le module concerné ou l’action attendue.';
  }

  const generic = ['je peux t aider', 'voici ce que je peux faire', 'commande non reconnue', 'je n ai pas compris'];
  const looksGeneric = generic.some((item) => norm(fallback).includes(item));

  if (looksGeneric) {
    if (commandText.includes('vente') || commandText.includes('vendre')) return 'Je peux t’aider côté ventes. Précise le produit, la quantité ou le client à cibler.';
    if (commandText.includes('animal') || commandText.includes('bovin') || commandText.includes('ovin') || commandText.includes('caprin')) return 'Je peux t’aider côté animaux. Précise l’identifiant, le poids, la santé ou l’action à faire.';
    if (commandText.includes('chair') || commandText.includes('pondeuse') || commandText.includes('oeuf')) return 'Je peux t’aider côté avicole. Précise le lot, l’âge, le poids moyen ou la ponte.';
    if (commandText.includes('culture') || commandText.includes('recolte')) return 'Je peux t’aider côté cultures. Précise la parcelle, la culture ou la quantité disponible.';
    return moduleKey ? `Je peux ouvrir ${moduleKey}. Précise ensuite l’action attendue.` : 'Je n’ai pas compris l’action exacte. Reformule avec le module et l’objectif.';
  }

  return fallback;
}

export default formatAssistantResponse;
