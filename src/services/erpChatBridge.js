export async function askErpFromChat({ text = '', language = 'fr', role = 'visiteur', actor = {} } = {}) {
  const response = await fetch('/api/erp-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language, role, actor }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data?.side === 'assistant') return data;
    throw new Error(data?.error || 'Assistant ERP indisponible.');
  }

  return {
    side: data.side || 'assistant',
    language: data.language || language,
    text: data.text || 'Réponse ERP reçue.',
    displayMode: data.displayMode || 'text',
    erp: data.erp,
  };
}
