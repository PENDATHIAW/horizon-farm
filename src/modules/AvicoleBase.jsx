import { Download, Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { calculateAvicoleLotMetrics } from '../utils/businessCalculations';
import { filterLotsByActivity } from '../utils/avicoleActivity';

const tabs = ['Tous', 'Pondeuse', 'Chair'];
const today = () => new Date().toISOString().slice(0, 10);
const activeCount = (lot = {}) => Math.max(0, toNumber(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count) - toNumber(lot.mortality) - toNumber(lot.vendus) - toNumber(lot.reformes) - toNumber(lot.sorties));

function ageDays(lot = {}) {
  const start = lot.date_debut || lot.entry_date || lot.date_entree;
  if (!start) return 0;
  const diff = Date.now() - new Date(start).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function phaseFor(lot = {}) {
  if (lot.phase) return lot.phase;
  const age = ageDays(lot);
  if (lot.type === 'Chair') return age >= 30 ? 'Finition / vente possible' : 'Croissance';
  if (age >= 540) return 'Fin de ponte / réforme';
  if (age >= 150) return 'En ponte';
  return 'Croissance';
}

function readinessLabel(lot = {}) {
  const age = ageDays(lot);
  const weight = toNumber(lot.weight_avg ?? lot.average_weight);
  if (lot.type === 'Chair') {
    if (age >= 30 && weight >= 1.5) return 'Prêt recommandé';
    if (age >= 30) return 'À surveiller poids';
    return 'Non prêt';
  }
  if (age >= 540 || ['a_reformer', 'pret_a_vendre_reforme'].includes(lot.status)) return 'Réforme possible';
  return 'Non prêt';
}

export default function AvicoleBase({
  rows = [],
  alimentationLogs = [],
  productionLogs = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onCreateProduction,
  onRefreshProduction,
}) {
  const [tab, setTab] = useState('Tous');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const lots = useMemo(() => tab === 'Tous' ? rows : filterLotsByActivity(rows, tab), [rows, tab]);
  const totalEffectif = lots.reduce((sum, lot) => sum + activeCount(lot), 0);
  const morts = lots.reduce((sum, lot) => sum + toNumber(lot.mortality), 0);
  const malades = lots.reduce((sum, lot) => sum + toNumber(lot.malades), 0);
  const prets = lots.filter((lot) => readinessLabel(lot).toLowerCase().includes('prêt') || readinessLabel(lot).toLowerCase().includes('réforme')).length;
  const coutAlim = lots.reduce((sum, lot) => sum + calculateAvicoleLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs }).feedingCost, 0);

  const initialLot = useMemo(() => {
    const type = tab === 'Chair' ? 'Chair' : 'Pondeuse';
    const id = generateSequentialId('avicole', rows, { type });
    return { id, name: `${id} ${type}`, type, status: 'actif', health_status: 'sain', date_debut: today(), entry_date: today(), initial_count: 0, mortality: 0, malades: 0, weight_avg: 0, duree_cycle_unite: type === 'Chair' ? 'jours' : 'mois', duree_cycle_valeur: type === 'Chair' ? 45 : 18 };
  }, [rows, tab]);

  const prepareLot = (payload) => {
    const current = Math.max(0, toNumber(payload.initial_count) - toNumber(payload.mortality) - toNumber(payload.vendus) - toNumber(payload.reformes) - toNumber(payload.sorties));
    return { ...payload, current_count: current, phase: phaseFor(payload), date_debut: payload.date_debut || payload.entry_date || today(), entry_date: payload.entry_date || payload.date_debut || today() };
  };

  const submitCreate = async (payload) => { try { setSaving(true); await onCreate?.(prepareLot(payload)); toast.success('Lot avicole ajouté'); setModal(null); } catch (e) { toast.error(e.message || 'Création impossible'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate?.(selected.id, prepareLot(payload)); toast.success('Lot mis à jour'); setModal(null); } catch (e) { toast.error(e.message || 'Modification impossible'); } finally { setSaving(false); } };
  const confirmDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete?.(selected.id); toast.success('Lot supprimé'); setModal(null); } catch (e) { toast.error(e.message || 'Suppression impossible'); } finally { setSaving(false); } };

  const addEggEntry = async () => {
    const lot = rows.find((item) => item.type === 'Pondeuse');
    if (!lot) return toast.error('Aucun lot pondeuse disponible');
    try {
      await onCreateProduction?.({ id: `PROD-${Date.now()}`, lot_id: lot.id, lot_name: lot.name || lot.id, date: today(), oeufs_produits: 0, oeufs_casses: 0 });
      await onRefreshProduction?.();
      toast.success('Ligne œufs ajoutée');
    } catch (e) { toast.error(e.message || 'Ajout production impossible'); }
  };

  const exportRows = () => {
    const fileName = `avicole-${tab.toLowerCase()}`;
    exportToCsv({ rows: lots, columns: ['id', 'name', 'type', 'phase', 'initial_count', 'current_count', 'mortality', 'malades', 'weight_avg', 'status'], fileName: `${fileName}.csv` });
    exportToExcel({ rows: lots, fileName: `${fileName}.xlsx`, sheetName: 'Avicole' });
    exportToPdf({ rows: lots, columns: ['id', 'name', 'type', 'initial_count', 'current_count', 'status'], fileName: `${fileName}.pdf`, title: 'Lots avicoles' });
    toast.success('Exports générés');
  };

  const columns = [
    { key: 'name', label: 'Lot', sortable: true, render: (lot) => <div><p className="font-black text-[#2f2415]">{lot.name || lot.id}</p><p className="text-xs text-[#8a7456]">{lot.id}</p></div> },
    { key: 'type', label: 'Type', render: (lot) => lot.type },
    { key: 'phase', label: 'Phase', render: (lot) => phaseFor(lot) },
    { key: 'age', label: 'Âge', render: (lot) => `${ageDays(lot)} j` },
    { key: 'effectif', label: 'Effectif', render: (lot) => <span className="font-bold">{fmtNumber(activeCount(lot))}</span> },
    { key: 'morts', label: 'Morts / malades', render: (lot) => `${fmtNumber(lot.mortality || 0)} / ${fmtNumber(lot.malades || 0)}` },
    { key: 'weight_avg', label: 'Poids moy.', render: (lot) => lot.type === 'Chair' ? `${toNumber(lot.weight_avg ?? lot.average_weight).toFixed(2)} kg` : '—' },
    { key: 'readiness', label: 'Décision vente', render: (lot) => readinessLabel(lot) },
    { key: 'status', label: 'Statut', render: (lot) => <Badge status={lot.status || 'actif'} /> },
    { key: 'actions', label: 'Actions', render: (lot) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(lot); setModal('view'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(lot); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(lot); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6">
    <SectionHeader title="Avicole" sub="Lots de chair et pondeuses, santé, production et décision de vente" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} variant="outline" small onClick={addEggEntry}>Œufs</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter lot</Btn></>} />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{tabs.map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-2xl border px-4 py-3 text-left ${tab === item ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Vue</p><p className="font-black">{item}</p></button>)}</div>
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4"><KpiCard label="Effectif actif" value={fmtNumber(totalEffectif)} /><KpiCard label="Prêts / réforme" value={prets} /><KpiCard label="Morts" value={fmtNumber(morts)} /><KpiCard label="Malades" value={fmtNumber(malades)} /><KpiCard label="Coût alim." value={fmtCurrency(coutAlim)} /></div>
    <DataTable title="Lots avicoles" rows={lots} columns={columns} loading={loading} initialSortKey="id" searchPlaceholder="Rechercher lot..." />
    {selected && modal === 'view' ? <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex justify-between gap-3"><div><p className="text-xs uppercase text-[#8a7456]">Fiche lot</p><h3 className="text-xl font-black text-[#2f2415]">{selected.name || selected.id}</h3><p className="text-sm text-[#8a7456] mt-1">{selected.type} · {phaseFor(selected)} · {readinessLabel(selected)}</p></div><Btn variant="outline" onClick={() => setModal(null)}>Fermer</Btn></div></div> : null}
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.avicole} initialValues={initialLot} autoId={(values) => generateSequentialId('avicole', rows, values)} loading={saving} title="Ajouter lot avicole" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.avicole} initialValues={selected || {}} loading={saving} title="Modifier lot avicole" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={confirmDelete} itemLabel={selected ? `${selected.name || selected.id}` : ''} loading={saving} />
  </div>;
}
