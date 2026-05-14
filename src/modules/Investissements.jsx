import { ArrowUpRight, BarChart2, Copy, Download, Edit, Eye, Layers, Plus, RefreshCw, Target, TrendingUp, Trash2, Wallet } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import Badge from '../components/Badge';
import ActionIconButton from '../components/ActionIconButton';
import { fmtCurrency, fmtPercent } from '../utils/format';
import { exportToCsv, exportToExcel, exportBusinessPlanToExcel } from '../utils/export';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId, makeId } from '../utils/ids';
import { calculateBusinessPlanMetrics, calculateInvestmentMetrics } from '../utils/businessCalculations';
import { ACTIVITY_LABELS } from '../utils/bpTemplates';
import BpWizard from './BpWizard';
import BpDetailTabs from './BpDetailTabs';

const TabButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${active ? 'bg-[#2f2415] border-[#2f2415] text-white' : 'bg-white border-[#d6c3a0] text-[#7d6a4a] hover:border-[#b6975f]'}`}
  >
    {children}
  </button>
);

const SmallMetric = ({ label, value, tone = 'default' }) => (
  <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
    <p className="text-xs text-[#8a7456]">{label}</p>
    <p className={`mt-1 font-black text-sm ${tone === 'good' ? 'text-emerald-500' : tone === 'warn' ? 'text-amber-500' : tone === 'bad' ? 'text-red-500' : 'text-[#2f2415]'}`}>{value}</p>
  </div>
);

const ACTIVITY_EMOJIS = {
  avicole_pondeuse: '🥚', avicole_chair: '🐔', bovin_embouche: '🐄', bovin_lait: '🐄',
  ovin_embouche: '🐏', ovin_lait: '🐏', caprin_embouche: '🐐', caprin_lait: '🐐',
  culture_maraichere: '🍅', culture_cereale: '🌾', culture_arboricole: '🌳',
  infrastructure: '🏗️', equipement: '🔧', autre: '📦',
};
const isHorizonPlan = (plan = {}) => String(plan.nom || plan.name || plan.title || '').toLowerCase().includes('horizon farm');
const activeExportPlan = (plans = [], selectedPlan = null) => selectedPlan || plans.find(isHorizonPlan) || plans[0];

export default function Investissements({
  rows = [],
  loading,
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  businessPlans = [],
  bpInvestmentLines = [],
  bpRecurringCosts = [],
  bpRevenueProjections = [],
  bpFundingSources = [],
  bpLinks = [],
  bpRisks = [],
  transactions = [],
  lots = [],
  animaux = [],
  cultures = [],
  onCreateBusinessPlan,
  onUpdateBusinessPlan,
  onDeleteBusinessPlan,
  onRefreshBusinessPlans,
  onCreateBpInvestmentLine,
  onUpdateBpInvestmentLine,
  onDeleteBpInvestmentLine,
  onCreateBpRecurringCost,
  onUpdateBpRecurringCost,
  onDeleteBpRecurringCost,
  onCreateBpRevenueProjection,
  onUpdateBpRevenueProjection,
  onDeleteBpRevenueProjection,
  onCreateBpFundingSource,
  onUpdateBpFundingSource,
  onDeleteBpFundingSource,
  onCreateBpRisk,
  onUpdateBpRisk,
  onDeleteBpRisk,
}) {
  const [tab, setTab] = useState('business');
  const [view, setView] = useState('grid'); // 'grid' | 'detail'
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const bpMetricsFor = useCallback((plan) => calculateBusinessPlanMetrics({
    bp: plan,
    lines: bpInvestmentLines,
    costs: bpRecurringCosts,
    projections: bpRevenueProjections,
    fundings: bpFundingSources,
    links: bpLinks,
    transactions,
    lots,
    animaux,
    cultures,
  }), [bpInvestmentLines, bpRecurringCosts, bpRevenueProjections, bpFundingSources, bpLinks, transactions, lots, animaux, cultures]);

  const metricsFor = (investment) => calculateInvestmentMetrics(investment);

  const totalInvesti = useMemo(() => rows.reduce((sum, inv) => sum + metricsFor(inv).amount, 0), [rows]);
  const totalGain = useMemo(() => rows.reduce((sum, inv) => sum + metricsFor(inv).gain, 0), [rows]);
  const roiMoyen = useMemo(() => {
    if (!rows.length) return '0.0';
    return (rows.reduce((sum, inv) => sum + metricsFor(inv).roi, 0) / rows.length).toFixed(1);
  }, [rows]);

  const bpRanking = useMemo(() => [...businessPlans].sort((a, b) => bpMetricsFor(b).margeProjetee - bpMetricsFor(a).margeProjetee), [businessPlans, bpMetricsFor]);

  const bpTotals = useMemo(() => {
    const metrics = businessPlans.map((plan) => bpMetricsFor(plan));
    return {
      investment: metrics.reduce((sum, m) => sum + m.investissementInitial, 0),
      revenue: metrics.reduce((sum, m) => sum + m.caProjete, 0),
      margin: metrics.reduce((sum, m) => sum + m.margeProjetee, 0),
      funding: metrics.reduce((sum, m) => sum + m.financementObtenu, 0),
    };
  }, [businessPlans, bpMetricsFor]);

  const activeMetrics = selectedPlan ? bpMetricsFor(selectedPlan) : null;

  const openDetail = (plan) => { setSelectedPlan(plan); setView('detail'); };
  const backToGrid = () => setView('grid');

  // ---- Simple investissements handlers ----
  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      await onCreate(payload);
      toast.success('Investissement ajouté');
      setModal(null);
    } catch (err) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      await onUpdate(selected.id, payload);
      toast.success('Investissement modifié');
      setModal(null);
    } catch (err) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const submitDelete = async () => {
    if (!selected) return;
    try {
      setSaving(true);
      await onDelete(selected.id);
      toast.success('Investissement supprimé');
      setModal(null);
    } catch (err) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const promoteFields = useMemo(() => [
    { key: 'nom', label: 'Nom du Business Plan', type: 'text', required: true },
    { key: 'activity_type', label: 'Type activité', type: 'select', options: Object.entries(ACTIVITY_LABELS).map(([value, label]) => ({ value, label })) },
    { key: 'statut', label: 'Statut initial', type: 'select', options: ['planifie', 'en_cours', 'actif', 'suspendu', 'termine'] },
  ], []);

  const submitPromote = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      const newId = makeId('BP');
      await onCreateBusinessPlan({
        id: newId,
        nom: payload.nom,
        activity_type: payload.activity_type,
        statut: payload.statut || 'planifie',
        objectif_production: selected.objectif || '',
        localisation: '',
      });
      await onUpdate(selected.id, { business_plan_id: newId });
      toast.success(`Business Plan "${payload.nom}" créé`);
      setModal(null);
    } catch (err) { toast.error(err.message || 'Erreur promotion'); } finally { setSaving(false); }
  };

  // ---- BP handlers ----
  const submitEditBp = async (payload) => {
    if (!selectedPlan) return;
    try {
      setSaving(true);
      const updated = await onUpdateBusinessPlan(selectedPlan.id, payload);
      setSelectedPlan(updated || { ...selectedPlan, ...payload });
      toast.success('Business Plan modifié');
      setModal(null);
    } catch (err) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const submitDeleteBp = async () => {
    if (!selectedPlan) return;
    try {
      setSaving(true);
      await onDeleteBusinessPlan(selectedPlan.id);
      setSelectedPlan(null);
      setView('grid');
      toast.success('Business Plan supprimé');
      setModal(null);
    } catch (err) { toast.error(err.message || 'Erreur'); } finally { setSaving(false); }
  };

  const duplicatePlan = async (plan) => {
    try {
      setSaving(true);
      const newId = makeId('BP');
      await onCreateBusinessPlan({ ...plan, id: newId, nom: `${plan.nom} (Copie)`, statut: 'planifie' });
      const planMetrics = bpMetricsFor(plan);
      await Promise.all([
        ...(planMetrics.lines || []).map((l) => onCreateBpInvestmentLine({ ...l, id: makeId('BPLI'), business_plan_id: newId })),
        ...(planMetrics.costs || []).map((c) => onCreateBpRecurringCost({ ...c, id: makeId('BPCOST'), business_plan_id: newId })),
        ...(planMetrics.projections || []).map((p) => onCreateBpRevenueProjection({ ...p, id: makeId('BPREV'), business_plan_id: newId })),
      ]);
      toast.success(`BP "${plan.nom}" dupliqué`);
    } catch (err) { toast.error(err.message || 'Erreur duplication'); } finally { setSaving(false); }
  };

  const doExports = () => {
    if (tab === 'business') {
      const planToExport = activeExportPlan(businessPlans, view === 'detail' ? selectedPlan : null);
      if (!planToExport) return toast.error('Aucun Business Plan à exporter');
      exportBusinessPlanToExcel({
        plan: planToExport,
        lines: bpInvestmentLines,
        costs: bpRecurringCosts,
        projections: bpRevenueProjections,
        fundings: bpFundingSources,
        risks: bpRisks,
        metrics: bpMetricsFor(planToExport),
      });
      toast.success(`Business Plan ${planToExport.nom || ''} exporté en Excel`);
      return;
    }
    const enriched = rows.map((inv) => ({ ...inv, ...metricsFor(inv) }));
    exportToCsv({ rows: enriched, fileName: 'investissements.csv' });
    exportToExcel({ rows: enriched, fileName: 'investissements.xlsx', sheetName: 'Investissements' });
    toast.success('Exports investissements générés');
  };

  // ---- Grid BP cards ----
  const renderBpGrid = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={Layers} label="Business Plans" value={businessPlans.length} color="bg-sky-500/20 text-sky-400" />
        <KpiCard icon={Wallet} label="Investissement prévu" value={fmtCurrency(bpTotals.investment)} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={TrendingUp} label="CA projeté total" value={fmtCurrency(bpTotals.revenue)} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={Target} label="Marge projetée totale" value={fmtCurrency(bpTotals.margin)} color={bpTotals.margin >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} />
      </div>

      {loading && <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 text-sm text-[#8a7456]">Chargement...</div>}

      {!bpRanking.length && !loading ? (
        <div className="rounded-2xl border border-dashed border-[#d6c3a0] bg-white p-10 text-center text-[#8a7456]">
          <p className="text-base font-semibold mb-2">Aucun Business Plan</p>
          <p className="text-sm mb-4">Crée ton premier BP pondeuses, chair, bovins, ovins ou cultures</p>
          <Btn icon={Plus} onClick={() => setWizardOpen(true)}>Créer un Business Plan</Btn>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {bpRanking.map((plan) => {
            const m = bpMetricsFor(plan);
            const amortPct = m.investissementInitial > 0
              ? Math.min(100, Math.max(0, ((m.vsReal?.margeReelle || 0) / m.investissementInitial) * 100))
              : 0;
            const hasReal = (m.vsReal?.caReel || 0) > 0;
            return (
              <div
                key={plan.id}
                className="bg-white border border-[#d6c3a0] rounded-2xl p-5 hover:border-[#b6975f] hover:shadow-sm transition-all flex flex-col"
              >
                {/* Top */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{ACTIVITY_EMOJIS[plan.activity_type] || '📦'}</span>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-[#8a7456]">{ACTIVITY_LABELS[plan.activity_type] || plan.activity_type}</p>
                      <p className="font-black text-[#2f2415] mt-0.5">{plan.nom}</p>
                      {plan.localisation && <p className="text-xs text-[#8a7456]">{plan.localisation}</p>}
                    </div>
                  </div>
                  <Badge status={plan.statut || 'planifie'} />
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <SmallMetric label="Investi" value={fmtCurrency(m.investissementInitial)} />
                  <SmallMetric label="ROI prévu" value={fmtPercent(m.roiPrevu)} tone={m.roiPrevu >= 20 ? 'good' : m.roiPrevu >= 0 ? 'warn' : 'bad'} />
                  <SmallMetric label="Marge prévue" value={fmtCurrency(m.margeProjetee)} tone={m.margeProjetee >= 0 ? 'good' : 'bad'} />
                  <SmallMetric label="Payback" value={m.paybackMois ? `Mois ${m.paybackMois}` : '—'} />
                  {hasReal && (
                    <>
                      <SmallMetric label="CA réel" value={fmtCurrency(m.vsReal.caReel)} tone="good" />
                      <SmallMetric label="Marge réelle" value={fmtCurrency(m.vsReal.margeReelle)} tone={m.vsReal.margeReelle >= 0 ? 'good' : 'bad'} />
                    </>
                  )}
                </div>

                {/* Amortissement bar */}
                <div className="mt-3 mb-3">
                  <div className="flex justify-between text-xs text-[#8a7456] mb-1">
                    <span>Amortissement</span>
                    <span>{amortPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-[#f0e8d8] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#c9a96a] transition-all" style={{ width: `${amortPct}%` }} />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-wrap border-t border-[#f0e8d8] pt-3">
                  <Btn small icon={Eye} onClick={() => openDetail(plan)}>Voir</Btn>
                  <ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelectedPlan(plan); setModal('bp-edit'); }} />
                  <ActionIconButton icon={Copy} color="sky" title="Dupliquer" onClick={() => duplicatePlan(plan)} />
                  <ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelectedPlan(plan); setModal('bp-delete'); }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ---- Simple investissements ----
  const ranking = useMemo(() => [...rows].sort((a, b) => metricsFor(b).roi - metricsFor(a).roi), [rows]);

  const renderSimpleInvestments = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={Wallet} label="Total investi" value={fmtCurrency(totalInvesti)} color="bg-red-500/20 text-red-400" />
        <KpiCard icon={TrendingUp} label="Gains générés" value={fmtCurrency(totalGain)} color="bg-emerald-500/20 text-emerald-400" />
        <KpiCard icon={BarChart2} label="ROI moyen" value={`${roiMoyen}%`} color="bg-sky-500/20 text-sky-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ranking.map((inv, i) => {
          const m = metricsFor(inv);
          return (
            <div key={inv.id} className="bg-white border border-[#d6c3a0] rounded-2xl p-5 hover:border-[#b6975f] transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#d6c3a0] text-[#8a7456]">{inv.type}</span>
                    {i === 0 && <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">Meilleur ROI</span>}
                  </div>
                  <p className="font-bold text-[#2f2415]">{inv.libelle}</p>
                  <p className="text-xs text-[#8a7456] mt-1">{inv.objectif}</p>
                </div>
                <Badge status={inv.statut} />
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <SmallMetric label="Investi" value={fmtCurrency(m.amount)} />
                <SmallMetric label="Gain" value={fmtCurrency(m.gain)} tone="good" />
                <SmallMetric label="ROI" value={`${m.roi.toFixed(1)}%`} tone={m.roi >= 30 ? 'good' : m.roi >= 20 ? 'warn' : 'bad'} />
              </div>
              <div className="mb-3">
                <div className="flex justify-between text-xs text-[#8a7456] mb-1">
                  <span>Remboursement</span><span>{m.paybackProgress.toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-[#fffdf8] rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.roi >= 30 ? 'bg-emerald-500' : m.roi >= 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${m.paybackProgress}%` }} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <ActionIconButton icon={Eye} title="Détails" color="sky" onClick={() => { setSelected(inv); setModal('details'); }} />
                <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(inv); setModal('edit'); }} />
                {!inv.business_plan_id && <ActionIconButton icon={ArrowUpRight} title="Promouvoir en Business Plan" color="emerald" onClick={() => { setSelected(inv); setModal('promote'); }} />}
                <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(inv); setModal('delete'); }} />
              </div>
            </div>
          );
        })}
      </div>

      {ranking.length > 0 && (
        <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
          <p className="font-semibold text-[#2f2415] mb-4">Classement par rentabilité</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ranking.map((inv) => ({ ...inv, roi: metricsFor(inv).roi }))} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" horizontal={false} />
              <XAxis type="number" stroke="#8a7456" fontSize={12} unit="%" />
              <YAxis type="category" dataKey="libelle" stroke="#8a7456" fontSize={10} width={140} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={{ background: '#fff', border: '1px solid #b6975f', borderRadius: 8 }} />
              <Bar dataKey="roi" fill="#22c55e" radius={[0, 6, 6, 0]} name="ROI %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Business Plans & Investissements"
        sub="BP multi-activités — investissements simples — ROI — prévu vs réel"
        actions={
          <>
            <Btn icon={RefreshCw} variant="outline" small onClick={async () => { await onRefresh?.(); await onRefreshBusinessPlans?.(); toast.success('Actualisé'); }}>Actualiser</Btn>
            <Btn icon={Download} variant="outline" small onClick={doExports}>{tab === 'business' ? 'Exporter le BP' : 'Exporter'}</Btn>
            {tab === 'business'
              ? <Btn icon={Plus} small onClick={() => setWizardOpen(true)}>Nouveau Business Plan</Btn>
              : <Btn icon={Plus} small onClick={() => setModal('create')}>Nouvel investissement</Btn>}
          </>
        }
      />

      <div className="flex gap-2 flex-wrap">
        <TabButton active={tab === 'business'} onClick={() => { setTab('business'); setView('grid'); }}>Business Plans</TabButton>
        <TabButton active={tab === 'simple'} onClick={() => setTab('simple')}>Investissements simples</TabButton>
      </div>

      {tab === 'business' && view === 'grid' && renderBpGrid()}

      {tab === 'business' && view === 'detail' && selectedPlan && activeMetrics && (
        <BpDetailTabs
          bp={selectedPlan}
          metrics={activeMetrics}
          bpRisks={bpRisks}
          bpLinks={bpLinks}
          transactions={transactions}
          lots={lots}
          animaux={animaux}
          cultures={cultures}
          onCreateLine={(p) => onCreateBpInvestmentLine(p)}
          onUpdateLine={(id, p) => onUpdateBpInvestmentLine(id, p)}
          onDeleteLine={(id) => onDeleteBpInvestmentLine(id)}
          onCreateCost={(p) => onCreateBpRecurringCost(p)}
          onUpdateCost={(id, p) => onUpdateBpRecurringCost(id, p)}
          onDeleteCost={(id) => onDeleteBpRecurringCost(id)}
          onCreateProjection={(p) => onCreateBpRevenueProjection(p)}
          onUpdateProjection={(id, p) => onUpdateBpRevenueProjection(id, p)}
          onDeleteProjection={(id) => onDeleteBpRevenueProjection(id)}
          onCreateFunding={(p) => onCreateBpFundingSource(p)}
          onUpdateFunding={(id, p) => onUpdateBpFundingSource(id, p)}
          onDeleteFunding={(id) => onDeleteBpFundingSource(id)}
          onCreateRisk={(p) => onCreateBpRisk(p)}
          onUpdateRisk={(id, p) => onUpdateBpRisk(id, p)}
          onDeleteRisk={(id) => onDeleteBpRisk(id)}
          onEditBp={() => setModal('bp-edit')}
          onDeleteBp={() => setModal('bp-delete')}
          onBack={backToGrid}
        />
      )}

      {tab === 'simple' && renderSimpleInvestments()}

      {/* Wizard */}
      <BpWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreateBusinessPlan={onCreateBusinessPlan}
        onCreateBpInvestmentLine={onCreateBpInvestmentLine}
        onCreateBpRecurringCost={onCreateBpRecurringCost}
        onCreateBpRevenueProjection={onCreateBpRevenueProjection}
        onCreateBpFundingSource={onCreateBpFundingSource}
        businessPlans={businessPlans}
      />

      {/* BP Edit/Delete modals */}
      <EditModal
        open={modal === 'bp-edit'}
        onClose={() => setModal(null)}
        onSubmit={submitEditBp}
        fields={MODULE_FORM_FIELDS.business_plans}
        initialValues={selectedPlan || {}}
        loading={saving}
        title="Modifier Business Plan"
        submitLabel="Enregistrer"
      />
      <DeleteModal
        open={modal === 'bp-delete'}
        onClose={() => setModal(null)}
        onConfirm={submitDeleteBp}
        itemLabel={selectedPlan?.nom || ''}
        loading={saving}
      />

      {/* Simple investissements modals */}
      <CreateModal
        open={modal === 'promote'}
        onClose={() => setModal(null)}
        onSubmit={submitPromote}
        fields={promoteFields}
        initialValues={{ nom: selected?.libelle || '', activity_type: 'autre', statut: 'planifie' }}
        loading={saving}
        title="Promouvoir en Business Plan"
        submitLabel="Créer le BP"
      />
      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...metricsFor(selected) } : selected} title="Détail investissement" />
      <CreateModal
        open={modal === 'create'}
        onClose={() => setModal(null)}
        onSubmit={submitCreate}
        fields={MODULE_FORM_FIELDS.investissements}
        initialValues={{ id: generateSequentialId('investissements', rows), statut: 'actif' }}
        autoId={() => generateSequentialId('investissements', rows)}
        loading={saving}
        title="Ajouter investissement"
        submitLabel="Ajouter"
      />
      <EditModal
        open={modal === 'edit'}
        onClose={() => setModal(null)}
        onSubmit={submitEdit}
        fields={MODULE_FORM_FIELDS.investissements}
        initialValues={selected || {}}
        loading={saving}
        title="Modifier investissement"
        submitLabel="Enregistrer"
      />
      <DeleteModal
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        onConfirm={submitDelete}
        itemLabel={selected?.libelle || ''}
        loading={saving}
      />
    </div>
  );
}
