import { useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle2, HeartPulse, PackageSearch, ReceiptText, ShieldCheck, Stethoscope, TrendingUp } from 'lucide-react';
import { analyzeHealthIntegrity, buildTargetHealthPatch } from '../services/healthIntegrityService';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { buildHealthCostTransaction, buildHealthMissingProofDocument } from '../utils/healthWorkflows';

const arr = (value) => Array.isArray(value) ? value : [];
const targetId = (row = {}) => String(row.related_id || row.target_id || row.entity_id || row.animal_id || row.lot_id || '').trim();
const targetModule = (row = {}) => String(row.module_lie || row.target_type || row.entity_type || '').toLowerCase();
const label = (row = {}) => row.nom || row.type_intervention || row.title || row.id || 'Intervention';
const activeIds = (rows = []) => new Set(arr(rows).filter((row) => row?.id).map((row) => String(row.id)));
const isCollectiveTarget = (id = '') => ['ALL_ANIMAUX', 'ANIMAUX_MALADES', 'ALL_AVICOLE_LOTS', 'AVICOLE_MALADES'].includes(String(id));
const impactCode = (row = {}) => String(row.impact_business_code || '').trim();
const IMPACT_LABELS = {
  aucun_impact: 'Suivi simple, sans action urgente',
  perte_evitee: 'Perte évitée / mortalité réduite',
  risque_mortalite: 'Risque mortalité à surveiller',
  croissance_protegee: 'Croissance / prise de poids protégée',
  ponte_protegee: 'Ponte / production œufs protégée',
  vente_reportee: 'Vente reportée ou bloquée',
  cout_sante_direct: 'Coût santé direct à imputer',
  stock_sante_consomme: 'Stock santé consommé',
  'biosécurité_renforcee': 'Biosécurité renforcée',
  alerte_finance_objectifs: 'Impact à suivre en Finance / Objectifs',
};
const impactLabel = (row = {}) => row.impact_business_label || IMPACT_LABELS[impactCode(row)] || 'Non qualifié';
const impactPriority = (row = {}) => ['risque_mortalite', 'vente_reportee', 'alerte_finance_objectifs'].includes(impactCode(row));
const issueLabel = (issue = '') => ({
  'Finance manquante': 'Dépense santé reliée automatiquement',
  'Module cible manquant': 'Animal ou lot introuvable',
  'Cible collective / non détaillée': 'Groupe large à préciser si besoin',
  'Intervention en retard': 'Soin ou vaccin en retard',
  'Doublon potentiel': 'Possible doublon',
  'Cible encore malade': 'Toujours à surveiller',
}[issue] || issue.replace(/_/g, ' '));
const readableTarget = (row = {}) => {
  const module = targetModule(row);
  if (module.includes('animal')) return 'Animal';
  if (module.includes('avicole') || module.includes('lot')) return 'Lot avicole';
  if (isCollectiveTarget(targetId(row))) return 'Groupe';
  return 'Non précisé';
};
const isHealthRowStillLinked = (row = {}, animalIds = new Set(), lotIds = new Set()) => {
  const id = targetId(row);
  const module = targetModule(row);
  if (!id || isCollectiveTarget(id)) return true;
  if (module.includes('animal')) return animalIds.has(id);
  if (module.includes('avicole') || module.includes('lot')) return lotIds.has(id);
  return true;
};
function topImpacts(rows = []) {
  const map = new Map();
  arr(rows).forEach((row) => {
    const name = impactLabel(row);
    if (!name || name === 'Non qualifié') return;
    map.set(name, (map.get(name) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
}
function Card({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}</div>;
}
export default function HealthQualityControl({ rows = [], stocks = [], transactions = [], animaux = [], lots = [], onUpdate, onUpdateAnimal, onUpdateLot, onRefresh, onRefreshAnimals, onRefreshLots, onCreateFinanceTransaction, onRefreshFinances, onCreateDocument, onRefreshDocuments }) {
  const autoLinkedExpenses = useRef(new Set());
  const animalIds = activeIds(animaux);
  const lotIds = activeIds(lots);
  const linkedRows = arr(rows).filter((row) => isHealthRowStillLinked(row, animalIds, lotIds));
  const audit = analyzeHealthIntegrity({ rows: linkedRows, stocks, transactions, animaux, lots });
  const risky = audit.details.filter((item) => item.issues.length && isHealthRowStillLinked(item.row, animalIds, lotIds)).slice(0, 10);
  const financeMissing = audit.details.filter((item) => item.issues.includes('Finance manquante')).length;
  const targetMissing = audit.details.filter((item) => item.issues.includes('Module cible manquant') || item.issues.includes('Cible collective / non détaillée')).length;
  const late = audit.details.filter((item) => item.issues.includes('Intervention en retard')).length;
  const duplicates = audit.details.filter((item) => item.issues.includes('Doublon potentiel')).length;
  const impacts = topImpacts(linkedRows);
  const missingImpact = linkedRows.filter((row) => !impactCode(row) && !row.impact_business_label).length;
  const priorityImpacts = linkedRows.filter(impactPriority).length;
  const fixTargetStatus = async (item) => {
    const row = item.row;
    const patch = buildTargetHealthPatch(row);
    if (!patch) return;
    const module = targetModule(row);
    const id = targetId(row);
    if (module.includes('animal') && animalIds.has(id)) await onUpdateAnimal?.(id, patch);
    else if ((module.includes('avicole') || module.includes('lot')) && lotIds.has(id)) await onUpdateLot?.(id, patch);
    await Promise.allSettled([onRefresh?.(), onRefreshAnimals?.(), onRefreshLots?.()]);
  };
  const createHealthExpense = async (item) => {
    const row = item.row;
    const transaction = buildHealthCostTransaction({ ...row, cout: item.cost });
    if (!transaction) return;
    await onCreateFinanceTransaction?.(transaction);
    const missingProof = buildHealthMissingProofDocument(row, transaction);
    if (missingProof) await onCreateDocument?.(missingProof);
    await onUpdate?.(row.id, { linked_finance_transaction_id: transaction.id, finance_synced_at: new Date().toISOString() });
    await Promise.allSettled([onRefresh?.(), onRefreshFinances?.(), onRefreshDocuments?.()]);
  };
  useEffect(() => {
    if (!onCreateFinanceTransaction || !onUpdate) return;
    const missing = audit.details.filter((item) => item.issues.includes('Finance manquante') && item?.row?.id && !autoLinkedExpenses.current.has(String(item.row.id)));
    if (!missing.length) return;
    let cancelled = false;
    (async () => {
      for (const item of missing) {
        if (cancelled) return;
        autoLinkedExpenses.current.add(String(item.row.id));
        try {
          await createHealthExpense(item);
        } catch (error) {
          autoLinkedExpenses.current.delete(String(item.row.id));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [audit.details, onCreateFinanceTransaction, onUpdate]);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Stethoscope size={20} /> Contrôle santé</p><p className="mt-1 text-sm text-[#8a7456]">Vérifie les soins, vaccins, coûts, produits utilisés, conséquences terrain et animaux ou lots concernés.</p></div><div className={`${audit.issueCount || priorityImpacts ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} rounded-2xl border px-4 py-3 text-sm font-bold`}>{audit.issueCount ? `${audit.issueCount} point(s) à regarder` : priorityImpacts ? `${priorityImpacts} conséquence(s) à suivre` : 'Santé bien suivie'}</div></div>
    <div className="grid grid-cols-2 lg:grid-cols-8 gap-3"><Card icon={HeartPulse} label="Coût santé" value={fmtCurrency(audit.totalCost)} /><Card icon={ReceiptText} label="Dépenses santé à relier" value={financeMissing} danger={financeMissing > 0} hint={financeMissing > 0 ? 'La liaison finance et preuve/facture est lancée automatiquement.' : ''} /><Card icon={PackageSearch} label="Stock santé faible" value={audit.stockRisks.length} danger={audit.stockRisks.length > 0} /><Card icon={AlertTriangle} label="Retards" value={late} danger={late > 0} /><Card icon={AlertTriangle} label="Doublons possibles" value={duplicates} danger={duplicates > 0} /><Card icon={Stethoscope} label="Cible à préciser" value={targetMissing} danger={targetMissing > 0} /><Card icon={TrendingUp} label="Impacts à suivre" value={priorityImpacts} danger={priorityImpacts > 0} /><Card icon={ShieldCheck} label="Impact non qualifié" value={missingImpact} danger={missingImpact > 0} /></div>
    {impacts.length ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Conséquences dominantes :</b> {impacts.map(([name, count]) => `${name} (${fmtNumber(count)})`).join(' · ')}</div> : null}
    {audit.stockRisks.length ? <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><b>Stock santé faible :</b> {audit.stockRisks.map((s) => `${s.produit || s.nom || s.id} (${fmtNumber(s.quantite)} ${s.unite || ''})`).join(' · ')}</div> : null}
    {risky.length ? <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]"><table className="min-w-full text-sm"><thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Intervention</th><th className="py-2 px-3">Concerné</th><th className="py-2 px-3">Date</th><th className="py-2 px-3">Coût</th><th className="py-2 px-3">Conséquence</th><th className="py-2 px-3">À regarder</th><th className="py-2 px-3">Action</th></tr></thead><tbody>{risky.map((item) => <tr key={item.row.id} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{label(item.row)}</td><td className="py-3 px-3">{readableTarget(item.row)}<p className="text-xs text-[#8a7456]">{targetId(item.row) || 'à préciser'}</p></td><td className="py-3 px-3">{item.row.effectuee || item.row.prevue || item.row.date || '—'}</td><td className="py-3 px-3 font-bold">{fmtCurrency(item.cost)}</td><td className="py-3 px-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${impactPriority(item.row) ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{impactLabel(item.row)}</span></td><td className="py-3 px-3"><div className="flex flex-wrap gap-1">{item.issues.map((issue) => <span key={issue} className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">{issueLabel(issue)}</span>)}</div></td><td className="py-3 px-3"><div className="flex flex-wrap gap-2">{item.issues.includes('Finance manquante') ? <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">Liaison automatique en cours</span> : null}{item.issues.includes('Cible encore malade') ? <button type="button" onClick={() => fixTargetStatus(item)} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-bold text-[#2f2415]"><CheckCircle2 size={14} className="inline" /> Mettre sous surveillance</button> : null}{!item.issues.includes('Finance manquante') && !item.issues.includes('Cible encore malade') ? '—' : null}</div></td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Rien d’urgent à corriger sur les soins et vaccins suivis.</div>}
  </section>;
}
