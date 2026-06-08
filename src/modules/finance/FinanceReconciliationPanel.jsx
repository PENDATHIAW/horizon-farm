import { Link2, Package, Plus, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import { emitHorizonForm } from '../../services/formModalManager';
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
  reconciliationView = null,
  transactions = [],
  payments = [],
  salesOrders = [],
  stocks = [],
  onCreateFinanceTransaction,
  onRefreshFinances,
  onNavigate,
  setTab,
}) {
  const [busyId, setBusyId] = useState(null);

  const rows = useMemo(
    () => buildFinanceReconciliationRows({ transactions, payments, salesOrders, stocks }),
    [transactions, payments, salesOrders, stocks],
  );

  const manualAnomalies = useMemo(
    () => arr(reconciliationView?.anomalies).filter((row) => ['missing_proof', 'sale_without_payment'].includes(row.kind)),
    [reconciliationView],
  );

  const aiCoveredRowIds = useMemo(() => {
    const paymentRows = rows.filter((row) => row.kind === 'payment_without_finance').map((row) => row.id);
    return new Set(paymentRows);
  }, [rows]);

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

  const empty = !rows.length && !manualAnomalies.length;

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-2">
          <Wallet className="text-[#9a6b12] shrink-0" size={22} />
          <div>
            <h2 className="text-lg font-black text-[#2f2415]">Réconciliation financière</h2>
            <p className="text-sm text-[#8a7456]">
              Paiements sans commande, commandes sans paiement, transactions sans preuve et écarts ventes / encaissements.
            </p>
            <p className="mt-2 text-xs text-[#8a7456]">
              {reconciliationView?.count ?? rows.length}
              {' '}
              élément(s) à rapprocher — aucune écriture automatique sans validation.
            </p>
          </div>
        </div>
      </section>

      {empty ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          Aucun écart de rapprochement détecté entre paiements, recettes finance et stock.
        </section>
      ) : (
        <>
          {rows.length ? (
            <AiReconciliationPanel
              rows={rows}
              transactions={transactions}
              salesOrders={salesOrders}
              stocks={stocks}
              onCreateFinanceTransaction={onCreateFinanceTransaction}
              onRefreshFinances={onRefreshFinances}
              onNavigate={onNavigate}
            />
          ) : null}

          {manualAnomalies.length ? (
            <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-black text-[#2f2415]">Éléments à rapprocher</h3>
              {manualAnomalies.map((anomaly) => (
                <div key={anomaly.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                  <p className="font-black text-[#2f2415]">{anomaly.title}</p>
                  <p className="text-xs text-[#8a7456] mt-1">{anomaly.description}</p>
                  <p className="text-xs text-[#8a7456] mt-1">
                    Source :
                    {' '}
                    {anomaly.source}
                    {' '}
                    · Action :
                    {' '}
                    {anomaly.recommendedAction}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab?.(anomaly.kind === 'missing_proof' ? 'Trésorerie' : 'Créances')}
                    className="mt-2 rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black"
                  >
                    Traiter
                  </button>
                </div>
              ))}
            </section>
          ) : null}

          {rows.length ? (
            <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-[#2f2415]">Actions de rapprochement</h3>
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
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
