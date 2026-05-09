import { AlertTriangle, CheckCircle, Download, Edit, Eye, Package, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId, makeId } from '../utils/ids';
import StockFlowPanel from './StockFlowPanel.jsx';
import StockStatusPanel from './StockStatusPanel.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire);
const valueOf = (row = {}) => toNumber(row.quantite) * unitPrice(row);
const categoryOf = (row = {}) => String(row.categorie || row.category || '').toLowerCase();
const isFood = (row = {}) => categoryOf(row).includes('aliment');
const statusOf = (row = {}) => row.statut || row.stock_status || (toNumber(row.quantite) <= 0 ? 'epuise' : 'ok');
const stockMetrics = (row = {}) => {
  const quantity = toNumber(row.quantite);
  const threshold = toNumber(row.seuil);
  const maxQty = toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
  const critical = threshold > 0 ? quantity <= threshold : false;
  const suggestedOrderQty = maxQty > 0 ? Math.max(0, maxQty - quantity) : Math.max(0, threshold - quantity);
  const coverageRatio = threshold > 0 ? quantity / threshold : 0;
  return { quantity, threshold, critical, suggestedOrderQty, coverageRatio, value: valueOf(row), unitPrice: unitPrice(row) };
};

const STOCK_CATEGORIES = [
  { value: 'aliment_betail', label: 'Aliment bétail' },
  { value: 'aliment_avicole', label: 'Aliment avicole' },
  { value: 'semences', label: 'Semences' },
  { value: 'engrais', label: 'Engrais / fertilisants' },
  { value: 'phytosanitaire', label: 'Produits phytosanitaires' },
  { value: 'vaccin', label: 'Vaccins' },
  { value: 'medicament', label: 'Médicaments / soins' },
  { value: 'materiel', label: 'Matériel / consommables' },
  { value: 'emballage', label: 'Emballages' },
  { value: 'recolte', label: 'Produits récoltés' },
  { value: 'carburant', label: 'Carburant / énergie' },
  { value: 'autre', label: 'Autre' },
];

const STATUS_OPTIONS = [
  { value: 'ok', label: 'OK / disponible' },
  { value: 'en_attente_fournisseur', label: 'En attente fournisseur' },
  { value: 'en_attente_livraison', label: 'En attente livraison' },
  { value: 'recu_a_controler', label: 'Reçu à contrôler' },
  { value: 'non_conforme', label: 'Non conforme' },
  { value: 'a_retourner', label: 'À retourner' },
  { value: 'retourne', label: 'Retourné fournisseur' },
  { value: 'bloque', label: 'Bloqué / quarantaine' },
  { value: 'perime', label: 'Périmé' },
  { value: 'reserve', label: 'Réservé' },
  { value: 'epuise', label: 'Épuisé' },
];

function stockFields(fournisseurs = []) {
  return [
    { key: 'section_identification', label: 'Identification stock', type: 'section' },
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'produit', label: 'Produit', type: 'text', required: true },
    { key: 'categorie', label: 'Catégorie ERP', type: 'select', required: true, options: STOCK_CATEGORIES },
    { key: 'activite_liee', label: 'Activité concernée', type: 'select', options: [
      { value: 'animaux', label: 'Animaux / bétail' },
      { value: 'avicole', label: 'Avicole' },
      { value: 'cultures', label: 'Cultures / champ' },
      { value: 'sante', label: 'Santé / vaccins' },
      { value: 'stock', label: 'Stock général' },
      { value: 'vente', label: 'Vente / produits finis' },
      { value: 'autre', label: 'Autre' },
    ] },
    { key: 'section_quantite', label: 'Quantité & valeur', type: 'section' },
    { key: 'quantite', label: 'Quantité disponible', type: 'number', required: true },
    { key: 'unite', label: 'Unité', type: 'select', options: ['kg', 'sac', 'dose', 'litre', 'bidon', 'boite', 'unité', 'lot', 'm', 'm²', 'ha'] },
    { key: 'seuil', label: 'Seuil minimum', type: 'number' },
    { key: 'stock_max', label: 'Stock cible / maximum', type: 'number' },
    { key: 'prixUnit', label: 'Prix unitaire', type: 'number' },
    { key: 'section_suivi', label: 'Suivi fournisseur & statut', type: 'section' },
    { key: 'statut', label: 'Statut stock', type: 'select', options: STATUS_OPTIONS },
    { key: 'fournisseur_id', label: 'Fournisseur', type: 'select', options: fournisseurs.map((f) => ({ value: f.id, label: f.nom || f.name || f.id })) },
    { key: 'date_reception_prevue', label: 'Réception prévue', type: 'date' },
    { key: 'date_derniere_reception', label: 'Dernière réception', type: 'date' },
    { key: 'emplacement', label: 'Emplacement', type: 'text' },
    { key: 'preuve_url', label: 'Preuve / facture', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
  ];
}

function alimentationFields(stocks = [], animaux = [], lots = []) {
  const foodStocks = stocks.filter(isFood);
  return [
    { key: 'section_source', label: 'Source alimentation', type: 'section', description: 'Choisis un stock existant pour éviter une double saisie du coût.' },
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'stock_id', label: 'Stock aliment utilisé', type: 'select', options: [{ value: '', label: 'Aucun / saisie manuelle' }, ...foodStocks.map((s) => ({ value: s.id, label: `${s.produit} (${s.quantite} ${s.unite || ''})` }))] },
    { key: 'categorie', label: 'Catégorie animale', type: 'select', options: [
      { value: 'bovin', label: 'Bovins' },
      { value: 'ovin', label: 'Ovins' },
      { value: 'caprin', label: 'Caprins' },
      { value: 'pondeuse', label: 'Pondeuses' },
      { value: 'chair', label: 'Poulets de chair' },
      { value: 'autre', label: 'Autre' },
    ] },
    { key: 'type_cible', label: 'Type cible', type: 'select', options: [
      { value: 'categorie_animale', label: 'Catégorie animale' },
      { value: 'animal', label: 'Animal précis' },
      { value: 'lot_avicole', label: 'Lot avicole' },
    ] },
    { key: 'cible_id', label: 'Animal / lot lié', type: 'select', options: [{ value: '', label: 'Non précisé' }, ...animaux.map((a) => ({ value: a.id, label: a.name || a.tag || a.id })), ...lots.map((l) => ({ value: l.id, label: l.name || l.id }))] },
    { key: 'quantite', label: 'Quantité utilisée', type: 'number', required: true },
    { key: 'unite', label: 'Unité', type: 'select', options: ['kg', 'sac', 'litre', 'unité'] },
    { key: 'montant_total', label: 'Montant total', type: 'number' },
    { key: 'duree_jours', label: 'Durée couverte (jours)', type: 'number' },
    { key: 'fournisseur_id', label: 'Fournisseur', type: 'text' },
    { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
  ];
}

function askQty(row, title, fallback = 1) {
  const raw = window.prompt(`${title}\nProduit: ${row.produit || row.id}\nUnité: ${row.unite || 'unité'}\nQuantité:`, String(Math.max(1, Math.round(fallback || 1))));
  if (raw === null) return null;
  const qty = toNumber(raw);
  if (qty <= 0) toast.error('Quantité invalide');
  return qty > 0 ? qty : null;
}

export default function StocksV3({
  rows = [],
  alimentationLogs = [],
  animaux = [],
  lots = [],
  fournisseurs = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onCreateAlimentation,
  onUpdateAlimentation,
  onDeleteAlimentation,
  onRefreshAlimentation,
  onCreateFinanceTransaction,
  onRefreshFinances,
  ...rest
}) {
  const [selected, setSelected] = useState(null);
  const [selectedAlim, setSelectedAlim] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const valeurTotale = useMemo(() => rows.reduce((sum, product) => sum + valueOf(product), 0), [rows]);
  const critiques = useMemo(() => rows.filter((product) => stockMetrics(product).critical), [rows]);
  const stockFormFields = useMemo(() => stockFields(fournisseurs), [fournisseurs]);
  const alimFormFields = useMemo(() => alimentationFields(rows, animaux, lots), [rows, animaux, lots]);

  const normalizeStock = (payload) => ({
    ...payload,
    stock_status: payload.statut || payload.stock_status || (toNumber(payload.quantite) <= 0 ? 'epuise' : 'ok'),
    statut: payload.statut || payload.stock_status || (toNumber(payload.quantite) <= 0 ? 'epuise' : 'ok'),
    source_module: payload.source_module || 'stock',
  });

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate?.(normalizeStock(payload));
      toast.success('Stock créé / réceptionné');
      setModal(null);
    } catch (error) { toast.error(error.message || 'Erreur création stock'); } finally { setSaving(false); }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate?.(selected.id, normalizeStock(payload));
      toast.success('Stock modifié');
      setModal(null);
    } catch (error) { toast.error(error.message || 'Erreur modification stock'); } finally { setSaving(false); }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete?.(selected.id); toast.success('Stock supprimé'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur suppression stock'); }
    finally { setSaving(false); }
  };

  const moveStock = async (row, type, qty) => {
    const current = toNumber(row.quantite);
    const next = type === 'entree' ? current + qty : Math.max(0, current - qty);
    await onUpdate?.(row.id, {
      quantite: next,
      statut: next <= 0 ? 'epuise' : (row.statut || row.stock_status || 'ok'),
      stock_status: next <= 0 ? 'epuise' : (row.stock_status || row.statut || 'ok'),
      last_movement_type: type,
      last_movement_qty: qty,
      last_movement_at: new Date().toISOString(),
    });
  };

  const receiveStock = async (row) => {
    const qty = askQty(row, 'Réceptionner du stock', stockMetrics(row).suggestedOrderQty || 1);
    if (!qty) return;
    try {
      await moveStock(row, 'entree', qty);
      const amount = qty * unitPrice(row);
      if (amount > 0 && window.confirm('Créer aussi la sortie Finance fournisseur ?')) {
        await onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'sortie', libelle: `Réception stock ${row.produit}`, montant: amount, date: today(), categorie: 'Stocks', module_lie: 'stock', related_id: row.id, fournisseur_id: row.fournisseur_id || '', statut: 'paye', source_module: 'stock', source_record_id: row.id });
        await onRefreshFinances?.();
      }
      toast.success('Réception stock enregistrée');
    } catch (error) { toast.error(error.message || 'Réception impossible'); }
  };

  const useStock = async (row) => {
    const qty = askQty(row, isFood(row) ? 'Utiliser aliment depuis le stock' : 'Utiliser / sortir du stock', 1);
    if (!qty) return;
    try {
      await moveStock(row, 'sortie', qty);
      if (isFood(row) && onCreateAlimentation) {
        await onCreateAlimentation({ id: generateSequentialId('alimentation_logs', alimentationLogs), date: today(), stock_id: row.id, categorie: row.activite_liee === 'avicole' ? 'pondeuse' : 'bovin', type_cible: 'categorie_animale', quantite: qty, unite: row.unite || 'kg', montant_total: qty * unitPrice(row), fournisseur_id: row.fournisseur_id || '', duree_jours: 1, notes: `Sortie automatique depuis stock ${row.produit}` });
        await onRefreshAlimentation?.();
      }
      toast.success(isFood(row) ? 'Aliment utilisé et coût lié' : 'Sortie stock enregistrée');
    } catch (error) { toast.error(error.message || 'Sortie impossible'); }
  };

  const lossStock = async (row) => {
    const qty = askQty(row, 'Déclarer une perte stock', 1);
    if (!qty) return;
    try { await moveStock(row, 'perte', qty); toast.success('Perte stock enregistrée'); }
    catch (error) { toast.error(error.message || 'Perte impossible'); }
  };

  const submitCreateAlimentation = async (payload) => {
    try {
      setSaving(true);
      const stock = rows.find((r) => r.id === payload.stock_id);
      const qty = toNumber(payload.quantite);
      const normalized = { ...payload, montant_total: toNumber(payload.montant_total) || (stock ? qty * unitPrice(stock) : 0), unite: payload.unite || stock?.unite || 'kg', duree_jours: payload.duree_jours || 1, source_module: 'stock', source_record_id: payload.stock_id || '' };
      await onCreateAlimentation?.(normalized);
      if (stock && qty > 0) await moveStock(stock, 'sortie', qty);
      await onRefreshAlimentation?.();
      toast.success('Utilisation alimentation enregistrée et liée');
      setModal(null);
    } catch (error) { toast.error(error.message || 'Erreur alimentation'); } finally { setSaving(false); }
  };

  const columns = [
    { key: 'produit', label: 'Produit', sortable: true, render: (p) => <span className="text-[#2f2415] font-semibold">{p.produit}</span> },
    { key: 'categorie', label: 'Catégorie ERP', sortable: true, render: (p) => STOCK_CATEGORIES.find((c) => c.value === p.categorie)?.label || p.categorie || '—' },
    { key: 'activite_liee', label: 'Activité liée', sortable: true, render: (p) => p.activite_liee || '—' },
    { key: 'quantite', label: 'Quantité', sortable: true, render: (p) => <span className={stockMetrics(p).critical ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>{fmtNumber(stockMetrics(p).quantity)}</span> },
    { key: 'unite', label: 'Unité', sortable: true },
    { key: 'seuil', label: 'Seuil min.', sortable: true, render: (p) => fmtNumber(p.seuil) },
    { key: 'prixUnit', label: 'Prix unit.', sortable: true, render: (p) => fmtCurrency(unitPrice(p)) },
    { key: 'valeur', label: 'Valeur auto', sortable: true, render: (p) => <span className="text-[#2f2415] font-semibold">{fmtCurrency(valueOf(p))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (p) => <Badge status={statusOf(p)} /> },
    { key: 'suggestion', label: 'À commander', render: (p) => stockMetrics(p).suggestedOrderQty > 0 ? <span className="text-amber-600 font-semibold">{fmtNumber(stockMetrics(p).suggestedOrderQty)} {p.unite || ''}</span> : <span className="text-emerald-600">OK</span> },
    { key: 'actions', label: 'Actions', render: (p) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(p); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(p); setModal('edit'); }} /><ActionIconButton icon={Plus} title="Réceptionner" color="emerald" onClick={() => receiveStock(p)} /><ActionIconButton icon={Package} title="Utiliser" color="amber" onClick={() => useStock(p)} /><ActionIconButton icon={AlertTriangle} title="Perte" color="red" onClick={() => lossStock(p)} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(p); setModal('delete'); }} /></div> },
  ];

  const alimColumns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'stock_id', label: 'Stock source', render: (r) => rows.find((s) => s.id === r.stock_id)?.produit || r.stock_id || 'manuel' },
    { key: 'categorie', label: 'Catégorie animale', sortable: true },
    { key: 'cible_id', label: 'Cible', render: (r) => r.cible_id || r.type_cible || '—' },
    { key: 'quantite', label: 'Quantité', render: (r) => `${fmtNumber(r.quantite)} ${r.unite || ''}`.trim() },
    { key: 'montant_total', label: 'Coût lié', render: (r) => fmtCurrency(r.montant_total) },
    { key: 'duree_jours', label: 'Durée', render: (r) => `${r.duree_jours || 1} j` },
    { key: 'actions', label: 'Actions', render: (r) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelectedAlim(r); setModal('detailsAlim'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelectedAlim(r); setModal('editAlim'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelectedAlim(r); setModal('deleteAlim'); }} /></div> },
  ];

  const doExports = () => {
    const enrichedRows = rows.map((p) => ({ ...p, ...stockMetrics(p), valeur_auto: valueOf(p) }));
    exportToCsv({ rows: enrichedRows, fileName: 'stocks.csv' });
    exportToExcel({ rows: enrichedRows, fileName: 'stocks.xlsx', sheetName: 'Stocks' });
    exportToPdf({ rows: enrichedRows, title: 'Stock', fileName: 'stocks.pdf' });
    toast.success('Exports stock générés');
  };

  return <div className="space-y-6">
    <StockStatusPanel rows={rows} onUpdate={onUpdate} onCreateBusinessEvent={rest.onCreateBusinessEvent} onRefresh={onRefresh} />
    <StockFlowPanel rows={rows} onUpdate={onUpdate} onCreateBusinessEvent={rest.onCreateBusinessEvent} onCreateFinanceTransaction={onCreateFinanceTransaction} onRefreshFinances={onRefreshFinances} />

    <SectionHeader title="Inventaire connecté" sub="Stock réel: achats, livraisons, consommations, pertes, retours et coûts liés aux activités" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Plus} small onClick={() => { setSelected(null); setModal('create'); }}>Créer / réceptionner stock</Btn><Btn icon={Package} variant="outline" small onClick={() => { setSelectedAlim(null); setModal('createAlim'); }}>Utiliser aliment</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Rapport</Btn></>} />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><KpiCard icon={Package} label="Valeur totale stock" value={fmtCurrency(valeurTotale)} /><KpiCard icon={AlertTriangle} label="Produits critiques" value={critiques.length} /><KpiCard icon={CheckCircle} label="Produits OK" value={rows.length - critiques.length} /></div>
    <DataTable title="Inventaire" rows={rows} columns={columns} loading={loading} initialSortKey="produit" searchPlaceholder="Rechercher stock..." />
    <DataTable title="Utilisation alimentation liée aux stocks" rows={alimentationLogs || []} columns={alimColumns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher alimentation..." />

    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...stockMetrics(selected), valeur_auto: valueOf(selected) } : selected} title="Détail stock" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={stockFormFields} initialValues={{ id: generateSequentialId('stock', rows), quantite: 0, seuil: 0, stock_max: 0, statut: 'ok', unite: 'kg', categorie: 'aliment_betail', activite_liee: 'animaux' }} autoId={() => generateSequentialId('stock', rows)} loading={saving} title="Créer / réceptionner stock" submitLabel="Enregistrer" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={stockFormFields} initialValues={selected || {}} loading={saving} title="Modifier stock" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.produit}` : ''} loading={saving} />
    <DetailsModal open={modal === 'detailsAlim'} onClose={() => setModal(null)} data={selectedAlim} title="Détail alimentation" />
    <CreateModal open={modal === 'createAlim'} onClose={() => setModal(null)} onSubmit={submitCreateAlimentation} fields={alimFormFields} initialValues={{ id: generateSequentialId('alimentation_logs', alimentationLogs), date: today(), categorie: 'bovin', type_cible: 'categorie_animale', duree_jours: 1, unite: 'kg' }} autoId={() => generateSequentialId('alimentation_logs', alimentationLogs)} loading={saving} title="Utiliser aliment depuis le stock" submitLabel="Enregistrer" />
    <EditModal open={modal === 'editAlim'} onClose={() => setModal(null)} onSubmit={async (payload) => { if (!selectedAlim) return; try { setSaving(true); await onUpdateAlimentation?.(selectedAlim.id, payload); await onRefreshAlimentation?.(); toast.success('Alimentation modifiée'); setModal(null); } catch (e) { toast.error(e.message || 'Modification impossible'); } finally { setSaving(false); } }} fields={alimFormFields} initialValues={selectedAlim || {}} loading={saving} title="Modifier utilisation alimentation" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'deleteAlim'} onClose={() => setModal(null)} onConfirm={async () => { if (!selectedAlim) return; try { setSaving(true); await onDeleteAlimentation?.(selectedAlim.id); await onRefreshAlimentation?.(); toast.success('Alimentation supprimée'); setModal(null); } catch (e) { toast.error(e.message || 'Suppression impossible'); } finally { setSaving(false); } }} itemLabel={selectedAlim ? `${selectedAlim.categorie} ${selectedAlim.date}` : ''} loading={saving} />
  </div>;
}
