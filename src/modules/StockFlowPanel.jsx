import { AlertTriangle, ArrowDownUp, CheckCircle2, PackagePlus, Receipt, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toISOString(); }
function unitPrice(row = {}) { return toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire); }
function stockMetrics(row = {}) {
  const qty = toNumber(row.quantite);
  const threshold = toNumber(row.seuil);
  const maxQty = toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
  const value = qty * unitPrice(row);
  const critical = threshold > 0 ? qty <= threshold : false;
  const suggestedOrderQty = maxQty > 0 ? Math.max(0, maxQty - qty) : Math.max(threshold, 1);
  return { qty, threshold, value, critical, suggestedOrderQty };
}
function supplierId(row = {}) { return row.fournisseur_id || row.supplier_id || row.fournisseur || ''; }
function supplierName(supplier = {}) { return supplier.nom || supplier.name || supplier.id || 'fournisseur'; }

function askQty(row, title, fallback = 1) {
  const raw = window.prompt(`${title}\nProduit: ${row.produit || row.id}\nUnité: ${row.unite || 'unité'}\nQuantité à saisir:`, String(Math.max(1, Math.round(fallback || 1))));
  if (raw === null) return null;
  const qty = toNumber(raw);
  if (qty <= 0) {
    toast.error('Quantité invalide');
    return null;
  }
  return qty;
}

function askReceiptMode(row, amount) {
  if (amount <= 0) return 'no_cost';
  const raw = window.prompt(`Réception ${row.produit || row.id}\nCoût estimé: ${fmtCurrency(amount)}\n1 = payé maintenant\n2 = dette fournisseur\n3 = sans paiement`, supplierId(row) ? '2' : '1');
  if (raw === null) return null;
  if (raw === '2') return 'supplier_debt';
  if (raw === '3') return 'no_cost';
  return 'paid_now';
}

function movementLabel(type) {
  if (type === 'entree') return 'réception';
  if (type === 'sortie') return 'utilisation';
  if (type === 'perte') return 'perte';
  return type;
}

async function stockMove({ row, type, qty, props, extra = {} }) {
  const current = toNumber(row.quantite);
  const nextQty = type === 'entree' ? current + qty : type === 'sortie' || type === 'perte' ? Math.max(0, current - qty) : qty;
  const label = movementLabel(type);
  await props.onUpdate?.(row.id, {
    quantite: nextQty,
    last_movement_type: type,
    last_movement_label: label,
    last_movement_qty: qty,
    last_movement_at: now(),
    stock_status: nextQty <= 0 ? 'epuise' : (extra.stock_status || row.stock_status || row.statut || 'ok'),
    statut: nextQty <= 0 ? 'epuise' : (extra.statut || row.statut || row.stock_status || 'ok'),
    source_module: 'stock',
    source_record_id: row.id,
    ...extra,
  });
  await props.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: type === 'perte' ? 'perte_stock' : 'mouvement_stock',
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: row.id,
    title: `Stock: ${label}`,
    description: `${row.produit || row.id}: ${current} -> ${nextQty} ${row.unite || ''}`,
    severity: type === 'perte' ? 'warning' : 'info',
    event_date: today(),
  });
  toast.success(`Stock mis à jour: ${label}`);
}

async function createReceiptDocument(row, qty, amount, mode, props) {
  await props.documentsCrud?.create?.({
    id: makeId('DOC'),
    title: `Réception stock ${row.produit || row.id}`,
    document_category: mode === 'supplier_debt' ? 'bon_livraison' : 'facture',
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: row.id,
    related_id: row.id,
    fournisseur_id: supplierId(row),
    notes: `${fmtNumber(qty)} ${row.unite || ''} · ${fmtCurrency(amount)} · ${mode}`,
  });
}

async function createSupplierDebt(row, amount, props) {
  const id = supplierId(row);
  if (!id || amount <= 0) return;
  const supplier = props.fournisseursCrud?.rows?.find((item) => String(item.id) === String(id));
  if (supplier) {
    await props.fournisseursCrud?.update?.(supplier.id, { dettes: toNumber(supplier.dettes) + amount, derniere_livraison: today(), last_stock_id: row.id });
  }
  await props.alertesCrud?.create?.({
    id: makeId('ALT'),
    title: `Dette fournisseur: ${supplierName(supplier)}`,
    message: `${fmtCurrency(amount)} à régler pour ${row.produit || row.id}`,
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: row.id,
    severity: 'warning',
    status: 'nouvelle',
    action_recommandee: 'Vérifier facture fournisseur puis planifier paiement.',
  });
  await props.tachesCrud?.create?.({
    id: makeId('TSK'),
    title: `Paiement fournisseur — ${supplierName(supplier)}`,
    module_lie: 'fournisseurs',
    related_id: id,
    due_date: today(),
    priority: 'haute',
    status: 'a_faire',
    source_module: 'stock',
    source_record_id: row.id,
  });
}

async function receiveCritical(row, props) {
  const metrics = stockMetrics(row);
  const qty = askQty(row, 'Réception stock', metrics.suggestedOrderQty || toNumber(row.seuil) || 1);
  if (!qty) return;
  const amount = qty * unitPrice(row);
  const mode = askReceiptMode(row, amount);
  if (!mode) return;
  await stockMove({ row, type: 'entree', qty, props, extra: { statut: mode === 'supplier_debt' ? 'recu_a_controler' : 'ok', stock_status: mode === 'supplier_debt' ? 'recu_a_controler' : 'ok', last_receipt_mode: mode, last_receipt_amount: amount, date_derniere_reception: today() } });
  await createReceiptDocument(row, qty, amount, mode, props);
  if (mode === 'paid_now' && amount > 0) {
    await props.onCreateFinanceTransaction?.({
      id: makeId('TRX'),
      type: 'sortie',
      libelle: `Approvisionnement ${row.produit || row.id}`,
      montant: amount,
      date: today(),
      categorie: 'Stocks',
      module_lie: 'stock',
      related_id: row.id,
      fournisseur_id: supplierId(row),
      statut: 'paye',
      source_module: 'stock',
      source_record_id: row.id,
    });
    await props.onRefreshFinances?.();
  }
  if (mode === 'supplier_debt') await createSupplierDebt(row, amount, props);
  await Promise.allSettled([props.documentsCrud?.refresh?.(), props.fournisseursCrud?.refresh?.(), props.alertesCrud?.refresh?.(), props.tachesCrud?.refresh?.(), props.onRefresh?.()]);
  toast.success(mode === 'supplier_debt' ? 'Réception enregistrée avec dette fournisseur' : 'Réception enregistrée');
}

export default function StockFlowPanel(props) {
  const rows = Array.isArray(props.rows) ? props.rows : [];
  const documentsCrud = useCrudModule('documents');
  const fournisseursCrud = useCrudModule('fournisseurs');
  const alertesCrud = useCrudModule('alertes_center');
  const tachesCrud = useCrudModule('taches');
  const connectedProps = { ...props, documentsCrud, fournisseursCrud, alertesCrud, tachesCrud };
  const critiques = rows.filter((row) => stockMetrics(row).critical).slice(0, 6);
  const totalValue = rows.reduce((sum, row) => sum + stockMetrics(row).value, 0);
  const lastMoves = rows.filter((row) => row.last_movement_type).slice(0, 5);

  const doMove = (row, type) => {
    const title = type === 'entree' ? 'Réception stock' : type === 'sortie' ? 'Utilisation / sortie stock' : 'Déclarer une perte';
    const qty = askQty(row, title, 1);
    if (!qty) return;
    if (type === 'entree') receiveCritical(row, connectedProps);
    else stockMove({ row, type, qty, props: connectedProps });
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Flux stock</p>
          <h3 className="font-black text-[#2f2415]">Réception, utilisation et pertes</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><b>{fmtCurrency(totalValue)}</b><br /><span className="text-[#8a7456]">valeur stock</span></div>
          <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><b>{critiques.length}</b><br /><span className="text-[#8a7456]">à commander</span></div>
        </div>
      </div>

      {critiques.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {critiques.map((row) => (
            <div key={row.id} className="rounded-xl border border-red-200 bg-red-50/50 p-3">
              <p className="font-black text-[#2f2415]"><AlertTriangle size={14} className="inline text-red-500" /> {row.produit}</p>
              <p className="text-xs text-[#8a7456] mt-1">Stock {fmtNumber(row.quantite)} / seuil {fmtNumber(row.seuil)} {row.unite || ''}</p>
              <button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => receiveCritical(row, connectedProps)}><Truck size={14} className="inline" /> Réceptionner</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun stock critique détecté.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {rows.slice(0, 3).map((row) => (
          <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="font-bold text-[#2f2415]"><ArrowDownUp size={14} className="inline" /> {row.produit}</p>
            <p className="text-xs text-[#8a7456] mt-1">Quantité actuelle: {fmtNumber(row.quantite)} {row.unite || ''}</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs font-bold">
              <button type="button" className="text-emerald-700" onClick={() => doMove(row, 'entree')}><PackagePlus size={12} className="inline" /> Réception</button>
              <button type="button" className="text-amber-700" onClick={() => doMove(row, 'sortie')}><Receipt size={12} className="inline" /> Utiliser</button>
              <button type="button" className="text-red-600" onClick={() => doMove(row, 'perte')}><AlertTriangle size={12} className="inline" /> Perte</button>
            </div>
          </div>
        ))}
      </div>

      {lastMoves.length ? <p className="text-xs text-[#8a7456]">Derniers mouvements visibles dans les fiches stock.</p> : null}
    </div>
  );
}
