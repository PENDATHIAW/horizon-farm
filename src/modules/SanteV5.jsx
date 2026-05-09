import { AlertTriangle, CheckCircle2, HeartPulse, Package, ShieldCheck, Syringe } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import useCrudModule from '../hooks/useCrudModule';
import { prepareBiosecurityWorkflow, commitBiosecurityWorkflow } from '../services/workflowService';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import SanteV4 from './SanteV4.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const labelOf = (row = {}) => row.name || row.nom || row.tag || row.produit || row.id || '—';
const healthStatus = (row = {}) => String(row.health_status || row.sante || row.status_sante || row.status || '').toLowerCase();
const isHealthStock = (s = {}) => `${s.categorie || ''} ${s.produit || ''}`.toLowerCase().match(/vaccin|médicament|medicament|soin|vermifuge|antibiotique|désinfectant|desinfectant/);
const isDisinfectantStock = (s = {}) => `${s.categorie || ''} ${s.produit || ''}`.toLowerCase().match(/désinfectant|desinfectant|biosécurité|biosecurite|nettoyage/);
const isAvailableAnimal = (a = {}) => !['vendu', 'mort', 'vole', 'volé', 'reforme', 'réforme'].includes(String(a.status || '').toLowerCase());
const isActiveLot = (lot = {}) => !['vendu', 'termine', 'terminé', 'perdu'].includes(String(lot.status || '').toLowerCase());
const isSickAnimal = (a = {}) => ['malade', 'blesse', 'blessé', 'sous_traitement', 'a_surveiller', 'critique'].some((x) => healthStatus(a).includes(x));
const lotSickCount = (lot = {}) => toNumber(lot.malades ?? lot.sick_count ?? lot.malade_count);
const lotDeadCount = (lot = {}) => toNumber(lot.morts ?? lot.mortality ?? lot.dead_count ?? lot.pertes);
const lotTotalCount = (lot = {}) => toNumber(lot.current_count ?? lot.effectif ?? lot.initial_count ?? lot.nombre ?? lot.quantite);
const isSickLot = (lot = {}) => ['malade', 'sous_traitement', 'a_surveiller', 'critique', 'baisse_ponte'].some((x) => healthStatus(lot).includes(x)) || lotSickCount(lot) > 0 || lotDeadCount(lot) > 0;
const dueSoon = (v = {}) => {
  if (!v.prevue) return false;
  const days = (new Date(v.prevue) - new Date()) / 86400000;
  return days >= 0 && days <= 7;
};
const late = (v = {}) => String(v.statut || '').toLowerCase() === 'retard' || (v.prevue && !v.effectuee && new Date(v.prevue) < new Date());

const interventionTypes = [
  { value: 'vaccination', label: 'Vaccination', family: 'preventif' },
  { value: 'preventif', label: 'Prévention / contrôle sanitaire', family: 'preventif' },
  { value: 'curatif', label: 'Soin curatif / traitement maladie', family: 'curatif' },
  { value: 'deparasitage', label: 'Déparasitage / traitement préventif', family: 'preventif' },
  { value: 'visite_veterinaire', label: 'Visite vétérinaire', family: 'mixte' },
  { value: 'biosecurite', label: 'Biosécurité / désinfection / quarantaine', family: 'biosecurite' },
  { value: 'urgence', label: 'Urgence sanitaire / mortalité', family: 'curatif' },
];
const typeLabel = (value) => interventionTypes.find((item) => item.value === value)?.label || value || 'Intervention sanitaire';
const typeFamily = (value) => interventionTypes.find((item) => item.value === value)?.family || 'preventif';

function buildTargetOptions(type, animaux = [], lots = []) {
  const family = typeFamily(type);
  const availableAnimals = arr(animaux).filter(isAvailableAnimal);
  const activeLots = arr(lots).filter(isActiveLot);
  const sickAnimals = availableAnimals.filter(isSickAnimal);
  const sickLots = activeLots.filter(isSickLot);

  if (family === 'curatif') {
    return [
      { value: 'scope:animaux_malades', label: `Animaux malades / à surveiller (${sickAnimals.length})` },
      { value: 'scope:avicole_malade', label: `Volaille malade / lots à risque (${sickLots.length})` },
      ...sickAnimals.map((animal) => ({ value: `animal:${animal.id}`, label: `${labelOf(animal)} · ${animal.id} · ${healthStatus(animal) || 'malade'}` })),
      ...sickLots.map((lot) => ({ value: `lot_malade:${lot.id}`, label: `${labelOf(lot)} · ${lotSickCount(lot) || 'sujets'} malades / ${lotTotalCount(lot) || '?'} volailles` })),
      { value: 'manual:animaux', label: 'Autre animal / saisie manuelle' },
      { value: 'manual:avicole', label: 'Autre lot avicole / saisie manuelle' },
    ];
  }

  if (family === 'biosecurite') {
    return [
      { value: 'scope:avicole_malade', label: `Lots à risque / volaille malade (${sickLots.length})` },
      { value: 'scope:avicole_all', label: `Tous les lots avicoles actifs (${activeLots.length})` },
      { value: 'scope:cheptel', label: `Tout le cheptel (${availableAnimals.length})` },
      ...activeLots.map((lot) => ({ value: `lot:${lot.id}`, label: `Lot ${labelOf(lot)} · ${lotTotalCount(lot) || '?'} sujets` })),
      ...availableAnimals.map((animal) => ({ value: `animal:${animal.id}`, label: `${labelOf(animal)} · ${animal.id}` })),
    ];
  }

  return [
    { value: 'scope:cheptel', label: `Tout le cheptel (${availableAnimals.length})` },
    { value: 'scope:avicole_all', label: `Tous les lots avicoles actifs (${activeLots.length})` },
    ...availableAnimals.map((animal) => ({ value: `animal:${animal.id}`, label: `${labelOf(animal)} · ${animal.id}` })),
    ...activeLots.map((lot) => ({ value: `lot:${lot.id}`, label: `Tout le lot ${labelOf(lot)} · ${lotTotalCount(lot) || '?'} sujets` })),
  ];
}

function resolveTarget(value, type, animaux = [], lots = []) {
  const availableAnimals = arr(animaux).filter(isAvailableAnimal);
  const activeLots = arr(lots).filter(isActiveLot);
  const sickAnimals = availableAnimals.filter(isSickAnimal);
  const sickLots = activeLots.filter(isSickLot);
  const raw = String(value || '').trim();
  const snapshotDate = now();

  if (raw === 'scope:cheptel') return { module_lie: 'animaux', related_id: 'ALL_ANIMAUX', target_scope: 'cheptel', target_ids: availableAnimals.map((a) => a.id), target_count: availableAnimals.length, total_count: availableAnimals.length, target_summary: `${availableAnimals.length} animaux disponibles`, target_snapshot_date: snapshotDate };
  if (raw === 'scope:animaux_malades') return { module_lie: 'animaux', related_id: 'ANIMAUX_MALADES', target_scope: 'animaux_malades', target_ids: sickAnimals.map((a) => a.id), target_count: sickAnimals.length, total_count: availableAnimals.length, target_summary: `${sickAnimals.length} animaux malades / à surveiller`, target_snapshot_date: snapshotDate };
  if (raw === 'scope:avicole_all') return { module_lie: 'avicole', related_id: 'ALL_AVICOLE_LOTS', target_scope: 'avicole_all', target_ids: activeLots.map((l) => l.id), target_count: activeLots.reduce((s, l) => s + (lotTotalCount(l) || 0), 0), total_count: activeLots.reduce((s, l) => s + (lotTotalCount(l) || 0), 0), target_summary: `${activeLots.length} lots avicoles actifs`, target_snapshot_date: snapshotDate };
  if (raw === 'scope:avicole_malade') return { module_lie: 'avicole', related_id: 'AVICOLE_MALADES', target_scope: 'avicole_malade', target_ids: sickLots.map((l) => l.id), target_count: sickLots.reduce((s, l) => s + (lotSickCount(l) || 1), 0), total_count: sickLots.reduce((s, l) => s + (lotTotalCount(l) || 0), 0), target_summary: `${sickLots.reduce((s, l) => s + (lotSickCount(l) || 1), 0)} volailles malades / lots à risque`, target_snapshot_date: snapshotDate };

  if (raw.startsWith('animal:')) {
    const id = raw.replace('animal:', '');
    const animal = availableAnimals.find((item) => String(item.id) === id) || {};
    return { module_lie: 'animaux', related_id: id, target_scope: isSickAnimal(animal) ? 'animal_malade' : 'animal', target_ids: [id], target_count: 1, total_count: 1, target_summary: `${labelOf(animal)} · ${id}`, target_snapshot_date: snapshotDate };
  }
  if (raw.startsWith('lot_malade:') || raw.startsWith('lot:')) {
    const id = raw.replace('lot_malade:', '').replace('lot:', '');
    const lot = activeLots.find((item) => String(item.id) === id) || {};
    const sick = lotSickCount(lot);
    const total = lotTotalCount(lot);
    const curative = typeFamily(type) === 'curatif';
    return { module_lie: 'avicole', related_id: id, target_scope: curative ? 'lot_avicole_malade' : 'lot_avicole', target_ids: [id], target_count: curative ? (sick || 1) : total, total_count: total, target_summary: curative ? `${sick || 1} volailles malades sur ${total || '?'} dans ${labelOf(lot)}` : `Tout le lot ${labelOf(lot)} (${total || '?'} sujets)`, target_snapshot_date: snapshotDate };
  }
  return { module_lie: raw.includes('avicole') ? 'avicole' : 'animaux', related_id: '', target_scope: 'manuel', target_ids: [], target_count: 0, total_count: 0, target_summary: 'Cible manuelle à préciser', target_snapshot_date: snapshotDate };
}

async function markDone(v, props) {
  const cost = toNumber(v.cout);
  try {
    await props.onUpdate?.(v.id, { statut: 'fait', effectuee: v.effectuee || today(), closed_at: new Date().toISOString() });
    if (cost > 0) {
      await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'sortie', libelle: `Soin/Vaccin ${v.nom || v.id}`, montant: cost, date: today(), categorie: 'Sante', module_lie: 'sante', related_id: v.id, statut: 'paye', source_module: 'sante', source_record_id: v.id });
      await props.onRefreshFinances?.();
    }
    toast.success('Soin validé et relié aux finances');
  } catch (error) {
    toast.error(error.message || 'Validation santé impossible');
  }
}

function InterventionWorkflowPanel(props) {
  const tachesCrud = useCrudModule('taches');
  const alertesCrud = useCrudModule('alertes_center');
  const businessEventsCrud = useCrudModule('business_events');
  const documentsCrud = useCrudModule('documents');
  const stockCrud = useCrudModule('stock');
  const [form, setForm] = useState({ type_intervention: 'preventif', target: 'scope:cheptel', date: today(), statut: 'a_faire' });
  const animals = arr(props.animaux);
  const lots = arr(props.lots);
  const stockRows = arr(props.stocks?.length ? props.stocks : stockCrud.rows);
  const targetOptions = useMemo(() => buildTargetOptions(form.type_intervention, animals, lots), [form.type_intervention, animals, lots]);
  const target = useMemo(() => resolveTarget(form.target || targetOptions[0]?.value, form.type_intervention, animals, lots), [form.target, form.type_intervention, animals, lots, targetOptions]);
  const healthStocks = stockRows.filter(typeFamily(form.type_intervention) === 'biosecurite' ? isDisinfectantStock : isHealthStock);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value, ...(key === 'type_intervention' ? { target: buildTargetOptions(value, animals, lots)[0]?.value || '' } : {}) }));

  const decrementStock = async () => {
    if (!form.stock_id || !toNumber(form.quantite_utilisee)) return;
    const stock = stockRows.find((s) => String(s.id) === String(form.stock_id));
    if (!stock) return;
    const nextQty = Math.max(0, toNumber(stock.quantite) - toNumber(form.quantite_utilisee));
    const updateStock = props.onUpdateStock || stockCrud.update;
    await updateStock?.(stock.id, { quantite: nextQty, last_movement_type: 'sortie', last_movement_label: typeFamily(form.type_intervention) === 'biosecurite' ? 'biosécurité' : 'santé', last_movement_qty: toNumber(form.quantite_utilisee), last_movement_at: now() });
    if (nextQty <= toNumber(stock.seuil)) {
      await alertesCrud.create?.({ id: makeId('ALT'), title: `Stock santé critique: ${stock.produit}`, message: `${stock.produit} est sous le seuil après intervention sanitaire`, module_source: 'stock', entity_type: 'stock', entity_id: stock.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Préparer un réapprovisionnement santé/biosécurité.' });
    }
  };

  const submit = async () => {
    if (!form.target) return toast.error('Choisis une cible sanitaire');
    if (!form.nom && !form.medicament) return toast.error('Renseigne au moins le vaccin, soin ou produit utilisé');
    try {
      const interventionId = makeId('SAN');
      const label = typeLabel(form.type_intervention);
      const interventionPayload = {
        id: interventionId,
        nom: form.nom || label,
        type_intervention: form.type_intervention,
        nature_intervention: typeFamily(form.type_intervention),
        animal: target.target_summary,
        module_lie: target.module_lie,
        related_id: target.related_id,
        target_scope: target.target_scope,
        target_ids: target.target_ids,
        target_count: target.target_count,
        total_count: target.total_count,
        target_summary: target.target_summary,
        target_snapshot_date: target.target_snapshot_date,
        prevue: form.date || today(),
        effectuee: form.statut === 'fait' ? (form.date || today()) : '',
        statut: form.statut || 'a_faire',
        vet: form.vet || '',
        medicament: form.medicament || form.nom || '',
        quantite_utilisee: toNumber(form.quantite_utilisee),
        stock_id: form.stock_id || '',
        cout: toNumber(form.cout),
        prochaine_action: form.prochaine_action || '',
        notes: form.notes || '',
        preuve_url: form.preuve_url || '',
        biosafety_required: ['curatif', 'urgence', 'biosecurite'].includes(form.type_intervention),
        source_module: 'sante_biosecurite',
      };

      await props.onCreate?.(interventionPayload);
      await decrementStock();

      if (toNumber(form.cout) > 0) {
        await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'sortie', libelle: `${label} - ${target.target_summary}`, montant: toNumber(form.cout), date: form.date || today(), categorie: typeFamily(form.type_intervention) === 'biosecurite' ? 'Biosecurite' : 'Sante', module_lie: 'sante', related_id: interventionId, statut: 'paye', source_module: 'sante', source_record_id: interventionId });
      }

      if (form.prochaine_action) {
        await tachesCrud.create?.({ id: makeId('TSK'), title: `Suivi ${label}`, module_lie: 'sante', related_id: interventionId, due_date: form.prochaine_action, priority: typeFamily(form.type_intervention) === 'curatif' ? 'haute' : 'moyenne', status: 'a_faire', checklist: 'Vérifier état sanitaire; documenter résultat; clôturer intervention', source_module: 'sante' });
      }

      await businessEventsCrud.create?.({ id: makeId('EVT'), event_type: typeFamily(form.type_intervention) === 'biosecurite' ? 'biosécurité' : 'intervention_sanitaire', module_source: 'sante', entity_type: target.module_lie, entity_id: target.related_id, title: label, description: target.target_summary, event_date: form.date || today(), severity: typeFamily(form.type_intervention) === 'curatif' ? 'warning' : 'info', related_id: interventionId, saisies_evitees: 5 });

      if (form.preuve_url) {
        await documentsCrud.create?.({ id: makeId('DOC'), title: `Preuve ${label}`, document_category: typeFamily(form.type_intervention) === 'biosecurite' ? 'sanitaire' : 'ordonnance', module_source: 'sante', entity_type: 'sante', entity_id: interventionId, file_url: form.preuve_url, related_id: interventionId });
      }

      if (['curatif', 'urgence', 'biosecurite'].includes(form.type_intervention)) {
        const preview = prepareBiosecurityWorkflow({ id: interventionId, trigger: form.type_intervention, title: `${label} - ${target.target_summary}`, message: form.notes || target.target_summary, module_source: 'sante', entity_type: target.module_lie, entity_id: target.related_id, risk_level: form.type_intervention === 'urgence' ? 'critique' : 'warning', protocol: form.type_intervention === 'biosecurite' ? 'Nettoyage, désinfection, contrôle accès et documentation' : 'Isoler si nécessaire, traiter, surveiller et documenter', next_control_date: form.prochaine_action || form.date || today(), document_url: form.preuve_url }, { tasks: tachesCrud.rows, alerts: alertesCrud.rows, events: businessEventsCrud.rows, documents: documentsCrud.rows });
        await commitBiosecurityWorkflow(preview, { onCreateAlert: alertesCrud.create, onCreateTask: tachesCrud.create, onCreateDocument: documentsCrud.create, onCreateBusinessEvent: businessEventsCrud.create });
      }

      await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.(), stockCrud.refresh?.(), tachesCrud.refresh?.(), alertesCrud.refresh?.(), businessEventsCrud.refresh?.(), documentsCrud.refresh?.()]);
      toast.success(`Intervention enregistrée · ${target.target_count || 1} cible(s) · 5+ saisies évitées`);
      setForm({ type_intervention: 'preventif', target: 'scope:cheptel', date: today(), statut: 'a_faire' });
    } catch (error) {
      toast.error(error.message || 'Intervention sanitaire impossible');
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456]">Santé & Biosécurité</p>
        <h3 className="font-black text-[#2f2415]">Nouvelle intervention sanitaire intelligente</h3>
        <p className="text-sm text-[#8a7456] mt-1">Préventif: cheptel/lots disponibles. Curatif: animaux et lots malades détectés. Biosécurité: lots à risque, quarantaine, désinfection.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Type intervention</span><select className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.type_intervention} onChange={(e) => update('type_intervention', e.target.value)}>{interventionTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></label>
        <label className="space-y-1 md:col-span-2"><span className="text-xs text-[#8a7456]">Cible proposée par l’ERP</span><select className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.target || targetOptions[0]?.value || ''} onChange={(e) => update('target', e.target.value)}>{targetOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Vaccin / soin / produit</span><input className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.nom || ''} onChange={(e) => update('nom', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Stock utilisé</span><select className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.stock_id || ''} onChange={(e) => update('stock_id', e.target.value)}><option value="">Aucun</option>{healthStocks.map((s) => <option key={s.id} value={s.id}>{s.produit} · {fmtNumber(s.quantite)} {s.unite || ''}</option>)}</select></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Quantité utilisée</span><input type="number" className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.quantite_utilisee || ''} onChange={(e) => update('quantite_utilisee', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Coût intervention</span><input type="number" className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.cout || ''} onChange={(e) => update('cout', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Date</span><input type="date" className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.date || today()} onChange={(e) => update('date', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Prochain suivi</span><input type="date" className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.prochaine_action || ''} onChange={(e) => update('prochaine_action', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Vétérinaire</span><input className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.vet || ''} onChange={(e) => update('vet', e.target.value)} /></label>
        <label className="space-y-1 md:col-span-2"><span className="text-xs text-[#8a7456]">Notes / protocole</span><input className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.notes || ''} onChange={(e) => update('notes', e.target.value)} /></label>
        <label className="space-y-1"><span className="text-xs text-[#8a7456]">Preuve / ordonnance URL</span><input className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={form.preuve_url || ''} onChange={(e) => update('preuve_url', e.target.value)} /></label>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        <b>Snapshot cible :</b> {target.target_summary} · module {target.module_lie || '—'} · ID {target.related_id || '—'} · count {target.target_count || 0}/{target.total_count || 0}
      </div>
      <div className="flex justify-end"><Btn icon={ShieldCheck} onClick={submit}>Valider intervention connectée</Btn></div>
    </div>
  );
}

function HealthBridge(props) {
  const vaccins = arr(props.rows);
  const stocks = arr(props.stocks);
  const healthStocks = stocks.filter(isHealthStock);
  const alerts = vaccins.filter((v) => late(v) || dueSoon(v)).slice(0, 6);
  const rupture = healthStocks.filter((s) => toNumber(s.quantite) <= toNumber(s.seuil)).length;
  const costs = vaccins.reduce((sum, v) => sum + toNumber(v.cout), 0);
  const sickAnimals = arr(props.animaux).filter(isSickAnimal).length;
  const sickLots = arr(props.lots).filter(isSickLot).length;
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Santé & Biosécurité</p>
          <h3 className="font-black text-[#2f2415]">Soins, prévention, biosécurité, stock santé, alertes et finances</h3>
          <p className="text-sm text-[#8a7456] mt-1">Une intervention peut créer automatiquement dépense, sortie stock, tâche, alerte, document et traçabilité.</p>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 text-sm"><Mini icon={Syringe} label="À suivre" value={alerts.length} /><Mini icon={Package} label="Stock santé" value={healthStocks.length} /><Mini icon={AlertTriangle} label="Ruptures" value={rupture} /><Mini icon={HeartPulse} label="Animaux malades" value={sickAnimals} /><Mini icon={ShieldCheck} label="Lots risque" value={sickLots} /></div>
      </div>
      {alerts.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{alerts.map((v) => <div key={v.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{v.nom || v.id}</p><p className="text-xs text-[#8a7456] mt-1">Prévu: {v.prevue || '—'} · coût: {fmtCurrency(v.cout)}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => markDone(v, props)}><CheckCircle2 size={14} className="inline" /> Valider fait</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun soin urgent.</div>}
      {healthStocks.length ? <p className="text-xs text-[#8a7456]">Stocks santé suivis: {healthStocks.slice(0, 5).map((s) => `${s.produit} (${fmtNumber(s.quantite)} ${s.unite || ''})`).join(' · ')}</p> : null}
      <p className="text-xs text-[#8a7456]">Coût santé total renseigné: {fmtCurrency(costs)}</p>
    </div>
  );
}
function Mini({ icon: Icon, label, value }) { return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>; }

export default function SanteV5(props) { return <div className="space-y-6"><HealthBridge {...props} /><InterventionWorkflowPanel {...props} /><SanteV4 {...props} /></div>; }
