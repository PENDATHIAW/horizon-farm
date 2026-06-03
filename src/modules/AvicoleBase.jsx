import { Download, Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { dispatchBpLineCompleted, mergeBpDraftIntoInitial } from '../utils/bpLineConcretization';
import toast from 'react-hot-toast';
import useWorkflowSubmit from '../hooks/useWorkflowSubmit';
import { runEggProductionSideEffects } from '../utils/livestockSideEffects';
import ActionIconButton from '../components/ActionIconButton';
import AvicoleLotDetailsModal from '../components/AvicoleLotDetailsModal';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import EditModal from '../modals/EditModal';
import { applyAvicoleDecisionDefaults, buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { addDays, addMonths, enrichAvicoleFieldsForDecision } from '../utils/decisionFormFields';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { calculateLotMetrics } from '../utils/businessCalculations';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import { avicoleActiveCount, avicoleCalculatedActiveCount, avicoleDeadCount, avicoleExitReason, avicoleHasActiveBirds, avicoleHasCountMismatch, avicoleInitialCount, avicoleOtherExitCount, avicoleRegisteredActiveCount, avicoleSickCount, avicoleSoldCount, avicoleStatusFor } from '../utils/avicoleMetrics';
import { getResponsibleOptions, resolveResponsibleLabel } from '../utils/rhDirectory';
import useCrudModule from '../hooks/useCrudModule';
import { buildEggProductionPayload, syncEggStockFromLogs } from '../services/livestockStockBridge';

const EGGS_PER_TABLET = 30;
const DEFAULT_SALE_TARGET_WEIGHT = 1.5;
const DEFAULT_CHAIR_WEIGHING_DAYS = 15;
const DEFAULT_LAYER_WEIGHING_DAYS = 0;
const DEFAULT_CHICK_CRATE_SIZE = 50;
const DEFAULT_CHICK_CRATE_PRICE = 32000;
const today = () => new Date().toISOString().slice(0, 10);
const tabletsFromEggs = (eggs = 0) => ({ tablettes: Math.floor(Math.max(0, toNumber(eggs)) / EGGS_PER_TABLET), oeufs_restants: Math.max(0, toNumber(eggs)) % EGGS_PER_TABLET });
const phaseOptions = [
  { value: 'Croissance', label: 'Croissance' },
  { value: 'Production', label: 'Production' },
  { value: 'En ponte', label: 'En ponte' },
  { value: 'Baisse ponte', label: 'Baisse ponte' },
  { value: 'Finition / vente possible', label: 'Finition / vente possible' },
  { value: 'Fin de ponte / réforme', label: 'Fin de ponte / réforme' },
  { value: 'Réforme', label: 'Réforme' },
];

const activeCount = avicoleActiveCount;
const deadCount = avicoleDeadCount;
const sickCount = avicoleSickCount;
const initialCount = avicoleInitialCount;
const soldCount = avicoleSoldCount;
const exitCount = avicoleOtherExitCount;
const registeredCount = avicoleRegisteredActiveCount;
const calculatedCount = avicoleCalculatedActiveCount;
const hasActiveBirds = avicoleHasActiveBirds;
const statusFor = avicoleStatusFor;
const entryWeight = (lot = {}) => toNumber(lot.poids_moyen_entree ?? lot.weight_entry);
const latestWeight = (lot = {}) => toNumber(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.average_weight);
const targetWeight = (lot = {}) => toNumber(lot.poids_objectif_vente ?? lot.objectif_poids_moyen ?? lot.target_weight ?? lot.poids_objectif ?? DEFAULT_SALE_TARGET_WEIGHT) || DEFAULT_SALE_TARGET_WEIGHT;
const purchaseTotalOf = (lot = {}) => toNumber(lot.cout_total_achat ?? lot.cout_achat_bande ?? lot.purchase_cost ?? lot.cout_poussins ?? lot.cout_achat);
const purchaseUnitOf = (lot = {}) => toNumber(lot.prix_unitaire_sujet ?? lot.unit_cost ?? lot.cout_unitaire_poussin);
const activityToTab = (activity) => activity === 'chair' || activity === 'Chair' ? 'Chair' : 'Pondeuse';
const weighingDaysFor = (type) => type === 'Chair' ? DEFAULT_CHAIR_WEIGHING_DAYS : DEFAULT_LAYER_WEIGHING_DAYS;

function ageDays(lot = {}) { const start = lot.date_debut || lot.entry_date || lot.date_entree; if (!start) return 0; return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000)); }
function ageMonths(lot = {}) { return Math.floor(ageDays(lot) / 30.44); }
function exitReasonLabel(lot = {}) { const map = { vendu: 'Vendu', vendu_partiellement: 'Vendu partiellement', perdu_mortalite: 'Perdu · mortalité', perdu_vol: 'Perdu · vol', abattu: 'Abattu / transformé', reforme: 'Réformé', sorti_autre: 'Sorti autre', sortie_non_renseignee: 'Sortie à renseigner' }; return map[avicoleExitReason(lot)] || map[statusFor(lot)] || statusFor(lot); }
function phaseFor(lot = {}) { if (!hasActiveBirds(lot)) return exitReasonLabel(lot); if (lot.phase && lot.phase !== 'Clôturé' && lot.phase !== 'Cloture') return lot.phase; const age = ageDays(lot); if (lot.type === 'Chair') return age >= 35 && latestWeight(lot) >= targetWeight(lot) ? 'Finition / vente possible' : 'Croissance'; if (ageMonths(lot) >= 18) return 'Fin de ponte / réforme'; if (ageMonths(lot) >= 17) return 'Baisse ponte'; if (age >= 150) return 'En ponte'; return 'Croissance'; }
function decisionColor(decision = {}) { if (decision.priority === 'haute') return 'red'; if (decision.priority === 'moyenne') return 'amber'; return 'gray'; }
function computePurchaseFields(payload = {}, existing = {}) { const initial = Math.max(0, toNumber(payload.initial_count ?? payload.effectif_initial ?? existing.initial_count ?? existing.effectif_initial)); const crateSize = toNumber(payload.poussins_par_caisse ?? existing.poussins_par_caisse) || DEFAULT_CHICK_CRATE_SIZE; const cratePrice = toNumber(payload.prix_caisse_poussins ?? payload.cout_caisse_poussins ?? existing.prix_caisse_poussins ?? existing.cout_caisse_poussins) || DEFAULT_CHICK_CRATE_PRICE; const totalInput = toNumber(payload.cout_total_achat ?? payload.cout_achat_bande ?? payload.purchase_cost ?? payload.cout_poussins ?? payload.cout_achat); const unitInput = toNumber(payload.prix_unitaire_sujet ?? payload.unit_cost ?? payload.cout_unitaire_poussin); const defaultUnit = crateSize > 0 ? cratePrice / crateSize : DEFAULT_CHICK_CRATE_PRICE / DEFAULT_CHICK_CRATE_SIZE; const unit = totalInput > 0 && initial > 0 ? totalInput / initial : unitInput > 0 ? unitInput : defaultUnit; const total = totalInput > 0 ? totalInput : initial > 0 ? unit * initial : 0; return { initial, crateSize, cratePrice, unit: Number(unit.toFixed(2)), total: Number(total.toFixed(0)) }; }

export default function AvicoleBase({ rows = [], alimentationLogs = [], productionLogs = [], opportunities = [], salesOrders = [], payments = [], transactions = [], businessEvents = [], loading, onCreate, onUpdate, onDelete, onRefresh, onCreateProduction, onRefreshProduction, onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents, onNavigate, activity = 'pondeuse', lockActivity = false, hideEggCapture = false }) {
  const [tab, setTab] = useState(activityToTab(activity));
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [bpCreateDraft, setBpCreateDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const { submit: workflowSubmit, busy: workflowBusy } = useWorkflowSubmit();
  const isSaving = saving || workflowBusy;

  useEffect(() => { setTab(activityToTab(activity)); }, [activity, lockActivity]);

  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module !== 'avicole') return;
      if (!['lot_create', 'bp_concretization'].includes(draft?.form_type)) return;
      const fields = draft?.draft_fields || {};
      const lotTab = fields.type === 'Chair' || fields.type_lot === 'chair' ? 'Chair' : 'Pondeuse';
      setTab(lotTab);
      setBpCreateDraft(fields);
      setModal('create');
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);

  const filteredByActivity = useMemo(() => filterLotsByActivity(rows, tab), [rows, tab]);
  const activeLots = useMemo(() => filteredByActivity.filter(hasActiveBirds), [filteredByActivity]);
  const inactiveLots = useMemo(() => filteredByActivity.filter((lot) => !hasActiveBirds(lot)), [filteredByActivity]);
  const pondeusesDisponibles = useMemo(() => rows.filter((lot) => lot.type === 'Pondeuse' && hasActiveBirds(lot)), [rows]);
  const lots = activeLots;
  const totalEffectif = lots.reduce((sum, lot) => sum + activeCount(lot), 0);
  const morts = lots.reduce((sum, lot) => sum + deadCount(lot), 0);
  const malades = lots.reduce((sum, lot) => sum + sickCount(lot), 0);
  const decisions = useMemo(() => lots.map((lot) => buildAvicoleLotDecision(lot, productionLogs)), [lots, productionLogs]);
  const actionsIa = decisions.filter((decision) => decision.priority === 'haute').length;
  const aReformer = lots.filter((lot) => lot.type === 'Pondeuse' && ageMonths(lot) >= 17).length;
  const lotsPretsVenteChair = decisions.filter((decision) => decision.type === 'chair' && (decision.status === 'pret_vente' || Number(decision.progress || 0) >= 90)).length;
  const peseesDuesChair = decisions.filter((decision) => decision.type === 'chair' && decision.status === 'pesee_due').length;
  const chairKpiLabel = lotsPretsVenteChair > 0 ? 'Prêts vente' : 'Pesées dues';
  const chairKpiValue = lotsPretsVenteChair > 0 ? lotsPretsVenteChair : peseesDuesChair;
  const coutAlim = lots.reduce((sum, lot) => sum + calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs }).feedingCost, 0);
  const coutAchat = lots.reduce((sum, lot) => sum + purchaseTotalOf(lot), 0);
  const responsibleOptions = useMemo(() => getResponsibleOptions({ moduleKey: 'avicole' }), []);

  const createFields = useMemo(() => [
    { key: 'section_initiale', label: tab === 'Pondeuse' ? 'Entrée lot pondeuses' : 'Entrée lot poulets de chair', type: 'section', description: 'Saisie courte. Les champs de suivi, santé, alimentation, ponte, réforme et projections sont préremplis puis suivis dans la fiche.' },
    { key: 'id', label: 'Identifiant lot', type: 'text', required: true },
    { key: 'name', label: 'Nom du lot', type: 'text', required: true },
    { key: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'Pondeuse', label: 'Pondeuse' }, { value: 'Chair', label: 'Poulet de chair' }] },
    { key: 'date_debut', label: 'Date d’entrée / démarrage', type: 'date', required: true },
    { key: 'initial_count', label: 'Effectif initial', type: 'number', required: true },
    { key: 'section_achat', label: 'Achat / fournisseur', type: 'section', description: 'Coût d’achat seulement. Alimentation et santé seront calculées depuis les journaux liés.' },
    { key: 'cout_total_achat', label: 'Coût total achat bande', type: 'number' },
    { key: 'prix_unitaire_sujet', label: 'Prix unitaire sujet', type: 'number' },
    { key: 'fournisseur_poussins', label: 'Fournisseur', type: 'text' },
    ...(tab === 'Chair' ? [
      { key: 'section_chair', label: 'Démarrage chair', type: 'section', description: 'Le poids objectif vente est prérempli et ajustable. Les pesées sont espacées de 15 jours avec rappel J-1.' },
      { key: 'poids_moyen_entree', label: 'Poids moyen entrée si connu (kg)', type: 'number' },
    ] : [
      { key: 'section_pondeuse', label: 'Démarrage pondeuses', type: 'section', description: 'Pas de pesée périodique : suivi par ponte, tablettes, casses, ventes d’œufs et réforme.' },
      { key: 'age_entree_jours', label: 'Âge entrée estimé si connu (jours)', type: 'number' },
    ]),
    { key: 'notes', label: 'Notes initiales', type: 'textarea', rows: 3, fullWidth: true },
  ], [tab]);

  const editFields = useMemo(() => {
    const base = enrichAvicoleFieldsForDecision(MODULE_FORM_FIELDS.avicole || []);
    const purchaseFields = [
      { key: 'section_achat_bande', label: 'Achat de la bande', type: 'section', description: 'Coûts, fournisseur et prix unitaire.' },
      { key: 'cout_total_achat', label: 'Coût total achat bande', type: 'number' },
      { key: 'prix_unitaire_sujet', label: 'Coût unitaire sujet', type: 'number' },
      { key: 'poussins_par_caisse', label: 'Sujets par caisse', type: 'number' },
      { key: 'prix_caisse_poussins', label: 'Prix caisse poussins', type: 'number' },
      { key: 'fournisseur_poussins', label: 'Fournisseur poussins', type: 'text' },
    ];
    return base.flatMap((field) => { if (field.key === 'initial_count') return [field, ...purchaseFields]; if (field.key === 'phase') return [{ ...field, type: 'select', options: phaseOptions }]; return [field]; });
  }, []);

  const eggFields = useMemo(() => [
    { key: 'section_ramassage', label: 'Ramassage œufs', type: 'section', description: 'Les œufs vendables sont convertis automatiquement en tablettes de 30 œufs.' },
    { key: 'lot_id', label: 'Lot pondeuse', type: 'select', required: true, options: pondeusesDisponibles.map((lot) => ({ value: lot.id, label: `${lot.name || lot.id} · ${fmtNumber(activeCount(lot))} actifs` })) },
    { key: 'date', label: 'Date ramassage', type: 'date', required: true },
    { key: 'heure_ramassage', label: 'Heure ramassage', type: 'text' },
    { key: 'oeufs_produits', label: 'Œufs ramassés', type: 'number', required: true },
    { key: 'oeufs_casses', label: 'Œufs cassés / abîmés', type: 'number' },
    { key: 'responsable', label: 'Responsable ramassage', type: 'select', required: true, options: responsibleOptions },
    { key: 'notes', label: 'Notes ramassage', type: 'text', fullWidth: true },
  ], [pondeusesDisponibles, responsibleOptions]);

  const initialLot = useMemo(() => {
    const type = tab;
    const id = generateSequentialId('avicole', rows, { type });
    const start = today();
    const weighingDays = weighingDaysFor(type);
    return applyAvicoleDecisionDefaults({ id, name: `${id} ${type}`, type, status: 'actif', health_status: 'sain', phase: type === 'Chair' ? 'Croissance' : 'Production', date_debut: start, entry_date: start, initial_count: type === 'Pondeuse' ? 4000 : 200, mortality: 0, malades: 0, cout_total_achat: 0, prix_unitaire_sujet: type === 'Pondeuse' ? 900 : DEFAULT_CHICK_CRATE_PRICE / DEFAULT_CHICK_CRATE_SIZE, poussins_par_caisse: DEFAULT_CHICK_CRATE_SIZE, prix_caisse_poussins: DEFAULT_CHICK_CRATE_PRICE, poids_moyen_entree: 0, poids_objectif_vente: DEFAULT_SALE_TARGET_WEIGHT, poids_moyen_actuel: 0, date_pesee_entree: type === 'Chair' ? start : '', date_derniere_pesee: '', frequence_pesee_jours: weighingDays, date_prochaine_pesee_recommandee: type === 'Chair' ? addDays(start, weighingDays) : '', rappel_pesee: type === 'Chair' ? addDays(addDays(start, weighingDays), -1) : '', date_rappel_pesee: type === 'Chair' ? addDays(addDays(start, weighingDays), -1) : '', duree_cycle_unite: type === 'Chair' ? 'jours' : 'mois', duree_cycle_valeur: type === 'Chair' ? 45 : 18, age_reforme_recommandee_mois: 17, age_reforme_cible_mois: 18, date_debut_reforme_recommandee: type === 'Pondeuse' ? addMonths(start, 17) : '', date_reforme_cible: type === 'Pondeuse' ? addMonths(start, 18) : '', objectif_ponte_pct: type === 'Pondeuse' ? 80 : '' }, {}, productionLogs);
  }, [rows, tab, productionLogs]);

  const initialEggEntry = useMemo(() => ({ id: `PROD-${Date.now()}`, lot_id: pondeusesDisponibles[0]?.id || '', date: today(), heure_ramassage: '', oeufs_produits: '', oeufs_casses: 0, responsable: responsibleOptions[0]?.value || 'TEAM-AVICOLE', notes: '' }), [pondeusesDisponibles, responsibleOptions]);

  const prepareLot = (payload, existing = {}) => {
    const base = { ...existing, ...payload };
    const current = activeCount(base);
    const isNewLot = !existing?.id;
    const purchase = computePurchaseFields(payload, existing);
    const savedEntryWeight = entryWeight(existing);
    const enteredEntryWeight = toNumber(payload.poids_moyen_entree ?? payload.weight_entry);
    const enteredCurrentWeight = toNumber(payload.poids_moyen_actuel ?? payload.last_weight_avg ?? payload.weight_avg ?? payload.average_weight);
    const lotType = payload.type || existing.type || tab;
    const nextEntryWeight = lotType === 'Chair' ? (savedEntryWeight > 0 ? savedEntryWeight : enteredEntryWeight > 0 ? enteredEntryWeight : isNewLot ? enteredCurrentWeight : 0) : 0;
    const nextCurrentWeight = lotType === 'Chair' ? (enteredCurrentWeight > 0 ? enteredCurrentWeight : nextEntryWeight) : 0;
    const nextTargetWeight = lotType === 'Chair' ? targetWeight({ ...existing, ...payload, poids_objectif_vente: payload.poids_objectif_vente || existing.poids_objectif_vente || DEFAULT_SALE_TARGET_WEIGHT }) : 0;
    const entryDate = lotType === 'Chair' ? (existing.date_pesee_entree || payload.date_pesee_entree || payload.date_debut || payload.entry_date || today()) : '';
    const currentDate = lotType === 'Chair' ? (payload.date_derniere_pesee || existing.date_derniere_pesee || '') : '';
    const weighingFrequency = weighingDaysFor(lotType) || toNumber(payload.frequence_pesee_jours ?? existing.frequence_pesee_jours) || 0;
    const start = payload.date_debut || payload.entry_date || existing.date_debut || existing.entry_date || today();
    const nextWeighing = lotType === 'Chair' ? (payload.date_prochaine_pesee_recommandee || (currentDate ? addDays(currentDate, weighingFrequency) : addDays(start, weighingFrequency))) : '';
    const reformStartMonth = toNumber(payload.age_reforme_recommandee_mois ?? existing.age_reforme_recommandee_mois) || 17;
    const reformTargetMonth = toNumber(payload.age_reforme_cible_mois ?? existing.age_reforme_cible_mois) || 18;
    const nextBase = { ...base, current_count: current, effectif_actuel: current };
    const prepared = { ...payload, type: lotType, initial_count: purchase.initial || toNumber(payload.initial_count), effectif_initial: purchase.initial || toNumber(payload.initial_count), current_count: current, effectif_actuel: current, cout_total_achat: purchase.total, cout_achat_bande: purchase.total, purchase_cost: purchase.total, cout_poussins: purchase.total, prix_unitaire_sujet: purchase.unit, unit_cost: purchase.unit, cout_unitaire_poussin: purchase.unit, poussins_par_caisse: purchase.crateSize, prix_caisse_poussins: purchase.cratePrice, weight_entry: nextEntryWeight, poids_moyen_entree: nextEntryWeight, poids_objectif_vente: nextTargetWeight, poids_objectif: nextTargetWeight, objectif_poids_moyen: nextTargetWeight, target_weight: nextTargetWeight, weight_avg: nextCurrentWeight, average_weight: nextCurrentWeight, last_weight_avg: nextCurrentWeight, poids_moyen_actuel: nextCurrentWeight, date_pesee_entree: entryDate, date_derniere_pesee: currentDate, frequence_pesee_jours: weighingFrequency, date_prochaine_pesee_recommandee: nextWeighing, rappel_pesee: lotType === 'Chair' && nextWeighing ? addDays(nextWeighing, -1) : '', date_rappel_pesee: lotType === 'Chair' && nextWeighing ? addDays(nextWeighing, -1) : '', age_reforme_recommandee_mois: reformStartMonth, age_reforme_cible_mois: reformTargetMonth, date_debut_reforme_recommandee: lotType === 'Pondeuse' ? (payload.date_debut_reforme_recommandee || addMonths(start, reformStartMonth)) : '', date_reforme_cible: lotType === 'Pondeuse' ? (payload.date_reforme_cible || addMonths(start, reformTargetMonth)) : '', status: current <= 0 ? avicoleExitReason(nextBase) : statusFor(nextBase), phase: current <= 0 ? exitReasonLabel(nextBase) : (payload.phase || phaseFor({ ...payload, current_count: current, poids_moyen_actuel: nextCurrentWeight, poids_objectif_vente: nextTargetWeight, date_debut: start })), date_debut: start, entry_date: payload.entry_date || payload.date_debut || existing.entry_date || existing.date_debut || today() };
    return applyAvicoleDecisionDefaults(prepared, existing, productionLogs);
  };

  const submitCreate = async (payload) => {
    try {
      setSaving(true);
      const prepared = prepareLot(payload);
      await onCreate?.(prepared);
      if (prepared.bp_line_id) {
        dispatchBpLineCompleted({
          bp_line_id: prepared.bp_line_id,
          assetModule: 'avicole',
          assetId: prepared.id,
          amount: purchaseTotalOf(prepared) || prepared.cout_total_achat || prepared.purchase_cost,
          date: prepared.date_debut || prepared.entry_date || today(),
          source: 'avicole_lot_create',
        });
      }
      toast.success('Lot avicole ajouté avec suivi prérempli');
      setModal(null);
      setBpCreateDraft(null);
    } catch (e) {
      toast.error(e.message || 'Création impossible');
    } finally {
      setSaving(false);
    }
  };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate?.(selected.id, prepareLot(payload, selected)); toast.success('Lot mis à jour'); setModal(null); await onRefresh?.(); } catch (e) { toast.error(e.message || 'Modification impossible'); } finally { setSaving(false); } };
  const confirmDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete?.(selected.id); toast.success('Lot supprimé'); setModal(null); await onRefresh?.(); } catch (e) { toast.error(e.message || 'Suppression impossible'); } finally { setSaving(false); } };
  const submitEggEntry = async (payload) => { const lot = pondeusesDisponibles.find((item) => item.id === payload.lot_id); if (!lot) return toast.error('Choisir un lot pondeuse actif'); const eggCount = toNumber(payload.oeufs_produits); const brokenCount = Math.max(0, toNumber(payload.oeufs_casses)); if (eggCount <= 0) return toast.error('Saisir un nombre d’œufs supérieur à 0'); if (brokenCount > eggCount) return toast.error('Les casses ne peuvent pas dépasser les œufs ramassés'); const sellableEggs = Math.max(0, eggCount - brokenCount); const tablet = tabletsFromEggs(sellableEggs); try { const eggKey = `egg-production:${lot.id}:${payload.date || today()}`; const result = await workflowSubmit(eggKey, async () => { const productionResult = await runEggProductionSideEffects({ lot, payload: { ...payload, lot_id: lot.id, lot_name: lot.name || lot.id, date: payload.date || today(), oeufs_produits: eggCount, oeufs_casses: brokenCount, oeufs_vendables: sellableEggs, tablettes: tablet.tablettes, tablettes_vendables: tablet.tablettes, plateaux: tablet.tablettes, oeufs_restants: tablet.oeufs_restants, oeufs_reliquat: tablet.oeufs_restants, oeufs_par_tablette: EGGS_PER_TABLET, unite_vente: 'tablette', responsable_label: resolveResponsibleLabel(payload.responsable), module_lie: 'avicole', related_id: lot.id, source_module: 'avicole', type_evenement: 'ramassage_oeufs' }, existingLogs: productionLogs || [], handlers: { onCreateProduction } }); if (productionResult.skipped) { toast.success('Ramassage déjà enregistré pour ce lot et cette date'); setModal(null); return; } await onRefreshProduction?.(); toast.success(`${tablet.tablettes} tablette(s) vendable(s) · ${tablet.oeufs_restants} œuf(s) restants`); setModal(null); }); if (result?.skipped && result.reason === 'in_flight') return; } catch (e) { toast.error(e.message || 'Ajout ramassage impossible'); } };
  const exportRows = () => { const fileName = `avicole-${tab.toLowerCase()}`; const exportableRows = filteredByActivity.map((lot) => { const decision = buildAvicoleLotDecision(lot, productionLogs); const metrics = calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs }); return { ...lot, effectif_actuel_calcule: activeCount(lot), cout_achat_calcule: purchaseTotalOf(lot), cout_unitaire_calcule: purchaseUnitOf(lot), poids_moyen_actuel_calcule: latestWeight(lot), poids_objectif_vente_calcule: targetWeight(lot), tablettes_vendables_calculees: metrics.eggMetrics?.totalTablets || 0, oeufs_restants_calculees: metrics.eggMetrics?.totalRemainingEggs || 0, statut_calcule: statusFor(lot), decision_ia_calculee: decision.decision, priorite_ia_calculee: decision.priority }; }); exportToCsv({ rows: exportableRows, columns: ['id', 'name', 'type', 'phase', 'initial_count', 'effectif_actuel_calcule', 'cout_achat_calcule', 'cout_unitaire_calcule', 'mortality', 'malades', 'tablettes_vendables_calculees', 'oeufs_restants_calculees', 'poids_moyen_entree', 'poids_moyen_actuel_calcule', 'poids_objectif_vente_calcule', 'date_derniere_pesee', 'date_prochaine_pesee_recommandee', 'date_debut_reforme_recommandee', 'date_reforme_cible', 'statut_calcule', 'decision_ia_calculee'], fileName: `${fileName}.csv` }); exportToExcel({ rows: exportableRows, fileName: `${fileName}.xlsx`, sheetName: 'Avicole' }); exportToPdf({ rows: exportableRows, columns: ['id', 'name', 'type', 'initial_count', 'effectif_actuel_calcule', 'tablettes_vendables_calculees', 'oeufs_restants_calculees', 'statut_calcule', 'decision_ia_calculee'], fileName: `${fileName}.pdf`, title: 'Lots avicoles' }); toast.success('Exports générés'); };

  const columns = [
    { key: 'name', label: 'Lot', sortable: true, render: (lot) => <div><p className="font-black text-[#2f2415]">{lot.name || lot.id}</p><p className="text-xs text-[#8a7456]">{lot.id}</p></div> },
    { key: 'phase', label: 'Phase', render: (lot) => phaseFor(lot) },
    { key: 'age', label: 'Âge', render: (lot) => lot.type === 'Pondeuse' ? `${ageMonths(lot)} mois` : `${ageDays(lot)} j` },
    { key: 'effectif', label: 'Effectif', render: (lot) => <div><span className="font-bold">{fmtNumber(activeCount(lot))}</span><p className="text-[11px] text-[#8a7456]">Initial {fmtNumber(initialCount(lot))} - morts {fmtNumber(deadCount(lot))} - vendus/sortis {fmtNumber(soldCount(lot) + exitCount(lot))}</p>{sickCount(lot) > 0 ? <p className="text-[11px] font-bold text-amber-700">{fmtNumber(sickCount(lot))} à surveiller, encore dans l’effectif</p> : null}{avicoleHasCountMismatch(lot) ? <p className="text-[11px] font-bold text-red-700">Enregistré {fmtNumber(registeredCount(lot))}, recalculé {fmtNumber(calculatedCount(lot))}</p> : null}</div> },
    { key: 'achat', label: 'Achat sujets', render: (lot) => <div><b>{fmtCurrency(purchaseTotalOf(lot))}</b><p className="text-xs text-[#8a7456]">{fmtCurrency(purchaseUnitOf(lot))}/sujet</p></div> },
    { key: 'morts', label: 'Morts / malades', render: (lot) => `${fmtNumber(deadCount(lot))} / ${fmtNumber(sickCount(lot))}` },
    { key: 'weight_avg', label: tab === 'Pondeuse' ? 'Ponte / tablettes' : 'Poids', render: (lot) => { const decision = buildAvicoleLotDecision(lot, productionLogs); if (decision.type === 'pondeuse') { const metrics = calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs }); return <div><b>{decision.layingRate}% ponte</b><p className="text-xs text-[#8a7456]">{fmtNumber(metrics.eggMetrics?.totalTablets || 0)} tablette(s) · {fmtNumber(metrics.eggMetrics?.totalRemainingEggs || 0)} œuf(s)</p><p className="text-xs text-[#8a7456]">{fmtNumber(decision.avgEggsDay)} / {fmtNumber(decision.expectedEggsDay)} œufs/j</p></div>; } return latestWeight(lot) > 0 ? `${latestWeight(lot).toFixed(2)} / ${targetWeight(lot).toFixed(2)} kg` : `— / ${targetWeight(lot).toFixed(2)} kg`; } },
    { key: 'next', label: 'Suivi Horizon', render: (lot) => { const decision = buildAvicoleLotDecision(lot, productionLogs); if (decision.type === 'pondeuse') return <div><p className="font-bold text-[#2f2415]">Réforme: {decision.reformStart}</p><p className="text-xs text-[#8a7456]">cible {decision.reformTarget}</p></div>; return <div><p className="font-bold text-[#2f2415]">Pesée: {decision.nextWeighingDate}</p><p className="text-xs text-[#8a7456]">Rappel J-1: {decision.reminderWeighingDate || '-'}</p><p className="text-xs text-[#8a7456]">attendu {decision.expectedWeight} kg</p></div>; } },
    { key: 'readiness', label: 'Décision IA', render: (lot) => { const decision = buildAvicoleLotDecision(lot, productionLogs); return <Badge color={decisionColor(decision)}>{decision.decision}</Badge>; } },
    { key: 'actions', label: 'Actions', render: (lot) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected({ ...lot, horizon_decision: buildAvicoleLotDecision(lot, productionLogs) }); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(lot); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(lot); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6"><SectionHeader title="Gestion avicole" sub={`${tab === 'Pondeuse' ? 'Pondeuses' : 'Poulets de chair'} uniquement`} actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn>{tab === 'Pondeuse' && hideEggCapture ? <Btn variant="outline" small onClick={() => onNavigate?.('elevage', { tab: 'Production' })}>Ramassage → Production</Btn> : null}{tab === 'Pondeuse' && !hideEggCapture ? <Btn icon={Plus} small onClick={() => setModal('eggs')} disabled={!pondeusesDisponibles.length}>Ramassage œufs</Btn> : null}<Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {tab === 'Pondeuse' ? 'lot pondeuses' : 'lot chair'}</Btn></>} />
    {tab === 'Pondeuse' && hideEggCapture ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">Le ramassage d&apos;œufs se fait dans <b>Élevage → Production</b> (saisie unique, entrée stock incluse).</div> : null}
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4"><KpiCard icon={Plus} label="Effectif actif" value={fmtNumber(totalEffectif)} color="bg-emerald-500/20 text-emerald-500" /><KpiCard icon={Plus} label="Morts" value={fmtNumber(morts)} color="bg-red-500/20 text-red-500" /><KpiCard icon={Plus} label="Malades" value={fmtNumber(malades)} color="bg-amber-500/20 text-amber-500" /><KpiCard icon={Plus} label="Actions IA" value={actionsIa} color="bg-sky-500/20 text-sky-500" /><KpiCard icon={Plus} label={tab === 'Pondeuse' ? 'Réforme 17+ mois' : chairKpiLabel} value={tab === 'Pondeuse' ? aReformer : chairKpiValue} color={tab === 'Pondeuse' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'} /><KpiCard icon={Plus} label="Coût alim." value={fmtCurrency(coutAlim)} color="bg-purple-500/20 text-purple-500" /></div>
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-xs text-[#8a7456]">Lots clôturés: {inactiveLots.length} · Achat actif: {fmtCurrency(coutAchat)} · Règle effectif: initial - morts - vendus - pertes/sorties. Les malades restent dans l’effectif et sont affichés comme à surveiller.</div>
    <DataTable title={tab === 'Pondeuse' ? 'Lots pondeuses' : 'Lots poulets de chair'} rows={filteredByActivity} columns={columns} loading={loading} initialSortKey="date_debut" searchPlaceholder="Rechercher un lot..." />
    <CreateModal open={modal === 'create'} onClose={() => { setModal(null); setBpCreateDraft(null); }} onSubmit={submitCreate} fields={createFields} initialValues={mergeBpDraftIntoInitial(initialLot, bpCreateDraft)} loading={saving} title={bpCreateDraft ? 'Concrétiser investissement BP · lot avicole' : tab === 'Pondeuse' ? 'Ajouter lot pondeuses' : 'Ajouter lot poulets de chair'} submitLabel={bpCreateDraft ? 'Concrétiser' : 'Ajouter'} />
    {!hideEggCapture ? <CreateModal open={modal === 'eggs'} onClose={() => setModal(null)} onSubmit={submitEggEntry} fields={eggFields} initialValues={initialEggEntry} loading={isSaving} title="Ramassage œufs" submitLabel="Enregistrer" /> : null}
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={editFields} initialValues={selected || {}} loading={saving} title="Modifier / suivre le lot" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={confirmDelete} itemLabel={selected?.name || selected?.id || ''} loading={saving} />
    <AvicoleLotDetailsModal open={modal === 'details'} onClose={() => setModal(null)} lot={selected} productionLogs={productionLogs} alimentationLogs={alimentationLogs} opportunities={opportunities} salesOrders={salesOrders} payments={payments} transactions={transactions} businessEvents={businessEvents} onCreateOpportunity={onCreateOpportunity} onUpdateOpportunity={onUpdateOpportunity} onRefreshOpportunities={onRefreshOpportunities} onCreateBusinessEvent={onCreateBusinessEvent} onRefreshBusinessEvents={onRefreshBusinessEvents} onNavigate={onNavigate} />
  </div>;
}
