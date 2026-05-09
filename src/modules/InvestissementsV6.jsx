import { BarChart2, CheckCircle2, Edit, Link as LinkIcon, PackagePlus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, fmtPercent, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import BaseInvestissements from './Investissements.jsx';

const safeArray = (v) => Array.isArray(v) ? v : [];
const status = (r = {}) => String(r.statut ?? r.status ?? '').toLowerCase();
const isHorizon = (bp = {}) => String(bp.nom || '').toLowerCase().includes('horizon farm');
const clean = (v = '') => String(v).replace(/\s+\d+\s*(mois|semaines?|jours?)\b/gi, '').replace(/\s+\d+\s*-\s*\d+\s*semaines?/gi, '').replace(/\s+à\s+[\d\s.,]+\s*(f|fcfa)\b/gi, '').replace(/\s{2,}/g, ' ').trim();
const lineTotal = (l) => Math.round(toNumber(l.quantite) * toNumber(l.prix_unitaire));

const ONE_TIME = [
  ['Achat poussins pondeuses', 'cheptel', 4000, 'sujets', 900], ['Achat poussins chair', 'cheptel', 200, 'sujets', 350], ['Achat bovins', 'cheptel', 10, 'têtes', 0], ['Achat moutons', 'cheptel', 5, 'têtes', 0], ['Achat chèvres', 'cheptel', 5, 'têtes', 0], ['Poulailler / bâtiment avicole', 'infrastructure', 1, 'forfait', 0], ['Poussinière / chauffage', 'equipement', 1, 'lot', 0], ['Pondoirs', 'equipement', 1, 'lot', 0], ['Abreuvoirs', 'equipement', 1, 'lot', 0], ['Mangeoires', 'equipement', 1, 'lot', 0], ['Eau / pompe / réservoir', 'infrastructure', 1, 'forfait', 0], ['Magasin stock', 'infrastructure', 1, 'forfait', 0], ['Clôture / sécurité', 'infrastructure', 1, 'forfait', 0], ['Irrigation', 'equipement', 1, 'lot', 0], ['Matériel agricole', 'equipement', 1, 'lot', 0], ['Transport et installation', 'logistique', 1, 'forfait', 0], ['Fonds de roulement', 'fonds_roulement', 1, 'forfait', 0], ['Démarches administratives', 'administratif', 1, 'forfait', 0], ['Imprévus de démarrage', 'imprevus', 1, 'forfait', 0]
].map(([designation, categorie, quantite, unite, prix_unitaire]) => ({ designation, categorie, quantite, unite, prix_unitaire }));
const MONTHLY = ['Location champ prêt à exploiter', 'Location bâtiment / poulailler', 'Aliment pondeuses', 'Aliment poulets de chair', 'Aliment ruminants', 'Salaires / main d’œuvre', 'Santé / vaccins / vétérinaire', 'Énergie / eau / nettoyage', 'Litière / biosécurité', 'Transport / commercialisation', 'Emballages / consommables', 'Maintenance', 'Administration', 'Remboursement financement', 'Imprévus exploitation'].map((designation) => ({ designation, categorie: designation.split(' ')[0].toLowerCase(), montant_mensuel: 0 }));

function nav(id) {
  const labels = { finances: ['finances'], comptabilite: ['comptabilite'], stock: ['stock'], avicole: ['avicole'], animaux: ['animaux'], cultures: ['cultures'], ventes: ['ventes'], documents: ['documents'], sante: ['sante', 'vaccins'], impact_business: ['impact business'] }[id] || [id];
  Array.from(document.querySelectorAll('nav button')).find((b) => labels.some((l) => b.textContent?.toLowerCase().includes(l)))?.click();
}
function planOf(bps) { return safeArray(bps).find(isHorizon) || safeArray(bps)[0]; }
function metrics({ plan, lines, costs, projections, transactions }) {
  const plannedInvestment = lines.reduce((a, r) => a + toNumber(r.total), 0);
  const effectiveInvestment = lines.filter((r) => status(r) === 'effectif').reduce((a, r) => a + toNumber(r.total), 0);
  const monthlyCharges = costs.reduce((a, r) => a + toNumber(r.montant_mensuel), 0);
  const cycleCharges = projections.reduce((a, r) => a + toNumber(r.charges_estimees), 0) || monthlyCharges * toNumber(plan?.duree_cycle_mois || 12);
  const revenue = projections.reduce((a, r) => a + toNumber(r.ca_estime), 0);
  const netEnd = revenue - cycleCharges - plannedInvestment;
  const roi = plannedInvestment > 0 ? (netEnd / plannedInvestment) * 100 : 0;
  const payback = (() => { let cumul = -plannedInvestment; for (const p of [...projections].sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index))) { cumul += toNumber(p.ca_estime) - toNumber(p.charges_estimees); if (cumul >= 0) return p.mois_index; } return null; })();
  const cashIn = safeArray(transactions).filter((r) => String(r.type).toLowerCase() === 'entree' && status(r) !== 'annule').reduce((a, r) => a + toNumber(r.montant), 0);
  const cashOut = safeArray(transactions).filter((r) => String(r.type).toLowerCase() === 'sortie' && status(r) !== 'annule').reduce((a, r) => a + toNumber(r.montant), 0);
  const score = Math.max(0, Math.min(100, Math.round((roi > 0 ? 35 : 0) + (payback ? 25 : 0) + (revenue > cycleCharges ? 20 : 0) + (cashIn >= effectiveInvestment ? 10 : 0) + (projections.length ? 10 : 0))));
  const verdict = score >= 75 ? 'Pertinent' : score >= 50 ? 'À sécuriser' : 'À revoir';
  return { plannedInvestment, effectiveInvestment, monthlyCharges, cycleCharges, revenue, netEnd, roi, payback, cashIn, cashOut, score, verdict };
}
function amortization(projections, investment) { let cumul = -investment; return [...projections].sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index)).map((p) => { const marge = toNumber(p.ca_estime) - toNumber(p.charges_estimees); cumul += marge; return { mois: p.mois_index, ca: toNumber(p.ca_estime), charges: toNumber(p.charges_estimees), marge, cumul, pct: Math.min(100, Math.max(0, ((investment + cumul) / Math.max(1, investment)) * 100)) }; }); }

function Summary({ plan, m, rows }) {
  if (!plan) return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><h2 className="text-xl font-black text-[#2f2415]">Investissements</h2><p className="text-sm text-[#8a7456]">Crée un BP pour afficher rentabilité, amortissement et pilotage.</p></div>;
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
    <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Résumé du BP</p><h2 className="text-2xl font-black text-[#2f2415] mt-1">{plan.nom}</h2><p className="text-sm text-[#7d6a4a] mt-1">Objectif: savoir combien le projet peut rapporter et si l’investissement vaut le risque.</p></div><div className="flex flex-wrap gap-2">{['finances','comptabilite','ventes','stock','avicole','animaux','cultures','documents','sante','impact_business'].map((x) => <Btn key={x} small variant="outline" onClick={() => nav(x)}>{x === 'impact_business' ? 'Impact' : x[0].toUpperCase() + x.slice(1)}</Btn>)}</div></div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
      <Card label="Investissement prévu" value={fmtCurrency(m.plannedInvestment)} />
      <Card label="Investi effectif" value={fmtCurrency(m.effectiveInvestment)} />
      <Card label="Charges cycle" value={fmtCurrency(m.cycleCharges)} sub={`Mensuel: ${fmtCurrency(m.monthlyCharges)}`} />
      <Card label="CA prévu fin cycle" value={fmtCurrency(m.revenue)} />
      <Card label="Gain/perte fin cycle" value={fmtCurrency(m.netEnd)} tone={m.netEnd >= 0 ? 'good' : 'bad'} />
      <Card label="ROI" value={fmtPercent(m.roi)} tone={m.roi >= 0 ? 'good' : 'bad'} />
      <Card label="Payback" value={m.payback ? `Mois ${m.payback}` : 'Non atteint'} />
      <Card label="Décision" value={`${m.verdict} · ${m.score}%`} tone={m.score >= 75 ? 'good' : m.score >= 50 ? 'warn' : 'bad'} />
    </div>
    {rows.length > 0 && <div className="rounded-xl border border-[#eadcc2] overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Mois</th><th className="px-3 py-2">CA</th><th className="px-3 py-2">Charges</th><th className="px-3 py-2">Marge</th><th className="px-3 py-2">Solde investissement</th><th className="px-3 py-2">Amorti</th></tr></thead><tbody>{rows.map((r) => <tr key={r.mois} className="border-t border-[#eadcc2]"><td className="px-3 py-2 font-bold">M{r.mois}</td><td className="px-3 py-2">{fmtCurrency(r.ca)}</td><td className="px-3 py-2">{fmtCurrency(r.charges)}</td><td className={`px-3 py-2 font-bold ${r.marge >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(r.marge)}</td><td className={`px-3 py-2 font-bold ${r.cumul >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtCurrency(r.cumul)}</td><td className="px-3 py-2">{r.pct.toFixed(0)}%</td></tr>)}</tbody></table></div>}
  </div>;
}
function Card({ label, value, sub, tone }) { const cls = tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-500' : tone === 'warn' ? 'text-amber-600' : 'text-[#2f2415]'; return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className={`font-black mt-1 ${cls}`}>{value}</p>{sub && <p className="text-xs text-[#8a7456] mt-1">{sub}</p>}</div>; }

function Editor({ plan, lines, onUpdateBpInvestmentLine, onCreateBpInvestmentLine, onDeleteBpInvestmentLine, onCreateBpRecurringCost, onRefreshBusinessPlans }) {
  const [editing, setEditing] = useState(false); const [draft, setDraft] = useState([]);
  useEffect(() => setDraft(lines.map((l) => ({ ...l, designation: clean(l.designation) }))), [plan?.id, lines.length]);
  if (!plan) return null;
  const rows = editing ? draft : lines;
  const update = (id, patch) => setDraft((prev) => prev.map((l) => l.id === id ? { ...l, ...patch } : l));
  const save = async () => { await Promise.all(draft.map((l) => onUpdateBpInvestmentLine?.(l.id, { designation: clean(l.designation), categorie: l.categorie, quantite: toNumber(l.quantite), unite: l.unite, prix_unitaire: toNumber(l.prix_unitaire), total: lineTotal(l), statut: l.statut || 'prevu', preuve_url: l.preuve_url || '', transaction_id: l.transaction_id || '' }))); await onRefreshBusinessPlans?.(); setEditing(false); toast.success('BP mis à jour'); };
  const addLine = async (i) => { await onCreateBpInvestmentLine?.({ id: makeId('BPLI'), business_plan_id: plan.id, ...i, total: lineTotal(i), statut: 'prevu' }); await onRefreshBusinessPlans?.(); };
  const addCost = async (i) => { await onCreateBpRecurringCost?.({ id: makeId('BPCOST'), business_plan_id: plan.id, ...i, frequence: 'mensuelle' }); await onRefreshBusinessPlans?.(); };
  const effective = async (l) => { await onUpdateBpInvestmentLine?.(l.id, { statut: 'effectif', effective_at: new Date().toISOString() }); await onRefreshBusinessPlans?.(); toast.success('Marqué effectif'); };
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-5"><div className="flex justify-between gap-3 flex-wrap"><div><h3 className="font-black text-[#2f2415]">Pilotage des dépenses</h3><p className="text-sm text-[#8a7456]">Prévu → effectif, avec preuve et transaction finance liée.</p></div><div className="flex gap-2">{editing ? <Btn icon={Save} onClick={save}>Enregistrer</Btn> : <Btn icon={Edit} onClick={() => setEditing(true)}>Modifier</Btn>}{editing && <Btn variant="outline" onClick={() => setEditing(false)}>Annuler</Btn>}</div></div><div className="overflow-x-auto rounded-xl border border-[#eadcc2]"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Dépense</th><th className="px-3 py-2">Catégorie</th><th className="px-3 py-2">Qté</th><th className="px-3 py-2">Unité</th><th className="px-3 py-2">Prix</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Preuve</th><th className="px-3 py-2">Transaction</th><th className="px-3 py-2">Action</th></tr></thead><tbody>{rows.map((l) => <tr key={l.id} className="border-t border-[#eadcc2]"><Cell edit={editing} value={clean(l.designation)} onChange={(v) => update(l.id, { designation: v })} wide /><Cell edit={editing} value={l.categorie || ''} onChange={(v) => update(l.id, { categorie: v })} /><Cell edit={editing} type="number" value={l.quantite ?? 0} onChange={(v) => update(l.id, { quantite: v })} /><Cell edit={editing} value={l.unite || ''} onChange={(v) => update(l.id, { unite: v })} /><Cell edit={editing} type="number" value={l.prix_unitaire ?? 0} onChange={(v) => update(l.id, { prix_unitaire: v })} display={fmtCurrency(l.prix_unitaire)} /><td className="px-3 py-2 font-black">{fmtCurrency(editing ? lineTotal(l) : l.total)}</td><td className="px-3 py-2">{editing ? <select className="rounded-lg border px-2 py-1" value={l.statut || 'prevu'} onChange={(e) => update(l.id, { statut: e.target.value })}><option value="prevu">prévu</option><option value="effectif">effectif</option><option value="annule">annulé</option></select> : (l.statut || 'prévu')}</td><Cell edit={editing} value={l.preuve_url || ''} onChange={(v) => update(l.id, { preuve_url: v })} placeholder="preuve" /><Cell edit={editing} value={l.transaction_id || ''} onChange={(v) => update(l.id, { transaction_id: v })} placeholder="transaction" /><td className="px-3 py-2">{!editing && l.statut !== 'effectif' && <button className="text-xs font-bold text-emerald-600" onClick={() => effective(l)}><CheckCircle2 size={12} className="inline" /> Effectif</button>}{editing && <button className="text-xs text-red-500" onClick={() => onDeleteBpInvestmentLine?.(l.id)}><Trash2 size={12} className="inline" /> Suppr.</button>}</td></tr>)}</tbody></table></div><div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><Quick title="Ajouter dépense ponctuelle" icon={PackagePlus} items={ONE_TIME} onClick={addLine} /><Quick title="Ajouter charge mensuelle" icon={BarChart2} items={MONTHLY} onClick={addCost} /></div></div>;
}
function Cell({ edit, value, onChange, type = 'text', display, placeholder, wide }) { return <td className={`px-3 py-2 ${wide ? 'min-w-[230px]' : 'min-w-[110px]'}`}>{edit ? <input type={type} className="w-full rounded-lg border border-[#d6c3a0] px-2 py-1" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : (display || value || '—')}</td>; }
function Quick({ title, icon: Icon, items, onClick }) { return <div><div className="flex items-center gap-2 mb-2"><Icon size={16} className="text-[#9a6b12]" /><p className="font-bold text-[#2f2415]">{title}</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{items.map((i) => <button key={i.designation} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left hover:border-[#b6975f]" onClick={() => onClick(i)}><p className="font-bold text-sm text-[#2f2415]">{i.designation}</p><p className="text-xs text-[#8a7456]">{i.categorie}</p></button>)}</div></div>; }

export default function InvestissementsV6(props) {
  const plan = useMemo(() => planOf(props.businessPlans), [props.businessPlans]);
  const lines = useMemo(() => plan ? safeArray(props.bpInvestmentLines).filter((r) => r.business_plan_id === plan.id) : [], [plan, props.bpInvestmentLines]);
  const costs = useMemo(() => plan ? safeArray(props.bpRecurringCosts).filter((r) => r.business_plan_id === plan.id) : [], [plan, props.bpRecurringCosts]);
  const projections = useMemo(() => plan ? safeArray(props.bpRevenueProjections).filter((r) => r.business_plan_id === plan.id) : [], [plan, props.bpRevenueProjections]);
  const m = useMemo(() => metrics({ plan, lines, costs, projections, transactions: props.transactions }), [plan, lines, costs, projections, props.transactions]);
  const rows = useMemo(() => amortization(projections, m.plannedInvestment), [projections, m.plannedInvestment]);
  return <div className="space-y-6"><Summary plan={plan} m={m} rows={rows} /><Editor plan={plan} lines={lines} {...props} /><div className="rounded-2xl border border-[#d6c3a0] bg-white p-5"><div className="flex items-center gap-2 mb-3"><LinkIcon size={18} className="text-[#9a6b12]" /><h3 className="font-black text-[#2f2415]">Gestion complète des BP</h3></div><BaseInvestissements {...props} /></div></div>;
}
