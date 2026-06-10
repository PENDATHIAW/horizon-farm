import { Package, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../hooks/useWorkflowSubmit';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { dispatchBpLineCompleted, dispatchBpCostCompleted } from '../utils/bpLineConcretization';
import {
  ENTRY_KINDS,
  PAYMENT_STATUS,
  commitStockPurchaseWorkflow,
  computePurchaseAmounts,
  prepareStockPurchaseWorkflow,
  validateStockPurchasePayload,
} from '../utils/stockPurchaseWorkflow';

const today = () => new Date().toISOString().slice(0, 10);
const n = (v) => toNumber(v);

function mapDraftFields(draft = {}) {
  const f = draft.draft_fields || draft.fields || draft || {};
  return {
    stock_id: f.stock_id || f.product_id || f.id || '',
    produit: f.produit || f.product_name || f.libelle || '',
    quantite: f.quantite ?? f.quantity ?? f.quantite_recue ?? '',
    unite: f.unite || f.unit || 'kg',
    prix_unitaire: f.prix_unitaire ?? f.unit_price ?? f.prixUnit ?? '',
    fournisseur_id: f.fournisseur_id || f.supplier_id || '',
    statut_paiement: f.statut_paiement || f.payment_status || PAYMENT_STATUS.PAYE,
    montant_paye: f.montant_paye ?? f.paid_amount ?? '',
    moyen_paiement: f.moyen_paiement || f.mode_paiement || f.payment_method || 'Cash',
    date: String(f.date || today()).slice(0, 10),
    destination: f.destination || f.destination_type || 'stock_general',
    lot_id: f.lot_id || '',
    animal_id: f.animal_id || '',
    culture_id: f.culture_id || '',
    proof_url: f.proof_url || f.file_url || '',
    notes: f.notes || draft.raw_input || '',
    entry_kind: f.entry_kind || ENTRY_KINDS.ACHAT_STOCKABLE,
    finance_repair_transaction_id: f.finance_repair_transaction_id || '',
    bp_line_id: f.bp_line_id || '',
    bp_cost_id: f.bp_cost_id || '',
    business_plan_id: f.business_plan_id || '',
  };
}

export default function StockPurchaseReceptionForm({
  open = true,
  title = 'Réception achat stock',
  initialDraft = null,
  stocks = [],
  fournisseurs = [],
  transactions = [],
  documents = [],
  alertes = [],
  taches = [],
  animaux = [],
  lots = [],
  cultures = [],
  onClose,
  onCreateStock,
  onUpdateStock,
  onCreateFinanceTransaction,
  onCreateDocument,
  onCreateBusinessEvent,
  onUpdateSupplier,
  onUpdateFinanceTransaction,
  onUpdateAlert,
  onCreateStockMovement,
  onRefreshStockMovements,
  onRefresh,
  onRefreshFinances,
  onRefreshSuppliers,
  onRefreshBusinessEvents,
  stockMovements = [],
  accessibleFarms = [],
  farmScope = {},
}) {
  const mapped = useMemo(() => mapDraftFields(initialDraft || {}), [initialDraft]);
  const [stockId, setStockId] = useState(mapped.stock_id);
  const [produit, setProduit] = useState(mapped.produit);
  const [quantite, setQuantite] = useState(String(mapped.quantite || ''));
  const [unite, setUnite] = useState(mapped.unite);
  const [prixUnitaire, setPrixUnitaire] = useState(String(mapped.prix_unitaire || ''));
  const [fournisseurId, setFournisseurId] = useState(mapped.fournisseur_id);
  const [statutPaiement, setStatutPaiement] = useState(mapped.statut_paiement);
  const [montantPaye, setMontantPaye] = useState(String(mapped.montant_paye || ''));
  const [moyenPaiement, setMoyenPaiement] = useState(mapped.moyen_paiement);
  const [date, setDate] = useState(mapped.date);
  const [destination, setDestination] = useState(mapped.destination);
  const [lotId, setLotId] = useState(mapped.lot_id);
  const [animalId, setAnimalId] = useState(mapped.animal_id);
  const [cultureId, setCultureId] = useState(mapped.culture_id);
  const [proofUrl, setProofUrl] = useState(mapped.proof_url);
  const [notes, setNotes] = useState(mapped.notes);
  const [entryKind, setEntryKind] = useState(mapped.entry_kind);
  const { submit: workflowSubmit, busy: workflowBusy } = useWorkflowSubmit();
  const repairTxId = mapped.finance_repair_transaction_id;
  const bpLineId = mapped.bp_line_id;
  const bpCostId = mapped.bp_cost_id;

  useEffect(() => {
    const m = mapDraftFields(initialDraft || {});
    setStockId(m.stock_id);
    setProduit(m.produit);
    setQuantite(String(m.quantite || ''));
    setUnite(m.unite);
    setPrixUnitaire(String(m.prix_unitaire || ''));
    setFournisseurId(m.fournisseur_id);
    setStatutPaiement(m.statut_paiement);
    setMontantPaye(String(m.montant_paye || ''));
    setMoyenPaiement(m.moyen_paiement);
    setDate(m.date);
    setDestination(m.destination);
    setLotId(m.lot_id);
    setAnimalId(m.animal_id);
    setCultureId(m.culture_id);
    setProofUrl(m.proof_url);
    setNotes(m.notes);
    setEntryKind(m.entry_kind);
  }, [initialDraft]);

  const amounts = useMemo(() => computePurchaseAmounts({
    quantite,
    quantite_recue: quantite,
    prix_unitaire: prixUnitaire,
    statut_paiement: statutPaiement,
    montant_paye: montantPaye,
    entry_kind: entryKind,
  }), [quantite, prixUnitaire, statutPaiement, montantPaye, entryKind]);

  const selectedStock = stocks.find((row) => String(row.id) === String(stockId));

  const handleSubmit = async () => {
    const payload = {
      id: stockId || undefined,
      stock_id: stockId || undefined,
      produit: produit || selectedStock?.produit,
      quantite: n(quantite),
      quantite_recue: n(quantite),
      unite,
      prix_unitaire: n(prixUnitaire),
      fournisseur_id: fournisseurId,
      statut_paiement: statutPaiement,
      montant_paye: n(montantPaye),
      moyen_paiement: moyenPaiement,
      mode_paiement: moyenPaiement,
      date,
      destination,
      lot_id: lotId,
      animal_id: animalId,
      culture_id: cultureId,
      proof_url: proofUrl,
      file_url: proofUrl,
      notes,
      entry_kind: entryKind,
      finance_repair_transaction_id: repairTxId,
      bp_line_id: bpLineId,
      bp_cost_id: bpCostId,
      business_plan_id: mapped.business_plan_id,
      last_movement_label: notes || (entryKind === ENTRY_KINDS.ACHAT_STOCKABLE ? 'Réception achat stock' : 'Entrée stock'),
    };
    const validation = validateStockPurchasePayload(payload);
    if (!validation.ok) {
      toast.error(validation.errors.join(' · '));
      return;
    }
    await workflowSubmit(`stock-purchase:${stockId || "new"}:${date}:${n(quantite)}`, async () => {
      const context = {
        stocks,
        suppliers: fournisseurs,
        transactions,
        documents,
        stock_movements: stockMovements,
        events: [],
        workflows: [],
        accessibleFarms,
        farmScope,
        activeFarm: accessibleFarms?.find((f) => f.id === farmScope?.farmId) || null,
      };
      const preview = prepareStockPurchaseWorkflow(payload, context);
      if (!preview.records.is_create && !stockId && preview.records.stock_patch?.id) {
        payload.id = preview.records.stock_patch.id;
      }
      await commitStockPurchaseWorkflow(preview, {
        context: { stocks, transactions, tasks: taches, alertes, documents, stock_movements: stockMovements },
        existingDocuments: documents,
        existingAlerts: alertes,
        existingStockMovements: stockMovements,
        onCreateStockMovement,
        onRefreshStockMovements,
        accessibleFarms,
        onCreateStock: async (row) => {
          const id = row.id || generateSequentialId('stock', stocks);
          await onCreateStock?.({ ...row, id });
        },
        onUpdateStock: (id, patch) => onUpdateStock?.(id, patch),
        onCreateOrUpdateStock: async (patch) => {
          const exists = stocks.some((row) => String(row.id) === String(patch.id));
          if (exists) await onUpdateStock?.(patch.id, patch);
          else await onCreateStock?.(patch);
        },
        onCreateFinanceTransaction,
        onCreateDocument,
        onCreateBusinessEvent,
        onUpdateSupplier,
        onUpdateFinanceTransaction,
        onUpdateAlert,
      });
      await Promise.allSettled([
        onRefresh?.(),
        onRefreshFinances?.(),
        onRefreshSuppliers?.(),
        onRefreshBusinessEvents?.(),
      ]);
      toast.success(repairTxId ? 'Entrée stock créée depuis la dépense finance' : 'Réception achat enregistrée');
      if (bpCostId) {
        const stockRef = preview.records.stock_patch?.id || stockId || payload.id;
        dispatchBpCostCompleted({
          bp_cost_id: bpCostId,
          finance_transaction_id: preview.records.finance_transaction?.id || '',
          assetModule: 'stock',
          assetId: stockRef,
          amount: n(montantPaye) || n(quantite) * n(prixUnitaire),
          date,
          targetModule: 'achats_stock',
          source: 'stock_purchase',
        });
      } else if (bpLineId) {
        const stockRef = preview.records.stock_patch?.id || stockId || payload.id;
        dispatchBpLineCompleted({
          bp_line_id: bpLineId,
          assetModule: 'stock',
          assetId: stockRef,
          amount: n(montantPaye) || n(quantite) * n(prixUnitaire),
          date,
          source: 'stock_purchase',
        });
      }
      onClose?.();
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-3">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-[#eadcc2] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#eadcc2] p-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-emerald-700">
              <Package size={14} /> Achats & Stock · source de vérité
            </p>
            <h2 className="mt-1 text-xl font-black text-[#2f2415]">{title}</h2>
            {repairTxId ? (
              <p className="mt-1 text-sm text-amber-800">Réparation historique depuis finance {repairTxId}</p>
            ) : (
              <p className="mt-1 text-sm text-[#8a7456]">Stock, mouvement, finance et fournisseur en une saisie.</p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full border border-[#eadcc2] p-2">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold text-[#8a7456]">Type d&apos;entrée</span>
              <select
                value={entryKind}
                onChange={(e) => setEntryKind(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              >
                <option value={ENTRY_KINDS.ACHAT_STOCKABLE}>Achat stockable (fournisseur)</option>
                <option value={ENTRY_KINDS.STOCK_INITIAL}>Stock initial / inventaire</option>
                <option value={ENTRY_KINDS.DON}>Don</option>
                <option value={ENTRY_KINDS.CORRECTION}>Correction / ajustement</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Produit existant</span>
              <select
                value={stockId}
                onChange={(e) => {
                  setStockId(e.target.value);
                  const row = stocks.find((s) => String(s.id) === e.target.value);
                  if (row) {
                    setProduit(row.produit || row.name || '');
                    setUnite(row.unite || row.unit || unite);
                    if (!prixUnitaire) setPrixUnitaire(String(row.prixUnit ?? row.prix_unitaire ?? ''));
                    if (!fournisseurId) setFournisseurId(row.fournisseur_id || '');
                  }
                }}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              >
                <option value="">— Nouveau produit —</option>
                {stocks.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.produit || row.name} · {fmtNumber(row.quantite)} {row.unite}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Produit *</span>
              <input
                value={produit}
                onChange={(e) => setProduit(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Quantité *</span>
              <input
                type="number"
                value={quantite}
                onChange={(e) => setQuantite(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Unité</span>
              <input
                value={unite}
                onChange={(e) => setUnite(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              />
            </label>
            {entryKind === ENTRY_KINDS.ACHAT_STOCKABLE ? (
              <>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-[#8a7456]">Prix unitaire</span>
                  <input
                    type="number"
                    value={prixUnitaire}
                    onChange={(e) => setPrixUnitaire(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-[#8a7456]">Fournisseur</span>
                  <select
                    value={fournisseurId}
                    onChange={(e) => setFournisseurId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
                  >
                    <option value="">—</option>
                    {fournisseurs.map((f) => (
                      <option key={f.id} value={f.id}>{f.nom || f.name || f.id}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-bold text-[#8a7456]">Statut paiement</span>
                  <select
                    value={statutPaiement}
                    onChange={(e) => setStatutPaiement(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
                  >
                    <option value={PAYMENT_STATUS.PAYE}>Payé</option>
                    <option value={PAYMENT_STATUS.PARTIEL}>Partiel</option>
                    <option value={PAYMENT_STATUS.A_PAYER}>À payer</option>
                  </select>
                </label>
                {statutPaiement === PAYMENT_STATUS.PARTIEL ? (
                  <label className="space-y-1">
                    <span className="text-xs font-bold text-[#8a7456]">Montant payé</span>
                    <input
                      type="number"
                      value={montantPaye}
                      onChange={(e) => setMontantPaye(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
                    />
                  </label>
                ) : null}
                <label className="space-y-1">
                  <span className="text-xs font-bold text-[#8a7456]">Mode paiement</span>
                  <input
                    value={moyenPaiement}
                    onChange={(e) => setMoyenPaiement(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : null}
            <label className="space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-bold text-[#8a7456]">Destination</span>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              >
                <option value="stock_general">Stock général</option>
                <option value="lot">Lot avicole</option>
                <option value="animal">Animal</option>
                <option value="culture">Culture</option>
              </select>
            </label>
            {destination === 'lot' ? (
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#8a7456]">Lot</span>
                <select value={lotId} onChange={(e) => setLotId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm">
                  <option value="">—</option>
                  {lots.map((row) => <option key={row.id} value={row.id}>{row.nom || row.name || row.id}</option>)}
                </select>
              </label>
            ) : null}
            {destination === 'animal' ? (
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#8a7456]">Animal</span>
                <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm">
                  <option value="">—</option>
                  {animaux.map((row) => <option key={row.id} value={row.id}>{row.name || row.tag || row.id}</option>)}
                </select>
              </label>
            ) : null}
            {destination === 'culture' ? (
              <label className="space-y-1">
                <span className="text-xs font-bold text-[#8a7456]">Culture</span>
                <select value={cultureId} onChange={(e) => setCultureId(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm">
                  <option value="">—</option>
                  {cultures.map((row) => <option key={row.id} value={row.id}>{row.culture || row.nom || row.id}</option>)}
                </select>
              </label>
            ) : null}
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold text-[#8a7456]">Facture / reçu (URL)</span>
              <input
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-bold text-[#8a7456]">Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <p>
              Total : <b>{fmtCurrency(amounts.total)}</b>
              {entryKind === ENTRY_KINDS.ACHAT_STOCKABLE ? (
                <> · Payé : <b>{fmtCurrency(amounts.paidAmount)}</b> · Reste : <b>{fmtCurrency(amounts.remaining)}</b></>
              ) : (
                <> · Pas d&apos;écriture finance automatique</>
              )}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#eadcc2] p-5">
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-[#eadcc2] px-4 py-2 text-sm font-bold text-[#8a7456]">
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={workflowBusy}
            className="min-h-[44px] rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60"
          >
            {workflowBusy ? 'Enregistrement…' : 'Valider réception'}
          </button>
        </div>
      </div>
    </div>
  );
}
