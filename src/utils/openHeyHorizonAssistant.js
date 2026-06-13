/** Ouvre Hey Horizon avec une question pré-remplie et traitée. */

export function dispatchHeyHorizonQuery(query = '') {
  const text = String(query || '').trim();
  if (!text) return;
  window.dispatchEvent(new CustomEvent('horizon-assistant-query', { detail: { query: text } }));
}

export function scheduleHeyHorizonQuery(query = '', delayMs = 150) {
  const text = String(query || '').trim();
  if (!text) return;
  window.setTimeout(() => dispatchHeyHorizonQuery(text), delayMs);
}
