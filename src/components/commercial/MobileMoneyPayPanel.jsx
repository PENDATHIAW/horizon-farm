import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format';
import Btn from '../Btn';
import {
  createMobileMoneyPaymentLink,
  finalizeMobileMoneyPayment,
  getMobileMoneyPaymentStatus,
  simulateMobileMoneyConfirm,
} from '../../services/mobileMoneyPaymentService.js';

const PROVIDERS = [
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
];

export default function MobileMoneyPayPanel({
  sale,
  amount,
  clientPhone = '',
  payments = [],
  transactions = [],
  clients = [],
  salesOrders = [],
  handlers = {},
  farmScope = {},
  accessibleFarms = [],
  activeFarm = null,
  onSuccess,
  onRefreshWorkflow,
}) {
  const [provider, setProvider] = useState('wave');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const [polling, setPolling] = useState(false);

  const remaining = Number(amount || 0);

  const sendLink = async () => {
    if (!sale?.id || remaining <= 0) {
      toast.error('Montant ou vente invalide');
      return;
    }
    setBusy(true);
    try {
      const link = await createMobileMoneyPaymentLink({
        orderId: sale.id,
        amount: remaining,
        provider,
        clientPhone,
        clientId: sale.client_id || '',
        description: `Vente ${sale.id} — ${sale.client_label || sale.client_name || 'Client'}`,
      });
      setPending(link);
      if (link.paymentUrl) {
        window.open(link.paymentUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success(
        link.sandbox
          ? 'Lien simulation créé — confirmez le paiement ci-dessous'
          : 'Lien de paiement ouvert — en attente confirmation client',
        { duration: 5000 },
      );
    } catch (error) {
      toast.error(error.message || 'Création lien impossible');
    } finally {
      setBusy(false);
    }
  };

  const checkAndFinalize = useCallback(async (ref) => {
    if (!ref || !sale?.id) return;
    setBusy(true);
    try {
      const status = await getMobileMoneyPaymentStatus(ref);
      if (status.status !== 'completed') {
        toast.error('Paiement pas encore confirmé par Wave / Orange Money');
        return;
      }
      const result = await finalizeMobileMoneyPayment({
        sale,
        statusResult: status,
        payments,
        transactions,
        clients,
        salesOrders,
        handlers,
        farmScope,
        accessibleFarms,
        activeFarm,
      });
      if (result?.skipped && result.reason === 'duplicate_payment') {
        toast.success('Encaissement déjà enregistré');
      } else if (result?.skipped) {
        toast.error(result.reason || 'Encaissement ignoré');
      } else {
        toast.success(`Encaissement ${fmtCurrency(status.amount)} confirmé (${status.provider})`, { duration: 5000 });
      }
      setPending(null);
      await onRefreshWorkflow?.();
      onSuccess?.(result);
    } catch (error) {
      toast.error(error.message || 'Finalisation impossible');
    } finally {
      setBusy(false);
    }
  }, [sale, payments, transactions, clients, salesOrders, handlers, farmScope, accessibleFarms, activeFarm, onSuccess, onRefreshWorkflow]);

  const simulateConfirm = async () => {
    if (!pending?.ref) return;
    setBusy(true);
    try {
      await simulateMobileMoneyConfirm(pending.ref);
      await checkAndFinalize(pending.ref);
    } catch (error) {
      toast.error(error.message || 'Simulation impossible');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!pending?.ref || pending.sandbox) return undefined;
    setPolling(true);
    const id = window.setInterval(async () => {
      try {
        const status = await getMobileMoneyPaymentStatus(pending.ref);
        if (status.status === 'completed') {
          window.clearInterval(id);
          setPolling(false);
          await checkAndFinalize(pending.ref);
        }
      } catch {
        /* ignore poll errors */
      }
    }, 8000);
    return () => {
      window.clearInterval(id);
      setPolling(false);
    };
  }, [pending?.ref, pending?.sandbox, checkAndFinalize]);

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-4 space-y-3">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-sky-800">Paiement mobile</p>
        <p className="text-sm text-sky-900 mt-1">
          Envoyer un lien Wave ou Orange Money pour <b>{fmtCurrency(remaining)}</b>.
          L’encaissement ERP est créé après confirmation (webhook ou vérification).
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-sky-900">
          Fournisseur
          <select
            className="mt-1 rounded-lg border border-sky-200 bg-white px-3 py-2 text-sm"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </label>
        <Btn small onClick={sendLink} disabled={busy || remaining <= 0}>
          {busy ? '…' : 'Envoyer lien de paiement'}
        </Btn>
        {pending?.sandbox ? (
          <Btn small variant="outline" onClick={simulateConfirm} disabled={busy}>
            Confirmer paiement (simulation)
          </Btn>
        ) : null}
        {pending?.ref && !pending?.sandbox ? (
          <Btn small variant="outline" onClick={() => checkAndFinalize(pending.ref)} disabled={busy}>
            Vérifier paiement
          </Btn>
        ) : null}
      </div>
      {pending ? (
        <p className="text-xs text-sky-800">
          Réf. <code>{pending.ref}</code>
          {pending.sandbox ? ' · mode simulation' : ''}
          {polling ? ' · vérification automatique…' : ''}
        </p>
      ) : null}
      {!clientPhone ? (
        <p className="text-xs text-amber-800">Numéro client absent — le lien peut quand même être généré.</p>
      ) : null}
    </div>
  );
}
