import { ArrowLeft, BarChart2, Download, Edit, FileText, Link, Plus, ShieldAlert, Target, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import { fmtCurrency, fmtPercent } from '../utils/format';
import { exportBpPdf } from '../utils/bpPdfExport';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { makeId } from '../utils/ids';
import { ACTIVITY_LABELS } from '../utils/bpTemplates';

const normalizeProjectionPayload = (payload = {}) => {
  const production = Number(payload.production_estimee || 0);
  const unitPrice = Number(payload.prix_unitaire_estime || 0);
  const charges = Number(payload.charges_estimees || 0);
  const ca = production * unitPrice;
  return {
    ...payload,
    ca_estime: ca,
    marge_estimee: ca - charges,
  };
};

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart2 },
  { id: 'unit_costs', label: 'Couts unitaires', icon: Target },
  { id: 'lines', label: 'Investissement', icon: Wallet },
  { id: 'costs', label: 'Charges', icon: TrendingUp },
  { id: 'projections', label: 'Projections', icon: BarChart2 },
  { id: 'funding', label: 'Financement', icon: TrendingUp },
  { id: 'risks', label: 'Risques', icon: ShieldAlert },
  { id: 'links', label: 'Liaisons', icon: Link },
  { id: 'documents', label: 'Documents', icon: FileText },
];

const TabBtn = ({ active, label, icon: Icon, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${active ? 'bg-[#2f2415] border-[#2f2415] text-white' : 'bg-white border-[#d6c3a0] text-[#7d6a4a] hover:border-[#b6975f]'}`}
  >
    {Icon ? <Icon size={12} /> : null}
    {label}
  </button>
);

const MetricRow = ({ label, planned, real, isPercent = false }) => {
  const fmt = isPercent ? fmtPercent : fmtCurrency;
  const diff = real !== null && real !== undefined ? Number(real) - Number(planned) : null;
  const hasReal = real !== null && real !== undefined && Number(real) !== 0;
  return (
    <div className="flex items-center gap-3 border-b border-[#f0e8d8] py-2 last:border-0">
      <div className="flex-1 text-sm text-[#2f2415]">{label}</div>
      <div className="text-sm font-bold text-[#2f2415] w-32 text-right">{Number(planned) > 0 ? fmt(planned) : 'Non calculable'}</div>
      <div className={`text-sm font-bold w-32 text-right ${hasReal ? (Number(real) >= Number(planned) ? 'text-emerald-500' : 'text-red-500') : 'text-[#8a7456]'}`}>
        {hasReal ? fmt(real) : '—'}
      </div>
      {diff !== null ? (
        <div className={`text-xs font-semibold w-20 text-right ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
          {diff >= 0 ? '+' : ''}{isPercent ? fmtPercent(diff) : fmtCurrency(diff)}
        </div>
      ) : <div className="w-20" />}
    </div>
  );
};

function UnitCostTable({ bp, metrics }) {
  const type = bp?.activity_type || '';
  const m = metrics || {};
  const vsReal = m.vsReal || {};
  const realUnit = vsReal.realHeads || vsReal.realProduction || m.nombreUnitesReel || 0;
  const realCostPerUnit = realUnit > 0 ? vsReal.chargesReelles / realUnit : null;
  const realMarginPerUnit = realUnit > 0 ? vsReal.margeReelle / realUnit : null;

  const isBig = ['bovin_embouche', 'bovin_lait', 'ovin_embouche', 'ovin_lait', 'caprin_embouche', 'caprin_lait'].includes(type);
  const isChair = type === 'avicole_chair';
  const isPondeuse = type === 'avicole_pondeuse';
  const isCulture = ['culture_maraichere', 'culture_cereale', 'culture_arboricole'].includes(type);

  const rows = (() => {
  if (isBig) {
    return [
      { label: 'Achat par tete', planned: m.coutAchatParTete, real: null },
      { label: 'Alimentation par tete', planned: m.coutAlimentationInitialeParTete, real: null },
      { label: 'Sante par tete', planned: m.coutSanteInitialeParTete, real: null },
      { label: 'Transport par tete', planned: m.coutTransportParTete, real: null },
      { label: 'Autres frais par tete', planned: m.autresFraisParTete, real: null },
      { label: 'Cout total par tete', planned: m.coutTotalPrevuParUnite, real: realCostPerUnit },
      { label: 'Marge par tete', planned: m.margePrevueParUnite, real: realMarginPerUnit },
      { label: 'ROI par tete', planned: m.coutTotalPrevuParUnite > 0 ? (m.margePrevueParUnite / m.coutTotalPrevuParUnite) * 100 : 0, real: realCostPerUnit > 0 ? (realMarginPerUnit / realCostPerUnit) * 100 : null, isPercent: true },
    ];
  }
  if (isChair) {
    const effectifVendablePrevu = Math.floor((m.nombreUnitesPrevu || 0) * 0.96);
    return [
      { label: 'Effectif vendable prevu', planned: effectifVendablePrevu, real: vsReal.realHeads || null, isCnt: true },
      { label: 'Cout par poulet prevu', planned: m.coutTotalPrevuParUnite, real: realCostPerUnit },
      { label: 'Marge par poulet', planned: m.margePrevueParUnite, real: realMarginPerUnit },
      { label: 'Marge totale', planned: m.margeTotalePrevueUnitaire, real: vsReal.margeReelle || null },
    ];
  }
  if (isPondeuse) {
    return [
      { label: 'Production oeufs prevue (cycle)', planned: m.productionOeufsPrevue, real: null, isCnt: true },
      { label: 'Cout par pondeuse', planned: m.coutTotalPrevuParUnite, real: realCostPerUnit },
      { label: 'Cout par oeuf', planned: m.coutParOeufPrevu, real: null },
      { label: 'Cout par plateau (30 oeufs)', planned: m.coutParPlateauPrevu, real: null },
      { label: 'CA oeufs projete', planned: m.caProjete, real: vsReal.caReel || null },
      { label: 'Marge oeufs', planned: m.margeProjetee, real: vsReal.margeReelle || null },
    ];
  }
  if (isCulture) {
    return [
      { label: 'Quantite produite prevue', planned: m.quantiteProductionPrevue, real: vsReal.realProduction || null, isCnt: true },
      { label: 'Cout par unite production', planned: m.coutParUniteProductionPrevu, real: realCostPerUnit },
      { label: 'Prix vente prevu unitaire', planned: m.prixVentePrevuUnitaire, real: m.prixVenteReelUnitaire || null },
      { label: 'Marge par unite', planned: m.margePrevueParUnite, real: realMarginPerUnit },
      { label: 'Marge totale', planned: m.margeTotalePrevueUnitaire, real: vsReal.margeReelle || null },
    ];
  }
  return m.unitCostRows || [];
  })();

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 text-xs font-bold text-[#8a7456]">Indicateur</div>
        <div className="w-32 text-xs font-bold text-[#8a7456] text-right">Prevu</div>
        <div className="w-32 text-xs font-bold text-emerald-600 text-right">Reel</div>
        <div className="w-20 text-xs font-bold text-[#8a7456] text-right">Ecart</div>
      </div>
      {rows.map((row, i) => (
        <MetricRow
          key={i}
          label={row.label}
          planned={row.planned || 0}
          real={row.real}
          isPercent={row.isPercent}
        />
      ))}
    </div>
  );
}

function ChildTable({ title, rows, addLabel, amountKey, onAdd, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="font-bold text-[#2f2415]">{title}</p>
        <Btn small icon={Plus} onClick={onAdd}>{addLabel || 'Ajouter'}</Btn>
      </div>
      <div className="space-y-2">
        {rows.length ? rows.map((row) => (
          <div key={row.id} className="flex items-center gap-3 rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2f2415] truncate">{row.designation || row.titre || row.nom_source || `Mois ${row.mois_index || ''}`}</p>
              <p className="text-xs text-[#8a7456]">{row.categorie || row.source_type || row.statut || row.unite_production || ''}</p>
            </div>
            {amountKey ? (
              <p className="text-sm font-bold text-[#2f2415] shrink-0">{fmtCurrency(row[amountKey] || row.total || 0)}</p>
            ) : (
              <p className="text-xs px-2 py-0.5 rounded bg-[#eadcc2] text-[#7d6a4a]">{row.impact || row.probabilite || ''}</p>
            )}
            <ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => onEdit(row)} />
            <ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => onDelete(row)} />
          </div>
        )) : <p className="text-sm text-[#8a7456]">Aucune ligne.</p>}
      </div>
    </div>
  );
}

export default function BpDetailTabs({
  bp,
  metrics,
  bpRisks = [],
  bpLinks = [],
  onCreateLine,
  onUpdateLine,
  onDeleteLine,
  onCreateCost,
  onUpdateCost,
  onDeleteCost,
  onCreateProjection,
  onUpdateProjection,
  onDeleteProjection,
  onCreateFunding,
  onUpdateFunding,
  onDeleteFunding,
  onCreateRisk,
  onUpdateRisk,
  onDeleteRisk,
  onEditBp,
  onDeleteBp,
  onBack,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [modal, setModal] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!bp || !metrics) return null;

  const planLines = metrics.lines || [];
  const planCosts = metrics.costs || [];
  const planProjections = metrics.projections || [];
  const planFundings = metrics.fundings || [];
  const planRisks = bpRisks.filter((r) => r.business_plan_id === bp.id);
  const planLinks = bpLinks.filter((l) => l.business_plan_id === bp.id);

  const vsReal = metrics.vsReal || {};

  const handleExportPdf = () => {
    exportBpPdf({
      bp,
      metrics,
      lines: planLines,
      costs: planCosts,
      projections: planProjections,
      fundings: planFundings,
      risks: planRisks,
    });
    toast.success('PDF genere');
  };

  const childHandlers = {
    bp_investment_lines: { create: onCreateLine, update: onUpdateLine, delete: onDeleteLine },
    bp_recurring_costs: { create: onCreateCost, update: onUpdateCost, delete: onDeleteCost },
    bp_revenue_projections: { create: onCreateProjection, update: onUpdateProjection, delete: onDeleteProjection },
    bp_funding_sources: { create: onCreateFunding, update: onUpdateFunding, delete: onDeleteFunding },
    bp_risks: { create: onCreateRisk, update: onUpdateRisk, delete: onDeleteRisk },
  };

  const openCreate = (kind) => { setSelectedChild({ kind }); setModal('child-create'); };
  const openEdit = (kind, row) => { setSelectedChild({ ...row, kind }); setModal('child-edit'); };
  const openDelete = (kind, row) => { setSelectedChild({ ...row, kind }); setModal('child-delete'); };

  const submitCreate = async (payload) => {
    const kind = selectedChild?.kind;
    if (!kind) return;
    try {
      setSaving(true);
      const nextPayload = kind === 'bp_revenue_projections' ? normalizeProjectionPayload(payload) : payload;
      await childHandlers[kind].create({ ...nextPayload, business_plan_id: bp.id });
      toast.success('Ligne ajoutee');
      setModal(null);
    } catch (e) { toast.error(e.message || 'Erreur'); } finally { setSaving(false); }
  };

  const submitEdit = async (payload) => {
    const kind = selectedChild?.kind;
    if (!kind || !selectedChild?.id) return;
    try {
      setSaving(true);
      const nextPayload = kind === 'bp_revenue_projections' ? normalizeProjectionPayload(payload) : payload;
      await childHandlers[kind].update(selectedChild.id, nextPayload);
      toast.success('Modifie');
      setModal(null);
    } catch (e) { toast.error(e.message || 'Erreur'); } finally { setSaving(false); }
  };

  const submitDelete = async () => {
    const kind = selectedChild?.kind;
    if (!kind || !selectedChild?.id) return;
    try {
      setSaving(true);
      await childHandlers[kind].delete(selectedChild.id);
      toast.success('Supprime');
      setModal(null);
    } catch (e) { toast.error(e.message || 'Erreur'); } finally { setSaving(false); }
  };

  // Projection chart data
  const chartData = planProjections
    .sort((a, b) => a.mois_index - b.mois_index)
    .map((p) => ({ name: `M${p.mois_index}`, CA: p.ca_estime || 0, Charges: p.charges_estimees || 0, Marge: p.marge_estimee || 0 }));

  const chartDataCumul = chartData.reduce((acc, d) => {
    const previous = acc.length ? acc[acc.length - 1].CumulMarge : 0;
    return [...acc, { ...d, CumulMarge: previous + d.Marge }];
  }, []);

  const amortPct = metrics.investissementInitial > 0
    ? Math.min(100, Math.max(0, (vsReal.margeReelle / metrics.investissementInitial) * 100))
    : 0;

  return (
    <div className="space-y-4">
      {/* Header BP */}
      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs text-[#8a7456] hover:text-[#2f2415] mb-2 transition-colors">
              <ArrowLeft size={12} />Retour aux Business Plans
            </button>
            <p className="text-xs uppercase tracking-widest text-[#8a7456]">{ACTIVITY_LABELS[bp.activity_type] || bp.activity_type}</p>
            <h2 className="text-2xl font-black text-[#2f2415] mt-1">{bp.nom}</h2>
            <p className="text-sm text-[#7d6a4a] mt-1">{bp.localisation ? `${bp.localisation} — ` : ''}{bp.objectif_production || 'Objectif a preciser'}</p>
          </div>
          <div className="flex gap-2 flex-wrap shrink-0">
            <Badge status={bp.statut || 'planifie'} />
            <Btn variant="outline" small icon={Download} onClick={handleExportPdf}>PDF</Btn>
            <Btn variant="outline" small icon={Edit} onClick={onEditBp}>Modifier</Btn>
            <Btn variant="danger" small icon={Trash2} onClick={onDeleteBp}>Supprimer</Btn>
          </div>
        </div>

        {/* Amortissement bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-[#8a7456] mb-1">
            <span>Amortissement reel</span>
            <span>{amortPct.toFixed(0)}% — {fmtCurrency(vsReal.margeReelle || 0)} / {fmtCurrency(metrics.investissementInitial)}</span>
          </div>
          <div className="h-2 bg-[#f0e8d8] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#c9a96a] transition-all" style={{ width: `${amortPct}%` }} />
          </div>
        </div>
      </div>

      {/* Tabs nav */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <TabBtn key={t.id} active={activeTab === t.id} label={t.label} icon={t.icon} onClick={() => setActiveTab(t.id)} />
        ))}
      </div>

      {/* Tab content */}

      {/* Vue d'ensemble */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard icon={Wallet} label="Investissement initial" value={fmtCurrency(metrics.investissementInitial)} color="bg-red-500/20 text-red-400" />
            <KpiCard icon={TrendingUp} label="Charges/mois" value={fmtCurrency(metrics.chargesMensuelles)} color="bg-amber-500/20 text-amber-400" />
            <KpiCard icon={Target} label="CA projete" value={fmtCurrency(metrics.caProjete)} color="bg-emerald-500/20 text-emerald-400" />
            <KpiCard icon={BarChart2} label="Marge nette cycle" value={fmtCurrency(metrics.margeNetteCycle ?? metrics.margeProjetee)} color={metrics.margeProjetee >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'ROI prevu', value: fmtPercent(metrics.roiPrevu), tone: metrics.roiPrevu >= 20 ? 'good' : 'warn' },
              { label: 'Payback', value: metrics.paybackMois ? `Mois ${metrics.paybackMois}` : 'Non calculable', tone: 'default' },
              { label: 'Cout total cycle', value: fmtCurrency(metrics.coutTotalPrevuCycle), tone: 'default' },
              { label: 'Marge brute', value: fmtCurrency(metrics.margeBruteProjetee), tone: metrics.margeBruteProjetee >= 0 ? 'good' : 'warn' },
              { label: 'Financement obtenu', value: fmtCurrency(metrics.financementObtenu), tone: 'default' },
              { label: 'Couverture financement', value: fmtPercent(metrics.couvertureFinancement), tone: metrics.couvertureFinancement >= 80 ? 'good' : 'warn' },
            ].map(({ label, value, tone }) => (
              <div key={label} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                <p className="text-xs text-[#8a7456]">{label}</p>
                <p className={`mt-1 font-black ${tone === 'good' ? 'text-emerald-500' : tone === 'warn' ? 'text-amber-500' : 'text-[#2f2415]'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Prevu vs Reel */}
          <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
            <p className="font-bold text-[#2f2415] mb-3">Prevu vs Reel</p>
            <div className="flex items-center gap-2 mb-2 text-xs text-[#8a7456]">
              <div className="flex-1" />
              <div className="w-32 text-right font-bold">Prevu</div>
              <div className="w-32 text-right font-bold text-emerald-600">Reel</div>
              <div className="w-20 text-right font-bold">Ecart</div>
            </div>
            <MetricRow label="CA total" planned={metrics.caProjete} real={vsReal.caReel || null} />
            <MetricRow label="Charges cycle" planned={metrics.chargesRecurrentesCycle || metrics.chargesProjetees} real={vsReal.chargesReelles || null} />
            <MetricRow label="Cout total projet" planned={metrics.coutTotalPrevuCycle} real={vsReal.chargesReelles || null} />
            <MetricRow label="Marge nette cycle" planned={metrics.margeNetteCycle ?? metrics.margeProjetee} real={vsReal.margeReelle || null} />
          </div>

          {/* Chart projections */}
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
              <p className="font-bold text-[#2f2415] mb-4">Projection mensuelle</p>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartDataCumul}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" />
                  <XAxis dataKey="name" stroke="#8a7456" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#8a7456" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#8a7456" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} contentStyle={{ background: '#fff', border: '1px solid #d6c3a0', borderRadius: 8 }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="CA" fill="#22c55e" radius={[4, 4, 0, 0]} name="CA estime" />
                  <Bar yAxisId="left" dataKey="Charges" fill="#ef4444" radius={[4, 4, 0, 0]} name="Charges" />
                  <Line yAxisId="right" type="monotone" dataKey="CumulMarge" stroke="#c9a96a" strokeWidth={2} dot={false} name="Cumul marge" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Parametres activite (metadata) */}
          {bp.metadata && Object.keys(bp.metadata).length > 0 && (
            <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
              <p className="font-bold text-[#2f2415] mb-3">Parametres activite</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(bp.metadata).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                    <p className="text-xs text-[#8a7456] capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm font-bold text-[#2f2415] mt-1">{String(value ?? '—')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Couts unitaires */}
      {activeTab === 'unit_costs' && <UnitCostTable bp={bp} metrics={metrics} />}

      {/* Investissement initial */}
      {activeTab === 'lines' && (
        <div className="space-y-3">
          <ChildTable
            title="Lignes d'investissement initial"
            rows={planLines}
            kind="bp_investment_lines"
            addLabel="Ajouter ligne"
            amountKey="total"
            onAdd={() => openCreate('bp_investment_lines')}
            onEdit={(r) => openEdit('bp_investment_lines', r)}
            onDelete={(r) => openDelete('bp_investment_lines', r)}
          />
          {/* Breakdown by category */}
          {planLines.length > 0 && (
            <div className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
              <p className="font-bold text-[#2f2415] mb-3 text-sm">Ventilation par categorie</p>
              {['cheptel', 'infrastructure', 'alimentation', 'equipement', 'vaccins', 'main_oeuvre', 'autre'].map((cat) => {
                const total = planLines.filter((l) => l.categorie === cat).reduce((s, l) => s + Number(l.total || 0), 0);
                if (!total) return null;
                const pct = metrics.investissementInitial > 0 ? (total / metrics.investissementInitial) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs text-[#8a7456] w-24 capitalize">{cat}</span>
                    <div className="flex-1 h-2 bg-[#f0e8d8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#c9a96a]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-[#2f2415] w-32 text-right">{fmtCurrency(total)}</span>
                    <span className="text-xs text-[#8a7456] w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
              <div className="border-t border-[#d6c3a0] mt-2 pt-2 flex justify-between">
                <span className="text-sm font-bold text-[#2f2415]">TOTAL</span>
                <span className="text-sm font-black text-[#2f2415]">{fmtCurrency(metrics.investissementInitial)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charges recurrentes */}
      {activeTab === 'costs' && (
        <div className="space-y-3">
          <ChildTable
            title="Charges recurrentes"
            rows={planCosts}
            kind="bp_recurring_costs"
            addLabel="Ajouter charge"
            amountKey="montant_mensuel"
            onAdd={() => openCreate('bp_recurring_costs')}
            onEdit={(r) => openEdit('bp_recurring_costs', r)}
            onDelete={(r) => openDelete('bp_recurring_costs', r)}
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-center">
              <p className="text-xs text-[#8a7456]">Total mensuel</p>
              <p className="text-base font-black text-[#2f2415]">{fmtCurrency(metrics.chargesMensuelles)}</p>
            </div>
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-center">
              <p className="text-xs text-[#8a7456]">Total sur {bp.duree_cycle_mois || '-'} mois</p>
              <p className="text-base font-black text-[#2f2415]">{fmtCurrency(metrics.chargesRecurrentesCycle)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Projections */}
      {activeTab === 'projections' && (
        <div className="space-y-3">
          <ChildTable
            title="Projections de revenus mensuelles"
            rows={planProjections.sort((a, b) => a.mois_index - b.mois_index)}
            kind="bp_revenue_projections"
            addLabel="Ajouter mois"
            amountKey="ca_estime"
            onAdd={() => openCreate('bp_revenue_projections')}
            onEdit={(r) => openEdit('bp_revenue_projections', r)}
            onDelete={(r) => openDelete('bp_revenue_projections', r)}
          />
          {chartData.length > 0 && (
            <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
              <p className="font-bold text-[#2f2415] mb-4">Courbe projections + cumul marge</p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={chartDataCumul}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6c3a0" />
                  <XAxis dataKey="name" stroke="#8a7456" fontSize={10} />
                  <YAxis yAxisId="left" stroke="#8a7456" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#8a7456" fontSize={10} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} contentStyle={{ background: '#fff', border: '1px solid #d6c3a0', borderRadius: 8 }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="CA" fill="#22c55e" radius={[3, 3, 0, 0]} name="CA" />
                  <Bar yAxisId="left" dataKey="Marge" fill="#c9a96a" radius={[3, 3, 0, 0]} name="Marge mensuelle" />
                  <Line yAxisId="right" type="monotone" dataKey="CumulMarge" stroke="#2f2415" strokeWidth={2} dot={false} name="Cumul marge" />
                </ComposedChart>
              </ResponsiveContainer>
              {metrics.paybackMois && (
                <p className="text-xs text-center text-amber-600 mt-2">
                  Amortissement prevu atteint au mois {metrics.paybackMois} ({fmtCurrency(metrics.investissementInitial)})
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Financement */}
      {activeTab === 'funding' && (
        <div className="space-y-3">
          <ChildTable
            title="Sources de financement"
            rows={planFundings}
            kind="bp_funding_sources"
            addLabel="Ajouter source"
            amountKey="montant"
            onAdd={() => openCreate('bp_funding_sources')}
            onEdit={(r) => openEdit('bp_funding_sources', r)}
            onDelete={(r) => openDelete('bp_funding_sources', r)}
          />
          <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#8a7456]">Besoin total</span>
              <span className="font-bold text-[#2f2415]">{fmtCurrency(metrics.investissementInitial)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#8a7456]">Financement accorde</span>
              <span className="font-bold text-emerald-600">{fmtCurrency(metrics.financementObtenu)}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-[#8a7456]">Couverture</span>
              <span className="font-bold text-[#2f2415]">{fmtPercent(metrics.couvertureFinancement)}</span>
            </div>
            <div className="h-2 bg-[#f0e8d8] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, metrics.couvertureFinancement)}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Risques */}
      {activeTab === 'risks' && (
        <ChildTable
          title="Risques & Mesures d'attenuation"
          rows={planRisks}
          kind="bp_risks"
          addLabel="Ajouter risque"
          amountKey={null}
          onAdd={() => openCreate('bp_risks')}
          onEdit={(r) => openEdit('bp_risks', r)}
          onDelete={(r) => openDelete('bp_risks', r)}
        />
      )}

      {/* Liaisons prevu vs reel */}
      {activeTab === 'links' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
            <p className="font-bold text-[#2f2415] mb-3">Entites liees au Business Plan</p>
            {planLinks.length ? planLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-3 rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 mb-2">
                <p className="text-sm font-semibold text-[#2f2415] flex-1">{link.entity_type}</p>
                <p className="text-xs text-[#8a7456]">{link.entity_id}</p>
              </div>
            )) : (
              <p className="text-sm text-[#8a7456]">Aucun lien operationnel. Rattacher des lots, cultures, animaux ou transactions depuis leurs modules respectifs.</p>
            )}
          </div>
          <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4">
            <p className="font-bold text-[#2f2415] mb-3">Transactions liees</p>
            {vsReal.linkedTransactions?.length ? (
              <div className="space-y-2">
                {vsReal.linkedTransactions.slice(0, 10).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${t.type === 'entree' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-500'}`}>{t.type}</span>
                    <p className="text-sm text-[#2f2415] flex-1">{t.libelle || t.categorie || 'Transaction'}</p>
                    <p className="text-sm font-bold text-[#2f2415]">{fmtCurrency(t.montant)}</p>
                  </div>
                ))}
                {vsReal.linkedTransactions.length > 10 && (
                  <p className="text-xs text-[#8a7456] text-center">+ {vsReal.linkedTransactions.length - 10} autres transactions</p>
                )}
              </div>
            ) : <p className="text-sm text-[#8a7456]">Aucune transaction liee.</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'CA reel', val: vsReal.caReel || 0, tone: 'good' },
              { label: 'Charges reelles', val: vsReal.chargesReelles || 0, tone: 'bad' },
              { label: 'Marge reelle', val: vsReal.margeReelle || 0, tone: vsReal.margeReelle >= 0 ? 'good' : 'bad' },
            ].map(({ label, val, tone }) => (
              <div key={label} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-center">
                <p className="text-xs text-[#8a7456]">{label}</p>
                <p className={`text-sm font-black mt-1 ${tone === 'good' ? 'text-emerald-500' : 'text-red-500'}`}>{fmtCurrency(val)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {activeTab === 'documents' && (
        <div className="rounded-2xl border border-dashed border-[#d6c3a0] bg-white p-8 text-center text-[#8a7456]">
          <FileText size={32} className="mx-auto mb-3 text-[#d6c3a0]" />
          <p className="text-sm font-semibold">Documents du Business Plan</p>
          <p className="text-xs mt-1">BP PDF, contrats prets, factures equipements... Rattacher depuis le module Documents.</p>
          <Btn variant="outline" small icon={Download} onClick={handleExportPdf} className="mx-auto mt-4">Exporter BP en PDF</Btn>
        </div>
      )}

      {/* Modals child */}
      {modal === 'child-create' && selectedChild?.kind && (
        <CreateModal
          open
          onClose={() => setModal(null)}
          onSubmit={submitCreate}
          fields={MODULE_FORM_FIELDS[selectedChild.kind] || []}
          initialValues={{ id: makeId(selectedChild.kind.slice(0, 4).toUpperCase()), business_plan_id: bp.id }}
          loading={saving}
          title="Ajouter ligne"
          submitLabel="Ajouter"
        />
      )}
      {modal === 'child-edit' && selectedChild?.kind && (
        <EditModal
          open
          onClose={() => setModal(null)}
          onSubmit={submitEdit}
          fields={MODULE_FORM_FIELDS[selectedChild.kind] || []}
          initialValues={selectedChild || {}}
          loading={saving}
          title="Modifier ligne"
          submitLabel="Enregistrer"
        />
      )}
      <DeleteModal
        open={modal === 'child-delete'}
        onClose={() => setModal(null)}
        onConfirm={submitDelete}
        itemLabel={selectedChild?.designation || selectedChild?.titre || selectedChild?.id || ''}
        loading={saving}
      />
    </div>
  );
}
