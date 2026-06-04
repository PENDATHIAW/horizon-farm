import { CheckCircle2, Sparkles, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../../components/Btn';
import { emitHorizonForm } from '../../services/formModalManager';
import {
  proposeReconciliationDraftsFromRows,
  TARGET_WORKFLOWS,
  validateAiDraftByUser,
} from '../../services/aiGateway';
import { commitFinanceReconciliationRepair } from '../../utils/financeReconciliation';
import { buildStockReceptionFromFinanceTransaction } from '../../utils/stockPurchaseWorkflow';

const WORKFLOW_LABELS = {
  [TARGET_WORKFLOWS.FINANCE_RECONCILIATION]: 'Créer l’écriture finance (workflow)',
  [TARGET_WORKFLOWS.SALE_PAYMENT]: 'Enregistrer le paiement (workflow)',
  [TARGET_WORKFLOWS.OPEN_FORM]: 'Ouvrir le module cible',
};

function draftSummary(draft) {
  const inner = draft?.draft || {};
  if (draft?.target_workflow === TARGET_WORKFLOWS.OPEN_FORM) {
    if (inner.recon_row_kind === 'stockable_without_stock') {
      return `Dépense stockable · ${inner.transaction?.libelle || inner.transaction?.id || '—'}`;
    }
    return `Recette sans paiement · commande ${inner.orderId || '—'}`;
  }
  const payment = inner.payment || {};
  const amount = payment.montant_paye ?? payment.montant ?? payment.amount ?? '—';
  return `Paiement ${amount} FCFA · ${payment.date_paiement || payment.date || '—'}`;
}

function executeOpenFormDraft(draft, { stocks = [], onNavigate } = {}) {
  const inner = draft?.draft || {};
  if (inner.recon_row_kind === 'finance_without_payment') {
    onNavigate?.('commercial', { tab: 'Ventes', orderId: inner.orderId });
    toast('Ouvrez la vente pour enregistrer ou lier le paiement.', { icon: 'ℹ️' });
    return { ok: true };
  }
  if (inner.recon_row_kind === 'stockable_without_stock') {
    emitHorizonForm(
      'stock',
      'stock_purchase',
      'Réception achat (depuis rapprochement IA)',
      buildStockReceptionFromFinanceTransaction(inner.transaction, stocks),
    );
    onNavigate?.('achats_stock', { tab: 'Stock' });
    return { ok: true };
  }
  return { ok: false, error: 'Action de redirection inconnue.' };
}

export default function AiReconciliationPanel({
  rows = [],
  transactions = [],
  salesOrders = [],
  stocks = [],
  onCreateFinanceTransaction,
  onRefreshFinances,
  onNavigate,
}) {
  const [validatedIds, setValidatedIds] = useState(() => new Set());
  const [executingId, setExecutingId] = useState(null);

  const drafts = useMemo(
    () =>
      proposeReconciliationDraftsFromRows({
        rows,
        transactions,
        salesOrders,
      }),
    [rows, transactions, salesOrders],
  );

  const handleValidate = (draftId) => {
    setValidatedIds((prev) => new Set(prev).add(draftId));
    toast.success('Proposition validée — vous pouvez exécuter le workflow.');
  };

  const handleExecute = async (draft) => {
    if (!validatedIds.has(draft.id)) {
      toast.error('Validez d’abord la proposition avant exécution.');
      return;
    }

    const validated = validateAiDraftByUser(draft, { userLabel: 'Utilisateur ERP' });
    if (!validated) {
      toast.error('Brouillon IA invalide.');
      return;
    }

    setExecutingId(draft.id);
    try {
      if (validated.target_workflow === TARGET_WORKFLOWS.OPEN_FORM) {
        const result = executeOpenFormDraft(validated, { stocks, onNavigate });
        if (result.ok) {
          toast.success('Redirection effectuée — complétez la saisie manuellement.');
          setValidatedIds((prev) => {
            const next = new Set(prev);
            next.delete(draft.id);
            return next;
          });
          return;
        }
        toast.error(result.error || 'Redirection impossible.');
        return;
      }

      if (validated.target_workflow === TARGET_WORKFLOWS.FINANCE_RECONCILIATION) {
        const inner = validated.draft || {};
        const result = await commitFinanceReconciliationRepair({
          payment: inner.payment,
          order: inner.order || inner.sale,
          sale: inner.sale,
          transactions: inner.context?.transactions || transactions,
          handlers: { onCreateFinanceTransaction },
        });
        if (result?.ok) {
          await onRefreshFinances?.();
          toast.success('Ligne finance créée via le workflow rapprochement.');
          setValidatedIds((prev) => {
            const next = new Set(prev);
            next.delete(draft.id);
            return next;
          });
          return;
        }
        if (result?.reason === 'duplicate') {
          toast.error('Doublon détecté — actualisez la liste.');
          return;
        }
        toast.error('Échec du workflow rapprochement.');
        return;
      }

      toast.error('Workflow non pris en charge dans ce panneau.');
    } catch (err) {
      toast.error(err?.message || 'Erreur lors de l’exécution.');
    } finally {
      setExecutingId(null);
    }
  };

  if (drafts.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-violet-200 bg-violet-50/50 p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles className="text-violet-700 shrink-0" size={22} />
        <div>
          <h3 className="text-lg font-black text-[#2f2415]">Propositions IA — rapprochement</h3>
          <p className="text-sm text-[#8a7456]">
            L’IA propose uniquement. Vous validez, puis l’ERP exécute via les workflows existants — aucune écriture directe.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {drafts.map((draft) => {
          const isValidated = validatedIds.has(draft.id);
          const isExecuting = executingId === draft.id;
          return (
            <div
              key={draft.id}
              className="rounded-2xl border border-violet-100 bg-white p-4 space-y-3"
            >
              <div>
                <p className="font-black text-[#2f2415] flex items-center gap-2 flex-wrap">
                  <Wallet size={16} className="text-violet-700" />
                  {draftSummary(draft)}
                  {isValidated ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                      <CheckCircle2 size={12} />
                      Validé
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-violet-800 mt-1 font-semibold">
                  {WORKFLOW_LABELS[draft.target_workflow] || draft.target_workflow}
                </p>
                <p className="text-xs text-[#8a7456] mt-1">{draft.warnings?.join(' · ') || ''}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {!isValidated ? (
                  <Btn small variant="outline" onClick={() => handleValidate(draft.id)}>
                    Valider la proposition
                  </Btn>
                ) : (
                  <Btn
                    small
                    disabled={isExecuting}
                    onClick={() => handleExecute(draft)}
                  >
                    {isExecuting
                      ? '…'
                      : draft.target_workflow === TARGET_WORKFLOWS.OPEN_FORM
                        ? 'Ouvrir le module'
                        : 'Exécuter le workflow'}
                  </Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
