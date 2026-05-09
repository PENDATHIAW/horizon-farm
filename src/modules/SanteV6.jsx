import { AlertTriangle, CheckCircle2, HeartPulse, Package, ShieldCheck, Syringe } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import useCrudModule from '../hooks/useCrudModule';
import { prepareBiosecurityWorkflow, commitBiosecurityWorkflow } from '../services/workflowService';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import SanteV4 from './SanteV4.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const labelOf = (r = {}) => r.name || r.nom || r.tag || r.produit || r.id || '—';
const healthStatus = (r = {}) => String(r.health_status || r.sante || r.status_sante || r.status || '').toLowerCase();
const isAvailableAnimal = (a = {}) => !['vendu', 'mort', 'vole', 'volé', 'reforme', 'réforme'].includes(String(a.status || '').toLowerCase());
const isActiveLot = (l = {}) => !['vendu', 'termine', 'terminé', 'perdu'].includes(String(l.status || '').toLowerCase());
const isSickAnimal = (a = {}) => ['malade', 'blesse', 'blessé', 'sous_traitement', 'a_surveiller', 'critique'].some((x) => healthStatus(a).includes(x));
const lotSickCount = (l = {}) => toNumber(l.malades ?? l.sick_count ?? l.malade_count);
const lotDeadCount = (l = {}) => toNumber(l.morts ?? l.mortality ?? l.dead_count ?? l.pertes);
const lotTotalCount = (l = {}) => toNumber(l.current_count ?? l.effectif ?? l.initial_count ?? l.nombre ?? l.quantite);
const isSickLot = (l = {}) => ['malade', 'sous_traitement', 'a_surveiller', 'critique', 'baisse_ponte'].some((x) => healthStatus(l).includes(x)) || lotSickCount(l) > 0 || lotDeadCount(l) > 0;
const isHealthStock = (s = {}) => `${s.categorie || ''} ${s.produit || ''}`.toLowerCase().match(/vaccin|medicament|médicament|soin|vermifuge|antibiotique|desinfectant|désinfectant/);
const isDisinfectantStock = (s = {}) => `${s.categorie || ''} ${s.produit || ''}`.toLowerCase().match(/desinfectant|désinfectant|biosecurite|biosécurité|nettoyage/);
const dueSoon = (v = {}) => v.prevue && ((new Date(v.prevue) - new Date()) / 86400000) >= 0 && ((new Date(v.prevue) - new Date()) / 86400000) <= 7;
const late = (v = {}) => String(v.statut || '').toLowerCase() === 'retard' || (v.prevue && !v.effectuee && new Date(v.prevue) < new Date());

const interventionTypes = [
  { value: 'vaccination', label: 'Vaccination', family: 'preventif' },
  { value: 'preventif', label: 'Prévention / contrôle sanitaire', family: 'preventif' },
  { value: 'curatif', label: 'Soin curatif / traitement maladie', family: 'curatif' },
  { value: 'deparasitage', label: 'Déparasitage', family: 'preventif' },
  { value: 'visite_veterinaire', label: 'Visite vétérinaire', family: 'mixte' },
  { value: 'biosecurite', label: 'Biosécurité / désinfection / quarantaine', family: 'biosecurite' },
  { value: 'urgence', label: 'Urgence sanitaire / mortalité', family: 'curatif' },
];
const familyOf = (type) => interventionTypes.find((t) => t.value === type)?.family || 'preventif';
const labelType = (type) => interventionTypes.find((t) => t.value === type)?.label || 'Intervention';

function modesFor(type, animaux, lots) {
  const family = familyOf(type);
  const animals = arr(animaux).filter(isAvailableAnimal);
  const activeLots = arr(lots).filter(isActiveLot);
  const sickAnimals = animals.filter(isSickAnimal);
  const sickLots = activeLots.filter(isSickLot);
  if (family === 'curatif') return [
    { value: 'scope:animaux_malades', label: `Animaux malades / à surveiller (${sickAnimals.length})` },
    { value: 'scope:avicole_malade', label: `Volaille malade / lots à risque (${sickLots.length})` },
    { value: 'detail:sick_animal', label: 'Un animal malade précis' },
    { value: 'detail:sick_lot', label: 'Un lot avicole malade précis' },
    { value: 'detail:animal', label: 'Autre animal précis' },
    { value: 'detail:lot', label: 'Autre lot avicole précis' },
  ];
  if (family === 'biosecurite') return [
    { value: 'scope:avicole_malade', label: `Lots à risque / volaille malade (${sickLots.length})` },
    { value: 'scope:avicole_all', label: `Tous les lots avicoles actifs (${activeLots.length})` },
    { value: 'scope:cheptel', label: `Tout le cheptel (${animals.length})` },
    { value: 'detail:lot', label: 'Un lot avicole précis' },
    { value: 'detail:animal', label: 'Un animal précis' },
  ];
  return [
    { value: 'scope:cheptel', label: `Tout le cheptel (${animals.length})` },
    { value: 'scope:avicole_all', label: `Tous les lots avicoles actifs (${activeLots.length})` },
    { value: 'detail:animal', label: 'Un animal précis' },
    { value: 'detail:lot', label: 'Un lot avicole précis' },
  ];
}

function detailsFor(mode, animaux, lots) {
  const animals = arr(animaux).filter(isAvailableAnimal);
  const activeLots = arr(lots).filter(isActiveLot);
  if (mode === 'detail:sick_animal') return animals.filter(isSickAnimal).map((a) => ({ value: `animal:${a.id}`, label: `${labelOf(a)} · ${a.id}` }));
  if (mode === 'detail:sick_lot') return activeLots.filter(isSickLot).map((l) => ({ value: `lot_malade:${l.id}`, label: `${labelOf(l)} · ${lotSickCount(l) || 1}/${lotTotalCount(l) || '?'} malades` }));
  if (mode === 'detail:animal') return animals.map((a) => ({ value: `animal:${a.id}`, label: `${labelOf(a)} · ${a.id}` }));
  if (mode === 'detail:lot') return activeLots.map((l) => ({ value: `lot:${l.id}`, label: `${labelOf(l)} · ${lotTotalCount(l) || '?'} sujets` }));
  return [];
}

function resolveTarget(mode, detail, type, animaux, lots) {
  const animals = arr(animaux).filter(isAvailableAnimal);
  const activeLots = arr(lots).filter(isActiveLot);
  const sickAnimals = animals.filter(isSickAnimal);
  const sickLots = activeLots.filter(isSickLot);
  const raw = String(mode?.startsWith('detail:') ? detail : mode || '').trim();
  const snapshot = now();
  if (raw === 'scope:cheptel') return { module_lie: 'animaux', related_id: 'ALL_ANIMAUX', target_scope: 'cheptel', target_ids: animals.map((a) => a.id), target_count: animals.length, total_count: animals.length, target_summary: `${animals.length} animaux`, target_snapshot_date: snapshot };
  if (raw === 'scope:animaux_malades') return { module_lie: 'animaux', related_id: 'ANIMAUX_MALADES', target_scope: 'animaux_malades', target_ids: sickAnimals.map((a) => a.id), target_count: sickAnimals.length, total_count: animals.length, target_summary: `${sickAnimals.length} animaux malades`, target_snapshot_date: snapshot };
  if (raw === 'scope:avicole_all') return { module_lie: 'avicole', related_id: 'ALL_AVICOLE_LOTS', target_scope: 'avicole_all', target_ids: activeLots.map((l) => l.id), target_count: activeLots.reduce((s, l) => s + (lotTotalCount(l) || 0), 0), total_count: activeLots.reduce((s, l) => s + (lotTotalCount(l) || 0), 0), target_summary: `${activeLots.length} lots avicoles`, target_snapshot_date: snapshot };
  if (raw === 'scope:avicole_malade') return { module_lie: 'avicole', related_id: 'AVICOLE_MALADES', target_scope: 'avicole_malade', target_ids: sickLots.map((l) => l.id), target_count: sickLots.reduce((s, l) => s + (lotSickCount(l) || 1), 0), total_count: sickLots.reduce((s, l) => s + (lotTotalCount(l) || 0), 0), target_summary: `${sickLots.reduce((s, l) => s + (lotSickCount(l) || 1), 0)} volailles malades`, target_snapshot_date: snapshot };
  if (raw.startsWith('animal:')) {
    const id = raw.replace('animal:', '');
    const animal = animals.find((a) => String(a.id) === id) || {};
    return { module_lie: 'animaux', related_id: id, target_scope: isSickAnimal(animal) ? 'animal_malade' : 'animal', target_ids: [id], target_count: 1, total_count: 1, target_summary: `${labelOf(animal)} · ${id}`, target_snapshot_date: snapshot };
  }
  if (raw.startsWith('lot_malade:') || raw.startsWith('lot:')) {
    const id = raw.replace('lot_malade:', '').replace('lot:', '');
    const lot = activeLots.find((l) => String(l.id) === id) || {};
    const curative = familyOf(type) === 'curatif';
    const sick = lotSickCount(lot);
    const total = lotTotalCount(lot);
    return { module_lie: 'avicole', related_id: id, target_scope: curative ? 'lot_avicole_malade' : 'lot_avicole', target_ids: [id], target_count: curative ? (sick || 1) : total, total_count: total, target_summary: curative ? `${sick || 1} malades sur ${total || '?'} · ${labelOf(lot)}` : `${labelOf(lot)} · ${total || '?'} sujets`, target_snapshot_date: snapshot };
  }
  return { module_lie: '', related_id: '', target_scope: 'manuel', target_ids: [], target_count: 0, total_count: 0, target_summary: '—', target_snapshot_date: snapshot };
}

function Mini({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[100px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

async function markDone(v, props) {
  try {
    await props.onUpdate?.(v.id, { statut: 'fait', effectuee: v.effectuee || today(), closed_at: now() });
    if (toNumber(v.cout) > 0) {
      await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'sortie', libelle: `Soin ${v.nom || v.id}`, montant: toNumber(v.cout), date: today(), categorie: 'Sante', module_lie: 'sante', related_id: v.id, statut: 'paye', source_module: 'sante', source_record_id: v.id });
      await props.onRefreshFinances?.();
    }
    toast.success('Intervention validée');
  } catch (error) {
    toast.error(error.message || 'Validation impossible');
  }
}

function HealthBridge(props) {
  const rows = arr(props.rows);
  const healthStocks = arr(props.stocks).filter(isHealthStock);
  const alerts = rows.filter((v) => late(v) || dueSoon(v)).slice(0, 6);
  const rupture = healthStocks.filter((s) => toNumber(s.quantite) <= toNumber(s.seuil)).length;
  const costs = rows.reduce((sum, v) => sum + toNumber(v.cout), 0);
  const sickAnimals = arr(props.animaux).filter(isSickAnimal).length;
  const sickLots = arr(props.lots).filter(isSickLot).length;
  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Santé & Biosécurité</p><h3 className="font-black text-[#2f2415]">Pilotage sanitaire</h3></div><div className="grid grid-cols-3 lg:grid-cols-5 gap-2 text-sm"><Mini icon={Syringe} label="À suivre" value={alerts.length} /><Mini icon={Package} label="Stock santé" value={healthStocks.length} /><Mini icon={AlertTriangle} label="Ruptures" value={rupture} /><Mini icon={HeartPulse} label="Malades" value={sickAnimals} /><Mini icon={ShieldCheck} label="Lots risque" value={sickLots} /></div></div>{alerts.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{alerts.map((v) => <div key={v.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{v.nom || v.id}</p><p className="text-xs text-[#8a7456] mt-1">{v.prevue || '—'} · {fmtCurrency(v.cout)}</p><button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => markDone(v, props)}><CheckCircle2 size={14} className="inline" /> Valider fait</button></div>)}</div> : null}<p className="text-xs text-[#8a7456]">Coût santé total renseigné: {fmtCurrency(costs)}</p></div>;
}

function InterventionPanel(props) {
  const tachesCrud = useCrudModule('taches');
  const alertesCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const docsCrud = useCrudModule('documents');
  const stockCrud = useCrudModule('stock');
  const vetsCrud = useCrudModule('veterinaires');
  const [form, setForm] = useState({ type_intervention: 'preventif', target_mode: 'scope:cheptel', target_detail: '', date: today(), statut: 'a_faire', vet_mode: '' });
  const [newVet, setNewVet] = useState({ nom: '', tel: '', specialite: '' });
  const animals = arr(props.animaux);
  const lots = arr(props.lots);
  const vets = arr(props.vets?.length ? props.vets : vetsCrud.rows);
  const stocks = arr(props.stocks?.length ? props.stocks : stockCrud.rows);
  const modes = useMemo(() => modesFor(form.type_intervention, animals, lots), [form.type_intervention, animals, lots]);
  const detailOptions = useMemo(() => detailsFor(form.target_mode, animals, lots), [form.target_mode, animals, lots]);
  const target = useMemo(() => resolveTarget(form.target_mode, form.target_detail || detailOptions[0]?.value, form.type_intervention, animals, lots), [form.target_mode, form.target_detail, form.type_intervention, animals, lots, detailOptions]);
  const healthStocks = stocks.filter(familyOf(form.type_intervention) === 'biosecurite' ? isDisinfectantStock : isHealthStock);
  const update = (key, value) => setForm((prev) => {
    const next = { ...prev, [key]: value };
    if (key === 'type_intervention') { next.target_mode = modesFor(value, animals, lots)[0]?.value || ''; next.target_detail = ''; }
    if (key === 'target_mode') next.target_detail = '';
    return next;
  });

  const ensureVet = async () => {
    if (form.vet_mode !== '__new__') {
      const vet = vets.find((v) => String(v.id) === String(form.vet_mode));
      return { vet_id: vet?.id || '', vet_name: vet?.nom || '' };
    }
    if (!newVet.nom) return { vet_id: '', vet_name: '' };
    const vet = { id: makeId('VET'), nom: newVet.nom, tel: newVet.tel || '', specialite: newVet.specialite || 'Vétérinaire', source: 'manuel' };
    await (props.onCreateVet || vetsCrud.create)?.(vet);
    await Promise.allSettled([props.onRefreshVets?.(), vetsCrud.refresh?.()]);
    return { vet_id: vet.id, vet_name: vet.nom };
  };

  const decrementStock = async () => {
    if (!form.stock_id || !toNumber(form.quantite_utilisee)) return;
    const stock = stocks.find((s) => String(s.id) === String(form.stock_id));
    if (!stock) return;
    const nextQty = Math.max(0, toNumber(stock.quantite) - toNumber(form.quantite_utilisee));
    await (props.onUpdateStock || stockCrud.update)?.(stock.id, { quantite: nextQty, last_movement_type: 'sortie', last_movement_label: familyOf(form.type_intervention) === 'biosecurite' ? 'biosécurité' : 'santé', last_movement_qty: toNumber(form.quantite_utilisee), last_movement_at: now() });
    if (nextQty <= toNumber(stock.seuil)) await alertesCrud.create?.({ id: makeId('ALT'), title: `Stock santé critique: ${stock.produit}`, message: `${stock.produit} sous le seuil`, module_source: 'stock', entity_type: 'stock', entity_id: stock.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Réapprovisionnement' });
  };

  const submit = async () => {
    if (!form.nom) return toast.error('Produit ou soin obligatoire');
    if (form.target_mode?.startsWith('detail:') && !form.target_detail && detailOptions.length) return toast.error('Choisis la cible précise');
    try {
      const id = makeId('SAN');
      const label = labelType(form.type_intervention);
      const vet = await ensureVet();
      await props.onCreate?.({ id, nom: form.nom || label, type_intervention: form.type_intervention, nature_intervention: familyOf(form.type_intervention), animal: target.target_summary, module_lie: target.module_lie, related_id: target.related_id, target_scope: target.target_scope, target_ids: target.target_ids, target_count: target.target_count, total_count: target.total_count, target_summary: target.target_summary, target_snapshot_date: target.target_snapshot_date, prevue: form.date || today(), effectuee: form.statut === 'fait' ? (form.date || today()) : '', statut: form.statut || 'a_faire', vet: vet.vet_name, veterinaire_id: vet.vet_id, medicament: form.nom || '', quantite_utilisee: toNumber(form.quantite_utilisee), stock_id: form.stock_id || '', cout: toNumber(form.cout), prochaine_action: form.prochaine_action || '', notes: form.notes || '', preuve_url: form.preuve_url || '', biosafety_required: ['curatif', 'urgence', 'biosecurite'].includes(form.type_intervention), source_module: 'sante_biosecurite' });
      await decrementStock();
      if (toNumber(form.cout) > 0) await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'sortie', libelle: `${label} - ${target.target_summary}`, montant: toNumber(form.cout), date: form.date || today(), categorie: familyOf(form.type_intervention) === 'biosecurite' ? 'Biosecurite' : 'Sante', module_lie: 'sante', related_id: id, statut: 'paye', source_module: 'sante', source_record_id: id });
      if (form.prochaine_action) await tachesCrud.create?.({ id: makeId('TSK'), title: `Suivi ${label}`, module_lie: 'sante', related_id: id, due_date: form.prochaine_action, priority: familyOf(form.type_intervention) === 'curatif' ? 'haute' : 'moyenne', status: 'a_faire', checklist: 'Contrôle; Résultat; Clôture', source_module: 'sante' });
      await eventsCrud.create?.({ id: makeId('EVT'), event_type: familyOf(form.type_intervention) === 'biosecurite' ? 'biosécurité' : 'intervention_sanitaire', module_source: 'sante', entity_type: target.module_lie, entity_id: target.related_id, title: label, description: target.target_summary, event_date: form.date || today(), severity: familyOf(form.type_intervention) === 'curatif' ? 'warning' : 'info', related_id: id, saisies_evitees: 5 });
      if (form.preuve_url) await docsCrud.create?.({ id: makeId('DOC'), title: `Preuve ${label}`, document_category: familyOf(form.type_intervention) === 'biosecurite' ? 'sanitaire' : 'ordonnance', module_source: 'sante', entity_type: 'sante', entity_id: id, file_url: form.preuve_url, related_id: id });
      if (['curatif', 'urgence', 'biosecurite'].includes(form.type_intervention)) {
        const preview = prepareBiosecurityWorkflow({ id, trigger: form.type_intervention, title: `${label} - ${target.target_summary}`, message: form.notes || target.target_summary, module_source: 'sante', entity_type: target.module_lie, entity_id: target.related_id, risk_level: form.type_intervention === 'urgence' ? 'critique' : 'warning', protocol: form.type_intervention === 'biosecurite' ? 'Nettoyage, désinfection, contrôle accès' : 'Isoler si nécessaire, traiter, surveiller', next_control_date: form.prochaine_action || form.date || today(), document_url: form.preuve_url }, { tasks: tachesCrud.rows, alerts: alertesCrud.rows, events: eventsCrud.rows, documents: docsCrud.rows });
        await commitBiosecurityWorkflow(preview, { onCreateAlert: alertesCrud.create, onCreateTask: tachesCrud.create, onCreateDocument: docsCrud.create, onCreateBusinessEvent: eventsCrud.create });
      }
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.(), stockCrud.refresh?.(), tachesCrud.refresh?.(), alertesCrud.refresh?.(), eventsCrud.refresh?.(), docsCrud.refresh?.()]);
      toast.success('Intervention enregistrée');
      setForm({ type_intervention: 'preventif', target_mode: 'scope:cheptel', target_detail: '', date: today(), statut: 'a_faire', vet_mode: '' });
      setNewVet({ nom: '', tel: '', specialite: '' });
    } catch (error) {
      toast.error(error.message || 'Intervention impossible');
    }
  };

  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Santé & Biosécurité</p><h3 className="font-black text-[#2f2415]">Nouvelle intervention</h3></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Select label="Type" value={form.type_intervention} onChange={(v) => update('type_intervention', v)} options={interventionTypes} /><Select label="Périmètre" value={form.target_mode || modes[0]?.value || ''} onChange={(v) => update('target_mode', v)} options={modes} />{form.target_mode?.startsWith('detail:') ? <Select label="Cible précise" value={form.target_detail || detailOptions[0]?.value || ''} onChange={(v) => update('target_detail', v)} options={detailOptions} /> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]"><b>{target.target_count || 0}</b> / {target.total_count || 0}<br />{target.target_summary}</div>}<Input label="Vaccin / soin / produit" value={form.nom || ''} onChange={(v) => update('nom', v)} /><Select label="Stock utilisé" value={form.stock_id || ''} onChange={(v) => update('stock_id', v)} options={[{ value: '', label: 'Aucun' }, ...healthStocks.map((s) => ({ value: s.id, label: `${s.produit} · ${fmtNumber(s.quantite)} ${s.unite || ''}` }))]} /><Input label="Quantité utilisée" type="number" value={form.quantite_utilisee || ''} onChange={(v) => update('quantite_utilisee', v)} /><Input label="Coût" type="number" value={form.cout || ''} onChange={(v) => update('cout', v)} /><Input label="Date" type="date" value={form.date || today()} onChange={(v) => update('date', v)} /><Input label="Prochain suivi" type="date" value={form.prochaine_action || ''} onChange={(v) => update('prochaine_action', v)} /><Select label="Vétérinaire" value={form.vet_mode || ''} onChange={(v) => update('vet_mode', v)} options={[{ value: '', label: 'Non renseigné' }, ...vets.map((v) => ({ value: v.id, label: v.nom || v.id })), { value: '__new__', label: '+ Nouveau véto' }]} />{form.vet_mode === '__new__' ? <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-3 rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Input label="Nom véto" value={newVet.nom} onChange={(v) => setNewVet((p) => ({ ...p, nom: v }))} /><Input label="Téléphone" value={newVet.tel} onChange={(v) => setNewVet((p) => ({ ...p, tel: v }))} /><Input label="Spécialité" value={newVet.specialite} onChange={(v) => setNewVet((p) => ({ ...p, specialite: v }))} /></div> : null}<Input label="Notes" value={form.notes || ''} onChange={(v) => update('notes', v)} className="md:col-span-2" /><Input label="Preuve / ordonnance URL" value={form.preuve_url || ''} onChange={(v) => update('preuve_url', v)} /></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><b>Cible :</b> {target.target_summary} · {target.module_lie || '—'} · {target.related_id || '—'}</div><div className="flex justify-end"><Btn icon={ShieldCheck} onClick={submit}>Valider</Btn></div></div>;
}

function Select({ label, value, onChange, options = [] }) {
  return <label className="space-y-1"><span className="text-xs text-[#8a7456]">{label}</span><select className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function Input({ label, value, onChange, type = 'text', className = '' }) {
  return <label className={`space-y-1 ${className}`}><span className="text-xs text-[#8a7456]">{label}</span><input type={type} className="w-full bg-[#fffdf8] border border-[#d6c3a0] rounded-lg px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

export default function SanteV6(props) {
  return <div className="space-y-6"><HealthBridge {...props} /><InterventionPanel {...props} /><SanteV4 {...props} /></div>;
}
