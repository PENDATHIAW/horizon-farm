import { ArrowDown, ArrowUp, Download, Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const hasAmount = (row = {}) => Math.abs(amount(row)) > 0;
const status = (row = {}) => String(row.statut ?? row.status ?? 'paye').toLowerCase();
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const today = () => new Date().toISOString().slice(0, 10);

const activityLabels = {
  animaux: 'Animaux',
  avicole: 'Avicole',
  cultures: 'Cultures',
  sante: 'Santé',
  stock: 'Stock / achats',
  fournisseurs: 'Fournisseurs',
  investissements: 'Investissements',
  autres_charges: 'Autres charges',
  autres_revenus: 'Autres revenus',
};

function detectActivity(row = {}) {
  const text = `${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.libelle || ''}`.toLowerCase();
  if (text.includes('animal') || text.includes('bovin') || text.includes('ovin') || text.includes('caprin')) return 'animaux';
  if (text.includes('avicole') || text.includes('poulet') || text.includes('pondeuse') || text.includes('chair') || text.includes('œuf') || text.includes('oeuf')) return 'avicole';
  if (text.includes('culture') || text.includes('récolte') || text.includes('recolte') || text.includes('semence') || text.includes('engrais')) return 'cultures';
  if (text.includes('sant') || text.includes('vaccin') || text.includes('veto') || text.includes('véto')) return 'sante';
  if (text.includes('stock') || text.includes('aliment') || text.includes('achat')) return 'stock';
  if (text.includes('fournisseur')) return 'fournisseurs';
  if (text.includes('invest')) return 'investissements';
  return isIn(row) ? 'autres_revenus' : 'autres_charges';
}

function buildFields(businessPlans = []) {
  const bpOptions = arr(businessPlans).map((bp) => ({ value: bp.id, label: bp.nom || bp.name || bp.id }));
  return (MODULE_FORM_FIELDS.finances || []).map((field) => {
    if (field.key === 'business_plan_id' && bpOptions.length) return { ...field, type: 'select', options: [{ value: '', label: '— Aucun —' }, ...bpOptions] };
    return field;
  });
}

export default function FinanceTransactionsOnly({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh, businessPlans = [] }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const validRows = useMemo(() => arr(rows).filter(hasAmount), [rows]);
  const financeFormFields = useMemo(() => buildFields(businessPlans), [businessPlans]);

  const save = async (action, message) => {
    try {
      setSaving(true);
      await action();
      await onRefresh?.();
      toast.success(message);
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Action impossible');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    exportToCsv({ rows: validRows, fileName: 'transactions-finances.csv' });
    exportToExcel({ rows: validRows, fileName: 'finances-horizon-farm.xlsx', sheetName: 'Transactions' });
    exportToPdf({ rows: validRows, title: 'Transactions financières Horizon Farm', fileName: 'transactions-finances.pdf' });
    toast.success('Exports finances générés');
  };

  const columns = [
    { key: 'date', label: 'Date', sortable: true },
    { key: 'libelle', label: 'Libellé', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.libelle || row.label || '-'}</span> },
    { key: 'type', label: 'Type', sortable: true, render: (row) => <span className={`inline-flex items-center gap-1 font-semibold ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{isIn(row) ? 'argent reçu' : 'argent dépensé'}</span> },
    { key: 'categorie', label: 'Activité', sortable: true, render: (row) => activityLabels[detectActivity(row)] || '-' },
    { key: 'module_lie', label: 'Module lié', sortable: true, render: (row) => row.module_lie || row.source_module || '-' },
    { key: 'montant', label: 'Montant', sortable: true, render: (row) => <span className={`font-black ${isIn(row) ? 'text-emerald-600' : 'text-red-500'}`}>{isIn(row) ? '+' : '-'}{fmtCurrency(amount(row))}</span> },
    { key: 'statut', label: 'Statut', sortable: true, render: (row) => <Badge status={row.statut || row.status || 'paye'} /> },
    { key: 'paiement', label: 'Paiement', sortable: true },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <p className="font-black text-[#2f2415]">Lignes finance manuelles</p>
        <p className="text-sm text-[#8a7456]">Table des saisies manuelles uniquement. Les dépenses et coûts suivis sont affichés dans la synthèse au-dessus.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn>
        <Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter argent reçu/dépensé</Btn>
        <Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn>
      </div>
    </div>
    <DataTable title="Lignes finance" rows={validRows} columns={columns} loading={loading} initialSortKey="date" searchPlaceholder="Rechercher libellé, catégorie, activité..." />
    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title="Détail ligne finance" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => save(() => onCreate?.({ ...payload, statut: payload.statut || 'paye' }), 'Ligne finance ajoutée')} fields={financeFormFields} initialValues={{ id: generateSequentialId('finances', rows), type: 'entree', date: today(), statut: 'paye', paiement: 'Wave' }} autoId={() => generateSequentialId('finances', rows)} uploadFolder="finances" loading={saving} title="Ajouter argent reçu / dépensé" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && save(() => onUpdate?.(selected.id, payload), 'Ligne finance modifiée')} fields={financeFormFields} initialValues={selected || {}} uploadFolder="finances" loading={saving} title="Modifier ligne finance" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && save(() => onDelete?.(selected.id), 'Ligne finance supprimée')} itemLabel={selected ? `${selected.libelle || selected.id}` : ''} loading={saving} />
  </div>;
}
