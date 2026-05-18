import { AlertTriangle, CheckCircle, Download, Edit, Eye, LineChart, Plus, QrCode, RefreshCw, Trash2 } from 'lucide-react';
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
import AnimalHealthBridge from './AnimalHealthBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (date, days) => { const d = new Date(date || today()); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const speciesPlural = (species = 'Bovin') => `${species}s`;
const statusOf = (row = {}) => row.status || row.statut || 'actif';
const healthOf = (row = {}) => row.health_status || row.sante || row.status_sante || 'sain';
const purchaseCost = (row = {}) => toNumber(row.purchase_cost ?? row.cout_achat ?? row.prix_achat);
const salePrice = (row = {}) => toNumber(row.sale_price ?? row.prix_vente_reel ?? row.prix_vente_estime);
const weightOf = (row = {}) => toNumber(row.poids_actuel ?? row.poids ?? row.weight);
const entryWeightOf = (row = {}) => toNumber(row.poids_entree ?? row.weight_entry ?? row.poids_initial);
const targetWeightOf = (row = {}) => toNumber(row.poids_cible ?? row.poids_objectif ?? row.target_weight ?? row.objectif_poids);
const physicalIdOf = (row = {}) => row.boucle_numero || row.qr_code || row.tag || row.id;
const qrOf = (row = {}) => row.qr_code || row.boucle_numero || row.tag || row.id;
const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b || today()) - new Date(a || today())) / 86400000) || 1);
const clean = (value) => String(value || '').trim().toLowerCase();

function parseHistory(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => ({ date: x.date || x.date_pesee || x.weighed_at, poids: toNumber(x.poids || x.weight), note: x.note || '' })).filter((x) => x.date && x.poids > 0);
  if (typeof raw === 'string') {
    try { return parseHistory(JSON.parse(raw)); } catch {
      return raw.split('\n').map((line) => {
        const [date, poids, ...rest] = line.split('|').map((p) => p.trim());
        return { date, poids: toNumber(poids), note: rest.join(' | ') };
      }).filter((x) => x.date && x.poids > 0);
    }
  }
  return [];
}

function growthInfo(row = {}) {
  const history = parseHistory(row.poids_history || row.weight_history || row.historique_poids);
  const entryDate = row.date_poids_entree || row.date_entree_ferme || row.date_achat || today();
  const lastDate = row.date_derniere_pesee || today();
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
  const gainDay = first && last ? gain / daysBetween(first.date, last.date) : 0;
  const status = statusOf(row) === 'vendu' ? 'vendu' : progress >= 100 || row.ready_to_sell ? 'pret' : progress >= 90 ? 'presque' : progress > 0 && progress < 75 ? 'retard' : 'normal';
  const decision = status === 'vendu' ? 'Déjà vendu' : status === 'pret' ? 'Créer / exécuter opportunité de vente' : status === 'presque' ? 'Peser puis vendre si marge OK' : status === 'retard' ? 'Revoir ration, santé et coût journalier' : 'Continuer le suivi normal';
  const nextWeighing = statusOf(row) === 'vendu' || statusOf(row) === 'mort' ? '' : addDays(lastDate, 15);
  const reminderDate = nextWeighing ? addDays(nextWeighing, -1) : '';
  return { history, current, target, progress, gain, gainDay, status, decision, lastDate, nextWeighing, reminderDate };
}

function costBreakdown(row = {}, { alimentationLogs = [], vaccins = [], businessEvents = [] } = {}) {
  const id = String(row.id || '');
  const code = String(physicalIdOf(row) || '');
  const matches = (item = {}) => [item.animal_id, item.source_id, item.related_id, item.cible_id, item.target_id, item.boucle_numero, item.qr_code, item.tag].some((v) => String(v || '') === id || String(v || '') === code);
  const achat = purchaseCost(row);
  const alimentationDirecte = toNumber(row.alimentation ?? row.cout_alimentation ?? row.feed_cost ?? row.cout_nourriture);
  const alimentationLiee = alimentationLogs.filter(matches).reduce((sum, item) => sum + toNumber(item.cout ?? item.montant ?? item.amount ?? item.total ?? item.cout_total), 0);
  const santeDirecte = toNumber(row.sante ?? row.cout_sante ?? row.health_cost ?? row.vet_cost);
  const santeLiee = vaccins.filter(matches).reduce((sum, item) => sum + toNumber(item.cout ?? item.montant ?? item.amount ?? item.total ?? item.cout_sante), 0);
  const autresDirects = toNumber(row.autres_frais ?? row.frais_directs ?? row.other_costs ?? row.direct_costs);
  const events = businessEvents.filter((event) => matches(event) || clean(`${event.module || ''} ${event.source_type || ''} ${event.description || ''}`).includes('animal'));
  const evenements = events.reduce((sum, event) => sum + toNumber(event.montant ?? event.amount ?? event.valeur_perte_estimee ?? 0), 0);
  const alimentation = alimentationDirecte + alimentationLiee;
  const sante = santeDirecte + santeLiee;
  const totalDirect = toNumber(row.cout_total ?? row.total_cost ?? row.cost_total);
  const totalCalc = achat + alimentation + sante + autresDirects + evenements;
  const total = totalDirect > 0 ? Math.max(totalDirect, totalCalc) : totalCalc;
  const sale = salePrice(row) || toNumber(row.prix_vente_estime);
  return { achat, alimentation, sante, autres: autresDirects, evenements, total, sale, marge: sale - total };
}

function statusBadge(status) {
  const map = { vendu: 'bg-slate-50 text-slate-700 border-slate-200', pret: 'bg-emerald-50 text-emerald-700 border-emerald-200', presque: 'bg-amber-50 text-amber-700 border-amber-200', retard: 'bg-red-50 text-red-700 border-red-200', normal: 'bg-sky-50 text-sky-700 border-sky-200' };
  const label = { vendu: 'Vendu', pret: 'Prêt vente', presque: 'Presque prêt', retard: 'En retard', normal: 'Normal' }[status] || status;
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${map[status] || map.normal}`}>{label}</span>;
}

function defaultPhysicalCode(species, rows = []) {
  const prefix = species === 'Bovin' ? 'BOV' : species === 'Ovin' ? 'OVI' : species === 'Caprin' ? 'CAP' : 'ANI';
  const max = rows.reduce((acc, row) => {
    const raw = String(row.boucle_numero || row.qr_code || row.tag || row.id || '');
    const match = raw.match(new RegExp(`^${prefix}(\\d+)`, 'i'));
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function buildCreateFields(species) {
  return [
    { key: 'id', label: 'ID animal', type: 'text', required: true },
    { key: 'boucle_numero', label: `N° boucle terrain`, type: 'text', required: true },
    { key: 'qr_code', label: 'Code QR / scan', type: 'text' },
    { key: 'name', label: 'Nom / repère', type: 'text' },
    { key: 'sexe', label: 'Sexe', type: 'select', options: [{ value: 'F', label: 'Femelle' }, { value: 'M', label: 'Mâle' }] },
    { key: 'mode_acquisition', label: 'Mode acquisition', type: 'select', options: [{ value: 'achat', label: 'Achat' }, { value: 'naissance_ferme', label: 'Naissance ferme' }, { value: 'don', label: 'Don / autre' }] },
    { key: 'date_entree_ferme', label: 'Date entrée ferme', type: 'date' },
    { key: 'date_achat', label: 'Date achat', type: 'date' },
    { key: 'poids_entree', label: 'Poids entrée ferme (kg)', type: 'number' },
    { key: 'poids', label: 'Poids actuel (kg)', type: 'number' },
    { key: 'poids_cible', label: 'Poids cible vente (kg)', type: 'number' },
    { key: 'purchase_cost', label: 'Prix achat', type: 'number' },
    { key: 'health_status', label: 'Santé', type: 'select', options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }] },
    { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, fullWidth: true },
  ];
}

const editFields = [
  { key: 'section_growth', label: 'Suivi croissance', type: 'section', description: 'Format historique : 2026-02-08 | 285 | entrée ferme' },
  { key: 'poids', label: 'Poids actuel / dernière pesée (kg)', type: 'number' },
  { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date' },
  { key: 'poids_cible', label: 'Poids cible vente (kg)', type: 'number' },
  { key: 'poids_history_text', label: 'Historique pesées', type: 'textarea', rows: 5, fullWidth: true },
  { key: 'section_status', label: 'Statut', type: 'section' },
  { key: 'status', label: 'Statut vente / présence', type: 'select', options: [{ value: 'actif', label: 'Actif' }, { value: 'pret_a_la_vente', label: 'Prêt à vendre' }, { value: 'vendu', label: 'Vendu' }, { value: 'mort', label: 'Mort' }, { value: 'vole', label: 'Volé' }] },
  { key: 'health_status', label: 'Santé', type: 'select', options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }, { value: 'sous_traitement', label: 'Sous traitement' }] },
  { key: 'prix_vente_estime', label: 'Prix vente estimé', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, fullWidth: true },
];

function MiniMetric({ label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-white'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  return <div className="min-w-[120px]"><div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full rounded-full bg-[#2f2415]" style={{ width: `${pct}%` }} /></div><p className="mt-1 text-xs font-bold text-[#2f2415]">{Math.round(value || 0)}%</p></div>;
}

function WeightCurve({ history = [], target = 0 }) {
  const points = history.filter((p) => p.poids > 0);
  if (points.length < 2) return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">Ajoute au moins deux pesées pour afficher une courbe.</div>;
  const values = points.map((p) => p.poids).concat(target ? [target] : []);
  const min = Math.min(...values) * 0.96;
  const max = Math.max(...values) * 1.04;
  const w = 640; const h = 220; const pad = 32;
  const x = (i) => pad + (i * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p.poids)}`).join(' ');
  const targetY = target ? y(target) : null;
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><p className="font-black text-[#2f2415] flex items-center gap-2 mb-3"><LineChart size={16} /> Courbe d’évolution du poids</p><svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56"><line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#eadcc2" /><line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#eadcc2" />{targetY ? <line x1={pad} y1={targetY} x2={w - pad} y2={targetY} stroke="#c9a96a" strokeDasharray="6 6" /> : null}<path d={d} fill="none" stroke="#2f2415" strokeWidth="4" strokeLinecap="round" />{points.map((p, i) => <g key={`${p.date}-${i}`}><circle cx={x(i)} cy={y(p.poids)} r="5" fill="#2f2415" /><text x={x(i)} y={y(p.poids) - 10} textAnchor="middle" fontSize="12" fill="#2f2415">{p.poids}kg</text><text x={x(i)} y={h - 10} textAnchor="middle" fontSize="11" fill="#8a7456">{String(p.date).slice(5)}</text></g>)}</svg></div>;
}

function AnimalDetailModal({ open, onClose, animal, alimentationLogs = [], vaccins = [], businessEvents = [] }) {
  if (!animal) return null;
  const g = growthInfo(animal);
  const costs = costBreakdown(animal, { alimentationLogs, vaccins, businessEvents });
  return <BaseModal open={open} onClose={onClose} title={`Fiche ${animal.type || animal.espece || 'animal'} - ${physicalIdOf(animal)}`} size="5xl"><div className="space-y-5"><div className="rounded-3xl bg-[#2f2415] text-white p-5"><p className="text-xs uppercase tracking-widest text-[#c9a96a]">{animal.type || animal.espece} · {animal.sexe === 'M' ? 'Mâle' : 'Femelle'}</p><h2 className="text-2xl font-black mt-1">{animal.name || animal.nom || physicalIdOf(animal)}</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">{[['Poids actuel', `${fmtNumber(g.current)} kg`], ['Objectif', g.target ? `${fmtNumber(g.target)} kg` : '—'], ['Progression', `${g.progress}%`], ['Prochaine pesée', g.nextWeighing || '—'], ['Rappel J-1', g.reminderDate || '—']].map(([label, value]) => <div key={label} className="rounded-2xl bg-white/10 border border-white/10 p-3"><p className="text-xs text-[#f4e6c8]">{label}</p><p className="font-black text-white mt-1">{value}</p></div>)}</div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2"><WeightCurve history={g.history} target={g.target} /></div><div className="space-y-3"><MiniMetric label="Gain total" value={g.gain ? `${g.gain.toFixed(1)} kg` : 'À compléter'} /><MiniMetric label="Gain moyen / jour" value={g.gainDay ? `${g.gainDay.toFixed(2)} kg/j` : 'À compléter'} /><MiniMetric label="Santé" value={healthOf(animal)} /><MiniMetric label="Décision" value={g.decision} /></div></div><div className="rounded-2xl border border-red-200 bg-red-50 p-4"><p className="font-black text-red-800 mb-1">Coûts liés et marge</p><p className="text-sm text-red-700 mb-3">Achat, alimentation, santé, frais directs et événements métier reliés à cette fiche.</p><div className="grid grid-cols-2 lg:grid-cols-4 gap-2">{[['Achat', costs.achat], ['Alimentation', costs.alimentation], ['Santé', costs.sante], ['Autres frais', costs.autres], ['Événements', costs.evenements], ['Coût total', costs.total], ['Vente/estimé', costs.sale], ['Marge', costs.marge]].map(([label, value]) => <div key={label} className="rounded-xl bg-white border border-red-100 p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className={`font-black mt-1 ${label === 'Marge' && value < 0 ? 'text-red-600' : 'text-[#2f2415]'}`}>{fmtCurrency(value || 0)}</p></div>)}</div></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415] mb-2">Historique des pesées</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2">{g.history.map((p, i) => <div key={`${p.date}-${i}`} className="rounded-xl bg-white border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">{p.date}</p><p className="font-black text-[#2f2415]">{p.poids} kg</p><p className="text-xs text-[#8a7456]">{p.note || 'Pesée'}</p></div>)}</div></div></div></BaseModal>;
}

export default function AnimauxSpeciesFocused({ species = 'Bovin', rows = [], alimentationLogs = [], vaccins = [], businessEvents = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('tous');

  const createFields = useMemo(() => buildCreateFields(species), [species]);
  const normalizedRows = useMemo(() => rows.map((row) => ({ ...row, type: row.type || species, espece: row.espece || species })), [rows, species]);
  const filtered = useMemo(() => normalizedRows.filter((row) => {
    const g = growthInfo(row);
    if (filter === 'tous') return true;
    if (filter === 'actifs') return isActiveAnimalForFeeding(row);
    if (filter === 'prets') return g.status === 'pret';
    if (filter === 'retard') return g.status === 'retard';
    if (filter === 'vendus') return statusOf(row) === 'vendu';
    if (filter === 'surveillance') return ['malade', 'sous_traitement', 'blesse', 'blessé', 'a_surveiller'].includes(healthOf(row));
    return true;
  }), [normalizedRows, filter]);

  const summary = useMemo(() => {
    const active = normalizedRows.filter((row) => isActiveAnimalForFeeding(row));
    const ready = normalizedRows.filter((row) => growthInfo(row).status === 'pret');
    const late = normalizedRows.filter((row) => growthInfo(row).status === 'retard');
    const sold = normalizedRows.filter((row) => statusOf(row) === 'vendu');
    const sick = normalizedRows.filter((row) => ['malade', 'sous_traitement', 'blesse', 'blessé', 'a_surveiller'].includes(healthOf(row)));
    const invested = normalizedRows.reduce((sum, row) => sum + costBreakdown(row, { alimentationLogs, vaccins, businessEvents }).total, 0);
    const revenue = normalizedRows.reduce((sum, row) => sum + salePrice(row), 0);
    const avgWeight = active.length ? active.reduce((sum, row) => sum + weightOf(row), 0) / active.length : 0;
    return { active, ready, late, sold, sick, invested, revenue, margin: revenue - invested, avgWeight };
  }, [normalizedRows, alimentationLogs, vaccins, businessEvents]);

  const initialValues = useMemo(() => {
    const physicalCode = defaultPhysicalCode(species, normalizedRows);
    const date = today();
    return applyAnimalDecisionDefaults({ id: physicalCode || generateSequentialId('animaux', normalizedRows, { type: species }), tag: physicalCode, boucle_numero: physicalCode, qr_code: physicalCode, type: species, espece: species, status: 'actif', health_status: 'sain', mode_acquisition: 'achat', date_achat: date, date_entree_ferme: date, date_poids_entree: date, date_derniere_pesee: date, sexe: 'F', poids_entree: 0, poids: 0 });
  }, [normalizedRows, species]);

  const prepare = (payload = {}, existing = {}) => {
    const physicalCode = payload.boucle_numero || payload.qr_code || existing.boucle_numero || existing.qr_code || defaultPhysicalCode(species, normalizedRows);
    const entryDate = payload.date_entree_ferme || payload.date_achat || existing.date_entree_ferme || today();
    const textHistory = payload.poids_history_text;
    const current = toNumber(payload.poids ?? payload.poids_actuel ?? existing.poids ?? existing.poids_actuel ?? payload.poids_entree);
    const history = textHistory ? parseHistory(textHistory) : parseHistory(existing.poids_history);
    if (current > 0 && payload.date_derniere_pesee && !history.some((h) => h.date === payload.date_derniere_pesee && Math.round(h.poids * 10) === Math.round(current * 10))) history.push({ date: payload.date_derniere_pesee, poids: current, note: 'Nouvelle pesée' });
    const lastWeighing = payload.date_derniere_pesee || existing.date_derniere_pesee || entryDate;
    const nextWeighing = ['vendu', 'mort'].includes(clean(payload.status || payload.statut || existing.status || existing.statut)) ? '' : addDays(lastWeighing, 15);
    return applyAnimalDecisionDefaults({ ...existing, ...payload, id: payload.id || existing.id || physicalCode, tag: physicalCode, boucle_numero: physicalCode, qr_code: payload.qr_code || physicalCode, type: species, espece: species, categorie: species, health_status: payload.health_status || payload.sante || existing.health_status || 'sain', status: payload.status || payload.statut || existing.status || 'actif', date_entree_ferme: entryDate, date_poids_entree: payload.date_poids_entree || existing.date_poids_entree || entryDate, date_derniere_pesee: lastWeighing, prochaine_pesee: nextWeighing, rappel_pesee: nextWeighing ? addDays(nextWeighing, -1) : '', poids_entree: toNumber(payload.poids_entree ?? existing.poids_entree ?? payload.poids), poids: current, poids_actuel: current, poids_history: history, purchase_cost: toNumber(payload.purchase_cost ?? payload.prix_achat ?? existing.purchase_cost) }, existing);
  };

  const submitCreate = async (payload) => { try { setSaving(true); await onCreate?.(prepare(payload)); await onRefresh?.(); toast.success(`${species} ajouté`); setModal(null); } catch (error) { toast.error(error.message || 'Création impossible'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate?.(selected.id, prepare(payload, selected)); await onRefresh?.(); toast.success(`${species} modifié`); setModal(null); } catch (error) { toast.error(error.message || 'Modification impossible'); } finally { setSaving(false); } };
  const submitDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete?.(selected.id); await onRefresh?.(); toast.success(`${species} supprimé`); setModal(null); } catch (error) { toast.error(error.message || 'Suppression impossible'); } finally { setSaving(false); } };
  const exportRows = () => { exportToCsv({ rows: filtered, fileName: `animaux-${species}.csv` }); exportToExcel({ rows: filtered, fileName: `animaux-${species}.xlsx`, sheetName: species }); exportToPdf({ rows: filtered, title: `Liste ${speciesPlural(species)}`, fileName: `animaux-${species}.pdf` }); toast.success('Exports générés'); };

  return <div className="space-y-6">
    <SectionHeader title={`Gestion des ${speciesPlural(species)}`} sub="Vue simplifiée : poids, objectif, progression, décision, santé, vente et marge." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {species}</Btn></>} />
    <AnimalHealthBridge rows={normalizedRows} alimentationLogs={alimentationLogs} vaccins={vaccins} onUpdate={onUpdate} onRefresh={onRefresh} />

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <button onClick={() => setFilter('actifs')}><KpiCard icon={CheckCircle} label="Actifs" value={summary.active.length} color="bg-emerald-500/20 text-emerald-400" /></button>
      <button onClick={() => setFilter('prets')}><KpiCard icon={CheckCircle} label="Prêts vente" value={summary.ready.length} color="bg-amber-500/20 text-amber-500" /></button>
      <button onClick={() => setFilter('retard')}><KpiCard icon={AlertTriangle} label="En retard" value={summary.late.length} color="bg-red-500/20 text-red-500" /></button>
      <button onClick={() => setFilter('vendus')}><KpiCard icon={CheckCircle} label="Vendus" value={summary.sold.length} color="bg-sky-500/20 text-sky-500" /></button>
      <button onClick={() => setFilter('surveillance')}><KpiCard icon={AlertTriangle} label="À surveiller" value={summary.sick.length} color="bg-red-500/20 text-red-500" /></button>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><MiniMetric label="Coût total cheptel" value={fmtCurrency(summary.invested)} /><MiniMetric label="Revenus saisis" value={fmtCurrency(summary.revenue)} /><MiniMetric label="Marge suivie" value={fmtCurrency(summary.margin)} danger={summary.margin < 0} /><MiniMetric label="Poids moyen" value={`${summary.avgWeight.toFixed(1)} kg`} /></div>

    <div className="flex flex-wrap gap-2">{['tous', 'actifs', 'prets', 'retard', 'vendus', 'surveillance'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`px-3 py-2 rounded-lg text-sm capitalize ${filter === item ? 'bg-[#2f2415] text-white font-semibold' : 'bg-white border border-[#d6c3a0] text-[#8a7456]'}`}>{item === 'prets' ? 'prêts vente' : item}</button>)}</div>

    <div className="rounded-3xl border border-[#d6c3a0] bg-white overflow-hidden"><div className="px-5 py-4 border-b border-[#eadcc2]"><p className="font-black text-[#2f2415]">Liste {speciesPlural(species)}</p><p className="text-sm text-[#8a7456]">Les infos importantes sont visibles ici. La courbe est dans la fiche.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#fffdf8] text-xs uppercase tracking-wide text-[#8a7456]"><tr><th className="px-4 py-3 text-left">Animal</th><th className="px-4 py-3 text-left">Poids</th><th className="px-4 py-3 text-left">Objectif</th><th className="px-4 py-3 text-left">Progression</th><th className="px-4 py-3 text-left">Décision</th><th className="px-4 py-3 text-left">Santé</th><th className="px-4 py-3 text-left">Statut</th><th className="px-4 py-3 text-right">Coût / marge</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map((row) => { const g = growthInfo(row); const costs = costBreakdown(row, { alimentationLogs, vaccins, businessEvents }); return <tr key={row.id} className="border-t border-[#eadcc2] hover:bg-[#fffdf8]"><td className="px-4 py-3"><div className="flex items-center gap-2"><QrCode size={14} className="text-emerald-700" /><div><p className="font-black text-[#2f2415]">{row.name || row.nom || physicalIdOf(row)}</p><p className="text-xs text-[#8a7456]">{physicalIdOf(row)} · {species}</p></div></div></td><td className="px-4 py-3 font-black text-[#2f2415]">{fmtNumber(g.current)} kg</td><td className="px-4 py-3 text-[#7d6a4a]">{g.target ? `${fmtNumber(g.target)} kg` : '—'}</td><td className="px-4 py-3"><ProgressBar value={g.progress} /></td><td className="px-4 py-3">{statusBadge(g.status)}<p className="mt-1 text-xs text-[#8a7456]">{g.decision}</p><p className="mt-1 text-xs text-amber-700">Pesée {g.nextWeighing || '—'} · rappel {g.reminderDate || '—'}</p></td><td className="px-4 py-3 text-[#7d6a4a]">{healthOf(row)}</td><td className="px-4 py-3 text-[#7d6a4a]">{statusOf(row)}</td><td className="px-4 py-3 text-right"><p className="font-bold text-[#2f2415]">{fmtCurrency(costs.total)}</p><p className={`text-xs font-black ${costs.marge >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtCurrency(costs.marge)}</p></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div></td></tr>; })}{!filtered.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-[#8a7456]">Aucun animal pour ce filtre.</td></tr> : null}</tbody></table></div></div>

    <AnimalDetailModal open={modal === 'details'} onClose={() => setModal(null)} animal={selected} alimentationLogs={alimentationLogs} vaccins={vaccins} businessEvents={businessEvents} />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={createFields} initialValues={initialValues} loading={saving} title={`Ajouter ${species}`} submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={editFields} initialValues={selected ? { ...selected, poids_history_text: parseHistory(selected.poids_history || selected.weight_history || selected.historique_poids).map((p) => `${p.date} | ${p.poids}${p.note ? ` | ${p.note}` : ''}`).join('\n') } : {}} loading={saving} title={`Modifier ${species}`} submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? selected.name || selected.nom || selected.id : ''} loading={saving} />
  </div>;
}
