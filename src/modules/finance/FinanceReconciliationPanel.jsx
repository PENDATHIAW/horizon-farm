import { Link2, Package, Plus, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import { emitHorizonForm } from '../../services/formModalManager';
import { fmtCurrency } from '../../utils/format';
import {
  buildFinanceFromPaymentRepair,
  buildFinanceReconciliationRows,
  reconciliationWouldDuplicate,
} from '../../utils/financeReconciliation';
import { buildStockReceptionFromFinanceTransaction } from '../../utils/stockPurchaseWorkflow';
import AiReconciliationPanel from './AiReconciliationPanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);

function kindIcon(kind = '') {
  if (kind === 'payment_without_finance') return Plus;
  if (kind === 'finance_without_payment') return Link2;
  return Package;
}

export default function FinanceReconciliationPanel({
  transactions = [],
  payments = [],
  salesOrders = [],
  stocks = [],
  onCreateFinanceTransaction,
  onRefreshFinances,
  onNavigate,
}) {
  const [busyId, setBusyId] = useState(null);

  const rows = useMemo(
    () => buildFinanceReconciliationRows({ transactions, payments, salesOrders, stocks }),
    [transactions, payments, salesOrders, stocks],
  );

  const createFinanceFromPayment = async (row) => {
    if (reconciliationWouldDuplicate('payment_without_finance', { payment: row.payment, transactions })) {
      toast.error('Une ligne finance existe déjà pour ce paiement.');
      return;
    }
    const built = buildFinanceFromPaymentRepair({
      payment: row.payment,
      order: row.order,
      transactions,
    });
    if (built.duplicate) {
      toast.error('Doublon détecté — actualisez la liste.');
      return;
    }
    if (!built.row || !onCreateFinanceTransaction) {
      toast.error('Création finance indisponible');
      return;
    }
    setBusyId(row.id);
    try {
      await onCreateFinanceTransaction(built.row);
      await onRefreshFinances?.();
      toast.success('Ligne finance créée depuis le paiement');
    } catch (e) {
      toast.error(e.message || 'Échec création finance');
    } finally {
      setBusyId(null);
    }
  };

  const linkToSale = (row) => {
    onNavigate?.('commercial', { tab: 'Ventes', orderId: row.orderId });
    toast('Ouvrez la vente pour enregistrer ou lier le paiement.', { icon: 'ℹ️' });
  };

  const redirectStock = (row) => {
    emitHorizonForm(
      'stock',
      'stock_purchase',
      'Réception achat (depuis rapprochement)',
      buildStockReceptionFromFinanceTransaction(row.transaction, stocks),
    );
    onNavigate?.('achats_stock', { tab: 'Stock' });
  };

  if (!rows.length) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
        Aucun écart de rapprochement détecté entre paiements, recettes finance et stock.
      </section>
    );
  }

  const aiCoveredRowIds = useMemo(() => {
    const paymentRows = rows.filter((row) => row.kind === 'payment_without_finance').map((row) => row.id);
    return new Set(paymentRows);
  }, [rows]);

  return (
    <div className="space-y-4">
      <AiReconciliationPanel
        rows={rows}
        transactions={transactions}
        salesOrders={salesOrders}
        stocks={stocks}
        onCreateFinanceTransaction={onCreateFinanceTransaction}
        onRefreshFinances={onRefreshFinances}
        onNavigate={onNavigate}
      />
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-2">
        <Wallet className="text-[#9a6b12] shrink-0" size={22} />
        <div>
          <h2 className="text-lg font-black text-[#2f2415]">Rapprochement</h2>
          <p className="text-sm text-[#8a7456]">
            Réparer l’historique : paiement sans finance, recette sans paiement, dépense stockable sans entrée stock. Les actions vérifient les doublons avant création.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => {
          const Icon = kindIcon(row.kind);
          return (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-black text-[#2f2415] flex items-center gap-2">
                  <Icon size={16} className="text-[#9a6b12]" />
                  {row.title}
                </p>
                <p className="text-xs text-[#8a7456] mt-1">{row.detail}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.kind === 'payment_without_finance' && !aiCoveredRowIds.has(row.id) ? (
                  <Btn
                    icon={Plus}
                    small
                    disabled={busyId === row.id}
                    onClick={() => createFinanceFromPayment(row)}
                  >
                    {busyId === row.id ? '…' : 'Créer finance (manuel)'}
                  </Btn>
                ) : null}
                {row.kind === 'payment_without_finance' && aiCoveredRowIds.has(row.id) ? (
                  <span className="text-[11px] text-violet-700 font-semibold self-center">
                    Proposition IA disponible ci-dessus
                  </span>
                ) : null}
                {row.kind === 'finance_without_payment' ? (
                  <Btn icon={Link2} small variant="outline" onClick={() => linkToSale(row)}>
                    Lier vente / paiement
                  </Btn>
                ) : null}
                {row.kind === 'stockable_without_stock' ? (
                  <Btn icon={Package} small variant="outline" onClick={() => redirectStock(row)}>
                    Achats & Stock
                  </Btn>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-[#8a7456]">{rows.length} écart(s) à traiter</p>
    </section>
    </div>
  );
}
