import { AlertTriangle, Bot, ClipboardList, CreditCard, FileWarning, Package, ShoppingCart, Sprout } from 'lucide-react';
import { useMemo, useState } from 'react';
import { receivableOfOrder, totalOpenReceivables } from '../utils/assistantDataMap.js';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const isOpen = (row = {}) => !['termine', 'terminé', 'done', 'closed', 'annule', 'annulé', 'traitee', 'traitée'].includes(lower(row.status || row.statut));
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockMin = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.min_quantity);
const stockLabel = (row = {}) => row.produit || row.nom || row.name || row.id || 'Stock';
const docLinked = (docs = [], id = '') => arr(docs).some((doc) => [doc.transaction_id, doc.finance_id, doc.entity_id, doc.related_id, doc.source_record_id].map(String).includes(String(id)));
const cultureQty = (row = {}) => toNumber(row.quantite_disponible ?? row.quantite_recoltee ?? row.rendement_reel);

function buildAnswers(dataMap = {}) {
  const tasks = arr(dataMap.taches || dataMap.tasks);
  const alertes = arr(dataMap.alertes_center || dataMap.alertes);
  const sales = arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders || dataMap.ventes);
  const payments = arr(dataMap.paymentsAll || dataMap.payments);
  const stock = arr(dataMap.stock || dataMap.stocks);
  const finances = arr(dataMap.finances || dataMap.transactions);
  const docs = arr(dataMap.documents);
  const lots = arr(dataMap.avicole || dataMap.lots);
  const animaux = arr(dataMap.animaux);
  const cultures = arr(dataMap.cultures);
  const health = arr(dataMap.sante || dataMap.vaccins);
  const equipments = arr(dataMap.equipements);
  const openTasks = tasks.filter(isOpen);
  const openAlerts = alertes.filter(isOpen);
  const unpaid = sales.filter((sale) => receivableOfOrder(sale, payments) > 0);
  const unpaidTotal = totalOpenReceivables(sales, payments);
  const lowStock = stock.filter((row) => stockMin(row) > 0 && stockQty(row) <= stockMin(row));
  const txWithoutDocs = finances.filter((tx) => amount(tx) > 0 && !docLinked(docs, tx.id));
  const sick = [...animaux.filter((row) => /malade|traitement|surveiller/.test(lower(`${row.health_status} ${row.status_sante} ${row.statut}`))), ...lots.filter((row) => /malade|alerte|surveiller/.test(lower(`${row.health_status} ${row.status_sante} ${row.statut}`)))];
  const readyCultures = cultures.filter((row) => cultureQty(row) > 0);
  const maintenance = equipments.filter((row) => /panne|maintenance|hors_service/.test(lower(`${row.status} ${row.statut}`)));
  const healthLate = health.filter((row) => /retard|a_faire|à faire/.test(lower(`${row.status} ${row.statut}`)));
  return [
    { key: 'today', icon: ClipboardList, module: 'taches', q: 'Qu’est-ce que je dois faire aujourd’hui ?', a: openTasks.length ? `${openTasks.length} tâche(s) ouverte(s). Priorité : ${openTasks.slice(0, 3).map((t) => t.title || t.nom || t.id).join(' · ')}.` : 'Aucune tâche ouverte urgente. Continue le suivi habituel et vérifie les alertes.', value: openTasks.length },
    { key: 'alerts', icon: AlertTriangle, module: 'alertes', q: 'Quels risques bloquent la ferme ?', a: openAlerts.length ? `${openAlerts.length} alerte(s) ouverte(s). Traite d’abord les alertes critiques puis crée une tâche terrain si nécessaire.` : 'Aucune alerte ouverte détectée.', value: openAlerts.length, danger: openAlerts.length > 0 },
    { key: 'sales', icon: ShoppingCart, module: 'commercial', q: 'Qui me doit de l’argent ?', a: unpaid.length ? `${unpaid.length} vente(s) avec reste à payer, total estimé ${fmtCurrency(unpaidTotal)}.` : 'Aucune créance visible sur les ventes.', value: unpaid.length, danger: unpaid.length > 0 },
    { key: 'stock', icon: Package, module: 'stock', q: 'Quels stocks sont critiques ?', a: lowStock.length ? `${lowStock.length} stock(s) sous seuil : ${lowStock.slice(0, 4).map(stockLabel).join(' · ')}.` : 'Aucun stock sous seuil détecté.', value: lowStock.length, danger: lowStock.length > 0 },
    { key: 'docs', icon: FileWarning, module: 'documents', q: 'Quels documents manquent ?', a: txWithoutDocs.length ? `${txWithoutDocs.length} transaction(s) semblent sans justificatif lié. Ajoute facture, reçu ou preuve.` : 'Les justificatifs principaux semblent suivis.', value: txWithoutDocs.length, danger: txWithoutDocs.length > 0 },
    { key: 'health', icon: AlertTriangle, module: 'sante', q: 'Quels soins sont à traiter ?', a: sick.length || healthLate.length ? `${sick.length} animal/lot à surveiller et ${healthLate.length} soin(s) en retard ou à faire.` : 'Aucun soin prioritaire détecté.', value: sick.length + healthLate.length, danger: sick.length + healthLate.length > 0 },
    { key: 'cultures', icon: Sprout, module: 'cultures', q: 'Quelles récoltes sont disponibles ?', a: readyCultures.length ? `${readyCultures.length} culture(s) avec quantité disponible : ${readyCultures.slice(0, 3).map((c) => c.nom || c.name || c.culture || c.id).join(' · ')}.` : 'Aucune récolte disponible détectée.', value: readyCultures.length },
    { key: 'maintenance', icon: CreditCard, module: 'equipements', q: 'Quels équipements vérifier ?', a: maintenance.length ? `${maintenance.length} équipement(s) en panne ou maintenance. Planifie une intervention.` : 'Aucun équipement en panne/maintenance détecté.', value: maintenance.length, danger: maintenance.length > 0 },
  ];
}
function AnswerCard({ item, active, onClick }) {
  const Icon = item.icon;
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? 'border-[#2f2415] bg-[#2f2415] text-white' : item.danger ? 'border-amber-200 bg-amber-50 text-[#2f2415]' : 'border-[#eadcc2] bg-[#fffdf8] text-[#2f2415]'}`}><div className="flex items-start gap-3"><Icon size={17} className={active ? 'text-white' : item.danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><div><p className="font-black text-sm leading-tight">{item.q}</p><p className={`mt-1 text-xs ${active ? 'text-white/80' : 'text-[#8a7456]'}`}>{fmtNumber(item.value)} point(s)</p></div></div></button>;
}

export default function AssistantERPQuickAnswers({ dataMap = {}, onNavigate }) {
  const answers = useMemo(() => buildAnswers(dataMap), [dataMap]);
  const [selectedKey, setSelectedKey] = useState(answers[0]?.key || 'today');
  const selected = answers.find((item) => item.key === selectedKey) || answers[0];
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><Bot size={14} /> Indicateurs du jour</p><h3 className="mt-3 text-xl font-black text-[#2f2415]">Lecture rapide ERP</h3><p className="mt-1 text-sm text-[#8a7456]">Compteurs terrain (tâches, stocks, créances). Recommandations et cycles → Centre décisionnel.</p></div>{selected ? <button type="button" onClick={() => onNavigate?.(selected.module)} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">Ouvrir module</button> : null}</div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{answers.map((item) => <AnswerCard key={item.key} item={item} active={selected?.key === item.key} onClick={() => setSelectedKey(item.key)} />)}</div>{selected ? <div className={`rounded-2xl border p-4 ${selected.danger ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><p className="text-xs uppercase tracking-widest font-black opacity-80">Réponse</p><p className="mt-1 text-lg font-black">{selected.q}</p><p className="mt-2 text-sm leading-relaxed">{selected.a}</p></div> : null}</section>;
}
