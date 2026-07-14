import { AlertTriangle, BookOpen, FileText, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? 0);
const status = (row = {}) => lower(row.statut ?? row.status ?? row.statut_paiement ?? 'paye');
const category = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.type || ''} ${row.libelle || ''} ${row.description || ''}`);
const rowDate = (row = {}) => row.date || row.entry_date || row.created_at || row.updated_at || row.order_date || row.date_commande;
const isRevenue = (row = {}) => lower(row.type) === 'entree' || lower(row.sens) === 'credit' || category(row).includes('vente') || category(row).includes('revenu') || category(row).includes('recette');
const isExpense = (row = {}) => lower(row.type) === 'sortie' || lower(row.sens) === 'debit' || category(row).includes('charge') || category(row).includes('depense') || category(row).includes('dépense');
const isUnpaid = (row = {}) => ['impaye', 'impayé', 'partiel', 'retard', 'en_retard'].includes(status(row));
function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function classify(row = {}) { const text = category(row); if (text.includes('aliment')) return 'alimentation'; if (text.includes('sante') || text.includes('santé') || text.includes('vaccin') || text.includes('soin')) return 'sante'; if (text.includes('stock') || text.includes('fournisseur') || text.includes('achat')) return 'stock'; if (text.includes('invest')) return 'investissement'; if (text.includes('equip') || text.includes('équip') || text.includes('maintenance')) return 'equipement'; return 'autres_charges'; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), produits: 0, charges: 0, resultat: 0, creances: 0, dettes: 0, alimentation: 0, sante: 0, stock: 0, investissement: 0, equipement: 0, autres_charges: 0, justificatifs_manquants: 0, taux_resultat: 0 }); return map.get(key); }
function SmallMetric({ label, value, hint, danger = false }) { return <div className={`border rounded-xl p-3 ${danger ? 'bg-urgent-bg border-urgent' : 'bg-card border-line'}`}><p className="text-xs text-slate">{label}</p><p className={`text-xl font-semibold mt-1 ${danger ? 'text-urgent' : 'text-earth'}`}>{value}</p>{hint ? <p className="text-meta text-slate mt-1">{hint}</p> : null}</div>; }
function buildMonthly({ transactions = [], finances = [], salesOrders = [], payments = [] }) {
  const rows = arr(finances).length ? arr(finances) : arr(transactions);
  const map = new Map();
  rows.forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); const value = amount(row); if (!value) return; if (isRevenue(row)) { bucket.produits += value; if (isUnpaid(row)) bucket.creances += value; } if (isExpense(row)) { bucket.charges += value; bucket[classify(row)] += value; if (isUnpaid(row)) bucket.dettes += value; } if (!row.justificatif_url && !row.document_url) bucket.justificatifs_manquants += 1; });
  arr(salesOrders).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); const total = toNumber(row.montant_total ?? row.total ?? row.amount); const paid = toNumber(row.montant_paye ?? row.paid_amount); const rest = toNumber(row.reste_a_payer ?? row.remaining_amount); bucket.produits += total; if (rest > 0 || isUnpaid(row)) bucket.creances += rest || Math.max(0, total - paid); });
  arr(payments).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); bucket.produits += toNumber(row.montant ?? row.amount ?? row.montant_paye); });
  return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map((row)=>({ ...row, resultat: row.produits - row.charges, taux_resultat: row.produits > 0 ? Number((((row.produits-row.charges)/row.produits)*100).toFixed(1)) : 0 }));
}
function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }
export default function ComptabiliteEvolution({ transactions = [], finances = [], salesOrders = [], payments = [], onNavigate }) {
  const monthly = buildMonthly({ transactions, finances, salesOrders, payments });
  const totalProducts = monthly.reduce((sum,row)=>sum+row.produits,0);
  const totalCharges = monthly.reduce((sum,row)=>sum+row.charges,0);
  const result = totalProducts - totalCharges;
  const missingDocs = monthly.reduce((sum,row)=>sum+row.justificatifs_manquants,0);
  const receivables = monthly.reduce((sum,row)=>sum+row.creances,0);
  const debts = monthly.reduce((sum,row)=>sum+row.dettes,0);
  const priority = missingDocs > 0 ? { module: 'documents', label: 'Rattacher les justificatifs', icon: FileText } : receivables > 0 ? { module: 'clients', label: 'Suivre les créances', icon: AlertTriangle } : { module: 'comptabilite', label: 'Préparer la clôture', icon: BookOpen };
  const PriorityIcon = priority.icon;
  const interpretation = result < 0 ? `Résultat négatif : ${fmtCurrency(result)}.` : missingDocs > 0 ? `${fmtNumber(missingDocs)} justificatif(s) manquant(s) avant clôture.` : `Résultat positif : ${fmtCurrency(result)}.`;
  return <div className="space-y-6">
    <div className="bg-white border border-line rounded-2xl p-4"><div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-vigilance-bg text-horizon-dark flex items-center justify-center"><BookOpen size={18}/></div><div><p className="font-semibold text-earth">Évolution Comptabilité interactive</p><p className="text-xs text-slate mt-1">Produits, charges, résultat, créances, dettes et justificatifs.</p></div></div><div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><SmallMetric label="Produits" value={fmtCurrency(totalProducts)} /><SmallMetric label="Charges" value={fmtCurrency(totalCharges)} danger={totalCharges > totalProducts && totalProducts > 0}/><SmallMetric label="Résultat" value={fmtCurrency(result)} danger={result < 0}/><SmallMetric label="Créances" value={fmtCurrency(receivables)} danger={receivables > 0}/><SmallMetric label="Dettes" value={fmtCurrency(debts)} danger={debts > 0}/><SmallMetric label="Justificatifs" value={fmtNumber(missingDocs)} hint="manquants" danger={missingDocs > 0}/></div></div>
    <SmartEvolutionChart title="Comptabilité - résultat mensuel" subtitle="Barres : produits, charges, résultat, créances et dettes. Courbe : taux de résultat." months={labels(monthly)} leftUnit="FCFA" rightUnit="%" series={[{name:'Produits',type:'bar',unit:'FCFA',data:values(monthly,'produits')},{name:'Charges',type:'bar',unit:'FCFA',data:values(monthly,'charges')},{name:'Résultat',type:'bar',unit:'FCFA',data:values(monthly,'resultat')},{name:'Créances',type:'bar',unit:'FCFA',data:values(monthly,'creances')},{name:'Dettes',type:'bar',unit:'FCFA',data:values(monthly,'dettes')},{name:'Taux résultat',type:'line',axis:'right',unit:'%',data:values(monthly,'taux_resultat')}]} />
    <SmartEvolutionChart title="Comptabilité - structure des charges" subtitle="Répartition comptable des charges par famille métier." months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[{name:'Alimentation',type:'bar',unit:'FCFA',data:values(monthly,'alimentation')},{name:'Santé',type:'bar',unit:'FCFA',data:values(monthly,'sante')},{name:'Stock / fournisseurs',type:'bar',unit:'FCFA',data:values(monthly,'stock')},{name:'Investissements',type:'bar',unit:'FCFA',data:values(monthly,'investissement')},{name:'Équipements',type:'bar',unit:'FCFA',data:values(monthly,'equipement')},{name:'Autres charges',type:'bar',unit:'FCFA',data:values(monthly,'autres_charges')}]} />
    <div className="bg-card border border-line rounded-2xl p-4 text-sm text-slate flex items-start gap-3"><TrendingUp size={18} className="text-horizon-dark mt-1"/><div><b className="text-earth">Interprétation :</b> {interpretation}</div></div>
    <div className={`${missingDocs || result < 0 ? 'bg-vigilance-bg border-vigilance text-horizon-dark' : 'bg-positive-bg border-positive text-positive'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-1"/><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-2 text-xs font-semibold">Ouvrir</button></div>
  </div>;
}
