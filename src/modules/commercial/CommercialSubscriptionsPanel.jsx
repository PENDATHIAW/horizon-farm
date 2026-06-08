import { RefreshCw, Plus, PauseCircle, PlayCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import {
  buildSubscriptionOrderDraft,
  buildSubscriptionRecord,
  readAllCommercialSubscriptions,
  subscriptionsToPrepare,
  upsertClientSubscription,
  SUBSCRIPTION_STATUSES,
} from '../../utils/commercialSubscriptions.js';

export default function CommercialSubscriptionsPanel({
  clients = [],
  onUpdateClient,
  onNewSale,
  activeFarm,
}) {
  const subscriptions = readAllCommercialSubscriptions(clients);
  const toPrepare = subscriptionsToPrepare(subscriptions);

  const createSample = async () => {
    const client = clients.find((c) => c.id && (c.nom || c.name));
    if (!client) return toast.error('Créez d\'abord un client.');
    const sub = buildSubscriptionRecord({
      client,
      productName: 'Œufs tablettes',
      quantity: 5,
      unit: 'tablette',
      frequency: 'weekly',
      plannedDay: 'vendredi',
      unitPrice: 3000,
      farmId: activeFarm?.id,
    });
    await onUpdateClient?.(client.id, upsertClientSubscription(client, sub));
    toast.success('Abonnement créé');
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
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><RefreshCw size={14} /> Abonnements</p>
            <p className="text-sm text-[#8a7456]">Commandes récurrentes — génération manuelle avec validation.</p>
          </div>
          <button type="button" onClick={createSample} className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white"><Plus size={12} className="inline" /> Nouvel abonnement</button>
        </div>
        {toPrepare.length ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {toPrepare.length} abonnement(s) à préparer prochainement
          </div>
        ) : null}
      </section>

      {!subscriptions.length ? (
        <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-6 text-center text-sm text-[#8a7456]">Aucun abonnement actif.</p>
      ) : (
        <div className="space-y-2">
          {subscriptions.map((sub) => (
            <div key={sub.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <p className="font-black text-[#2f2415]">{sub.clientName} · {sub.productName}</p>
                <p className="text-xs text-[#8a7456]">
                  {sub.quantity} {sub.unit} · {sub.frequencyLabel}
                  {sub.plannedDay ? ` · ${sub.plannedDay}` : ''}
                  · {fmtCurrency(sub.unitPrice * sub.quantity)}
                  · prochaine : {sub.nextOrderDate || '—'}
                </p>
                <p className="text-[11px] font-bold text-[#9a6b12]">{sub.statusLabel}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {sub.status === SUBSCRIPTION_STATUSES.ACTIVE ? (
                  <>
                    <button type="button" onClick={() => createOrder(sub)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-800">Créer commande prévue</button>
                    <button type="button" onClick={() => toggleStatus(sub, SUBSCRIPTION_STATUSES.SUSPENDED)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-800"><PauseCircle size={12} className="inline" /></button>
                  </>
                ) : (
                  <button type="button" onClick={() => toggleStatus(sub, SUBSCRIPTION_STATUSES.ACTIVE)} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-800"><PlayCircle size={12} className="inline" /> Réactiver</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
