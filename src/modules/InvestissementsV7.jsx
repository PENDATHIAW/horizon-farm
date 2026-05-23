import { BarChart2, CheckCircle2, Edit, Eye, FileText, PackagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, fmtPercent, toNumber } from '../utils/format';
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

const safeArray = (v) => Array.isArray(v) ? v : [];
const st = (r = {}) => String(r.statut ?? r.status ?? '').toLowerCase();
const keyOf = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
const isHorizon = (bp = {}) => String(bp.id || '') === HORIZON_FARM_BP_ID || String(bp.nom || bp.title || '').toLowerCase().includes('horizon farm');
const lineTotal = (l) => Math.round(toNumber(l.quantite) * toNumber(l.prix_unitaire));

function nav(id) { const labels = { finances: ['finances'], stock: ['stock'], avicole: ['avicole'], animaux: ['animaux'], ventes: ['ventes'] }[id] || [id]; Array.from(document.querySelectorAll('nav button')).find((b) => labels.some((l) => b.textContent?.toLowerCase().includes(l)))?.click(); }
function Card({ label, value, tone, sub }) { const cls = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : tone === 'warn' ? 'text-amber-600' : 'text-[#2f2415]'; return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className={`font-black mt-1 ${cls}`}>{value}</p>{sub ? <p className="text-xs text-[#8a7456] mt-1">{sub}</p> : null}</div>; }
function buildRows(projections, investment) { let cumul = -investment; return safeArray(projections).slice().sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index)).map((p) => { const ca = toNumber(p.ca_estime); const charges = toNumber(p.charges_estimees); const marge = ca - charges; cumul += marge; return { mois: p.mois_index, ca, charges, marge, cumul, pct: Math.min(100, Math.max(0, ((investment + cumul) / Math.max(1, investment)) * 100)) }; }); }
function buildMetrics({ plan, lines, costs, projections, transactions }) { const investment = lines.reduce((a, r) => a + toNumber(r.total), 0); const effective = lines.filter((r) => st(r) === 'effectif').reduce((a, r) => a + toNumber(r.total), 0); const remaining = Math.max(0, investment - effective); const monthly = costs.reduce((a, r) => a + toNumber(r.montant_mensuel), 0); const cycleCharges = projections.reduce((a, r) => a + toNumber(r.charges_estimees), 0) || monthly * toNumber(plan?.duree_cycle_mois || 12); const revenue = projections.reduce((a, r) => a + toNumber(r.ca_estime), 0); const net = revenue - cycleCharges - investment; const roi = investment > 0 ? (net / investment) * 100 : 0; const rows = buildRows(projections, investment); const payback = rows.find((r) => r.cumul >= 0)?.mois || null; const missingForecast = !revenue && !cycleCharges; const score = missingForecast ? 0 : Math.max(0, Math.min(100, Math.round((roi > 0 ? 35 : 0) + (payback ? 25 : 0) + (revenue > cycleCharges ? 20 : 0) + (projections.length ? 20 : 0)))); const verdict = missingForecast ? 'Prévisions à compléter' : score >= 75 ? 'Pertinent' : score >= 50 ? 'À sécuriser' : 'À revoir'; const cashOut = safeArray(transactions).filter((r) => String(r.type).toLowerCase() === 'sortie' && st(r) !== 'annule').reduce((a, r) => a + toNumber(r.montant), 0); return { investment, effective, remaining, monthly, cycleCharges, revenue, net, roi, rows, payback, score, verdict, missingForecast, cashOut }; }

async function syncOfficialRows({ rows, officialRows, keyField = 'designation', createFn, updateFn, buildFn, patchFn, planId }) {
  const current = safeArray(rows);
  const byKey = new Map(current.map((row) => [keyOf(row[keyField]), row]));
  const officialKeys = new Set(officialRows.map((row) => keyOf(row[keyField])));
  let created = 0;
  let updated = 0;
  for (const official of officialRows) {
    const existing = byKey.get(keyOf(official[keyField]));
    if (existing?.id) {
      const patch = patchFn ? patchFn(official, existing) : official;
      if (updateFn) { await updateFn(existing.id, patch); updated += 1; }
    } else if (createFn) {
      await createFn(buildFn(official, planId)); created += 1;
    }
  }
  const obsolete = current.filter((row) => !officialKeys.has(keyOf(row[keyField])) && !['effectif', 'lie_metier'].includes(st(row)));
  return { created, updated, obsolete: obsolete.length };
}

async function createOrUpdateHorizonFarmPlan(props) {
  const existing = safeArray(props.businessPlans).find(isHorizon);
  const officialPlan = buildHorizonFarmBusinessPlan();
  const plan = existing || officialPlan;
  try {
    if (existing?.id && props.onUpdateBusinessPlan) await props.onUpdateBusinessPlan(existing.id, officialPlan);
    if (!existing) await props.onCreateBusinessPlan?.(officialPlan);
    const planId = plan.id || HORIZON_FARM_BP_ID;
    const currentLines = safeArray(props.bpInvestmentLines).filter((line) => line.business_plan_id === planId);
    const currentCosts = safeArray(props.bpRecurringCosts).filter((line) => line.business_plan_id === planId);
    const currentProjections = safeArray(props.bpRevenueProjections).filter((line) => line.business_plan_id === planId);

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
      patchFn: (cost) => ({ designation: cost.designation, categorie: cost.categorie, montant_mensuel: toNumber(cost.montant_mensuel), frequence: 'mensuelle', source_module: 'investissements', source_business_plan: HORIZON_FARM_BP_NAME }),
    });

    let projectionCreated = 0;
    let projectionUpdated = 0;
    const byMonth = new Map(currentProjections.map((row) => [Number(row.mois_index), row]));
    for (const projection of HORIZON_FARM_REVENUE_PROJECTIONS) {
      const existingProjection = byMonth.get(Number(projection.mois_index));
      if (existingProjection?.id && props.onUpdateBpRevenueProjection) {
        await props.onUpdateBpRevenueProjection(existingProjection.id, { ca_estime: toNumber(projection.ca_estime), charges_estimees: toNumber(projection.charges_estimees), notes: projection.notes, source_module: 'investissements', source_business_plan: HORIZON_FARM_BP_NAME });
        projectionUpdated += 1;
      } else if (!existingProjection && props.onCreateBpRevenueProjection) {
        await props.onCreateBpRevenueProjection(buildHorizonFarmProjection(projection, planId));
        projectionCreated += 1;
      }
    }

    await props.onRefreshBusinessPlans?.();
    await props.onRefreshBpInvestmentLines?.();
    toast.success(`BP synchronisé : ${lineResult.created + costResult.created + projectionCreated} ajout(s), ${lineResult.updated + costResult.updated + projectionUpdated} mise(s) à jour`);
  } catch (error) {
    toast.error(error.message || 'Synchronisation du BP Horizon Farm impossible');
  }
}

function HorizonFarmPreview({ props }) {
  const investmentTotal = HORIZON_FARM_INVESTMENT_LINES.reduce((sum, line) => sum + lineTotal(line), 0);
  const monthlyTotal = HORIZON_FARM_MONTHLY_COSTS.reduce((sum, line) => sum + toNumber(line.montant_mensuel), 0);
  return <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Business plan officiel</p><h2 className="text-2xl font-black text-[#2f2415] mt-1">Business Plan Horizon Farm</h2><p className="text-sm text-[#7d6a4a] mt-1">Source unique : fichier financier officiel. Le bouton ci-dessous met à jour les anciennes lignes au lieu de seulement ajouter les manquantes.</p></div><button type="button" onClick={() => createOrUpdateHorizonFarmPlan(props)} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white hover:bg-[#3d2f1d]">Créer / mettre à jour le BP</button></div><div className="grid grid-cols-2 xl:grid-cols-4 gap-3"><Card label="Besoins officiels" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal)} /><Card label="Lignes investissement" value={HORIZON_FARM_INVESTMENT_LINES.length} /><Card label="Charges mensuelles" value={fmtCurrency(monthlyTotal)} /><Card label="CA année 1" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal)} /><Card label="Financement" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.funding.officialTotal)} /><Card label="BFR A1" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.workingCapital.bfrByYear[0])} /><Card label="Résultat A1" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.forecast.resultByYear[0])} /><Card label="Trésorerie finale A1" value={fmtCurrency(HORIZON_FARM_OFFICIAL_BP.forecast.monthlyCashYear1.at(-1)?.cumulativeCash || 0)} /></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><b>À savoir :</b> le coût poussins chair est corrigé à 1 024 000 FCFA/mois selon ta stratégie validée.</div></div>;
}

function AmortizationModal({ open, onClose, rows, metrics }) { if (!open) return null; return <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl border border-[#d6c3a0] w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col"><div className="p-4 border-b border-[#eadcc2] flex justify-between items-start gap-3"><div><h3 className="font-black text-xl text-[#2f2415]">Plan d’amortissement</h3><p className="text-sm text-[#8a7456]">Le solde part de l’investissement prévu, puis se réduit avec la marge mensuelle.</p></div><button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-[#fff3d8]"><X size={18} /></button></div><div className="overflow-auto p-4"><table className="w-full text-sm min-w-[760px]"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Mois</th><th className="px-3 py-2">CA prévu</th><th className="px-3 py-2">Charges</th><th className="px-3 py-2">Marge</th><th className="px-3 py-2">Solde investissement</th><th className="px-3 py-2">Amorti</th></tr></thead><tbody>{rows.map((r) => <tr key={r.mois} className="border-t border-[#eadcc2]"><td className="px-3 py-2 font-bold">M{r.mois}</td><td className="px-3 py-2">{fmtCurrency(r.ca)}</td><td className="px-3 py-2">{fmtCurrency(r.charges)}</td><td className={`px-3 py-2 font-bold ${r.marge >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(r.marge)}</td><td className={`px-3 py-2 font-bold ${r.cumul >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(r.cumul)}</td><td className="px-3 py-2">{r.pct.toFixed(0)}%</td></tr>)}</tbody></table></div></div></div>; }

function Summary({ plan, metrics, props }) { const [modal, setModal] = useState(false); if (!plan) return <HorizonFarmPreview props={props} />; return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Résumé du Business Plan</p><h2 className="text-2xl font-black text-[#2f2415] mt-1">{plan.nom}</h2><p className="text-sm text-[#7d6a4a] mt-1">Synchronise le BP officiel puis suis les dépenses réelles.</p></div><div className="flex flex-wrap gap-2"><Btn icon={Plus} onClick={() => createOrUpdateHorizonFarmPlan(props)}>Créer / mettre à jour BP</Btn><Btn icon={BarChart2} onClick={() => setModal(true)}>Plan d’amortissement</Btn>{['finances','ventes','stock','avicole','animaux'].map((x) => <Btn key={x} small variant="outline" onClick={() => nav(x)}>{x[0].toUpperCase() + x.slice(1)}</Btn>)}</div></div><HorizonFarmPreview props={props} /><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><Card label="Investissement prévu" value={fmtCurrency(metrics.investment)} /><Card label="Investi effectif" value={fmtCurrency(metrics.effective)} sub={`Reste : ${fmtCurrency(metrics.remaining)}`} /><Card label="Charges du cycle" value={fmtCurrency(metrics.cycleCharges)} sub={`Mensuel : ${fmtCurrency(metrics.monthly)}`} /><Card label="CA prévu fin cycle" value={fmtCurrency(metrics.revenue)} /><Card label="Gain/perte fin cycle" value={fmtCurrency(metrics.net)} tone={metrics.net >= 0 ? 'good' : 'bad'} /><Card label="ROI" value={metrics.missingForecast ? 'À compléter' : fmtPercent(metrics.roi)} tone={metrics.roi >= 0 && !metrics.missingForecast ? 'good' : 'bad'} /><Card label="Payback" value={metrics.payback ? `Mois ${metrics.payback}` : 'Non atteint'} /><Card label="Décision" value={`${metrics.verdict} · ${metrics.score}%`} tone={metrics.score >= 75 ? 'good' : metrics.score >= 50 ? 'warn' : 'bad'} /></div><AmortizationModal open={modal} onClose={() => setModal(false)} rows={metrics.rows} metrics={metrics} /></div>; }

function Editor({ plan, lines, onUpdateBpInvestmentLine, onDeleteBpInvestmentLine, onCreateFinanceTransaction, onRefreshBusinessPlans, onRefreshFinances }) { const [editing, setEditing] = useState(false); const [draft, setDraft] = useState([]); const [busy, setBusy] = useState(''); useEffect(() => setDraft(lines.map((l) => ({ ...l }))), [plan?.id, lines.length]); if (!plan) return null; const rows = editing ? draft : lines; const update = (id, patch) => setDraft((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l)); const save = async () => { setBusy('save'); try { await Promise.all(draft.map((l) => onUpdateBpInvestmentLine?.(l.id, { designation: l.designation, categorie: l.categorie, quantite: toNumber(l.quantite), unite: l.unite, prix_unitaire: toNumber(l.prix_unitaire), total: lineTotal(l), statut: l.statut || 'prevu', preuve_url: l.preuve_url || '', transaction_id: l.transaction_id || '' }))); await onRefreshBusinessPlans?.(); setEditing(false); toast.success('BP mis à jour'); } catch (e) { toast.error(e.message || 'Mise à jour impossible'); } finally { setBusy(''); } }; const markEffective = async (l) => { setBusy(l.id); try { let transactionId = l.transaction_id || ''; if (!transactionId && onCreateFinanceTransaction) { transactionId = makeId('FIN'); await onCreateFinanceTransaction({ id: transactionId, type: 'sortie', montant: toNumber(l.total), categorie: 'investissement', activite: 'Investissements', libelle: l.designation, statut: 'paye', date: new Date().toISOString().slice(0,10), bp_line_id: l.id, business_plan_id: plan.id }); await onRefreshFinances?.(); } await onUpdateBpInvestmentLine?.(l.id, { statut: 'effectif', effective_at: new Date().toISOString(), transaction_id: transactionId }); await onRefreshBusinessPlans?.(); toast.success('Dépense passée en effectif'); } catch (e) { toast.error(e.message || 'Passage en effectif impossible'); } finally { setBusy(''); } }; return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-5"><div className="flex justify-between gap-3 flex-wrap"><div><h3 className="font-black text-[#2f2415]">Dépenses du BP</h3><p className="text-sm text-[#8a7456]">Les lignes officielles se synchronisent avec le fichier BP. Passe une ligne en effectif uniquement quand elle est réellement payée.</p></div><div className="flex gap-2">{editing ? <Btn icon={Save} onClick={save} disabled={busy === 'save'}>Enregistrer</Btn> : <Btn icon={Edit} onClick={() => setEditing(true)}>Modifier</Btn>}{editing && <Btn variant="outline" onClick={() => setEditing(false)}>Annuler</Btn>}</div></div><div className="overflow-x-auto rounded-xl border border-[#eadcc2]"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Dépense</th><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Qté</th><th className="px-3 py-2">Unité</th><th className="px-3 py-2">Prix</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{rows.map((l) => <tr key={l.id} className="border-t border-[#eadcc2]"><Cell edit={editing} value={l.designation || ''} onChange={(v) => update(l.id, { designation: v })} wide /><Cell edit={editing} value={l.categorie || ''} onChange={(v) => update(l.id, { categorie: v })} /><Cell edit={editing} type="number" value={l.quantite ?? 0} onChange={(v) => update(l.id, { quantite: v })} /><Cell edit={editing} value={l.unite || ''} onChange={(v) => update(l.id, { unite: v })} /><Cell edit={editing} type="number" value={l.prix_unitaire ?? 0} onChange={(v) => update(l.id, { prix_unitaire: v })} display={fmtCurrency(l.prix_unitaire)} /><td className="px-3 py-2 font-black">{fmtCurrency(editing ? lineTotal(l) : l.total)}</td><td className="px-3 py-2">{editing ? <select className="rounded-lg border border-[#d6c3a0] px-2 py-1" value={l.statut || 'prevu'} onChange={(e) => update(l.id, { statut: e.target.value })}><option value="prevu">prévu</option><option value="effectif">effectif</option><option value="annule">annulé</option></select> : (l.statut || 'prévu')}</td><td className="px-3 py-2">{!editing && st(l) !== 'effectif' ? <button type="button" disabled={busy === l.id} className="text-xs font-bold text-emerald-600" onClick={() => markEffective(l)}><CheckCircle2 size={12} className="inline" /> Passer effectif</button> : <span className="text-xs text-[#8a7456]">Effectif</span>}{editing && <button type="button" className="text-xs text-red-500 ml-2" onClick={() => onDeleteBpInvestmentLine?.(l.id)}><Trash2 size={12} className="inline" /> Suppr.</button>}</td></tr>)}</tbody></table></div></div>; }
function Cell({ edit, value, onChange, type = 'text', display, wide }) { return <td className={`px-3 py-2 ${wide ? 'min-w-[230px]' : 'min-w-[110px]'}`}>{edit ? <input type={type} className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)} /> : (display || value || '—')}</td>; }

export default function InvestissementsV7(props) {
  const [showFull, setShowFull] = useState(false);
  const plan = useMemo(() => activePlan(props.businessPlans), [props.businessPlans]);
  const lines = useMemo(() => plan ? safeArray(props.bpInvestmentLines).filter((r) => r.business_plan_id === plan.id) : [], [plan, props.bpInvestmentLines]);
  const costs = useMemo(() => plan ? safeArray(props.bpRecurringCosts).filter((r) => r.business_plan_id === plan.id) : [], [plan, props.bpRecurringCosts]);
  const projections = useMemo(() => plan ? safeArray(props.bpRevenueProjections).filter((r) => r.business_plan_id === plan.id) : [], [plan, props.bpRevenueProjections]);
  const m = useMemo(() => buildMetrics({ plan, lines, costs, projections, transactions: props.transactions }), [plan, lines, costs, projections, props.transactions]);
  return <div className="space-y-6"><Summary plan={plan} metrics={m} props={props} /><Editor plan={plan} lines={lines} {...props} /><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><FileText size={18} className="text-[#9a6b12]" /><div><h3 className="font-black text-[#2f2415]">Gestion complète des BP</h3><p className="text-xs text-[#8a7456]">Les anciennes fiches et formulaires complets sont disponibles ici si besoin.</p></div></div><Btn icon={showFull ? Eye : FileText} variant="outline" onClick={() => setShowFull(!showFull)}>{showFull ? 'Masquer' : 'Afficher'}</Btn></div>{showFull && <div className="mt-4"><BaseInvestissements {...props} /></div>}</div></div>;
}
