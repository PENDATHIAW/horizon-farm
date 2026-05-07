import { AlertTriangle, Calendar, Download, Edit, Eye, Leaf, Plus, Printer, RefreshCw, Sprout, TrendingUp, Trash2, Waves } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { calculateCultureMetrics } from '../utils/businessCalculations';

export default function Cultures({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const analytics = useMemo(() => {
    const totalSurface = rows.reduce((sum, row) => sum + Number(row.surface || 0), 0);
    const revenuPrevu = rows.reduce((sum, row) => sum + Number(row.revenu_estime || 0), 0);
    const margePrevue = rows.reduce((sum, row) => sum + calculateCultureMetrics(row).marginEstimated, 0);
    const coutTotal = rows.reduce((sum, row) => sum + calculateCultureMetrics(row).costTotal, 0);
    const risques = rows.filter((row) => {
      const metrics = calculateCultureMetrics(row);
      return metrics.healthScore < 80 || metrics.lossRate > 10 || row.statut === 'perdu';
    }).length;
    const recoltesProches = rows.filter((row) => {
      if (!row.date_recolte_prevue) return false;
      const days = (new Date(row.date_recolte_prevue) - new Date()) / 86400000;
      return days >= 0 && days <= 14;
    }).length;
    return { totalSurface, revenuPrevu, margePrevue, coutTotal, risques, recoltesProches };
  }, [rows]);

  const chartData = useMemo(
    () => rows.map((row) => {
      const metrics = calculateCultureMetrics(row);
      return { nom: row.type || row.nom, marge: metrics.marginEstimated || metrics.marginReal, rendement: metrics.rendement };
    }),
    [rows]
  );

  const submit = async (handler, payload, success) => {
    try {
      setSaving(true);
      await handler(payload);
      toast.success(success);
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Action impossible');
    } finally {
      setSaving(false);
    }
  };

  const doExports = () => {
    const enrichedRows = rows.map((row) => ({ ...row, ...calculateCultureMetrics(row) }));
    exportToCsv({ rows: enrichedRows, fileName: 'cultures.csv' });
    exportToExcel({ rows: enrichedRows, fileName: 'cultures.xlsx', sheetName: 'Cultures' });
    exportToPdf({ rows: enrichedRows, title: 'Cultures maraicheres', fileName: 'cultures.pdf' });
    toast.success('Exports cultures generes');
  };

  const columns = [
    { key: 'id', label: 'ID', sortable: true, render: (row) => <span className="font-mono text-emerald-400">{row.id}</span> },
    { key: 'nom', label: 'Culture', sortable: true, render: (row) => <span className="font-semibold text-[#2f2415]">{row.nom}</span> },
    { key: 'parcelle', label: 'Parcelle', sortable: true },
    { key: 'surface', label: 'Surface', sortable: true, render: (row) => `${fmtNumber(row.surface)} m2` },
    { key: 'cout_total_auto', label: 'Cout total auto', sortable: true, render: (row) => fmtCurrency(calculateCultureMetrics(row).costTotal) },
    { key: 'rendement', label: 'Rendement auto', sortable: true, render: (row) => `${calculateCultureMetrics(row).rendement.toFixed(2)} u/m2` },
    { key: 'marge_estimee', label: 'Marge est. auto', sortable: true, render: (row) => <span className="font-semibold text-emerald-400">{fmtCurrency(calculateCultureMetrics(row).marginEstimated)}</span> },
    { key: 'pertes_auto', label: 'Pertes', sortable: true, render: (row) => `${calculateCultureMetrics(row).lossRate.toFixed(1)}%` },
    { key: 'score_sante_auto', label: 'Score sante auto', sortable: true, render: (row) => `${calculateCultureMetrics(row).healthScore.toFixed(0)}%` },
    { key: 'statut', label: 'Statut', render: (row) => <Badge status={row.statut} /> },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex gap-1">
          <ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} />
          <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} />
          <ActionIconButton icon={Printer} title="Imprimer" color="sky" onClick={() => window.print()} />
          <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Cultures & Maraichage"
        sub="Production vegetale - planning cultural - rendement - rentabilite"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn>
            <Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter culture</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={Sprout} label="Cultures actives" value={rows.filter((row) => !['termine', 'perdu'].includes(row.statut)).length} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={Leaf} label="Surface totale" value={`${fmtNumber(analytics.totalSurface)} m2`} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={TrendingUp} label="Revenu prevu" value={fmtCurrency(analytics.revenuPrevu)} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={TrendingUp} label="Cout cultures auto" value={fmtCurrency(analytics.coutTotal)} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={AlertTriangle} label="Cultures a risque" value={analytics.risques} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={Calendar} label="Recoltes proches" value={analytics.recoltesProches} color="bg-amber-500/20 text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4">Marge par culture</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" />
              <XAxis dataKey="nom" stroke="#8a7456" fontSize={11} />
              <YAxis stroke="#8a7456" fontSize={11} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #b6975f', borderRadius: 8 }} />
              <Bar dataKey="marge" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4">Recommandations cultures</p>
          <div className="space-y-3 text-sm text-[#7d6a4a]">
            <div className="flex gap-2"><Waves size={15} className="text-sky-400 shrink-0" />Augmenter l'arrosage des cultures en floraison.</div>
            <div className="flex gap-2"><Leaf size={15} className="text-emerald-400 shrink-0" />Programmer fertilisation sur parcelles a rendement faible.</div>
            <div className="flex gap-2"><AlertTriangle size={15} className="text-amber-400 shrink-0" />Surveiller pertes superieures a 10%.</div>
          </div>
        </div>
      </div>

      <DataTable title="Planning et suivi cultures" rows={rows} columns={columns} loading={loading} initialSortKey="date_recolte_prevue" searchPlaceholder="Rechercher culture, parcelle..." />

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...calculateCultureMetrics(selected) } : selected} title="Fiche culture" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => submit(onCreate, payload, 'Culture ajoutee')} fields={MODULE_FORM_FIELDS.cultures} initialValues={{ id: generateSequentialId('cultures', rows), statut: 'semis' }} autoId={() => generateSequentialId('cultures', rows)} uploadFolder="cultures" loading={saving} title="Ajouter culture" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && submit((data) => onUpdate(selected.id, data), payload, 'Culture modifiee')} fields={MODULE_FORM_FIELDS.cultures} initialValues={selected || {}} uploadFolder="cultures" loading={saving} title="Modifier culture" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && submit(() => onDelete(selected.id), null, 'Culture supprimee')} itemLabel={selected?.nom || ''} loading={saving} />
    </div>
  );
}
