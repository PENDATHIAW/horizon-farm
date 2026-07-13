import { Lightbulb, MessageCircle, Phone, Trash2 } from 'lucide-react';
import Btn from '../../components/Btn';
import BaseModal from '../../modals/BaseModal.jsx';
import { fmtCurrency } from '../../utils/format';
import { opportunityMessageForClient } from './commercialOpportunityMatching.js';

function Row({ label, value, warn = false }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-line bg-card px-3 py-2">
      <span className="text-xs text-slate">{label}</span>
      <span className={`text-sm font-semibold text-right ${warn ? 'text-horizon-dark' : 'text-earth'}`}>{value}</span>
    </div>
  );
}

export default function ClientProfileModal({
  open,
  onClose,
  client,
  segment = {},
  summary = {},
  matchedOpportunities = [],
  onEdit,
  onDelete,
  onContact,
  onProposeOpportunity,
}) {
  if (!client) return null;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title={`Profil - ${client.nom || client.name || client.id}`}
      footer={(
        <div className="flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            <Btn variant="outline" onClick={() => onEdit?.(client)}>Modifier</Btn>
            <Btn variant="outline" icon={Trash2} onClick={() => onDelete?.(client)}>Supprimer</Btn>
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" icon={Phone} onClick={() => onContact?.(client, 'call')}>Appeler</Btn>
            <Btn variant="whatsapp" icon={MessageCircle} onClick={() => onContact?.(client, 'whatsapp')}>WhatsApp</Btn>
          </div>
        </div>
      )}
    >
      <div className="space-y-4">
        <section>
          <p className="text-xs font-semibold uppercase text-slate mb-2">Segmentation</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Row label="Segment" value={segment.segment || '-'} />
            <Row label="Canal" value={segment.channel || '-'} />
            <Row label="Fidélité" value={`${segment.loyaltyScore ?? 0}%`} />
            <Row label="Taux paiement" value={`${segment.paymentRate ?? 0}%`} />
            <Row label="Panier moyen" value={fmtCurrency(segment.averageBasket || summary.averageBasket || 0)} />
            <Row label="Fréquence d'achat" value={segment.frequencyLabel || '-'} />
            <Row label="Intervalle moyen" value={segment.averageIntervalDays != null ? `${segment.averageIntervalDays} j` : '-'} />
            <Row label="Commandes / mois" value={segment.ordersPerMonth != null ? String(segment.ordersPerMonth) : '-'} />
            <Row label="Inactivité" value={segment.inactivityDays != null ? `${segment.inactivityDays} j` : '-'} warn={segment.isDueForReorder} />
            {segment.isDueForReorder ? (
              <Row label="Renouvellement" value={`En retard (+${segment.daysOverdue || 0} j)`} warn />
            ) : null}
          </div>
        </section>

        <section>
          <p className="text-xs font-semibold uppercase text-slate mb-2">Historique ventes</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Row label="CA total" value={fmtCurrency(summary.totalAchete || 0)} />
            <Row label="Payé" value={fmtCurrency(summary.totalPaye || 0)} />
            <Row label="Reste à payer" value={fmtCurrency(summary.resteAPayer || 0)} warn={summary.resteAPayer > 0} />
            <Row label="Commandes" value={summary.orders?.length || 0} />
            <Row label="Dernière commande" value={summary.derniereCommandeVente || '-'} />
            <Row label="Type client" value={client.type_client || client.type || '-'} />
          </div>
        </section>

        {segment.action ? (
          <section className="rounded-xl border border-positive bg-positive-bg p-3">
            <p className="text-xs font-semibold text-positive">Action recommandée</p>
            <p className="text-sm text-positive mt-1">{segment.action}</p>
          </section>
        ) : null}

        {client.prefs ? (
          <section className="rounded-xl border border-line bg-white p-3">
            <p className="text-xs font-semibold text-slate">Préférences / besoins</p>
            <p className="text-sm text-earth mt-1">{client.prefs}</p>
          </section>
        ) : null}

        <section>
          <p className="text-xs font-semibold uppercase text-slate mb-2 flex items-center gap-1"><Lightbulb size={14} /> Opportunités compatibles</p>
          {matchedOpportunities.length ? (
            <div className="space-y-2">
              {matchedOpportunities.map(({ opportunity, score }) => (
                <div key={opportunity.id} className="rounded-xl border border-vigilance bg-vigilance-bg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-earth">{opportunity.title || opportunity.libelle || 'Opportunité'}</p>
                      <p className="text-xs text-slate mt-1">
                        Adéquation {score}%
                        {segment.frequencyLabel ? ` · ${segment.frequencyLabel}` : ''}
                        {segment.isDueForReorder ? ' · à renouveler' : ''}
                        {' · '}
                        {fmtCurrency(opportunity.montant_estime || opportunity.estimated_value || 0)}
                      </p>
                    </div>
                    <Btn variant="amber" small onClick={() => onProposeOpportunity?.(client, opportunity, opportunityMessageForClient(opportunity, client))}>Proposer</Btn>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate">Aucune opportunité ouverte ne correspond clairement à ce profil pour le moment.</p>
          )}
        </section>
      </div>
    </BaseModal>
  );
}
