import { Download, Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from './ActionIconButton';
import Btn from './Btn';
import KpiCard from './KpiCard';
import SectionHeader from './SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { generateSequentialId } from '../utils/ids';

export default function GenericCrudModule({
  moduleKey,
  title,
  sub,
  rows = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  fields = [],
  columns = [],
  initialValues = {},
  kpis = [],
  uploadFolder,
  addLabel = 'Ajouter',
  exportTitle,
  readOnly = false,
}) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const visibleColumns = columns.length ? columns : fields.slice(0, 5).map((field) => field.key);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => visibleColumns.some((column) => String(row[column] ?? '').toLowerCase().includes(query)));
  }, [rows, search, visibleColumns]);

  const defaults = useMemo(() => ({ id: generateSequentialId(moduleKey, rows), ...initialValues }), [moduleKey, rows, initialValues]);

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate?.(payload);
      toast.success('Element ajoute');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Creation impossible');
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate?.(selected.id, payload);
      toast.success('Element modifie');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Modification impossible');
    } finally {
      setSaving(false);
    }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete?.(selected.id);
      toast.success('Element supprime');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Suppression impossible');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    exportToCsv({ rows: filteredRows, fileName: `${moduleKey}.csv` });
    exportToExcel({ rows: filteredRows, fileName: `${moduleKey}.xlsx`, sheetName: exportTitle || title });
    exportToPdf({ rows: filteredRows, title: exportTitle || title, fileName: `${moduleKey}.pdf` });
    toast.success('Exports generes');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={title}
        sub={sub}
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn>
            {!readOnly ? <Btn icon={Plus} small onClick={() => setModal('create')}>{addLabel}</Btn> : null}
          </>
        }
      />

      {kpis.length ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </div>
      ) : null}

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher..."
          className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-xl px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#c9a96a]"
        />
      </div>

      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#fffdf8] border-b border-[#e7d9be]">
                {visibleColumns.map((column) => <th key={column} className="text-left text-xs text-[#8a7456] uppercase px-4 py-3">{column}</th>)}
                <th className="text-left text-xs text-[#8a7456] uppercase px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, index) => (
                <tr key={index}><td colSpan={visibleColumns.length + 1} className="px-4 py-4"><div className="h-3 rounded bg-[#d6c3a0]/60 animate-pulse" /></td></tr>
              )) : null}
              {!loading && filteredRows.length === 0 ? (
                <tr><td colSpan={visibleColumns.length + 1} className="px-4 py-8 text-center text-[#8a7456]">Aucune donnee.</td></tr>
              ) : null}
              {!loading ? filteredRows.map((row) => (
                <tr key={row.id} className="border-b border-[#e7d9be]/70 hover:bg-[#fffdf8]">
                  {visibleColumns.map((column) => <td key={column} className="px-4 py-3 text-[#2f2415] max-w-[220px] truncate">{String(row[column] ?? '-')}</td>)}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} />
                      {!readOnly ? <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /> : null}
                      {!readOnly ? <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /> : null}
                    </div>
                  </td>
                </tr>
              )) : null}
            </tbody>
          </table>
        </div>
      </div>

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected} title={title} />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={fields} initialValues={defaults} autoId={() => generateSequentialId(moduleKey, rows)} uploadFolder={uploadFolder || moduleKey} loading={saving} title={addLabel} submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={fields} initialValues={selected || {}} uploadFolder={uploadFolder || moduleKey} loading={saving} title={`Modifier ${title}`} submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? String(selected.name || selected.nom || selected.libelle || selected.title || selected.id) : ''} loading={saving} />
    </div>
  );
}

