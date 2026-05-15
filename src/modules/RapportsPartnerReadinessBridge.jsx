import { CheckCircle2, FileText, ShieldCheck, TrendingUp } from 'lucide-react';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;
const remaining = (row = {}) => Math.max(0, Number(row.reste_a_payer ?? row.remaining_amount ?? row.amount_due ?? (amount(row) - paid(row)) ?? 0) || 0);
const lower = (value) => String(value || '').trim().toLowerCase();
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));

function ScoreCard({ label, score, detail }) {
  const good = score >= 70;
  const medium = score >= 45;
  return <div className={`rounded-2xl border p-4 ${good ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : medium ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}><p className="text-xs font-bold uppercase">{label}</p><p className="mt-1 text-2xl font-black text-[#2f2415]">{score}/100</p><p className="mt-1 text-xs">{detail}</p></div>;
}

function Checklist({ title, items }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{title}</p><ul className="mt-3 space-y-2 text-sm text-[#7d6a4a]">{items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /><span>{item}</span></li>)}</ul></div>;
}

export default function RapportsPartnerReadinessBridge({ data = {} }) {
  const salesOrders = arr(data.salesOrders || data.sales_orders);
  const payments = arr(data.payments);
  const transactions = arr(data.transactions || data.finances);
  const documents = arr(data.documents);
  const rapports = arr(data.rapports || data.reports);
  const sante = arr(data.sante || data.vaccins);
  const stocks = arr(data.stocks || data.stock);
  const taches = arr(data.taches || data.tasks);
  const alertes = arr(data.alertes || data.alertes_center);
  const ca = salesOrders.reduce((sum, row) => sum + amount(row), 0);
  const encaisses = payments.reduce((sum, row) => sum + amount(row), 0);
  const reste = salesOrders.reduce((sum, row) => sum + remaining(row), 0);
  const depenses = transactions.filter((row) => ['sortie', 'depense', 'dépense', 'charge', 'achat'].some((term) => lower(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  const stockCritique = stocks.filter((row) => Number(row.seuil || 0) > 0 && Number(row.quantite || 0) <= Number(row.seuil || 0)).length;
  const soinsRetard = sante.filter((row) => ['retard', 'en retard', 'a_faire', 'à faire'].some((term) => lower(row.statut || row.status).includes(term))).length;
  const tachesOuvertes = taches.filter((row) => !['termine', 'terminé', 'done', 'fermee', 'fermée'].includes(lower(row.status || row.statut))).length;
  const alertesOuvertes = alertes.filter((row) => !['traitee', 'traitée', 'fermee', 'fermée'].includes(lower(row.status || row.statut))).length;
  const moneyScore = clamp((ca > 0 ? 35 : 0) + (encaisses > 0 ? 30 : 0) + (depenses > 0 ? 15 : 0) + (reste <= encaisses ? 20 : 8));
  const proofScore = clamp(Math.min(100, (documents.length + rapports.length) * 12));
  const riskScore = clamp(100 - stockCritique * 12 - soinsRetard * 10 - tachesOuvertes * 3 - alertesOuvertes * 4);
  const globalScore = clamp(moneyScore * 0.4 + proofScore * 0.35 + riskScore * 0.25);
  const strengths = [
    `Ventes suivies : ${fmtCurrency(ca)}.`,
    `Encaissements enregistrés : ${fmtCurrency(encaisses)}.`,
    `Preuves disponibles : ${documents.length + rapports.length}.`,
    `Dépenses suivies : ${fmtCurrency(depenses)}.`,
  ];
  const missing = [
    reste > 0 ? `Expliquer ou récupérer ${fmtCurrency(reste)} encore à encaisser.` : 'Les ventes semblent bien suivies côté encaissement.',
    documents.length < 5 ? 'Ajouter plus de reçus, factures, photos ou preuves.' : 'Les preuves commencent à être solides.',
    rapports.length < 1 ? 'Créer au moins un rapport mensuel présentable.' : 'Un rapport est déjà disponible.',
    stockCritique || soinsRetard ? 'Réduire les alertes stock et santé avant présentation.' : 'Les urgences stock/santé semblent maîtrisées.',
  ];

  return <div className="space-y-4">
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><ShieldCheck size={20} /> Dossier prêt à présenter</p><p className="mt-1 text-sm text-[#8a7456]">Une lecture simple pour préparer un échange avec une banque, un partenaire ou un certificateur.</p></div><div className={`rounded-3xl border px-6 py-4 text-center ${globalScore >= 70 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : globalScore >= 45 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}><p className="text-xs font-bold uppercase">Niveau</p><p className="text-3xl font-black">{globalScore}/100</p></div></div></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><ScoreCard label="Chiffres" score={moneyScore} detail="ventes, encaissements et dépenses" /><ScoreCard label="Preuves" score={proofScore} detail="documents et rapports disponibles" /><ScoreCard label="Risques" score={riskScore} detail="stocks, santé, alertes et tâches" /></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><Checklist title="Points forts à présenter" items={strengths} /><Checklist title="À compléter avant rendez-vous" items={missing} /></div>
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><TrendingUp size={16} className="inline text-[#9a6b12]" /> Pour renforcer le dossier : complète les preuves, génère un rapport mensuel, mets à jour les coûts et explique les montants encore à encaisser.</div>
  </div>;
}
