import { AlertTriangle, Calendar, CheckCircle2, Download, Edit, Eye, Leaf, Plus, RefreshCw, Sprout, Trash2, TrendingUp } from 'lucide-react';
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
import { generateSequentialId } from '../utils/ids';
import { calculateCultureMetrics } from '../utils/businessCalculations';

const tabs = ['Vue d’ensemble', 'Cultures', 'Parcelles', 'Campagnes', 'Performance'];
const today = () => new Date().toISOString().slice(0, 10);
const surfaceOf = (row = {}) => toNumber(row.surface_exploitable ?? row.surface);
const parcelKey = (row = {}) => row.parcelle_code || row.parcelle_nom || row.parcelle || 'Parcelle non renseignée';
const campaignKey = (row = {}) => row.campagne || row.saison || row.date_debut_campagne || 'Campagne non renseignée';
const costOf = (row = {}) => toNumber(row.cout_total_reel) || calculateCultureMetrics(row).costTotal || toNumber(row.budget_prevu);
const revenueOf = (row = {}) => toNumber(row.revenu_reel || row.revenu_estime || calculateCultureMetrics(row).revenueEstimated);
const marginOf = (row = {}) => toNumber(row.marge_reelle) || revenueOf(row) - costOf(row) || calculateCultureMetrics(row).marginEstimated;
const healthOf = (row = {}) => calculateCultureMetrics(row).healthScore;

const CULTURE_FIELDS = [
  { key: 'section_identification', label: 'Identification culture', type: 'section' },
  { key: 'id', label: 'ID', type: 'text', required: true },
  { key: 'nom', label: 'Nom culture', type: 'text', required: true },
  { key: 'type', label: 'Type culture', type: 'select', options: ['Poivrons', 'Tomates', 'Oignons', 'Piments', 'Aubergines', 'Maraîchage', 'Céréales', 'Autre'] },
  { key: 'parcelle', label: 'Parcelle', type: 'text' },
  { key: 'campagne', label: 'Campagne / saison', type: 'text' },
  { key: 'section_surface', label: 'Surface & calendrier', type: 'section' },
  { key: 'surface', label: 'Surface', type: 'number' },
  { key: 'unite_surface', label: 'Unité surface', type: 'select', options: ['m²', 'ha'] },
  { key: 'date_debut_campagne', label: 'Début campagne', type: 'date' },
  { key: 'date_semis', label: 'Date semis / plantation', type: 'date' },
  { key: 'date_recolte_prevue', label: 'Récolte prévue', type: 'date' },
  { key: 'section_budget', label: 'Budget, production et valeur', type: 'section' },
  { key: 'budget_prevu', label: 'Budget prévu', type: 'number' },
  { key: 'cout_semences', label: 'Coût semences', type: 'number' },
  { key: 'cout_engrais', label: 'Coût engrais', type: 'number' },
  { key: 'cout_eau', label: 'Coût eau / irrigation', type: 'number' },
  { key: 'cout_main_oeuvre', label: 'Coût main d’œuvre', type: 'number' },
  { key: 'cout_traitement', label: 'Coût traitements', type: 'number' },
  { key: 'quantite_prevue', label: 'Quantité prévue', type: 'number' },
  { key: 'quantite_recoltee', label: 'Quantité récoltée', type: 'number' },
  { key: 'revenu_estime', label: 'Revenu estimé', type: 'number' },
  { key: 'revenu_reel', label: 'Revenu réel', type: 'number' },
  { key: 'pertes', label: 'Pertes', type: 'number' },
  { key: 'statut', label: 'Statut', type: 'select', options: ['planifiee', 'semis', 'croissance', 'floraison', 'recolte', 'termine', 'perdu'] },
  { key: 'business_plan_id', label: 'Business plan lié', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
];

function aggregate(rows, keyFn) {
  const map = new Map();
  rows.forEach((row) => {
    const key = keyFn(row);
    const item = map.get(key) || { id: key, nom: key, cultures: 0, surface: 0, cout: 0, revenu: 0, marge: 0, risques: 0 };
    item.cultures += 1;
    item.surface += surfaceOf(row);
    item.cout += costOf(row);
    item.revenu += revenueOf(row);
    item.marge += marginOf(row);
    item.risques += healthOf(row) < 80 || row.statut === 'perdu' ? 1 : 0;
    map.set(key, item);
  });
  return Array.from(map.values());
}

function MiniChart({ rows }) {
  const top = rows.slice(0, 8);
  const max = Math.max(1, ...top.map((row) => Math.abs(marginOf(row))));
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><p className="font-black text-[#2f2415] mb-3">Marge par culture</p><div className="space-y-2">{top.map((row) => <div key={row.id} className="grid grid-cols-[130px_1fr_110px] gap-2 items-center text-sm"><span className="truncate text-[#7d6a4a]">{row.nom || row.type || row.id}</span><div className="h-3 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full bg-[#c9a96a]" style={{ width: `${Math.min(100, Math.abs(marginOf(row)) / max * 100)}%` }} /></div><b className={marginOf(row) >= 0 ? 'text-emerald-600 text-right' : 'text-red-500 text-right'}>{fmtCurrency(marginOf(row))}</b></div>)}</div></div>;
}

export default function CulturesV3({ rows = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [tab, setTab] = useState('Vue d’ensemble');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const parcelles = useMemo(() => aggregate(rows, parcelKey), [rows]);
  const campagnes = useMemo(() => aggregate(rows, campaignKey), [rows]);
  const analytics = useMemo(() => {
    const totalSurface = rows.reduce((sum, row) => sum + surfaceOf(row), 0);
    const totalCost = rows.reduce((sum, row) => sum + costOf(row), 0);
    const totalRevenue = rows.reduce((sum, row) => sum + revenueOf(row), 0);
    const totalMargin = rows.reduce((sum, row) => sum + marginOf(row), 0);
    const risks = rows.filter((row) => healthOf(row) < 80 || row.statut === 'perdu').length;
    const harvestSoon = rows.filter((row) => row.date_recolte_prevue && (new Date(row.date_recolte_prevue) - new Date()) / 86400000 <= 14 && (new Date(row.date_recolte_prevue) - new Date()) / 86400000 >= 0).length;
    return { totalSurface, totalCost, totalRevenue, totalMargin, risks, harvestSoon };
  }, [rows]);

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate?.(payload); toast.success('Culture ajoutée'); setModal(null); } catch (error) { toast.error(error.message || 'Création impossible'); } finally { setSaving(false); }
  };
  const submitEdit = async (payload) => {
    if (!selected) return;
    try { setSaving(true); await onUpdate?.(selected.id, payload); toast.success('Culture modifiée'); setModal(null); } catch (error) { toast.error(error.message || 'Modification impossible'); } finally { setSaving(false); }
  };
  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete?.(selected.id); toast.success('Culture supprimée'); setModal(null); } catch (error) { toast.error(error.message || 'Suppression impossible'); } finally { setSaving(false); }
  };
  const doExports = () => {
    const enriched = rows.map((row) => ({ ...row, cout_total_calcule: costOf(row), revenu_calcule: revenueOf(row), marge_calculee: marginOf(row), score_sante_calcule: healthOf(row) }));
    exportToCsv({ rows: enriched, fileName: 'cultures.csv' });
    exportToExcel({ rows: enriched, fileName: 'cultures.xlsx', sheetName: 'Cultures' });
    exportToPdf({ rows: enriched, title: 'Cultures', fileName: 'cultures.pdf' });
    toast.success('Exports cultures générés');
  };

  const cultureColumns = [
    { key: 'nom', label: 'Culture', sortable: true, render: (row) => <span className="font-black text-[#2f2415]">{row.nom || row.type || row.id}</span> },
    { key: 'parcelle', label: 'Parcelle', sortable: true, render: parcelKey },
    { key: 'campagne', label: 'Campagne', sortable: true, render: campaignKey },
    { key: 'surface', label: 'Surface', sortable: true, render: (row) => `${fmtNumber(surfaceOf(row))} ${row.unite_surface || 'm²'}` },
    { key: 'cout', label: 'Coût auto', sortable: true, render: (row) => fmtCurrency(costOf(row)) },
    { key: 'revenu', label: 'Revenu', sortable: true, render: (row) => fmtCurrency(revenueOf(row)) },
    { key: 'marge', label: 'Marge', sortable: true, render: (row) => <span className={marginOf(row) >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmtCurrency(marginOf(row))}</span> },
    { key: 'sante', label: 'Santé auto', render: (row) => `${healthOf(row).toFixed(0)}%` },
    { key: 'statut', label: 'Statut', render: (row) => <Badge status={row.statut || 'planifiee'} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];
  const aggregateColumns = [
    { key: 'nom', label: 'Nom', sortable: true, render: (row) => <span className="font-black text-[#2f2415]">{row.nom}</span> },
    { key: 'cultures', label: 'Cultures', sortable: true },
    { key: 'surface', label: 'Surface', render: (row) => `${fmtNumber(row.surface)} m²` },
    { key: 'cout', label: 'Coût', render: (row) => fmtCurrency(row.cout) },
    { key: 'revenu', label: 'Revenu', render: (row) => fmtCurrency(row.revenu) },
    { key: 'marge', label: 'Marge', render: (row) => <span className={row.marge >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{fmtCurrency(row.marge)}</span> },
    { key: 'risques', label: 'Risques', sortable: true },
  ];

  return <div className="space-y-6">
    <SectionHeader title="Cultures, Parcelles & Campagnes" sub="Pilotage végétal connecté: parcelles, campagnes, coûts, récoltes, marge et risques" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter culture</Btn></>} />
    <div className="flex flex-wrap gap-2">{tabs.map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === item ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}>{item}</button>)}</div>
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4"><KpiCard icon={Sprout} label="Cultures" value={rows.length} /><KpiCard icon={Leaf} label="Surface" value={`${fmtNumber(analytics.totalSurface)} m²`} /><KpiCard icon={TrendingUp} label="Revenu" value={fmtCurrency(analytics.totalRevenue)} /><KpiCard icon={TrendingUp} label="Marge" value={fmtCurrency(analytics.totalMargin)} /><KpiCard icon={AlertTriangle} label="Risques" value={analytics.risks} /><KpiCard icon={Calendar} label="Récoltes proches" value={analytics.harvestSoon} /></div>
    {tab === 'Vue d’ensemble' ? <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><div className="xl:col-span-2"><MiniChart rows={rows} /></div><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><p className="font-black text-[#2f2415] mb-2">Connexions cultures</p><div className="space-y-2 text-sm text-[#7d6a4a]"><p><CheckCircle2 size={14} className="inline text-emerald-600" /> Intrants et coûts viennent du Stock/Finances.</p><p><CheckCircle2 size={14} className="inline text-emerald-600" /> Récolte peut alimenter Stock/Ventes.</p><p><CheckCircle2 size={14} className="inline text-emerald-600" /> Pertes et risques alimentent Alertes/Traçabilité.</p></div></div></div> : null}
    {['Vue d’ensemble', 'Cultures', 'Performance'].includes(tab) ? <DataTable title={tab === 'Performance' ? 'Performance cultures' : 'Cultures'} rows={rows} columns={cultureColumns} loading={loading} initialSortKey="nom" searchPlaceholder="Rechercher culture, parcelle, campagne..." /> : null}
    {tab === 'Parcelles' ? <DataTable title="Parcelles dérivées" rows={parcelles} columns={aggregateColumns} loading={loading} initialSortKey="nom" /> : null}
    {tab === 'Campagnes' ? <DataTable title="Campagnes dérivées" rows={campagnes} columns={aggregateColumns} loading={loading} initialSortKey="nom" /> : null}
    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, cout_total_calcule: costOf(selected), revenu_calcule: revenueOf(selected), marge_calculee: marginOf(selected), score_sante_calcule: healthOf(selected) } : selected} title="Fiche culture" />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={CULTURE_FIELDS} initialValues={{ id: generateSequentialId('cultures', rows), statut: 'planifiee', date_debut_campagne: today(), unite_surface: 'm²' }} autoId={() => generateSequentialId('cultures', rows)} loading={saving} title="Ajouter culture" submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={CULTURE_FIELDS} initialValues={selected || {}} loading={saving} title="Modifier culture" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected?.nom || selected?.id || ''} loading={saving} />
  </div>;
}
