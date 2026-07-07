import { FileText, Send, CheckCircle2, XCircle, ArrowRightCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUSES,
  convertQuoteToOrder,
  isQuoteOrder,
  prepareCommercialQuoteCommit,
  quoteStatusOf,
  updateQuoteStatus,
} from '../../utils/commercialQuoteWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);

export default function CommercialQuotesPanel({
  orders = [],
  orderItems = [],
  clients = [],
  onCreateOrder,
  onCreateItem,
  onUpdateOrder,
  onCreateDelivery,
  onCreateInvoice,
  onCreateDocument,
  onCreatePayment,
  onCreateBusinessEvent,
  onRefreshWorkflow,
  farmScope,
  accessibleFarms,
  activeFarm,
  stocks = [],
  lots = [],
  cultures = [],
  animaux = [],
  payments = [],
  transactions = [],
  sideEffectHandlers = {},
}) {
  const quotes = arr(orders).filter(isQuoteOrder);
  const [quoteClientId, setQuoteClientId] = useState('');

  const createDraftQuote = async () => {
    const client = clients.find((row) => String(row.id) === String(quoteClientId)) || clients[0];
    if (!client) return toast.error('Créez d\'abord un client.');
    try {
      const { records } = prepareCommercialQuoteCommit({
        form: {
          date: new Date().toISOString().slice(0, 10),
          client_id: client.id,
          source_type: 'service',
          product_name: 'Devis commercial',
          quantity: 1,
          unit: 'forfait',
          unit_price: 0,
          payment_status: 'non_paye',
        },
        clientLabel: client.nom || client.name,
        farmScope,
        accessibleFarms,
        activeFarm,
        quoteStatus: QUOTE_STATUSES.DRAFT,
      });
      await onCreateOrder?.(records.order);
      for (const item of records.items) await onCreateItem?.(item);
      await onCreateBusinessEvent?.({ ...records.businessEvent, event_type: 'devis_commercial' });
      await onRefreshWorkflow?.();
      toast.success('Devis brouillon créé');
    } catch (e) {
      toast.error(e.message || 'Création devis impossible');
    }
  };

  const markSent = async (quote) => {
    await updateQuoteStatus(quote, QUOTE_STATUSES.SENT, { onUpdateOrder });
    toast.success('Devis marqué envoyé');
    await onRefreshWorkflow?.();
  };

  const convert = async (quote) => {
    try {
      await convertQuoteToOrder({
        quote,
        items: orderItems.filter((i) => String(i.order_id) === String(quote.id)),
        form: { payment_status: 'non_paye', invoice_issued: true },
        handlers: {
          onUpdateOrder,
          onCreateDelivery,
          onCreateInvoice,
          onCreateDocument,
          onCreatePayment,
          onCreateBusinessEvent,
          onRefreshWorkflow,
        },
        context: {
          farmScope,
          accessibleFarms,
          activeFarm,
          stocks,
          lots,
          cultures,
          animaux,
          clients,
          payments,
          transactions,
          sideEffectHandlers,
        },
      });
      toast.success('Devis converti en commande');
    } catch (e) {
      toast.error(e.message || 'Conversion impossible');
    }
  };

  return (
    <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><FileText size={14} /> Devis commerciaux</p>
          <p className="text-sm text-[#8a7456]">Devis → commande → facture · sans impact stock au stade devis</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {clients.length ? (
            <label className="flex items-center gap-2 text-xs font-bold text-[#8a7456]">
              Client
              <select
                value={quoteClientId || clients[0]?.id || ''}
                onChange={(event) => setQuoteClientId(event.target.value)}
                className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-sm font-black text-[#2f2415]"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.nom || client.name || client.id}</option>
                ))}
              </select>
            </label>
          ) : null}
          <button type="button" onClick={createDraftQuote} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white">Nouveau devis</button>
        </div>
      </div>

      {!quotes.length ? (
        <p className="text-sm text-[#8a7456] rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-4">Aucun devis — créez un brouillon pour préparer une offre client.</p>
      ) : (
        <div className="space-y-2">
          {quotes.slice(0, 8).map((quote) => {
            const status = quoteStatusOf(quote);
            return (
              <div key={quote.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <p className="font-black text-[#2f2415]">{quote.id} · {quote.client_label || quote.client_id}</p>
                  <p className="text-xs text-[#8a7456]">{quote.product_name} · {fmtCurrency(quote.montant_total)} · {QUOTE_STATUS_LABELS[status] || status}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {status === QUOTE_STATUSES.DRAFT ? (
                    <button type="button" onClick={() => markSent(quote)} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-800"><Send size={12} className="inline" /> Envoyer</button>
                  ) : null}
                  {['envoye', 'accepte', 'brouillon'].includes(status) ? (
                    <button type="button" onClick={() => convert(quote)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800"><ArrowRightCircle size={12} className="inline" /> Convertir</button>
                  ) : null}
                  {status === QUOTE_STATUSES.CONVERTED ? (
                    <span className="text-[11px] font-black text-emerald-700 flex items-center gap-1"><CheckCircle2 size={12} /> Converti</span>
                  ) : null}
                  {status === QUOTE_STATUSES.REFUSED ? (
                    <span className="text-[11px] font-black text-red-700 flex items-center gap-1"><XCircle size={12} /> Refusé</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
