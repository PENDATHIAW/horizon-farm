import { AlertTriangle, Bird, CalendarDays, Download, Edit, Eye, HeartPulse, MessageCircle, Package, Plus, RefreshCw, Receipt, Scale, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import AvicoleActivityTabs from '../components/AvicoleActivityTabs';
import DetailsModal from '../modals/DetailsModal';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId, makeId, toWhatsappLink } from '../utils/ids';
import { DEFAULT_PHONE } from '../utils/location';
import { getLotFeedingCategory } from '../utils/alimentation';
import { filterLotsByActivity, getDefaultLotForActivity, isChairLot, isPondeuseLot } from '../utils/avicoleActivity';

const BROILER_MIN_PRICE = 2500;
const BROILER_MAX_PRICE = 4000;
const BROILER_DEFAULT_PRICE = 3000;
const LAYER_MIN_PRICE = 1500;
const LAYER_MAX_PRICE = 2000;
const LAYER_DEFAULT_PRICE = 1800;
const BROILER_READY_DAYS = 30;
const BROILER_MAX_DAYS = 45;
const BROILER_READY_WEIGHT = 1.5;
const LAYER_REFORM_DAYS = 18 * 30;

const todayIso = () => new Date().toISOString().slice(0, 10);
const safeArray = (value) => Array.isArray(value) ? value : [];
const money = (value) => fmtCurrency(Number(value || 0));
const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.eggs ?? log.quantity);
const brokenCount = (log = {}) => toNumber(log.oeufs_casses ?? log.broken ?? log.casses);
const sellableEggs = (log = {}) => Math.max(0, eggCount(log) - brokenCount(log));
const trayCount = (log = {}) => toNumber(log.plateaux) || Math.floor(sellableEggs(log) / 30);

const clampPrice = (value, min, max, fallback) => {
  const n = toNumber(value);
  const base = n > 0 ? n : fallback;
  return Math.min(max, Math.max(min, base));
};
const clampBroilerPrice = (value, fallback = BROILER_DEFAULT_PRICE) => clampPrice(value, BROILER_MIN_PRICE, BROILER_MAX_PRICE, fallback);
const clampLayerPrice = (value, fallback = LAYER_DEFAULT_PRICE) => clampPrice(value, LAYER_MIN_PRICE, LAYER_MAX_PRICE, fallback);

const formatDate = (date) => {
  if (!date) return 'Non renseignée';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return parsed.toLocaleDateString('fr-FR');
};

const formatAge = (days) => {
  if (days === null || days === undefined || Number.isNaN(Number(days))) return 'Âge inconnu';
  const value = Number(days);
  if (value >= 60) return `${value} j (${Math.floor(value / 30)} mois)`;
  return `${value} j`;
};

const getAgeDays = (lot = {}) => {
  if (!lot.date_debut) return null;
  const start = new Date(lot.date_debut).getTime();
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((Date.now() - start) / 86400000));
};

const currentCount = (lot = {}) => {
  const initial = toNumber(lot.initial_count ?? lot.current_count ?? lot.effectif_actuel ?? lot.effectif_vendable);
  const losses = toNumber(lot.mortality) + toNumber(lot.vols) + toNumber(lot.vendus) + toNumber(lot.reformes) + toNumber(lot.sorties);
  return Math.max(0, initial - losses);
};

const getWeight = (lot = {}) => toNumber(lot.weight_avg ?? lot.poids_moyen);
const getWeight30 = (lot = {}) => toNumber(lot.poids_moyen_30j ?? lot.weight_day30 ?? lot.poids_30j ?? lot.poids_j30);

function suggestedBroilerPrice(lot = {}) {
  const configured = toNumber(lot.prix_vente_reel || lot.prix_vente_prevu || lot.sale_price || lot.prix_unitaire);
  if (configured > 0) return clampBroilerPrice(configured);
  const weight = getWeight(lot);
  if (weight >= 2) return 4000;
  if (weight >= 1.7) return 3500;
  if (weight >= 1.5) return 3000;
  return 2500;
}

function phaseForLot(lot = {}, metrics = {}) {
  const age = getAgeDays(lot);
  if (age === null) return { label: 'Date entrée à renseigner', value: '' };
  if (isChairLot(lot)) {
    if (age < 8) return { label: 'Démarrage', value: 'demarrage' };
    if (age < 22) return { label: 'Croissance', value: 'croissance' };
    if (age < 30) return { label: 'Finition proche', value: 'finition_proche' };
    if (age <= 45) return { label: 'Fenêtre de vente', value: 'fenetre_vente' };
    return { label: 'Âge maximum dépassé', value: 'age_max_depasse' };
  }
  if (isPondeuseLot(lot)) {
    const layingRate = toNumber(metrics.layingRate);
    if (age < 120) return { label: 'Croissance', value: 'croissance' };
    if (age < 160) return { label: 'Entrée en ponte', value: 'entree_ponte' };
    if (age < LAYER_REFORM_DAYS && layingRate >= 60) return { label: 'En ponte', value: 'en_ponte' };
    if (age < LAYER_REFORM_DAYS) return { label: 'Ponte à surveiller', value: 'ponte_a_surveiller' };
    if (layingRate >= 60 || String(lot.status || '').includes('en_ponte')) return { label: 'En ponte', value: 'en_ponte' };
    return { label: 'Fin de cycle / réforme possible', value: 'reforme_possible' };
  }
  return { label: lot.phase || lot.status || 'Suivi', value: lot.phase || lot.status || '' };
}

function feedingCostForLot(lot = {}, alimentationLogs = []) {
  const category = getLotFeedingCategory(lot);
  return safeArray(alimentationLogs)
    .filter((log) => log.type_cible === 'lot_avicole' && (log.cible_id ? log.cible_id === lot.id : log.categorie === category))
    .reduce((sum, log) => sum + toNumber(log.montant_total), 0);
}

function productionMetricsForLot(lot = {}, productionLogs = []) {
  const logs = safeArray(productionLogs).filter((log) => log.lot_id === lot.id);
  const latestDate = logs.map((log) => log.date).filter(Boolean).sort().pop();
  const latestLogs = logs.filter((log) => log.date === latestDate);
  const eggsToday = latestLogs.reduce((sum, log) => sum + eggCount(log), 0) || toNumber(lot.productionJour ?? lot.productionjour);
  const brokenToday = latestLogs.reduce((sum, log) => sum + brokenCount(log), 0) || toNumber(lot.oeufs_casses);
  const capacity = currentCount(lot);
  const validEggs = Math.min(eggsToday, capacity);
  const layingRate = capacity > 0 ? Math.min(100, (validEggs / capacity) * 100) : 0;
  return { latestDate, eggsToday, brokenToday, validEggs, layingRate };
}

function metricsForLot(lot = {}, alimentationLogs = [], productionLogs = []) {
  const count = currentCount(lot);
  const feedingCost = feedingCostForLot(lot, alimentationLogs);
  const healthCost = toNumber(lot.frais_sante ?? lot.sante);
  const otherCosts = toNumber(lot.autres_frais);
  const chickCost = toNumber(lot.cout_poussins);
  const totalCosts = feedingCost + healthCost + otherCosts + chickCost;
  const initial = toNumber(lot.initial_count ?? count);
  const mortality = toNumber(lot.mortality);
  const survivalRate = initial > 0 ? (count / initial) * 100 : 0;
  const mortalityRate = initial > 0 ? (mortality / initial) * 100 : 0;
  const production = productionMetricsForLot(lot, productionLogs);

  let unitPrice = 0;
  if (isChairLot(lot)) unitPrice = suggestedBroilerPrice(lot);
  else if (isPondeuseLot(lot)) unitPrice = clampLayerPrice(lot.prix_vente_reel || lot.prix_vente_prevu || lot.sale_price || lot.valeur_residuelle);
  else unitPrice = toNumber(lot.prix_vente_reel || lot.prix_vente_prevu || lot.sale_price);

  const grossRevenue = unitPrice * count;
  const estimatedMargin = grossRevenue - totalCosts;
  const marginPerHead = count > 0 ? estimatedMargin / count : 0;
  const costPerHead = count > 0 ? feedingCost / count : 0;
  const totalCostPerHead = count > 0 ? totalCosts / count : 0;
  const phase = phaseForLot(lot, { layingRate: production.layingRate });

  return {
    count,
    currentCount: count,
    initial,
    mortality,
    survivalRate,
    mortalityRate,
    feedingCost,
    healthCost,
    otherCosts,
    chickCost,
    totalCosts,
    costPerHead,
    totalCostPerHead,
    unitPrice,
    grossRevenue,
    estimatedMargin,
    marginPerHead,
    layingRate: production.layingRate,
    production,
    phase,
  };
}

function saleDecision(lot = {}, metrics = {}) {
  const age = getAgeDays(lot);
  const countOk = metrics.count > 0;
  const healthOk = ['sain', 'a_surveiller', 'actif', ''].includes(lot.health_status || 'sain');
  const mortalityOk = metrics.mortalityRate < 5;
  const marginOk = metrics.estimatedMargin >= 0;

  if (isChairLot(lot)) {
    const weight = getWeight(lot);
    const ageReady = age !== null && age >= BROILER_READY_DAYS;
    const ageMax = age !== null && age >= BROILER_MAX_DAYS;
    const weightReady = weight >= BROILER_READY_WEIGHT;
    const ready = countOk && healthOk && mortalityOk && marginOk && ((ageReady && weightReady) || ageMax);
    const missing = [];
    if (age === null) missing.push('date entrée');
    else if (!ageReady) missing.push(`${BROILER_READY_DAYS} jours minimum`);
    if (!weightReady && !ageMax) missing.push(`${BROILER_READY_WEIGHT} kg minimum`);
    if (!marginOk) missing.push('marge positive');
    if (!healthOk) missing.push('santé OK');
    if (!mortalityOk) missing.push('mortalité sous 5%');
    if (!countOk) missing.push('effectif disponible');
    const score = ready ? 100 : Math.round(([ageReady, weightReady || ageMax, marginOk, healthOk, mortalityOk, countOk].filter(Boolean).length / 6) * 100);
    return {
      ready,
      score,
      status: ready ? 'recommande_pret' : score >= 65 ? 'presque_pret' : 'non_pret',
      reason: ready ? `${formatAge(age)} · poids ${weight ? `${weight.toFixed(2)} kg` : 'non renseigné'} · prix ${money(metrics.unitPrice)}` : `Attendre: ${missing.join(', ')}`,
      missing,
      ageDays: age,
      label: ready ? 'Prêt à la vente' : 'À suivre',
    };
  }

  if (isPondeuseLot(lot)) {
    const phase = metrics.phase;
    const oldEnough = age !== null && age >= LAYER_REFORM_DAYS;
    const activeText = `${lot.status || ''} ${lot.phase || ''} ${phase.label || ''}`.toLowerCase();
    const activeLaying = activeText.includes('en_ponte') || activeText.includes('en ponte') || activeText.includes('entrée en ponte') || activeText.includes('entree en ponte');
    const finishing = activeText.includes('fin') || activeText.includes('reforme') || activeText.includes('réforme') || activeText.includes('baisse');
    const ready = countOk && oldEnough && !activeLaying && finishing && marginOk;
    const missing = [];
    if (age === null) missing.push('date entrée');
    else if (!oldEnough) missing.push('18 mois minimum');
    if (activeLaying) missing.push('encore en ponte');
    if (!finishing) missing.push('phase fin de cycle/réforme');
    if (!marginOk) missing.push('marge positive');
    const score = ready ? 100 : Math.round(([oldEnough, !activeLaying, finishing, marginOk, countOk].filter(Boolean).length / 5) * 100);
    return {
      ready,
      score,
      status: ready ? 'recommande_pret' : score >= 65 ? 'presque_pret' : 'non_pret',
      reason: ready ? `${phase.label} · ${formatAge(age)} · prix réforme ${money(metrics.unitPrice)}` : `Attendre: ${missing.join(', ')}`,
      missing,
      ageDays: age,
      label: ready ? 'Prêt réforme' : 'À suivre',
    };
  }

  return { ready: false, score: 0, status: 'non_pret', reason: 'Type non reconnu', missing: [], ageDays: age, label: 'À suivre' };
}

function ensureAvicoleFormFields() {
  const fields = MODULE_FORM_FIELDS.avicole || [];
  const dateDebut = fields.find((field) => field.key === 'date_debut');
  if (dateDebut) dateDebut.label = 'Date entrée poulailler';
  if (!fields.some((field) => field.key === 'age_poulailler_view')) {
    const index = Math.max(0, fields.findIndex((field) => field.key === 'date_debut'));
    fields.splice(index + 1, 0, { key: 'age_poulailler_view', label: 'Âge dans le poulailler', type: 'readonly' });
  }
  if (!fields.some((field) => field.key === 'poids_moyen_30j')) {
    const index = Math.max(0, fields.findIndex((field) => ['weight_avg', 'poids_moyen'].includes(field.key)));
    fields.splice(index + 1, 0,
      { key: 'poids_moyen_30j', label: 'Poids moyen à 30 jours (kg)', type: 'number', showWhen: (form) => form.type === 'Chair' },
      { key: 'date_pesee_30j', label: 'Date pesée 30 jours', type: 'date', showWhen: (form) => form.type === 'Chair' },
      { key: 'prix_chair_retenu_view', label: 'Prix chair retenu', type: 'readonly', showWhen: (form) => form.type === 'Chair' }
    );
  }
}

function openModule(label) {
  if (typeof document === 'undefined') return;
  const buttons = Array.from(document.querySelectorAll('nav button'));
  buttons.find((button) => button.textContent?.toLowerCase().includes(label.toLowerCase()))?.click();
}

function QuickLink({ icon: Icon, title, desc, onClick }) {
  return (
    <button type="button" onClick={onClick} className="bg-white border border-[#d6c3a0] rounded-2xl p-4 text-left hover:border-[#b6975f] transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Icon size={18} /></div>
        <div><p className="font-black text-[#2f2415]">{title}</p><p className="text-xs text-[#8a7456] mt-1">{desc}</p></div>
      </div>
    </button>
  );
}

function Metric({ label, value }) {
  return <div className="bg-[#fffdf8] rounded-xl p-3 border border-[#d6c3a0]"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-bold text-[#2f2415]">{value}</p></div>;
}

function enrichedLot(lot, alimentationLogs, productionLogs) {
  const metrics = metricsForLot(lot, alimentationLogs, productionLogs);
  const decision = saleDecision(lot, metrics);
  return { ...lot, metrics, decision };
}

function buildDailyProductionRows(logs = [], lots = []) {
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));
  const grouped = new Map();
  safeArray(logs).forEach((log) => {
    const lot = lotById.get(log.lot_id);
    if (!lot || !isPondeuseLot(lot)) return;
    const key = `${log.date || 'Sans date'}::${log.lot_id}`;
    const row = grouped.get(key) || { id: key, date: log.date || 'Sans date', lot_id: log.lot_id, lot_name: lot.name || log.lot_id, logIds: [], raw: 0, broken: 0 };
    row.logIds.push(log.id);
    row.raw += eggCount(log);
    row.broken += brokenCount(log);
    grouped.set(key, row);
  });
  return Array.from(grouped.values()).map((row) => {
    const lot = lotById.get(row.lot_id) || {};
    const capacity = currentCount(lot);
    const valid = Math.min(row.raw, capacity);
    const excess = Math.max(0, row.raw - capacity);
    const sellable = Math.max(0, row.raw - row.broken);
    const rate = capacity > 0 ? Math.min(100, (valid / capacity) * 100) : 0;
    return { ...row, lot, capacity, valid, excess, sellable, trays: Math.floor(sellable / 30), rate };
  }).sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function sumRows(rows = []) {
  const total = rows.reduce((acc, row) => {
    acc.raw += row.raw; acc.valid += row.valid; acc.excess += row.excess; acc.broken += row.broken; acc.sellable += row.sellable; acc.trays += row.trays; acc.capacity += row.capacity;
    return acc;
  }, { raw: 0, valid: 0, excess: 0, broken: 0, sellable: 0, trays: 0, capacity: 0 });
  total.rate = total.capacity > 0 ? Math.min(100, (total.valid / total.capacity) * 100) : 0;
  total.brokenRate = total.raw > 0 ? (total.broken / total.raw) * 100 : 0;
  return total;
}

export default function AvicoleFinal({
  rows = [], alimentationLogs = [], productionLogs = [], loading = false,
  onCreate, onUpdate, onDelete, onRefresh,
  onCreateProduction, onUpdateProduction, onDeleteProduction, onRefreshProduction,
  onCreateOpportunity,
}) {
  ensureAvicoleFormFields();
  const [activityType, setActivityType] = useState('Pondeuse');
  const [modal, setModal] = useState(null);
  const [productionModal, setProductionModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [selectedProduction, setSelectedProduction] = useState(null);
  const [saving, setSaving] = useState(false);

  const allRows = safeArray(rows);
  const activityRows = useMemo(() => filterLotsByActivity(allRows, activityType), [allRows, activityType]);
  const pondeuseRows = useMemo(() => filterLotsByActivity(allRows, 'Pondeuse'), [allRows]);
  const chairRows = useMemo(() => filterLotsByActivity(allRows, 'Chair'), [allRows]);
  const enrichedRows = useMemo(() => activityRows.map((lot) => enrichedLot(lot, alimentationLogs, productionLogs)), [activityRows, alimentationLogs, productionLogs]);
  const productionRows = useMemo(() => buildDailyProductionRows(productionLogs, allRows), [productionLogs, allRows]);
  const latestDate = productionRows[0]?.date || todayIso();
  const latestProduction = sumRows(productionRows.filter((row) => row.date === latestDate));
  const last7Dates = [...new Set(productionRows.map((row) => row.date))].slice(0, 7);
  const last7Production = sumRows(productionRows.filter((row) => last7Dates.includes(row.date)));
  const totalProduction = sumRows(productionRows);

  const summary = useMemo(() => {
    const items = enrichedRows;
    const totalTetes = items.reduce((sum, item) => sum + item.metrics.count, 0);
    const ca = items.reduce((sum, item) => sum + item.metrics.grossRevenue, 0);
    const margin = items.reduce((sum, item) => sum + item.metrics.estimatedMargin, 0);
    const mortality = items.reduce((sum, item) => sum + toNumber(item.mortality), 0);
    const ready = items.filter((item) => item.decision.ready).length;
    const avgWeight = items.length ? items.reduce((sum, item) => sum + getWeight(item), 0) / items.length : 0;
    return { totalTetes, ca, margin, mortality, ready, avgWeight };
  }, [enrichedRows]);

  const defaultLot = useMemo(() => getDefaultLotForActivity({ activityType, id: generateSequentialId('avicole', allRows, { type: activityType }), today: todayIso() }), [activityType, allRows]);

  const deriveLotValues = (form = {}) => {
    const age = getAgeDays(form);
    const normalized = { ...form, age_poulailler_view: formatAge(age) };
    if (isChairLot(normalized)) {
      const price = suggestedBroilerPrice(normalized);
      normalized.prix_vente_prevu = price;
      normalized.sale_price = price;
      normalized.prix_unitaire = price;
      normalized.prix_chair_retenu_view = money(price);
      normalized.duree_cycle_valeur = normalized.duree_cycle_valeur || 45;
      normalized.duree_cycle_unite = normalized.duree_cycle_unite || 'jours';
    }
    if (isPondeuseLot(normalized)) {
      const price = clampLayerPrice(normalized.prix_vente_prevu || normalized.sale_price);
      normalized.prix_vente_prevu = price;
      normalized.sale_price = price;
      normalized.duree_cycle_valeur = normalized.duree_cycle_valeur || 18;
      normalized.duree_cycle_unite = normalized.duree_cycle_unite || 'mois';
    }
    return normalized;
  };

  const prepareLotPayload = (payload = {}) => {
    if (!payload.date_debut) throw new Error('Date entrée poulailler obligatoire.');
    return deriveLotValues(payload);
  };

  const submitCreate = async (payload) => { try { setSaving(true); await onCreate?.(prepareLotPayload(payload)); toast.success('Lot ajouté'); setModal(null); } catch (e) { toast.error(e.message || 'Erreur création'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate?.(selected.id, prepareLotPayload(payload)); toast.success('Lot modifié'); setModal(null); } catch (e) { toast.error(e.message || 'Erreur modification'); } finally { setSaving(false); } };
  const submitDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete?.(selected.id); toast.success('Lot supprimé'); setModal(null); } catch (e) { toast.error(e.message || 'Erreur suppression'); } finally { setSaving(false); } };

  const deriveProductionValues = (form = {}) => {
    const lot = allRows.find((item) => item.id === form.lot_id) || {};
    const capacity = currentCount(lot);
    const produced = eggCount(form);
    const broken = brokenCount(form);
    const valid = Math.min(produced, capacity);
    return { ...form, oeufs_vendables_view: fmtNumber(Math.max(0, produced - broken)), plateaux_view: fmtNumber(Math.floor(Math.max(0, produced - broken) / 30)), taux_ponte_view: capacity > 0 ? pct((valid / capacity) * 100) : '0.0%', oeufs_a_verifier_view: fmtNumber(Math.max(0, produced - capacity)) };
  };

  const prepareProductionPayload = (payload = {}) => {
    const lot = allRows.find((item) => item.id === payload.lot_id) || {};
    const produced = eggCount(payload);
    const broken = brokenCount(payload);
    if (broken > produced) throw new Error('Les œufs cassés ne peuvent pas dépasser les œufs produits.');
    const capacity = currentCount(lot);
    const valid = Math.min(produced, capacity);
    return { ...payload, taux_ponte: capacity > 0 ? (valid / capacity) * 100 : 0, oeufs_a_verifier: Math.max(0, produced - capacity) };
  };

  const submitCreateProduction = async (payload) => { try { setSaving(true); await onCreateProduction?.(prepareProductionPayload(payload)); toast.success('Relevé ajouté'); setProductionModal(null); } catch (e) { toast.error(e.message || 'Erreur production'); } finally { setSaving(false); } };
  const submitEditProduction = async (payload) => { if (!selectedProduction) return; try { setSaving(true); await onUpdateProduction?.(selectedProduction.id, prepareProductionPayload(payload)); toast.success('Relevé modifié'); setProductionModal(null); } catch (e) { toast.error(e.message || 'Erreur modification'); } finally { setSaving(false); } };
  const submitDeleteProduction = async () => { if (!selectedProduction) return; try { setSaving(true); await onDeleteProduction?.(selectedProduction.id); toast.success('Relevé supprimé'); setProductionModal(null); } catch (e) { toast.error(e.message || 'Erreur suppression'); } finally { setSaving(false); } };

  const refreshAll = async () => { await Promise.allSettled([onRefresh?.(), onRefreshProduction?.()]); toast.success('Données avicoles actualisées'); };
  const exportRows = () => {
    const out = enrichedRows.map((item) => ({ id: item.id, name: item.name, type: item.type, date_entree: item.date_debut, age_jours: getAgeDays(item), effectif: item.metrics.count, poids_moyen: getWeight(item), prix_retenu: item.metrics.unitPrice, ca_potentiel: item.metrics.grossRevenue, couts: item.metrics.totalCosts, marge: item.metrics.estimatedMargin, pret_vente: item.decision.ready ? 'oui' : 'non', raison: item.decision.reason }));
    exportToCsv({ rows: out, fileName: `avicole-${activityType}.csv` });
    exportToExcel({ rows: out, fileName: `avicole-${activityType}.xlsx`, sheetName: activityType });
    exportToPdf({ rows: out, title: `Avicole ${activityType}`, fileName: `avicole-${activityType}.pdf` });
  };

  const createOpportunity = async (item) => {
    try {
      await onCreateOpportunity?.({ id: makeId('OPP'), opportunity_type: isChairLot(item) ? 'lot_chair' : 'pondeuse_reforme', source_type: 'lot_avicole', source_id: item.id, title: `${item.name || item.id} - opportunité de vente`, description: item.decision.reason, quantity: item.metrics.count, unit: 'tete', unit_price: item.metrics.unitPrice, estimated_value: item.metrics.grossRevenue, estimated_margin: item.metrics.estimatedMargin, score: item.decision.score, status: 'a_traiter' });
      toast.success('Opportunité créée');
    } catch (e) { toast.error(e.message || 'Création opportunité impossible'); }
  };

  const confirmReady = async (item) => {
    try {
      if (!item.decision.ready) { toast.error(item.decision.reason); return; }
      await onUpdate?.(item.id, { ...item, status: isChairLot(item) ? 'pret_a_la_vente' : 'pret_a_vendre_reforme', pret_vente_recommande: true, pret_vente_confirme: true, sale_readiness_score: item.decision.score, raison_pret_vente: item.decision.reason, prix_vente_prevu: item.metrics.unitPrice });
      toast.success('Statut prêt à vendre confirmé');
    } catch (e) { toast.error(e.message || 'Confirmation impossible'); }
  };

  const openWhatsApp = (item) => window.open(toWhatsappLink(DEFAULT_PHONE, `Lot ${item.name || item.id}: ${item.metrics.count} sujets, prix ${money(item.metrics.unitPrice)}, marge ${money(item.metrics.estimatedMargin)}.`), '_blank', 'noopener,noreferrer');

  const readyItems = enrichedRows.filter((item) => item.decision.ready);
  const defaultProductionLotId = pondeuseRows[0]?.id || '';

  return (
    <div className="space-y-6">
      <SectionHeader title="Gestion Avicole" sub="Pondeuses et poulets de chair: pilotage séparé par activité" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={refreshAll}>Refresh</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter {activityType}</Btn>{activityType === 'Pondeuse' ? <Btn icon={Plus} variant="outline" small onClick={() => setProductionModal('create')}>Production œufs</Btn> : null}<Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau lot {activityType}</Btn></>} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <QuickLink icon={Receipt} title="Ventes" desc={`${readyItems.length} lot(s) prêt(s)`} onClick={() => openModule('Ventes')} />
        <QuickLink icon={Package} title="Stock alimentation" desc="Aliment lié aux coûts et performances" onClick={() => openModule('Stock')} />
        <QuickLink icon={HeartPulse} title="Santé" desc="Soins, mortalité et vaccins" onClick={() => openModule('Sante')} />
        <QuickLink icon={Scale} title="Finances" desc="Couts, prix et marge réelle" onClick={() => openModule('Finances')} />
      </div>

      <AvicoleActivityTabs activeType={activityType} onChange={setActivityType} pondeusesCount={pondeuseRows.length} chairCount={chairRows.length} />

      {activityType === 'Pondeuse' ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><KpiCard icon={Bird} label="Pondeuses" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" /><KpiCard icon={CalendarDays} label="Âge / cycle" value={`${readyItems.length} réforme`} color="bg-sky-500/20 text-sky-400" /><KpiCard icon={TrendingUp} label="Taux ponte jour" value={pct(latestProduction.rate)} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={Bird} label="Œufs valides jour" value={fmtNumber(latestProduction.valid)} sub={latestDate} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={AlertTriangle} label="À vérifier" value={fmtNumber(totalProduction.excess)} color="bg-red-500/20 text-red-400" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><KpiCard icon={Bird} label="Chair actifs" value={fmtNumber(summary.totalTetes)} color="bg-amber-500/20 text-amber-400" /><KpiCard icon={Scale} label="Poids moyen" value={`${summary.avgWeight.toFixed(2)} kg`} color="bg-sky-500/20 text-sky-400" /><KpiCard icon={Receipt} label="CA potentiel" value={money(summary.ca)} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={TrendingUp} label="Marge estimée" value={money(summary.margin)} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={AlertTriangle} label="Prêts vente" value={fmtNumber(summary.ready)} color="bg-amber-500/20 text-amber-400" /></div>
      )}

      {readyItems.length ? <ReadyPanel items={readyItems} onCreateOpportunity={createOpportunity} /> : null}
      {activityType === 'Chair' ? <Growth30Panel items={enrichedRows} /> : <LayerCyclePanel items={enrichedRows} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {enrichedRows.map((item) => <LotCard key={item.id} item={item} onDetails={() => { setSelected(item); setModal('details'); }} onEdit={() => { setSelected(item); setModal('edit'); }} onWhatsapp={() => openWhatsApp(item)} onConfirmReady={() => confirmReady(item)} onCreateOpportunity={() => createOpportunity(item)} onDeleteClick={() => { setSelected(item); setModal('delete'); }} />)}
        {!enrichedRows.length ? <div className="lg:col-span-3 bg-white border border-dashed border-[#d6c3a0] rounded-2xl p-6 text-center text-[#8a7456]">{loading ? 'Chargement...' : `Aucun lot ${activityType}`}</div> : null}
      </div>

      <FinancialPanel items={enrichedRows} activityType={activityType} />
      {activityType === 'Pondeuse' ? <ProductionPanel rows={productionRows} latest={latestProduction} last7={last7Production} total={totalProduction} latestDate={latestDate} onAdd={() => setProductionModal('create')} onDetails={(row) => { setSelectedProduction(safeArray(productionLogs).find((log) => row.logIds.includes(log.id)) || row); setProductionModal('details'); }} onEdit={(row) => { setSelectedProduction(safeArray(productionLogs).find((log) => row.logIds.includes(log.id)) || row); setProductionModal('edit'); }} onDelete={(row) => { setSelectedProduction(safeArray(productionLogs).find((log) => row.logIds.includes(log.id)) || row); setProductionModal('delete'); }} /> : null}

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? detailData(selected) : selected} title="Détails du lot" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={MODULE_FORM_FIELDS.avicole} initialValues={deriveLotValues({ ...defaultLot, date_debut: todayIso() })} autoId={(values) => generateSequentialId('avicole', allRows, values)} deriveValues={deriveLotValues} loading={saving} title={`Ajouter un lot ${activityType}`} submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={MODULE_FORM_FIELDS.avicole} initialValues={selected ? deriveLotValues(selected) : {}} deriveValues={deriveLotValues} loading={saving} title="Modifier lot" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? `${selected.name || selected.id}` : ''} loading={saving} />

      <DetailsModal open={productionModal === 'details'} onClose={() => setProductionModal(null)} data={selectedProduction || {}} title="Détails production œufs" />
      <CreateModal open={productionModal === 'create'} onClose={() => setProductionModal(null)} onSubmit={submitCreateProduction} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={deriveProductionValues({ id: generateSequentialId('production_oeufs_logs', productionLogs), lot_id: defaultProductionLotId, date: todayIso(), oeufs_produits: 0, oeufs_casses: 0, notes: '' })} deriveValues={deriveProductionValues} loading={saving} title="Ajouter relevé production œufs" submitLabel="Ajouter" />
      <EditModal open={productionModal === 'edit'} onClose={() => setProductionModal(null)} onSubmit={submitEditProduction} fields={MODULE_FORM_FIELDS.production_oeufs_logs} initialValues={selectedProduction ? deriveProductionValues(selectedProduction) : {}} deriveValues={deriveProductionValues} loading={saving} title="Modifier production œufs" submitLabel="Enregistrer" />
      <DeleteModal open={productionModal === 'delete'} onClose={() => setProductionModal(null)} onConfirm={submitDeleteProduction} itemLabel={selectedProduction ? `${selectedProduction.date} - ${selectedProduction.lot_name || selectedProduction.lot_id}` : ''} loading={saving} />
    </div>
  );
}

function detailData(item) {
  return { ...item, date_entree_poulailler: formatDate(item.date_debut), age_poulailler: formatAge(getAgeDays(item)), effectif_actuel: item.metrics.count, phase: item.metrics.phase.label, prix_retenu: money(item.metrics.unitPrice), ca_potentiel: money(item.metrics.grossRevenue), cout_alimentation: money(item.metrics.feedingCost), cout_total: money(item.metrics.totalCosts), marge_estimee: money(item.metrics.estimatedMargin), marge_par_tete: money(item.metrics.marginPerHead), decision: item.decision.reason };
}

function ReadyPanel({ items, onCreateOpportunity }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><p className="text-xs uppercase tracking-wide text-[#8a7456]">Prêt à la vente</p><h3 className="text-lg font-black text-[#2f2415]">Lots à transformer en opportunités</h3></div><Btn icon={Receipt} variant="outline" small onClick={() => openModule('Ventes')}>Voir ventes</Btn></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{items.map((item) => <div key={item.id} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{item.name || item.id}</p><p className="text-xs text-[#8a7456] mt-1">{isChairLot(item) ? 'Chair' : 'Pondeuse'} · {item.decision.reason}</p><p className="text-xs text-[#8a7456] mt-1">Entrée: {formatDate(item.date_debut)} · {formatAge(getAgeDays(item))}</p></div><span className="text-xs font-semibold rounded-full px-2 py-1 bg-emerald-100 text-emerald-700">Prêt</span></div><div className="grid grid-cols-4 gap-2 mt-3 text-xs"><div><p className="text-[#8a7456]">Effectif</p><p className="font-bold text-[#2f2415]">{fmtNumber(item.metrics.count)}</p></div><div><p className="text-[#8a7456]">Prix</p><p className="font-bold text-[#2f2415]">{money(item.metrics.unitPrice)}</p></div><div><p className="text-[#8a7456]">Score</p><p className="font-bold text-[#2f2415]">{item.decision.score}%</p></div><div><p className="text-[#8a7456]">Marge/tête</p><p className="font-bold text-[#2f2415]">{money(item.metrics.marginPerHead)}</p></div></div><div className="mt-3"><Btn icon={TrendingUp} small onClick={() => onCreateOpportunity(item)}>Créer opportunité</Btn></div></div>)}</div></div>;
}

function LotCard({ item, onDetails, onEdit, onWhatsapp, onConfirmReady, onCreateOpportunity, onDeleteClick }) {
  const phaseText = isChairLot(item) ? `${item.metrics.phase.label} · ${getWeight(item) ? `${getWeight(item).toFixed(2)} kg` : 'poids à renseigner'}` : item.metrics.phase.label;
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#8a7456]">{item.type}</p><h3 className="text-lg font-black text-[#2f2415]">{item.name || item.id}</h3><p className="text-xs text-[#8a7456]">Entrée: {formatDate(item.date_debut)} · {formatAge(getAgeDays(item))}</p></div><Badge status={item.decision.ready ? (isChairLot(item) ? 'pret_a_la_vente' : 'pret_a_vendre_reforme') : item.status || item.metrics.phase.value || 'actif'} /></div><div className="grid grid-cols-2 gap-3 text-sm"><Metric label="Effectif" value={fmtNumber(item.metrics.count)} /><Metric label="Survie" value={pct(item.metrics.survivalRate)} /><Metric label="Prix retenu" value={money(item.metrics.unitPrice)} /><Metric label="Marge/tête" value={money(item.metrics.marginPerHead)} /></div><div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="text-xs text-[#8a7456]">Décision commerciale</p><p className="text-sm font-semibold text-[#2f2415]">{item.decision.label}</p><p className="text-xs text-[#8a7456] mt-1">{phaseText}</p><p className="text-xs text-[#8a7456] mt-1">{item.decision.reason}</p></div><div className="flex flex-wrap gap-1"><ActionIconButton icon={Eye} title="Voir fiche" color="sky" onClick={onDetails} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={onEdit} /><ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={onWhatsapp} /><ActionIconButton icon={TrendingUp} title="Confirmer prêt vente" color="emerald" onClick={onConfirmReady} /><ActionIconButton icon={Plus} title="Créer opportunité" color="sky" onClick={onCreateOpportunity} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={onDeleteClick} /></div></div>;
}

function Growth30Panel({ items }) {
  if (!items.length) return null;
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Bird size={18} /></div><div><p className="font-black text-[#2f2415]">Suivi croissance J30</p><p className="text-xs text-[#8a7456]">À 30 jours, le poids moyen permet de décider si on vend ou si on attend.</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{items.map((item) => { const weight30 = getWeight30(item); const age = getAgeDays(item); const missing = age !== null && age >= 30 && weight30 <= 0; return <div key={item.id} className={`border rounded-xl p-3 ${missing ? 'border-amber-300 bg-amber-50/60' : 'border-[#d6c3a0] bg-[#fffdf8]'}`}><p className="font-semibold text-[#2f2415]">{item.name || item.id}</p><p className="text-xs text-[#8a7456] mt-1">Entrée: {formatDate(item.date_debut)} · {formatAge(age)}</p><p className="text-xs text-[#8a7456]">Poids actuel: {getWeight(item) ? `${getWeight(item).toFixed(2)} kg` : '-'} · J30: {weight30 ? `${weight30.toFixed(2)} kg` : 'à renseigner'}</p></div>; })}</div></div>;
}

function LayerCyclePanel({ items }) {
  if (!items.length) return null;
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-start gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-[#e8f7ef] text-emerald-600 flex items-center justify-center"><CalendarDays size={18} /></div><div><p className="font-black text-[#2f2415]">Cycle pondeuses</p><p className="text-xs text-[#8a7456]">Pas de vente si le lot est encore en ponte. Réforme uniquement en fin de cycle.</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{items.map((item) => <div key={item.id} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="font-semibold text-[#2f2415]">{item.name || item.id}</p><p className="text-xs text-[#8a7456] mt-1">Entrée: {formatDate(item.date_debut)} · {formatAge(getAgeDays(item))}</p><p className="text-xs text-[#8a7456]">Phase: {item.metrics.phase.label}</p></div>)}</div></div>;
}

function FinancialPanel({ items, activityType }) {
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Prix, coûts et marge {activityType}</p><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{items.map((item) => <div key={`finance-${item.id}`} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="font-semibold text-[#2f2415]">{item.name || item.id}</p><p className="text-xs text-[#8a7456] mt-1">Prix retenu: {money(item.metrics.unitPrice)}</p><p className="text-xs text-[#8a7456]">CA potentiel: {money(item.metrics.grossRevenue)}</p><p className="text-xs text-[#8a7456]">Coûts: {money(item.metrics.totalCosts)}</p><p className={`text-xs font-semibold ${item.metrics.estimatedMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Marge: {money(item.metrics.estimatedMargin)} · {money(item.metrics.marginPerHead)}/tête</p></div>)}</div></div>;
}

function ProductionPanel({ rows, latest, last7, total, latestDate, onAdd, onDetails, onEdit, onDelete }) {
  const recap = [['Jour courant', fmtNumber(latest.valid), latestDate], ['Taux jour', pct(latest.rate), ''], ['Moyenne 7j', pct(last7.rate), ''], ['Total œufs', fmtNumber(total.raw), 'Depuis le début'], ['Vendables', fmtNumber(total.sellable), 'Cumul'], ['À vérifier', fmtNumber(total.excess), '']];
  return <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex items-center justify-between gap-3 mb-4"><div><p className="font-semibold text-[#2f2415]">Journal production œufs</p><p className="text-xs text-[#8a7456]">Calcul journalier par lot.</p></div><Btn icon={Plus} small onClick={onAdd}>Ajouter relevé</Btn></div><div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">{recap.map(([label, value, sub]) => <div key={label} className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3"><p className="text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] mt-1">{value}</p>{sub ? <p className="text-[11px] text-[#8a7456] mt-1">{sub}</p> : null}</div>)}</div><div className="overflow-x-auto border border-[#d6c3a0] rounded-xl"><table className="w-full text-sm"><thead><tr className="bg-[#fffdf8] border-b border-[#d6c3a0]">{['Date', 'Lot', 'Effectif', 'Œufs saisis', 'Valides', 'À vérifier', 'Cassés', 'Vendables', 'Taux', 'Actions'].map((head) => <th key={head} className="text-left text-xs font-semibold text-[#8a7456] uppercase tracking-wide px-3 py-3">{head}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className={`border-b border-[#d6c3a0]/60 hover:bg-[#fffdf8] ${row.excess > 0 ? 'bg-red-50/60' : ''}`}><td className="px-3 py-3 text-[#2f2415]">{row.date}</td><td className="px-3 py-3 text-[#2f2415] font-semibold">{row.lot_name}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.capacity)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.raw)}</td><td className="px-3 py-3 text-emerald-600 font-semibold">{fmtNumber(row.valid)}</td><td className="px-3 py-3 text-red-600 font-semibold">{fmtNumber(row.excess)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.broken)}</td><td className="px-3 py-3 text-[#2f2415]">{fmtNumber(row.sellable)}</td><td className="px-3 py-3 text-[#2f2415]">{pct(row.rate)}</td><td className="px-3 py-3"><div className="flex gap-1"><ActionIconButton icon={Eye} title="Détails" color="sky" onClick={() => onDetails(row)} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => onEdit(row)} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => onDelete(row)} /></div></td></tr>)}{!rows.length ? <tr><td colSpan={10} className="px-3 py-8 text-center text-[#8a7456]">Aucun relevé production œufs.</td></tr> : null}</tbody></table></div></div>;
}
