import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, HeartPulse, Package, ShieldCheck, Sprout, TrendingUp, Users } from 'lucide-react';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value || 0))));
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.amount ?? row.montant ?? 0) || 0;
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

function Checklist({ title, items, empty = 'Rien à signaler.', icon: Icon = CheckCircle2 }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{title}</p><ul className="mt-3 space-y-2 text-sm text-[#7d6a4a]">{items.length ? items.map((item) => <li key={item} className="flex gap-2"><Icon size={15} className="mt-0.5 shrink-0 text-emerald-600" /> <span>{item}</span></li>) : <li>{empty}</li>}</ul></div>;
}

function ValueProofCard({ icon: Icon, title, value, before, after, status = 'good' }) {
  const cls = status === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : status === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700';
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="flex items-start gap-3"><div className="rounded-xl bg-white/70 p-2"><Icon size={18} /></div><div className="min-w-0"><p className="text-2xl font-black text-[#2f2415]">{value}</p><p className="font-black text-[#2f2415]">{title}</p><p className="mt-2 text-xs"><b>Avant :</b> {before}</p><p className="mt-1 text-xs"><b>Avec l’ERP :</b> {after}</p></div></div></div>;
}

function DomainCard({ icon: Icon, title, status, state, impact, action }) {
  const cls = status === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : status === 'danger' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-800';
  return <div className={`rounded-2xl border p-4 ${cls}`}><div className="flex items-start gap-3"><div className="rounded-xl bg-white/70 p-2"><Icon size={18} /></div><div className="min-w-0"><p className="font-black text-[#2f2415]">{title}</p><p className="mt-2 text-sm"><b>État :</b> {state}</p><p className="mt-1 text-sm"><b>Valeur :</b> {impact}</p><p className="mt-1 text-sm"><b>Action :</b> {action}</p></div></div></div>;
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
  const ventesAvecMontant = salesOrders.filter((row) => amount(row) > 0).length;
  const ventesAvecReste = salesOrders.filter((row) => remaining(row) > 0).length;
  const paiementsEnregistres = payments.filter((row) => amount(row) > 0 || paid(row) > 0).length;
  const ca = salesOrders.reduce((sum, row) => sum + amount(row), 0);
  const paidTotal = payments.reduce((sum, row) => sum + Math.max(amount(row), paid(row)), 0);
  const receivable = salesOrders.reduce((sum, row) => sum + remaining(row), 0);
  const expenses = transactions.filter((row) => ['sortie', 'depense', 'dépense', 'charge', 'achat'].some((term) => lower(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  const cashNet = paidTotal - expenses;
  const stockValue = stocks.reduce((sum, row) => sum + (Number(row.quantite || row.quantity || 0) || 0) * (Number(row.prix_unitaire || row.prixUnit || row.unit_price || row.price || 0) || 0), 0);
  const stocksValorises = stocks.filter((row) => (Number(row.quantite || row.quantity || 0) || 0) > 0 && (Number(row.prix_unitaire || row.prixUnit || row.unit_price || row.price || 0) || 0) > 0).length;
  const stockCritical = stocks.filter((row) => Number(row.seuil || 0) > 0 && Number(row.quantite || 0) <= Number(row.seuil || 0)).length;
  const healthLate = sante.filter((row) => ['retard', 'en retard', 'a_faire', 'à faire'].some((term) => lower(row.statut || row.status).includes(term))).length;
  const healthWithCost = sante.filter((row) => Number(row.cout_intervention || row.cout || row.amount || row.montant || 0) > 0).length;
  const openTasks = taches.filter((row) => !closedStatuses.includes(lower(row.status || row.statut))).length;
  const closedTasks = taches.filter((row) => closedStatuses.includes(lower(row.status || row.statut))).length;
  const openAlerts = alertes.filter((row) => !closedStatuses.includes(lower(row.status || row.statut || 'nouvelle'))).length;
  const closedAlerts = alertes.filter((row) => closedStatuses.includes(lower(row.status || row.statut))).length;
  const traces = auditLogs.length + businessEvents.length;
  const proofTotal = documents.length + rapports.length;
  const cultureCostRows = cultures.filter((row) => Number(row.cout_total || row.cout_semences || row.cout_engrais || row.cout_eau || row.cout_main_oeuvre || 0) > 0).length;
  const cultureCostDepth = cultures.length && cultureCostRows / Math.max(1, cultures.length) >= 0.5 ? 'ok' : 'weak';
  const moneyScore = clamp((ca > 0 ? 30 : 0) + (paidTotal > 0 ? 30 : 0) + (expenses > 0 ? 15 : 0) + (stockValue > 0 ? 25 : 0));
  const proofScore = clamp(Math.min(100, proofTotal * 14));
  const traceScore = clamp(Math.min(100, traces * 10));
  const riskScore = clamp(100 - stockCritical * 12 - healthLate * 10 - openTasks * 3 - openAlerts * 4);
  const bankScore = clamp(moneyScore * 0.35 + proofScore * 0.28 + traceScore * 0.22 + riskScore * 0.15);
  return { salesOrders, payments, stocks, sante, documents, taches, alertes, rapports, auditLogs, businessEvents, animaux, lots, cultures, transactions, ventesAvecMontant, ventesAvecReste, paiementsEnregistres, ca, paidTotal, receivable, expenses, cashNet, stockValue, stocksValorises, stockCritical, healthLate, healthWithCost, openTasks, closedTasks, openAlerts, closedAlerts, traces, proofTotal, cultureCostRows, cultureCostDepth, moneyScore, proofScore, traceScore, riskScore, bankScore };
}

function OverviewTab({ stats }) {
  const priorities = [
    stats.receivable > 0 ? `Récupérer ${fmtCurrency(stats.receivable)} encore à encaisser sur ${stats.ventesAvecReste} vente(s).` : null,
    stats.stockCritical > 0 ? `Revoir ${stats.stockCritical} produit(s) sous le seuil.` : null,
    stats.healthLate > 0 ? `Rattraper ${stats.healthLate} soin(s) ou vaccin(s).` : null,
    stats.openAlerts > 0 ? `Traiter ${stats.openAlerts} alerte(s) encore ouvertes.` : null,
    stats.proofTotal < 5 ? 'Classer plus de preuves pour renforcer le dossier.' : null,
  ].filter(Boolean).slice(0, 5);
  const mastered = [
    `${stats.ventesAvecMontant} vente(s) ont maintenant un montant suivi au lieu d’être dispersées dans des notes.`,
    `${stats.paiementsEnregistres} paiement(s) sont enregistrés et séparés des montants encore à récupérer.`,
    `${stats.proofTotal} preuve(s) ou rapport(s) sont classés pour justifier l’activité.`,
    `${stats.traces} fait(s) important(s) gardent la mémoire de la ferme.`,
    `${stats.closedTasks + stats.closedAlerts} action(s) ou alerte(s) ont été clôturées après suivi.`,
  ];
  return <div className="space-y-4">
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Valeur concrète</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce que l’ERP a permis de maîtriser</h2><p className="mt-1 text-sm text-[#8a7456]">On ne parle pas seulement de modules : on voit ce qui est suivi, prouvé, récupérable et maîtrisé.</p></div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><StatCard icon={CreditCard} title="Argent maîtrisé" value={fmtCurrency(stats.paidTotal)} detail={`${fmtCurrency(stats.receivable)} reste à récupérer`} tone={stats.receivable > 0 ? 'warning' : 'good'} /><StatCard icon={TrendingUp} title="Cash net visible" value={fmtCurrency(stats.cashNet)} detail="encaissements moins dépenses enregistrées" tone={stats.cashNet >= 0 ? 'good' : 'danger'} /><StatCard icon={Package} title="Stock valorisé" value={fmtCurrency(stats.stockValue)} detail={`${stats.stockCritical} produit(s) sous le seuil`} tone={stats.stockCritical ? 'warning' : 'good'} /><StatCard icon={FileText} title="Preuves disponibles" value={stats.proofTotal} detail="documents et rapports classés" tone={stats.proofTotal ? 'good' : 'warning'} /></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3"><ValueProofCard icon={CreditCard} title="Ventes et cash" value={`${stats.ventesAvecMontant} vente(s)`} before="les ventes pouvaient rester dans la mémoire ou des notes séparées." after={`${fmtCurrency(stats.ca)} suivis, ${fmtCurrency(stats.paidTotal)} encaissés, ${fmtCurrency(stats.receivable)} à récupérer.`} status={stats.receivable > 0 ? 'warning' : 'good'} /><ValueProofCard icon={HeartPulse} title="Santé suivie" value={`${stats.sante.length} action(s)`} before="un soin ou vaccin pouvait être oublié après le passage terrain." after={`${stats.healthLate} retard(s) visibles et ${stats.healthWithCost} action(s) avec coût renseigné.`} status={stats.healthLate > 0 ? 'warning' : 'good'} /><ValueProofCard icon={ShieldCheck} title="Mémoire de la ferme" value={`${stats.traces} fait(s)`} before="les décisions et incidents pouvaient disparaître avec le temps." after="les faits importants restent consultables et défendables." status={stats.traces ? 'good' : 'warning'} /></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><Checklist title="Ce qui est déjà maîtrisé" items={mastered} /><Checklist title="À faire en premier" items={priorities} empty="Rien d’urgent pour le moment." icon={AlertTriangle} /></div>
  </div>;
}

function PartnerTab({ stats }) {
  const strengths = [stats.ca > 0 ? `Ventes justifiées : ${fmtCurrency(stats.ca)} suivis.` : null, stats.paidTotal > 0 ? `Cash prouvé : ${fmtCurrency(stats.paidTotal)} encaissés.` : null, stats.documents.length > 0 ? `${stats.documents.length} document(s) ou preuve(s) déjà classé(s).` : null, stats.traces > 0 ? `${stats.traces} trace(s) montrent l’historique de la ferme.` : null, stats.stockValue > 0 ? `Stock valorisé : ${fmtCurrency(stats.stockValue)}.` : null].filter(Boolean);
  const missing = [stats.ca <= 0 ? 'Ajouter ou finaliser des ventes pour prouver le potentiel commercial.' : null, stats.paidTotal <= 0 ? 'Enregistrer les encaissements pour montrer l’argent réellement reçu.' : null, stats.documents.length < 5 ? 'Ajouter plus de factures, reçus, ordonnances, bons de livraison ou preuves.' : null, stats.rapports.length < 1 ? 'Créer au moins un rapport simple à présenter à un partenaire.' : null, stats.receivable > 0 ? `Expliquer ou récupérer ${fmtCurrency(stats.receivable)} encore à encaisser.` : null, stats.cultureCostDepth === 'weak' ? 'Mieux relier les coûts des cultures : intrants, eau, main-d’œuvre, rendement.' : null].filter(Boolean);
  const positiveFactors = [stats.ca > 0 ? 'ventes avec montants' : null, stats.paidTotal > 0 ? 'encaissements enregistrés' : null, stats.proofTotal > 0 ? 'preuves et rapports' : null, stats.traces > 0 ? 'historique disponible' : null, stats.stockValue > 0 ? 'stock valorisé' : null].filter(Boolean);
  const negativeFactors = [stats.receivable > 0 ? 'montants encore à encaisser' : null, stats.openAlerts > 0 ? 'alertes ouvertes' : null, stats.openTasks > 0 ? 'tâches ouvertes' : null, stats.healthLate > 0 ? 'soins/vaccins en retard' : null, stats.proofTotal < 5 ? 'preuves encore faibles' : null].filter(Boolean);
  return <div className="space-y-4"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Dossier banque / partenaire</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">Est-ce que la ferme est présentable sur dossier ?</h2><p className="mt-1 text-sm text-[#8a7456]">Le score montre si la ferme a assez de chiffres, preuves, historique et risques maîtrisés pour être expliquée sérieusement.</p></div><div className={`rounded-3xl border px-6 py-4 text-center ${stats.bankScore >= 70 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : stats.bankScore >= 45 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}><p className="text-xs font-bold uppercase">Niveau actuel</p><p className="text-3xl font-black">{stats.bankScore}/100</p><p className="text-xs font-bold">{stats.bankScore >= 70 ? 'Présentable' : stats.bankScore >= 45 ? 'À renforcer' : 'Encore fragile'}</p></div></div><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><ScoreLine label="Chiffres" score={stats.moneyScore} /><ScoreLine label="Preuves" score={stats.proofScore} /><ScoreLine label="Historique" score={stats.traceScore} /><ScoreLine label="Risques maîtrisés" score={stats.riskScore} /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><Checklist title="Ce qui augmente le score" items={positiveFactors} empty="Pas encore assez d’éléments forts." /><Checklist title="Ce qui baisse le score" items={negativeFactors} empty="Aucun gros frein visible pour le moment." icon={AlertTriangle} /></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-3"><Checklist title="Valeur déjà prouvée" items={strengths} empty="Pas encore assez de points forts visibles." /><Checklist title="À compléter" items={missing} empty="Le dossier est déjà bien couvert." /><Checklist title="Prochaines actions" items={['Compléter les justificatifs des ventes et dépenses importantes.', 'Générer un rapport mensuel simple : ventes, dépenses, stock, alertes traitées.', 'Séparer clairement ce qui est encaissé de ce qui reste à récupérer.', 'Mettre à jour les coûts des lots, animaux et cultures avant de parler marge.']} /></div></div>;
}

function DomainsTab({ stats }) {
  return <div className="space-y-4"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Domaines à renforcer</p><h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce qui reste à mieux maîtriser</h2><p className="mt-1 text-sm text-[#8a7456]">Chaque domaine indique l’état actuel, la valeur pour la ferme et l’action prioritaire.</p></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><DomainCard icon={CreditCard} title="Ventes et encaissements" status={stats.receivable > 0 ? 'warning' : 'ok'} state={`${fmtCurrency(stats.ca)} de ventes suivies, ${fmtCurrency(stats.paidTotal)} encaissés, ${fmtCurrency(stats.receivable)} à récupérer.`} impact="le cash n’est plus confondu avec le chiffre d’affaires." action={stats.receivable > 0 ? 'relancer les ventes avec reste à payer.' : 'continuer à enregistrer chaque paiement.'} /><DomainCard icon={HeartPulse} title="Santé et prévention" status={stats.healthLate > 0 ? 'warning' : 'ok'} state={`${stats.sante.length} soin(s) ou vaccin(s), ${stats.healthLate} retard(s), ${stats.healthWithCost} coût(s) renseigné(s).`} impact="les retards et coûts santé deviennent visibles." action={stats.healthLate > 0 ? 'rattraper les soins/vaccins en retard.' : 'continuer à renseigner les coûts et produits utilisés.'} /><DomainCard icon={Package} title="Stock et pertes évitées" status={stats.stockCritical > 0 ? 'warning' : 'ok'} state={`${stats.stocksValorises} stock(s) valorisé(s), ${stats.stockCritical} produit(s) sous le seuil.`} impact="les ruptures et pertes potentielles sont repérées plus tôt." action={stats.stockCritical > 0 ? 'réapprovisionner ou corriger les seuils.' : 'maintenir l’inventaire à jour.'} /><DomainCard icon={Sprout} title="Cultures et intrants" status={stats.cultureCostDepth === 'ok' ? 'ok' : 'warning'} state={`${stats.cultures.length} culture(s), ${stats.cultureCostRows} avec coûts renseignés.`} impact="les parcelles peuvent être comparées sur leurs coûts et résultats." action="compléter intrants, eau, main-d’œuvre et rendement quand une parcelle est incomplète." /><DomainCard icon={ShieldCheck} title="Preuves et historique" status={stats.proofTotal + stats.traces > 0 ? 'ok' : 'warning'} state={`${stats.proofTotal} preuve(s), ${stats.traces} fait(s) important(s).`} impact="la ferme devient défendable avec des traces et justificatifs." action="classer les preuves des ventes, dépenses, soins et livraisons." /><DomainCard icon={Users} title="Travail terrain" status={stats.openTasks > 0 || stats.openAlerts > 0 ? 'warning' : 'ok'} state={`${stats.openTasks} tâche(s), ${stats.openAlerts} alerte(s) à suivre.`} impact="les problèmes deviennent des actions à traiter, pas seulement des remarques." action={stats.openTasks || stats.openAlerts ? 'fermer les actions faites et traiter les urgences.' : 'continuer à transformer les alertes en actions.'} /></div></div>;
}

export default function ImpactBusinessShell(props) {
  const [tab, setTab] = useState('overview');
  const stats = useMemo(() => computeImpactStats(props), [props]);
  return <div className="space-y-6"><div className="flex flex-wrap gap-2"><TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Valeur concrète</TabButton><TabButton active={tab === 'partner'} onClick={() => setTab('partner')}>Dossier banque / partenaire</TabButton><TabButton active={tab === 'domains'} onClick={() => setTab('domains')}>À mieux maîtriser</TabButton></div>{tab === 'overview' ? <OverviewTab stats={stats} /> : null}{tab === 'partner' ? <PartnerTab stats={stats} /> : null}{tab === 'domains' ? <DomainsTab stats={stats} /> : null}</div>;
}
