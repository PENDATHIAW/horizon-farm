import { AlertTriangle, Calendar, Download, Edit, Eye, Leaf, Plus, RefreshCw, Sprout, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import CultureFicheModal from '../components/CultureFicheModal.jsx';
import EditModal from '../modals/EditModal';
import { applyCultureDecisionDefaults, buildCultureDecisionProfile } from '../services/cultureDecisionEngine';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { calculateCultureMetrics } from '../utils/businessCalculations';
import CulturesWorkflowBridge from './CulturesWorkflowBridge.jsx';
import CulturesSaleOpportunityBridge from './CulturesSaleOpportunityBridge.jsx';
import CulturesTabActionsBridge, { getRealCultureRows } from './CulturesTabActionsBridge.jsx';

const tabs = ['Vue d’ensemble', 'Cultures', 'Parcelles', 'Campagnes', 'Performance'];
const today = () => new Date().toISOString().slice(0, 10);
const recordType = (row = {}) => String(row.record_type || row.type_fiche || 'culture').toLowerCase();
const isSupportRecord = (row = {}) => ['parcelle', 'campagne', 'performance'].includes(recordType(row));
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
  { key: 'type', label: 'Type culture', type: 'select', options: ['Poivrons', 'Tomates', 'Oignons', 'Piments', 'Aubergines', 'Pomme de terre', 'Maraîchage', 'Céréales', 'Autre'] },
  { key: 'parcelle', label: 'Parcelle', type: 'text' },
  { key: 'campagne', label: 'Campagne / saison', type: 'text' },
  { key: 'section_ia_terrain', label: 'Terrain & décision suggérée', type: 'section' },
  { key: 'localisation', label: 'Localisation', type: 'text' },
  { key: 'type_sol', label: 'Type de sol', type: 'text' },
  { key: 'eau_disponible', label: 'Eau disponible', type: 'select', options: ['bonne', 'moyenne', 'faible', 'insuffisante', 'à confirmer'] },
  { key: 'besoin_eau_reference', label: 'Besoin eau référence Horizon', type: 'readonly' },
  { key: 'sol_reference', label: 'Sol préféré référence Horizon', type: 'readonly' },
  { key: 'risque_reference', label: 'Risque référence Horizon', type: 'readonly' },
  { key: 'decision_ia_culture', label: 'Décision suggérée culture', type: 'readonly', fullWidth: true },
  { key: 'section_surface', label: 'Surface & calendrier', type: 'section' },
  { key: 'surface', label: 'Surface', type: 'number' },
  { key: 'unite_surface', label: 'Unité surface', type: 'select', options: ['m²', 'ha'] },
  { key: 'date_debut_campagne', label: 'Début campagne', type: 'date' },
  { key: 'date_semis', label: 'Date semis / plantation', type: 'date' },
  { key: 'cycle_days', label: 'Cycle estimé Horizon (jours)', type: 'number' },
  { key: 'date_recolte_prevue', label: 'Récolte prévue', type: 'date' },
  { key: 'section_budget', label: 'Budget, production et valeur', type: 'section' },
  { key: 'budget_prevu', label: 'Budget prévu', type: 'number' },
  { key: 'cout_semences', label: 'Coût semences', type: 'number' },
  { key: 'cout_engrais', label: 'Coût engrais', type: 'number' },
  { key: 'cout_eau', label: 'Coût eau / irrigation', type: 'number' },
  { key: 'cout_main_oeuvre', label: 'Coût main d’œuvre', type: 'number' },
  { key: 'cout_traitement', label: 'Coût traitements', type: 'number' },
  { key: 'rendement_attendu', label: 'Rendement attendu Horizon', type: 'number' },
  { key: 'rendement_reel', label: 'Rendement réel', type: 'number' },
  { key: 'quantite_prevue', label: 'Quantité prévue', type: 'number' },
  { key: 'quantite_recoltee', label: 'Quantité récoltée (onglet Récoltes)', type: 'readonly' },
  { key: 'quantite_disponible', label: 'Quantité disponible (calculée)', type: 'readonly' },
  { key: 'unite_recolte', label: 'Unité récolte', type: 'text' },
  { key: 'prix_vente_unitaire', label: 'Prix vente unitaire', type: 'number' },
  { key: 'marche_cible', label: 'Marché / débouché cible', type: 'text' },
  { key: 'revenu_estime', label: 'Revenu estimé', type: 'number' },
  { key: 'revenu_reel', label: 'Revenu réel', type: 'number' },
  { key: 'pertes', label: 'Pertes', type: 'number' },
  { key: 'statut', label: 'Statut', type: 'select', options: ['planifiee', 'semis', 'croissance', 'floraison', 'recolte', 'termine', 'perdu'] },
  { key: 'business_plan_id', label: 'Business plan lié', type: 'text' },
  { key: 'notes', label: 'Notes', type: 'text', fullWidth: true },
];

const PARCELLE_FIELDS = [
  { key: 'nom', label: 'Nom parcelle', type: 'text', required: true },
  { key: 'parcelle_code', label: 'Code parcelle', type: 'text' },
  { key: 'parcelle_nom', label: 'Libellé terrain', type: 'text' },
  { key: 'surface_exploitable', label: 'Surface exploitable (m²)', type: 'number' },
  { key: 'localisation', label: 'Localisation / GPS', type: 'text' },
  { key: 'type_sol', label: 'Type de sol', type: 'text' },
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
function supportRows(rows, type) { return rows.filter((row) => recordType(row) === type); }

function OperationalSummary({  realRows = [] }) {
  const risky = realRows.filter((row) => healthOf(row) < 80 || row.statut === 'perdu' || buildCultureDecisionProfile(row).priority === 'haute').slice(0, 4);
  const ready = realRows.filter((row) => toNumber(row.quantite_disponible ?? row.quantite_recoltee) > 0).slice(0, 4);
  const harvestSoon = realRows.filter((row) => row.date_recolte_prevue && (new Date(row.date_recolte_prevue) - new Date()) / 86400000 <= 14 && (new Date(row.date_recolte_prevue) - new Date()) / 86400000 >= 0).slice(0, 4);
  return <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
    <SummaryCard title="Actions prioritaires" rows={risky} empty="Aucune culture critique" render={(row) => `${row.nom || row.type || row.id} · ${buildCultureDecisionProfile(row).decision}`} tone="warning" />
    <SummaryCard title="Récoltes disponibles" rows={ready} empty="Aucune récolte disponible" render={(row) => `${row.nom || row.type || row.id} · ${fmtNumber(toNumber(row.quantite_disponible ?? row.quantite_recoltee))} ${row.unite_recolte || 'kg'}`} tone="good" />
    <SummaryCard title="Récoltes proches" rows={harvestSoon} empty="Aucune récolte proche" render={(row) => `${row.nom || row.type || row.id} · ${row.date_recolte_prevue}`} tone="neutral" />
  </div>;
}
function SummaryCard({ title, rows = [], empty, render, tone = 'neutral' }) {
  const cls = tone === 'warning' ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : tone === 'good' ? 'border-positive bg-positive-bg text-positive' : 'border-line bg-card text-slate';
  return <div className={`rounded-2xl border p-4 ${cls}`}><p className="font-semibold text-earth">{title}</p><div className="mt-3 space-y-2 text-sm">{rows.length ? rows.map((row) => <div key={row.id} className="rounded-xl bg-white/60 px-3 py-2">{render(row)}</div>) : <div className="rounded-xl bg-white/60 px-3 py-2">{empty}</div>}</div></div>;
}

export default function CulturesV3({
  rows = [],
  stocks = [],
  stockMovements = [],
  opportunities = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onCreateOpportunity,
  onUpdateOpportunity,
  onRefreshOpportunities,
  onUpdateStock,
  onRefreshStock,
  onCreateStockMovement,
  onRefreshStockMovements,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
  initialTab,
  embeddedMode = false,
  showWorkflowBridge = true,
  showSaleBridge = true,
}) {
  const [tab, setTab] = useState(() => {
    const tabs = ['Vue d\u2019ensemble', 'Cultures', 'Parcelles', 'Campagnes', 'Performance'];
    const t = String(initialTab || '').trim();
    return tabs.includes(t) ? t : 'Vue d\u2019ensemble';
  });
  useEffect(() => {
    if (!initialTab) return;
    const tabs = ['Vue d\u2019ensemble', 'Cultures', 'Parcelles', 'Campagnes', 'Performance'];
    const t = String(initialTab).trim();
    if (tabs.includes(t)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation pilotée par props.initialTab
      setTab(t);
    }
  }, [initialTab]);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const realRows = useMemo(() => getRealCultureRows(rows), [rows]);
  const parcellesAuto = useMemo(() => aggregate(realRows, parcelKey), [realRows]);
  const campagnesAuto = useMemo(() => aggregate(realRows, campaignKey), [realRows]);
  const parcelles = useMemo(() => [...supportRows(rows, 'parcelle'), ...parcellesAuto], [rows, parcellesAuto]);
  const campagnes = useMemo(() => [...supportRows(rows, 'campagne'), ...campagnesAuto], [rows, campagnesAuto]);
  const performances = useMemo(() => supportRows(rows, 'performance'), [rows]);
  const performanceRows = useMemo(() => [...performances, ...realRows], [performances, realRows]);
  const analytics = useMemo(() => {
    const totalSurface = realRows.reduce((sum, row) => sum + surfaceOf(row), 0);
    const totalCost = realRows.reduce((sum, row) => sum + costOf(row), 0);
    const totalRevenue = realRows.reduce((sum, row) => sum + revenueOf(row), 0);
    const totalMargin = realRows.reduce((sum, row) => sum + marginOf(row), 0);
    const risks = realRows.filter((row) => healthOf(row) < 80 || row.statut === 'perdu' || buildCultureDecisionProfile(row).priority === 'haute').length;
    const harvestSoon = realRows.filter((row) => row.date_recolte_prevue && (new Date(row.date_recolte_prevue) - new Date()) / 86400000 <= 14 && (new Date(row.date_recolte_prevue) - new Date()) / 86400000 >= 0).length;
    const readyForSale = realRows.filter((row) => toNumber(row.quantite_disponible ?? row.quantite_recoltee) > 0).length;
    return { totalSurface, totalCost, totalRevenue, totalMargin, risks, harvestSoon, readyForSale };
  }, [realRows]);

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate?.({ ...applyCultureDecisionDefaults(payload), record_type: 'culture' }); toast.success('Culture ajoutée · décision Horizon proposée'); setModal(null); } catch (error) { toast.error(error.message || 'Création impossible'); } finally { setSaving(false); }
  };
  const submitCreateParcelle = async (payload) => {
    try {
      setSaving(true);
      const nom = payload.nom || payload.parcelle_nom || payload.parcelle_code || 'Parcelle';
      await onCreate?.({
        id: generateSequentialId('cultures', rows),
        record_type: 'parcelle',
        type_fiche: 'parcelle',
        statut: 'active',
        nom,
        parcelle: nom,
        parcelle_nom: payload.parcelle_nom || nom,
        parcelle_code: payload.parcelle_code || '',
        surface_exploitable: payload.surface_exploitable || payload.surface || 0,
        localisation: payload.localisation || '',
        type_sol: payload.type_sol || '',
        notes: payload.notes || '',
        unite_surface: 'm²',
      });
      toast.success('Parcelle enregistrée');
      setModal(null);
    } catch (error) {
      toast.error(error.message || 'Création parcelle impossible');
    } finally {
      setSaving(false);
    }
  };
  const submitEdit = async (payload) => {
    if (!selected) return;
    if (['vendue', 'vendu', 'perdu', 'sinistre'].includes(String(selected.statut || selected.status || '').toLowerCase())) return toast.error('Fiche culture verrouillée');
    const {  ...safePayload } = payload;
    try { setSaving(true); await onUpdate?.(selected.id, applyCultureDecisionDefaults(safePayload, selected)); toast.success('Fiche modifiée · décision recalculée'); setModal(null); } catch (error) { toast.error(error.message || 'Modification impossible'); } finally { setSaving(false); }
  };
  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete?.(selected.id); toast.success('Fiche supprimée'); setModal(null); } catch (error) { toast.error(error.message || 'Suppression impossible'); } finally { setSaving(false); }
  };
  const doExports = () => {
    const enriched = rows.map((row) => ({ ...row, cout_total_calcule: costOf(row), revenu_calcule: revenueOf(row), marge_calculee: marginOf(row), score_sante_calcule: healthOf(row), decision_ia_calculee: buildCultureDecisionProfile(row).decision }));
    exportToCsv({ rows: enriched, fileName: 'cultures.csv' });
    exportToExcel({ rows: enriched, fileName: 'cultures.xlsx', sheetName: 'Cultures' });
    exportToPdf({ rows: enriched, title: 'Cultures', fileName: 'cultures.pdf' });
    toast.success('Exports cultures générés');
  };

  const cultureColumns = [
    { key: 'nom', label: 'Culture', sortable: true, render: (row) => <span className="font-semibold text-earth">{row.nom || row.type || row.id}</span> },
    { key: 'parcelle', label: 'Parcelle', sortable: true, render: parcelKey },
    { key: 'terrain', label: 'Sol / eau', render: (row) => <div><b>{row.type_sol || 'sol ?'}</b><p className="text-xs text-slate">eau {row.eau_disponible || '?'}</p></div> },
    { key: 'campagne', label: 'Campagne', sortable: true, render: campaignKey },
    { key: 'surface', label: 'Surface', sortable: true, render: (row) => `${fmtNumber(surfaceOf(row))} ${row.unite_surface || 'm²'}` },
    { key: 'recolte_prevue', label: 'Récolte prévue', render: (row) => row.date_recolte_prevue || '—' },
    { key: 'rendement', label: 'Rendement', render: (row) => `${fmtNumber(toNumber(row.rendement_reel ?? row.quantite_recoltee))} / ${fmtNumber(toNumber(row.rendement_attendu ?? row.quantite_prevue))} ${row.unite_recolte || 'kg'}` },
    { key: 'revenu', label: 'Revenu', sortable: true, render: (row) => fmtCurrency(revenueOf(row)) },
    { key: 'marge', label: 'Marge', sortable: true, render: (row) => <span className={marginOf(row) >= 0 ? 'text-positive font-semibold' : 'text-urgent font-semibold'}>{fmtCurrency(marginOf(row))}</span> },
    { key: 'decision_ia', label: 'Décision suggérée', render: (row) => { const decision = buildCultureDecisionProfile(row); return <Badge color={decision.priority === 'haute' ? 'red' : 'amber'}>{decision.decision}</Badge>; } },
    { key: 'statut', label: 'Statut', render: (row) => <Badge status={row.statut || 'planifiee'} /> },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected({ ...row, horizon_decision: buildCultureDecisionProfile(row) }); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} disabled={['vendue','vendu','perdu','sinistre'].includes(String(row.statut || row.status || '').toLowerCase())} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];
  const aggregateColumns = [
    { key: 'nom', label: 'Nom', sortable: true, render: (row) => <span className="font-semibold text-earth">{row.nom}</span> },
    { key: 'cultures', label: 'Cultures', sortable: true, render: (row) => row.cultures ?? '—' },
    { key: 'surface', label: 'Surface', render: (row) => `${fmtNumber(row.surface)} m²` },
    { key: 'cout', label: 'Coût', render: (row) => fmtCurrency(row.cout) },
    { key: 'revenu', label: 'Revenu', render: (row) => fmtCurrency(row.revenu) },
    { key: 'marge', label: 'Marge', render: (row) => <span className={toNumber(row.marge) >= 0 ? 'text-positive font-semibold' : 'text-urgent font-semibold'}>{fmtCurrency(row.marge)}</span> },
    { key: 'risques', label: 'Risques', sortable: true, render: (row) => row.risques ?? '—' },
    { key: 'actions', label: 'Actions', render: (row) => isSupportRecord(row) ? <div className="flex gap-1"><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} disabled={['vendue','vendu','perdu','sinistre'].includes(String(row.statut || row.status || '').toLowerCase())} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div> : <span className="text-xs text-slate">Auto</span> },
  ];

  return <div className="space-y-6">
    <SectionHeader title={embeddedMode ? 'Registre parcelles & cultures' : 'Cultures, Parcelles & Campagnes'} sub={embeddedMode ? 'Lecture et navigation — récoltes, intrants, pertes et ventes dans leurs onglets dédiés.' : 'Sol, eau, rendement, stade et décisions suggérées — récoltes et intrants dans leurs onglets dédiés.'} actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Refresh</Btn><Btn icon={Download} variant="outline" small onClick={doExports}>Exporter</Btn><Btn icon={Plus} variant="outline" small onClick={() => setModal('create_parcelle')}>Ajouter parcelle</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter culture</Btn></>} />
    {showWorkflowBridge ? <CulturesWorkflowBridge rows={realRows} onUpdate={onUpdate} onRefresh={onRefresh} /> : null}
    {showSaleBridge ? <CulturesSaleOpportunityBridge rows={realRows} opportunities={opportunities} onUpdate={onUpdate} onRefresh={onRefresh} onCreateOpportunity={onCreateOpportunity} onUpdateOpportunity={onUpdateOpportunity} onRefreshOpportunities={onRefreshOpportunities} onCreateBusinessEvent={onCreateBusinessEvent} onRefreshBusinessEvents={onRefreshBusinessEvents} /> : null}
    {embeddedMode ? null : <div className="flex flex-wrap gap-2">{tabs.map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-xl border px-4 py-2 text-sm font-semibold ${tab === item ? 'bg-earth text-white border-earth' : 'bg-white text-slate border-line'}`}>{item}</button>)}</div>}
    {embeddedMode ? null : <CulturesTabActionsBridge tab={tab} rows={rows} stocks={stocks} stockMovements={stockMovements} onCreate={onCreate} onUpdate={onUpdate} onDelete={onDelete} onRefresh={onRefresh} onUpdateStock={onUpdateStock} onRefreshStock={onRefreshStock} onCreateStockMovement={onCreateStockMovement} onRefreshStockMovements={onRefreshStockMovements} onCreateBusinessEvent={onCreateBusinessEvent} onRefreshBusinessEvents={onRefreshBusinessEvents} />}
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4"><KpiCard icon={Sprout} label="Cultures" value={realRows.length} /><KpiCard icon={Leaf} label="Surface" value={`${fmtNumber(analytics.totalSurface)} m²`} /><KpiCard icon={TrendingUp} label="Revenu" value={fmtCurrency(analytics.totalRevenue)} /><KpiCard icon={TrendingUp} label="Marge" value={fmtCurrency(analytics.totalMargin)} /><KpiCard icon={AlertTriangle} label="Risques IA" value={analytics.risks} /><KpiCard icon={Calendar} label="Récoltes prêtes" value={analytics.readyForSale} /></div>
    {embeddedMode ? <>
      <DataTable title="Cultures" rows={realRows} columns={cultureColumns} loading={loading} initialSortKey="nom" searchPlaceholder="Rechercher culture, parcelle, campagne..." />
      <DataTable title="Parcelles" rows={parcelles} columns={aggregateColumns} loading={loading} initialSortKey="nom" />
    </> : <>
      {tab === 'Vue d’ensemble' ? <OperationalSummary analytics={analytics} realRows={realRows} /> : null}
      {['Vue d’ensemble', 'Cultures'].includes(tab) ? <DataTable title="Cultures" rows={realRows} columns={cultureColumns} loading={loading} initialSortKey="nom" searchPlaceholder="Rechercher culture, parcelle, campagne..." /> : null}
      {tab === 'Performance' ? <DataTable title="Performance cultures" rows={performanceRows} columns={cultureColumns} loading={loading} initialSortKey="nom" searchPlaceholder="Rechercher performance..." /> : null}
      {tab === 'Parcelles' ? <DataTable title="Parcelles" rows={parcelles} columns={aggregateColumns} loading={loading} initialSortKey="nom" /> : null}
      {tab === 'Campagnes' ? <DataTable title="Campagnes" rows={campagnes} columns={aggregateColumns} loading={loading} initialSortKey="nom" /> : null}
    </>}
    <CultureFicheModal open={modal === 'details'} onClose={() => setModal(null)} culture={selected ? { ...selected, cout_total_calcule: costOf(selected), revenu_calcule: revenueOf(selected), marge_calculee: marginOf(selected), score_sante_calcule: healthOf(selected), horizon_decision: selected.horizon_decision || buildCultureDecisionProfile(selected) } : selected} />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={CULTURE_FIELDS} initialValues={applyCultureDecisionDefaults({ id: generateSequentialId('cultures', rows), record_type: 'culture', statut: 'planifiee', localisation: '', date_debut_campagne: today(), unite_surface: 'm²', unite_recolte: 'kg' })} autoId={() => generateSequentialId('cultures', rows)} loading={saving} title="Ajouter culture" submitLabel="Ajouter" />
    <CreateModal open={modal === 'create_parcelle'} onClose={() => setModal(null)} onSubmit={submitCreateParcelle} fields={PARCELLE_FIELDS} initialValues={{ nom: '', parcelle_code: '', parcelle_nom: '', surface_exploitable: '', localisation: '', type_sol: '', notes: '' }} autoId={() => generateSequentialId('cultures', rows)} loading={saving} title="Ajouter parcelle" submitLabel="Enregistrer parcelle" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={CULTURE_FIELDS} initialValues={selected || {}} loading={saving} title="Modifier fiche" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected?.nom || selected?.id || ''} loading={saving} />
  </div>;
}
