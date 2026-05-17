import { AlertTriangle, CheckCircle, Download, Edit, Eye, LineChart, MessageCircle, Plus, RefreshCw, Tag, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import VoiceSearch from '../components/VoiceSearch';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import EditModal from '../modals/EditModal';
import BaseModal from '../modals/BaseModal';
import { enrichAnimalEntryPayload, buildInitialAnimalEntry, computeLivingAnimalGrowthTarget } from '../services/animalEntryDefaults';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import { getAnimalSaleReadiness, calculateAnimalSalePricing } from '../utils/animalSalePricing';
import { calculateAnimalMetrics } from '../utils/businessCalculations';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import { DEFAULT_PHONE } from '../utils/location';
import { mergeAnimalSeeds } from '../utils/mergeAnimalSeeds';
import AnimalHealthBridge from './AnimalHealthBridge.jsx';

const activityTabs = ['Bovin', 'Ovin', 'Caprin'];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const n = (value) => Number(value || 0);

const saleConfirmed = (animal = {}) => Boolean(animal.pret_vente_confirme || animal.ready_for_sale || animal.sale_ready || animal.pret_a_la_vente || animal.status === 'pret_a_la_vente');
const saleOpportunityKey = (animal = {}) => `animal:${animal.id}`;

function daysBetween(a, b) {
  const da = new Date(a || today());
  const db = new Date(b || today());
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return 0;
  return Math.max(0, Math.round((db - da) / 86400000));
}

function parseWeightHistory(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => ({ date: x.date || x.date_pesee || x.weighed_at, poids: n(x.poids || x.weight), note: x.note || '' })).filter((x) => x.date && x.poids > 0);
  if (typeof raw === 'string') {
    try { return parseWeightHistory(JSON.parse(raw)); } catch {
      return raw.split('\n').map((line) => {
        const [date, poids, ...rest] = line.split('|').map((v) => v.trim());
        return { date, poids: n(poids), note: rest.join(' | ') };
      }).filter((x) => x.date && x.poids > 0);
    }
  }
  return [];
}

function weightHistory(animal = {}) {
  const raw = animal.poids_history || animal.weight_history || animal.historique_poids;
  const list = parseWeightHistory(raw);
  const entryDate = animal.date_poids_entree || animal.date_entree_ferme || animal.date_achat || animal.created_at || today();
  const currentDate = animal.date_derniere_pesee || today();
  const entryWeight = n(animal.poids_entree || animal.poids_initial || animal.entry_weight);
  const currentWeight = n(animal.poids || animal.weight || animal.poids_actuel);
  if (entryWeight > 0 && !list.some((x) => x.date === entryDate)) list.unshift({ date: entryDate, poids: entryWeight, note: 'Entrée ferme' });
  if (currentWeight > 0 && !list.some((x) => x.date === currentDate && Math.round(x.poids * 10) === Math.round(currentWeight * 10))) list.push({ date: currentDate, poids: currentWeight, note: 'Dernière pesée' });
  return list.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function growthInfo(animal = {}) {
  const living = computeLivingAnimalGrowthTarget(animal);
  const history = weightHistory(animal);
  const first = history[0];
  const last = history[history.length - 1];
  const current = n(last?.poids || living.currentWeight || animal.poids);
  const target = n(animal.poids_cible || animal.poids_objectif || living.livingTarget || animal.target_weight);
  const progress = target > 0 ? Math.min(130, Math.round((current / target) * 100)) : n(living.progress || 0);
  const gain = first && last ? last.poids - first.poids : 0;
  const days = first && last ? Math.max(1, daysBetween(first.date, last.date)) : 0;
  const gainDay = days ? gain / days : n(living.realGainPerDay || 0);
  const status = saleConfirmed(animal) || animal.ready_to_sell || progress >= 100 ? 'pret_vente' : progress >= 90 ? 'presque_pret' : progress < 75 ? 'retard' : 'normal';
  const decision = status === 'pret_vente' ? 'Vendre / créer opportunité' : status === 'presque_pret' ? 'Peser puis vendre si marge OK' : status === 'retard' ? 'Revoir ration et santé' : 'Continuer le suivi';
  return { ...living, history, first, last, current, target, progress, gain, gainDay, status, decision };
}

function statusLabel(status) {
  if (status === 'pret_vente') return 'Prêt vente';
  if (status === 'presque_pret') return 'Presque prêt';
  if (status === 'retard') return 'En retard';
  return 'Normal';
}

function statusClass(status) {
  if (status === 'pret_vente') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'presque_pret') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (status === 'retard') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-sky-50 text-sky-700 border-sky-200';
}

function parseWeightHistoryText(text, currentWeight, currentDate) {
  const entries = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [date, poids, ...noteParts] = line.split('|').map((part) => part.trim());
    return { date, poids: Number(poids || 0), note: noteParts.join(' | ') };
  }).filter((entry) => entry.date && entry.poids > 0);
  if (Number(currentWeight || 0) > 0 && currentDate && !entries.some((entry) => entry.date === currentDate && Number(entry.poids) === Number(currentWeight))) entries.push({ date: currentDate, poids: Number(currentWeight), note: 'Poids actuel' });
  return entries;
}

function stringifyWeightHistory(animal = {}) {
  return weightHistory(animal).map((item) => `${item.date || ''} | ${item.poids || ''}${item.note ? ` | ${item.note}` : ''}`.trim()).join('\n');
}

function MiniMetric({ label, value, danger = false }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-lg font-black mt-1 ${danger ? 'text-red-500' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  return <div className="space-y-1"><div className="h-2 rounded-full bg-[#eadcc2] overflow-hidden"><div className="h-full rounded-full bg-[#2f2415]" style={{ width: `${pct}%` }} /></div><p className="text-xs font-bold text-[#2f2415]">{Math.round(value || 0)}%</p></div>;
}

function WeightCurve({ history = [], target = 0 }) {
  const points = history.filter((x) => x.poids > 0);
  if (points.length < 2) return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">Ajoute au moins deux pesées pour afficher une courbe.</div>;
  const values = points.map((x) => x.poids).concat(target > 0 ? [target] : []);
  const min = Math.min(...values) * 0.96;
  const max = Math.max(...values) * 1.04;
  const width = 640;
  const height = 220;
  const pad = 32;
  const x = (i) => pad + (i * (width - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v) => height - pad - ((v - min) / Math.max(1, max - min)) * (height - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.poids)}`).join(' ');
  const targetY = target > 0 ? y(target) : null;
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><div className="flex items-center justify-between mb-3"><p className="font-black text-[#2f2415] flex items-center gap-2"><LineChart size={16} /> Courbe de croissance</p><p className="text-xs text-[#8a7456]">{points.length} pesée(s)</p></div><svg viewBox={`0 0 ${width} ${height}`} className="w-full h-56"><line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#eadcc2" /><line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#eadcc2" />{targetY ? <line x1={pad} y1={targetY} x2={width - pad} y2={targetY} stroke="#c9a96a" strokeDasharray="6 6" /> : null}<path d={d} fill="none" stroke="#2f2415" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{points.map((p, i) => <g key={`${p.date}-${i}`}><circle cx={x(i)} cy={y(p.poids)} r="5" fill="#2f2415" /><text x={x(i)} y={y(p.poids) - 10} textAnchor="middle" fontSize="12" fill="#2f2415">{p.poids}kg</text><text x={x(i)} y={height - 10} textAnchor="middle" fontSize="11" fill="#8a7456">{String(p.date).slice(5)}</text></g>)}</svg></div>;
}

function AnimalDetails({ open, onClose, animal, metrics = {} }) {
  if (!animal) return null;
  const growth = growthInfo(animal);
  const pricing = calculateAnimalSalePricing({ animal, metrics });
  return <BaseModal open={open} onClose={onClose} title={`Fiche animal - ${animal.tag || animal.id}`} size="5xl"><div className="space-y-5"><div className="rounded-3xl bg-[#2f2415] text-white p-5"><p className="text-xs uppercase tracking-widest text-[#c9a96a]">{animal.type || 'Animal'} · {animal.sexe === 'M' ? 'Mâle' : 'Femelle'}</p><h2 className="text-2xl font-black mt-1">{animal.name || animal.tag || animal.id}</h2><div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4"><InfoDark label="Poids actuel" value={`${fmtNumber(growth.current)} kg`} /><InfoDark label="Objectif" value={growth.target ? `${fmtNumber(growth.target)} kg` : '—'} /><InfoDark label="Progression" value={`${growth.progress}%`} /><InfoDark label="Décision" value={growth.decision} /><InfoDark label="Vente estimée" value={fmtCurrency(pricing.recommendedSalePrice || animal.prix_vente_estime || animal.sale_price || 0)} /></div></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><div className="lg:col-span-2"><WeightCurve history={growth.history} target={growth.target} /></div><div className="space-y-3"><Info label="Statut croissance" value={statusLabel(growth.status)} /><Info label="Gain total" value={growth.gain ? `${growth.gain.toFixed(1)} kg` : 'À compléter'} /><Info label="Gain moyen / jour" value={growth.gainDay ? `${growth.gainDay.toFixed(2)} kg/j` : 'À compléter'} /><Info label="Santé" value={animal.health_status || 'sain'} /><Info label="Coût total" value={fmtCurrency(metrics.totalCost || animal.purchase_cost || 0)} /><Info label="Marge estimée" value={fmtCurrency((pricing.recommendedSalePrice || 0) - (metrics.totalCost || animal.purchase_cost || 0))} /></div></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415] mb-2">Historique des pesées</p><div className="grid grid-cols-1 md:grid-cols-3 gap-2">{growth.history.map((p, i) => <div key={`${p.date}-${i}`} className="rounded-xl bg-white border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">{p.date}</p><p className="font-black text-[#2f2415]">{p.poids} kg</p><p className="text-xs text-[#8a7456]">{p.note || 'Pesée'}</p></div>)}</div></div></div></BaseModal>;
}

function Info({ label, value }) { return <div className="rounded-2xl border border-[#eadcc2] bg-white p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] mt-1">{value || '—'}</p></div>; }
function InfoDark({ label, value }) { return <div className="rounded-2xl bg-white/10 border border-white/10 p-3"><p className="text-xs text-[#f4e6c8]">{label}</p><p className="font-black text-white mt-1">{value || '—'}</p></div>; }

const createFields = [
  { key: 'id', label: 'ID animal', type: 'text', required: true },
  { key: 'tag', label: 'Boucle / QR code', type: 'text' },
  { key: 'name', label: 'Nom / repère', type: 'text' },
  { key: 'type', label: 'Espèce', type: 'select', required: true, options: activityTabs.map((value) => ({ value, label: value })) },
  { key: 'sexe', label: 'Sexe', type: 'select', options: [{ value: 'F', label: 'Femelle' }, { value: 'M', label: 'Mâle' }] },
  { key: 'mode_acquisition', label: 'Mode acquisition', type: 'select', options: [{ value: 'achat', label: 'Achat' }, { value: 'naissance_ferme', label: 'Naissance ferme' }, { value: 'don', label: 'Don / autre' }] },
  { key: 'date_achat', label: 'Date achat', type: 'date' },
  { key: 'date_entree_ferme', label: 'Date entrée ferme', type: 'date' },
  { key: 'poids_entree', label: 'Poids entrée ferme (kg)', type: 'number' },
  { key: 'poids', label: 'Poids actuel (kg)', type: 'number' },
  { key: 'poids_cible', label: 'Poids cible vente (kg)', type: 'number' },
  { key: 'purchase_cost', label: 'Prix d’achat', type: 'number' },
  { key: 'health_status', label: 'Santé', type: 'select', options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }] },
  { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, fullWidth: true },
];

const editFields = [
  { key: 'section_growth', label: 'Suivi croissance', type: 'section', description: 'Ajoute les pesées ici. Format historique : date | poids | note.' },
  { key: 'poids', label: 'Poids actuel / dernière pesée (kg)', type: 'number' },
  { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date' },
  { key: 'poids_cible', label: 'Poids cible vente (kg)', type: 'number' },
  { key: 'poids_history_text', label: 'Historique pesées', type: 'textarea', rows: 5, fullWidth: true, placeholder: '2026-02-08 | 285 | entrée ferme\n2026-03-08 | 300 | pesée' },
  { key: 'section_sale', label: 'Vente', type: 'section' },
  { key: 'prix_vente_estime', label: 'Prix vente estimé', type: 'number' },
  { key: 'pret_vente_confirme', label: 'Prêt à vendre confirmé ?', type: 'checkbox' },
  { key: 'status', label: 'Statut', type: 'select', options: [{ value: 'actif', label: 'Actif' }, { value: 'pret_a_la_vente', label: 'Prêt à vendre' }, { value: 'vendu', label: 'Vendu' }, { value: 'mort', label: 'Mort' }, { value: 'vole', label: 'Volé' }] },
  { key: 'health_status', label: 'Santé', type: 'select', options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }, { value: 'sous_traitement', label: 'Sous traitement' }] },
  { key: 'notes', label: 'Notes', type: 'textarea', rows: 3, fullWidth: true },
];

export default function Animaux({ rows = [], alimentationLogs = [], vaccins = [], opportunities = [], loading, onCreate, onUpdate, onDelete, onRefresh, onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [activityType, setActivityType] = useState('Bovin');
  const [quickFilter, setQuickFilter] = useState('tous');
  const [localSearch, setLocalSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const testRows = useMemo(() => mergeAnimalSeeds(rows), [rows]);
  const activityRows = useMemo(() => testRows.filter((animal) => animal.type === activityType || animal.espece === activityType), [testRows, activityType]);
  const metricsFor = (animal) => calculateAnimalMetrics({ animal, animals: testRows, feedingLogs: alimentationLogs, vaccins });
  const pricingFor = (animal) => calculateAnimalSalePricing({ animal, metrics: metricsFor(animal) });
  const readinessFor = (animal) => getAnimalSaleReadiness({ animal, metrics: metricsFor(animal) });

  const initialAnimal = useMemo(() => buildInitialAnimalEntry({ id: generateSequentialId('animaux', testRows, { type: activityType }), type: activityType, date: today() }), [testRows, activityType]);

  const preparePayload = (payload) => {
    const currentWeight = n(payload.poids || payload.poids_entree);
    const lastWeightDate = payload.date_derniere_pesee || payload.date_entree_ferme || payload.date_achat || today();
    const history = parseWeightHistoryText(payload.poids_history_text, currentWeight, lastWeightDate);
    const base = enrichAnimalEntryPayload({ ...payload, type: payload.type || activityType, poids: currentWeight || null, poids_history: history, date_derniere_pesee: lastWeightDate, status: payload.status || 'actif' });
    const growth = growthInfo(base);
    const pricing = calculateAnimalSalePricing({ animal: base, metrics: metricsFor(base) });
    const confirmed = Boolean(payload.pret_vente_confirme) || payload.status === 'pret_a_la_vente';
    const { poids_history_text, ...clean } = base;
    return { ...clean, pret_vente_recommande: growth.status === 'pret_vente' || readinessFor(clean).recommended, pret_vente_confirme: confirmed, pret_a_la_vente: confirmed, ready_for_sale: confirmed, sale_ready: confirmed, sale_ready_confirmed_at: confirmed ? now() : '', prix_vente_estime_auto: Math.round(pricing.recommendedSalePrice || 0), prix_minimum_acceptable: Math.round(pricing.minimumAcceptablePrice || 0), marge_prevue: Math.round(pricing.expectedMargin || 0), sale_readiness_status: confirmed ? 'confirme' : growth.status, raison_pret_vente: confirmed ? 'Confirmé manuellement' : growth.decision, status: confirmed ? 'pret_a_la_vente' : (payload.status || clean.status || 'actif') };
  };

  const findExistingOpportunity = (animal) => opportunities.find((opp) => String(opp.source_module || '') === 'animaux' && String(opp.source_id || opp.related_id || '') === String(animal.id)) || opportunities.find((opp) => opp.opportunity_key === saleOpportunityKey(animal));
  const syncSaleOpportunity = async (animal) => {
    if (!saleConfirmed(animal) || !animal.id || !onCreateOpportunity) return;
    const pricing = pricingFor(animal);
    const payload = { opportunity_key: saleOpportunityKey(animal), source_module: 'animaux', source_type: 'animal', source_id: animal.id, related_id: animal.id, title: `Animal prêt à vendre: ${animal.name || animal.tag || animal.id}`, product_name: `${animal.name || animal.tag || animal.id} · ${animal.type || 'Animal'}`, quantity: 1, unit: 'tete', unit_price: Math.round(pricing.recommendedSalePrice || animal.prix_vente_estime_auto || animal.prix_vente_estime || animal.sale_price || 0), estimated_amount: Math.round(pricing.recommendedSalePrice || animal.prix_vente_estime_auto || animal.prix_vente_estime || animal.sale_price || 0), status: animal.status === 'vendu' ? 'fermee' : 'ouverte', statut: animal.status === 'vendu' ? 'fermee' : 'ouverte', priority: 'moyenne', notes: animal.raison_pret_vente || 'Prêt à la vente confirmé', created_from: 'animaux', updated_at: now() };
    const existing = findExistingOpportunity(animal);
    if (existing?.id && onUpdateOpportunity) await onUpdateOpportunity(existing.id, payload); else await onCreateOpportunity({ id: makeId('OPP'), ...payload, created_at: now() });
    await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existing?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, title: `Opportunité vente ${animal.name || animal.id}`, description: payload.product_name, event_date: today(), severity: 'info', saisies_evitees: 2 });
    await Promise.allSettled([onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
  };

  const filtered = useMemo(() => activityRows.filter((animal) => {
    const g = growthInfo(animal);
    const passQuick = quickFilter === 'tous' || (quickFilter === 'actifs' && isActiveAnimalForFeeding(animal)) || (quickFilter === 'prets' && g.status === 'pret_vente') || (quickFilter === 'retard' && g.status === 'retard') || (quickFilter === 'vendus' && animal.status === 'vendu') || (quickFilter === 'malades' && ['malade', 'sous_traitement', 'blesse', 'a_surveiller'].includes(animal.health_status));
    const q = localSearch.trim().toLowerCase();
    const passSearch = !q || String(animal.name || '').toLowerCase().includes(q) || String(animal.id || '').toLowerCase().includes(q) || String(animal.tag || '').toLowerCase().includes(q);
    return passQuick && passSearch;
  }), [activityRows, quickFilter, localSearch]);

  const summary = useMemo(() => {
    const active = activityRows.filter((a) => isActiveAnimalForFeeding(a));
    const ready = activityRows.filter((a) => growthInfo(a).status === 'pret_vente');
    const late = activityRows.filter((a) => growthInfo(a).status === 'retard');
    const sold = activityRows.filter((a) => a.status === 'vendu');
    const sick = activityRows.filter((a) => ['malade', 'sous_traitement', 'blesse', 'a_surveiller'].includes(a.health_status));
    const invested = activityRows.reduce((sum, a) => sum + metricsFor(a).totalCost, 0);
    const potential = active.reduce((sum, a) => sum + pricingFor(a).recommendedSalePrice, 0);
    const margin = active.reduce((sum, a) => sum + ((pricingFor(a).recommendedSalePrice || 0) - (metricsFor(a).totalCost || 0)), 0);
    const avgWeight = active.length ? active.reduce((sum, a) => sum + growthInfo(a).current, 0) / active.length : 0;
    return { active, ready, late, sold, sick, invested, potential, margin, avgWeight };
  }, [activityRows]);

  const buildModalValues = (animal = {}) => ({ ...animal, type: animal.type || activityType, poids_history_text: stringifyWeightHistory(animal), pret_vente_confirme: saleConfirmed(animal), poids_cible: animal.poids_cible || animal.poids_objectif || computeLivingAnimalGrowthTarget(animal).livingTarget || '' });

  const submitCreate = async (payload) => { try { setSaving(true); const prepared = preparePayload(payload); await onCreate(prepared); await syncSaleOpportunity(prepared); await onRefresh?.(); toast.success('Animal ajouté avec suivi simplifié'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur création'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); const prepared = preparePayload(payload); await onUpdate(selected.id, prepared); await syncSaleOpportunity({ ...prepared, id: selected.id }); await onRefresh?.(); toast.success('Animal modifié, courbe mise à jour'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur modification'); } finally { setSaving(false); } };
  const confirmDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete(selected.id); toast.success('Animal supprimé'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur suppression'); } finally { setSaving(false); } };
  const exportRows = () => { toast.success('Export disponible après stabilisation du tableau simplifié'); };
  const openWhatsApp = (animal) => window.open(toWhatsappLink(DEFAULT_PHONE, `Rapport animal ${animal.name || animal.id}`), '_blank', 'noopener,noreferrer');

  return <div className="space-y-6">
    <SectionHeader title="Animaux" sub="Lecture terrain simplifiée : poids, objectif, croissance, santé, vente et marge." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {activityType}</Btn></>} />
    <AnimalHealthBridge rows={activityRows} alimentationLogs={alimentationLogs} vaccins={vaccins} onUpdate={onUpdate} onRefresh={onRefresh} />

    <div className="grid grid-cols-3 gap-2">{activityTabs.map((tab) => <button key={tab} type="button" onClick={() => { setActivityType(tab); setQuickFilter('tous'); }} className={`rounded-2xl border px-4 py-3 text-left transition-all ${activityType === tab ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Espèce</p><p className="font-black">{tab}s</p><p className="text-xs opacity-75">{testRows.filter((a) => a.type === tab || a.espece === tab).length} animaux</p></button>)}</div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <button onClick={() => setQuickFilter('actifs')}><KpiCard icon={CheckCircle} label="Actifs" value={summary.active.length} color="bg-emerald-500/20 text-emerald-400" /></button>
      <button onClick={() => setQuickFilter('prets')}><KpiCard icon={Tag} label="Prêts vente" value={summary.ready.length} color="bg-amber-500/20 text-amber-400" /></button>
      <button onClick={() => setQuickFilter('retard')}><KpiCard icon={AlertTriangle} label="En retard" value={summary.late.length} color="bg-red-500/20 text-red-400" /></button>
      <button onClick={() => setQuickFilter('vendus')}><KpiCard icon={Tag} label="Vendus" value={summary.sold.length} color="bg-sky-500/20 text-sky-400" /></button>
      <button onClick={() => setQuickFilter('malades')}><KpiCard icon={XCircle} label="À surveiller" value={summary.sick.length} color="bg-red-500/20 text-red-400" /></button>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MiniMetric label="Coût total cheptel" value={fmtCurrency(summary.invested)} />
      <MiniMetric label="CA potentiel" value={fmtCurrency(summary.potential)} />
      <MiniMetric label="Marge estimée" value={fmtCurrency(summary.margin)} danger={summary.margin < 0} />
      <MiniMetric label="Poids moyen" value={`${summary.avgWeight.toFixed(1)} kg`} />
    </div>

    <div className="flex flex-wrap gap-3"><VoiceSearch value={localSearch} onChange={setLocalSearch} placeholder={`Rechercher ${activityType.toLowerCase()}...`} /><div className="flex flex-wrap gap-2">{['tous', 'actifs', 'prets', 'retard', 'vendus', 'malades'].map((filter) => <button key={filter} type="button" onClick={() => setQuickFilter(filter)} className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${quickFilter === filter ? 'bg-[#2f2415] text-white font-semibold' : 'bg-white border border-[#d6c3a0] text-[#8a7456] hover:border-[#2f2415]'}`}>{filter === 'prets' ? 'prêts vente' : filter}</button>)}</div></div>

    <div className="rounded-3xl border border-[#d6c3a0] bg-white overflow-hidden"><div className="px-5 py-4 border-b border-[#eadcc2]"><p className="font-black text-[#2f2415]">Liste {activityType}s</p><p className="text-sm text-[#8a7456]">Informations importantes en premier. Les courbes sont dans la fiche animal.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#fffdf8] text-xs uppercase tracking-wide text-[#8a7456]"><tr><th className="px-4 py-3 text-left">Animal</th><th className="px-4 py-3 text-left">Poids</th><th className="px-4 py-3 text-left">Objectif</th><th className="px-4 py-3 text-left">Progression</th><th className="px-4 py-3 text-left">Décision</th><th className="px-4 py-3 text-left">Santé</th><th className="px-4 py-3 text-left">Vente</th><th className="px-4 py-3 text-right">Coût / marge</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{filtered.map((animal) => { const g = growthInfo(animal); const metrics = metricsFor(animal); const pricing = pricingFor(animal); const margin = (pricing.recommendedSalePrice || 0) - (metrics.totalCost || 0); return <tr key={animal.id} className="border-t border-[#eadcc2] hover:bg-[#fffdf8]"><td className="px-4 py-3"><p className="font-black text-[#2f2415]">{animal.name || animal.tag || animal.id}</p><p className="text-xs text-[#8a7456]">{animal.id} · {animal.type || animal.espece}</p></td><td className="px-4 py-3 font-black text-[#2f2415]">{fmtNumber(g.current)} kg</td><td className="px-4 py-3 text-[#7d6a4a]">{g.target ? `${fmtNumber(g.target)} kg` : '—'}</td><td className="px-4 py-3 min-w-[130px]"><ProgressBar value={g.progress} /></td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-black ${statusClass(g.status)}`}>{statusLabel(g.status)}</span><p className="mt-1 text-xs text-[#8a7456]">{g.decision}</p></td><td className="px-4 py-3"><Badge status={animal.health_status || 'sain'} /></td><td className="px-4 py-3"><Badge status={animal.status || 'actif'} /></td><td className="px-4 py-3 text-right"><p className="font-bold text-[#2f2415]">{fmtCurrency(metrics.totalCost || animal.purchase_cost || 0)}</p><p className={`text-xs font-black ${margin >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtCurrency(margin)}</p></td><td className="px-4 py-3"><div className="flex justify-end gap-1"><ActionIconButton icon={Eye} title="Voir fiche" color="sky" onClick={() => { setSelected(animal); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(animal); setModal('edit'); }} /><ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={() => openWhatsApp(animal)} /></div></td></tr>; })}{!filtered.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-[#8a7456]">Aucun animal pour ce filtre.</td></tr> : null}</tbody></table></div></div>

    <AnimalDetails open={modal === 'details'} onClose={() => setModal(null)} animal={selected} metrics={selected ? metricsFor(selected) : {}} />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={createFields} initialValues={buildModalValues(initialAnimal)} autoId={(values) => generateSequentialId('animaux', testRows, values)} uploadFolder="animaux" loading={saving} title={`Ajouter ${activityType}`} submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={editFields} initialValues={selected ? buildModalValues(selected) : {}} uploadFolder="animaux" loading={saving} title="Modifier le suivi animal" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={confirmDelete} itemLabel={selected ? `${selected.name || selected.id} (${selected.id})` : ''} loading={saving} />
  </div>;
}
