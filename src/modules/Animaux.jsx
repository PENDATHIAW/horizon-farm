import { AlertTriangle, CheckCircle, Download, Edit, Eye, MessageCircle, Plus, RefreshCw, Tag, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import AnimalDetailsModal from '../components/AnimalDetailsModal';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import VoiceSearch from '../components/VoiceSearch';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import EditModal from '../modals/EditModal';
import { enrichAnimalEntryPayload, buildInitialAnimalEntry, computeLivingAnimalGrowthTarget } from '../services/animalEntryDefaults';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import { getReproductionAlerts, enrichAnimalLifecycle } from '../utils/animalLifecycle';
import { buildGrowthSummary } from '../utils/animalGrowth';
import { getAnimalSaleReadiness, calculateAnimalSalePricing } from '../utils/animalSalePricing';
import { calculateAnimalMetrics } from '../utils/businessCalculations';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency } from '../utils/format';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import { DEFAULT_PHONE } from '../utils/location';
import { mergeAnimalSeeds } from '../utils/mergeAnimalSeeds';
import AnimalHealthBridge from './AnimalHealthBridge.jsx';

const activityTabs = ['Bovin', 'Ovin', 'Caprin'];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

const saleConfirmed = (animal = {}) => Boolean(
  animal.pret_vente_confirme || animal.ready_for_sale || animal.sale_ready || animal.pret_a_la_vente || animal.status === 'pret_a_la_vente',
);
const saleOpportunityKey = (animal = {}) => `animal:${animal.id}`;

function parseWeightHistoryText(text, currentWeight, currentDate) {
  const entries = String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [date, poids, ...noteParts] = line.split('|').map((part) => part.trim());
      return { date, poids: Number(poids || 0), note: noteParts.join(' | ') };
    })
    .filter((entry) => entry.date && entry.poids > 0);

  if (Number(currentWeight || 0) > 0 && currentDate && !entries.some((entry) => entry.date === currentDate && Number(entry.poids) === Number(currentWeight))) {
    entries.push({ date: currentDate, poids: Number(currentWeight), note: 'Poids actuel' });
  }
  return entries;
}

function stringifyWeightHistory(animal = {}) {
  const history = animal.poids_history || animal.weight_history || animal.historique_poids || [];
  let list = [];
  if (Array.isArray(history)) list = history;
  if (typeof history === 'string') {
    try { list = JSON.parse(history); } catch { list = []; }
  }
  return list
    .map((item) => `${item.date || item.date_pesee || ''} | ${item.poids || item.weight || ''}${item.note ? ` | ${item.note}` : ''}`.trim())
    .join('\n');
}

const growthFormFields = [
  { key: 'section_growth', label: 'Croissance & pesées', type: 'section', description: 'Le poids objectif est vivant : il se recalcule après chaque pesée.' },
  { key: 'poids_entree', label: 'Poids entrée ferme (kg)', type: 'number' },
  { key: 'date_poids_entree', label: 'Date poids entrée', type: 'date' },
  { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date' },
  { key: 'frequence_pesee_jours', label: 'Fréquence pesée recommandée (jours)', type: 'number' },
  { key: 'delai_cible_jours', label: 'Délai cible vente / suivi (jours)', type: 'number' },
  { key: 'objectif_croissance_jour', label: 'Gain cible / jour (kg)', type: 'number' },
  { key: 'poids_objectif', label: 'Poids objectif vivant (kg)', type: 'number' },
  { key: 'date_prochaine_pesee_recommandee', label: 'Prochaine pesée recommandée', type: 'date' },
  { key: 'poids_history_text', label: 'Historique pesées', type: 'textarea', rows: 5, fullWidth: true, placeholder: '2026-05-15 | 180 | entrée ferme\n2026-05-30 | 187 | pesée 15 jours' },
  { key: 'section_pricing', label: 'Vente & marge', type: 'section', description: 'Prix conseillé et opportunité de vente après confirmation humaine.' },
  { key: 'marge_cible_pct', label: 'Marge cible (%)', type: 'number' },
  { key: 'prix_kg_estime', label: 'Prix marché estimé / kg', type: 'number' },
  { key: 'prix_vente_estime', label: 'Prix de vente estimé manuel', type: 'number' },
  { key: 'notes_engraissement', label: 'Notes engraissement / ration', type: 'textarea', rows: 3, fullWidth: true },
];

function insertGrowthFields(fields = []) {
  const sanitizedFields = fields.filter((field) => !growthFormFields.some((growthField) => growthField.key === field.key));
  const venteIndex = sanitizedFields.findIndex((field) => field.key === 'section_vente');
  if (venteIndex === -1) return [...sanitizedFields, ...growthFormFields];
  return [...sanitizedFields.slice(0, venteIndex), ...growthFormFields, ...sanitizedFields.slice(venteIndex)];
}

function opportunityBadge(animal, metrics) {
  const readiness = getAnimalSaleReadiness({ animal, metrics });
  const living = computeLivingAnimalGrowthTarget(animal);
  if (saleConfirmed(animal)) return <Badge status="pret_confirme" />;
  if (readiness.recommended || animal.pret_vente_recommande || living.status === 'pret_vente') return <Badge status="recommande_pret" />;
  if (living.weighingDue) return <span className="text-xs font-semibold text-amber-500">Pesée à faire</span>;
  if (readiness.targetProgress >= 90) return <span className="text-xs font-semibold text-amber-500">Presque prêt ({readiness.targetProgress}%)</span>;
  return <span className="text-xs text-[#b39b78]">{living.progress ? `${living.progress}% objectif` : 'Suivi en cours'}</span>;
}

function MiniMetric({ label, value, danger = false }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-lg font-black mt-1 ${danger ? 'text-red-500' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

export default function Animaux({
  rows = [], alimentationLogs = [], vaccins = [], opportunities = [], loading,
  onCreate, onUpdate, onDelete, onRefresh,
  onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities,
  onCreateBusinessEvent, onRefreshBusinessEvents,
}) {
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
    return buildInitialAnimalEntry({ id, type: activityType, date: today() });
  }, [testRows, activityType]);

  const metricsFor = (animal) => calculateAnimalMetrics({ animal, animals: testRows, feedingLogs: alimentationLogs, vaccins });
  const lifecycleFor = (animal) => enrichAnimalLifecycle({ animal, animals: testRows, metrics: metricsFor(animal) });
  const readinessFor = (animal) => getAnimalSaleReadiness({ animal, metrics: metricsFor(animal) });
  const pricingFor = (animal) => calculateAnimalSalePricing({ animal, metrics: metricsFor(animal) });

  const preparePayload = (payload) => {
    const mode = payload.mode_acquisition || 'achat';
    const isBirthMode = ['naissance_ferme', 'reproduction_interne'].includes(mode);
    const dateNaissance = payload.date_naissance || payload.naissance || '';
    const dateEntree = isBirthMode ? dateNaissance : payload.date_entree_ferme || payload.date_achat || today();
    const entryWeight = Number(payload.poids_entree || payload.poids || 0);
    const currentWeight = Number(payload.poids || entryWeight || 0);
    const entryDate = payload.date_poids_entree || dateEntree || today();
    const lastWeightDate = payload.date_derniere_pesee || entryDate;
    const history = parseWeightHistoryText(payload.poids_history_text, currentWeight, lastWeightDate);

    const basePayload = {
      ...payload,
      type: payload.type || activityType,
      mode_acquisition: mode,
      purchase_cost: isBirthMode ? 0 : Number(payload.purchase_cost || 0),
      date_achat: mode === 'achat' ? payload.date_achat || dateEntree : '',
      date_entree_ferme: dateEntree,
      naissance: dateNaissance,
      poids: currentWeight || null,
      poids_entree: entryWeight || null,
      date_poids_entree: entryDate,
      date_derniere_pesee: lastWeightDate,
      poids_history: history,
      sale_price: payload.prix_vente_reel ?? payload.sale_price ?? 0,
      statut_reproduction: payload.sexe === 'F' ? (payload.en_gestation ? 'en_gestation' : payload.statut_reproduction || 'inconnu') : payload.statut_reproduction || 'non_reproductrice',
    };

    const growthPayload = enrichAnimalEntryPayload(basePayload);
    const metrics = metricsFor(growthPayload);
    const readiness = getAnimalSaleReadiness({ animal: growthPayload, metrics });
    const pricing = calculateAnimalSalePricing({ animal: growthPayload, metrics });
    const confirmed = saleConfirmed(payload);
    const shouldBeReady = confirmed || readiness.recommended || Boolean(payload.pret_vente_recommande) || growthPayload.statut_croissance_ia === 'pret_vente';
    const { poids_history_text, ...cleanPayload } = growthPayload;

    return {
      ...cleanPayload,
      prix_vente_estime_auto: Math.round(pricing.recommendedSalePrice || 0),
      prix_minimum_acceptable: Math.round(pricing.minimumAcceptablePrice || 0),
      marge_prevue: Math.round(pricing.expectedMargin || 0),
      sale_readiness_score: readiness.targetProgress,
      sale_readiness_status: confirmed ? 'confirme' : readiness.status,
      pret_vente_recommande: readiness.recommended || Boolean(payload.pret_vente_recommande) || growthPayload.statut_croissance_ia === 'pret_vente',
      pret_vente_confirme: confirmed,
      pret_a_la_vente: confirmed,
      ready_for_sale: confirmed,
      sale_ready: confirmed,
      sale_ready_confirmed_at: confirmed ? (payload.sale_ready_confirmed_at || now()) : '',
      raison_pret_vente: confirmed ? 'Confirmé manuellement' : readiness.reason,
      status: shouldBeReady && (payload.status || 'actif') !== 'vendu' ? 'pret_a_la_vente' : payload.status || 'actif',
    };
  };

  const findExistingOpportunity = (animal) => opportunities.find((opp) => String(opp.source_module || '') === 'animaux' && String(opp.source_id || opp.related_id || '') === String(animal.id)) || opportunities.find((opp) => opp.opportunity_key === saleOpportunityKey(animal));

  const syncSaleOpportunity = async (animal) => {
    if (!saleConfirmed(animal) || !animal.id || !onCreateOpportunity) return;
    const pricing = pricingFor(animal);
    const payload = {
      opportunity_key: saleOpportunityKey(animal),
      source_module: 'animaux',
      source_type: 'animal',
      source_id: animal.id,
      related_id: animal.id,
      title: `Animal prêt à vendre: ${animal.name || animal.tag || animal.id}`,
      product_name: `${animal.name || animal.tag || animal.id} · ${animal.type || 'Animal'}`,
      quantity: 1,
      unit: 'tete',
      unit_price: Math.round(pricing.recommendedSalePrice || animal.prix_vente_estime_auto || animal.prix_vente_estime || animal.sale_price || 0),
      estimated_amount: Math.round(pricing.recommendedSalePrice || animal.prix_vente_estime_auto || animal.prix_vente_estime || animal.sale_price || 0),
      status: animal.status === 'vendu' ? 'fermee' : 'ouverte',
      statut: animal.status === 'vendu' ? 'fermee' : 'ouverte',
      priority: 'moyenne',
      notes: animal.raison_pret_vente || 'Prêt à la vente confirmé',
      created_from: 'animaux',
      updated_at: now(),
    };
    const existing = findExistingOpportunity(animal);
    if (existing?.id && onUpdateOpportunity) await onUpdateOpportunity(existing.id, payload);
    else await onCreateOpportunity({ id: makeId('OPP'), ...payload, created_at: now() });
    await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existing?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, title: `Opportunité vente ${animal.name || animal.id}`, description: payload.product_name, event_date: today(), severity: 'info', saisies_evitees: 2 });
    await Promise.allSettled([onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
  };

  const activitySummary = useMemo(() => {
    const active = activityRows.filter((a) => isActiveAnimalForFeeding(a));
    const sold = activityRows.filter((a) => a.status === 'vendu');
    const ready = activityRows.filter((a) => saleConfirmed(a) || a.pret_vente_recommande || readinessFor(a).recommended || computeLivingAnimalGrowthTarget(a).status === 'pret_vente');
    const almostReady = activityRows.filter((a) => readinessFor(a).targetProgress >= 90 && !ready.includes(a));
    const sick = activityRows.filter((a) => ['malade', 'sous_traitement', 'blesse'].includes(a.health_status));
    const losses = activityRows.filter((a) => ['mort', 'vole'].includes(a.status));
    const invested = activityRows.reduce((sum, a) => sum + metricsFor(a).totalCost, 0);
    const potentialCA = active.reduce((sum, a) => sum + pricingFor(a).recommendedSalePrice, 0);
    const floorCA = active.reduce((sum, a) => sum + pricingFor(a).minimumAcceptablePrice, 0);
    const expectedMargin = active.reduce((sum, a) => sum + pricingFor(a).expectedMargin, 0);
    const avgWeight = active.length ? active.reduce((sum, a) => sum + Number(a.poids || 0), 0) / active.length : 0;
    const avgDailyGain = active.length ? active.reduce((sum, a) => sum + computeLivingAnimalGrowthTarget(a).adaptiveGainPerDay, 0) / active.length : 0;
    const dueWeighings = active.filter((a) => computeLivingAnimalGrowthTarget(a).weighingDue);
    const slowGrowth = active.filter((a) => ['retard_croissance', 'poids_a_renseigner'].includes(computeLivingAnimalGrowthTarget(a).status));
    return { active, sold, ready, almostReady, sick, losses, invested, potentialCA, floorCA, expectedMargin, avgWeight, avgDailyGain, dueWeighings, slowGrowth };
  }, [activityRows]);

  const motherOptions = useMemo(() => testRows.filter((animal) => animal.sexe === 'F').map((animal) => ({ value: animal.id, label: `${animal.id} - ${animal.name || 'Femelle'}` })), [testRows]);
  const fatherOptions = useMemo(() => testRows.filter((animal) => animal.sexe === 'M').map((animal) => ({ value: animal.id, label: `${animal.id} - ${animal.name || 'Mâle'}` })), [testRows]);
  const animalFormFields = useMemo(() => insertGrowthFields(MODULE_FORM_FIELDS.animaux).map((field) => {
    if (field.key === 'mere_id') return { ...field, options: motherOptions };
    if (field.key === 'pere_id' || field.key === 'male_reproducteur_id') return { ...field, options: fatherOptions };
    return field;
  }), [motherOptions, fatherOptions]);

  const animalCreateFields = useMemo(() => [
    { key: 'section_identite', label: 'Entrée animal', type: 'section', description: 'Saisie courte : les champs intelligents sont préremplis automatiquement.' },
    { key: 'id', label: 'ID animal', type: 'text', required: true },
    { key: 'tag', label: 'Boucle / QR code', type: 'text' },
    { key: 'name', label: 'Nom / repère', type: 'text' },
    { key: 'type', label: 'Espèce', type: 'select', required: true, options: activityTabs.map((value) => ({ value, label: value })) },
    { key: 'sexe', label: 'Sexe', type: 'select', required: true, options: [{ value: 'F', label: 'Femelle' }, { value: 'M', label: 'Mâle' }] },
    { key: 'race', label: 'Race / souche', type: 'text' },
    { key: 'section_entree', label: 'Origine & entrée ferme', type: 'section' },
    { key: 'mode_acquisition', label: 'Mode d’acquisition', type: 'select', required: true, options: [{ value: 'achat', label: 'Achat' }, { value: 'naissance_ferme', label: 'Naissance ferme' }, { value: 'reproduction_interne', label: 'Reproduction interne' }, { value: 'don', label: 'Don / autre' }] },
    { key: 'date_achat', label: 'Date achat', type: 'date' },
    { key: 'date_entree_ferme', label: 'Date entrée ferme', type: 'date', required: true },
    { key: 'fournisseur_vendeur', label: 'Fournisseur / vendeur', type: 'text' },
    { key: 'business_plan_id', label: 'Business plan lié ou investissement ponctuel', type: 'text', placeholder: 'Ex: BP Horizon Farm ou investissement ponctuel' },
    { key: 'section_poids', label: 'Poids & achat', type: 'section', description: 'Le poids entrée devient le poids actuel initial. Pesée suivante : J+15.' },
    { key: 'poids_entree', label: 'Poids entrée ferme (kg)', type: 'number' },
    { key: 'date_poids_entree', label: 'Date pesée entrée', type: 'date' },
    { key: 'purchase_cost', label: 'Prix d’achat', type: 'number' },
    { key: 'section_sante', label: 'État initial', type: 'section', description: 'Les frais de santé et soins seront calculés depuis Santé.' },
    { key: 'health_status', label: 'État sanitaire initial', type: 'select', options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }, { value: 'blesse', label: 'Blessé' }] },
    { key: 'section_repro', label: 'Reproduction si connue', type: 'section' },
    { key: 'en_gestation', label: 'Femelle en gestation ?', type: 'checkbox' },
    { key: 'date_debut_gestation', label: 'Début gestation', type: 'date' },
    { key: 'date_prevue_mise_bas', label: 'Mise bas prévue', type: 'date' },
    { key: 'notes', label: 'Notes d’entrée', type: 'textarea', rows: 3, fullWidth: true },
  ], []);

  const buildModalValues = (animal = {}) => {
    const base = { ...animal, type: animal.type || activityType, date_naissance: animal.date_naissance || animal.naissance || '', poids_history_text: stringifyWeightHistory(animal), pret_vente_confirme: saleConfirmed(animal), pret_a_la_vente: saleConfirmed(animal), ready_for_sale: saleConfirmed(animal), sale_ready: saleConfirmed(animal) };
    const enriched = animal.id ? enrichAnimalEntryPayload(base) : base;
    const metrics = animal.id ? metricsFor(enriched) : { feedingCost: 0, healthCost: 0, totalCost: Number(enriched.purchase_cost || 0), margin: null };
    const living = computeLivingAnimalGrowthTarget(enriched);
    const pricing = calculateAnimalSalePricing({ animal: enriched, metrics });
    const readiness = getAnimalSaleReadiness({ animal: enriched, metrics });
    return {
      ...enriched,
      poids_history_text: stringifyWeightHistory(enriched),
      alimentation_calculee_view: fmtCurrency(metrics.feedingCost),
      frais_sante_view: fmtCurrency(metrics.healthCost),
      cout_total_calcule_view: fmtCurrency(metrics.totalCost),
      marge_calculee_view: metrics.margin === null ? 'En cours' : fmtCurrency(metrics.margin),
      sale_readiness_score: readiness.targetProgress ? `${readiness.targetProgress}% - ${saleConfirmed(enriched) ? 'confirmé' : readiness.status}` : `${living.progress || 0}% objectif vivant`,
      prix_vente_estime: enriched.prix_vente_estime || Math.round(pricing.recommendedSalePrice || 0),
      prix_minimum_acceptable: enriched.prix_minimum_acceptable || Math.round(pricing.minimumAcceptablePrice || 0),
    };
  };

  const filtered = useMemo(() => activityRows.filter((a) => {
    const passStatus = statusFilter === 'tous' || (a.status || 'actif') === statusFilter;
    const passHealth = healthFilter === 'tous' || (a.health_status || 'sain') === healthFilter;
    const living = computeLivingAnimalGrowthTarget(a);
    const passQuick = quickFilter === 'tous'
      || (quickFilter === 'prets' && (saleConfirmed(a) || a.pret_vente_recommande || readinessFor(a).recommended || living.status === 'pret_vente'))
      || (quickFilter === 'pesees' && living.weighingDue)
      || (quickFilter === 'retard' && living.status === 'retard_croissance')
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
  const referenceLiving = referenceAnimal ? computeLivingAnimalGrowthTarget(referenceAnimal) : null;

  const openWhatsApp = (animal) => {
    const url = toWhatsappLink(DEFAULT_PHONE, `Rapport animal ${animal.name || ''} (${animal.id})`);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      const prepared = preparePayload(payload);
      await onCreate(prepared);
      await syncSaleOpportunity(prepared);
      await onRefresh?.();
      toast.success('Animal ajouté avec objectif vivant et pesée J+15');
      setModal(null);
    } catch (error) { toast.error(error.message || 'Erreur création'); }
    finally { setSaving(false); }
  };

  const submitEdit = async (payload) => {
    if (!selected) return;
    try {
      setSaving(true);
      const prepared = preparePayload(payload);
      await onUpdate(selected.id, prepared);
      await syncSaleOpportunity({ ...prepared, id: selected.id });
      await onRefresh?.();
      toast.success('Animal modifié, objectif recalculé');
      setModal(null);
    } catch (error) { toast.error(error.message || 'Erreur modification'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete(selected.id); toast.success('Animal supprimé'); setModal(null); }
    catch (error) { toast.error(error.message || 'Erreur suppression'); }
    finally { setSaving(false); }
  };

  const exportRows = () => {
    const exportable = filtered.map((animal) => ({ ...animal, ...computeLivingAnimalGrowthTarget(animal) }));
    exportToCsv({ rows: exportable, fileName: `animaux-${activityType}.csv` });
    exportToExcel({ rows: exportable, fileName: `animaux-${activityType}.xlsx`, sheetName: activityType });
    exportToPdf({ rows: exportable, columns: ['id', 'tag', 'name', 'type', 'poids', 'livingTarget', 'nextWeighingDate', 'status'], fileName: `animaux-${activityType}.pdf`, title: `Liste ${activityType}` });
    toast.success('Exports générés');
  };

  const applyQuickFilter = (kind) => { setQuickFilter(kind); setStatusFilter('tous'); setHealthFilter('tous'); };

  const columns = [
    { key: 'photo_url', label: 'Photo', render: (a) => a.photo_url ? <img src={a.photo_url} alt={a.name} className="h-10 w-10 rounded-lg object-cover border border-[#d6c3a0]" /> : <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs text-emerald-400">{a.type?.[0] || 'A'}</div> },
    { key: 'tag', label: 'Tag/ID', sortable: true, render: (a) => <span className="font-mono text-emerald-400 text-xs">{a.tag || a.id}</span> },
    { key: 'name', label: 'Nom', sortable: true, render: (a) => <span className="font-semibold text-[#2f2415]">{a.name || '-'}</span> },
    { key: 'poids', label: 'Poids / objectif vivant', sortable: true, render: (a) => { const living = computeLivingAnimalGrowthTarget(a); return <span className="text-[#2f2415] font-semibold">{living.currentWeight || a.poids || 0} / {living.livingTarget || a.poids_objectif || '-'} kg</span>; } },
    { key: 'next_weighing', label: 'Prochaine pesée', render: (a) => { const living = computeLivingAnimalGrowthTarget(a); return <div><p className="font-semibold text-[#2f2415]">{living.nextWeighingDate || '-'}</p>{living.weighingDue ? <p className="text-xs text-amber-600 font-bold">à faire</p> : null}</div>; } },
    { key: 'croissance', label: 'Croissance', render: (a) => computeLivingAnimalGrowthTarget(a).status.replaceAll('_', ' ') },
    { key: 'pret_vente', label: 'Opportunité', render: (a) => opportunityBadge(a, metricsFor(a)) },
    { key: 'prix_recommande', label: 'Prix recommandé', render: (a) => fmtCurrency(calculateAnimalSalePricing({ animal: a, metrics: metricsFor(a) }).recommendedSalePrice) },
    { key: 'health_status', label: 'Santé', render: (a) => <Badge status={a.health_status || 'sain'} /> },
    { key: 'status', label: 'Statut', render: (a) => <Badge status={a.status || 'actif'} /> },
    { key: 'actions', label: 'Actions', render: (a) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(a); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(a); setModal('edit'); }} /><ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={() => openWhatsApp(a)} /><ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(a); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6">
    <SectionHeader title="Gestion des Animaux" sub="Bovins · Ovins · Caprins : poids vivant, pesée J+15, objectif révisé" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {activityType}</Btn></>} />
    <AnimalHealthBridge rows={activityRows} alimentationLogs={alimentationLogs} vaccins={vaccins} onUpdate={onUpdate} onRefresh={onRefresh} />

    <div className="grid grid-cols-3 gap-2">{activityTabs.map((tab) => <button key={tab} type="button" onClick={() => { setActivityType(tab); setStatusFilter('tous'); setHealthFilter('tous'); setQuickFilter('tous'); }} className={`rounded-2xl border px-4 py-3 text-left transition-all ${activityType === tab ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Activité</p><p className="font-black">{tab}s</p><p className="text-xs opacity-75">{testRows.filter((a) => a.type === tab).length} animaux</p></button>)}</div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <button onClick={() => applyQuickFilter('actifs')}><KpiCard icon={CheckCircle} label="Actifs" value={activitySummary.active.length} color="bg-emerald-500/20 text-emerald-400" /></button>
      <button onClick={() => applyQuickFilter('prets')}><KpiCard icon={Tag} label="Prêts vente" value={activitySummary.ready.length} color="bg-amber-500/20 text-amber-400" /></button>
      <button onClick={() => applyQuickFilter('pesees')}><KpiCard icon={AlertTriangle} label="Pesées dues" value={activitySummary.dueWeighings.length} color="bg-amber-500/20 text-amber-400" /></button>
      <button onClick={() => applyQuickFilter('retard')}><KpiCard icon={AlertTriangle} label="Retard croissance" value={activitySummary.slowGrowth.length} color="bg-red-500/20 text-red-400" /></button>
      <button onClick={() => applyQuickFilter('vendus')}><KpiCard icon={Tag} label="Vendus" value={activitySummary.sold.length} color="bg-sky-500/20 text-sky-400" /></button>
      <button onClick={() => applyQuickFilter('pertes')}><KpiCard icon={XCircle} label="Pertes" value={activitySummary.losses.length} color="bg-zinc-700/30 text-zinc-300" /></button>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MiniMetric label="Investi total" value={fmtCurrency(activitySummary.invested)} />
      <MiniMetric label="CA potentiel" value={fmtCurrency(activitySummary.potentialCA)} />
      <MiniMetric label="Marge prévue" value={fmtCurrency(activitySummary.expectedMargin)} />
      <MiniMetric label="Poids moyen" value={`${activitySummary.avgWeight.toFixed(1)} kg`} />
      <MiniMetric label="Gain moyen/jour" value={`${activitySummary.avgDailyGain.toFixed(2)} kg/j`} />
      <MiniMetric label="Pesées à faire" value={activitySummary.dueWeighings.length} danger={activitySummary.dueWeighings.length > 0} />
      <MiniMetric label="Presque prêts" value={activitySummary.almostReady.length} />
      <MiniMetric label="Croissance faible" value={activitySummary.slowGrowth.length} danger={activitySummary.slowGrowth.length > 0} />
    </div>

    {reproductionAlerts.length ? <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4"><p className="text-amber-500 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Alertes reproduction {activityType}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{reproductionAlerts.slice(0, 4).map((alert) => <div key={alert.id} className={`rounded-xl border p-3 text-sm ${alert.severity === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-amber-500/10 border-amber-500/20 text-[#7d6a4a]'}`}><p className="font-semibold">{alert.title}</p><p className="text-xs mt-1">{alert.message}</p></div>)}</div></div> : null}

    <div className="flex flex-wrap gap-3">
      <VoiceSearch value={localSearch} onChange={setLocalSearch} placeholder={`Rechercher ${activityType.toLowerCase()}...`} />
      <div className="flex flex-wrap gap-2">{statuses.map((s) => <button key={s} type="button" onClick={() => { setStatusFilter(s); setQuickFilter('tous'); }} className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${statusFilter === s && quickFilter === 'tous' ? 'bg-emerald-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456] hover:border-emerald-500'}`}>{s.replaceAll('_', ' ')}</button>)}</div>
      <div className="flex flex-wrap gap-2">{healthStatuses.map((s) => <button key={s} type="button" onClick={() => { setHealthFilter(s); setQuickFilter('tous'); }} className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${healthFilter === s && quickFilter === 'tous' ? 'bg-sky-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456] hover:border-sky-500'}`}>{s.replace('_', ' ')}</button>)}</div>
    </div>

    <DataTable title={`Liste ${activityType}s`} rows={filtered} columns={columns} loading={loading} initialSortKey="id" searchPlaceholder="Recherche table..." />

    {referenceAnimal ? <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Décision rapide - {referenceAnimal.id} {referenceAnimal.name}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[
      { label: 'Coût total', value: fmtCurrency(referenceMetrics?.totalCost || 0) },
      { label: 'Prix recommandé', value: fmtCurrency(referencePricing?.recommendedSalePrice || 0) },
      { label: 'Objectif vivant', value: `${referenceLiving?.currentWeight || 0} / ${referenceLiving?.livingTarget || '-'} kg` },
      { label: 'Prochaine pesée', value: referenceLiving?.nextWeighingDate || '-' },
      { label: 'Statut croissance', value: referenceLiving?.status?.replaceAll('_', ' ') || '-' },
      { label: 'Gain réel/jour', value: `${referenceLiving?.realGainPerDay || 0} kg/j` },
      { label: 'Gain adapté/jour', value: `${referenceLiving?.adaptiveGainPerDay || 0} kg/j` },
      { label: 'Action IA', value: referenceLiving?.action || '-' },
    ].map((c) => <div key={c.label} className="bg-[#fffdf8] rounded-xl p-3 border border-[#d6c3a0]"><div className="text-xs text-[#8a7456] mb-1">{c.label}</div><div className="text-[#2f2415] font-semibold">{c.value}</div></div>)}</div></div> : null}

    <AnimalDetailsModal open={modal === 'details'} onClose={() => setModal(null)} animal={selected} metrics={selected ? metricsFor(selected) : {}} animals={testRows} vaccins={vaccins} opportunities={opportunities} lifecycle={selected ? lifecycleFor(selected) : null} onOpenTrace={() => toast.success('Ouvre le module Traçabilité pour cette fiche')} onAddDocument={() => toast.success('Ajout document disponible depuis le module Documents')} />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={animalCreateFields} initialValues={buildModalValues(initialAnimal)} autoId={(values) => generateSequentialId('animaux', testRows, values)} uploadFolder="animaux" loading={saving} title={`Ajouter ${activityType}`} submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={animalFormFields} initialValues={selected ? buildModalValues(selected) : {}} uploadFolder="animaux" loading={saving} title="Modifier / suivre animal" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={confirmDelete} itemLabel={selected ? `${selected.name || selected.id} (${selected.id})` : ''} loading={saving} />
  </div>;
}
