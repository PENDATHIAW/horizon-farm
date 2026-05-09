import { CheckCircle, AlertTriangle, Tag, XCircle, Download, Eye, Edit, MessageCircle, Plus, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import Badge from '../components/Badge';
import ActionIconButton from '../components/ActionIconButton';
import DataTable from '../components/DataTable';
import VoiceSearch from '../components/VoiceSearch';
import { fmtCurrency } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import AnimalDetailsModal from '../components/AnimalDetailsModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { generateSequentialId, toWhatsappLink } from '../utils/ids';
import { DEFAULT_PHONE } from '../utils/location';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import { buildGrowthSummary } from '../utils/animalGrowth';
import { getAnimalSaleReadiness, calculateAnimalSalePricing } from '../utils/animalSalePricing';
import { calculateAnimalMetrics } from '../utils/businessCalculations';
import { enrichAnimalLifecycle, getReproductionAlerts } from '../utils/animalLifecycle';
import { mergeAnimalSeeds } from '../utils/mergeAnimalSeeds';
import AnimalHealthBridge from './AnimalHealthBridge.jsx';

const activityTabs = ['Bovin', 'Ovin', 'Caprin'];

const growthFormFields = [
  { key: 'section_growth', label: 'Croissance & engraissement', type: 'section', description: 'Suivi du poids, de l objectif de vente et de la rentabilite.' },
  { key: 'poids_entree', label: 'Poids entree ferme (kg)', type: 'number' },
  { key: 'date_poids_entree', label: 'Date poids entree', type: 'date' },
  { key: 'date_derniere_pesee', label: 'Date derniere pesee', type: 'date' },
  { key: 'poids_objectif', label: 'Poids objectif vente (kg)', type: 'number' },
  { key: 'objectif_croissance_jour', label: 'Objectif gain / jour (kg)', type: 'number' },
  { key: 'poids_history_text', label: 'Historique pesees', type: 'textarea', rows: 5, fullWidth: true, placeholder: '2025-01-10 | 250 | entree ferme\n2025-02-10 | 278 | bonne croissance' },
  { key: 'section_pricing', label: 'Objectif vente & marge', type: 'section', description: 'Aide a fixer un prix de vente rentable et a encadrer la negociation.' },
  { key: 'marge_cible_pct', label: 'Marge cible (%)', type: 'number' },
  { key: 'prix_kg_estime', label: 'Prix marche estime / kg', type: 'number' },
  { key: 'prix_vente_estime', label: 'Prix de vente estime manuel', type: 'number' },
  { key: 'notes_engraissement', label: 'Notes engraissement / ration', type: 'textarea', rows: 3, fullWidth: true },
  { key: 'qualite_acheteur', label: 'Mention fiche acheteur', type: 'textarea', rows: 2, fullWidth: true },
];

const parseWeightHistoryText = (text, currentWeight, currentDate) => {
  const entries = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const [date, poids, ...noteParts] = line.split('|').map((part) => part.trim());
    return { date, poids: Number(poids || 0), note: noteParts.join(' | ') };
  }).filter((entry) => entry.date && entry.poids > 0);
  if (Number(currentWeight || 0) > 0 && currentDate && !entries.some((entry) => entry.date === currentDate && Number(entry.poids) === Number(currentWeight))) entries.push({ date: currentDate, poids: Number(currentWeight), note: 'Poids actuel' });
  return entries;
};

const stringifyWeightHistory = (animal = {}) => {
  const history = animal.poids_history || animal.weight_history || animal.historique_poids || [];
  let list = [];
  if (Array.isArray(history)) list = history;
  if (typeof history === 'string') { try { list = JSON.parse(history); } catch { list = []; } }
  return list.map((item) => `${item.date || item.date_pesee || ''} | ${item.poids || item.weight || ''}${item.note ? ` | ${item.note}` : ''}`.trim()).join('\n');
};

const insertGrowthFields = (fields) => {
  const sanitizedFields = fields.filter((field) => !growthFormFields.some((growthField) => growthField.key === field.key));
  const venteIndex = sanitizedFields.findIndex((field) => field.key === 'section_vente');
  if (venteIndex === -1) return [...sanitizedFields, ...growthFormFields];
  return [...sanitizedFields.slice(0, venteIndex), ...growthFormFields, ...sanitizedFields.slice(venteIndex)];
};

const opportunityBadge = (animal, metrics) => {
  const readiness = getAnimalSaleReadiness({ animal, metrics });
  if (animal.pret_vente_confirme) return <Badge status="pret_confirme" />;
  if (readiness.recommended || animal.pret_vente_recommande || animal.status === 'pret_a_la_vente') return <Badge status="recommande_pret" />;
  if (readiness.targetProgress >= 90) return <span className="text-xs font-semibold text-amber-500">Presque pret ({readiness.targetProgress}%)</span>;
  return <span className="text-xs text-[#b39b78]">Engraissement {readiness.targetProgress ? `${readiness.targetProgress}%` : ''}</span>;
};

export default function Animaux({ rows = [], alimentationLogs = [], vaccins = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [activityType, setActivityType] = useState('Bovin');
  const [statusFilter, setStatusFilter] = useState('tous');
  const [healthFilter, setHealthFilter] = useState('tous');
  const [quickFilter, setQuickFilter] = useState('tous');
  const [localSearch, setLocalSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const testRows = useMemo(() => mergeAnimalSeeds(rows), [rows]);
  const activityRows = useMemo(() => testRows.filter((animal) => animal.type === activityType), [testRows, activityType]);
  const statuses = ['tous', 'actif', 'pret_a_la_vente', 'reserve', 'vendu', 'mort', 'vole', 'reforme'];
  const healthStatuses = ['tous', 'sain', 'malade', 'blesse', 'sous_traitement', 'a_surveiller'];
  const initialAnimal = useMemo(() => {
    const id = generateSequentialId('animaux', testRows, { type: activityType });
    const today = new Date().toISOString().slice(0, 10);
    return { id, tag: id, type: activityType, status: 'actif', health_status: 'sain', mode_acquisition: 'achat', date_achat: today, date_entree_ferme: today, date_poids_entree: today, date_derniere_pesee: today, sexe: 'F', en_gestation: false, statut_reproduction: 'inconnu', marge_cible_pct: 25, sale_price: 0 };
  }, [testRows, activityType]);

  const metricsFor = (animal) => calculateAnimalMetrics({ animal, animals: testRows, feedingLogs: alimentationLogs, vaccins });
  const lifecycleFor = (animal) => enrichAnimalLifecycle({ animal, animals: testRows, metrics: metricsFor(animal) });
  const readinessFor = (animal) => getAnimalSaleReadiness({ animal, metrics: metricsFor(animal) });
  const pricingFor = (animal) => calculateAnimalSalePricing({ animal, metrics: metricsFor(animal) });

  const activitySummary = useMemo(() => {
    const active = activityRows.filter((a) => isActiveAnimalForFeeding(a));
    const sold = activityRows.filter((a) => a.status === 'vendu');
    const ready = activityRows.filter((a) => a.status === 'pret_a_la_vente' || a.pret_vente_recommande || readinessFor(a).recommended);
    const almostReady = activityRows.filter((a) => readinessFor(a).targetProgress >= 90 && !ready.includes(a));
    const sick = activityRows.filter((a) => ['malade', 'sous_traitement', 'blesse'].includes(a.health_status));
    const losses = activityRows.filter((a) => ['mort', 'vole'].includes(a.status));
    const invested = activityRows.reduce((sum, a) => sum + metricsFor(a).totalCost, 0);
    const potentialCA = active.reduce((sum, a) => sum + pricingFor(a).recommendedSalePrice, 0);
    const floorCA = active.reduce((sum, a) => sum + pricingFor(a).minimumAcceptablePrice, 0);
    const expectedMargin = active.reduce((sum, a) => sum + pricingFor(a).expectedMargin, 0);
    const realMargin = sold.reduce((sum, a) => sum + (metricsFor(a).margin || 0), 0);
    const avgWeight = active.length ? active.reduce((sum, a) => sum + Number(a.poids || 0), 0) / active.length : 0;
    const avgDailyGain = active.length ? active.reduce((sum, a) => sum + buildGrowthSummary(a).averageDailyGain, 0) / active.length : 0;
    const slowGrowth = active.filter((a) => buildGrowthSummary(a).status === 'croissance_lente' || buildGrowthSummary(a).status === 'perte_poids');
    return { active, sold, ready, almostReady, sick, losses, invested, potentialCA, floorCA, expectedMargin, realMargin, avgWeight, avgDailyGain, slowGrowth };
  }, [activityRows]);

  const preparePayload = (payload) => {
    const mode = payload.mode_acquisition || 'achat';
    const isBirthMode = ['naissance_ferme', 'reproduction_interne'].includes(mode);
    const dateNaissance = payload.date_naissance || payload.naissance || '';
    const dateEntree = isBirthMode ? dateNaissance : payload.date_entree_ferme || payload.date_achat || '';
    const currentWeight = Number(payload.poids || 0);
    const entryWeight = Number(payload.poids_entree || currentWeight || 0);
    const entryDate = payload.date_poids_entree || dateEntree || payload.date_achat || new Date().toISOString().slice(0, 10);
    const lastWeightDate = payload.date_derniere_pesee || new Date().toISOString().slice(0, 10);
    const history = parseWeightHistoryText(payload.poids_history_text, currentWeight, lastWeightDate);
    if (entryWeight > 0 && entryDate && !history.some((item) => item.date === entryDate && Number(item.poids) === entryWeight)) history.unshift({ date: entryDate, poids: entryWeight, note: 'Poids entree ferme' });
    const basePayload = { ...payload, type: payload.type || activityType, purchase_cost: isBirthMode ? 0 : Number(payload.purchase_cost || 0), date_achat: mode === 'achat' ? payload.date_achat || '' : '', date_entree_ferme: dateEntree, naissance: dateNaissance, poids_entree: entryWeight || null, date_poids_entree: entryDate, date_derniere_pesee: lastWeightDate, poids_history: history, ras_veterinaire: payload.ras_veterinaire || (payload.health_status === 'sain' ? 'Consultation effectuee, RAS selon le veterinaire' : ''), sante: payload.frais_sante ?? payload.sante ?? 0, sale_price: payload.prix_vente_reel ?? payload.sale_price ?? 0, statut_reproduction: payload.sexe === 'F' ? (payload.en_gestation ? 'en_gestation' : payload.statut_reproduction || 'inconnu') : payload.statut_reproduction || 'non_reproductrice' };
    const metrics = metricsFor(basePayload);
    const readiness = getAnimalSaleReadiness({ animal: basePayload, metrics });
    const pricing = calculateAnimalSalePricing({ animal: basePayload, metrics });
    const { poids_history_text, ...cleanPayload } = basePayload;
    return { ...cleanPayload, prix_vente_estime_auto: Math.round(pricing.recommendedSalePrice || 0), prix_minimum_acceptable: Math.round(pricing.minimumAcceptablePrice || 0), marge_prevue: Math.round(pricing.expectedMargin || 0), sale_readiness_score: readiness.targetProgress, sale_readiness_status: readiness.status, pret_vente_recommande: readiness.recommended || Boolean(payload.pret_vente_recommande), raison_pret_vente: readiness.reason, status: readiness.recommended && (payload.status || 'actif') === 'actif' ? 'pret_a_la_vente' : payload.status || 'actif' };
  };

  const motherOptions = useMemo(() => testRows.filter((animal) => animal.sexe === 'F').map((animal) => ({ value: animal.id, label: `${animal.id} - ${animal.name || 'Femelle'}` })), [testRows]);
  const fatherOptions = useMemo(() => testRows.filter((animal) => animal.sexe === 'M').map((animal) => ({ value: animal.id, label: `${animal.id} - ${animal.name || 'Male'}` })), [testRows]);
  const animalFormFields = useMemo(() => insertGrowthFields(MODULE_FORM_FIELDS.animaux).map((field) => { if (field.key === 'mere_id') return { ...field, options: motherOptions }; if (field.key === 'pere_id' || field.key === 'male_reproducteur_id') return { ...field, options: fatherOptions }; return field; }), [motherOptions, fatherOptions]);
  const buildModalValues = (animal = {}) => {
    const data = { ...animal, type: animal.type || activityType, date_naissance: animal.date_naissance || animal.naissance || '', poids_history_text: stringifyWeightHistory(animal) };
    const healthCost = Number(data.frais_sante ?? data.sante ?? 0);
    const metrics = animal.id ? metricsFor(data) : { feedingCost: 0, healthCost, totalCost: Number(data.purchase_cost || 0) + healthCost + Number(data.autres_frais || 0), margin: null };
    const growth = buildGrowthSummary(data);
    const pricing = calculateAnimalSalePricing({ animal: data, metrics });
    const readiness = getAnimalSaleReadiness({ animal: data, metrics });
    return { ...data, alimentation_calculee_view: fmtCurrency(metrics.feedingCost), frais_sante_view: fmtCurrency(metrics.healthCost), cout_total_calcule_view: fmtCurrency(metrics.totalCost), marge_calculee_view: metrics.margin === null ? 'En cours' : fmtCurrency(metrics.margin), sale_readiness_score: readiness.targetProgress ? `${readiness.targetProgress}% - ${readiness.status}` : growth.history.length >= 2 ? `${growth.label} - ${growth.averageDailyGain.toFixed(2)} kg/jour` : 'Ajouter pesees', prix_vente_estime: data.prix_vente_estime || Math.round(pricing.recommendedSalePrice || 0), prix_minimum_acceptable: data.prix_minimum_acceptable || Math.round(pricing.minimumAcceptablePrice || 0) };
  };

  const filtered = useMemo(() => activityRows.filter((a) => {
    const passStatus = statusFilter === 'tous' || (a.status || 'actif') === statusFilter;
    const passHealth = healthFilter === 'tous' || (a.health_status || 'sain') === healthFilter;
    const passQuick = quickFilter === 'tous'
      || (quickFilter === 'prets' && (a.status === 'pret_a_la_vente' || a.pret_vente_recommande || readinessFor(a).recommended))
      || (quickFilter === 'pertes' && ['mort', 'vole'].includes(a.status))
      || (quickFilter === 'actifs' && isActiveAnimalForFeeding(a))
      || (quickFilter === 'vendus' && a.status === 'vendu')
      || (quickFilter === 'malades' && ['malade', 'sous_traitement', 'blesse'].includes(a.health_status));
    const q = localSearch.trim().toLowerCase();
    const passSearch = !q || String(a.name || '').toLowerCase().includes(q) || String(a.id || '').toLowerCase().includes(q);
    return passStatus && passHealth && passQuick && passSearch;
  }), [activityRows, statusFilter, healthFilter, quickFilter, localSearch]);
  const reproductionAlerts = useMemo(() => activityRows.flatMap((animal) => getReproductionAlerts(animal)), [activityRows]);
  const referenceAnimal = filtered[0] || activityRows[0] || null;
  const referenceMetrics = referenceAnimal ? metricsFor(referenceAnimal) : null;
  const referencePricing = referenceAnimal ? calculateAnimalSalePricing({ animal: referenceAnimal, metrics: referenceMetrics }) : null;
  const referenceReadiness = referenceAnimal ? getAnimalSaleReadiness({ animal: referenceAnimal, metrics: referenceMetrics }) : null;
  const openWhatsApp = (animal) => { const url = toWhatsappLink(DEFAULT_PHONE, `Rapport animal ${animal.name} (${animal.id})`); window.open(url, '_blank', 'noopener,noreferrer'); };
  const submitCreate = async (payload) => { try { setSaving(true); await onCreate(preparePayload(payload)); toast.success('Animal ajoute avec succes'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur creation'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate(selected.id, preparePayload(payload)); toast.success('Animal modifie avec succes'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur modification'); } finally { setSaving(false); } };
  const confirmDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete(selected.id); toast.success('Animal supprime'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur suppression'); } finally { setSaving(false); } };
  const exportRows = () => { exportToCsv({ rows: filtered, columns: ['id', 'tag', 'name', 'type', 'sexe', 'poids', 'poids_objectif', 'prix_vente_estime_auto', 'prix_minimum_acceptable', 'sale_readiness_status', 'status'], fileName: `animaux-${activityType}.csv` }); exportToExcel({ rows: filtered, fileName: `animaux-${activityType}.xlsx`, sheetName: activityType }); exportToPdf({ rows: filtered, columns: ['id', 'tag', 'name', 'type', 'sexe', 'poids', 'status'], fileName: `animaux-${activityType}.pdf`, title: `Liste ${activityType}` }); toast.success('Exports CSV/Excel/PDF generes'); };
  const applyQuickFilter = (kind) => { setQuickFilter(kind); setStatusFilter('tous'); setHealthFilter('tous'); };

  const columns = [
    { key: 'photo_url', label: 'Photo', render: (a) => a.photo_url ? <img src={a.photo_url} alt={a.name} className="h-10 w-10 rounded-lg object-cover border border-[#d6c3a0]" /> : <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs text-emerald-400">{a.type?.[0] || 'A'}</div> },
    { key: 'tag', label: 'Tag/ID', sortable: true, render: (a) => <span className="font-mono text-emerald-400 text-xs">{a.tag || a.id}</span> },
    { key: 'name', label: 'Nom', sortable: true, render: (a) => <span className="font-semibold text-[#2f2415]">{a.name}</span> },
    { key: 'poids', label: 'Poids / objectif', sortable: true, render: (a) => <span className="text-[#2f2415] font-semibold">{a.poids || 0} / {a.poids_objectif || '-'} kg</span> },
    { key: 'croissance', label: 'Croissance', render: (a) => buildGrowthSummary(a).label },
    { key: 'pret_vente', label: 'Opportunite', render: (a) => opportunityBadge(a, metricsFor(a)) },
    { key: 'prix_recommande', label: 'Prix recommande', render: (a) => fmtCurrency(calculateAnimalSalePricing({ animal: a, metrics: metricsFor(a) }).recommendedSalePrice) },
    { key: 'health_status', label: 'Sante', render: (a) => <Badge status={a.health_status || 'sain'} /> },
    { key: 'status', label: 'Statut', render: (a) => <Badge status={a.status || 'actif'} /> },
    { key: 'actions', label: 'Actions', render: (a) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(a); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(a); setModal('edit'); }} /><ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={() => openWhatsApp(a)} /><ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(a); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6"><SectionHeader title="Gestion des Animaux" sub="Bovins - Ovins - Caprins: croissance, sante et rentabilite" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {activityType}</Btn></>} />
    <AnimalHealthBridge rows={activityRows} alimentationLogs={alimentationLogs} vaccins={vaccins} onUpdate={onUpdate} onRefresh={onRefresh} />
    <div className="grid grid-cols-3 gap-2">{activityTabs.map((tab) => <button key={tab} type="button" onClick={() => { setActivityType(tab); setStatusFilter('tous'); setHealthFilter('tous'); setQuickFilter('tous'); }} className={`rounded-2xl border px-4 py-3 text-left transition-all ${activityType === tab ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Activite</p><p className="font-black">{tab}s</p><p className="text-xs opacity-75">{testRows.filter((a) => a.type === tab).length} animaux</p></button>)}</div>
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><button onClick={() => applyQuickFilter('actifs')}><KpiCard icon={CheckCircle} label="Actifs" value={activitySummary.active.length} color="bg-emerald-500/20 text-emerald-400" /></button><button onClick={() => applyQuickFilter('prets')}><KpiCard icon={Tag} label="Prets vente" value={activitySummary.ready.length} color="bg-amber-500/20 text-amber-400" /></button><button onClick={() => applyQuickFilter('malades')}><KpiCard icon={AlertTriangle} label="Malades" value={activitySummary.sick.length} color="bg-red-500/20 text-red-400" /></button><button onClick={() => applyQuickFilter('vendus')}><KpiCard icon={Tag} label="Vendus" value={activitySummary.sold.length} color="bg-sky-500/20 text-sky-400" /></button><button onClick={() => applyQuickFilter('pertes')}><KpiCard icon={XCircle} label="Pertes" value={activitySummary.losses.length} color="bg-zinc-700/30 text-zinc-300" /></button></div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><MiniMetric label="Investi total" value={fmtCurrency(activitySummary.invested)} /><MiniMetric label="CA potentiel" value={fmtCurrency(activitySummary.potentialCA)} /><MiniMetric label="Marge prevue" value={fmtCurrency(activitySummary.expectedMargin)} /><MiniMetric label="Prix plancher total" value={fmtCurrency(activitySummary.floorCA)} /><MiniMetric label="Poids moyen" value={`${activitySummary.avgWeight.toFixed(1)} kg`} /><MiniMetric label="Gain moyen/jour" value={`${activitySummary.avgDailyGain.toFixed(2)} kg/j`} /><MiniMetric label="Presque prets" value={activitySummary.almostReady.length} /><MiniMetric label="Croissance faible" value={activitySummary.slowGrowth.length} danger={activitySummary.slowGrowth.length > 0} /></div>
    {reproductionAlerts.length ? <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4"><p className="text-amber-500 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Alertes reproduction {activityType}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{reproductionAlerts.slice(0, 4).map((alert) => <div key={alert.id} className={`rounded-xl border p-3 text-sm ${alert.severity === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-amber-500/10 border-amber-500/20 text-[#7d6a4a]'}`}><p className="font-semibold">{alert.title}</p><p className="text-xs mt-1">{alert.message}</p></div>)}</div></div> : null}
    <div className="flex flex-wrap gap-3"><VoiceSearch value={localSearch} onChange={setLocalSearch} placeholder={`Rechercher ${activityType.toLowerCase()}...`} /><div className="flex flex-wrap gap-2">{statuses.map((s) => <button key={s} type="button" onClick={() => { setStatusFilter(s); setQuickFilter('tous'); }} className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${statusFilter === s && quickFilter === 'tous' ? 'bg-emerald-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456] hover:border-emerald-500'}`}>{s.replaceAll('_', ' ')}</button>)}</div><div className="flex flex-wrap gap-2">{healthStatuses.map((s) => <button key={s} type="button" onClick={() => { setHealthFilter(s); setQuickFilter('tous'); }} className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${healthFilter === s && quickFilter === 'tous' ? 'bg-sky-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456] hover:border-sky-500'}`}>{s.replace('_', ' ')}</button>)}</div></div>
    <DataTable title={`Liste ${activityType}s`} rows={filtered} columns={columns} loading={loading} initialSortKey="id" searchPlaceholder="Recherche table..." />
    {referenceAnimal ? <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Decision rapide - {referenceAnimal.id} {referenceAnimal.name}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{ label: 'Cout total', value: fmtCurrency(referenceMetrics?.totalCost || 0) }, { label: 'Prix recommande', value: fmtCurrency(referencePricing?.recommendedSalePrice || 0) }, { label: 'Prix plancher', value: fmtCurrency(referencePricing?.minimumAcceptablePrice || 0) }, { label: 'Marge prevue', value: fmtCurrency(referencePricing?.expectedMargin || 0) }, { label: 'Objectif poids', value: `${referenceAnimal.poids || 0} / ${referenceAnimal.poids_objectif || '-'} kg` }, { label: 'Maturite vente', value: referenceReadiness?.status || 'non_pret' }, { label: 'Croissance', value: buildGrowthSummary(referenceAnimal).label }, { label: 'Gain moyen', value: `${buildGrowthSummary(referenceAnimal).averageDailyGain.toFixed(2)} kg/jour` }].map((c) => <div key={c.label} className="bg-[#fffdf8] rounded-xl p-3 border border-[#d6c3a0]"><div className="text-xs text-[#8a7456] mb-1">{c.label}</div><div className="text-[#2f2415] font-semibold">{c.value}</div></div>)}</div></div> : null}
    <AnimalDetailsModal open={modal === 'details'} onClose={() => setModal(null)} animal={selected} metrics={selected ? metricsFor(selected) : {}} animals={testRows} vaccins={vaccins} lifecycle={selected ? lifecycleFor(selected) : null} onOpenTrace={() => toast.success('Ouvre le module Tracabilite pour cette fiche')} onAddDocument={() => toast.success('Ajout document disponible depuis le module Documents')} />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={animalFormFields} initialValues={buildModalValues(initialAnimal)} autoId={(values) => generateSequentialId('animaux', testRows, values)} uploadFolder="animaux" loading={saving} title={`Ajouter ${activityType}`} submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={animalFormFields} initialValues={selected ? buildModalValues(selected) : {}} uploadFolder="animaux" loading={saving} title="Modifier animal" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={confirmDelete} itemLabel={selected ? `${selected.name} (${selected.id})` : ''} loading={saving} />
  </div>;
}

function MiniMetric({ label, value, danger = false }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-lg font-black mt-1 ${danger ? 'text-red-500' : 'text-[#2f2415]'}`}>{value}</p></div>;
}
