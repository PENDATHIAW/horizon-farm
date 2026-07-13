import { Lightbulb, MessageCircle, Phone, ShoppingCart, Store } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import { fmtCurrency } from '../../utils/format';
import { saleAmount } from './commercialMetrics.js';
import ClientContactModal from './ClientContactModal.jsx';
import CommercialSaleReadinessPanel from './CommercialSaleReadinessPanel.jsx';
import SellableStockPublicationBridge from './SellableStockPublicationBridge.jsx';
import { matchOpportunityToClients, opportunityMessageForClient } from './commercialOpportunityMatching.js';
import { mergeCommercialOpportunities, formatOpportunityUrgencyLabel } from '../../utils/commercialAutoOpportunities.js';
import {
  ensureOrgaloopEffluentOpportunity,
  isOrgaloopEffluentOpportunity,
  markEffluentPublishedOnOrgaloop,
} from '../../services/greenpreneurs/orgaloopEffluentWorkflow.js';
import { ORGALOOP_EFFLUENT_CHANNEL } from '../../config/derfjGreenpreneurs.config.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const urgencyTone = (urgency = '') => {
  if (urgency === 'critique') return 'bg-urgent-bg text-urgent border-urgent';
  if (urgency === 'haute') return 'bg-vigilance-bg text-horizon-dark border-vigilance';
  return 'bg-neutral-bg text-neutral border-line';
};

function OpportunityCard({ row, match, onConvert, onContactClient, onContactAll, onPublishOrgaloop }) {
  const amount = saleAmount(row) || row.estimated_value || row.montant_estime || 0;
  const qty = row.quantity ?? row.quantite;
  const orgaloopOpp = isOrgaloopEffluentOpportunity(row);
  const published = Boolean(row.published_on_orgaloop_at) || norm(row.statut) === 'en_cours';
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Lightbulb size={16} className="text-horizon-dark shrink-0 mt-1" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-earth">{row.title || row.libelle || row.product_name || 'Opportunité'}</b>
              {row.urgency ? (
                <span className={`rounded-full border px-2 py-1 text-meta font-semibold uppercase ${urgencyTone(row.urgency)}`}>
                  {formatOpportunityUrgencyLabel(row.urgency)}
                </span>
              ) : null}
              {row.auto_generated ? (
                <span className="rounded-full border border-line px-2 py-1 text-meta font-semibold text-slate">Auto</span>
              ) : null}
              {norm(row.phase || row.statut_activite).includes('phase_future') || norm(row.activity_type).includes('valorisation') ? (
                <span className="rounded-full border border-line bg-neutral-bg px-2 py-1 text-meta font-semibold text-neutral">Phase future</span>
              ) : null}
              {orgaloopOpp ? (
                <span className="rounded-full border border-positive bg-positive-bg px-2 py-1 text-meta font-semibold text-positive">{ORGALOOP_EFFLUENT_CHANNEL.platformName}</span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-semibold text-horizon-dark">{match.label}</p>
            {qty ? <p className="text-xs text-slate">Qté {qty} {row.unit || ''}</p> : null}
            {row.reason ? <p className="mt-1 text-xs text-slate line-clamp-2">{row.reason}</p> : null}
            {row.recommendation ? <p className="mt-1 text-xs font-semibold text-earth">Suggestion : {row.recommendation}</p> : null}
          </div>
        </div>
        <span className="shrink-0 text-lg font-semibold text-positive">{fmtCurrency(amount)}</span>
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
        {orgaloopOpp && !published ? (
          <Btn variant="outline" small icon={Store} onClick={() => onPublishOrgaloop(row)}>Publier sur Orgaloop</Btn>
        ) : null}
        <Btn variant="amber" small icon={ShoppingCart} onClick={() => onConvert(row, match.clients[0])}>Convertir en vente</Btn>
      </div>
    </article>
  );
}

export default function CommercialOpportunitiesPanel({
  opportunities = [],
  autoOpportunities = [],
  clients = [],
  stocks = [],
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

  const mergedOpportunities = useMemo(
    () => mergeCommercialOpportunities(opportunities, autoOpportunities),
    [opportunities, autoOpportunities],
  );

  const enriched = useMemo(() => arr(mergedOpportunities).map((row) => ({
    row,
    match: matchOpportunityToClients(row, clients, salesOrders),
  })), [mergedOpportunities, clients, salesOrders]);

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

  const createOrgaloopOpportunity = async () => {
    try {
      await ensureOrgaloopEffluentOpportunity({
        opportunities,
        handlers: {
          onCreateOpportunity,
          onRefreshOpportunities,
        },
      });
      toast.success(`Opportunité ${ORGALOOP_EFFLUENT_CHANNEL.platformName} créée`);
    } catch (error) {
      toast.error(error.message || 'Création impossible');
    }
  };

  const publishOnOrgaloop = async (opportunity) => {
    try {
      await markEffluentPublishedOnOrgaloop({
        opportunity,
        handlers: {
          onUpdateOpportunity,
          onCreateBusinessEvent,
          onRefreshOpportunities,
          onRefreshBusinessEvents,
        },
      });
      toast.success(`Marqué comme publié sur ${ORGALOOP_EFFLUENT_CHANNEL.platformName}`);
    } catch (error) {
      toast.error(error.message || 'Publication impossible');
    }
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

      <SellableStockPublicationBridge
        rows={stocks}
        title="Stock vendable : publications"
        subtitle="Messages WhatsApp, Facebook, SMS et offres promo (DLC urgente) sans envoi automatique."
        onWhatsAppLog={onWhatsAppLog}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-meta font-semibold uppercase tracking-normal text-slate">Pipeline</p>
          <p className="text-2xl font-semibold text-earth">{fmtCurrency(pipeline)}</p>
          <p className="text-sm text-slate">{mergedOpportunities.length} opportunité(s) · stock, cultures, élevage — clients ciblés automatiquement</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openDirectSale} className="min-h-[44px] rounded-xl bg-earth px-4 py-2 text-sm font-semibold text-white">+ Vente directe</button>
          <button type="button" onClick={createOrgaloopOpportunity} className="min-h-[44px] rounded-xl border border-positive bg-positive-bg px-4 py-2 text-sm font-semibold text-positive">+ Fumier/fientes Orgaloop</button>
        </div>
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
              onPublishOrgaloop={publishOnOrgaloop}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-slate">Aucune opportunité ouverte.</div>
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
