/**
 * Traçabilité stock — étapes sur fiche TRA-STOCK-{stockId} (aligné Cultures).
 */

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);

export function stockTraceId(stockId = '') {
  return `TRA-STOCK-${clean(stockId)}`;
}

export async function appendStockTraceStep({
  stock = {},
  eventType = 'stock',
  titre = '',
  details = '',
  montant = null,
  date = '',
  moduleSource = 'stock',
  handlers = {},
} = {}) {
  const stockId = clean(stock.id);
  if (!stockId || !handlers.onCreateTrace) return null;

  const traceId = stockTraceId(stockId);
  const step = {
    date: date || today(),
    titre: titre || 'Mouvement stock',
    event_type: eventType,
    module_source: moduleSource,
    montant: montant != null ? Number(montant) : undefined,
    details: details || '',
  };

  const existing = arr(handlers.existingTraces).find((row) => clean(row.id) === traceId);
  if (existing?.id && handlers.onUpdateTrace) {
    const etapes = arr(existing.etapes);
    const duplicate = etapes.some((item) => item.event_type === step.event_type && item.date === step.date && item.details === step.details);
    if (!duplicate) {
      await handlers.onUpdateTrace(existing.id, {
        etapes: [...etapes, step],
        last_stock_event: eventType,
      });
    }
    return { traceId, updated: true };
  }

  await handlers.onCreateTrace({
    id: traceId,
    animal: stock.produit || stock.name || stock.nom || stockId,
    type: 'stock',
    source_id: stockId,
    source_module: 'stock',
    etapes: [step],
    side_effects_managed: true,
  });
  return { traceId, created: true };
}
