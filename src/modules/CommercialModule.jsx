import { BarChart3, ClipboardList, CreditCard, Lightbulb, PackageCheck, ShoppingCart, TrendingUp, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { remainingForOrder } from '../utils/salesStatuses';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').toLowerCase();
const n = (value = 0) => Number(value || 0);
const amountOf = (row = {}) => n(row.montant_total ?? row.total_ttc ?? row.total ?? row.amount ?? row.montant ?? row.estimated_amount ?? row.montant_estime);
const paidOf = (row = {}) => n(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? row.amount);
const nameOf = (row = {}) => row.nom || row.name || row.raison_sociale || row.client_nom || row.customer_name || row.id || 'Client';
const productName = (row = {}) => row.product_name || row.produit || row.nom || row.name || row.title || row.libelle || 'Produit';
const orderLabel = (row = {}) => row.reference || row.numero || row.id || row.title || 'Vente';
const clientName = (row = {}, clients = []) => {
  const clientId = row.client_id || row.customer_id || row.client;
  const client = clients.find((item) => String(item.id) === String(clientId));
  return client ? nameOf(client) : row.client_nom || row.customer_name || clientId || 'Client non renseigné';
};
const isOpen = (row = {}) => !['termine', 'terminé', 'closed', 'cloture', 'clôture', 'annule', 'annulé', 'paye', 'payé'].includes(lower(row.status || row.statut || row.payment_status));
const isDelivered = (row = {}) => ['livre', 'livré', 'delivered', 'termine', 'terminé'].includes(lower(row.delivery_status || row.status || row.statut));
const paymentStatus = (row = {}, payments = []) => {
  const left = Math.max(0, remainingForOrder(row, payments));
  const total = amountOf(row);
  if (left <= 0 && total > 0) return { label: 'Payé', tone: 'good' };
  if (left < total && left > 0) return { label: 'Partiel', tone: 'warn' };
  return { label: 'Non payé', tone: 'warn' };
};
const isInvoiceOpen = (row = {}) => !['paye', 'payé', 'paid', 'annule', 'annulé'].includes(lower(row.status || row.statut || row.payment_status));
const monthKey = (date = '') => String(date || '').slice(0, 7);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const stockQty = (row = {}) => n(row.quantite ?? row.quantity ?? row.stock ?? row.quantity_available ?? row.disponible);
const stockThreshold = (row = {}) => n(row.seuil ?? row.threshold);
const animalReady = (row = {}) => Boolean(row.pret_vente_confirme || row.ready_for_sale || row.sale_ready || row.pret_a_la_vente || ['pret_vente', 'pret_a_la_vente'].includes(lower(row.status || row.statut)));
const lotText = (lot = {}) => lower(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`);
const lotReady = (lot = {}) => Boolean(lot.ready_for_sale || lot.sale_ready || lot.pret_vente_confirme || ['pret_vente', 'pret_a_la_vente'].includes(lower(lot.status || lot.statut)));
const cultureReady = (row = {}) => n(row.stock_recolte ?? row.quantite_recoltee ?? row.quantite_disponible ?? row.quantity_available) > 0 || ['recolte', 'récolté', 'pret_vente', 'pret_a_la_vente'].includes(lower(row.status || row.statut));
const scoreTone = (score = 0) => score >= 80 ? 'good' : score >= 55 ? 'warn' : 'bad';

function StatLine({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Section({ icon: Icon, title, children, action }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>;
}
function ActionButton({ children, onClick }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">{children}</button>;
}
function Pill({ children, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-700' : tone === 'bad' ? 'border-red-200 bg-red-50 text-red-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]';
  return <span className={`rounded-full border px-3 py-1 text-xs font-black ${cls}`}>{children}</span>;
}
function Row({ title, detail, value, tone = 'neutral', onClick }) {
  return <button type="button" onClick={onClick} className="grid w-full grid-cols-1 gap-2 border-b border-[#eadcc2]/70 py-4 text-left last:border-b-0 md:grid-cols-[260px_1fr_auto] md:items-center hover:bg-[#fffdf8]"><span className="font-black text-[#2f2415]">{title}</span><span className="text-sm text-[#8a7456]">{detail}</span><Pill tone={tone}>{value}</Pill></button>;
}
function Tabs({ active, onChange }) {
  const tabs = ['Résumé', 'Ventes', 'Clients', 'Suggestions', 'Historique', 'Graphiques'];
  return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map((tab) => <button key={tab} type="button" onClick={() => onChange(tab)} className={`rounded-xl px-4 py-2 text-sm font-black transition ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}>{tab}</button>)}</div></div>;
}
function Empty({ label }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5 text-sm text-[#8a7456]">{label}</div>; }

function buildProducts({ animals, lots, cultures, stocks, opportunities }) {
  const items = [];
  animals.filter(animalReady).forEach((row) => items.push({ id: `animal-${row.id}`, title: row.name || row.nom || row.boucle_numero || row.id, detail: row.type || row.espece || 'Animal prêt', type: 'Animal', quantity: 1, product: row.name || row.nom || row.id, source: 'animaux' }));
  lots.filter(lotReady).forEach((row) => items.push({ id: `lot-${row.id}`, title: row.name || row.nom || row.id, detail: lotText(row).includes('chair') ? 'Poulets de chair' : 'Lot avicole', type: 'Lot', quantity: n(row.current_count ?? row.effectif_actuel ?? row.quantity ?? 1), product: row.name || row.nom || row.id, source: 'avicole' }));
  cultures.filter(cultureReady).forEach((row) => items.push({ id: `culture-${row.id}`, title: row.name || row.nom || row.culture || row.id, detail: 'Récolte disponible', type: 'Culture', quantity: n(row.stock_recolte ?? row.quantite_recoltee ?? row.quantite_disponible ?? 1), product: row.name || row.nom || row.culture || row.id, source: 'cultures' }));
  stocks.filter((row) => stockQty(row) > 0 && stockQty(row) > stockThreshold(row)).forEach((row) => items.push({ id: `stock-${row.id}`, title: productName(row), detail: `${fmtNumber(stockQty(row))} disponible`, type: 'Stock', quantity: stockQty(row), product: productName(row), source: 'stock' }));
  opportunities.filter(isOpen).forEach((row) => items.push({ id: `opp-${row.id}`, title: row.title || row.libelle || productName(row), detail: row.client_nom || row.notes || 'Opportunité ouverte', type: 'Opportunité', quantity: n(row.quantity ?? row.quantite ?? 1), product: productName(row), source: 'opportunity' }));
  return items.slice(0, 40);
}
function buildClientProfiles({ clients, salesOrders, payments }) {
  return clients.map((client) => {
    const orders = salesOrders.filter((order) => String(order.client_id || order.customer_id || order.client) === String(client.id));
    const revenue = orders.reduce((sum, order) => sum + amountOf(order), 0);
    const due = orders.reduce((sum, order) => sum + Math.max(0, remainingForOrder(order, payments)), 0);
    const lastOrder = [...orders].sort((a, b) => String(b.date || b.created_at || '').localeCompare(String(a.date || a.created_at || '')))[0];
    const productCounts = new Map();
    orders.forEach((order) => {
      const product = productName(order);
      productCounts.set(product, (productCounts.get(product) || 0) + 1);
    });
    const favorite = [...productCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Produit à confirmer';
    const regularity = orders.length >= 4 ? 'régulier' : orders.length >= 2 ? 'occasionnel' : 'nouveau';
    const paymentRisk = due > 0 && revenue > 0 ? Math.round((due / revenue) * 100) : 0;
    const score = Math.max(20, Math.min(100, 40 + Math.min(30, orders.length * 5) + Math.min(20, revenue / 50000) - Math.min(35, paymentRisk)));
    return { client, orders, revenue, due, lastOrder, favorite, regularity, score: Math.round(score) };
  }).sort((a, b) => b.score - a.score);
}
function buildSuggestions({ products, profiles }) {
  const suggestions = [];
  products.slice(0, 12).forEach((product) => {
    const matching = profiles.find((profile) => lower(product.title).includes(lower(profile.favorite)) || lower(profile.favorite).includes(lower(product.title)) || profile.orders.length >= 2);
    if (matching) suggestions.push({ id: `${product.id}-${matching.client.id}`, title: nameOf(matching.client), detail: `Proposer ${product.title} · client ${matching.regularity} · achat fréquent : ${matching.favorite}`, value: `Score ${matching.score}/100`, tone: scoreTone(matching.score), product, client: matching.client });
  });
  profiles.filter((profile) => profile.due > 0).slice(0, 6).forEach((profile) => suggestions.push({ id: `due-${profile.client.id}`, title: nameOf(profile.client), detail: `Solde à relancer · ${fmtCurrency(profile.due)} restant`, value: 'Relance', tone: 'warn', client: profile.client }));
  return suggestions.slice(0, 16);
}

function SummaryTab({ data, onNavigate, setActiveTab }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><StatLine label="Ventes du mois" value={fmtNumber(data.monthOrders.length)} /><StatLine label="À encaisser" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} /><StatLine label="À livrer" value={fmtNumber(data.toDeliver.length)} tone={data.toDeliver.length ? 'warn' : 'good'} /><StatLine label="Suggestions" value={fmtNumber(data.suggestions.length)} tone="good" /><StatLine label="Clients" value={fmtNumber(data.clients.length)} /></div><Section icon={ClipboardList} title="Priorités" action={<ActionButton onClick={() => setActiveTab('Ventes')}>Nouvelle vente</ActionButton>}>{data.priorities.length ? data.priorities.map((item) => <Row key={item.id} title={item.title} detail={item.detail} value={item.value} tone={item.tone} onClick={() => onNavigate?.(item.target || 'ventes')} />) : <Empty label="Aucune priorité commerciale." />}</Section></div>;
}
function SalesTab({ data, onNavigate }) {
  return <div className="space-y-5"><Section icon={ShoppingCart} title="Nouvelle vente" action={<ActionButton onClick={() => onNavigate?.('ventes')}>Ouvrir le formulaire</ActionButton>}><div className="grid grid-cols-1 gap-3 xl:grid-cols-4"><StatLine label="Client" value="Choisir" /><StatLine label="Produit" value="Choisir" /><StatLine label="Livraison" value="Oui / Non" /><StatLine label="Paiement" value="Total / partiel" /></div><div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">Une vente peut générer automatiquement livraison, facture, paiement, transaction finance, document et sortie de stock.</div></Section><Section icon={CreditCard} title="Ventes" action={<ActionButton onClick={() => onNavigate?.('ventes')}>Fiches ventes</ActionButton>}>{data.salesOrders.length ? data.salesOrders.slice(0, 12).map((order) => { const status = paymentStatus(order, data.payments); return <Row key={order.id || order.reference} title={orderLabel(order)} detail={`${clientName(order, data.clients)} · ${isDelivered(order) ? 'livré' : 'à livrer'} · ${fmtCurrency(amountOf(order))}`} value={status.label} tone={status.tone} onClick={() => onNavigate?.('ventes')} />; }) : <Empty label="Aucune vente." />}</Section></div>;
}
function ClientsTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Clients" value={fmtNumber(data.clients.length)} /><StatLine label="Réguliers" value={fmtNumber(data.profiles.filter((p) => p.regularity === 'régulier').length)} tone="good" /><StatLine label="À relancer" value={fmtNumber(data.profiles.filter((p) => p.due > 0).length)} tone={data.profiles.some((p) => p.due > 0) ? 'warn' : 'good'} /><StatLine label="CA clients" value={fmtCurrency(data.revenue)} /></div><Section icon={UserRound} title="Profils clients" action={<ActionButton onClick={() => onNavigate?.('clients')}>Fiches clients</ActionButton>}>{data.profiles.length ? data.profiles.slice(0, 12).map((profile) => <Row key={profile.client.id} title={nameOf(profile.client)} detail={`${profile.regularity} · achat fréquent : ${profile.favorite} · ${profile.orders.length} vente(s)`} value={`Score ${profile.score}/100`} tone={scoreTone(profile.score)} onClick={() => onNavigate?.('clients')} />) : <Empty label="Aucun client." />}</Section></div>;
}
function SuggestionsTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="Produits disponibles" value={fmtNumber(data.products.length)} tone="good" /><StatLine label="Suggestions clients" value={fmtNumber(data.suggestions.length)} tone="good" /><StatLine label="Relances" value={fmtNumber(data.profiles.filter((p) => p.due > 0).length)} tone={data.profiles.some((p) => p.due > 0) ? 'warn' : 'good'} /><StatLine label="Clients réguliers" value={fmtNumber(data.profiles.filter((p) => p.regularity === 'régulier').length)} /></div><Section icon={PackageCheck} title="Produits disponibles" action={<ActionButton onClick={() => onNavigate?.('ventes')}>Créer vente</ActionButton>}>{data.products.length ? data.products.slice(0, 10).map((item) => <Row key={item.id} title={item.title} detail={`${item.type} · ${item.detail}`} value="Vendre" tone="good" onClick={() => onNavigate?.('ventes')} />) : <Empty label="Aucun produit disponible détecté." />}</Section><Section icon={Lightbulb} title="Suggestions clients" action={<ActionButton onClick={() => onNavigate?.('clients')}>Profils clients</ActionButton>}>{data.suggestions.length ? data.suggestions.map((item) => <Row key={item.id} title={item.title} detail={item.detail} value={item.value} tone={item.tone} onClick={() => onNavigate?.('ventes')} />) : <Empty label="Aucune suggestion pour le moment." />}</Section></div>;
}
function HistoryTab({ data, onNavigate }) {
  return <Section icon={ClipboardList} title="Historique" action={<ActionButton onClick={() => onNavigate?.('ventes')}>Ventes</ActionButton>}>{data.events.length ? data.events.slice(0, 14).map((event) => <Row key={event.id || event.title} title={event.title || event.event_type || 'Événement'} detail={event.event_date || event.date || event.created_at || '—'} value={event.severity || event.status || 'Suivi'} tone={['warning', 'critique', 'critical'].includes(lower(event.severity || event.status)) ? 'warn' : 'neutral'} onClick={() => onNavigate?.('ventes')} />) : <Empty label="Aucun historique commercial." />}</Section>;
}
function GraphsTab({ data, onNavigate }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4"><StatLine label="CA" value={fmtCurrency(data.revenue)} /><StatLine label="Payé" value={fmtCurrency(data.paid)} tone="good" /><StatLine label="À encaisser" value={fmtCurrency(data.receivable)} tone={data.receivable ? 'warn' : 'good'} /><StatLine label="Ventes" value={fmtNumber(data.salesOrders.length)} /></div><Section icon={BarChart3} title="Graphiques" action={<ActionButton onClick={() => onNavigate?.('rapports')}>Rapports</ActionButton>}><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-5"><div className="space-y-4"><div><div className="mb-1 flex justify-between text-xs text-[#8a7456]"><span>Encaissements</span><span>{fmtCurrency(data.paid)}</span></div><div className="h-3 rounded-full bg-[#e8f3e8]"><div className="h-3 rounded-full bg-[#22c55e]" style={{ width: `${Math.min(100, data.revenue ? (data.paid / data.revenue) * 100 : 0)}%` }} /></div></div><div><div className="mb-1 flex justify-between text-xs text-[#8a7456]"><span>À encaisser</span><span>{fmtCurrency(data.receivable)}</span></div><div className="h-3 rounded-full bg-[#e8f3e8]"><div className="h-3 rounded-full bg-amber-500" style={{ width: `${Math.min(100, data.revenue ? (data.receivable / data.revenue) * 100 : 0)}%` }} /></div></div></div></div></Section></div>;
}

export default function CommercialModule({ clients = [], salesOrders = [], payments = [], invoices = [], deliveries = [], opportunities = [], animals = [], lots = [], cultures = [], stocks = [], businessEvents = [], onNavigate }) {
  const [activeTab, setActiveTab] = useState('Résumé');
  const data = useMemo(() => {
    const allClients = arr(clients);
    const orders = arr(salesOrders);
    const pays = arr(payments);
    const invs = arr(invoices);
    const monthOrders = orders.filter((order) => monthKey(order.date || order.created_at) === currentMonth());
    const revenue = orders.reduce((sum, order) => sum + amountOf(order), 0);
    const paid = pays.reduce((sum, payment) => sum + paidOf(payment), 0);
    const receivable = orders.reduce((sum, order) => sum + Math.max(0, remainingForOrder(order, pays)), 0);
    const toDeliver = orders.filter((order) => !isDelivered(order));
    const openInvoices = invs.filter(isInvoiceOpen);
    const products = buildProducts({ animals: arr(animals), lots: arr(lots), cultures: arr(cultures), stocks: arr(stocks), opportunities: arr(opportunities) });
    const profiles = buildClientProfiles({ clients: allClients, salesOrders: orders, payments: pays });
    const suggestions = buildSuggestions({ products, profiles });
    const events = arr(businessEvents).filter((event) => /vente|commercial|client|facture|paiement|livraison|commande/.test(lower(`${event.module_source || event.module || ''} ${event.event_type || ''} ${event.title || ''}`)));
    const priorities = [
      ...toDeliver.slice(0, 2).map((order) => ({ id: `deliver-${order.id}`, title: orderLabel(order), detail: `${clientName(order, allClients)} · livraison à traiter`, value: 'Livrer', tone: 'warn', target: 'ventes' })),
      ...orders.filter((order) => remainingForOrder(order, pays) > 0).slice(0, 2).map((order) => ({ id: `pay-${order.id}`, title: orderLabel(order), detail: `${clientName(order, allClients)} · ${fmtCurrency(remainingForOrder(order, pays))} restant`, value: 'Encaisser', tone: 'warn', target: 'ventes' })),
      ...suggestions.slice(0, 2).map((item) => ({ id: `sug-${item.id}`, title: item.title, detail: item.detail, value: 'Suggérer', tone: item.tone, target: 'ventes' })),
    ].slice(0, 6);
    return { clients: allClients, salesOrders: orders, payments: pays, invoices: invs, monthOrders, revenue, paid, receivable, toDeliver, openInvoices, products, profiles, suggestions, events, priorities };
  }, [clients, salesOrders, payments, invoices, opportunities, animals, lots, cultures, stocks, businessEvents]);

  const content = activeTab === 'Résumé' ? <SummaryTab data={data} onNavigate={onNavigate} setActiveTab={setActiveTab} />
    : activeTab === 'Ventes' ? <SalesTab data={data} onNavigate={onNavigate} />
    : activeTab === 'Clients' ? <ClientsTab data={data} onNavigate={onNavigate} />
    : activeTab === 'Suggestions' ? <SuggestionsTab data={data} onNavigate={onNavigate} />
    : activeTab === 'Historique' ? <HistoryTab data={data} onNavigate={onNavigate} />
    : <GraphsTab data={data} onNavigate={onNavigate} />;

  return <div className="space-y-6"><div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Gestion</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Commercial</h1></div><div className="flex flex-wrap gap-2"><ActionButton onClick={() => onNavigate?.('ventes')}>Nouvelle vente</ActionButton><ActionButton onClick={() => onNavigate?.('clients')}>Fiches clients</ActionButton></div></div></div><Tabs active={activeTab} onChange={setActiveTab} />{content}</div>;
}
