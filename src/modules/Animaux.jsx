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
import { calculateAnimalMetrics } from '../utils/businessCalculations';
import {
  acquisitionLabel,
  calculateAge,
  enrichAnimalLifecycle,
  getAnimalBirthDate,
  getParentLabel,
  getReproductionAlerts,
  reproductionStatusLabel,
} from '../utils/animalLifecycle';

const growthFormFields = [
  { key: 'section_growth', label: 'Croissance & engraissement', type: 'section', description: 'Permet de suivre si l animal prend du poids et si l alimentation est rentable.' },
  { key: 'poids_entree', label: 'Poids entree ferme (kg)', type: 'number' },
  { key: 'date_poids_entree', label: 'Date poids entree', type: 'date' },
  { key: 'date_derniere_pesee', label: 'Date derniere pesee', type: 'date' },
  { key: 'poids_objectif', label: 'Poids objectif vente (kg)', type: 'number' },
  { key: 'poids_history_text', label: 'Historique pesees', type: 'text', fullWidth: true },
  { key: 'objectif_croissance_jour', label: 'Objectif gain / jour (kg)', type: 'number' },
  { key: 'notes_engraissement', label: 'Notes engraissement / ration', type: 'text', fullWidth: true },
  { key: 'qualite_acheteur', label: 'Mention fiche acheteur', type: 'text', fullWidth: true },
];

const parseWeightHistoryText = (text, currentWeight, currentDate) => {
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
};

const stringifyWeightHistory = (animal = {}) => {
  const history = animal.poids_history || animal.weight_history || animal.historique_poids || [];
  let list = [];
  if (Array.isArray(history)) list = history;
  if (typeof history === 'string') {
    try { list = JSON.parse(history); } catch { list = []; }
  }
  return list.map((item) => `${item.date || item.date_pesee || ''} | ${item.poids || item.weight || ''}${item.note ? ` | ${item.note}` : ''}`.trim()).join('\n');
};

const insertGrowthFields = (fields) => {
  const venteIndex = fields.findIndex((field) => field.key === 'section_vente');
  if (venteIndex === -1) return [...fields, ...growthFormFields];
  return [...fields.slice(0, venteIndex), ...growthFormFields, ...fields.slice(venteIndex)];
};

export default function Animaux({ rows = [], alimentationLogs = [], vaccins = [], loading, onCreate, onUpdate, onDelete, onRefresh }) {
  const [statusFilter, setStatusFilter] = useState('tous');
  const [healthFilter, setHealthFilter] = useState('tous');
  const [typeFilter, setTypeFilter] = useState('tous');
  const [localSearch, setLocalSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const statuses = ['tous', 'actif', 'vendu', 'mort', 'vole', 'reforme'];
  const healthStatuses = ['tous', 'sain', 'malade', 'blesse', 'sous_traitement', 'a_surveiller'];
  const types = ['tous', 'Bovin', 'Ovin', 'Caprin'];
  const initialAnimal = useMemo(() => {
    const id = generateSequentialId('animaux', rows, { type: 'Bovin' });
    const today = new Date().toISOString().slice(0, 10);
    return { id, tag: id, type: 'Bovin', status: 'actif', health_status: 'sain', mode_acquisition: 'achat', date_achat: today, date_entree_ferme: today, date_poids_entree: today, date_derniere_pesee: today, sexe: 'F', en_gestation: false, statut_reproduction: 'inconnu', sale_price: 0 };
  }, [rows]);

  const metricsFor = (animal) => calculateAnimalMetrics({ animal, animals: rows, feedingLogs: alimentationLogs, vaccins });
  const lifecycleFor = (animal) => enrichAnimalLifecycle({ animal, animals: rows, metrics: metricsFor(animal) });
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
    if (entryWeight > 0 && entryDate && !history.some((item) => item.date === entryDate && Number(item.poids) === entryWeight)) {
      history.unshift({ date: entryDate, poids: entryWeight, note: 'Poids entree ferme' });
    }

    const { poids_history_text, ...cleanPayload } = payload;
    return {
      ...cleanPayload,
      purchase_cost: isBirthMode ? 0 : Number(payload.purchase_cost || 0),
      date_achat: mode === 'achat' ? payload.date_achat || '' : '',
      date_entree_ferme: dateEntree,
      naissance: dateNaissance,
      poids_entree: entryWeight || null,
      date_poids_entree: entryDate,
      date_derniere_pesee: lastWeightDate,
      poids_history: history,
      ras_veterinaire: payload.ras_veterinaire || (payload.health_status === 'sain' ? 'Consultation effectuee, RAS selon le veterinaire' : ''),
      sante: payload.frais_sante ?? payload.sante ?? 0,
      sale_price: payload.prix_vente_reel ?? payload.sale_price ?? 0,
      statut_reproduction: payload.sexe === 'F' ? (payload.en_gestation ? 'en_gestation' : payload.statut_reproduction || 'inconnu') : payload.statut_reproduction || 'non_reproductrice',
    };
  };

  const motherOptions = useMemo(() => rows.filter((animal) => animal.sexe === 'F').map((animal) => ({ value: animal.id, label: `${animal.id} - ${animal.name || 'Femelle'}` })), [rows]);
  const fatherOptions = useMemo(() => rows.filter((animal) => animal.sexe === 'M').map((animal) => ({ value: animal.id, label: `${animal.id} - ${animal.name || 'Male'}` })), [rows]);
  const animalFormFields = useMemo(() => insertGrowthFields(MODULE_FORM_FIELDS.animaux).map((field) => {
    if (field.key === 'mere_id') return { ...field, options: motherOptions };
    if (field.key === 'pere_id' || field.key === 'male_reproducteur_id') return { ...field, options: fatherOptions };
    return field;
  }), [motherOptions, fatherOptions]);
  const buildModalValues = (animal = {}) => {
    const data = { ...animal, date_naissance: animal.date_naissance || animal.naissance || '', poids_history_text: stringifyWeightHistory(animal) };
    const healthCost = Number(data.frais_sante ?? data.sante ?? 0);
    const metrics = animal.id ? metricsFor(data) : { feedingCost: 0, healthCost, totalCost: Number(data.purchase_cost || 0) + healthCost + Number(data.autres_frais || 0), margin: null };
    const growth = buildGrowthSummary(data);
    return { ...data, alimentation_calculee_view: fmtCurrency(metrics.feedingCost), frais_sante_view: fmtCurrency(metrics.healthCost), cout_total_calcule_view: fmtCurrency(metrics.totalCost), marge_calculee_view: metrics.margin === null ? 'En cours' : fmtCurrency(metrics.margin), sale_readiness_score: growth.history.length >= 2 ? `${growth.label} - ${growth.averageDailyGain.toFixed(2)} kg/jour` : 'Ajouter pesees' };
  };

  const filtered = useMemo(() => rows.filter((a) => {
    const passStatus = statusFilter === 'tous' || (a.status || 'actif') === statusFilter;
    const passHealth = healthFilter === 'tous' || (a.health_status || 'sain') === healthFilter;
    const passType = typeFilter === 'tous' || a.type === typeFilter;
    const q = localSearch.trim().toLowerCase();
    const passSearch = !q || String(a.name || '').toLowerCase().includes(q) || String(a.id || '').toLowerCase().includes(q);
    return passStatus && passHealth && passType && passSearch;
  }), [rows, statusFilter, healthFilter, typeFilter, localSearch]);

  const kpis = { actifs: rows.filter((a) => isActiveAnimalForFeeding(a)).length, malades: rows.filter((a) => a.health_status === 'malade').length, vendus: rows.filter((a) => a.status === 'vendu').length, morts: rows.filter((a) => a.status === 'mort').length, voles: rows.filter((a) => a.status === 'vole').length };
  const reproductionAlerts = useMemo(() => rows.flatMap((animal) => getReproductionAlerts(animal)), [rows]);
  const referenceAnimal = filtered[0] || rows[0] || null;
  const referenceMetrics = referenceAnimal ? metricsFor(referenceAnimal) : null;
  const referenceCost = referenceMetrics?.totalCost || 0;
  const referenceMarge = referenceMetrics?.margin || 0;

  const openWhatsApp = (animal) => { const url = toWhatsappLink(DEFAULT_PHONE, `Rapport animal ${animal.name} (${animal.id})`); window.open(url, '_blank', 'noopener,noreferrer'); };

  const submitCreate = async (payload) => { try { setSaving(true); await onCreate(preparePayload(payload)); toast.success('Animal ajoute avec succes'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur creation'); } finally { setSaving(false); } };
  const submitEdit = async (payload) => { if (!selected) return; try { setSaving(true); await onUpdate(selected.id, preparePayload(payload)); toast.success('Animal modifie avec succes'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur modification'); } finally { setSaving(false); } };
  const confirmDelete = async () => { if (!selected) return; try { setSaving(true); await onDelete(selected.id); toast.success('Animal supprime'); setModal(null); } catch (error) { toast.error(error.message || 'Erreur suppression'); } finally { setSaving(false); } };

  const exportRows = () => { exportToCsv({ rows: filtered, columns: ['id', 'tag', 'name', 'type', 'sexe', 'poids', 'status'], fileName: 'animaux.csv' }); exportToExcel({ rows: filtered, fileName: 'animaux.xlsx', sheetName: 'Animaux' }); exportToPdf({ rows: filtered, columns: ['id', 'tag', 'name', 'type', 'sexe', 'poids', 'status'], fileName: 'animaux.pdf', title: 'Liste des animaux' }); toast.success('Exports CSV/Excel/PDF generes'); };

  const columns = [
    { key: 'photo_url', label: 'Photo', render: (a) => a.photo_url ? <img src={a.photo_url} alt={a.name} className="h-10 w-10 rounded-lg object-cover border border-[#d6c3a0]" /> : <div className="h-10 w-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs text-emerald-400">{a.type?.[0] || 'A'}</div> },
    { key: 'tag', label: 'Tag/ID', sortable: true, render: (a) => <span className="font-mono text-emerald-400 text-xs">{a.tag || a.id}</span> },
    { key: 'name', label: 'Nom', sortable: true, render: (a) => <span className="font-semibold text-[#2f2415]">{a.name}</span> },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'sexe', label: 'Sexe', sortable: true, render: (a) => (a.sexe === 'M' ? 'Male' : 'Femelle') },
    { key: 'poids', label: 'Poids (kg)', sortable: true, render: (a) => <span className="text-[#2f2415] font-semibold">{a.poids}</span> },
    { key: 'croissance', label: 'Croissance', render: (a) => buildGrowthSummary(a).label },
    { key: 'age_calcule', label: 'Age', sortable: true, render: (a) => calculateAge(getAnimalBirthDate(a)).label },
    { key: 'coutTotal', label: 'Cout total', sortable: true, render: (a) => fmtCurrency(metricsFor(a).totalCost) },
    { key: 'marge', label: 'Marge est.', render: (a) => { const { margin } = metricsFor(a); if (margin === null) return <span className="text-[#b39b78]">En cours</span>; return <span className={margin >= 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>{fmtCurrency(margin)}</span>; } },
    { key: 'health_status', label: 'Etat sante', render: (a) => <Badge status={a.health_status || 'sain'} /> },
    { key: 'score_sante', label: 'Score auto', render: (a) => `${metricsFor(a).healthScore}%` },
    { key: 'status', label: 'Statut admin', render: (a) => <Badge status={a.status || 'actif'} /> },
    { key: 'actions', label: 'Actions', render: (a) => <div className="flex gap-1"><ActionIconButton icon={Eye} title="Voir" color="sky" onClick={() => { setSelected(a); setModal('details'); }} /><ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={() => { setSelected(a); setModal('edit'); }} /><ActionIconButton icon={MessageCircle} title="WhatsApp" color="whatsapp" onClick={() => openWhatsApp(a)} /><ActionIconButton icon={AlertTriangle} title="Supprimer" color="red" onClick={() => { setSelected(a); setModal('delete'); }} /></div> },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Gestion des Animaux" sub="Bovins - Ovins - Caprins - croissance, sante, rentabilite" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Download} variant="outline" small onClick={exportRows}>Exporter</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Ajouter animal</Btn></>} />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4"><KpiCard icon={CheckCircle} label="Actifs" value={kpis.actifs} color="bg-emerald-500/20 text-emerald-400" /><KpiCard icon={AlertTriangle} label="Malades" value={kpis.malades} color="bg-red-500/20 text-red-400" /><KpiCard icon={Tag} label="Vendus" value={kpis.vendus} color="bg-sky-500/20 text-sky-400" /><KpiCard icon={XCircle} label="Morts" value={kpis.morts} color="bg-zinc-700/30 text-zinc-300" /><KpiCard icon={AlertTriangle} label="Voles" value={kpis.voles} color="bg-orange-500/20 text-orange-400" /></div>
      {reproductionAlerts.length ? <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4"><p className="text-amber-500 font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} />Alertes reproduction</p><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{reproductionAlerts.slice(0, 4).map((alert) => <div key={alert.id} className={`rounded-xl border p-3 text-sm ${alert.severity === 'danger' ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-amber-500/10 border-amber-500/20 text-[#7d6a4a]'}`}><p className="font-semibold">{alert.title}</p><p className="text-xs mt-1">{alert.message}</p></div>)}</div></div> : null}
      <div className="flex flex-wrap gap-3"><VoiceSearch value={localSearch} onChange={setLocalSearch} placeholder="Rechercher un animal..." /><div className="flex flex-wrap gap-2">{statuses.map((s) => <button key={s} type="button" onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${statusFilter === s ? 'bg-emerald-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456] hover:border-emerald-500'}`}>{s}</button>)}</div><div className="flex flex-wrap gap-2">{healthStatuses.map((s) => <button key={s} type="button" onClick={() => setHealthFilter(s)} className={`px-3 py-2 rounded-lg text-sm capitalize transition-all ${healthFilter === s ? 'bg-sky-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456] hover:border-sky-500'}`}>{s.replace('_', ' ')}</button>)}</div><div className="flex flex-wrap gap-2">{types.map((t) => <button key={t} type="button" onClick={() => setTypeFilter(t)} className={`px-3 py-2 rounded-lg text-sm transition-all ${typeFilter === t ? 'bg-amber-500 text-black font-semibold' : 'bg-[#ffffff] border border-[#d6c3a0] text-[#8a7456] hover:border-amber-500'}`}>{t}</button>)}</div></div>
      <DataTable title="Liste des animaux" rows={filtered} columns={columns} loading={loading} initialSortKey="id" searchPlaceholder="Recherche table..." />
      {referenceAnimal ? <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5"><p className="font-semibold text-[#2f2415] mb-4">Calculs automatiques - {referenceAnimal.id} {referenceAnimal.name}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[{ label: 'Cout total', value: fmtCurrency(referenceCost) }, { label: 'Marge estimee', value: referenceAnimal.sale_price ? fmtCurrency(referenceMarge) : 'En cours' }, { label: 'Alimentation calculee', value: fmtCurrency(referenceMetrics?.feedingCost || 0) }, { label: 'Frais sante / soins', value: fmtCurrency(referenceMetrics?.healthCost || 0) }, { label: 'Score sante auto', value: `${referenceMetrics?.healthScore || 0}%` }, { label: 'Age calcule', value: calculateAge(getAnimalBirthDate(referenceAnimal)).label }, { label: 'Croissance', value: buildGrowthSummary(referenceAnimal).label }, { label: 'Gain moyen', value: `${buildGrowthSummary(referenceAnimal).averageDailyGain.toFixed(2)} kg/jour` }].map((c) => <div key={c.label} className="bg-[#fffdf8] rounded-xl p-3 border border-[#d6c3a0]"><div className="text-xs text-[#8a7456] mb-1">{c.label}</div><div className="text-[#2f2415] font-semibold">{c.value}</div></div>)}</div></div> : <div className="bg-[#ffffff] border border-[#d6c3a0] rounded-2xl p-5 text-center"><p className="font-semibold text-[#2f2415]">Aucun animal charge depuis Supabase</p><p className="text-sm text-[#8a7456] mt-1">Ajoute un animal ou relance la migration SQL pour charger les donnees de test.</p></div>}
      <AnimalDetailsModal open={modal === 'details'} onClose={() => setModal(null)} animal={selected} metrics={selected ? metricsFor(selected) : {}} animals={rows} vaccins={vaccins} lifecycle={selected ? lifecycleFor(selected) : null} onOpenTrace={() => toast.success('Ouvre le module Tracabilite pour cette fiche')} onAddDocument={() => toast.success('Ajout document disponible depuis le module Documents')} />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={submitCreate} fields={animalFormFields} initialValues={buildModalValues(initialAnimal)} autoId={(values) => generateSequentialId('animaux', rows, values)} uploadFolder="animaux" loading={saving} title="Ajouter un animal" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={submitEdit} fields={animalFormFields} initialValues={selected ? buildModalValues(selected) : {}} uploadFolder="animaux" loading={saving} title="Modifier animal" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={confirmDelete} itemLabel={selected ? `${selected.name} (${selected.id})` : ''} loading={saving} />
    </div>
  );
}
