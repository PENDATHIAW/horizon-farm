import { AlertTriangle, CheckCircle, Download, Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import ActionIconButton from '../components/ActionIconButton';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId } from '../utils/ids';
import { fmtCurrency, toNumber } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import AnimalHealthBridge from './AnimalHealthBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const speciesPlural = (species = 'Bovin') => `${species}s`;
const statusOf = (row = {}) => row.status || row.statut || 'actif';
const healthOf = (row = {}) => row.health_status || row.sante || row.status_sante || 'sain';
const purchaseCost = (row = {}) => toNumber(row.purchase_cost ?? row.cout_achat ?? row.prix_achat);
const salePrice = (row = {}) => toNumber(row.sale_price ?? row.prix_vente_reel ?? row.prix_vente_estime);

export default function AnimauxSpeciesFocused({ species = 'Bovin', rows = [], alimentationLogs = [], vaccins = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('tous');
  const [healthFilter, setHealthFilter] = useState('tous');

  const normalizedRows = useMemo(() => rows.map((row) => ({ ...row, type: species, espece: species })), [rows, species]);
  const filtered = useMemo(() => normalizedRows.filter((row) => {
    const statusOk = statusFilter === 'tous' || statusOf(row) === statusFilter;
    const healthOk = healthFilter === 'tous' || healthOf(row) === healthFilter;
    return statusOk && healthOk;
  }), [normalizedRows, statusFilter, healthFilter]);

  const summary = useMemo(() => {
    const active = normalizedRows.filter((row) => isActiveAnimalForFeeding(row));
    const sick = normalizedRows.filter((row) => ['malade', 'sous_traitement', 'blesse', 'blessé', 'a_surveiller'].includes(healthOf(row)));
    const sold = normalizedRows.filter((row) => statusOf(row) === 'vendu');
    const feeding = alimentationLogs.filter((log) => normalizedRows.some((row) => String(row.id) === String(log.animal_id || log.related_id || log.target_id))).reduce((sum, log) => sum + toNumber(log.cout_total ?? log.montant ?? log.cost), 0);
    const health = vaccins.filter((v) => normalizedRows.some((row) => String(row.id) === String(v.animal_id || v.related_id || v.target_id))).reduce((sum, v) => sum + toNumber(v.cout ?? v.montant ?? v.cost), 0);
    const invested = normalizedRows.reduce((sum, row) => sum + purchaseCost(row), 0) + feeding + health;
    const revenue = normalizedRows.reduce((sum, row) => sum + salePrice(row), 0);
    return { active, sick, sold, feeding, health, invested, revenue, margin: revenue - invested };
  }, [normalizedRows, alimentationLogs, vaccins]);

  const initialValues = useMemo(() => {
    const id = generateSequentialId('animaux', normalizedRows, { type: species });
    const date = today();
    return { id, tag: id, type: species, espece: species, status: 'actif', health_status: 'sain', mode_acquisition: 'achat', date_achat: date, date_entree_ferme: date, date_poids_entree: date, sexe: 'F', sale_price: 0 };
  }, [normalizedRows, species]);

  const prepare = (payload = {}) => ({ ...payload, type: species, espece: species, categorie: species, health_status: payload.health_status || payload.sante || 'sain', status: payload.status || payload.statut || 'actif' });

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate?.(prepare(payload)); await onRefresh?.(); toast.success(`${species} ajouté`); setModal(null); }
    catch (error) { toast.error(error.message || 'Création impossible'); }
    finally { setSaving(false); }
  };
  const submitEdit = async (payload) => {
    if (!selected) return;
    try { setSaving(true); await onUpdate?.(selected.id, prepare(payload)); await onRefresh?.(); toast.success(`${species} modifié`); setModal(null); }
    catch (error) { toast.error(error.message || 'Modification impossible'); }
    finally { setSaving(false); }
  };
  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete?.(selected.id); await onRefresh?.(); toast.success(`${species} supprimé`); setModal(null); }
    catch (error) { toast.error(error.message || 'Suppression impossible'); }
    finally { setSaving(false); }
  };

  const exportRows = () => {
    exportToCsv({ rows: filtered, fileName: `animaux-${species}.csv` });
    exportToExcel({ rows: filtered, fileName: `animaux-${species}.xlsx`, sheetName: species });
    exportToPdf({ rows: filtered, title: `Liste ${speciesPlural(species)}`, fileName: `animaux-${species}.pdf` });
    toast.success('Exports générés');
  };

  const columns = [
    { key: 'id', label: 'ID', sortable: true, render: (row) => <span className="font-mono text-emerald-700 text-xs">{row.tag || row.id}</span> },
    { key: 'name', label: 'Nom', sortable: true, render: (row) => <span className="font-bold text-[#2f2415]">{row.name || row.nom || row.id}</span> },
    { key: 'type', label: 'Espèce', render: () => species },
    { key: 'poids', label: 'Poids', render: (row) => `${row.poids || row.weight || 0} kg` },
    { key: 'health_status', label: 'Santé', render: (row) => healthOf(row) },
    { key: 'status', label: 'Statut', render: (row) => statusOf(row) },
    { key: 'cost', label: 'Coût achat', render: (row) => fmtCurrency(purchaseCost(row)) },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6">
    <SectionHeader title={`Gestion des ${speciesPlural(species)}`} sub={`${speciesPlural(species)} uniquement : croissance, santé, alimentation et rentabilité`} actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {species}</Btn></>} />

    <AnimalHealthBridge rows={normalizedRows} alimentationLogs={alimentationLogs} vaccins={vaccins} onUpdate={onUpdate} onRefresh={onRefresh} />

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <KpiCard icon={CheckCircle} label="Actifs" value={summary.active.length} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={AlertTriangle} label="À suivre" value={summary.sick.length} color="bg-amber-500/20 text-amber-500" />
      <KpiCard icon={CheckCircle} label="Vendus" value={summary.sold.length} color="bg-sky-500/20 text-sky-500" />
      <KpiCard icon={CheckCircle} label="Alimentation" value={fmtCurrency(summary.feeding)} color="bg-emerald-500/20 text-emerald-500" />
      <KpiCard icon={CheckCircle} label="Santé" value={fmtCurrency(summary.health)} color="bg-emerald-500/20 text-emerald-500" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <MiniMetric label="Coût total suivi" value={fmtCurrency(summary.invested)} />
      <MiniMetric label="Revenus saisis" value={fmtCurrency(summary.revenue)} />
      <MiniMetric label="Marge suivie" value={fmtCurrency(summary.margin)} danger={summary.margin < 0} />
    </div>

    <div className="flex flex-wrap gap-2">
      {['tous', 'actif', 'pret_a_la_vente', 'reserve', 'vendu', 'mort', 'vole', 'reforme'].map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm capitalize ${statusFilter === status ? 'bg-emerald-500 text-black font-semibold' : 'bg-white border border-[#d6c3a0] text-[#8a7456]'}`}>{status.replaceAll('_', ' ')}</button>)}
      {['tous', 'sain', 'malade', 'blesse', 'sous_traitement', 'a_surveiller'].map((status) => <button key={status} type="button" onClick={() => setHealthFilter(status)} className={`px-3 py-2 rounded-lg text-sm capitalize ${healthFilter === status ? 'bg-sky-500 text-black font-semibold' : 'bg-white border border-[#d6c3a0] text-[#8a7456]'}`}>{status.replaceAll('_', ' ')}</button>)}
    </div>

    <DataTable title={`Liste ${speciesPlural(species)}`} rows={filtered} columns={columns} loading={loading} initialSortKey="id" searchPlaceholder={`Recherche ${speciesPlural(species).toLowerCase()}...`} />

    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title={`Détail ${species}`} />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.animaux} initialValues={initialValues} loading={saving} title={`Ajouter ${species}`} submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.animaux} initialValues={selected || {}} loading={saving} title={`Modifier ${species}`} submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? selected.name || selected.nom || selected.id : ''} loading={saving} />
  </div>;
}

function MiniMetric({ label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-white'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>;
}
