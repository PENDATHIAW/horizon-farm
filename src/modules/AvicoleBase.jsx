import { Download, Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ActionIconButton from '../components/ActionIconButton';
import Badge from '../components/Badge';
import Btn from '../components/Btn';
import DataTable from '../components/DataTable';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import CreateModal from '../modals/CreateModal';
import DeleteModal from '../modals/DeleteModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId } from '../utils/ids';
import { calculateLotMetrics } from '../utils/businessCalculations';
import { filterLotsByActivity } from '../utils/avicoleActivity';
import {
  avicoleActiveCount,
  avicoleDeadCount,
  avicoleExitReason,
  avicoleHasActiveBirds,
  avicoleSickCount,
  avicoleStatusFor,
} from '../utils/avicoleMetrics';
import { getResponsibleOptions, resolveResponsibleLabel } from '../utils/rhDirectory';

const tabs = ['Tous', 'Pondeuse', 'Chair'];
const DEFAULT_SALE_TARGET_WEIGHT = 1.5;
const DEFAULT_CHICK_CRATE_SIZE = 50;
const DEFAULT_CHICK_CRATE_PRICE = 32000;
const today = () => new Date().toISOString().slice(0, 10);
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
const hasActiveBirds = avicoleHasActiveBirds;
const statusFor = avicoleStatusFor;
const entryWeight = (lot = {}) => toNumber(lot.poids_moyen_entree ?? lot.weight_entry);
const latestWeight = (lot = {}) => toNumber(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.average_weight);
const targetWeight = (lot = {}) => toNumber(lot.poids_objectif_vente ?? lot.objectif_poids_moyen ?? lot.target_weight ?? DEFAULT_SALE_TARGET_WEIGHT) || DEFAULT_SALE_TARGET_WEIGHT;
const purchaseTotalOf = (lot = {}) => toNumber(lot.cout_total_achat ?? lot.cout_achat_bande ?? lot.purchase_cost ?? lot.cout_poussins ?? lot.cout_achat);
const purchaseUnitOf = (lot = {}) => toNumber(lot.prix_unitaire_sujet ?? lot.unit_cost ?? lot.cout_unitaire_poussin);

function ageDays(lot = {}) {
  const start = lot.date_debut || lot.entry_date || lot.date_entree;
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000));
}

function exitReasonLabel(lot = {}) {
  const map = {
    vendu: 'Vendu',
    vendu_partiellement: 'Vendu partiellement',
    perdu_mortalite: 'Perdu · mortalité',
    perdu_vol: 'Perdu · vol',
    abattu: 'Abattu / transformé',
    reforme: 'Réformé',
    sorti_autre: 'Sorti autre',
    sortie_non_renseignee: 'Sortie à renseigner',
  };
  return map[avicoleExitReason(lot)] || map[statusFor(lot)] || statusFor(lot);
}

function phaseFor(lot = {}) {
  if (!hasActiveBirds(lot)) return exitReasonLabel(lot);
  if (lot.phase && lot.phase !== 'Clôturé' && lot.phase !== 'Cloture') return lot.phase;
  const age = ageDays(lot);
  if (lot.type === 'Chair') return age >= 30 ? 'Finition / vente possible' : 'Croissance';
  if (age >= 540) return 'Fin de ponte / réforme';
  if (age >= 150) return 'En ponte';
  return 'Croissance';
}

function readinessLabel(lot = {}) {
  const current = activeCount(lot);
  if (current <= 0) return exitReasonLabel(lot);
  const age = ageDays(lot);
  const weight = latestWeight(lot);
  const goal = targetWeight(lot);
  if (lot.type === 'Chair') {
    if (weight >= goal) return 'Prêt recommandé';
    if (age >= 30) return 'À surveiller poids';
    return 'Non prêt';
  }
  if (age >= 540 || ['a_reformer', 'pret_a_vendre_reforme'].includes(lot.status)) return 'Réforme possible';
  return 'Non prêt';
}

function computePurchaseFields(payload = {}, existing = {}) {
  const initial = Math.max(0, toNumber(payload.initial_count ?? payload.effectif_initial ?? existing.initial_count ?? existing.effectif_initial));
  const crateSize = toNumber(payload.poussins_par_caisse ?? existing.poussins_par_caisse) || DEFAULT_CHICK_CRATE_SIZE;
  const cratePrice = toNumber(payload.prix_caisse_poussins ?? payload.cout_caisse_poussins ?? existing.prix_caisse_poussins ?? existing.cout_caisse_poussins) || DEFAULT_CHICK_CRATE_PRICE;
  const totalInput = toNumber(payload.cout_total_achat ?? payload.cout_achat_bande ?? payload.purchase_cost ?? payload.cout_poussins ?? payload.cout_achat);
  const unitInput = toNumber(payload.prix_unitaire_sujet ?? payload.unit_cost ?? payload.cout_unitaire_poussin);
  const defaultUnit = crateSize > 0 ? cratePrice / crateSize : DEFAULT_CHICK_CRATE_PRICE / DEFAULT_CHICK_CRATE_SIZE;
  const unit = totalInput > 0 && initial > 0 ? totalInput / initial : unitInput > 0 ? unitInput : defaultUnit;
  const total = totalInput > 0 ? totalInput : initial > 0 ? unit * initial : 0;
  return { initial, crateSize, cratePrice, unit: Number(unit.toFixed(2)), total: Number(total.toFixed(0)) };
}

export default function AvicoleBase({ rows = [], alimentationLogs = [], productionLogs = [], loading, onCreate, onUpdate, onDelete, onRefresh, onCreateProduction, onRefreshProduction }) {
  const [tab, setTab] = useState('Tous');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const filteredByActivity = useMemo(() => tab === 'Tous' ? rows : filterLotsByActivity(rows, tab), [rows, tab]);
  const activeLots = useMemo(() => filteredByActivity.filter(hasActiveBirds), [filteredByActivity]);
  const inactiveLots = useMemo(() => filteredByActivity.filter((lot) => !hasActiveBirds(lot)), [filteredByActivity]);
  const pondeusesDisponibles = useMemo(() => rows.filter((lot) => lot.type === 'Pondeuse' && hasActiveBirds(lot)), [rows]);
  const lots = activeLots;
  const totalEffectif = lots.reduce((sum, lot) => sum + activeCount(lot), 0);
  const morts = lots.reduce((sum, lot) => sum + deadCount(lot), 0);
  const malades = lots.reduce((sum, lot) => sum + sickCount(lot), 0);
  const prets = lots.filter((lot) => readinessLabel(lot).toLowerCase().includes('prêt') || readinessLabel(lot).toLowerCase().includes('réforme')).length;
  const coutAlim = lots.reduce((sum, lot) => sum + calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs }).feedingCost, 0);
  const coutAchat = lots.reduce((sum, lot) => sum + purchaseTotalOf(lot), 0);
  const responsibleOptions = useMemo(() => getResponsibleOptions({ moduleKey: 'avicole' }), []);

  const avicoleFields = useMemo(() => {
    const base = MODULE_FORM_FIELDS.avicole || [];
    const purchaseFields = [
      { key: 'section_achat_bande', label: 'Achat de la bande', type: 'section', description: 'Saisir le coût total réel si connu. Le prix unitaire est calculé avec l’effectif initial.' },
      { key: 'cout_total_achat', label: 'Coût total achat bande', type: 'number' },
      { key: 'prix_unitaire_sujet', label: 'Coût unitaire sujet calculé / ajustable', type: 'number' },
      { key: 'poussins_par_caisse', label: 'Sujets par caisse', type: 'number' },
      { key: 'prix_caisse_poussins', label: 'Prix caisse poussins', type: 'number' },
      { key: 'fournisseur_poussins', label: 'Fournisseur poussins', type: 'text' },
    ];
    const weighingFields = [
      { key: 'poids_moyen_entree', label: 'Poids moyen entrée / première pesée (kg)', type: 'number' },
      { key: 'date_pesee_entree', label: 'Date pesée entrée', type: 'date' },
      { key: 'poids_objectif_vente', label: 'Objectif poids vente (kg)', type: 'number' },
      { key: 'poids_moyen_actuel', label: 'Poids moyen actuel / dernière pesée (kg)', type: 'number' },
      { key: 'date_derniere_pesee', label: 'Date dernière pesée', type: 'date' },
    ];
    return base.flatMap((field) => {
      if (field.key === 'initial_count') return [field, ...purchaseFields];
      if (field.key === 'phase') return [{ ...field, type: 'select', options: phaseOptions }];
      if (field.key === 'weight_avg') return weighingFields;
      return [field];
    });
  }, []);

  const eggFields = useMemo(() => [
    { key: 'section_ramassage', label: 'Ramassage œufs', type: 'section', description: 'Choisir uniquement un lot pondeuse actif et disponible. Le responsable vient de RH & Équipe.' },
    { key: 'lot_id', label: 'Lot pondeuse', type: 'select', required: true, options: pondeusesDisponibles.map((lot) => ({ value: lot.id, label: `${lot.name || lot.id} · ${fmtNumber(activeCount(lot))} actifs` })) },
    { key: 'date', label: 'Date ramassage', type: 'date', required: true },
    { key: 'heure_ramassage', label: 'Heure ramassage', type: 'text' },
    { key: 'oeufs_produits', label: 'Œufs ramassés', type: 'number', required: true },
    { key: 'oeufs_casses', label: 'Œufs cassés / abîmés', type: 'number' },
    { key: 'oeufs_vendables_view', label: 'Œufs vendables calculés', type: 'readonly' },
    { key: 'responsable', label: 'Responsable ramassage', type: 'select', required: true, options: responsibleOptions },
    { key: 'notes', label: 'Notes ramassage', type: 'text', fullWidth: true },
  ], [pondeusesDisponibles, responsibleOptions]);

  const initialLot = useMemo(() => {
    const type = tab === 'Chair' ? 'Chair' : 'Pondeuse';
    const id = generateSequentialId('avicole', rows, { type });
    return { id, name: `${id} ${type}`, type, status: 'actif', health_status: 'sain', phase: type === 'Chair' ? 'Croissance' : 'Production', date_debut: today(), entry_date: today(), initial_count: 0, mortality: 0, malades: 0, cout_total_achat: 0, prix_unitaire_sujet: DEFAULT_CHICK_CRATE_PRICE / DEFAULT_CHICK_CRATE_SIZE, poussins_par_caisse: DEFAULT_CHICK_CRATE_SIZE, prix_caisse_poussins: DEFAULT_CHICK_CRATE_PRICE, poids_moyen_entree: 0, poids_objectif_vente: DEFAULT_SALE_TARGET_WEIGHT, poids_moyen_actuel: 0, date_pesee_entree: today(), date_derniere_pesee: today(), duree_cycle_unite: type === 'Chair' ? 'jours' : 'mois', duree_cycle_valeur: type === 'Chair' ? 45 : 18 };
  }, [rows, tab]);

  const initialEggEntry = useMemo(() => ({ id: `PROD-${Date.now()}`, lot_id: pondeusesDisponibles[0]?.id || '', date: today(), heure_ramassage: '', oeufs_produits: '', oeufs_casses: 0, responsable: responsibleOptions[0]?.value || 'TEAM-AVICOLE', notes: '' }), [pondeusesDisponibles, responsibleOptions]);

  const prepareLot = (payload, existing = {}) => {
    const base = { ...existing, ...payload };
    const current = activeCount(base);
    const isNewLot = !existing?.id;
    const purchase = computePurchaseFields(payload, existing);
    const savedEntryWeight = entryWeight(existing);
    const enteredEntryWeight = toNumber(payload.poids_moyen_entree ?? payload.weight_entry);
    const enteredCurrentWeight = toNumber(payload.poids_moyen_actuel ?? payload.last_weight_avg ?? payload.weight_avg ?? payload.average_weight);
    const nextEntryWeight = savedEntryWeight > 0 ? savedEntryWeight : enteredEntryWeight > 0 ? enteredEntryWeight : isNewLot ? enteredCurrentWeight : 0;
    const nextCurrentWeight = enteredCurrentWeight > 0 ? enteredCurrentWeight : nextEntryWeight;
    const nextTargetWeight = targetWeight({ ...existing, ...payload, poids_objectif_vente: payload.poids_objectif_vente || existing.poids_objectif_vente || DEFAULT_SALE_TARGET_WEIGHT });
    const entryDate = existing.date_pesee_entree || payload.date_pesee_entree || payload.date_debut || payload.entry_date || today();
    const currentDate = payload.date_derniere_pesee || existing.date_derniere_pesee || (nextCurrentWeight > 0 ? today() : '');
    const nextBase = { ...base, current_count: current, effectif_actuel: current };
    return {
      ...payload,
      initial_count: purchase.initial || toNumber(payload.initial_count),
      effectif_initial: purchase.initial || toNumber(payload.initial_count),
      current_count: current,
      effectif_actuel: current,
      cout_total_achat: purchase.total,
      cout_achat_bande: purchase.total,
      purchase_cost: purchase.total,
      cout_poussins: purchase.total,
      prix_unitaire_sujet: purchase.unit,
      unit_cost: purchase.unit,
      cout_unitaire_poussin: purchase.unit,
      poussins_par_caisse: purchase.crateSize,
      prix_caisse_poussins: purchase.cratePrice,
      weight_entry: nextEntryWeight,
      poids_moyen_entree: nextEntryWeight,
      poids_objectif_vente: nextTargetWeight,
      objectif_poids_moyen: nextTargetWeight,
      target_weight: nextTargetWeight,
      weight_avg: nextCurrentWeight,
      average_weight: nextCurrentWeight,
      last_weight_avg: nextCurrentWeight,
      poids_moyen_actuel: nextCurrentWeight,
      date_pesee_entree: entryDate,
      date_derniere_pesee: currentDate,
      status: current <= 0 ? avicoleExitReason(nextBase) : statusFor(nextBase),
      phase: current <= 0 ? exitReasonLabel(nextBase) : (payload.phase || phaseFor({ ...payload, current_count: current, poids_moyen_actuel: nextCurrentWeight, poids_objectif_vente: nextTargetWeight })),
      date_debut: payload.date_debut || payload.entry_date || today(),
      entry_date: payload.entry_date || payload.date_debut || today(),
    };
  };

  const submitCreate = async (payload) => { try { setSaving(true); await onCreate?.(prepareLot(payload)); toast.success('Lot avicole ajouté'); setModal(null); } catch (e) { toast.error(e.message || 'Création impossible'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate?.(selected.id, prepareLot(payload, selected)); toast.success('Lot mis à jour'); setModal(null); await onRefresh?.(); } catch (e) { toast.error(e.message || 'Modification impossible'); } finally { setSaving(false); } };
  const confirmDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete?.(selected.id); toast.success('Lot supprimé'); setModal(null); } catch (e) { toast.error(e.message || 'Suppression impossible'); } finally { setSaving(false); } };

  const submitEggEntry = async (payload) => {
    const lot = pondeusesDisponibles.find((item) => item.id === payload.lot_id);
    if (!lot) return toast.error('Choisir un lot pondeuse actif');
    const eggCount = toNumber(payload.oeufs_produits);
    const brokenCount = Math.max(0, toNumber(payload.oeufs_casses));
    if (eggCount <= 0) return toast.error('Saisir un nombre d’œufs supérieur à 0');
    if (brokenCount > eggCount) return toast.error('Les casses ne peuvent pas dépasser les œufs ramassés');
    try {
      setSaving(true);
      await onCreateProduction?.({ ...payload, id: payload.id || `PROD-${Date.now()}`, lot_id: lot.id, lot_name: lot.name || lot.id, date: payload.date || today(), oeufs_produits: eggCount, oeufs_casses: brokenCount, oeufs_vendables: Math.max(0, eggCount - brokenCount), responsable_label: resolveResponsibleLabel(payload.responsable), module_lie: 'avicole', related_id: lot.id, source_module: 'avicole', type_evenement: 'ramassage_oeufs' });
      await onRefreshProduction?.();
      toast.success('Ramassage œufs enregistré');
      setModal(null);
    } catch (e) { toast.error(e.message || 'Ajout ramassage impossible'); } finally { setSaving(false); }
  };

  const exportRows = () => {
    const fileName = `avicole-${tab.toLowerCase()}`;
    const exportableRows = filteredByActivity.map((lot) => ({ ...lot, effectif_actuel_calcule: activeCount(lot), cout_achat_calcule: purchaseTotalOf(lot), cout_unitaire_calcule: purchaseUnitOf(lot), poids_moyen_actuel_calcule: latestWeight(lot), poids_objectif_vente_calcule: targetWeight(lot), statut_calcule: statusFor(lot), decision_vente_calculee: readinessLabel(lot) }));
    exportToCsv({ rows: exportableRows, columns: ['id', 'name', 'type', 'phase', 'initial_count', 'effectif_actuel_calcule', 'cout_achat_calcule', 'cout_unitaire_calcule', 'mortality', 'vols', 'vendus', 'abattus', 'reformes', 'autres_sorties', 'malades', 'poids_moyen_entree', 'poids_moyen_actuel_calcule', 'poids_objectif_vente_calcule', 'date_derniere_pesee', 'statut_calcule'], fileName: `${fileName}.csv` });
    exportToExcel({ rows: exportableRows, fileName: `${fileName}.xlsx`, sheetName: 'Avicole' });
    exportToPdf({ rows: exportableRows, columns: ['id', 'name', 'type', 'initial_count', 'effectif_actuel_calcule', 'cout_achat_calcule', 'cout_unitaire_calcule', 'poids_moyen_actuel_calcule', 'poids_objectif_vente_calcule', 'statut_calcule'], fileName: `${fileName}.pdf`, title: 'Lots avicoles' });
    toast.success('Exports générés');
  };

  const columns = [
    { key: 'name', label: 'Lot', sortable: true, render: (lot) => <div><p className="font-black text-[#2f2415]">{lot.name || lot.id}</p><p className="text-xs text-[#8a7456]">{lot.id}</p></div> },
    { key: 'type', label: 'Type', render: (lot) => lot.type },
    { key: 'phase', label: 'Phase', render: (lot) => phaseFor(lot) },
    { key: 'age', label: 'Âge', render: (lot) => `${ageDays(lot)} j` },
    { key: 'effectif', label: 'Effectif', render: (lot) => <span className="font-bold">{fmtNumber(activeCount(lot))}</span> },
    { key: 'achat', label: 'Achat sujets', render: (lot) => <div><b>{fmtCurrency(purchaseTotalOf(lot))}</b><p className="text-xs text-[#8a7456]">{fmtCurrency(purchaseUnitOf(lot))}/sujet</p></div> },
    { key: 'morts', label: 'Morts / malades', render: (lot) => `${fmtNumber(deadCount(lot))} / ${fmtNumber(sickCount(lot))}` },
    { key: 'weight_avg', label: 'Poids / objectif', render: (lot) => latestWeight(lot) > 0 ? `${latestWeight(lot).toFixed(2)} / ${targetWeight(lot).toFixed(2)} kg` : `— / ${targetWeight(lot).toFixed(2)} kg` },
    { key: 'readiness', label: 'Décision vente', render: (lot) => readinessLabel(lot) },
    { key: 'status', label: 'Statut', render: (lot) => <Badge status={statusFor(lot)} /> },
    { key: 'actions', label: 'Actions', render: (lot) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(lot); setModal('view'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(lot); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(lot); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6">
    <SectionHeader title="Avicole" sub="Lots actifs de chair et pondeuses, santé, production et décision de vente" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} variant="outline" small onClick={() => setModal('eggs')}>Ramassage œufs</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter lot</Btn></>} />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{tabs.map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-2xl border px-4 py-3 text-left ${tab === item ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#8a7456] border-[#d6c3a0]'}`}><p className="text-xs uppercase tracking-wide">Vue</p><p className="font-black">{item}</p></button>)}</div>
    <div className="grid grid-cols-2 xl:grid-cols-7 gap-4"><KpiCard label="Effectif actif" value={fmtNumber(totalEffectif)} /><KpiCard label="Lots actifs" value={lots.length} /><KpiCard label="Sortis / à historiser" value={inactiveLots.length} /><KpiCard label="Prêts / réforme" value={prets} /><KpiCard label="Morts" value={fmtNumber(morts)} /><KpiCard label="Achat sujets" value={fmtCurrency(coutAchat)} /><KpiCard label="Coût alim." value={fmtCurrency(coutAlim)} /></div>
    <DataTable title="Lots avicoles actifs" rows={lots} columns={columns} loading={loading} initialSortKey="id" searchPlaceholder="Rechercher lot..." emptyMessage="Aucun lot actif disponible. Les sorties sont visibles dans l’historique." />
    {inactiveLots.length ? <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#8a7456]"><strong className="text-[#2f2415]">Lots sortis / à historiser :</strong> {inactiveLots.length}. Motifs attendus : vendu, abattu, perdu mortalité, perdu vol, réformé ou sortie à renseigner. Ils sont exclus des ventes actives, soins, alimentation et production.</div> : null}
    {selected && modal === 'view' ? <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex justify-between gap-3"><div><p className="text-xs uppercase text-[#8a7456]">Fiche lot</p><h3 className="text-xl font-black text-[#2f2415]">{selected.name || selected.id}</h3><p className="text-sm text-[#8a7456] mt-1">{selected.type} · {phaseFor(selected)} · {readinessLabel(selected)} · effectif {fmtNumber(activeCount(selected))} · achat {fmtCurrency(purchaseTotalOf(selected))} · {fmtCurrency(purchaseUnitOf(selected))}/sujet · entrée {entryWeight(selected) > 0 ? `${entryWeight(selected).toFixed(2)} kg` : 'non renseignée'} · actuel {latestWeight(selected) > 0 ? `${latestWeight(selected).toFixed(2)} kg` : 'non renseigné'} · objectif {targetWeight(selected).toFixed(2)} kg</p></div><Btn variant="outline" onClick={() => setModal(null)}>Fermer</Btn></div></div> : null}
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={avicoleFields} initialValues={initialLot} autoId={(values) => generateSequentialId('avicole', rows, values)} loading={saving} title="Ajouter lot avicole" submitLabel="Ajouter" />
    <CreateModal open={modal === 'eggs'} onClose={() => setModal(null)} onSubmit={submitEggEntry} fields={eggFields} initialValues={initialEggEntry} loading={saving} title="Nouveau ramassage œufs" submitLabel="Enregistrer" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={avicoleFields} initialValues={selected ? { ...selected, current_count: activeCount(selected), effectif_actuel: activeCount(selected), status: statusFor(selected), phase: phaseFor(selected), cout_total_achat: purchaseTotalOf(selected), prix_unitaire_sujet: purchaseUnitOf(selected), poussins_par_caisse: selected.poussins_par_caisse || DEFAULT_CHICK_CRATE_SIZE, prix_caisse_poussins: selected.prix_caisse_poussins || DEFAULT_CHICK_CRATE_PRICE, poids_moyen_entree: entryWeight(selected), poids_objectif_vente: targetWeight(selected), poids_moyen_actuel: latestWeight(selected), date_pesee_entree: selected.date_pesee_entree || selected.date_debut || selected.entry_date || today(), date_derniere_pesee: selected.date_derniere_pesee || today() } : {}} loading={saving} title="Modifier lot avicole" submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={confirmDelete} itemLabel={selected ? `${selected.name || selected.id}` : ''} loading={saving} />
  </div>;
}
