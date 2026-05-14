import { useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, FileText, HeartPulse, Package, ShieldCheck, Sprout, TrendingUp, Users } from 'lucide-react';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? 0) || 0;
const remaining = (row = {}) => Math.max(0, Number(row.reste_a_payer ?? row.remaining_amount ?? row.amount_due ?? (amount(row) - paid(row)) ?? 0) || 0);
const closedStatuses = ['termine', 'terminé', 'done', 'fermee', 'fermée', 'traitee', 'traitée', 'resolue', 'résolue'];

function TabButton({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-bold border ${active ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>{children}</button>;
}

function StatCard({ icon: Icon, title, value, detail, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : tone === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';
  return <div className={`rounded-2xl border p-4 ${cls}`}><Icon size={18} /><p className="mt-2 text-2xl font-black text-[#2f2415]">{value}</p><p className="font-black text-[#2f2415]">{title}</p><p className="mt-1 text-xs">{detail}</p></div>;
}

function ScoreLine({ label, score }) {
  const value = clamp(score);
  return <div><div className="mb-1 flex items-center justify-between text-xs text-[#8a7456]"><span>{label}</span><b>{value}/100</b></div><div className="h-2 overflow-hidden rounded-full bg-[#eadcc2]"><div className="h-full rounded-full bg-[#2f2415]" style={{ width: `${value}%` }} /></div></div>;
}

function Checklist({ title, items, empty = 'Rien à signaler.' }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{title}</p><ul className="mt-3 space-y-2 text-sm text-[#7d6a4a]">{items.length ? items.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /> <span>{item}</span></li>) : <li>{empty}</li>}</ul></div>;
}

function DomainCard({ icon: Icon, title, status, text, actions }) {
  const cls = status === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : status === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800';
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="flex items-start gap-3"><div className="rounded-xl bg-white/70 p-2"><Icon size={18} /></div><div className="min-w-0"><p className="font-black text-[#2f2415]">{title}</p><p className="mt-1 text-sm">{text}</p>{actions?.length ? <div className="mt-3 flex flex-wrap gap-2">{actions.map((action) => <span key={action} className="rounded-full bg-white/60 px-2 py-1 text-xs font-bold">{action}</span>)}</div> : null}</div></div></div>;
}

function computeImpactStats(props = {}) {
  const salesOrders = arr(props.salesOrders || props.sales_orders);
  const payments = arr(props.payments);
  const stocks = arr(props.stocks || props.stock);
  const sante = arr(props.sante || props.vaccins);
  const documents = arr(props.documents);
  const taches = arr(props.taches || props.tasks);
  const alertes = arr(props.alertes || props.alertes_center);
  const rapports = arr(props.rapports || props.reports);
  const auditLogs = arr(props.auditLogs || props.audit_logs);
  const businessEvents = arr(props.businessEvents || props.business_events);
  const animaux = arr(props.animaux);
  const lots = arr(props.lots || props.avicole);
  const cultures = arr(props.cultures);
  const transactions = arr(props.transactions || props.finances);

  const ca = salesOrders.reduce((sum, row) => sum + amount(row), 0);
  const paidTotal = payments.reduce((sum, row) => sum + amount(row), 0);
  const receivable = salesOrders.reduce((sum, row) => sum + remaining(row), 0);
  const expenses = transactions.filter((row) => ['sortie', 'depense', 'dépense', 'charge', 'achat'].some((term) => lower(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  const margin = paidTotal - expenses;
  const stockValue = stocks.reduce((sum, row) => sum + (Number(row.quantite || row.quantity || 0) || 0) * (Number(row.prix_unitaire || row.prixUnit || row.unit_price || row.price || 0) || 0), 0);
  const stockCritical = stocks.filter((row) => Number(row.seuil || 0) > 0 && Number(row.quantite || 0) <= Number(row.seuil || 0)).length;
  const healthLate = sante.filter((row) => ['retard', 'en retard', 'a_faire', 'à faire'].some((term) => lower(row.statut || row.status).includes(term))).length;
  const openTasks = taches.filter((row) => !closedStatuses.includes(lower(row.status || row.statut))).length;
  const openAlerts = alertes.filter((row) => !closedStatuses.includes(lower(row.status || row.statut || 'nouvelle'))).length;
  const traces = auditLogs.length + businessEvents.length;
  const proofTotal = documents.length + rapports.length;
  const cultureCostRows = cultures.filter((row) => Number(row.cout_total || row.cout_semences || row.cout_engrais || row.cout_eau || row.cout_main_oeuvre || 0) > 0).length;
  const cultureCostDepth = cultures.length && cultureCostRows / Math.max(1, cultures.length) >= 0.5 ? 'ok' : 'weak';
  const moneyScore = clamp((ca > 0 ? 35 : 0) + (paidTotal > 0 ? 25 : 0) + (expenses > 0 ? 15 : 0) + (stockValue > 0 ? 25 : 0));
  const proofScore = clamp(Math.min(100, proofTotal * 14));
  const traceScore = clamp(Math.min(100, traces * 10));
  const riskScore = clamp(100 - stockCritical * 12 - healthLate * 10 - openTasks * 3 - openAlerts * 4);
  const bankScore = clamp(moneyScore * 0.35 + proofScore * 0.28 + traceScore * 0.22 + riskScore * 0.15);

  return { salesOrders, payments, stocks, sante, documents, taches, alertes, rapports, auditLogs, businessEvents, animaux, lots, cultures, transactions, ca, paidTotal, receivable, expenses, margin, stockValue, stockCritical, healthLate, openTasks, openAlerts, traces, proofTotal, cultureCostRows, cultureCostDepth, moneyScore, proofScore, traceScore, riskScore, bankScore };
}

function OverviewTab({ stats }) {
  const priorities = [stats.receivable > 0 ? `Récupérer ${fmtCurrency(stats.receivable)} encore à encaisser.` : null, stats.stockCritical > 0 ? `Revoir ${stats.stockCritical} stock(s) faible(s).` : null, stats.healthLate > 0 ? `Rattraper ${stats.healthLate} soin(s) ou vaccin(s).` : null, stats.openAlerts > 0 ? `Traiter ${stats.openAlerts} alerte(s).` : null, stats.proofTotal < 5 ? 'Ajouter plus de preuves et justificatifs.' : null].filter(Boolean).slice(0, 5);
  return <div className="space-y-4"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Vue d’ensemble</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce que la ferme montre aujourd’hui</h2><p className="mt-1 text-sm text-[#8a7456]">Une lecture simple : argent, risques, preuves et prochaines actions.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><StatCard icon={CreditCard} title="Argent suivi" value={fmtCurrency(stats.paidTotal)} detail={`${fmtCurrency(stats.receivable)} encore à récupérer`} tone={stats.receivable > 0 ? 'warning' : 'good'} /><StatCard icon={TrendingUp} title="Résultat visible" value={fmtCurrency(stats.margin)} detail="encaissements moins dépenses enregistrées" tone={stats.margin >= 0 ? 'good' : 'danger'} /><StatCard icon={Package} title="Stock à surveiller" value={stats.stockCritical} detail="produit(s) sous le seuil" tone={stats.stockCritical ? 'warning' : 'good'} /><StatCard icon={FileText} title="Preuves classées" value={stats.proofTotal} detail="documents et rapports" tone={stats.proofTotal ? 'good' : 'warning'} /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><Checklist title="À faire en premier" items={priorities} empty="Rien d’urgent pour le moment." /><Checklist title="Ce que l’outil prouve déjà" items={[`${stats.salesOrders.length} vente(s) suivie(s).`, `${stats.sante.length} action(s) santé enregistrée(s).`, `${stats.traces} trace(s) ou action(s) importante(s).`, `${stats.animaux.length} animal(aux), ${stats.lots.length} lot(s), ${stats.cultures.length} culture(s) suivi(s).`]} /></div></div>;
}

function PartnerTab({ stats }) {
  const strengths = [stats.ca > 0 ? `Ventes suivies : ${fmtCurrency(stats.ca)}.` : null, stats.paidTotal > 0 ? `Encaissements visibles : ${fmtCurrency(stats.paidTotal)}.` : null, stats.documents.length > 0 ? `${stats.documents.length} document(s) ou preuve(s) déjà classé(s).` : null, stats.traces > 0 ? `${stats.traces} trace(s) montrent l’historique de la ferme.` : null, stats.stockValue > 0 ? `Stock valorisé : ${fmtCurrency(stats.stockValue)}.` : null].filter(Boolean);
  const missing = [stats.ca <= 0 ? 'Ajouter ou finaliser des ventes pour prouver le potentiel commercial.' : null, stats.paidTotal <= 0 ? 'Enregistrer les encaissements pour montrer l’argent réellement reçu.' : null, stats.documents.length < 5 ? 'Ajouter plus de factures, reçus, ordonnances, bons de livraison ou preuves.' : null, stats.rapports.length < 1 ? 'Créer au moins un rapport simple à présenter à un partenaire.' : null, stats.receivable > stats.paidTotal && stats.receivable > 0 ? 'Réduire ou expliquer les montants encore à encaisser.' : null, stats.cultureCostDepth === 'weak' ? 'Mieux relier les coûts des cultures : intrants, eau, main-d’œuvre, rendement.' : null].filter(Boolean);
  return <div className="space-y-4"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Dossier partenaire</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">Est-ce que la ferme est crédible sur dossier ?</h2><p className="mt-1 text-sm text-[#8a7456]">Ce score aide à voir si les chiffres, preuves et historiques sont assez propres pour être présentés.</p></div><div className={`rounded-3xl border px-6 py-4 text-center ${stats.bankScore >= 70 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : stats.bankScore >= 45 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}><p className="text-xs font-bold uppercase">Niveau actuel</p><p className="text-3xl font-black">{stats.bankScore}/100</p><p className="text-xs font-bold">{stats.bankScore >= 70 ? 'Présentable' : stats.bankScore >= 45 ? 'À renforcer' : 'Encore fragile'}</p></div></div><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><ScoreLine label="Chiffres" score={stats.moneyScore} /><ScoreLine label="Preuves" score={stats.proofScore} /><ScoreLine label="Historique" score={stats.traceScore} /><ScoreLine label="Risques maîtrisés" score={stats.riskScore} /></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-3"><Checklist title="Points forts" items={strengths} empty="Pas encore assez de points forts visibles." /><Checklist title="À compléter" items={missing} empty="Le dossier est déjà bien couvert." /><Checklist title="Prochaines actions" items={['Compléter les justificatifs des dépenses et ventes importantes.', 'Générer un rapport mensuel simple : ventes, dépenses, stock, alertes traitées.', 'Séparer clairement ce qui est encaissé de ce qui reste à récupérer.', 'Mettre à jour les coûts des lots, animaux et cultures avant de parler marge.']} /></div></div>;
}

function DomainsTab({ stats }) {
  return <div className="space-y-4"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Domaines à renforcer</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce qui soutient le projet, et ce qui manque encore</h2><p className="mt-1 text-sm text-[#8a7456]">Une lecture par domaine, sans répéter les mêmes chiffres partout.</p></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><DomainCard icon={CreditCard} title="Ventes et encaissements" status={stats.receivable > 0 ? 'warning' : 'ok'} text={`${fmtCurrency(stats.ca)} de ventes suivies, ${fmtCurrency(stats.paidTotal)} encaissés.`} actions={['Relancer les restes à payer', 'Classer les preuves de vente']} /><DomainCard icon={HeartPulse} title="Santé et prévention" status={stats.healthLate > 0 ? 'warning' : 'ok'} text={`${stats.sante.length} soin(s) ou vaccin(s), ${stats.healthLate} à rattraper.`} actions={['Mettre à jour les retards', 'Relier les produits utilisés']} /><DomainCard icon={Package} title="Stock et pertes évitées" status={stats.stockCritical > 0 ? 'warning' : 'ok'} text={`${stats.stockCritical} stock(s) faible(s), ${fmtCurrency(stats.stockValue)} de stock valorisé.`} actions={['Corriger les stocks faibles', 'Renseigner les prix unitaires']} /><DomainCard icon={Sprout} title="Cultures et intrants" status={stats.cultureCostDepth === 'ok' ? 'ok' : 'warning'} text={`${stats.cultures.length} culture(s), ${stats.cultureCostRows} avec coûts renseignés.`} actions={['Relier intrants', 'Suivre eau et main-d’œuvre']} /><DomainCard icon={ShieldCheck} title="Preuves et historique" status={stats.proofTotal + stats.traces > 0 ? 'ok' : 'warning'} text={`${stats.proofTotal} preuve(s), ${stats.traces} trace(s) ou action(s).`} actions={['Ajouter documents', 'Créer rapports']} /><DomainCard icon={Users} title="Travail terrain" status={stats.openTasks > 0 || stats.openAlerts > 0 ? 'warning' : 'ok'} text={`${stats.openTasks} tâche(s), ${stats.openAlerts} alerte(s) à suivre.`} actions={['Transformer alertes en tâches', 'Fermer les actions faites']} /></div></div>;
}

export default function ImpactBusinessShell(props) {
  const [tab, setTab] = useState('overview');
  const stats = useMemo(() => computeImpactStats(props), [props]);
  return <div className="space-y-6"><div className="flex flex-wrap gap-2"><TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Vue d’ensemble</TabButton><TabButton active={tab === 'partner'} onClick={() => setTab('partner')}>Dossier partenaire</TabButton><TabButton active={tab === 'domains'} onClick={() => setTab('domains')}>Domaines à renforcer</TabButton></div>{tab === 'overview' ? <OverviewTab stats={stats} /> : null}{tab === 'partner' ? <PartnerTab stats={stats} /> : null}{tab === 'domains' ? <DomainsTab stats={stats} /> : null}</div>;
}
