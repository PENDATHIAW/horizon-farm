import { AlertTriangle, CheckCircle, Download, Edit, Eye, Package, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import useCrudModule from '../hooks/useCrudModule';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId, makeId } from '../utils/ids';
import { runStockLossSideEffects } from '../utils/purchaseSideEffects';
import {
  commitFeedingWorkflow,
  prepareFeedingWorkflow,
} from '../services/workflowService.js';
import {
  commitStockPurchaseWorkflow,
  PAYMENT_STATUS,
  prepareStockPurchaseWorkflow,
} from '../utils/stockPurchaseWorkflow.js';
import { computeWeightedAverageCost, summarizeStockValuation } from '../utils/stockValuation.js';
import { applyStockMovement, buildStockCriticalFollowUp, hasOpenStockReorderTask } from '../utils/stockWorkflows';
import { alimentationFields, deriveAlimentationValues, normalizeAlimentationPayload } from '../utils/stockForms.js';
import StockFlowPanel from './StockFlowPanel.jsx';
import StockReorderTasksBridge from './StockReorderTasksBridge.jsx';
import StockStatusPanel from './StockStatusPanel.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const fallbackUnitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire);
const stockValuation = (row = {}, movements = [], transactions = []) => computeWeightedAverageCost(row, movements, transactions);
const displayUnitPrice = (row = {}, movements = [], transactions = []) => {
  const v = stockValuation(row, movements, transactions);
  if (v.calculable && v.avgCost != null) return v.avgCost;
  if (v.lastPrice != null && v.lastPrice > 0) return v.lastPrice;
  return fallbackUnitPrice(row);
};
const displayValue = (row = {}, movements = [], transactions = []) => {
  const v = stockValuation(row, movements, transactions);
  if (v.stockValue > 0) return v.stockValue;
  return toNumber(row.quantite) * displayUnitPrice(row, movements, transactions);
};
const categoryOf = (row = {}) => String(row.categorie || row.category || '').toLowerCase();
const isFood = (row = {}) => categoryOf(row).includes('aliment');
const statusOf = (row = {}) => row.statut || row.stock_status || (toNumber(row.quantite) <= 0 ? 'epuise' : 'ok');
const productName = (row = {}) => row.produit || row.name || row.nom || row.id || 'Produit';
const stockMetrics = (row = {}, movements = [], transactions = []) => {
  const quantity = toNumber(row.quantite);
  const threshold = toNumber(row.seuil);
  const maxQty = toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
  const critical = threshold > 0 ? quantity <= threshold : false;
  const suggestedOrderQty = maxQty > 0 ? Math.max(0, maxQty - quantity) : Math.max(0, threshold - quantity);
  const coverageRatio = threshold > 0 ? quantity / threshold : 0;
  return {
    quantity,
    threshold,
    critical,
    suggestedOrderQty,
    coverageRatio,
    value: displayValue(row, movements, transactions),
    unitPrice: displayUnitPrice(row, movements, transactions),
  };
};

import { STOCK_CATEGORY_OPTIONS } from '../utils/stockCategoryOptions.js';

const STOCK_CATEGORIES = STOCK_CATEGORY_OPTIONS;
const STATUS_OPTIONS = [
  { value: 'ok', label: 'OK / disponible' }, { value: 'en_attente_fournisseur', label: 'En attente fournisseur' }, { value: 'en_attente_livraison', label: 'En attente livraison' }, { value: 'recu_a_controler', label: 'Reçu à contrôler' }, { value: 'non_conforme', label: 'Non conforme' }, { value: 'a_retourner', label: 'À retourner' }, { value: 'retourne', label: 'Retourné fournisseur' }, { value: 'bloque', label: 'Bloqué / quarantaine' }, { value: 'perime', label: 'Périmé' }, { value: 'reserve', label: 'Réservé' }, { value: 'epuise', label: 'Épuisé' },
];
function stockFields(fournisseurs = []) {
  return [
    { key: 'section_identification', label: 'Identification stock', type: 'section' },
    { key: 'id', label: 'Référence', type: 'text', required: true },
    { key: 'produit', label: 'Produit', type: 'text', required: true },
    { key: 'categorie', label: 'Catégorie', type: 'select', required: true, options: STOCK_CATEGORIES },
    { key: 'activite_liee', label: 'Activité concernée', type: 'select', options: [{ value: 'animaux', label: 'Animaux / bétail' }, { value: 'avicole', label: 'Avicole' }, { value: 'cultures', label: 'Cultures / champ' }, { value: 'sante', label: 'Santé / vaccins' }, { value: 'stock', label: 'Stock général' }, { value: 'vente', label: 'Vente / produits finis' }, { value: 'autre', label: 'Autre' }] },
    { key: 'section_quantite', label: 'Quantité & valeur', type: 'section' },
    { key: 'quantite', label: 'Quantité disponible', type: 'number', required: true },
    { key: 'unite', label: 'Unité', type: 'select', options: ['kg', 'sac', 'dose', 'litre', 'bidon', 'boite', 'unité', 'lot', 'm', 'm²', 'ha'] },
    { key: 'seuil', label: 'Seuil minimum', type: 'number' },
    { key: 'stock_max', label: 'Stock cible / maximum', type: 'number' },
    { key: 'section_suivi', label: 'Fournisseur & statut', type: 'section' },
    { key: 'statut', label: 'Statut stock', type: 'select', options: STATUS_OPTIONS },
    { key: 'fournisseur_id', label: 'Fournisseur', type: 'select', options: fournisseurs.map((f) => ({ value: f.id, label: f.nom || f.name || f.id })), emptyLabel: 'Aucun fournisseur disponible' },
    { key: 'date_reception_prevue', label: 'Réception prévue', type: 'date' },
    { key: 'date_derniere_reception', label: 'Dernière réception', type: 'date' },
    { key: 'emplacement', label: 'Emplacement', type: 'text' },
    { key: 'last_movement_label', label: 'Motif dernier mouvement', type: 'text' },
    { key: 'source_record_id', label: 'Source liée', type: 'text' },
    { key: 'preuve_url', label: 'Preuve / facture', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
  ];
}
function MovementModal({ row, type, defaultQty = 1, unitPriceEstimate = 0, saving, onClose, onConfirm }) {
  const [qty, setQty] = useState(String(Math.max(1, Math.round(defaultQty || 1))));
  const [motif, setMotif] = useState(type === 'entree' ? 'Réception fournisseur' : type === 'perte' ? 'Perte constatée' : isFood(row) ? 'Alimentation animaux/lots' : 'Sortie stock');
  const [withFinance, setWithFinance] = useState(type === 'entree');
  const [error, setError] = useState('');
  const quantity = toNumber(qty);
  const current = toNumber(row?.quantite);
  const next = type === 'entree' ? current + quantity : Math.max(0, current - quantity);
  const amount = quantity * toNumber(unitPriceEstimate);
  const title = type === 'entree' ? 'Réceptionner du stock' : type === 'perte' ? 'Déclarer une perte' : isFood(row) ? 'Utiliser aliment' : 'Utiliser / sortir du stock';
  const impacts = [
    type === 'entree' ? `Stock augmenté : ${fmtNumber(current)} → ${fmtNumber(next)} ${row?.unite || ''}` : `Stock diminué : ${fmtNumber(current)} → ${fmtNumber(next)} ${row?.unite || ''}`,
    type === 'entree' ? 'Réception stock historisée.' : type === 'perte' ? 'Perte tracée en événement métier.' : isFood(row) ? 'Alimentation liée et coût affecté si applicable.' : 'Sortie stock tracée en événement métier.',
    type !== 'entree' && next <= toNumber(row?.seuil) ? 'Alerte stock critique créée si le seuil est atteint.' : 'Seuil stock vérifié automatiquement.',
    type === 'entree' && withFinance && amount > 0 ? 'Dépense et preuve/facture seront préparées avec cette entrée.' : 'Aucune dépense séparée ne sera créée.',
  ];
  const confirm = () => {
    if (quantity <= 0) return setError('Quantité invalide.');
    if (type !== 'entree' && quantity > current) return setError(`Stock insuffisant : ${fmtNumber(current)} ${row?.unite || ''} disponible(s).`);
    onConfirm?.({ qty: quantity, motif, withFinance, amount });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="w-full max-w-xl rounded-3xl border border-[#eadcc2] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#eadcc2] p-5"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Mouvement stock</p><h2 className="text-xl font-black text-[#2f2415]">{title}</h2><p className="mt-1 text-sm text-[#8a7456]">{productName(row)} · Disponible {fmtNumber(current)} {row?.unite || ''}</p></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><div className="p-5 space-y-4">{error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}<div className="grid grid-cols-1 md:grid-cols-2 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-[#8a7456]">Quantité</span><input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-[#8a7456]">Motif</span><input value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" /></label></div>{type === 'entree' ? <label className="flex items-center gap-2 rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#2f2415]"><input type="checkbox" checked={withFinance} onChange={(e) => setWithFinance(e.target.checked)} /> Préparer aussi la dépense et la preuve/facture si le prix est renseigné</label> : null}<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs uppercase tracking-widest font-black text-emerald-700">Résumé avant validation</p><p className="mt-1 text-lg font-black text-emerald-800">Nouvelle quantité : {fmtNumber(next)} {row?.unite || ''}</p><p className="text-sm text-emerald-800">Valeur estimée du mouvement : {fmtCurrency(amount)}</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{impacts.map((impact) => <div key={impact} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]"><CheckCircle size={14} className="inline text-emerald-600" /> {impact}</div>)}</div><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-[#eadcc2] px-4 py-2 text-sm font-bold text-[#8a7456]">Annuler</button><button type="button" onClick={confirm} disabled={saving} className="min-h-[44px] rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Validation...' : 'Valider le mouvement'}</button></div></div></div></div>;
}

export default function StocksV3({ rows = [], alimentationLogs = [], animaux = [], lots = [], fournisseurs = [], taches = [], loading, onCreate, onUpdate, onDelete, onRefresh, onCreateAlimentation, onUpdateAlimentation, onDeleteAlimentation, onRefreshAlimentation, onCreateFinanceTransaction, onRefreshFinances, onCreateTask, onUpdateTask, onRefreshTasks, onCreateAlert, onRefreshAlertes, ...rest }) {
  const [selected, setSelected] = useState(null);
  const [selectedAlim] = useState(null);
  const [modal, setModal] = useState(null);
  const [movement, setMovement] = useState(null);
  const [saving, setSaving] = useState(false);
  const documentsCrud = useCrudModule('documents');
  const alertesCrud = useCrudModule('alertes_center');
  const businessEventsCrud = useCrudModule('business_events');
  const stockMovements = useMemo(() => rest.stockMovements || [], [rest.stockMovements]);
  const transactions = useMemo(() => rest.transactions || [], [rest.transactions]);
  const valeurTotale = useMemo(
    () => summarizeStockValuation(rows, stockMovements, transactions).totalValue,
    [rows, stockMovements, transactions],
  );
  const critiques = useMemo(() => rows.filter((product) => stockMetrics(product, stockMovements, transactions).critical), [rows, stockMovements, transactions]);
  const stockFormFields = useMemo(() => stockFields(fournisseurs), [fournisseurs]);
  const alimFormFields = useMemo(() => alimentationFields({ stocks: rows, animaux, lots, fournisseurs, isFood }), [rows, animaux, lots, fournisseurs]);
  const deriveAlimValues = useMemo(() => deriveAlimentationValues({ stocks: rows, fournisseurs, animaux, lots, isFood }), [rows, fournisseurs, animaux, lots]);
  const stripManualPrice = (payload = {}) => {
    const next = { ...payload };
    delete next.prixUnit;
    delete next.prixunit;
    delete next.prix_unitaire;
    delete next.unit_price;
    return next;
  };
  const normalizeStock = (payload) => ({
    ...payload,
    stock_status: payload.statut || payload.stock_status || (toNumber(payload.quantite) <= 0 ? 'epuise' : 'ok'),
    statut: payload.statut || payload.stock_status || (toNumber(payload.quantite) <= 0 ? 'epuise' : 'ok'),
    source_module: payload.source_module || 'stock',
  });
  const createStockFollowUpIfNeeded = async (row, nextQty) => {
    const followUp = buildStockCriticalFollowUp({ ...row, quantite: nextQty }, nextQty);
    if (!followUp || hasOpenStockReorderTask(row, taches)) return;
    await onCreateTask?.(followUp.task);
    await (onCreateAlert || alertesCrud.create)?.({ ...followUp.alert, linked_task_id: followUp.task.id });
    await (rest.onCreateBusinessEvent || businessEventsCrud.create)?.({ ...followUp.event, linked_task_id: followUp.task.id });
    await Promise.allSettled([onRefreshTasks?.(), onRefreshAlertes?.(), businessEventsCrud.refresh?.()]);
  };
  const submitCreate = async (payload) => { try { setSaving(true); const normalized = normalizeStock(stripManualPrice(payload)); await onCreate?.(normalized); await createStockFollowUpIfNeeded(normalized, toNumber(normalized.quantite)); toast.success('Stock créé — utilisez Réception pour le prix d\'achat'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur création stock'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); const normalized = normalizeStock(stripManualPrice(payload)); await onUpdate?.(selected.id, normalized); await createStockFollowUpIfNeeded({ ...selected, ...normalized }, toNumber(normalized.quantite)); toast.success('Stock modifié'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur modification stock'); } finally { setSaving(false); } };
  const submitDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete?.(selected.id); toast.success('Stock supprimé'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur suppression stock'); } finally { setSaving(false); } };
  const moveStock = async (row, type, qty, motif = '') => {
    const current = toNumber(row.quantite);
    if (type !== 'entree' && qty > current) throw new Error(`Stock insuffisant : ${fmtNumber(current)} ${row.unite || ''} disponible(s)`);
    const { stock } = applyStockMovement(row, { type, qty, motif });
    const next = stock.quantite;
    await onUpdate?.(row.id, { quantite: next, statut: stock.statut, stock_status: stock.stock_status, last_movement_type: type, last_movement_label: motif, last_movement_qty: qty, last_movement_at: new Date().toISOString() });
    await createStockFollowUpIfNeeded(row, next);
    return next;
  };
  const openMovement = (row, type) => {
    if (type === 'entree' && rest.onOpenPurchaseReception) {
      rest.onOpenPurchaseReception({
        form_type: 'stock_purchase',
        intent_label: 'Réception achat stock',
        draft_fields: {
          date: today(),
          stock_id: row.id,
          produit: row.produit,
          quantite: stockMetrics(row, stockMovements, transactions).suggestedOrderQty || 1,
          unite: row.unite || 'kg',
          prix_unitaire: displayUnitPrice(row, stockMovements, transactions) || fallbackUnitPrice(row),
          fournisseur_id: row.fournisseur_id || '',
        },
      });
      return;
    }
    setMovement({
      row,
      type,
      defaultQty: type === 'entree' ? (stockMetrics(row, stockMovements, transactions).suggestedOrderQty || 1) : 1,
      unitPriceEstimate: displayUnitPrice(row, stockMovements, transactions),
    });
  };
  const confirmMovement = async ({ qty, motif, withFinance }) => {
    const row = movement?.row;
    const type = movement?.type;
    if (!row) return;
    try {
      setSaving(true);
      if (type === 'entree') {
        const unitCost = displayUnitPrice(row, stockMovements, transactions) || fallbackUnitPrice(row);
        const amount = qty * unitCost;
        if (withFinance && amount > 0) {
          const preview = prepareStockPurchaseWorkflow({
            id: row.id,
            stock_id: row.id,
            produit: row.produit,
            quantite: qty,
            quantite_recue: qty,
            prix_unitaire: unitCost,
            fournisseur_id: row.fournisseur_id || '',
            statut_paiement: PAYMENT_STATUS.PAYE,
            date: today(),
            notes: motif || 'Réception achat stock',
          }, {
            stocks: rows,
            suppliers: fournisseurs,
            transactions,
            stock_movements: stockMovements,
            documents: documentsCrud.rows,
            workflows: [],
          });
          await commitStockPurchaseWorkflow(preview, {
            context: {
              stocks: rows,
              transactions,
              tasks: taches,
              alertes: alertesCrud.rows || [],
              documents: documentsCrud.rows || [],
              stock_movements: stockMovements,
            },
            existingDocuments: documentsCrud.rows || [],
            existingAlerts: alertesCrud.rows || [],
            existingStockMovements: stockMovements,
            onUpdateStock: (id, patch) => onUpdate?.(id, normalizeStock({ ...patch, last_movement_label: motif })),
            onCreateFinanceTransaction,
            onCreateDocument: documentsCrud.create,
            onCreateBusinessEvent: rest.onCreateBusinessEvent || businessEventsCrud.create,
            onCreateTask,
            onCreateAlert: onCreateAlert || alertesCrud.create,
            onCreateStockMovement: rest.onCreateStockMovement,
            onRefreshStockMovements: rest.onRefreshStockMovements,
            onCreateTrace: rest.onCreateTrace,
            onUpdateTrace: rest.onUpdateTrace,
            existingTraces: rest.existingTraces || [],
          });
        } else {
          await moveStock(row, 'entree', qty, motif);
          await (rest.onCreateBusinessEvent || businessEventsCrud.create)?.({ id: makeId('EVT'), event_type: 'reception_stock', module_source: 'stock', entity_type: 'stock', entity_id: row.id, title: `Réception stock ${productName(row)}`, description: `${qty} ${row.unite || ''} · ${motif}`, event_date: today(), severity: 'info' });
        }
        await Promise.allSettled([onRefresh?.(), onRefreshFinances?.(), documentsCrud.refresh?.(), businessEventsCrud.refresh?.(), rest.onRefreshStockMovements?.()]);
        toast.success('Réception stock enregistrée');
      } else if (type === 'sortie') {
        if (isFood(row)) {
          toast.success('Distribution aliment : ouvrir Élevage › Alimentation');
          rest.onNavigate?.('elevage', { tab: 'Alimentation' });
          setMovement(null);
          return;
        } else {
          await moveStock(row, 'sortie', qty, motif);
          await (rest.onCreateBusinessEvent || businessEventsCrud.create)?.({ id: makeId('EVT'), event_type: 'sortie_stock', module_source: 'stock', entity_type: 'stock', entity_id: row.id, title: `Sortie stock ${row.produit}`, description: `${qty} ${row.unite || ''} · ${motif}`, event_date: today(), severity: 'info' });
          await businessEventsCrud.refresh?.();
          toast.success('Sortie stock enregistrée');
        }
      } else if (type === 'perte') {
        await moveStock(row, 'perte', qty, motif);
        const lossFinance = await runStockLossSideEffects({
          stock: row,
          qty,
          date: today(),
          movementRef: `${today()}-${qty}`,
          transactions: rest.transactions || [],
          handlers: {
            onCreateFinanceTransaction,
            onCreateTrace: rest.onCreateTrace,
            onUpdateTrace: rest.onUpdateTrace,
            existingTraces: rest.existingTraces || [],
          },
        });
        await (rest.onCreateBusinessEvent || businessEventsCrud.create)?.({ id: makeId('EVT'), event_type: 'perte_stock', module_source: 'stock', entity_type: 'stock', entity_id: row.id, title: `Perte stock ${row.produit}`, description: `${qty} ${row.unite || ''} · ${motif}`, event_date: today(), severity: 'warning', amount: lossFinance?.montant || qty * displayUnitPrice(row, stockMovements, transactions), linked_finance_transaction_id: lossFinance?.id || '', side_effects_managed: true });
        await Promise.allSettled([businessEventsCrud.refresh?.(), onRefreshFinances?.()]);
        toast.success('Perte stock enregistrée et tracée');
      }
      setMovement(null);
    } catch (error) {
      toast.error(error.message || 'Mouvement impossible');
    } finally {
      setSaving(false);
    }
  };
  const submitCreateAlimentation = async (rawPayload) => { try { setSaving(true); const payload = normalizeAlimentationPayload(rawPayload, { stocks: rows, fournisseurs }); const stock = rows.find((r) => r.id === payload.stock_id); const qty = toNumber(payload.quantite); if (stock && qty > toNumber(stock.quantite)) throw new Error(`Stock insuffisant : ${fmtNumber(stock.quantite)} ${stock.unite || ''} disponible(s)`); const normalized = { ...payload, montant_total: toNumber(payload.montant_total) || (stock ? qty * displayUnitPrice(stock, stockMovements, transactions) : 0), unite: payload.unite || stock?.unite || 'kg', duree_jours: payload.duree_jours || 1, source_module: 'stock', source_record_id: payload.stock_id || '' }; if (stock && qty > 0) { const preview = prepareFeedingWorkflow(normalized, { events: businessEventsCrud.rows }); await commitFeedingWorkflow(preview, { onCreateAlimentation, onUpdateStockMovement: () => moveStock(stock, 'sortie', qty, 'Utilisation alimentation'), onCreateBusinessEvent: rest.onCreateBusinessEvent || businessEventsCrud.create }); await businessEventsCrud.refresh?.(); } else { await onCreateAlimentation?.(normalized); } await onRefreshAlimentation?.(); await onRefresh?.(); toast.success('Utilisation alimentation enregistrée et liée'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur alimentation'); } finally { setSaving(false); } };

  const columns = [
    { key: 'produit', label: 'Produit', sortable: true, render: (p) => <span className="text-[#2f2415] font-semibold">{p.produit}</span> }, { key: 'categorie', label: 'Catégorie', sortable: true, render: (p) => STOCK_CATEGORIES.find((c) => c.value === p.categorie)?.label || p.categorie || '—' }, { key: 'activite_liee', label: 'Activité liée', sortable: true, render: (p) => p.activite_liee || '—' }, { key: 'quantite', label: 'Quantité', sortable: true, render: (p) => <span className={stockMetrics(p, stockMovements, transactions).critical ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>{fmtNumber(stockMetrics(p, stockMovements, transactions).quantity)}</span> }, { key: 'unite', label: 'Unité', sortable: true }, { key: 'seuil', label: 'Seuil min.', sortable: true, render: (p) => fmtNumber(p.seuil) }, { key: 'prixUnit', label: 'CMUP / dernier achat', sortable: true, render: (p) => fmtCurrency(displayUnitPrice(p, stockMovements, transactions)) }, { key: 'valeur', label: 'Valeur (CMUP)', sortable: true, render: (p) => <span className="text-[#2f2415] font-semibold">{fmtCurrency(displayValue(p, stockMovements, transactions))}</span> }, { key: 'statut', label: 'Statut', sortable: true, render: (p) => <Badge status={statusOf(p)} /> }, { key: 'suggestion', label: 'À commander', render: (p) => stockMetrics(p, stockMovements, transactions).suggestedOrderQty > 0 ? <span className="text-amber-600 font-semibold">{fmtNumber(stockMetrics(p, stockMovements, transactions).suggestedOrderQty)} {p.unite || ''}</span> : <span className="text-emerald-600">OK</span> }, { key: 'actions', label: 'Actions', render: (p) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(p); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(p); setModal('edit'); }} /><ActionIconButton icon={Plus} title="Réceptionner" color="emerald" onClick={() => openMovement(p, 'entree')} /><ActionIconButton icon={Package} title="Utiliser" color="amber" onClick={() => openMovement(p, 'sortie')} /><ActionIconButton icon={AlertTriangle} title="Perte" color="red" onClick={() => openMovement(p, 'perte')} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(p); setModal('delete'); }} /></div> },
  ];
  const alimColumns = [
    { key: 'date', label: 'Date', sortable: true }, { key: 'produit', label: 'Produit', render: (r) => r.produit || rows.find((s) => s.id === r.stock_id)?.produit || '—' }, { key: 'stock_id', label: 'Stock', render: (r) => rows.find((s) => s.id === r.stock_id)?.produit || r.stock_id || 'manuel' }, { key: 'categorie', label: 'Catégorie animale', sortable: true }, { key: 'cible_id', label: 'Concerné', render: (r) => r.cible_id || r.type_cible || '—' }, { key: 'quantite', label: 'Quantité', render: (r) => `${fmtNumber(r.quantite)} ${r.unite || ''}`.trim() }, { key: 'prix_unitaire', label: 'Prix unit.', render: (r) => fmtCurrency(r.prix_unitaire) }, { key: 'montant_total', label: 'Coût lié', render: (r) => fmtCurrency(r.montant_total) }, { key: 'duree_jours', label: 'Durée', render: (r) => `${r.duree_jours || 1} j` },
  ];
  const doExports = () => { const enrichedRows = rows.map((p) => ({ ...p, ...stockMetrics(p, stockMovements, transactions), valeur_estimee: displayValue(p, stockMovements, transactions), cmup: displayUnitPrice(p, stockMovements, transactions) })); exportToCsv({ rows: enrichedRows, fileName: 'stocks.csv' }); exportToExcel({ rows: enrichedRows, fileName: 'stocks.xlsx', sheetName: 'Stocks' }); exportToPdf({ rows: enrichedRows, title: 'Stock', fileName: 'stocks.pdf' }); toast.success('Exports stock générés'); };
  const openPurchaseReception = () => rest.onOpenPurchaseReception?.({ form_type: 'stock_purchase', intent_label: 'Réception achat stock', draft_fields: { date: today() } }) || setModal('create');
  return <div className="space-y-6"><StockStatusPanel rows={rows} onUpdate={onUpdate} onCreateBusinessEvent={rest.onCreateBusinessEvent || businessEventsCrud.create} onRefresh={onRefresh} /><StockFlowPanel rows={rows} onUpdate={onUpdate} onCreateBusinessEvent={rest.onCreateBusinessEvent || businessEventsCrud.create} onCreateFinanceTransaction={onCreateFinanceTransaction} onRefreshFinances={onRefreshFinances} /><StockReorderTasksBridge rows={rows} taches={taches} fournisseurs={fournisseurs} onCreateTask={onCreateTask} onUpdateTask={onUpdateTask} onRefreshTasks={onRefreshTasks} onCreateAlert={onCreateAlert || alertesCrud.create} onRefreshAlertes={onRefreshAlertes || alertesCrud.refresh} onCreateBusinessEvent={rest.onCreateBusinessEvent || businessEventsCrud.create} onRefreshBusinessEvents={rest.onRefreshBusinessEvents || businessEventsCrud.refresh} /><SectionHeader title="Inventaire" sub="Valorisation CMUP — réception achat via le formulaire canonique" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Plus} small onClick={openPurchaseReception}>Réception achat</Btn><Btn icon={Package} variant="outline" small onClick={() => { setSelected(null); setModal('create'); }}>Créer fiche stock</Btn><Btn icon={Package} variant="outline" small onClick={() => rest.onNavigate?.('elevage', { tab: 'Alimentation' })}>Élevage › Alimentation</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Rapport</Btn></>} /><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><KpiCard icon={Package} label="Valeur totale (CMUP)" value={fmtCurrency(valeurTotale)} /><KpiCard icon={AlertTriangle} label="Produits sous seuil" value={critiques.length} /><KpiCard icon={CheckCircle} label="Produits OK" value={rows.length - critiques.length} /></div><DataTable title="Inventaire" rows={rows} columns={columns} loading={loading} initialSortKey="produit" searchPlaceholder="Rechercher stock..." /><DataTable title="Alimentation (lecture seule — saisie Élevage)" rows={alimentationLogs || []} columns={alimColumns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher alimentation..." />{movement ? <MovementModal row={movement.row} type={movement.type} defaultQty={movement.defaultQty} unitPriceEstimate={movement.unitPriceEstimate} saving={saving} onClose={() => setMovement(null)} onConfirm={confirmMovement} /> : null}<DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...stockMetrics(selected, stockMovements, transactions), cmup: displayUnitPrice(selected, stockMovements, transactions), valeur_estimee: displayValue(selected, stockMovements, transactions) } : selected} title="Détail stock" /><CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={stockFormFields} initialValues={{ id: generateSequentialId('stock', rows), quantite: 0, seuil: 0, stock_max: 0, statut: 'ok', unite: 'kg', categorie: 'aliment_betail', activite_liee: 'animaux' }} autoId={() => generateSequentialId('stock', rows)} loading={saving} title="Créer fiche stock (sans prix — utiliser Réception achat)" submitLabel="Enregistrer" /><EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={stockFormFields} initialValues={selected || {}} loading={saving} title="Modifier stock" submitLabel="Enregistrer" /><DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.produit}` : ''} loading={saving} /><DetailsModal open={modal === 'detailsAlim'} onClose={() => setModal(null)} data={selectedAlim} title="Détail alimentation" /><CreateModal open={modal === 'createAlim'} onClose={() => setModal(null)} onSubmit={submitCreateAlimentation} fields={alimFormFields} deriveValues={deriveAlimValues} initialValues={{ id: generateSequentialId('alimentation_logs', alimentationLogs), date: today(), stock_id: '__manual__', categorie: 'bovin', type_cible: 'categorie_animale', duree_jours: 1, unite: 'kg' }} autoId={() => generateSequentialId('alimentation_logs', alimentationLogs)} loading={saving} title="Utiliser aliment depuis le stock" submitLabel="Enregistrer" /><EditModal open={modal === 'editAlim'} onClose={() => setModal(null)} onSubmit={async (rawPayload) => { if (!selectedAlim) return; try { setSaving(true); const payload = normalizeAlimentationPayload(rawPayload, { stocks: rows, fournisseurs }); await onUpdateAlimentation?.(selectedAlim.id, payload); await onRefreshAlimentation?.(); toast.success('Alimentation modifiée'); setModal(null); } catch (e) { toast.error(e.message || 'Modification impossible'); } finally { setSaving(false); } }} fields={alimFormFields} deriveValues={deriveAlimValues} initialValues={selectedAlim || {}} loading={saving} title="Modifier utilisation alimentation" submitLabel="Enregistrer" /><DeleteModal open={modal === 'deleteAlim'} onClose={() => setModal(null)} onConfirm={async () => { if (!selectedAlim) return; try { setSaving(true); await onDeleteAlimentation?.(selectedAlim.id); await onRefreshAlimentation?.(); toast.success('Alimentation supprimée'); setModal(null); } catch (e) { toast.error(e.message || 'Suppression impossible'); } finally { setSaving(false); } }} itemLabel={selectedAlim ? `${selectedAlim.categorie} ${selectedAlim.date}` : ''} loading={saving} /></div>;
}
