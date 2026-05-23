import { BarChart2, CheckCircle2, Edit, Eye, FileText, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import {
  buildHorizonFarmBpLine,
  buildHorizonFarmBusinessPlan,
  buildHorizonFarmMonthlyCost,
  buildHorizonFarmProjection,
  HORIZON_FARM_BP_ID,
  HORIZON_FARM_BP_NAME,
  HORIZON_FARM_INVESTMENT_LINES,
  HORIZON_FARM_MONTHLY_COSTS,
  HORIZON_FARM_REVENUE_PROJECTIONS,
} from '../services/horizonFarmBusinessPlanSeed';
import BaseInvestissements from './Investissements.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);
const statusOf = (row = {}) => String(row.statut ?? row.status ?? '').toLowerCase();
const keyOf = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const isHorizonBp = (bp = {}) => String(bp.id || '') === HORIZON_FARM_BP_ID || String(bp.nom || bp.title || '').toLowerCase().includes('horizon farm');
const isArchived = (row = {}) => ['archive', 'archivé', 'annule', 'annulé'].includes(statusOf(row));
const lineTotal = (line = {}) => Math.round(toNumber(line.quantite) * toNumber(line.prix_unitaire));
const finalCash = () => {
  const rows = arr(HORIZON_FARM_OFFICIAL_BP.forecast.monthlyCashYear1);
  return rows[rows.length - 1]?.cumulativeCash || 0;
};
const officialMonthlyCharges = () => HORIZON_FARM_MONTHLY_COSTS.reduce((sum, row) => sum + toNumber(row.montant_mensuel), 0);
const officialAnnualCharges = () => officialMonthlyCharges() * 12;

function activePlan(plans = []) {
  return arr(plans).find(isHorizonBp) || arr(plans).find((bp) => !isArchived(bp)) || arr(plans)[0] || null;
}

function dedupeRows(rows = [], keyField = 'designation') {
  const map = new Map();
  arr(rows).forEach((row) => {
    const key = keyOf(row[keyField]);
    if (!key) return;
    const existing = map.get(key);
    if (!existing || statusOf(row) === 'effectif' || String(row.source_business_plan || '').includes(HORIZON_FARM_BP_NAME)) {
      map.set(key, row);
    }
  });
  return Array.from(map.values());
}

function buildRows(projections, investment) {
  let cumulative = -investment;
  return arr(projections)
    .slice()
    .sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index))
    .map((row) => {
      const ca = toNumber(row.ca_estime);
      const charges = toNumber(row.charges_estimees);
      const margin = ca - charges;
      cumulative += margin;
      return {
        mois: row.mois_index,
        ca,
        charges,
        marge: margin,
        cumul: cumulative,
        pct: Math.min(100, Math.max(0, ((investment + cumulative) / Math.max(1, investment)) * 100)),
      };
    });
}

function buildMetrics(lines = []) {
  const investment = HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal;
  const effective = dedupeRows(lines)
    .filter((row) => ['effectif', 'lie_metier'].includes(statusOf(row)))
    .reduce((sum, row) => sum + toNumber(row.total), 0);
  const rows = buildRows(HORIZON_FARM_REVENUE_PROJECTIONS, investment);
  const payback = rows.find((row) => row.cumul >= 0)?.mois || null;
  return {
    investment,
    effective,
    remaining: Math.max(0, investment - effective),
    monthlyCharges: officialMonthlyCharges(),
    annualCharges: officialAnnualCharges(),
    revenue: HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal,
    officialResultA1: HORIZON_FARM_OFFICIAL_BP.forecast.resultByYear[0] || 0,
    officialCafA1: HORIZON_FARM_OFFICIAL_BP.forecast.cashFlowCapacityByYear[0] || 0,
    finalCashA1: finalCash(),
    payback,
    rows,
  };
}

function Card({ label, value, tone, sub }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : tone === 'warn' ? 'text-amber-600' : 'text-[#2f2415]';
  return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className={`font-black mt-1 ${cls}`}>{value}</p>{sub ? <p className="text-xs text-[#8a7456] mt-1">{sub}</p> : null}</div>;
}

function nav(id) {
  const labels = { finances: ['finances'], stock: ['stock'], avicole: ['avicole'], animaux: ['animaux'], ventes: ['ventes'] }[id] || [id];
  Array.from(document.querySelectorAll('nav button')).find((button) => labels.some((label) => button.textContent?.toLowerCase().includes(label)))?.click();
}

async function syncOfficialRows({ rows, officialRows, keyField = 'designation', createFn, updateFn, buildFn, patchFn, planId }) {
  const current = arr(rows);
  const groups = current.reduce((acc, row) => {
    const key = keyOf(row[keyField]);
    if (!key) return acc;
    acc[key] = [...(acc[key] || []), row];
    return acc;
  }, {});
  const officialKeys = new Set(officialRows.map((row) => keyOf(row[keyField])));
  let created = 0;
  let updated = 0;
  let cleaned = 0;

  for (const official of officialRows) {
    const key = keyOf(official[keyField]);
    const matches = groups[key] || [];
    const existing = matches.find((row) => ['effectif', 'lie_metier'].includes(statusOf(row))) || matches[0];
    if (existing?.id) {
      await updateFn?.(existing.id, patchFn ? patchFn(official, existing) : official);
      updated += 1;
      for (const duplicate of matches.filter((row) => row.id !== existing.id && !['effectif', 'lie_metier'].includes(statusOf(row)))) {
        await updateFn?.(duplicate.id, {
          statut: 'annule',
          status: 'annule',
          obsolete_reason: 'Doublon BP Horizon Farm remplacé par la ligne officielle',
          source_business_plan: HORIZON_FARM_BP_NAME,
        });
        cleaned += 1;
      }
    } else {
      await createFn?.(buildFn(official, planId));
      created += 1;
    }
  }

  for (const row of current.filter((row) => !officialKeys.has(keyOf(row[keyField])) && !['effectif', 'lie_metier', 'annule'].includes(statusOf(row)))) {
    await updateFn?.(row.id, {
      statut: 'annule',
      status: 'annule',
      obsolete_reason: 'Ligne absente du BP officiel Horizon Farm',
      source_business_plan: HORIZON_FARM_BP_NAME,
    });
    cleaned += 1;
  }
  return { created, updated, cleaned };
}

async function synchronizeOfficialBp(props) {
  const existing = arr(props.businessPlans).find(isHorizonBp);
  const officialPlan = buildHorizonFarmBusinessPlan();
  const plan = existing || officialPlan;
  try {
    if (existing?.id) await props.onUpdateBusinessPlan?.(existing.id, officialPlan);
    if (!existing) await props.onCreateBusinessPlan?.(officialPlan);
    const planId = plan.id || HORIZON_FARM_BP_ID;
    const currentLines = arr(props.bpInvestmentLines).filter((line) => line.business_plan_id === planId);
    const currentCosts = arr(props.bpRecurringCosts).filter((line) => line.business_plan_id === planId);
    const currentProjections = arr(props.bpRevenueProjections).filter((line) => line.business_plan_id === planId);

    const lineResult = await syncOfficialRows({
      rows: currentLines,
      officialRows: HORIZON_FARM_INVESTMENT_LINES,
      createFn: props.onCreateBpInvestmentLine,
      updateFn: props.onUpdateBpInvestmentLine,
      buildFn: buildHorizonFarmBpLine,
      planId,
      patchFn: (line, existingLine) => ({
        designation: line.designation,
        categorie: line.categorie,
        quantite: toNumber(line.quantite),
        unite: line.unite,
        prix_unitaire: toNumber(line.prix_unitaire),
        total: lineTotal(line),
        statut: existingLine.statut || 'prevu',
        source_module: 'investissements',
        source_business_plan: HORIZON_FARM_BP_NAME,
      }),
    });
    const costResult = await syncOfficialRows({
      rows: currentCosts,
      officialRows: HORIZON_FARM_MONTHLY_COSTS,
      createFn: props.onCreateBpRecurringCost,
      updateFn: props.onUpdateBpRecurringCost,
      buildFn: buildHorizonFarmMonthlyCost,
      planId,
      patchFn: (cost) => ({
        designation: cost.designation,
        categorie: cost.categorie,
        montant_mensuel: toNumber(cost.montant_mensuel),
        frequence: 'mensuelle',
        source_module: 'investissements',
        source_business_plan: HORIZON_FARM_BP_NAME,
      }),
    });

    let projectionCreated = 0;
    let projectionUpdated = 0;
    let projectionCleaned = 0;
    const groupsByMonth = currentProjections.reduce((acc, row) => {
      const key = Number(row.mois_index);
      if (!key) return acc;
      acc[key] = [...(acc[key] || []), row];
      return acc;
    }, {});
    for (const projection of HORIZON_FARM_REVENUE_PROJECTIONS) {
      const matches = groupsByMonth[Number(projection.mois_index)] || [];
      const existingProjection = matches[0];
      if (existingProjection?.id) {
        await props.onUpdateBpRevenueProjection?.(existingProjection.id, {
          ca_estime: toNumber(projection.ca_estime),
          charges_estimees: toNumber(projection.charges_estimees),
          notes: projection.notes,
          source_module: 'investissements',
          source_business_plan: HORIZON_FARM_BP_NAME,
        });
        projectionUpdated += 1;
        for (const duplicate of matches.slice(1)) {
          await props.onUpdateBpRevenueProjection?.(duplicate.id, { statut: 'annule', status: 'annule', obsolete_reason: 'Projection mensuelle doublon remplacée par le BP officiel' });
          projectionCleaned += 1;
        }
      } else {
        await props.onCreateBpRevenueProjection?.(buildHorizonFarmProjection(projection, planId));
        projectionCreated += 1;
      }
    }

    await props.onRefreshBusinessPlans?.();
    await props.onRefreshBpInvestmentLines?.();
    toast.success(`BP synchronisé : ${lineResult.created + costResult.created + projectionCreated} ajout(s), ${lineResult.updated + costResult.updated + projectionUpdated} mise(s) à jour, ${lineResult.cleaned + costResult.cleaned + projectionCleaned} doublon(s) neutralisé(s)`);
  } catch (error) {
    toast.error(error.message || 'Synchronisation du BP Horizon Farm impossible');
  }
}

function SyncButton({ props }) {
  return <button type="button" onClick={() => synchronizeOfficialBp(props)} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]">Synchroniser BP officiel</button>;
}

function HorizonFarmPreview({ props }) {
  return <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4">
    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
      <div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Business plan officiel</p><h2 className="text-2xl font-black text-[#2f2415] mt-1">Business Plan Horizon Farm</h2><p className="text-sm text-[#7d6a4a] mt-1">Aligne l’ERP sur le fichier BP Horizon Farm et neutralise les doublons.</p></div>
      <SyncButton props={props} />
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Card label="Besoins officiels" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal)} />
      <Card label="Lignes investissement" value={HORIZON_FARM_INVESTMENT_LINES.length} />
      <Card label="Charges mensuelles" value={fmtCurrency(officialMonthlyCharges())} />
      <Card label="CA année 1" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal)} />
      <Card label="Financement" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.funding.officialTotal)} />
      <Card label="BFR A1" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.workingCapital.bfrByYear[0])} />
      <Card label="Résultat A1" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.forecast.resultByYear[0])} />
      <Card label="Trésorerie finale A1" value={fmtCurrency(finalCash())} />
    </div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><b>À savoir :</b> le coût poussins chair est corrigé à 1 024 000 FCFA/mois selon ta stratégie validée.</div>
  </div>;
}

function AmortizationModal({ open, onClose, rows }) {
  if (!open) return null;
  return <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl border border-[#d6c3a0] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
      <div className="p-4 border-b border-[#eadcc2] flex justify-between items-start gap-3"><div><h3 className="font-black text-xl text-[#2f2415]">Plan d’amortissement</h3><p className="text-sm text-[#8a7456]">Le solde part de l’investissement officiel, puis se réduit avec la marge mensuelle prévisionnelle.</p></div><button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[#fff3d8]"><X size={18} /></button></div>
      <div className="overflow-auto p-4"><table className="w-full text-sm min-w-[760px]"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Mois</th><th className="px-3 py-2">CA prévu</th><th className="px-3 py-2">Charges</th><th className="px-3 py-2">Marge</th><th className="px-3 py-2">Solde investissement</th><th className="px-3 py-2">Amorti</th></tr></thead><tbody>{rows.map((row) => <tr key={row.mois} className="border-t border-[#eadcc2]"><td className="px-3 py-2 font-bold">M{row.mois}</td><td className="px-3 py-2">{fmtCurrency(row.ca)}</td><td className="px-3 py-2">{fmtCurrency(row.charges)}</td><td className={`px-3 py-2 font-bold ${row.marge >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(row.marge)}</td><td className={`px-3 py-2 font-bold ${row.cumul >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(row.cumul)}</td><td className="px-3 py-2">{row.pct.toFixed(0)}%</td></tr>)}</tbody></table></div>
    </div>
  </div>;
}

function Summary({ plan, metrics, props }) {
  const [modal, setModal] = useState(false);
  if (!plan) return <HorizonFarmPreview props={props} />;
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
      <div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Résumé du Business Plan</p><h2 className="text-2xl font-black text-[#2f2415] mt-1">{plan.nom}</h2><p className="text-sm text-[#7d6a4a] mt-1">Le résumé utilise les résultats officiels du BP. Les dépenses effectives viennent seulement des lignes réellement payées.</p></div>
      <div className="flex flex-wrap gap-2"><Btn icon={Plus} onClick={() => synchronizeOfficialBp(props)}>Synchroniser BP officiel</Btn><Btn icon={BarChart2} onClick={() => setModal(true)}>Plan d’amortissement</Btn>{['finances','ventes','stock','avicole','animaux'].map((item) => <Btn key={item} small variant="outline" onClick={() => nav(item)}>{item[0].toUpperCase() + item.slice(1)}</Btn>)}</div>
    </div>
    <HorizonFarmPreview props={props} />
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <Card label="Investissement officiel" value={fmtCurrency(metrics.investment)} />
      <Card label="Investi effectif" value={fmtCurrency(metrics.effective)} sub={`Reste : ${fmtCurrency(metrics.remaining)}`} />
      <Card label="Charges annuelles BP" value={fmtCurrency(metrics.annualCharges)} sub={`Mensuel : ${fmtCurrency(metrics.monthlyCharges)}`} />
      <Card label="CA prévu année 1" value={fmtCurrency(metrics.revenue)} />
      <Card label="Résultat A1 officiel" value={fmtCurrency(metrics.officialResultA1)} tone="good" />
      <Card label="CAF A1 officielle" value={fmtCurrency(metrics.officialCafA1)} tone="good" />
      <Card label="Trésorerie finale A1" value={fmtCurrency(metrics.finalCashA1)} tone="good" />
      <Card label="Payback" value={metrics.payback ? `Mois ${metrics.payback}` : 'Non atteint'} />
    </div>
    <AmortizationModal open={modal} onClose={() => setModal(false)} rows={metrics.rows} />
  </div>;
}

function Editor({ plan, lines, onUpdateBpInvestmentLine, onDeleteBpInvestmentLine, onCreateFinanceTransaction, onRefreshBusinessPlans, onRefreshFinances }) {
  const visibleLines = dedupeRows(lines).filter((line) => !isArchived(line));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState([]);
  const [busy, setBusy] = useState('');
  useEffect(() => setDraft(visibleLines.map((line) => ({ ...line }))), [plan?.id, visibleLines.length]);
  if (!plan) return null;
  const rows = editing ? draft : visibleLines;
  const update = (id, patch) => setDraft((prev) => prev.map((line) => line.id === id ? { ...line, ...patch } : line));
  const save = async () => {
    setBusy('save');
    try {
      await Promise.all(draft.map((line) => onUpdateBpInvestmentLine?.(line.id, { designation: line.designation, categorie: line.categorie, quantite: toNumber(line.quantite), unite: line.unite, prix_unitaire: toNumber(line.prix_unitaire), total: lineTotal(line), statut: line.statut || 'prevu', preuve_url: line.preuve_url || '', transaction_id: line.transaction_id || '' })));
      await onRefreshBusinessPlans?.();
      setEditing(false);
      toast.success('BP mis à jour');
    } catch (error) {
      toast.error(error.message || 'Mise à jour impossible');
    } finally {
      setBusy('');
    }
  };
  const markEffective = async (line) => {
    setBusy(line.id);
    try {
      let transactionId = line.transaction_id || '';
      if (!transactionId && onCreateFinanceTransaction) {
        transactionId = makeId('FIN');
        await onCreateFinanceTransaction({ id: transactionId, type: 'sortie', montant: toNumber(line.total), categorie: 'investissement', activite: 'Investissements', libelle: line.designation, statut: 'paye', date: new Date().toISOString().slice(0,10), bp_line_id: line.id, business_plan_id: plan.id });
        await onRefreshFinances?.();
      }
      await onUpdateBpInvestmentLine?.(line.id, { statut: 'effectif', effective_at: new Date().toISOString(), transaction_id: transactionId });
      await onRefreshBusinessPlans?.();
      toast.success('Dépense passée en effectif');
    } catch (error) {
      toast.error(error.message || 'Passage en effectif impossible');
    } finally {
      setBusy('');
    }
  };
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-5">
    <div className="flex justify-between gap-3 flex-wrap"><div><h3 className="font-black text-[#2f2415]">Dépenses du BP</h3><p className="text-sm text-[#8a7456]">Les lignes officielles se synchronisent avec le fichier BP. Passe une ligne en effectif uniquement quand elle est réellement payée.</p></div><div className="flex gap-2">{editing ? <Btn icon={Save} onClick={save} disabled={busy === 'save'}>Enregistrer</Btn> : <Btn icon={Edit} onClick={() => setEditing(true)}>Modifier</Btn>}{editing && <Btn variant="outline" onClick={() => setEditing(false)}>Annuler</Btn>}</div></div>
    <div className="overflow-x-auto rounded-xl border border-[#eadcc2]"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Dépense</th><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Qté</th><th className="px-3 py-2">Unité</th><th className="px-3 py-2">Prix</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{rows.map((line) => <tr key={line.id} className="border-t border-[#eadcc2]"><Cell edit={editing} value={line.designation || ''} onChange={(value) => update(line.id, { designation: value })} wide /><Cell edit={editing} value={line.categorie || ''} onChange={(value) => update(line.id, { categorie: value })} /><Cell edit={editing} type="number" value={line.quantite ?? 0} onChange={(value) => update(line.id, { quantite: value })} /><Cell edit={editing} value={line.unite || ''} onChange={(value) => update(line.id, { unite: value })} /><Cell edit={editing} type="number" value={line.prix_unitaire ?? 0} onChange={(value) => update(line.id, { prix_unitaire: value })} display={fmtCurrency(line.prix_unitaire)} /><td className="px-3 py-2 font-black">{fmtCurrency(editing ? lineTotal(line) : line.total)}</td><td className="px-3 py-2">{editing ? <select className="rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.statut || 'prevu'} onChange={(event) => update(line.id, { statut: event.target.value })}><option value="prevu">prévu</option><option value="effectif">effectif</option><option value="annule">annulé</option></select> : (line.statut || 'prévu')}</td><td className="px-3 py-2">{!editing && statusOf(line) !== 'effectif' ? <button type="button" disabled={busy === line.id} className="text-xs font-bold text-emerald-600" onClick={() => markEffective(line)}><CheckCircle2 size={12} className="inline" /> Passer effectif</button> : <span className="text-xs text-[#8a7456]">Effectif</span>}{editing && <button type="button" className="text-xs text-red-500 ml-2" onClick={() => onDeleteBpInvestmentLine?.(line.id)}><Trash2 size={12} className="inline" /> Suppr.</button>}</td></tr>)}</tbody></table></div>
  </div>;
}

function Cell({ edit, value, onChange, type = 'text', display, wide }) {
  return <td className={`px-3 py-2 ${wide ? 'min-w-[230px]' : 'min-w-[110px]'}`}>{edit ? <input type={type} className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={value} onChange={(event) => onChange(event.target.value)} /> : (display || value || '—')}</td>;
}

export default function InvestissementsV7(props) {
  const [showFull, setShowFull] = useState(false);
  const plan = useMemo(() => activePlan(props.businessPlans), [props.businessPlans]);
  const lines = useMemo(() => plan ? arr(props.bpInvestmentLines).filter((row) => row.business_plan_id === plan.id) : [], [plan, props.bpInvestmentLines]);
  const metrics = useMemo(() => buildMetrics(lines), [lines]);
  return <div className="space-y-6">
    <Summary plan={plan} metrics={metrics} props={props} />
    <Editor plan={plan} lines={lines} {...props} />
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText size={18} className="text-[#9a6b12]" /><div><h3 className="font-black text-[#2f2415]">Gestion complète des BP</h3><p className="text-xs text-[#8a7456]">Les anciennes fiches et formulaires complets sont disponibles ici si besoin.</p></div></div><Btn icon={showFull ? Eye : FileText} variant="outline" onClick={() => setShowFull(!showFull)}>{showFull ? 'Masquer' : 'Afficher'}</Btn></div>{showFull && <div className="mt-4"><BaseInvestissements {...props} /></div>}</div>
  </div>;
}
