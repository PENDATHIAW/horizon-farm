import { useState } from 'react';
import { RefreshCw, Plus, PauseCircle, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import {
  buildSubscriptionOrderDraft,
  readAllCommercialSubscriptions,
  subscriptionsToPrepare,
  upsertClientSubscription,
  SUBSCRIPTION_STATUSES,
} from '../../utils/commercialSubscriptions.js';
import CommercialSubscriptionFormModal from './CommercialSubscriptionFormModal.jsx';

export default function CommercialSubscriptionsPanel({
  clients = [],
  onUpdateClient,
  onNewSale,
  activeFarm,
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [formSession, setFormSession] = useState(0);
  const subscriptions = readAllCommercialSubscriptions(clients);
  const toPrepare = subscriptionsToPrepare(subscriptions);

  const saveSubscription = async (client, subscription) => {
    await onUpdateClient?.(client.id, upsertClientSubscription(client, subscription));
  };

  const toggleStatus = async (sub, status) => {
    const patch = upsertClientSubscription(sub.client, { ...sub.raw, status, statut: status });
    await onUpdateClient?.(sub.clientId, patch);
    toast.success(status === SUBSCRIPTION_STATUSES.ACTIVE ? 'Abonnement réactivé' : 'Abonnement suspendu');
  };

  const createOrder = (sub) => {
    const draft = buildSubscriptionOrderDraft(sub, sub.client);
    onNewSale?.(draft);
    toast.success('Commande préremplie depuis l\'abonnement');
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><RefreshCw size={14} /> Abonnements</p>
            <p className="text-sm text-slate">Commandes récurrentes — création via formulaire, génération manuelle avec validation.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFormSession((value) => value + 1);
              setFormOpen(true);
            }}
            className="rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white"
          >
            <Plus size={12} className="inline" /> Nouvel abonnement
          </button>
        </div>
        {toPrepare.length ? (
          <div className="mt-3 rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-sm text-horizon-dark">
            {toPrepare.length} abonnement(s) à préparer prochainement
          </div>
        ) : null}
      </section>

      {!subscriptions.length ? (
        <p className="rounded-xl border border-line bg-card px-4 py-6 text-center text-sm text-slate">Aucun abonnement actif.</p>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="rounded-xl border border-line bg-card p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-earth">{sub.clientName} · {sub.productName}</p>
                <p className="text-xs text-slate">
                  {sub.quantity} {sub.unit} · {sub.frequencyLabel}
                  {sub.plannedDay ? ` · ${sub.plannedDay}` : ''}
                  · {fmtCurrency(sub.unitPrice * sub.quantity)}
                  · prochaine : {sub.nextOrderDate || '—'}
                </p>
                <p className="text-meta font-semibold text-horizon-dark">{sub.statusLabel}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {sub.status === SUBSCRIPTION_STATUSES.ACTIVE ? (
                  <>
                    <button type="button" onClick={() => createOrder(sub)} className="rounded-lg border border-positive bg-positive-bg px-2 py-1 text-meta font-semibold text-positive">Créer commande prévue</button>
                    <button type="button" onClick={() => toggleStatus(sub, SUBSCRIPTION_STATUSES.SUSPENDED)} className="rounded-lg border border-vigilance bg-vigilance-bg px-2 py-1 text-meta font-semibold text-horizon-dark"><PauseCircle size={12} className="inline" /></button>
                  </>
                ) : (
                  <button type="button" onClick={() => toggleStatus(sub, SUBSCRIPTION_STATUSES.ACTIVE)} className="rounded-lg border border-line bg-neutral-bg px-2 py-1 text-meta font-semibold text-neutral"><PlayCircle size={12} className="inline" /> Réactiver</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CommercialSubscriptionFormModal
        key={formSession}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        clients={clients}
        activeFarm={activeFarm}
        onSave={saveSubscription}
      />
    </div>
  );
}
