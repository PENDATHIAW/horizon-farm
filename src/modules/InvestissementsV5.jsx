import { BarChart2, CalendarDays, CheckCircle2, Edit, Link as LinkIcon, PackagePlus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, fmtPercent, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import BaseInvestissements from './Investissements.jsx';

const safeArray = (value) => Array.isArray(value) ? value : [];
const isHorizon = (bp = {}) => String(bp.nom || '').toLowerCase().includes('horizon farm');
const status = (row = {}) => String(row.statut ?? row.status ?? '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.total_amount ?? 0);
const lineTotal = (line) => Math.round(toNumber(line.quantite) * toNumber(line.prix_unitaire));

const cleanDesignation = (value = '') => String(value)
  .replace(/\s+\d+\s*(mois|semaines?|jours?)\b/gi, '')
  .replace(/\s+\d+\s*-\s*\d+\s*semaines?/gi, '')
  .replace(/\s+à\s+[\d\s.,]+\s*(f|fcfa)\b/gi, '')
  .replace(/\s*\([^)]*remplacé[^)]*\)/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

const ONE_TIME_EXPENSES = [
  ['Achat poussins pondeuses', 'cheptel', 4000, 'sujets', 900],
  ['Achat poussins chair', 'cheptel', 200, 'sujets', 350],
  ['Achat bovins', 'cheptel', 10, 'têtes', 0],
  ['Achat moutons', 'cheptel', 5, 'têtes', 0],
  ['Achat chèvres', 'cheptel', 5, 'têtes', 0],
  ['Poulailler / bâtiment avicole', 'infrastructure', 1, 'forfait', 0],
  ['Poussinière / chauffage', 'equipement', 1, 'lot', 0],
  ['Pondoirs', 'equipement', 1, 'lot', 0],
  ['Abreuvoirs', 'equipement', 1, 'lot', 0],
  ['Mangeoires', 'equipement', 1, 'lot', 0],
  ['Eau / pompe / réservoir', 'infrastructure', 1, 'forfait', 0],
  ['Magasin stock', 'infrastructure', 1, 'forfait', 0],
  ['Clôture / sécurité', 'infrastructure', 1, 'forfait', 0],
  ['Irrigation', 'equipement', 1, 'lot', 0],
  ['Matériel agricole', 'equipement', 1, 'lot', 0],
  ['Transport et installation', 'logistique', 1, 'forfait', 0],
  ['Fonds de roulement', 'fonds_roulement', 1, 'forfait', 0],
  ['Démarches administratives', 'administratif', 1, 'forfait', 0],
  ['Imprévus de démarrage', 'imprevus', 1, 'forfait', 0],
].map(([designation, categorie, quantite, unite, prix_unitaire]) => ({ designation, categorie, quantite, unite, prix_unitaire }));

const MONTHLY_EXPENSES = [
  ['Location champ prêt à exploiter', 'location_champ'],
  ['Location bâtiment / poulailler', 'location_batiment'],
  ['Aliment pondeuses', 'alimentation'],
  ['Aliment poulets de chair', 'alimentation'],
  ['Aliment ruminants', 'alimentation'],
  ['Salaires / main d’œuvre', 'salaires'],
  ['Santé / vaccins / vétérinaire', 'sante'],
  ['Énergie / eau / nettoyage', 'energie'],
  ['Litière / biosécurité', 'biosecurite'],
  ['Transport / commercialisation', 'logistique'],
  ['Emballages / consommables', 'consommables'],
  ['Maintenance', 'maintenance'],
  ['Administration', 'administratif'],
  ['Remboursement financement', 'financement'],
  ['Imprévus exploitation', 'imprevus'],
].map(([designation, categorie]) => ({ designation, categorie, montant_mensuel: 0 }));

function navigate(moduleId) {
  if (typeof document === 'undefined') return;
  const labels = {
    finances: ['finances'], comptabilite: ['comptabilite'], avicole: ['avicole'], animaux: ['animaux'], cultures: ['cultures'], stock: ['stock'], sante: ['sante', 'vaccins'], ventes: ['ventes'], documents: ['documents'], fournisseurs: ['fournisseurs'], impact_business: ['impact business'], equipements: ['equipements'],
  }[moduleId] || [moduleId];
  Array.from(document.querySelectorAll('nav button')).find((button) => labels.some((label) => button.textContent?.toLowerCase().includes(label)))?.click();
}

function getActivePlan(businessPlans) {
  return safeArray(businessPlans).find(isHorizon) || safeArray(businessPlans)[0];
}

function buildMetrics({ plan, lines, costs, projections, transactions }) {
  const investment = lines.reduce((acc, row) => acc + toNumber(row.total), 0);
  const monthly = costs.reduce((acc, row) => acc + toNumber(row.montant_mensuel), 0);
  const revenue = projections.reduce((acc, row) => acc + toNumber(row.ca_estime), 0);
  const projectedCharges = projections.reduce((acc, row) => acc + toNumber(row.charges_estimees), 0);
  const fallbackCharges = monthly * toNumber(plan?.duree_cycle_mois || 12);
  const totalCharges = projectedCharges || fallbackCharges;
  const margin = revenue - totalCharges - investment;
  const roi = investment > 0 ? (margin / investment) * 100 : 0;
  const cashIn = safeArray(transactions).filter((row) => String(row.type).toLowerCase() === 'entree' && status(row) !== 'annule').reduce((acc, row) => acc + amount(row), 0);
  const cashOut = safeArray(transactions).filter((row) => String(row.type).toLowerCase() === 'sortie' && status(row) !== 'annule').reduce((acc, row) => acc + amount(row), 0);
  const realMargin = cashIn - cashOut;
  return { investment, monthly, revenue, totalCharges, margin, roi, realMargin };
}

function buildAmortization({ projections, investment }) {
  let cumulative = -investment;
  return safeArray(projections).sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index)).map((row) => {
    const ca = toNumber(row.ca_estime);
    const charges = toNumber(row.charges_estimees);
    const marge = ca - charges;
    cumulative += marge;
    return { mois: row.mois_index, ca, charges, marge, cumulative, paid: Math.min(100, Math.max(0, ((investment + cumulative) / Math.max(1, investment)) * 100)) };
  });
}

function Summary({ plan, metrics, amortization }) {
  if (!plan) return null;
  const payback = amortization.find((row) => row.cumulative >= 0)?.mois;
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Business Plan actif</p>
          <h2 className="text-2xl font-black text-[#2f2415] mt-1">{plan.nom}</h2>
          <p className="text-sm text-[#7d6a4a] mt-1">{plan.localisation || 'Localisation à préciser'} · {plan.statut || 'planifié'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn small variant="outline" onClick={() => navigate('finances')}>Finances</Btn>
          <Btn small variant="outline" onClick={() => navigate('comptabilite')}>Comptabilité</Btn>
          <Btn small variant="outline" onClick={() => navigate('stock')}>Stock</Btn>
          <Btn small variant="outline" onClick={() => navigate('avicole')}>Avicole</Btn>
          <Btn small variant="outline" onClick={() => navigate('animaux')}>Animaux</Btn>
          <Btn small variant="outline" onClick={() => navigate('cultures')}>Cultures</Btn>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Investissement</p><p className="font-black text-[#2f2415] mt-1">{fmtCurrency(metrics.investment)}</p></div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Charges mensuelles</p><p className="font-black text-[#2f2415] mt-1">{fmtCurrency(metrics.monthly)}</p></div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">CA prévu cycle</p><p className="font-black text-[#2f2415] mt-1">{fmtCurrency(metrics.revenue)}</p></div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Marge fin cycle</p><p className={`font-black mt-1 ${metrics.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(metrics.margin)}</p></div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">ROI / Payback</p><p className={`font-black mt-1 ${metrics.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtPercent(metrics.roi)} · {payback ? `M${payback}` : '—'}</p></div>
      </div>
    </div>
  );
}

function AmortizationPlan({ rows }) {
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
      <div className="flex items-center gap-2 mb-3"><BarChart2 size={18} className="text-[#9a6b12]" /><h3 className="font-black text-[#2f2415]">Plan d’amortissement</h3></div>
      <div className="overflow-x-auto rounded-xl border border-[#eadcc2]">
        <table className="w-full text-sm">
          <thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Mois</th><th className="px-3 py-2">CA prévu</th><th className="px-3 py-2">Charges</th><th className="px-3 py-2">Marge mois</th><th className="px-3 py-2">Solde investissement</th><th className="px-3 py-2">Amorti</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.mois} className="border-t border-[#eadcc2]"><td className="px-3 py-2 font-bold">M{row.mois}</td><td className="px-3 py-2">{fmtCurrency(row.ca)}</td><td className="px-3 py-2">{fmtCurrency(row.charges)}</td><td className={`px-3 py-2 font-bold ${row.marge >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(row.marge)}</td><td className={`px-3 py-2 font-bold ${row.cumulative >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(row.cumulative)}</td><td className="px-3 py-2">{row.paid.toFixed(0)}%</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function ExpenseEditor({ plan, lines, onUpdateBpInvestmentLine, onCreateBpInvestmentLine, onDeleteBpInvestmentLine, onCreateBpRecurringCost, onRefreshBusinessPlans }) {
  const [editing, setEditing] = useState(false);
  const [draftLines, setDraftLines] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraftLines(lines.map((line) => ({ ...line, designation: cleanDesignation(line.designation) }))); }, [plan?.id, lines.length]);

  if (!plan) return null;
  const rows = editing ? draftLines : lines;
  const total = rows.reduce((acc, row) => acc + toNumber(editing ? lineTotal(row) : row.total), 0);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(draftLines.map((line) => onUpdateBpInvestmentLine?.(line.id, { designation: cleanDesignation(line.designation), categorie: line.categorie, quantite: toNumber(line.quantite), unite: line.unite, prix_unitaire: toNumber(line.prix_unitaire), total: lineTotal(line), statut: line.statut || 'prevu', preuve_url: line.preuve_url || '', transaction_id: line.transaction_id || '' })));
      await onRefreshBusinessPlans?.();
      setEditing(false);
      toast.success('Dépenses mises à jour');
    } catch (error) { toast.error(error.message || 'Mise à jour impossible'); } finally { setSaving(false); }
  };

  const markEffective = async (line) => {
    try {
      await onUpdateBpInvestmentLine?.(line.id, { statut: 'effectif', effective_at: new Date().toISOString() });
      await onRefreshBusinessPlans?.();
      toast.success('Ligne marquée effective');
    } catch (error) { toast.error(error.message || 'Mise à jour impossible'); }
  };

  const addLine = async (item) => {
    await onCreateBpInvestmentLine?.({ id: makeId('BPLI'), business_plan_id: plan.id, designation: item.designation, categorie: item.categorie, quantite: item.quantite, unite: item.unite, prix_unitaire: item.prix_unitaire, total: Math.round(toNumber(item.quantite) * toNumber(item.prix_unitaire)), statut: 'prevu' });
    await onRefreshBusinessPlans?.();
    toast.success('Dépense ajoutée');
  };
  const addCost = async (item) => {
    await onCreateBpRecurringCost?.({ id: makeId('BPCOST'), business_plan_id: plan.id, designation: item.designation, categorie: item.categorie, montant_mensuel: item.montant_mensuel, frequence: 'mensuelle' });
    await onRefreshBusinessPlans?.();
    toast.success('Charge ajoutée');
  };

  const updateDraft = (id, patch) => setDraftLines((prev) => prev.map((line) => line.id === id ? { ...line, ...patch } : line));

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div><h3 className="font-black text-[#2f2415]">Dépenses du BP</h3><p className="text-sm text-[#8a7456]">Prévu, effectif, preuve et transaction liée.</p></div>
        <div className="flex flex-wrap gap-2"><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Total lignes</p><p className="font-black text-[#2f2415]">{fmtCurrency(total)}</p></div>{editing ? <Btn icon={Save} onClick={save} disabled={saving}>Enregistrer</Btn> : <Btn icon={Edit} onClick={() => setEditing(true)}>Modifier</Btn>}{editing && <Btn variant="outline" onClick={() => { setDraftLines(lines.map((line) => ({ ...line, designation: cleanDesignation(line.designation) }))); setEditing(false); }}>Annuler</Btn>}</div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#eadcc2]">
        <table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Dépense</th><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Qté</th><th className="px-3 py-2">Unité</th><th className="px-3 py-2">Prix</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Preuve / transaction</th><th className="px-3 py-2">Action</th></tr></thead>
          <tbody>{rows.map((line) => <tr key={line.id} className="border-t border-[#eadcc2]">
            <td className="px-3 py-2 min-w-[240px]">{editing ? <input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.designation || ''} onChange={(e) => updateDraft(line.id, { designation: e.target.value })} /> : cleanDesignation(line.designation)}</td>
            <td className="px-3 py-2 min-w-[110px]">{editing ? <input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.categorie || ''} onChange={(e) => updateDraft(line.id, { categorie: e.target.value })} /> : line.categorie}</td>
            <td className="px-3 py-2 min-w-[80px]">{editing ? <input type="number" className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.quantite ?? 0} onChange={(e) => updateDraft(line.id, { quantite: e.target.value })} /> : line.quantite}</td>
            <td className="px-3 py-2 min-w-[80px]">{editing ? <input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.unite || ''} onChange={(e) => updateDraft(line.id, { unite: e.target.value })} /> : line.unite}</td>
            <td className="px-3 py-2 min-w-[110px]">{editing ? <input type="number" className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.prix_unitaire ?? 0} onChange={(e) => updateDraft(line.id, { prix_unitaire: e.target.value })} /> : fmtCurrency(line.prix_unitaire)}</td>
            <td className="px-3 py-2 font-black min-w-[120px]">{fmtCurrency(editing ? lineTotal(line) : line.total)}</td>
            <td className="px-3 py-2 min-w-[100px]">{editing ? <select className="rounded-lg border border-[#d6c3a0] px-2 py-1" value={line.statut || 'prevu'} onChange={(e) => updateDraft(line.id, { statut: e.target.value })}><option value="prevu">prévu</option><option value="effectif">effectif</option><option value="annule">annulé</option></select> : (line.statut || 'prévu')}</td>
            <td className="px-3 py-2 min-w-[180px]">{editing ? <div className="space-y-1"><input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" placeholder="preuve" value={line.preuve_url || ''} onChange={(e) => updateDraft(line.id, { preuve_url: e.target.value })} /><input className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" placeholder="transaction" value={line.transaction_id || ''} onChange={(e) => updateDraft(line.id, { transaction_id: e.target.value })} /></div> : <span className="text-xs text-[#8a7456]">{line.preuve_url || line.transaction_id || '—'}</span>}</td>
            <td className="px-3 py-2 min-w-[110px]">{!editing && line.statut !== 'effectif' ? <button className="text-xs font-bold text-emerald-600" onClick={() => markEffective(line)}><CheckCircle2 size={12} className="inline" /> Effectif</button> : null}{editing ? <button className="text-xs text-red-500" onClick={() => onDeleteBpInvestmentLine?.(line.id)}><Trash2 size={12} className="inline" /> Suppr.</button> : null}</td>
          </tr>)}</tbody></table>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div><div className="flex items-center gap-2 mb-2"><PackagePlus size={16} className="text-[#9a6b12]" /><p className="font-bold text-[#2f2415]">Ajouter dépense ponctuelle</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{ONE_TIME_EXPENSES.map((item) => <button key={item.designation} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left hover:border-[#b6975f]" onClick={() => addLine(item)}><p className="font-bold text-sm text-[#2f2415]">{item.designation}</p><p className="text-xs text-[#8a7456]">{item.categorie}</p></button>)}</div></div>
        <div><div className="flex items-center gap-2 mb-2"><CalendarDays size={16} className="text-[#9a6b12]" /><p className="font-bold text-[#2f2415]">Ajouter charge mensuelle</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{MONTHLY_EXPENSES.map((item) => <button key={item.designation} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left hover:border-[#b6975f]" onClick={() => addCost(item)}><p className="font-bold text-sm text-[#2f2415]">{item.designation}</p><p className="text-xs text-[#8a7456]">{item.categorie}</p></button>)}</div></div>
      </div>
    </div>
  );
}

export default function InvestissementsV5(props) {
  const plan = useMemo(() => getActivePlan(props.businessPlans), [props.businessPlans]);
  const lines = useMemo(() => plan ? safeArray(props.bpInvestmentLines).filter((row) => row.business_plan_id === plan.id) : [], [plan, props.bpInvestmentLines]);
  const costs = useMemo(() => plan ? safeArray(props.bpRecurringCosts).filter((row) => row.business_plan_id === plan.id) : [], [plan, props.bpRecurringCosts]);
  const projections = useMemo(() => plan ? safeArray(props.bpRevenueProjections).filter((row) => row.business_plan_id === plan.id) : [], [plan, props.bpRevenueProjections]);
  const metrics = useMemo(() => buildMetrics({ plan, lines, costs, projections, transactions: props.transactions }), [plan, lines, costs, projections, props.transactions]);
  const amortization = useMemo(() => buildAmortization({ projections, investment: metrics.investment }), [projections, metrics.investment]);

  return (
    <div className="space-y-6">
      <Summary plan={plan} metrics={metrics} amortization={amortization} />
      {amortization.length > 0 && <AmortizationPlan rows={amortization} />}
      <ExpenseEditor plan={plan} lines={lines} costs={costs} {...props} />
      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5">
        <div className="flex items-center gap-2 mb-3"><LinkIcon size={18} className="text-[#9a6b12]" /><h3 className="font-black text-[#2f2415]">Vue complète</h3></div>
        <BaseInvestissements {...props} />
      </div>
    </div>
  );
}
