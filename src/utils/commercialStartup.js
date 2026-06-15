/**
 * Commercial V2 — mode démarrage (checklist onboarding).
 */

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => Number(value || 0);

export function isCommercialStartupMode({
  clients = [],
  salesOrders = [],
  quotes = [],
  payments = [],
  sellableStocks = [],
} = {}) {
  const hasClient = arr(clients).some((c) => c.id && c.nom || c.name);
  const hasSale = arr(salesOrders).some((o) => num(o.montant_total) > 0 && String(o.type_document || 'commande') !== 'devis');
  const hasQuote = arr(quotes).length || arr(salesOrders).some((o) => String(o.type_document || '').toLowerCase() === 'devis');
  const hasPayment = arr(payments).some((p) => num(p.montant ?? p.amount) > 0);
  const hasSellable = arr(sellableStocks).length > 0;
  return !hasClient && !hasSale && !hasQuote && !hasPayment && !hasSellable;
}

export function buildCommercialStartupJourney({
  clients = [],
  salesOrders = [],
  payments = [],
  invoices = [],
  whatsappLogs = [],
  sellableStocks = [],
  receivable = 0,
} = {}) {
  const orders = arr(salesOrders);
  const quotes = orders.filter((o) => String(o.type_document || '').toLowerCase() === 'devis');
  const sales = orders.filter((o) => String(o.type_document || 'commande') !== 'devis' && num(o.montant_total) > 0);

  const hasClient = arr(clients).some((c) => c.nom || c.name);
  const hasSellable = arr(sellableStocks).length > 0;
  const hasQuote = quotes.length > 0;
  const hasSale = sales.length > 0;
  const hasPayment = arr(payments).some((p) => num(p.montant ?? p.amount) > 0);
  const hasInvoice = arr(invoices).length > 0 || sales.some((o) => o.invoice_id || o.facture_emise);
  const hasWhatsApp = arr(whatsappLogs).some((l) => ['envoye_manuel', 'ouvert', 'sent_manual'].includes(String(l.status || '').toLowerCase()));
  const hasReceivableFollowUp = num(receivable) > 0;

  const hasOrder = sales.length > 0;
  const hasDelivery = sales.some((o) => ['livre', 'livré', 'livree', 'delivered', 'recupere', 'récupéré'].includes(String(o.statut_livraison || o.delivery_status || '').toLowerCase()));
  const hasEncaissement = hasPayment;

  const steps = [
    { key: 'client', label: '1. Créer client', tab: 'Clients & créances', done: hasClient },
    { key: 'product', label: '2. Publier produit vendable', module: 'achats_stock', tab: 'Inventaire', done: hasSellable },
    { key: 'quote', label: '3. Créer devis', tab: 'Ventes', done: hasQuote },
    { key: 'order', label: '4. Créer commande', tab: 'Ventes', done: hasOrder },
    { key: 'invoice', label: '5. Créer facture', tab: 'Pilotage', done: hasInvoice },
    { key: 'delivery', label: '6. Livrer', tab: 'Livraisons', done: hasDelivery },
    { key: 'payment', label: '7. Encaisser', module: 'finance_pilotage', tab: 'Réconciliation', done: hasEncaissement },
    { key: 'whatsapp', label: '8. Première relance', tab: 'Clients & créances', done: hasWhatsApp },
    { key: 'receivable', label: '9. Suivi créances', tab: 'Clients & créances', done: hasReceivableFollowUp || hasPayment },
  ];

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) || steps[steps.length - 1];

  return {
    steps,
    completed,
    total: steps.length,
    progressPct: Math.round((completed / steps.length) * 100),
    nextStep,
    isEmpty: !hasClient && !hasSale && !hasQuote,
  };
}
