import { AlertTriangle, CheckCircle, Download, Edit, Eye, Plus, QrCode, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import DataTable from '../components/DataTable';
import ActionIconButton from '../components/ActionIconButton';
import CreateModal from '../modals/CreateModal';
import EditModal from '../modals/EditModal';
import DeleteModal from '../modals/DeleteModal';
import DetailsModal from '../modals/DetailsModal';
import { applyAnimalDecisionDefaults, buildAnimalDecisionProfile } from '../services/animalDecisionEngine';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { enrichAnimalFieldsForDecision } from '../utils/decisionFormFields';
import { generateSequentialId } from '../utils/ids';
import { fmtCurrency, toNumber } from '../utils/format';
import { exportToCsv, exportToExcel, exportToPdf } from '../utils/export';
import { isActiveAnimalForFeeding } from '../utils/alimentation';
import AnimalHealthBridge from './AnimalHealthBridge.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const speciesPlural = (species = 'Bovin') => `${species}s`;
const statusOf = (row = {}) => row.status || row.statut || 'actif';
const healthOf = (row = {}) => row.health_status || row.sante || row.status_sante || 'sain';
const purchaseCost = (row = {}) => toNumber(row.purchase_cost ?? row.cout_achat ?? row.prix_achat);
const salePrice = (row = {}) => toNumber(row.sale_price ?? row.prix_vente_reel ?? row.prix_vente_estime);
const weightOf = (row = {}) => toNumber(row.poids_actuel ?? row.poids ?? row.weight);
const entryWeightOf = (row = {}) => toNumber(row.poids_entree ?? row.weight_entry ?? row.poids_initial);
const targetWeightOf = (row = {}) => toNumber(row.poids_objectif ?? row.target_weight ?? row.objectif_poids);
const physicalIdOf = (row = {}) => row.boucle_numero || row.qr_code || row.tag || row.id;
const qrOf = (row = {}) => row.qr_code || row.boucle_numero || row.tag || row.id;

function ageInFarmDays(row = {}) {
  const start = row.date_entree_ferme || row.date_achat || row.created_at;
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000));
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
    { key: 'section_identification', label: 'Identification', type: 'section', description: 'Saisie courte : l’ERP préremplit le reste dans la fiche.' },
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'boucle_numero', label: `N° boucle terrain (${species === 'Bovin' ? 'BOV001' : species === 'Ovin' ? 'OVI001' : 'CAP001'})`, type: 'text', required: true },
    { key: 'qr_code', label: 'Code QR / identifiant scan', type: 'text' },
    { key: 'name', label: 'Nom / repère', type: 'text' },
    { key: 'sexe', label: 'Sexe', type: 'select', required: true, options: [{ value: 'F', label: 'Femelle' }, { value: 'M', label: 'Mâle' }] },
    { key: 'race', label: 'Race si connue', type: 'text' },

    { key: 'section_entree', label: 'Entrée ferme', type: 'section' },
    { key: 'mode_acquisition', label: 'Mode acquisition', type: 'select', required: true, options: [{ value: 'achat', label: 'Achat' }, { value: 'naissance_ferme', label: 'Naissance ferme' }, { value: 'don', label: 'Don / autre' }] },
    { key: 'date_entree_ferme', label: 'Date entrée ferme', type: 'date', required: true },
    { key: 'date_achat', label: 'Date achat si achat', type: 'date' },
    { key: 'fournisseur_vendeur', label: 'Fournisseur / vendeur', type: 'text' },

    { key: 'section_poids_achat', label: 'Poids & achat', type: 'section', description: 'Le poids entrée devient le poids actuel initial. La prochaine pesée est calculée automatiquement.' },
    { key: 'poids_entree', label: 'Poids entrée ferme (kg)', type: 'number' },
    { key: 'purchase_cost', label: 'Prix achat', type: 'number' },
    { key: 'health_status', label: 'État sanitaire initial', type: 'select', options: [{ value: 'sain', label: 'Sain' }, { value: 'a_surveiller', label: 'À surveiller' }, { value: 'malade', label: 'Malade' }, { value: 'blesse', label: 'Blessé' }] },
    { key: 'notes', label: 'Notes d’entrée', type: 'textarea', rows: 3, fullWidth: true },
  ];
}

export default function AnimauxSpeciesFocused({ species = 'Bovin', rows = [], alimentationLogs = [], vaccins = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('tous');
  const [healthFilter, setHealthFilter] = useState('tous');

  const formFields = useMemo(() => enrichAnimalFieldsForDecision(MODULE_FORM_FIELDS.animaux || []), []);
  const createFields = useMemo(() => buildCreateFields(species), [species]);
  const normalizedRows = useMemo(() => rows.map((row) => ({ ...row, type: species, espece: species })), [rows, species]);
  const filtered = useMemo(() => normalizedRows.filter((row) => {
    const statusOk = statusFilter === 'tous' || statusOf(row) === statusFilter;
    const healthOk = healthFilter === 'tous' || healthOf(row) === healthFilter;
    return statusOk && healthOk;
  }), [normalizedRows, statusFilter, healthFilter]);

  const summary = useMemo(() => {
    const active = normalizedRows.filter((row) => isActiveAnimalForFeeding(row));
    const sick = normalizedRows.filter((row) => ['malade', 'sous_traitement', 'blesse', 'blessé', 'a_surveiller'].includes(healthOf(row)));
    const sold = normalizedRows.filter((row) => statusOf(row) === 'vendu');
    const overdue = normalizedRows.filter((row) => ageInFarmDays(row) > (toNumber(row.delai_cible_vente_jours) || 90) && statusOf(row) !== 'vendu');
    const feeding = alimentationLogs.filter((log) => normalizedRows.some((row) => String(row.id) === String(log.animal_id || log.related_id || log.target_id))).reduce((sum, log) => sum + toNumber(log.cout_total ?? log.montant ?? log.cost), 0);
    const health = vaccins.filter((v) => normalizedRows.some((row) => String(row.id) === String(v.animal_id || v.related_id || v.target_id))).reduce((sum, v) => sum + toNumber(v.cout ?? v.montant ?? v.cost), 0);
    const invested = normalizedRows.reduce((sum, row) => sum + purchaseCost(row), 0) + feeding + health;
    const revenue = normalizedRows.reduce((sum, row) => sum + salePrice(row), 0);
    return { active, sick, sold, overdue, feeding, health, invested, revenue, margin: revenue - invested };
  }, [normalizedRows, alimentationLogs, vaccins]);

  const initialValues = useMemo(() => {
    const physicalCode = defaultPhysicalCode(species, normalizedRows);
    const id = physicalCode || generateSequentialId('animaux', normalizedRows, { type: species });
    const date = today();
    return applyAnimalDecisionDefaults({
      id,
      tag: physicalCode,
      boucle_numero: physicalCode,
      qr_code: physicalCode,
      type: species,
      espece: species,
      status: 'actif',
      health_status: 'sain',
      mode_acquisition: 'achat',
      date_achat: date,
      date_entree_ferme: date,
      date_poids_entree: date,
      date_derniere_pesee: date,
      frequence_pesee_jours: 15,
      sexe: 'F',
      poids_entree: 0,
      poids: 0,
      poids_actuel: 0,
      sale_price: 0,
    });
  }, [normalizedRows, species]);

  const prepare = (payload = {}, existing = {}) => {
    const physicalCode = payload.boucle_numero || payload.qr_code || existing.boucle_numero || existing.qr_code || defaultPhysicalCode(species, normalizedRows);
    const entryDate = payload.date_entree_ferme || payload.date_achat || existing.date_entree_ferme || today();
    const entryWeight = toNumber(payload.poids_entree ?? payload.poids ?? existing.poids_entree);
    const prepared = applyAnimalDecisionDefaults({
      ...existing,
      ...payload,
      id: payload.id || existing.id || physicalCode,
      tag: physicalCode,
      boucle_numero: physicalCode,
      qr_code: payload.qr_code || physicalCode,
      type: species,
      espece: species,
      categorie: species,
      health_status: payload.health_status || payload.sante || existing.health_status || 'sain',
      status: payload.status || payload.statut || existing.status || 'actif',
      date_entree_ferme: entryDate,
      date_poids_entree: payload.date_poids_entree || existing.date_poids_entree || entryDate,
      date_derniere_pesee: payload.date_derniere_pesee || existing.date_derniere_pesee || entryDate,
      frequence_pesee_jours: payload.frequence_pesee_jours || existing.frequence_pesee_jours || 15,
      poids_entree: entryWeight,
      poids: toNumber(payload.poids ?? payload.poids_actuel ?? entryWeight),
      poids_actuel: toNumber(payload.poids_actuel ?? payload.poids ?? entryWeight),
      purchase_cost: toNumber(payload.purchase_cost ?? payload.prix_achat ?? existing.purchase_cost),
    }, existing);
    return prepared;
  };

  const submitCreate = async (payload) => {
    try { setSaving(true); await onCreate?.(prepare(payload)); await onRefresh?.(); toast.success(`${species} ajouté · boucle/QR et suivi Horizon préremplis`); setModal(null); }
    catch (error) { toast.error(error.message || 'Création impossible'); }
    finally { setSaving(false); }
  };
  const submitEdit = async (payload) => {
    if (!selected) return;
    try { setSaving(true); await onUpdate?.(selected.id, prepare(payload, selected)); await onRefresh?.(); toast.success(`${species} modifié · fiche scan mise à jour`); setModal(null); }
    catch (error) { toast.error(error.message || 'Modification impossible'); }
    finally { setSaving(false); }
  };
  const submitDelete = async () => {
    if (!selected) return;
    try { setSaving(true); await onDelete?.(selected.id); await onRefresh?.(); toast.success(`${species} supprimé`); setModal(null); }
    catch (error) { toast.error(error.message || 'Suppression impossible'); }
    finally { setSaving(false); }
  };

  const exportRows = () => {
    exportToCsv({ rows: filtered, fileName: `animaux-${species}.csv` });
    exportToExcel({ rows: filtered, fileName: `animaux-${species}.xlsx`, sheetName: species });
    exportToPdf({ rows: filtered, title: `Liste ${speciesPlural(species)}`, fileName: `animaux-${species}.pdf` });
    toast.success('Exports générés');
  };

  const columns = [
    { key: 'id', label: 'Boucle / QR', sortable: true, render: (row) => <div className="flex items-center gap-2"><QrCode size={14} className="text-emerald-700" /><div><span className="font-mono text-emerald-700 text-xs font-black">{physicalIdOf(row)}</span><p className="text-[10px] text-[#8a7456]">scan: {qrOf(row)}</p></div></div> },
    { key: 'photo', label: 'Photo', render: (row) => row.photo_url ? <img src={row.photo_url} alt={physicalIdOf(row)} className="h-10 w-10 rounded-xl object-cover border border-[#eadcc2]" /> : <span className="text-xs text-[#8a7456]">Photo à ajouter</span> },
    { key: 'name', label: 'Nom', sortable: true, render: (row) => <span className="font-bold text-[#2f2415]">{row.name || row.nom || physicalIdOf(row)}</span> },
    { key: 'type', label: 'Espèce', render: () => species },
    { key: 'signes_distinctifs', label: 'Signes', render: (row) => <span className="text-xs text-[#7d6a4a]">{row.signes_distinctifs || row.emplacement_actuel || '—'}</span> },
    { key: 'poids', label: 'Poids', render: (row) => `${weightOf(row) || 0} kg` },
    { key: 'progression', label: 'Entrée → objectif', render: (row) => `${entryWeightOf(row) || 0} → ${targetWeightOf(row) || 'Horizon'} kg` },
    { key: 'next_weighing', label: 'Pesée Horizon', render: (row) => {
      const profile = buildAnimalDecisionProfile(row);
      return <div><p className="font-bold text-[#2f2415]">{profile.nextWeighingDate || '—'}</p><p className="text-xs text-[#8a7456]">attendu {profile.expectedWeight || 0} kg</p></div>;
    } },
    { key: 'decision', label: 'Décision IA', render: (row) => <span className="text-xs font-bold text-[#7d6a4a]">{buildAnimalDecisionProfile(row).decision}</span> },
    { key: 'health_status', label: 'Santé', render: (row) => healthOf(row) },
    { key: 'status', label: 'Statut', render: (row) => statusOf(row) },
    { key: 'cost', label: 'Coût achat', render: (row) => fmtCurrency(purchaseCost(row)) },
    { key: 'actions', label: 'Actions', render: (row) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(row); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(row); setModal('edit'); }} /><ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={() => { setSelected(row); setModal('delete'); }} /></div> },
  ];

  return <div className="space-y-6">
    <SectionHeader title={`Gestion des ${speciesPlural(species)}`} sub={`${speciesPlural(species)} uniquement : boucle terrain, QR, photo, croissance, santé, alimentation et rentabilité`} actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter {species}</Btn></>} />

    <AnimalHealthBridge rows={normalizedRows} alimentationLogs={alimentationLogs} vaccins={vaccins} onUpdate={onUpdate} onRefresh={onRefresh} />

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
      <KpiCard icon={CheckCircle} label="Actifs" value={summary.active.length} color="bg-emerald-500/20 text-emerald-400" />
      <KpiCard icon={AlertTriangle} label="À suivre" value={summary.sick.length} color="bg-amber-500/20 text-amber-500" />
      <KpiCard icon={AlertTriangle} label="> 90 jours" value={summary.overdue.length} color="bg-red-500/20 text-red-500" />
      <KpiCard icon={CheckCircle} label="Vendus" value={summary.sold.length} color="bg-sky-500/20 text-sky-500" />
      <KpiCard icon={CheckCircle} label="Alimentation" value={fmtCurrency(summary.feeding)} color="bg-emerald-500/20 text-emerald-500" />
      <KpiCard icon={CheckCircle} label="Santé" value={fmtCurrency(summary.health)} color="bg-emerald-500/20 text-emerald-500" />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <MiniMetric label="Coût total suivi" value={fmtCurrency(summary.invested)} />
      <MiniMetric label="Revenus saisis" value={fmtCurrency(summary.revenue)} />
      <MiniMetric label="Marge suivie" value={fmtCurrency(summary.margin)} danger={summary.margin < 0} />
    </div>

    <div className="flex flex-wrap gap-2">
      {['tous', 'actif', 'pret_a_la_vente', 'reserve', 'vendu', 'mort', 'vole', 'reforme'].map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`px-3 py-2 rounded-lg text-sm capitalize ${statusFilter === status ? 'bg-emerald-500 text-black font-semibold' : 'bg-white border border-[#d6c3a0] text-[#8a7456]'}`}>{status.replaceAll('_', ' ')}</button>)}
      {['tous', 'sain', 'malade', 'blesse', 'sous_traitement', 'a_surveiller'].map((status) => <button key={status} type="button" onClick={() => setHealthFilter(status)} className={`px-3 py-2 rounded-lg text-sm capitalize ${healthFilter === status ? 'bg-sky-500 text-black font-semibold' : 'bg-white border border-[#d6c3a0] text-[#8a7456]'}`}>{status.replaceAll('_', ' ')}</button>)}
    </div>

    <DataTable title={`Liste ${speciesPlural(species)}`} rows={filtered} columns={columns} loading={loading} initialSortKey="id" searchPlaceholder={`Recherche boucle, QR ou ${speciesPlural(species).toLowerCase()}...`} />

    <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, horizon_decision: buildAnimalDecisionProfile(selected) } : selected} title={`Détail ${species}`} />
    <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={createFields} initialValues={initialValues} loading={saving} title={`Ajouter ${species}`} submitLabel="Ajouter" />
    <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={formFields} initialValues={selected || {}} loading={saving} title={`Modifier ${species}`} submitLabel="Enregistrer" />
    <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={submitDelete} itemLabel={selected ? selected.name || selected.nom || selected.id : ''} loading={saving} />
  </div>;
}

function MiniMetric({ label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-white'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>;
}
