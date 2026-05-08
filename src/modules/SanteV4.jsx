import { AlertTriangle, CheckCircle, Clock, Edit, Eye, MapPin, MessageCircle, Phone, Plus, RefreshCw, Search, ShieldCheck, Star, Trash2 } from 'lucide-react';
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
import DetailsModal from '../modals/DetailsModal';
import EditModal from '../modals/EditModal';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { calculateVaccineMetrics } from '../utils/businessCalculations';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { buildSenegalMapQuery, DEFAULT_PHONE } from '../utils/location';
import { generateSequentialId, toWhatsappLink } from '../utils/ids';
import { searchGeoPlaces } from '../services/geoSearchService';

const safeArray = (value) => Array.isArray(value) ? value : [];
const money = (value) => fmtCurrency(Number(value || 0));
const todayIso = () => new Date().toISOString().slice(0, 10);
const amount = (row = {}) => toNumber(row.cout ?? row.amount ?? row.montant ?? row.total);
const isDone = (row = {}) => calculateVaccineMetrics(row).smartStatus === 'fait' || ['fait', 'realise', 'réalisé'].includes(String(row.statut || row.status || '').toLowerCase());
const animalHealth = (animal = {}) => String(animal.health_status || animal.sante || '').toLowerCase();
const isSickAnimal = (animal = {}) => ['malade', 'blesse', 'sous_traitement', 'critique'].some((x) => animalHealth(animal).includes(x));
const lotDead = (lot = {}) => toNumber(lot.mortality ?? lot.morts ?? lot.dead_count ?? lot.pertes);
const lotSick = (lot = {}) => toNumber(lot.malades ?? lot.sick_count ?? lot.malade_count);

function ensureFields() {
  const fields = MODULE_FORM_FIELDS.sante || [];
  const add = (afterKey, items) => {
    const index = Math.max(0, fields.findIndex((field) => field.key === afterKey));
    items.forEach((item, offset) => {
      if (!fields.some((field) => field.key === item.key)) fields.splice(index + 1 + offset, 0, item);
    });
  };
  add('animal', [
    { key: 'module_lie', label: 'Module lie', type: 'select', options: ['animaux', 'avicole'] },
    { key: 'related_id', label: 'ID animal / lot', type: 'text' },
  ]);
  add('cout', [
    { key: 'medicament', label: 'Medicament / produit utilise', type: 'text' },
    { key: 'quantite_utilisee', label: 'Quantite utilisee', type: 'number' },
    { key: 'impact_business_note', label: 'Observation / impact business', type: 'text', fullWidth: true },
  ]);
}

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const navButtons = Array.from(document.querySelectorAll('nav button'));
  navButtons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}

function openMaps(record = {}) {
  const query = encodeURIComponent(buildSenegalMapQuery(record, 'veterinaire Senegal'));
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener,noreferrer');
}

function openVetWhatsApp(vetOrName, vets = []) {
  const vet = typeof vetOrName === 'string' ? vets.find((v) => String(vetOrName).toLowerCase().includes(String(v.nom || '').toLowerCase())) : vetOrName;
  const label = vet?.nom || vetOrName || 'Docteur';
  const phone = vet?.whatsapp || vet?.tel || DEFAULT_PHONE;
  window.open(toWhatsappLink(phone, `Bonjour ${label}, intervention demandee pour Horizon Farm.`), '_blank', 'noopener,noreferrer');
}

function PriorityCard({ title, value, detail, moduleKey, danger }) {
  return (
    <button type="button" onClick={() => openModule(moduleKey)} className={`text-left rounded-xl border p-4 hover:border-[#b6975f] transition-all ${danger ? 'bg-red-50/70 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <p className="font-bold text-[#2f2415]">{title}</p>
      <p className="text-2xl font-black text-[#2f2415] mt-1">{value}</p>
      <p className="text-xs text-[#8a7456] mt-1">{detail}</p>
      <p className="text-xs font-semibold text-[#9a6b12] mt-3">Ouvrir le module</p>
    </button>
  );
}

function VetCard({ vet, onDetails, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-sky-500/15 flex items-center justify-center text-sky-500 font-bold">{vet.nom?.[0] || 'V'}</div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-[#2f2415] truncate">{vet.nom || 'Veterinaire'}</p>
          <p className="text-xs text-[#8a7456]">{vet.specialite || 'Veterinaire'}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold"><Star size={12} fill="currentColor" />{vet.note || '-'}</div>
      </div>
      <div className="text-sm text-[#7d6a4a] space-y-1">
        <p className="flex items-center gap-2"><Phone size={13} />{vet.tel || 'Telephone non renseigne'}</p>
        <p className="flex items-center gap-2"><MapPin size={13} />{vet.adresse || vet.gps || 'Position non renseignee'}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Btn variant="outline" small icon={Eye} onClick={onDetails}>Fiche</Btn>
        <Btn variant="outline" small icon={Phone} onClick={() => vet.tel && window.open(`tel:${vet.tel}`, '_self')}>Appeler</Btn>
        <Btn variant="whatsapp" small icon={MessageCircle} onClick={() => openVetWhatsApp(vet)}>WhatsApp</Btn>
        <Btn variant="outline" small icon={MapPin} onClick={() => openMaps(vet)}>Carte</Btn>
        <ActionIconButton icon={Edit} title="Modifier" color="amber" onClick={onEdit} />
        <ActionIconButton icon={Trash2} title="Supprimer" color="red" onClick={onDelete} />
      </div>
    </div>
  );
}

export default function SanteV4({
  rows = [], vets = [], loading, vetsLoading,
  onCreate, onUpdate, onDelete, onRefresh,
  onCreateVet, onUpdateVet, onDeleteVet, onRefreshVets,
  animaux = [], lots = [], stocks = [], transactions = [],
  onCreateFinanceTransaction, onRefreshFinances,
}) {
  ensureFields();
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedVet, setSelectedVet] = useState(null);
  const [vetModal, setVetModal] = useState(null);
  const [vetSaving, setVetSaving] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoSearch, setGeoSearch] = useState(null);

  const summary = useMemo(() => {
    const vaccines = safeArray(rows);
    const done = vaccines.filter((v) => calculateVaccineMetrics(v).smartStatus === 'fait');
    const todo = vaccines.filter((v) => calculateVaccineMetrics(v).smartStatus === 'a_faire');
    const late = vaccines.filter((v) => calculateVaccineMetrics(v).smartStatus === 'retard');
    const sickAnimals = safeArray(animaux).filter(isSickAnimal);
    const riskyLots = safeArray(lots).filter((lot) => lotDead(lot) > 0 || lotSick(lot) > 0);
    const healthCosts = vaccines.reduce((sum, row) => sum + amount(row), 0) + safeArray(transactions).filter((trx) => String(trx.categorie || trx.category || '').toLowerCase().includes('sante')).reduce((sum, trx) => sum + amount(trx), 0);
    const healthStockCritical = safeArray(stocks).filter((item) => {
      const text = `${item.nom || ''} ${item.name || ''} ${item.categorie || ''} ${item.category || ''}`.toLowerCase();
      const isHealth = ['vaccin', 'medicament', 'médicament', 'sante', 'santé', 'veto'].some((x) => text.includes(x));
      return isHealth && toNumber(item.quantite ?? item.quantity) <= toNumber(item.seuil ?? item.threshold);
    });
    const coverage = vaccines.length ? (done.length / vaccines.length) * 100 : 0;
    return { done, todo, late, sickAnimals, riskyLots, healthCosts, healthStockCritical, coverage };
  }, [rows, animaux, lots, stocks, transactions]);

  const priorities = [
    summary.late.length ? { title: 'Vaccins en retard', value: summary.late.length, detail: 'À traiter dans le planning santé.', moduleKey: 'Sante', danger: true } : null,
    summary.sickAnimals.length ? { title: 'Animaux malades', value: summary.sickAnimals.length, detail: 'Vérifier les fiches animales.', moduleKey: 'Animaux', danger: true } : null,
    summary.riskyLots.length ? { title: 'Lots avicoles à risque', value: summary.riskyLots.length, detail: 'Morts ou malades signalés.', moduleKey: 'Avicole', danger: true } : null,
    summary.healthStockCritical.length ? { title: 'Stock santé critique', value: summary.healthStockCritical.length, detail: 'Vaccins/médicaments sous seuil.', moduleKey: 'Stock', danger: true } : null,
    summary.healthCosts > 0 ? { title: 'Coût santé', value: money(summary.healthCosts), detail: 'Suivi dans Impact Business.', moduleKey: 'Impact Business', danger: false } : null,
  ].filter(Boolean);

  const createFinanceIfNeeded = async (payload) => {
    const cost = amount(payload);
    if (!onCreateFinanceTransaction || cost <= 0 || !isDone(payload)) return;
    await onCreateFinanceTransaction({
      id: `TRX-SANTE-${Date.now()}`,
      type: 'sortie',
      libelle: `Sante - ${payload.nom || 'Intervention'}`,
      montant: cost,
      date: payload.effectuee || todayIso(),
      categorie: 'Sante',
      module_lie: payload.module_lie || 'sante',
      related_id: payload.related_id || payload.animal || payload.id,
      statut: 'paye',
    });
  };

  const run = async (action, success, close) => {
    try { setSaving(true); await action(); toast.success(success); close?.(); }
    catch (error) { toast.error(error.message || 'Action impossible'); }
    finally { setSaving(false); }
  };

  const runVet = async (action, success, close) => {
    try { setVetSaving(true); await action(); toast.success(success); close?.(); }
    catch (error) { toast.error(error.message || 'Action impossible'); }
    finally { setVetSaving(false); }
  };

  const refreshAll = async () => { await Promise.allSettled([onRefresh?.(), onRefreshVets?.()]); toast.success('Santé actualisée'); };

  const searchRealVets = async () => {
    try {
      setGeoLoading(true);
      const response = await searchGeoPlaces({ kind: 'veterinaires', radiusKm: 60 });
      setGeoSearch(response);
      toast.success(response.message);
    } catch (error) {
      toast.error(error.message || 'Recherche indisponible');
    } finally {
      setGeoLoading(false);
    }
  };

  const importGeoVet = (result) => runVet(async () => {
    await onCreateVet?.({
      id: generateSequentialId('veterinaires', vets),
      nom: result.nom,
      specialite: 'Veterinaire',
      tel: result.tel === 'Non renseigne' ? '' : result.tel,
      gps: result.gps,
      latitude: result.latitude,
      longitude: result.longitude,
      distance_km: result.distance_km,
      adresse: result.adresse === 'Adresse non renseignee' ? '' : result.adresse,
      note: 0,
      source: result.source,
      external_id: result.external_id,
      verified: true,
      favorite: false,
      notes: result.notes || 'Ajoute depuis la recherche geolocalisee.',
    });
    await onRefreshVets?.();
  }, 'Veterinaire ajouté');

  const columns = [
    { key: 'nom', label: 'Soin / vaccin', sortable: true, render: (v) => <span className="text-[#2f2415] font-semibold">{v.nom}</span> },
    { key: 'animal', label: 'Animal / lot', sortable: true },
    { key: 'prevue', label: 'Prévue', sortable: true },
    { key: 'effectuee', label: 'Effectuée', sortable: true, render: (v) => v.effectuee || <span className="text-[#b39b78]">-</span> },
    { key: 'vet', label: 'Vétérinaire', sortable: true },
    { key: 'cout', label: 'Coût', sortable: true, render: (v) => money(amount(v)) },
    { key: 'statut', label: 'Statut', sortable: true, render: (v) => <Badge status={calculateVaccineMetrics(v).smartStatus} /> },
    { key: 'actions', label: 'Actions', render: (v) => <div className="flex gap-1"><ActionIconButton icon={Eye} color="sky" title="Voir" onClick={() => { setSelected(v); setModal('details'); }} /><ActionIconButton icon={Edit} color="amber" title="Modifier" onClick={() => { setSelected(v); setModal('edit'); }} /><ActionIconButton icon={MessageCircle} color="whatsapp" title="WhatsApp" onClick={() => openVetWhatsApp(v.vet, vets)} /><ActionIconButton icon={Trash2} color="red" title="Supprimer" onClick={() => { setSelected(v); setModal('delete'); }} /></div> },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader title="Santé & Vaccins" sub="Un seul pilotage : priorités, planning, vétérinaires et impact santé." actions={<><Btn icon={RefreshCw} variant="outline" small onClick={refreshAll}>Refresh</Btn><Btn icon={Plus} small onClick={() => setModal('create')}>Nouveau soin/vaccin</Btn></>} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard icon={ShieldCheck} label="Couverture" value={`${summary.coverage.toFixed(1)}%`} sub={`${fmtNumber(summary.done.length)} faits / ${fmtNumber(rows.length)}`} color="bg-emerald-500/20 text-emerald-500" />
        <KpiCard icon={Clock} label="À faire" value={fmtNumber(summary.todo.length)} color="bg-amber-500/20 text-amber-500" />
        <KpiCard icon={AlertTriangle} label="En retard" value={fmtNumber(summary.late.length)} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={HeartPulse} label="Malades / risques" value={`${fmtNumber(summary.sickAnimals.length)} / ${fmtNumber(summary.riskyLots.length)}`} color="bg-red-500/20 text-red-500" />
        <KpiCard icon={Receipt} label="Coût santé" value={money(summary.healthCosts)} color="bg-sky-500/20 text-sky-500" />
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4"><h3 className="font-black text-[#2f2415]">Priorités</h3><Btn variant="outline" small onClick={() => openModule('Impact Business')}>Impact Business</Btn></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {priorities.length ? priorities.map((item) => <PriorityCard key={item.title} {...item} />) : <div className="md:col-span-2 xl:col-span-3 bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4 text-sm text-[#8a7456]">Aucune urgence santé détectée.</div>}
        </div>
      </div>

      <DataTable title="Planning santé" rows={rows} columns={columns} loading={loading} initialSortKey="prevue" />

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div><h3 className="font-black text-[#2f2415]">Vétérinaires</h3><p className="text-sm text-[#8a7456]">Contacts utiles, recherche proche et accès carte sans carte géante.</p></div>
          <div className="flex flex-wrap gap-2"><Btn icon={Search} variant="outline" small onClick={searchRealVets}>{geoLoading ? 'Recherche...' : 'Recherche proche'}</Btn><Btn icon={Plus} small onClick={() => setVetModal('create')}>Ajouter vétérinaire</Btn></div>
        </div>

        {geoSearch ? <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-4"><p className="font-bold text-[#2f2415]">Résultats de recherche</p><p className="text-xs text-[#8a7456] mt-1">{geoSearch.message}</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">{safeArray(geoSearch.results).slice(0, 6).map((result) => <div key={result.id} className="bg-white border border-[#d6c3a0] rounded-xl p-3"><p className="font-semibold text-[#2f2415]">{result.nom}</p><p className="text-xs text-[#8a7456]">{result.adresse}</p><p className="text-xs text-[#8a7456] mt-1">Distance: {result.distance_km ?? '-'} km</p><div className="flex gap-2 mt-3"><Btn variant="outline" small icon={MapPin} onClick={() => openMaps(result)}>Carte</Btn><Btn small onClick={() => importGeoVet(result)}>Ajouter</Btn></div></div>)}</div></div> : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {vetsLoading ? <div className="text-sm text-[#8a7456]">Chargement vétérinaires...</div> : safeArray(vets).map((vet) => <VetCard key={vet.id} vet={vet} onDetails={() => { setSelectedVet(vet); setVetModal('details'); }} onEdit={() => { setSelectedVet(vet); setVetModal('edit'); }} onDelete={() => { setSelectedVet(vet); setVetModal('delete'); }} />)}
          {!vetsLoading && !safeArray(vets).length ? <div className="md:col-span-3 text-center bg-[#fffdf8] border border-dashed border-[#d6c3a0] rounded-xl p-6 text-sm text-[#8a7456]">Aucun vétérinaire enregistré.</div> : null}
        </div>
      </div>

      <DetailsModal open={modal === 'details'} onClose={() => setModal(null)} data={selected ? { ...selected, ...calculateVaccineMetrics(selected) } : selected} title="Détail soin / vaccin" />
      <CreateModal open={modal === 'create'} onClose={() => setModal(null)} onSubmit={(payload) => run(async () => { await onCreate?.(payload); await createFinanceIfNeeded(payload); await Promise.allSettled([onRefresh?.(), onRefreshFinances?.()]); }, 'Soin/vaccin ajouté', () => setModal(null))} fields={MODULE_FORM_FIELDS.sante} initialValues={{ id: generateSequentialId('sante', rows), statut: 'a_faire' }} autoId={() => generateSequentialId('sante', rows)} loading={saving} title="Ajouter soin / vaccin" submitLabel="Ajouter" />
      <EditModal open={modal === 'edit'} onClose={() => setModal(null)} onSubmit={(payload) => selected && run(async () => { await onUpdate?.(selected.id, payload); await createFinanceIfNeeded({ ...payload, id: selected.id }); await Promise.allSettled([onRefresh?.(), onRefreshFinances?.()]); }, 'Soin/vaccin modifié', () => setModal(null))} fields={MODULE_FORM_FIELDS.sante} initialValues={selected || {}} loading={saving} title="Modifier soin / vaccin" submitLabel="Enregistrer" />
      <DeleteModal open={modal === 'delete'} onClose={() => setModal(null)} onConfirm={() => selected && run(async () => { await onDelete?.(selected.id); await onRefresh?.(); }, 'Soin/vaccin supprimé', () => setModal(null))} itemLabel={selected ? `${selected.nom}` : ''} loading={saving} />

      <DetailsModal open={vetModal === 'details'} onClose={() => setVetModal(null)} data={selectedVet} title="Fiche vétérinaire" />
      <CreateModal open={vetModal === 'create'} onClose={() => setVetModal(null)} onSubmit={(payload) => runVet(async () => { await onCreateVet?.(payload); await onRefreshVets?.(); }, 'Vétérinaire ajouté', () => setVetModal(null))} fields={MODULE_FORM_FIELDS.veterinaires} initialValues={{ id: generateSequentialId('veterinaires', vets), note: 4.5 }} autoId={() => generateSequentialId('veterinaires', vets)} loading={vetSaving} title="Ajouter vétérinaire" submitLabel="Ajouter" />
      <EditModal open={vetModal === 'edit'} onClose={() => setVetModal(null)} onSubmit={(payload) => selectedVet && runVet(async () => { await onUpdateVet?.(selectedVet.id, payload); await onRefreshVets?.(); }, 'Vétérinaire modifié', () => setVetModal(null))} fields={MODULE_FORM_FIELDS.veterinaires} initialValues={selectedVet || {}} loading={vetSaving} title="Modifier vétérinaire" submitLabel="Enregistrer" />
      <DeleteModal open={vetModal === 'delete'} onClose={() => setVetModal(null)} onConfirm={() => selectedVet && runVet(async () => { await onDeleteVet?.(selectedVet.id); await onRefreshVets?.(); }, 'Vétérinaire supprimé', () => setVetModal(null))} itemLabel={selectedVet ? `${selectedVet.nom}` : ''} loading={vetSaving} />
    </div>
  );
}
