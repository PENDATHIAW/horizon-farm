import { AlertTriangle, CheckCircle, Download, MessageCircle, Package, Plus, RefreshCw, Upload, Eye, Edit } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import ActionIconButton from '../components/ActionIconButton';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId, toWhatsappLink } from '../utils/ids';
import { DEFAULT_PHONE } from '../utils/location';
import { enrichFeedingLogs } from '../utils/alimentation';
import { calculateStockMetrics } from '../utils/businessCalculations';

export default function Stock({
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
}) {
  const [selected, setSelected] = useState(null);
  const [selectedAlim, setSelectedAlim] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const metricsFor = (product) => calculateStockMetrics(product);
  const valeurTotale = useMemo(() => rows.reduce((sum, product) => sum + calculateStockMetrics(product).value, 0), [rows]);
  const critiques = useMemo(() => rows.filter((product) => calculateStockMetrics(product).critical), [rows]);
  const feedingRows = useMemo(() => enrichFeedingLogs({ logs: alimentationLogs, animals: animaux, lots, fournisseurs }), [alimentationLogs, animaux, lots, fournisseurs]);

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate(payload);
      toast.success('Entree stock enregistree');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur creation stock');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate(selected.id, payload);
      toast.success('Stock modifie');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur modification stock');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete(selected.id);
      toast.success('Stock supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Erreur suppression stock');
    } finally {
      setSaving(false);
    }
  };

  const submitCreateAlimentation = async (payload) => {
    try {
      setSaving(true);
      await onCreateAlimentation?.({ ...payload, duree_jours: payload.duree_jours || 30 });
      toast.success('Achat/consommation alimentation enregistre');
      setModal(null);
      await onRefreshAlimentation?.();
    } catch (error) {
      toast.error(error.message || 'Erreur alimentation');
    } finally {
      setSaving(false);
    }
  };

  const submitEditAlimentation = async (payload) => {
    if (!selectedAlim) return;
    try {
      setSaving(true);
      await onUpdateAlimentation?.(selectedAlim.id, payload);
      toast.success('Ligne alimentation modifiee');
      setModal(null);
      await onRefreshAlimentation?.();
    } catch (error) {
      toast.error(error.message || 'Erreur alimentation');
    } finally {
      setSaving(false);
    }
  };

  const submitDeleteAlimentation = async () => {
    if (!selectedAlim) return;
    try {
      setSaving(true);
      await onDeleteAlimentation?.(selectedAlim.id);
      toast.success('Ligne alimentation supprimee');
      setModal(null);
      await onRefreshAlimentation?.();
    } catch (error) {
      toast.error(error.message || 'Erreur suppression alimentation');
    } finally {
      setSaving(false);
    }
  };

  const openSupplier = (product) => {
    const url = toWhatsappLink(DEFAULT_PHONE, `Commande ${product.produit} - besoin urgent`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const doExports = () => {
    const enrichedRows = rows.map((product) => ({ ...product, ...metricsFor(product) }));
    exportToCsv({ rows: enrichedRows, fileName: 'stocks.csv' });
    exportToExcel({ rows: enrichedRows, fileName: 'stocks.xlsx', sheetName: 'Stocks' });
    exportToPdf({ rows: enrichedRows, title: 'Stock', fileName: 'stocks.pdf' });
    toast.success('Exports stock generes');
  };

  const columns = [
    { key: 'produit', label: 'Produit', sortable: true, render: (p) => <span className="text-[#2f2415] font-semibold">{p.produit}</span> },
    { key: 'categorie', label: 'Categorie', sortable: true },
    { key: 'quantite', label: 'Quantite', sortable: true, render: (p) => <span className={metricsFor(p).critical ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{fmtNumber(metricsFor(p).quantity)}</span> },
    { key: 'unite', label: 'Unite', sortable: true },
    { key: 'seuil', label: 'Seuil min.', sortable: true, render: (p) => <span className="text-amber-400">{fmtNumber(p.seuil)}</span> },
    { key: 'prixUnit', label: 'Prix unit.', sortable: true, render: (p) => fmtCurrency(metricsFor(p).unitPrice) },
    { key: 'valeur', label: 'Valeur auto', sortable: true, render: (p) => <span className="text-[#2f2415] font-semibold">{fmtCurrency(metricsFor(p).value)}</span> },
    { key: 'couverture', label: 'Couverture', sortable: true, render: (p) => `${metricsFor(p).coverageRatio.toFixed(1)}x seuil` },
    { key: 'suggestion', label: 'A commander', render: (p) => metricsFor(p).suggestedOrderQty > 0 ? <span className="text-amber-500 font-semibold">{fmtNumber(metricsFor(p).suggestedOrderQty)} {p.unite || ''}</span> : <span className="text-emerald-500">OK</span> },
    {
      key: 'actions',
      label: 'Actions',
      render: (p) => (
        <div className="flex gap-1">
          <ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(p); setModal('details'); }} />
          <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(p); setModal('edit'); }} />
          <ActionIconButton icon={Plus} title="Ajouter une unite" color="emerald" onClick={async () => { await onUpdate(p.id, { quantite: Number(p.quantite || 0) + 1 }); toast.success('Entree stock +1 enregistree'); }} />
          <ActionIconButton icon={MessageCircle} title="Commander" color="whatsapp" onClick={() => openSupplier(p)} />
          <ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(p); setModal('delete'); }} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Gestion des Stocks"
        sub="Aliments - Vaccins - Medicaments - Equipements"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn>
            <Btn icon={Plus} small onClick={() => { setSelected(null); setModal('create'); }}>Entree stock</Btn>
            <Btn icon={Plus} variant="outline" small onClick={() => { setSelectedAlim(null); setModal('createAlim'); }}>Alimentation</Btn>
            <Btn icon={Upload} variant="outline" small onClick={() => toast.success('Import pret (CSV/XLSX)')}>Importer</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Rapport</Btn>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Package} label="Valeur totale stock" value={fmtCurrency(valeurTotale)} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={AlertTriangle} label="Produits critiques" value={critiques.length} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={CheckCircle} label="Produits OK" value={rows.length - critiques.length} color="bg-emerald-500/20 text-emerald-400" />
      </div>

      {critiques.length > 0 ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
          <p className="text-red-400 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Stocks critiques - action requise</p>
          <div className="flex flex-wrap gap-2">
            {critiques.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm">
                <span className="text-red-400 font-semibold">{p.produit}</span>
                <span className="text-red-300/70">{p.quantite}/{p.seuil} {p.unite}</span>
                <button type="button" className="text-[#25D366] hover:underline text-xs" onClick={() => openSupplier(p)}>Commander</button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <DataTable title="Inventaire" rows={rows} columns={columns} loading={loading} initialSortKey="produit" />

      <DataTable
        title="Alimentation - couts calcules par categorie / lot"
        rows={feedingRows}
        columns={[
          { key: 'date', label: 'Date', sortable: true },
          { key: 'categorie', label: 'Categorie', sortable: true },
          { key: 'cible_id', label: 'Cible', render: (row) => row.cible_id || row.type_cible },
          { key: 'quantite', label: 'Quantite', render: (row) => `${fmtNumber(row.quantite)} ${row.unite || ''}`.trim() },
          { key: 'montant_total', label: 'Montant total', sortable: true, render: (row) => fmtCurrency(row.montant_total) },
          { key: 'duree_jours', label: 'Duree', render: (row) => `${row.duree_jours || 30} j` },
          { key: 'nombre_tetes', label: 'Tetes', sortable: true, render: (row) => fmtNumber(row.nombre_tetes) },
          { key: 'cout_moyen_tete', label: 'Cout/tete', render: (row) => fmtCurrency(row.cout_moyen_tete) },
          { key: 'cout_moyen_tete_jour', label: 'Cout/tete/j', render: (row) => fmtCurrency(row.cout_moyen_tete_jour) },
          { key: 'fournisseur_nom', label: 'Fournisseur' },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="flex gap-1">
                <ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelectedAlim(row); setModal('detailsAlim'); }} />
                <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelectedAlim(row); setModal('editAlim'); }} />
                <ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelectedAlim(row); setModal('deleteAlim'); }} />
              </div>
            ),
          },
        ]}
        loading={loading}
        initialSortKey="date"
      />

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...metricsFor(selected) } : selected} title="Detail stock" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.stock} initialValues={selected || { id: generateSequentialId('stock', rows) }} autoId={() => selected?.id || generateSequentialId('stock', rows)} loading={saving} title="Ajouter / Entrer stock" submitLabel="Enregistrer" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.stock} initialValues={selected || {}} loading={saving} title="Modifier stock" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.produit}` : ''} loading={saving} />
      <DetailsModal open={modal === 'detailsAlim'} onClose={() => setModal(null)} data={selectedAlim} title="Detail alimentation" />
      <CreateModal open={modal === 'createAlim'} onClose={() => setModal(null)} onSubmit={submitCreateAlimentation} fields={MODULE_FORM_FIELDS.alimentation_logs} initialValues={{ id: generateSequentialId('alimentation_logs', alimentationLogs), date: new Date().toISOString().slice(0, 10), categorie: 'bovin', type_cible: 'categorie_animale', duree_jours: 30 }} autoId={() => generateSequentialId('alimentation_logs', alimentationLogs)} loading={saving} title="Ajouter achat / consommation alimentation" submitLabel="Enregistrer" />
      <EditModal open={modal === 'editAlim'} onClose={() => setModal(null)} onSubmit={submitEditAlimentation} fields={MODULE_FORM_FIELDS.alimentation_logs} initialValues={selectedAlim || {}} loading={saving} title="Modifier alimentation" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'deleteAlim'} onClose={() => setModal(null)} onConfirm={submitDeleteAlimentation} itemLabel={selectedAlim ? `${selectedAlim.categorie} ${selectedAlim.date}` : ''} loading={saving} />
    </div>
  );
}


