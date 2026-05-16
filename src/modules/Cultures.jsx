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

const today = () => new Date().toISOString().slice(0, 10);
const dayDiff = (date) => date ? Math.ceil((new Date(date) - new Date()) / 86400000) : null;
const isClosed = (row = {}) => ['termine', 'terminé', 'perdu', 'vendu'].includes(String(row.statut || '').toLowerCase());
const isHarvestSoon = (row = {}) => { const days = dayDiff(row.date_recolte_prevue); return days !== null && days >= 0 && days <= 21; };
const isRisky = (row = {}) => { const metrics = calculateCultureMetrics(row); return metrics.healthScore < 80 || metrics.lossRate > 10 || row.statut === 'perdu'; };
const viewOptions = [
  { key: 'toutes', label: 'Toutes', help: 'Vue complète' },
  { key: 'actives', label: 'Actives', help: 'Cultures en cours' },
  { key: 'recolte', label: 'À récolter', help: 'Récoltes proches' },
  { key: 'risque', label: 'À risque', help: 'Santé / pertes' },
];

function filterRows(rows = [], view) {
  if (view === 'actives') return rows.filter((row) => !isClosed(row));
  if (view === 'recolte') return rows.filter(isHarvestSoon);
  if (view === 'risque') return rows.filter(isRisky);
  return rows;
}

function cultureRecommendation(row = {}) {
  const metrics = calculateCultureMetrics(row);
  const days = dayDiff(row.date_recolte_prevue);
  if (row.statut === 'perdu') return 'Analyser la cause de perte avant de relancer cette parcelle.';
  if (metrics.healthScore < 80) return 'Priorité : vérifier eau, ravageurs, maladies et fertilisation.';
  if (metrics.lossRate > 10) return 'Pertes élevées : contrôler récolte, conservation et débouché client.';
  if (days !== null && days >= 0 && days <= 7) return 'Récolte imminente : préparer clients, emballages, transport et prix de vente.';
  if (days !== null && days <= 21) return 'Récolte proche : confirmer débouchés et éviter une vente en urgence.';
  return 'Suivi normal : maintenir arrosage, fertilisation et observation parcelle.';
}

export default function Cultures({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [view, setView] = useState('actives');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const scopedRows = useMemo(() => filterRows(rows, view), [rows, view]);

  const analytics = useMemo(() => {
    const totalSurface = scopedRows.reduce((sum, row) => sum + Number(row.surface || 0), 0);
    const revenuPrevu = scopedRows.reduce((sum, row) => sum + Number(row.revenu_estime || 0), 0);
    const margePrevue = scopedRows.reduce((sum, row) => sum + calculateCultureMetrics(row).marginEstimated, 0);
    const coutTotal = scopedRows.reduce((sum, row) => sum + calculateCultureMetrics(row).costTotal, 0);
    const risques = scopedRows.filter(isRisky).length;
    const recoltesProches = scopedRows.filter(isHarvestSoon).length;
    return { totalSurface, revenuPrevu, margePrevue, coutTotal, risques, recoltesProches };
  }, [scopedRows]);

  const chartData = useMemo(() => scopedRows.map((row) => {
    const metrics = calculateCultureMetrics(row);
    return { nom: row.type || row.nom, marge: metrics.marginEstimated || metrics.marginReal, rendement: metrics.rendement };
  }), [scopedRows]);

  const createFields = useMemo(() => [
    { key: 'section_initiale', label: 'Création culture', type: 'section', description: 'Saisie initiale simple. Le suivi détaillé se fait ensuite via Modifier.' },
    { key: 'id', label: 'Identifiant', type: 'text', required: true },
    { key: 'nom', label: 'Nom culture', type: 'text', required: true },
    { key: 'type', label: 'Type / variété', type: 'text', required: true },
    { key: 'parcelle', label: 'Parcelle', type: 'text', required: true },
    { key: 'surface', label: 'Surface (m²)', type: 'number', required: true },
    { key: 'date_semis', label: 'Date semis / plantation', type: 'date', required: true },
    { key: 'date_recolte_prevue', label: 'Date récolte prévue', type: 'date' },
    { key: 'cout_intrants', label: 'Coût intrants prévu', type: 'number' },
    { key: 'revenu_estime', label: 'Revenu estimé', type: 'number' },
    { key: 'statut', label: 'Statut initial', type: 'select', options: [{ value: 'semis', label: 'Semis' }, { value: 'croissance', label: 'Croissance' }, { value: 'floraison', label: 'Floraison' }] },
    { key: 'notes', label: 'Notes initiales', type: 'textarea', rows: 3, fullWidth: true },
  ], []);

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
    const enrichedRows = scopedRows.map((row) => ({ ...row, ...calculateCultureMetrics(row), recommandation_ia: cultureRecommendation(row) }));
    exportToCsv({ rows: enrichedRows, fileName: `cultures-${view}.csv` });
    exportToExcel({ rows: enrichedRows, fileName: `cultures-${view}.xlsx`, sheetName: 'Cultures' });
    exportToPdf({ rows: enrichedRows, title: 'Cultures maraicheres', fileName: `cultures-${view}.pdf` });
    toast.success('Exports cultures générés');
  };

  const columns = [
    { key: 'id', label: 'ID', sortable: true, render: (row) => <span className="font-mono text-emerald-600">{row.id}</span> },
    { key: 'nom', label: 'Culture', sortable: true, render: (row) => <div><p className="font-black text-[#2f2415]">{row.nom}</p><p className="text-xs text-[#8a7456]">{row.type || 'variété non précisée'}</p></div> },
    { key: 'parcelle', label: 'Parcelle', sortable: true },
    { key: 'surface', label: 'Surface', sortable: true, render: (row) => `${fmtNumber(row.surface)} m²` },
    { key: 'date_recolte_prevue', label: 'Récolte prévue', sortable: true, render: (row) => { const days = dayDiff(row.date_recolte_prevue); return <div><p className="font-bold text-[#2f2415]">{row.date_recolte_prevue || '—'}</p><p className="text-xs text-[#8a7456]">{days === null ? 'date à renseigner' : days < 0 ? 'date dépassée' : `dans ${days} j`}</p></div>; } },
    { key: 'cout_total_auto', label: 'Coût auto', sortable: true, render: (row) => fmtCurrency(calculateCultureMetrics(row).costTotal) },
    { key: 'rendement', label: 'Rendement', sortable: true, render: (row) => `${calculateCultureMetrics(row).rendement.toFixed(2)} u/m²` },
    { key: 'marge_estimee', label: 'Marge est.', sortable: true, render: (row) => <span className="font-semibold text-emerald-600">{fmtCurrency(calculateCultureMetrics(row).marginEstimated)}</span> },
    { key: 'score_sante_auto', label: 'Santé', sortable: true, render: (row) => `${calculateCultureMetrics(row).healthScore.toFixed(0)}%` },
    { key: 'statut', label: 'Statut', render: (row) => <Badge status={row.statut} /> },
    { key: 'reco', label: 'Reco IA', render: (row) => <span className="text-xs text-[#7d6a4a]">{cultureRecommendation(row)}</span> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier / suivre" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Printer} title="Imprimer" color="sky" onClick={() => window.print()} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6">
    <SectionHeader title="Cultures & Maraîchage" sub="Vue claire par état : actives, récolte proche, risques et suivi détaillé" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter culture</Btn></>} />

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {viewOptions.map((option) => <button key={option.key} type="button" onClick={() => setView(option.key)} className={`rounded-2xl border px-4 py-3 text-left transition-all ${view === option.key ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Vue</p><p className="font-black">{option.label}</p><p className="text-xs opacity-75">{option.help} · {filterRows(rows, option.key).length}</p></button>)}
    </div>

    <div className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Vue active</p><p className="mt-1 text-xl font-black text-[#2f2415]">{viewOptions.find((item) => item.key === view)?.label}</p><p className="mt-1 text-sm text-[#8a7456]">Tout ce qui suit concerne uniquement cette vue : KPI, graphe, recommandations et tableau.</p></div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <KpiCard icon={Sprout} label="Cultures affichées" value={scopedRows.length} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={Leaf} label="Surface" value={`${fmtNumber(analytics.totalSurface)} m²`} color="bg-sky-500/20 text-sky-400" />
      <KpiCard icon={TrendingUp} label="Revenu prévu" value={fmtCurrency(analytics.revenuPrevu)} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={TrendingUp} label="Coût auto" value={fmtCurrency(analytics.coutTotal)} color="bg-red-500/20 text-red-400" />
      <KpiCard icon={AlertTriangle} label="À risque" value={analytics.risques} color="bg-red-500/20 text-red-400" />
      <KpiCard icon={Calendar} label="Récoltes proches" value={analytics.recoltesProches} color="bg-amber-500/20 text-amber-400" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Marge par culture · {viewOptions.find((item) => item.key === view)?.label}</p><ResponsiveContainer width="100%" height={220}><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" /><XAxis dataKey="nom" stroke="#8a7456" fontSize={11} /><YAxis stroke="#8a7456" fontSize={11} /><Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #b6975f', borderRadius: 8 }} /><Bar dataKey="marge" fill="#22c55e" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
      <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Recommandations cultures</p><div className="space-y-3 text-sm text-[#7d6a4a]">{scopedRows.slice(0, 4).map((row) => <div key={row.id} className="flex gap-2"><Waves size={15} className="text-sky-500 shrink-0" /><span><b>{row.nom || row.id}</b> · {cultureRecommendation(row)}</span></div>)}{!scopedRows.length ? <div className="flex gap-2"><Leaf size={15} className="text-emerald-500 shrink-0" />Aucune culture dans cette vue.</div> : null}</div></div>
    </div>

    <DataTable title={`Planning et suivi cultures · ${viewOptions.find((item) => item.key === view)?.label}`} rows={scopedRows} columns={columns} loading={loading} initialSortKey="date_recolte_prevue" searchPlaceholder="Rechercher culture, parcelle..." />

    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...calculateCultureMetrics(selected), recommandation_ia: cultureRecommendation(selected) } : selected} title="Fiche culture" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => submit(onCreate, payload, 'Culture ajoutée')} fields={createFields} initialValues={{ id: generateSequentialId('cultures', rows), statut: 'semis', date_semis: today() }} autoId={() => generateSequentialId('cultures', rows)} uploadFolder="cultures" loading={saving} title="Ajouter culture" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && submit((data) => onUpdate(selected.id, data), payload, 'Culture modifiée')} fields={MODULE_FORM_FIELDS.cultures} initialValues={selected || {}} uploadFolder="cultures" loading={saving} title="Modifier / suivre culture" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && submit(() => onDelete(selected.id), null, 'Culture supprimée')} itemLabel={selected?.nom || ''} loading={saving} />
  </div>;
}
