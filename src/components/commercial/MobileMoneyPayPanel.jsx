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
        description: `Vente ${sale.id} - ${sale.client_label || sale.client_name || 'Client'}`,
      });
      setPending(link);
      if (link.paymentUrl) {
        window.open(link.paymentUrl, '_blank', 'noopener,noreferrer');
      }
      toast.success(
        link.sandbox
          ? 'Lien de test créé. Validez-le ci-dessous.'
          : 'Lien ouvert. En attente du paiement du client.',
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
        toast.error('Le paiement n’est pas encore reçu.');
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
        toast.success('Encaissement déjà enregistré.');
      } else if (result?.skipped) {
        toast.error(result.reason || 'Encaissement ignoré');
      } else {
        toast.success(`${fmtCurrency(status.amount)} reçu par ${status.provider === 'wave' ? 'Wave' : 'Orange Money'}.`, { duration: 5000 });
      }
      setPending(null);
      await onRefreshWorkflow?.();
      onSuccess?.(result);
    } catch (error) {
      toast.error(error.message || 'Le paiement n’a pas pu être enregistré.');
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
      toast.error(error.message || 'Le test n’a pas pu être validé.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!pending?.ref || pending.sandbox) return undefined;
    queueMicrotask(() => setPolling(true));
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
    <div className="rounded-xl border border-line bg-neutral-bg p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-normal text-neutral">Encaissement mobile</p>
        <p className="text-sm text-neutral mt-1">
          Envoyer un lien Wave ou Orange Money pour <b>{fmtCurrency(remaining)}</b>.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-neutral">
          Moyen de paiement
          <select
            className="mt-1 rounded-lg border border-line bg-white px-3 py-2 text-sm"
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
            Valider le test
          </Btn>
        ) : null}
        {pending?.ref && !pending?.sandbox ? (
          <Btn small variant="outline" onClick={() => checkAndFinalize(pending.ref)} disabled={busy}>
            Vérifier paiement
          </Btn>
        ) : null}
      </div>
      {pending ? (
        <p className="text-xs text-neutral">
          Réf. <code>{pending.ref}</code>
          {pending.sandbox ? ' · test' : ''}
          {polling ? ' · vérification en cours…' : ''}
        </p>
      ) : null}
      {!clientPhone ? (
        <p className="text-xs text-horizon-dark">Numéro client absent - le lien peut quand même être généré.</p>
      ) : null}
    </div>
  );
}
