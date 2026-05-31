import { AlertTriangle, CheckCircle, DollarSign, Download, Edit, Eye, History, LayoutGrid, LineChart, Lock, Plus, QrCode, RefreshCw, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import ActionIconButton from '../components/ActionIconButton';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import BaseModal from '../modals/BaseModal';
import { applyAnimalDecisionDefaults } from '../services/animalDecisionEngine';
import { generateSequentialId } from '../utils/ids';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import DetailSheetTabs from '../components/DetailSheetTabs.jsx';
import AnimalHealthBridge from './AnimalHealthBridge.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => { const d = new Date(date || today()); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const clean = (v) => String(v || '').trim().toLowerCase();
const amount = (r = {}) => toNumber(r.montant ?? r.amount ?? r.total ?? r.montant_total ?? r.total_amount ?? r.cout ?? r.coût ?? r.cost ?? r.cout_total ?? r.total_cost ?? 0);
const orderAmount = (r = {}) => toNumber(r.montant_total ?? r.total ?? r.amount ?? r.total_amount ?? r.ca ?? r.ca_total ?? 0);
const paymentAmount = (r = {}) => toNumber(r.montant_paye ?? r.montant ?? r.amount ?? r.paid_amount ?? 0);
const statusOf = (r = {}) => r.status || r.statut || 'actif';
const isLocked = (r = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu'].includes(clean(statusOf(r)));
const healthOf = (r = {}) => r.health_status || r.sante || r.status_sante || 'sain';
const physicalIdOf = (r = {}) => r.boucle_numero || r.qr_code || r.tag || r.id;
const weightOf = (r = {}) => toNumber(r.poids_actuel ?? r.poids ?? r.weight ?? r.current_weight ?? r.last_weight);
const entryWeightOf = (r = {}) => toNumber(r.poids_entree ?? r.weight_entry ?? r.poids_initial ?? r.initial_weight);
const targetWeightOf = (r = {}) => toNumber(r.poids_cible ?? r.poids_objectif ?? r.target_weight ?? r.objectif_poids);
const purchaseCost = (r = {}) => toNumber(r.purchase_cost ?? r.cout_achat ?? r.prix_achat ?? r.cost_purchase);
const salePrice = (r = {}) => toNumber(r.sale_price ?? r.prix_vente_reel ?? r.prix_vente ?? r.prix_vente_estime);
const speciesPlural = (s = 'Bovin') => `${s}s`;
const fallbackText = (value, fallback = 'Non renseigné') => {
  const text = String(value ?? '').trim();
  return text && !['undefined', 'null', 'nan', '[object object]'].includes(text.toLowerCase()) ? text : fallback;
};
const dateLabel = (value) => fallbackText(value, 'Non renseignée');
const ageLabel = (row = {}) => {
  const birth = row.date_naissance || row.birth_date;
  const rawAge = row.age || row.age_label;
  if (rawAge) return fallbackText(rawAge);
  if (!birth) return 'Non renseigné';
  const date = new Date(birth);
  if (Number.isNaN(date.getTime())) return 'Non renseigné';
  const months = Math.max(0, Math.floor((Date.now() - date.getTime()) / 2629800000));
  if (months < 1) return 'Moins d’un mois';
  if (months < 24) return `${months} mois`;
  return `${Math.floor(months / 12)} an(s) ${months % 12 ? `${months % 12} mois` : ''}`.trim();
};
const animalOrigin = (row = {}) => fallbackText(row.origine || row.fournisseur_vendeur || row.source || row.mode_acquisition);
const locationOf = (row = {}) => fallbackText(row.localisation || row.emplacement || row.parc || row.enclos);
function parseDocuments(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((item) => typeof item === 'string' ? { title: item, url: item } : item).filter(Boolean);
  if (typeof raw === 'string') {
    try { return parseDocuments(JSON.parse(raw)); } catch {
      return raw.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => ({ title: line, url: line }));
    }
  }
  return [];
}
const animalDocuments = (row = {}) => [
  ...parseDocuments(row.documents || row.docs || row.pieces_jointes),
  ...(row.photo_url || row.photo ? [{ title: 'Photo animal', url: row.photo_url || row.photo, type: 'photo' }] : []),
].filter((item) => item?.title || item?.url);
const eventDate = (event = {}) => fallbackText(event.event_date || event.date || event.created_at, '');
const eventTitle = (event = {}) => fallbackText(event.title || event.libelle || event.description || event.type_evenement || event.event_type, 'Événement animal');

function suggestedTargetWeight(species = 'Bovin', entryWeight = 0) {
  const start = toNumber(entryWeight);
  if (start <= 0) return 0;
  const key = clean(species);
  const gain = key.includes('bovin') ? Math.max(25, start * 0.08) : key.includes('ovin') ? Math.max(6, start * 0.12) : key.includes('caprin') ? Math.max(5, start * 0.12) : start * 0.1;
  return Math.round((start + gain) * 10) / 10;
}
function deriveCreateValuesForSpecies(species) {
  return (next, changedKey, previous = {}) => {
    const out = { ...next };
    const entry = toNumber(out.poids_entree);
    if (changedKey === 'poids_entree' && (!out.poids || toNumber(out.poids) <= 0)) out.poids = out.poids_entree;
    const proposed = suggestedTargetWeight(species, entry);
    const previousProposed = suggestedTargetWeight(species, previous?.poids_entree);
    const targetWasAuto = !toNumber(previous?.poids_cible) || Math.abs(toNumber(previous?.poids_cible) - previousProposed) < 0.1;
    if (proposed > 0 && (changedKey === null || changedKey === 'poids_entree') && targetWasAuto) out.poids_cible = String(proposed);
    return out;
  };
}
function defaultPhysicalCode(species, rows = []) {
  const prefix = species === 'Bovin' ? 'BOV' : species === 'Ovin' ? 'OVI' : species === 'Caprin' ? 'CAP' : 'ANI';
  const max = arr(rows).reduce((acc, r) => { const m = String(r.boucle_numero || r.qr_code || r.tag || r.id || '').match(new RegExp(`^${prefix}(\\d+)`, 'i')); return m ? Math.max(acc, Number(m[1])) : acc; }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}
function matchAnimal(item = {}, animal = {}) {
  const id = String(animal.id || '');
  const code = String(physicalIdOf(animal) || '');
  const values = [item.animal_id, item.source_id, item.source_record_id, item.related_id, item.cible_id, item.target_id, item.entity_id, item.boucle_numero, item.qr_code, item.tag, item.product_id, item.article_id].map((v) => String(v || ''));
  if (values.some((v) => v && (v === id || v === code))) return true;
  const text = clean(`${item.libelle || ''} ${item.title || ''} ${item.description || ''} ${item.notes || ''} ${item.product_name || ''} ${item.nom || ''}`);
  return Boolean(code && text.includes(clean(code))) || Boolean(id && text.includes(clean(id)));
}
function isSaleLikeEvent(event = {}) {
  const text = clean(`${event.type_evenement || ''} ${event.event_type || ''} ${event.title || ''} ${event.description || ''} ${event.libelle || ''} ${event.category || ''} ${event.categorie || ''} ${event.nature || ''}`);
  return /(vente|vendu|sale|sold|paiement|payment|encaisse|encaiss|revenu|produit|commande|client|chiffre d|ca\b)/.test(text);
}
function isChargeLikeEvent(event = {}) {
  if (isSaleLikeEvent(event)) return false;
  const text = clean(`${event.type_evenement || ''} ${event.event_type || ''} ${event.title || ''} ${event.description || ''} ${event.libelle || ''} ${event.category || ''} ${event.categorie || ''} ${event.nature || ''}`);
  return /(charge|cout|coût|depense|dépense|frais|transport|traitement|soin|sante|santé|aliment|alimentation|perte|mort|maintenance|main.?d.?oeuvre)/.test(text);
}
function isFinanceCharge(row = {}) {
  const text = clean(`${row.type || ''} ${row.nature || ''} ${row.category || ''} ${row.categorie || ''} ${row.libelle || ''} ${row.title || ''} ${row.description || ''}`);
  if (/(vente|revenu|encaisse|encaissement|produit|client|paiement reçu|paiement recu|sale|income|revenue)/.test(text)) return false;
  return /(sortie|charge|depense|dépense|frais|cout|coût|expense|out|debit|débit|maintenance|transport|soin|sante|santé|aliment)/.test(text);
}
function parseHistory(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => ({ date: x.date || x.date_pesee || x.weighed_at, poids: toNumber(x.poids ?? x.weight), note: x.note || '' })).filter((x) => x.date && x.poids > 0);
  if (typeof raw === 'string') {
    try { return parseHistory(JSON.parse(raw)); } catch {
      return raw.split('\n').map((line) => { const [date, poids, ...rest] = line.split('|').map((p) => p.trim()); return { date, poids: toNumber(poids), note: rest.join(' | ') }; }).filter((x) => x.date && x.poids > 0);
    }
  }
  return [];
}
function growthInfo(row = {}) {
  const history = parseHistory(row.poids_history || row.weight_history || row.historique_poids);
  const entryDate = row.date_poids_entree || row.date_entree_ferme || row.date_achat || today();
  const lastDate = row.date_derniere_pesee || row.last_weighing_date || today();
  const entryWeight = entryWeightOf(row);
  const currentWeight = weightOf(row);
  if (entryWeight > 0 && !history.some((x) => x.date === entryDate)) history.unshift({ date: entryDate, poids: entryWeight, note: 'Entrée ferme' });
  if (currentWeight > 0 && !history.some((x) => x.date === lastDate && Math.round(x.poids * 10) === Math.round(currentWeight * 10))) history.push({ date: lastDate, poids: currentWeight, note: 'Dernière pesée' });
  history.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const first = history[0];
  const last = history[history.length - 1];
  const current = toNumber(last?.poids || currentWeight);
  const target = targetWeightOf(row);
  const progress = target > 0 ? Math.round((current / target) * 100) : 0;
  const gain = first && last ? last.poids - first.poids : 0;
  const days = Math.max(1, Math.round((new Date(last?.date || today()) - new Date(first?.date || today())) / 86400000) || 1);
  const gainDay = first && last ? gain / days : 0;
  const nextWeighing = isLocked(row) ? '' : addDays(lastDate, 15);
  const reminderDate = nextWeighing ? addDays(nextWeighing, -1) : '';
  const weighingStatus = isLocked(row) ? 'verrouille' : nextWeighing < today() ? 'retard' : reminderDate <= today() ? 'j-1' : 'planifie';
  const status = clean(statusOf(row)) === 'vendu' ? 'vendu' : progress >= 100 || row.ready_to_sell || clean(statusOf(row)) === 'pret_a_la_vente' ? 'pret' : progress >= 90 ? 'presque' : progress > 0 && progress < 75 ? 'retard' : 'normal';
  const decision = status === 'vendu' ? 'Animal vendu : fiche verrouillée' : status === 'pret' ? 'Créer / exécuter opportunité de vente' : status === 'presque' ? 'Peser puis vendre si marge OK' : status === 'retard' ? 'Revoir ration, santé et coût journalier' : weighingStatus === 'j-1' ? 'Pesée à préparer demain' : 'Continuer le suivi normal';
  return { history, current, target, progress, gain, gainDay, status, decision, lastDate, nextWeighing, reminderDate, weighingStatus };
}
function linkedSales(animal = {}, salesOrders = [], payments = []) {
  const orders = arr(salesOrders).filter((order) => !['annule', 'annulee', 'cancelled'].includes(clean(order.statut || order.status)) && matchAnimal(order, animal));
  const total = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  const orderIds = orders.map((o) => String(o.id || '')).filter(Boolean);
  const paid = arr(payments).filter((p) => orderIds.includes(String(p.order_id || p.sale_id || p.source_record_id || p.related_id || '')) || matchAnimal(p, animal)).reduce((sum, p) => sum + paymentAmount(p), 0);
  return { orders, total, paid, remaining: Math.max(0, total - paid) };
}
function costBreakdown(row = {}, ctx = {}) {
  const { alimentationLogs = [], vaccins = [], businessEvents = [], salesOrders = [], payments = [], transactions = [] } = ctx;
  const achat = purchaseCost(row);
  const alimentation = toNumber(row.alimentation ?? row.cout_alimentation ?? row.feed_cost ?? row.cout_nourriture) + arr(alimentationLogs).filter((x) => matchAnimal(x, row)).reduce((s, x) => s + amount(x), 0);
  const sante = toNumber(row.sante ?? row.cout_sante ?? row.health_cost ?? row.vet_cost) + arr(vaccins).filter((x) => matchAnimal(x, row)).reduce((s, x) => s + amount(x), 0);
  const autres = toNumber(row.autres_frais ?? row.frais_directs ?? row.other_costs ?? row.direct_costs);
  const linkedEvents = arr(businessEvents).filter((e) => matchAnimal(e, row));
  const estimatedSale = salePrice(row) || toNumber(row.prix_vente_estime);
  const saleEvents = linkedEvents.filter((e) => isSaleLikeEvent(e) || (estimatedSale > 0 && Math.abs(amount(e) - estimatedSale) < 1));
  const chargeEvents = linkedEvents.filter((e) => !saleEvents.includes(e) && isChargeLikeEvent(e));
  const evenements = chargeEvents.reduce((s, e) => s + amount(e), 0);
  const finance = arr(transactions).filter((tx) => matchAnimal(tx, row) && isFinanceCharge(tx)).reduce((s, tx) => s + amount(tx), 0);
  const totalDirect = toNumber(row.cout_total ?? row.total_cost ?? row.cost_total);
  const totalCalc = achat + alimentation + sante + autres + evenements + finance;
  const total = totalCalc > 0 ? totalCalc : totalDirect;
  const sales = linkedSales(row, salesOrders, payments);
  const eventSale = saleEvents.reduce((s, e) => s + amount(e), 0);
  const sale = sales.total || estimatedSale || eventSale;
  const saleSource = sales.total > 0 ? 'commande liée' : estimatedSale > 0 ? 'prix estimé fiche' : eventSale > 0 ? 'événement vente' : 'non renseignée';
  const warnings = [];
  if (isLocked(row) && sales.orders.length === 0) warnings.push('Animal marqué vendu sans commande de vente liée.');
  if (isLocked(row) && sales.orders.length > 0 && sales.paid <= 0) warnings.push('Animal vendu avec commande liée mais aucun paiement rattaché.');
  if (saleEvents.length && !sales.orders.length) warnings.push('Événement de vente/valorisation détecté sans commande : vérifier la traçabilité Vente.');
  if (totalDirect > 0 && Math.abs(totalDirect - totalCalc) > 1) warnings.push('Ancien coût total incohérent ignoré : recalcul depuis les charges détaillées.');
  return { achat, alimentation, sante, autres, evenements, finance, total, sale, saleSource, paid: sales.paid, remaining: sales.orders.length ? sales.remaining : 0, salesCount: sales.orders.length, marge: sale - total, warnings };
}
function statusBadge(status) {
  const map = { vendu: 'bg-slate-50 text-slate-700 border-slate-200', pret: 'bg-emerald-50 text-emerald-700 border-emerald-200', presque: 'bg-amber-50 text-amber-700 border-amber-200', retard: 'bg-red-50 text-red-700 border-red-200', normal: 'bg-sky-50 text-sky-700 border-sky-200' };
  const label = { vendu: 'Vendu', pret: 'Prêt vente', presque: 'Presque prêt', retard: 'En retard', normal: 'Normal' }[status] || status;
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${map[status] || map.normal}`}>{label}</span>;
}
function buildCreateFields() { return [
  { key: 'id', label: 'ID animal', type: 'text', required: true },
  { key: 'boucle_numero', label: 'N° boucle terrain', type: 'text', required: true },
  { key: 'qr_code', label: 'Code QR / scan', type: 'text' },
  { key: 'name', label: 'Nom / repère', type: 'text', required: true },
  { key: 'race', label: 'Race', type: 'text' },
  { key: 'sexe', label: 'Sexe', type: 'select', required: true, options: [{ value: 'F', label: 'Femelle' }, { value: 'M', label: 'Mâle' }] },
  { key: 'date_naissance', label: 'Date naissance', type: 'date' },
  { key: 'mode_acquisition', label: 'Mode acquisition', type: 'select', required: true, options: [{ value: 'achat', label: 'Achat' }, { value: 'naissance_ferme', label: 'Naissance ferme' }, { value: 'don', label: 'Don / autre' }] },
  { key: 'origine', label: 'Origine / vendeur', type: 'text' },
  { key: 'localisation', label: 'Localisation / enclos', type: 'text' },
  { key: 'date_entree_ferme', label: 'Date entrée ferme', type: 'date', required: true },
  { key: 'date_achat', label: 'Date achat', type: 'date' },
  { key: 'poids_entree', label: 'Poids entrée ferme (kg)', type: 'number', required: true },
  { key: 'poids', label: 'Poids actuel / 1ère pesée (kg)', type: 'number', required: true },
  { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date', required: true },
  { key: 'poids_cible', label: 'Poids cible vente proposé (kg, ajustable)', type: 'number', required: true },
  { key: 'purchase_cost', label: 'Prix achat / valeur entrée', type: 'number', required: true },
  { key: 'prix_vente_estime', label: 'Prix vente estimé', type: 'number' },
  { key: 'health_status', label: 'Santé', type: 'select', required: true, options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }] },
  { key: 'photo_url', label: 'Photo animal', type: 'image', fullWidth: true },
  { key: 'documents_text', label: 'Documents / preuves (un lien ou nom par ligne)', type: 'textarea', rows: 3, fullWidth: true },
  { key: 'notes', label: 'Notes terrain', type: 'textarea', rows: 3, fullWidth: true },
]; }
const editFields = [
  { key: 'section_identity', label: 'Identité terrain', type: 'section' },
  { key: 'boucle_numero', label: 'N° boucle terrain', type: 'text', required: true },
  { key: 'name', label: 'Nom / repère', type: 'text', required: true },
  { key: 'race', label: 'Race', type: 'text' },
  { key: 'sexe', label: 'Sexe', type: 'select', options: [{ value: 'F', label: 'Femelle' }, { value: 'M', label: 'Mâle' }] },
  { key: 'date_naissance', label: 'Date naissance', type: 'date' },
  { key: 'origine', label: 'Origine / vendeur', type: 'text' },
  { key: 'localisation', label: 'Localisation / enclos', type: 'text' },
  { key: 'section_growth', label: 'Suivi croissance', type: 'section', description: 'Une nouvelle pesée recalcule automatiquement la prochaine pesée à J+15 et le rappel à J-1.' },
  { key: 'poids_entree', label: 'Poids entrée ferme (kg)', type: 'number' },
  { key: 'poids', label: 'Poids actuel / dernière pesée (kg)', type: 'number', required: true },
  { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date', required: true },
  { key: 'poids_cible', label: 'Poids cible vente (kg)', type: 'number', required: true },
  { key: 'poids_history_text', label: 'Historique pesées', type: 'textarea', rows: 5, fullWidth: true },
  { key: 'section_costs', label: 'Valeurs économiques', type: 'section' },
  { key: 'purchase_cost', label: 'Prix achat / valeur entrée', type: 'number', required: true },
  { key: 'prix_vente_estime', label: 'Prix vente estimé', type: 'number' },
  { key: 'section_status', label: 'Statut et preuves', type: 'section' },
  { key: 'status', label: 'Statut vente / présence', type: 'select', options: [{ value: 'actif', label: 'Actif' }, { value: 'pret_a_la_vente', label: 'Prêt à vendre' }, { value: 'vendu', label: 'Vendu' }, { value: 'mort', label: 'Mort' }, { value: 'perdu', label: 'Perdu' }, { value: 'vole', label: 'Volé' }, { value: 'sorti', label: 'Sorti' }] },
  { key: 'health_status', label: 'Santé', type: 'select', options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }, { value: 'sous_traitement', label: 'Sous traitement' }] },
  { key: 'photo_url', label: 'Photo animal', type: 'image', fullWidth: true },
  { key: 'documents_text', label: 'Documents / preuves (un lien ou nom par ligne)', type: 'textarea', rows: 3, fullWidth: true },
  { key: 'notes', label: 'Notes terrain', type: 'textarea', rows: 3, fullWidth: true },
];
function MiniMetric({ label, value, danger = false }) { return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-white'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>; }
function ProgressBar({ value }) { const pct = Math.max(0, Math.min(100, Number(value || 0))); return <div className="min-w-[120px]"><div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full rounded-full bg-[#2f2415]" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-xs font-bold text-[#2f2415]">{Math.round(value || 0)}%</p></div>; }
function WeightCurve({ history = [], target = 0 }) { const points = history.filter((p) => p.poids > 0); if (points.length < 2) return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">Ajoute au moins deux pesées pour afficher une courbe fiable.</div>; const values = points.map((p) => p.poids).concat(target ? [target] : []); const min = Math.min(...values) * 0.96; const max = Math.max(...values) * 1.04; const w = 640; const h = 220; const pad = 32; const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1); const y = (v) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2); const d = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.poids)}`).join(' '); const targetY = target ? y(target) : null; return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><p className="font-black text-[#2f2415] flex items-center gap-2 mb-3"><LineChart size={16} /> Courbe d’évolution du poids</p><svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56"><line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#eadcc2" /><line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#eadcc2" />{targetY ? <line x1={pad} y1={targetY} x2={w - pad} y2={targetY} stroke="#c9a96a" strokeDasharray="6 6" /> : null}<path d={d} fill="none" stroke="#2f2415" strokeWidth="4" strokeLinecap="round" />{points.map((p, i) => <g key={`${p.date}-${i}`}><circle cx={x(i)} cy={y(p.poids)} r="5" fill="#2f2415" /><text x={x(i)} y={y(p.poids) - 10} textAnchor="middle" fontSize="12" fill="#2f2415">{p.poids}kg</text><text x={x(i)} y={h - 10} textAnchor="middle" fontSize="11" fill="#8a7456">{String(p.date).slice(5)}</text></g>)}</svg></div>; }
export function buildAnimalDetailAuditModel({ animal = {}, alimentationLogs = [], vaccins = [], businessEvents = [], salesOrders = [], payments = [], transactions = [] } = {}) {
  const g = growthInfo(animal);
  const costs = costBreakdown(animal, { alimentationLogs, vaccins, businessEvents, salesOrders, payments, transactions });
  const docs = animalDocuments(animal);
  const linkedHealth = arr(vaccins).filter((item) => matchAnimal(item, animal));
  const linkedFeed = arr(alimentationLogs).filter((item) => matchAnimal(item, animal));
  const linkedEvents = arr(businessEvents).filter((item) => matchAnimal(item, animal));
  const sales = linkedSales(animal, salesOrders, payments);
  const identityRows = [
    ['Identifiant / boucle', physicalIdOf(animal)],
    ['Nom / repère', animal.name || animal.nom],
    ['Espèce', animal.type || animal.espece],
    ['Sexe', animal.sexe === 'M' ? 'Mâle' : animal.sexe === 'F' ? 'Femelle' : animal.sexe],
    ['Race', animal.race],
    ['Âge', ageLabel(animal)],
    ['Date naissance', dateLabel(animal.date_naissance || animal.birth_date)],
    ['Date entrée', dateLabel(animal.date_entree_ferme || animal.date_achat)],
    ['Origine', animalOrigin(animal)],
    ['Statut actuel', statusOf(animal)],
    ['État de santé', healthOf(animal)],
    ['Localisation', locationOf(animal)],
  ];
  const historyRows = [
    ...g.history.map((item) => ({ date: item.date, title: `Pesée ${fmtNumber(item.poids)} kg`, detail: item.note || 'Pesée terrain' })),
    ...linkedHealth.map((item) => ({ date: eventDate(item) || item.date_prevue || item.date_realisation, title: `Santé · ${fallbackText(item.type_soin || item.type_intervention || item.nom, 'Soin')}`, detail: fallbackText(item.produit || item.notes || item.status, 'Suivi santé') })),
    ...linkedFeed.map((item) => ({ date: eventDate(item), title: `Alimentation · ${fmtNumber(toNumber(item.quantite ?? item.quantity))} ${item.unite || 'kg'}`, detail: fallbackText(item.produit || item.notes, 'Sortie alimentation') })),
    ...sales.orders.map((item) => ({ date: eventDate(item), title: `Vente · ${fmtCurrency(orderAmount(item))}`, detail: fallbackText(item.client_name || item.client || item.status, 'Commande vente') })),
    ...linkedEvents.map((item) => ({ date: eventDate(item), title: eventTitle(item), detail: fallbackText(item.description || item.notes || item.status, 'Événement métier') })),
  ].filter((item) => item.title).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 12);
  return { g, costs, docs, sales, identityRows, historyRows };
}
function AnimalDetailModal({ open, onClose, animal, alimentationLogs = [], vaccins = [], businessEvents = [], salesOrders = [], payments = [], transactions = [] }) {
  const [tab, setTab] = useState('overview');
  if (!animal) return null;
  const g = growthInfo(animal);
  const costs = costBreakdown(animal, { alimentationLogs, vaccins, businessEvents, salesOrders, payments, transactions });
  const docs = animalDocuments(animal);
  const linkedHealth = arr(vaccins).filter((item) => matchAnimal(item, animal));
  const linkedFeed = arr(alimentationLogs).filter((item) => matchAnimal(item, animal));
  const linkedEvents = arr(businessEvents).filter((item) => matchAnimal(item, animal));
  const sales = linkedSales(animal, salesOrders, payments);
  const saleLabel = costs.salesCount > 0 ? 'Vente liée' : costs.sale > 0 ? 'Vente estimée' : 'Vente';
  const identityRows = [
    ['Identifiant / boucle', physicalIdOf(animal)],
    ['Nom / repère', animal.name || animal.nom],
    ['Espèce', animal.type || animal.espece],
    ['Sexe', animal.sexe === 'M' ? 'Mâle' : animal.sexe === 'F' ? 'Femelle' : animal.sexe],
    ['Race', animal.race],
    ['Âge', ageLabel(animal)],
    ['Date naissance', dateLabel(animal.date_naissance || animal.birth_date)],
    ['Date entrée', dateLabel(animal.date_entree_ferme || animal.date_achat)],
    ['Origine', animalOrigin(animal)],
    ['Statut actuel', statusOf(animal)],
    ['État de santé', healthOf(animal)],
    ['Bâtiment / parc', animal.batiment || animal.nom_batiment || animal.localisation || locationOf(animal)],
    ['Localisation', locationOf(animal)],
  ];
  const historyRows = [
    ...g.history.map((item) => ({ date: item.date, title: `Pesée ${fmtNumber(item.poids)} kg`, detail: item.note || 'Pesée terrain' })),
    ...linkedHealth.map((item) => ({ date: eventDate(item) || item.date_prevue || item.date_realisation, title: `Santé · ${fallbackText(item.type_soin || item.type_intervention || item.nom, 'Soin')}`, detail: fallbackText(item.produit || item.notes || item.status, 'Suivi santé') })),
    ...linkedFeed.map((item) => ({ date: eventDate(item), title: `Alimentation · ${fmtNumber(toNumber(item.quantite ?? item.quantity))} ${item.unite || 'kg'}`, detail: fallbackText(item.produit || item.notes, 'Sortie alimentation') })),
    ...sales.orders.map((item) => ({ date: eventDate(item), title: `Vente · ${fmtCurrency(orderAmount(item))}`, detail: fallbackText(item.client_name || item.client || item.status, 'Commande vente') })),
    ...linkedEvents.map((item) => ({ date: eventDate(item), title: eventTitle(item), detail: fallbackText(item.description || item.notes || item.status, 'Événement métier') })),
  ].filter((item) => item.title).sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 12);

  const animalTabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutGrid },
    { id: 'croissance', label: 'Croissance', icon: TrendingUp },
    { id: 'finance', label: 'Coûts & marge', icon: DollarSign },
    { id: 'historique', label: 'Historique', icon: History },
  ];

  const hero = (
    <div className="rounded-3xl bg-[#2f2415] text-white p-5">
      <p className="text-xs uppercase tracking-widest text-[#c9a96a]">{fallbackText(animal.type || animal.espece, 'Espèce non renseignée')} · {fallbackText(animal.sexe === 'M' ? 'Mâle' : animal.sexe === 'F' ? 'Femelle' : animal.sexe)} · {isLocked(animal) ? 'Fiche verrouillée' : 'Actif'}</p>
      <h2 className="text-2xl font-black mt-1">{fallbackText(animal.name || animal.nom || physicalIdOf(animal))}</h2>
      <p className="mt-1 text-sm text-[#f4e6c8]">{locationOf(animal)} · {animalOrigin(animal)}</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">{[['Poids entrée', entryWeightOf(animal) ? `${fmtNumber(entryWeightOf(animal))} kg` : 'Non renseigné'], ['Poids actuel', g.current ? `${fmtNumber(g.current)} kg` : 'Non renseigné'], ['Objectif', g.target ? `${fmtNumber(g.target)} kg` : 'À renseigner'], ['Progression', `${g.progress}%`], ['Prêt à vendre', g.status === 'pret' ? 'Oui' : 'Non']].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 border border-white/10 p-3"><p className="text-xs text-[#f4e6c8]">{label}</p><p className="font-black text-white mt-1">{value}</p></div>)}</div>
    </div>
  );

  return (
    <BaseModal open={open} onClose={onClose} title={`Fiche ${animal.type || animal.espece || 'animal'} - ${physicalIdOf(animal)}`} size="5xl">
      <div className="space-y-5">
        {hero}
        <DetailSheetTabs tabs={animalTabs} defaultTab={tab} onChange={setTab}>
          {(activeTab) => {
            if (activeTab.id === 'overview') {
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 rounded-2xl border border-[#eadcc2] bg-white p-4">
                    <p className="font-black text-[#2f2415] mb-3">Identité complète</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{identityRows.map(([label, value]) => <div key={label} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] mt-1">{fallbackText(value)}</p></div>)}</div>
                  </div>
                  <div className="space-y-3">
                    <MiniMetric label="Dernière pesée" value={dateLabel(g.lastDate)} />
                    <MiniMetric label="Prochaine pesée" value={g.nextWeighing || 'Non planifiée'} danger={g.weighingStatus === 'retard'} />
                    <MiniMetric label="Gain total" value={g.gain ? `${g.gain.toFixed(1)} kg` : 'À compléter'} />
                    <MiniMetric label="Décision" value={g.decision} danger={g.weighingStatus === 'retard'} />
                  </div>
                </div>
              );
            }
            if (activeTab.id === 'croissance') {
              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2"><WeightCurve history={g.history} target={g.target} /></div>
                  <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                    <p className="font-black text-[#2f2415] mb-2">Notes terrain</p>
                    <p className="text-sm text-[#7d6a4a] whitespace-pre-wrap">{fallbackText(animal.notes || animal.note || animal.commentaire)}</p>
                  </div>
                </div>
              );
            }
            if (activeTab.id === 'finance') {
              return (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                  <p className="font-black text-red-800 mb-1">Coût réel animal et marge</p>
                  <p className="text-sm text-red-700 mb-3">Achat, alimentation, santé, frais directs, Finance, événements de charge et ventes liées à cette fiche.</p>
                  {costs.warnings.length ? <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {costs.warnings.join(' ')}</div> : null}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{[['Prix achat', costs.achat], ['Alimentation/coût lié', costs.alimentation], ['Soins/vaccins liés', costs.sante], ['Autres frais', costs.autres], ['Événements de charge', costs.evenements], ['Finance liée', costs.finance], ['Coût cumulé', costs.total], [saleLabel, costs.sale], ['Valeur estimée', salePrice(animal) || costs.sale], ['Marge', costs.marge], ['Payé', costs.paid], ['Reste à encaisser', costs.remaining], ['Commandes liées', costs.salesCount], ['Coût/kg', g.current > 0 ? costs.total / g.current : 0]].map(([label, value]) => <div key={label} className="rounded-xl bg-white border border-red-100 p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className={`font-black mt-1 ${label === 'Marge' && value < 0 ? 'text-red-600' : 'text-[#2f2415]'}`}>{label === 'Commandes liées' ? fmtNumber(value || 0) : fmtCurrency(value || 0)}</p>{label === saleLabel ? <p className="mt-1 text-[11px] text-[#8a7456]">{costs.saleSource}</p> : null}</div>)}</div>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                  <p className="font-black text-[#2f2415] mb-2">Documents / photos</p>
                  {docs.length ? <div className="space-y-2">{docs.map((doc, index) => <div key={`${doc.url || doc.title}-${index}`} className="rounded-xl bg-white border border-[#eadcc2] px-3 py-2"><p className="text-sm font-black text-[#2f2415]">{fallbackText(doc.title || doc.nom || doc.type, 'Document animal')}</p><p className="text-xs text-[#8a7456] break-all">{fallbackText(doc.url || doc.file_url || doc.lien, 'Lien non renseigné')}</p></div>)}</div> : <p className="text-sm text-amber-700">Aucun document ou photo renseigné.</p>}
                </div>
                <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                  <p className="font-black text-[#2f2415] mb-2">Historique de vie</p>
                  <div className="space-y-2">{historyRows.map((item, index) => <div key={`${item.date || 'date'}-${item.title}-${index}`} className="rounded-xl bg-white border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">{dateLabel(item.date)}</p><p className="font-black text-[#2f2415]">{item.title}</p><p className="text-xs text-[#8a7456]">{item.detail}</p></div>)}</div>
                  {!historyRows.length ? <p className="text-sm text-amber-700">Aucun événement lié visible.</p> : null}
                </div>
              </div>
            );
          }}
        </DetailSheetTabs>
      </div>
    </BaseModal>
  );
}
export default function AnimauxSpeciesFocused({ species = 'Bovin', rows = [], alimentationLogs = [], vaccins = [], businessEvents = [], salesOrders = [], payments = [], transactions = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null); const [modal, setModal] = useState(null); const [saving, setSaving] = useState(false); const [filter, setFilter] = useState('tous');
  const createFields = useMemo(() => buildCreateFields(species), [species]); const deriveCreateValues = useMemo(() => deriveCreateValuesForSpecies(species), [species]);
  const normalizedRows = useMemo(() => arr(rows).map((row) => ({ ...row, type: row.type || species, espece: row.espece || species })), [rows, species]);
  const filtered = useMemo(() => normalizedRows.filter((row) => { const g = growthInfo(row); if (filter === 'tous') return true; if (filter === 'actifs') return isActiveAnimalForFeeding(row); if (filter === 'prets') return g.status === 'pret'; if (filter === 'retard') return g.status === 'retard' || g.weighingStatus === 'retard'; if (filter === 'vendus') return clean(statusOf(row)) === 'vendu'; if (filter === 'surveillance') return ['malade', 'sous_traitement', 'blesse', 'blessé', 'a_surveiller'].includes(clean(healthOf(row))); return true; }), [normalizedRows, filter]);
  const summary = useMemo(() => { const active = normalizedRows.filter((row) => isActiveAnimalForFeeding(row)); const ready = normalizedRows.filter((row) => growthInfo(row).status === 'pret'); const late = normalizedRows.filter((row) => growthInfo(row).weighingStatus === 'retard'); const sold = normalizedRows.filter((row) => clean(statusOf(row)) === 'vendu'); const sick = normalizedRows.filter((row) => ['malade', 'sous_traitement', 'blesse', 'blessé', 'a_surveiller'].includes(clean(healthOf(row)))); const costRows = normalizedRows.map((row) => costBreakdown(row, { alimentationLogs, vaccins, businessEvents, salesOrders, payments, transactions })); const invested = costRows.reduce((sum, item) => sum + item.total, 0); const revenue = costRows.reduce((sum, item) => sum + item.sale, 0); const avgWeight = active.length ? active.reduce((sum, row) => sum + weightOf(row), 0) / Math.max(1, active.filter((row) => weightOf(row) > 0).length) : 0; return { active, ready, late, sold, sick, invested, revenue, margin: revenue - invested, avgWeight }; }, [normalizedRows, alimentationLogs, vaccins, businessEvents, salesOrders, payments, transactions]);
  const initialValues = useMemo(() => { const physicalCode = defaultPhysicalCode(species, normalizedRows); const date = today(); return applyAnimalDecisionDefaults({ id: physicalCode || generateSequentialId('animaux', normalizedRows, { type: species }), tag: physicalCode, boucle_numero: physicalCode, qr_code: physicalCode, type: species, espece: species, status: 'actif', health_status: 'sain', mode_acquisition: 'achat', origine: '', localisation: '', race: '', date_achat: date, date_entree_ferme: date, date_poids_entree: date, date_derniere_pesee: date, sexe: 'F', poids_entree: 0, poids: 0, poids_cible: 0, purchase_cost: 0, documents_text: '', photo_url: '' }); }, [normalizedRows, species]);
  const prepare = (payload = {}, existing = {}) => {
    const physicalCode = payload.boucle_numero || payload.qr_code || existing.boucle_numero || existing.qr_code || defaultPhysicalCode(species, normalizedRows);
    const entryDate = payload.date_entree_ferme || payload.date_achat || existing.date_entree_ferme || today();
    const textHistory = payload.poids_history_text;
    const documentsText = payload.documents_text;
    const current = toNumber(payload.poids ?? payload.poids_actuel ?? existing.poids ?? existing.poids_actuel ?? payload.poids_entree);
    const entryWeight = toNumber(payload.poids_entree ?? existing.poids_entree ?? payload.poids);
    const targetWeight = toNumber(payload.poids_cible ?? existing.poids_cible) || suggestedTargetWeight(species, entryWeight);
    const history = textHistory ? parseHistory(textHistory) : parseHistory(existing.poids_history);
    const documents = documentsText ? parseDocuments(documentsText) : parseDocuments(existing.documents || existing.docs || existing.pieces_jointes);
    const lastWeighing = payload.date_derniere_pesee || existing.date_derniere_pesee || entryDate;
    if (current > 0 && lastWeighing && !history.some((h) => h.date === lastWeighing && Math.round(h.poids * 10) === Math.round(current * 10))) history.push({ date: lastWeighing, poids: current, note: existing.id ? 'Nouvelle pesée' : 'Première pesée' });
    const nextWeighing = ['vendu', 'mort', 'perdu', 'vole', 'volé', 'sorti'].includes(clean(payload.status || payload.statut || existing.status || existing.statut)) ? '' : addDays(lastWeighing, 15);
    return applyAnimalDecisionDefaults({
      ...existing,
      ...payload,
      id: payload.id || existing.id || physicalCode,
      tag: physicalCode,
      boucle_numero: physicalCode,
      qr_code: payload.qr_code || physicalCode,
      type: species,
      espece: species,
      categorie: species,
      race: payload.race || existing.race || '',
      origine: payload.origine || existing.origine || existing.fournisseur_vendeur || payload.mode_acquisition || existing.mode_acquisition || '',
      localisation: payload.localisation || existing.localisation || existing.emplacement || '',
      health_status: payload.health_status || payload.sante || existing.health_status || 'sain',
      status: payload.status || payload.statut || existing.status || 'actif',
      date_entree_ferme: entryDate,
      date_poids_entree: payload.date_poids_entree || existing.date_poids_entree || entryDate,
      date_derniere_pesee: lastWeighing,
      prochaine_pesee: nextWeighing,
      rappel_pesee: nextWeighing ? addDays(nextWeighing, -1) : '',
      poids_entree: entryWeight,
      poids: current,
      poids_actuel: current,
      poids_cible: targetWeight,
      poids_history: history,
      documents,
      pieces_jointes: documents,
      purchase_cost: toNumber(payload.purchase_cost ?? payload.prix_achat ?? existing.purchase_cost),
      prix_vente_estime: toNumber(payload.prix_vente_estime ?? existing.prix_vente_estime),
    }, existing);
  };
  const submitCreate = async (payload) => { try { setSaving(true); await onCreate?.(prepare(payload)); await onRefresh?.(); toast.success(`${species} ajouté`); setModal(null); } catch (error) { toast.error(error.message || 'Création impossible'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; if (isLocked(selected)) return toast.error('Fiche verrouillée : animal vendu/perdu/mort'); try { setSaving(true); await onUpdate?.(selected.id, prepare(payload, selected)); await onRefresh?.(); toast.success(`${species} modifié`); setModal(null); } catch (error) { toast.error(error.message || 'Modification impossible'); } finally { setSaving(false); } };
  const submitDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete?.(selected.id); await onRefresh?.(); toast.success(`${species} supprimé`); setModal(null); } catch (error) { toast.error(error.message || 'Suppression impossible'); } finally { setSaving(false); } };
  const exportRows = () => { const exportable = filtered.map((row) => { const g = growthInfo(row); const costs = costBreakdown(row, { alimentationLogs, vaccins, businessEvents, salesOrders, payments, transactions }); return { ...row, poids_actuel_calcule: g.current, poids_cible_calcule: g.target, prochaine_pesee_calculee: g.nextWeighing, rappel_pesee_calcule: g.reminderDate, cout_total_calcule: costs.total, finance_liee_calculee: costs.finance, vente_calculee: costs.sale, paye_calcule: costs.paid, reste_a_encaisser_calcule: costs.remaining, marge_calculee: costs.marge }; }); exportToCsv({ rows: exportable, fileName: `animaux-${species}.csv` }); exportToExcel({ rows: exportable, fileName: `animaux-${species}.xlsx`, sheetName: species }); exportToPdf({ rows: exportable, title: `Liste ${speciesPlural(species)}`, fileName: `animaux-${species}.pdf` }); toast.success('Exports générés'); };
  return <div className="space-y-6"><SectionHeader title={`Gestion des ${speciesPlural(species)}`} sub="Fiches animaux : identité, pesées J+15/J-1, coûts, santé, Finance, vente liée et marge." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {species}</Btn></>} /><AnimalHealthBridge rows={normalizedRows} alimentationLogs={alimentationLogs} vaccins={vaccins} onUpdate={onUpdate} onRefresh={onRefresh} /><div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><button onClick={() => setFilter('actifs')}><KpiCard icon={CheckCircle} label="Actifs" value={summary.active.length} color="bg-emerald-500/20 text-emerald-400" /></button><button onClick={() => setFilter('prets')}><KpiCard icon={CheckCircle} label="Prêts vente" value={summary.ready.length} color="bg-amber-500/20 text-amber-500" /></button><button onClick={() => setFilter('retard')}><KpiCard icon={AlertTriangle} label="Pesées en retard" value={summary.late.length} color="bg-red-500/20 text-red-500" /></button><button onClick={() => setFilter('vendus')}><KpiCard icon={Lock} label="Vendus/verrouillés" value={summary.sold.length} color="bg-sky-500/20 text-sky-500" /></button><button onClick={() => setFilter('surveillance')}><KpiCard icon={AlertTriangle} label="À surveiller" value={summary.sick.length} color="bg-red-500/20 text-red-500" /></button></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><MiniMetric label="Coût total cheptel" value={fmtCurrency(summary.invested)} /><MiniMetric label="Revenus liés/estimés" value={fmtCurrency(summary.revenue)} /><MiniMetric label="Marge suivie" value={fmtCurrency(summary.margin)} danger={summary.margin < 0} /><MiniMetric label="Poids moyen" value={`${summary.avgWeight.toFixed(1)} kg`} /></div><div className="flex flex-wrap gap-2">{['tous', 'actifs', 'prets', 'retard', 'vendus', 'surveillance'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`px-3 py-2 rounded-lg text-sm capitalize ${filter === item ? 'bg-[#2f2415] text-white font-semibold' : 'bg-white border border-[#d6c3a0] text-[#8a7456]'}`}>{item === 'prets' ? 'prêts vente' : item}</button>)}</div><div className="rounded-3xl border border-[#d6c3a0] bg-white overflow-hidden"><div className="px-5 py-4 border-b border-[#eadcc2]"><p className="font-black text-[#2f2415]">Liste {speciesPlural(species)}</p><p className="text-sm text-[#8a7456]">Les infos importantes sont visibles ici. La courbe complète est dans la fiche.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#fffdf8] text-xs uppercase tracking-wide text-[#8a7456]"><tr><th className="px-4 py-3 text-left">Animal</th><th className="px-4 py-3 text-left">Poids</th><th className="px-4 py-3 text-left">Objectif</th><th className="px-4 py-3 text-left">Progression</th><th className="px-4 py-3 text-left">Pesée</th><th className="px-4 py-3 text-left">Santé</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-right">Coût / marge</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map((row) => { const g = growthInfo(row); const costs = costBreakdown(row, { alimentationLogs, vaccins, businessEvents, salesOrders, payments, transactions }); return <tr key={row.id} className="border-t border-[#eadcc2] hover:bg-[#fffdf8]"><td className="px-4 py-3"><div className="flex items-center gap-2"><QrCode size={14} className="text-emerald-700" /><div><p className="font-black text-[#2f2415]">{row.name || row.nom || physicalIdOf(row)}</p><p className="text-xs text-[#8a7456]">{physicalIdOf(row)} · {species}</p></div></div></td><td className="px-4 py-3 font-black text-[#2f2415]">{fmtNumber(g.current)} kg</td><td className="px-4 py-3 text-[#7d6a4a]">{g.target ? `${fmtNumber(g.target)} kg` : 'À renseigner'}</td><td className="px-4 py-3"><ProgressBar value={g.progress} /></td><td className="px-4 py-3"><p className={g.weighingStatus === 'retard' ? 'font-black text-red-600' : 'text-[#7d6a4a]'}>{g.nextWeighing || '—'}</p><p className="text-xs text-amber-700">Rappel {g.reminderDate || '—'}</p></td><td className="px-4 py-3 text-[#7d6a4a]">{healthOf(row)}</td><td className="px-4 py-3">{isLocked(row) ? <span className="inline-flex items-center gap-1 text-slate-700 font-bold"><Lock size={13} /> {statusOf(row)}</span> : statusBadge(g.status)}</td><td className="px-4 py-3 text-right"><p className="font-bold text-[#2f2415]">{fmtCurrency(costs.total)}</p><p className={`text-xs font-black ${costs.marge >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtCurrency(costs.marge)}</p>{costs.finance > 0 ? <p className="text-[11px] text-[#8a7456]">Finance {fmtCurrency(costs.finance)}</p> : null}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} />{!isLocked(row) ? <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /> : null}<ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div></td></tr>; })}{!filtered.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-[#8a7456]">Aucun animal pour ce filtre.</td></tr> : null}</tbody></table></div></div><AnimalDetailModal open={modal === 'details'} onClose={() => setModal(null)} animal={selected} alimentationLogs={alimentationLogs} vaccins={vaccins} businessEvents={businessEvents} salesOrders={salesOrders} payments={payments} transactions={transactions} /><CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={createFields} initialValues={initialValues} deriveValues={deriveCreateValues} loading={saving} title={`Ajouter ${species}`} submitLabel="Ajouter" /><EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={editFields} initialValues={selected ? { ...selected, poids_history_text: parseHistory(selected.poids_history || selected.weight_history || selected.historique_poids).map((p) => `${p.date} | ${p.poids}${p.note ? ` | ${p.note}` : ''}`).join('\n') } : {}} loading={saving} title={`Modifier ${species}`} submitLabel="Enregistrer" /><DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? selected.name || selected.nom || selected.id : ''} loading={saving} /></div>;
}
