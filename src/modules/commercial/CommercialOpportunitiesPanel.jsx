import { Lightbulb, MessageCircle, Phone, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import { fmtCurrency } from '../../utils/format';
import { saleAmount } from './commercialMetrics.js';
import ClientContactModal from './ClientContactModal.jsx';
import CommercialSaleReadinessPanel from './CommercialSaleReadinessPanel.jsx';
import { matchOpportunityToClients, opportunityMessageForClient } from './commercialOpportunityMatching.js';

const arr = (v) => (Array.isArray(v) ? v : []);

function OpportunityCard({ row, match, onConvert, onContactClient, onContactAll }) {
  const amount = saleAmount(row) || row.estimated_value || row.montant_estime || 0;
  return (
    <article className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Lightbulb size={16} className="text-[#9a6b12] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <b className="text-[#2f2415]">{row.title || row.libelle || row.product_name || 'Opportunité'}</b>
            <p className="mt-1 text-sm font-bold text-[#9a6b12]">{match.label}</p>
            {row.reason ? <p className="mt-1 text-xs text-[#8a7456] line-clamp-2">{row.reason}</p> : null}
          </div>
        </div>
        <span className="shrink-0 text-lg font-black text-emerald-700">{fmtCurrency(amount)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {match.mode === 'single' && match.clients[0] ? (
          <>
            <Btn variant="outline" small icon={Phone} onClick={() => onContactClient(match.clients[0], row, 'call')}>Appeler</Btn>
            <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => onContactClient(match.clients[0], row, 'whatsapp')}>WhatsApp</Btn>
          </>
        ) : match.clients.length ? (
          <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => onContactAll(row, match.clients)}>Proposer aux clients</Btn>
        ) : null}
        <Btn variant="amber" small icon={ShoppingCart} onClick={() => onConvert(row, match.clients[0])}>Convertir en vente</Btn>
      </div>
    </article>
  );
}

export default function CommercialOpportunitiesPanel({
  opportunities = [],
  clients = [],
  salesOrders = [],
  lots = [],
  animaux = [],
  setTab,
  onWhatsAppLog,
  onConvertSale,
  onUpdateLot,
  onRefreshLots,
  onUpdateAnimal,
  onRefreshAnimals,
  onCreateOpportunity,
  onUpdateOpportunity,
  onRefreshOpportunities,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
}) {
  const [contact, setContact] = useState(null);

  const enriched = useMemo(() => arr(opportunities).map((row) => ({
    row,
    match: matchOpportunityToClients(row, clients, salesOrders),
  })), [opportunities, clients, salesOrders]);

  const pipeline = enriched.reduce((sum, { row }) => sum + saleAmount(row), 0);

  const convertOpportunity = (row, client) => {
    if (onConvertSale) {
      onConvertSale(row, client);
      return;
    }
    setTab('Ventes');
    toast('Ouvrez Nouvelle vente pour finaliser la conversion.');
  };

  const openDirectSale = () => {
    if (onConvertSale) {
      onConvertSale({ title: 'Vente directe', product_name: 'Vente directe' }, null);
      return;
    }
    setTab('Ventes');
  };

  const openContact = (client, opportunity, mode = 'whatsapp') => {
    if (mode === 'call') {
      const phone = client.whatsapp || client.tel || client.phone;
      if (!phone) return toast.error('Numéro manquant');
      window.open(`tel:${phone}`, '_self');
      return;
    }
    setContact({ client, message: opportunityMessageForClient(opportunity, client), title: `Proposer — ${client.nom || client.name}` });
  };

  const openContactAll = (opportunity, clientList) => {
    if (clientList.length === 1) {
      openContact(clientList[0], opportunity, 'whatsapp');
      return;
    }
    setContact({
      client: clientList[0],
      message: opportunityMessageForClient(opportunity, clientList[0]),
      title: `Proposer à ${clientList.length} clients`,
      queue: clientList.slice(1).map((c) => ({ client: c, message: opportunityMessageForClient(opportunity, c) })),
    });
  };

  return (
    <div className="space-y-4">
      <CommercialSaleReadinessPanel
        lots={lots}
        animaux={animaux}
        opportunities={opportunities}
        onUpdateLot={onUpdateLot}
        onRefreshLots={onRefreshLots}
        onUpdateAnimal={onUpdateAnimal}
        onRefreshAnimals={onRefreshAnimals}
        onCreateOpportunity={onCreateOpportunity}
        onUpdateOpportunity={onUpdateOpportunity}
        onRefreshOpportunities={onRefreshOpportunities}
        onCreateBusinessEvent={onCreateBusinessEvent}
        onRefreshBusinessEvents={onRefreshBusinessEvents}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#8a7456]">Pipeline</p>
          <p className="text-2xl font-black text-[#2f2415]">{fmtCurrency(pipeline)}</p>
          <p className="text-sm text-[#8a7456]">{opportunities.length} opportunité(s) · clients ciblés automatiquement</p>
        </div>
        <button type="button" onClick={openDirectSale} className="min-h-[44px] rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">+ Vente directe</button>
      </div>

      {enriched.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {enriched.map(({ row, match }) => (
            <OpportunityCard
              key={row.id || row.title}
              row={row}
              match={match}
              onConvert={convertOpportunity}
              onContactClient={openContact}
              onContactAll={openContactAll}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">Aucune opportunité ouverte.</div>
      )}

      <ClientContactModal
        open={Boolean(contact)}
        onClose={() => setContact(null)}
        client={contact?.client}
        title={contact?.title}
        defaultMessage={contact?.message || ''}
        onWhatsAppLog={onWhatsAppLog}
        onAfterSend={() => {
          if (contact?.queue?.length) {
            const next = contact.queue[0];
            setContact({ ...contact, client: next.client, message: next.message, queue: contact.queue.slice(1), title: `Prochain client (${contact.queue.length} restant(s))` });
          } else {
            setContact(null);
          }
        }}
      />
    </div>
  );
}
