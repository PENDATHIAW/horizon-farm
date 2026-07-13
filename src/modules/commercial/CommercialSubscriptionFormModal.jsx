import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import BaseModal from '../../modals/BaseModal.jsx';
import {
  SUBSCRIPTION_FREQUENCY_OPTIONS,
  SUBSCRIPTION_STATUSES,
  buildSubscriptionRecordFromForm,
  hasDuplicateSubscription,
  validateSubscriptionForm,
} from '../../utils/commercialSubscriptions.js';
import { COMMERCIAL_UNIT_GROUPS, unitLabel } from '../../utils/commercialUnits.js';

const SUBSCRIPTION_UNIT_OPTIONS = [...new Set(Object.values(COMMERCIAL_UNIT_GROUPS).flat())];

const clientNameOf = (client = {}) => client.nom || client.name || client.id || 'Client';

const EMPTY_FORM = {
  clientId: '',
  productName: '',
  quantity: '1',
  unit: 'unité',
  unitPrice: '',
  frequency: 'weekly',
  plannedDay: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  status: SUBSCRIPTION_STATUSES.ACTIVE,
  notes: '',
};

export default function CommercialSubscriptionFormModal({
  open,
  onClose,
  clients = [],
  activeFarm,
  onSave,
}) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    startDate: new Date().toISOString().slice(0, 10),
    clientId: '',
  }));
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const selectableClients = useMemo(
    () => (Array.isArray(clients) ? clients : []).filter((client) => client?.id),
    [clients],
  );

  const effectiveClientId = form.clientId || selectableClients[0]?.id || '';

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submitForm = async () => {
    const payload = { ...form, clientId: effectiveClientId };
    const validationErrors = validateSubscriptionForm(payload);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    const client = selectableClients.find((row) => String(row.id) === String(effectiveClientId));
    if (!client) {
      setErrors(['Client introuvable.']);
      return;
    }

    const record = buildSubscriptionRecordFromForm(
      { ...form, clientId: effectiveClientId, farmId: activeFarm?.id || null },
      selectableClients,
    );

    if (hasDuplicateSubscription(client, record)) {
      setErrors(['Un abonnement identique existe déjà pour ce client (produit, fréquence et jour prévu).']);
      return;
    }

    setSaving(true);
    try {
      await onSave?.(client, record);
      toast.success('Abonnement créé');
      onClose?.();
    } catch (error) {
      toast.error(error?.message || 'Création impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Nouvel abonnement"
      footer={(
        <div className="flex flex-wrap justify-end gap-2">
          <Btn variant="outline" onClick={onClose} disabled={saving}>Annuler</Btn>
          <Btn onClick={submitForm} disabled={saving || !selectableClients.length}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Btn>
        </div>
      )}
    >
      {!selectableClients.length ? (
        <p className="rounded-xl border border-vigilance bg-vigilance-bg px-4 py-3 text-sm text-horizon-dark">
          Créez d&apos;abord un client avant d&apos;ajouter un abonnement.
        </p>
      ) : (
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submitForm(); }}>
          {errors.length ? (
            <div className="rounded-xl border border-urgent bg-urgent-bg px-4 py-3 text-sm text-urgent">
              {errors.map((error) => <p key={error}>{error}</p>)}
            </div>
          ) : null}

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-normal text-slate">Client</span>
            <select
              value={effectiveClientId}
              onChange={(event) => setField('clientId', event.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              required
            >
              <option value="">Choisir un client</option>
              {selectableClients.map((client) => (
                <option key={client.id} value={client.id}>{clientNameOf(client)}</option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-normal text-slate">Produit / article</span>
            <input
              type="text"
              value={form.productName}
              onChange={(event) => setField('productName', event.target.value)}
              className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              placeholder="Ex. Œufs tablettes"
              required
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Quantité</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.quantity}
                onChange={(event) => setField('quantity', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Unité</span>
              <select
                value={form.unit}
                onChange={(event) => setField('unit', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                required
              >
                {SUBSCRIPTION_UNIT_OPTIONS.map((unit) => (
                  <option key={unit} value={unit}>{unitLabel(unit)}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Prix unitaire (FCFA)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.unitPrice}
                onChange={(event) => setField('unitPrice', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                required
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Fréquence</span>
              <select
                value={form.frequency}
                onChange={(event) => setField('frequency', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                required
              >
                {SUBSCRIPTION_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Jour / date prévue</span>
              <input
                type="text"
                value={form.plannedDay}
                onChange={(event) => setField('plannedDay', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                placeholder="Ex. vendredi ou 2026-06-10"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Date de début</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) => setField('startDate', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Date de fin (optionnel)</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(event) => setField('endDate', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate">Statut</span>
              <select
                value={form.status}
                onChange={(event) => setField('status', event.target.value)}
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              >
                <option value={SUBSCRIPTION_STATUSES.ACTIVE}>Actif</option>
                <option value={SUBSCRIPTION_STATUSES.SUSPENDED}>Suspendu</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-normal text-slate">Notes (optionnel)</span>
            <textarea
              value={form.notes}
              onChange={(event) => setField('notes', event.target.value)}
              className="min-h-[80px] w-full rounded-xl border border-line bg-white px-3 py-2 text-sm"
              placeholder="Instructions de livraison, contact, etc."
            />
          </label>
        </form>
      )}
    </BaseModal>
  );
}
