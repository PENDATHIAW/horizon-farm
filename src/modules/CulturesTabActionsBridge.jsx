import { AlertTriangle, Edit, Leaf, Plus, Sprout, Trash2, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildCultureInputUsageWorkflow, buildCultureLossWorkflow } from '../utils/cultureWorkflows.js';
import { runCultureInputSideEffects } from '../utils/cultureSideEffects.js';
import { fmtNumber, toNumber } from '../utils/format';
import { generateSequentialId, makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value) => String(value || '').trim();
const cultureName = (row = {}) => row.nom || row.culture || row.type || row.id || 'Culture';
const parcelName = (row = {}) => row.parcelle_code || row.parcelle_nom || row.parcelle || row.nom || 'Parcelle';
const campaignName = (row = {}) => row.campagne || row.saison || row.nom || 'Campagne';
const recordType = (row = {}) => clean(row.record_type || row.type_fiche || 'culture').toLowerCase();
const isSupportRecord = (row = {}) => ['parcelle', 'campagne', 'performance'].includes(recordType(row));
const stockName = (row = {}) => row.produit || row.name || row.nom || row.id || 'Stock';
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity);
const isCultureInputStock = (row = {}) => {
  const text = clean(`${row.produit || ''} ${row.name || ''} ${row.nom || ''} ${row.categorie || ''} ${row.category || ''} ${row.type || ''}`).toLowerCase();
  return ['semence', 'engrais', 'intrant', 'irrigation', 'traitement', 'phyto', 'eau', 'substrat'].some((word) => text.includes(word));
};
function Modal({ title, values, setValues, fields, onClose, onSubmit, saving }) {
  const set = (key, value) => setValues((prev) => ({ ...prev, [key]: value }));
  return <div className="fixed inset-0 z-[80] bg-black/40 p-4 flex items-center justify-center"><div className="w-full max-w-xl rounded-2xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden"><div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Fiche cultures</p><h3 className="text-xl font-black text-[#2f2415]">{title}</h3></div><button type="button" onClick={onClose} className="text-[#8a7456] font-bold">×</button></div><div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">{fields.map((field) => <label key={field.key} className={`space-y-1 ${field.full ? 'md:col-span-2' : ''}`}><span className="text-xs text-[#8a7456]">{field.label}</span>{field.type === 'select' ? <select className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)}><option value="">Choisir</option>{(field.options || []).map((item) => <option key={item.value || item} value={item.value || item}>{item.label || item}</option>)}</select> : field.type === 'textarea' ? <textarea rows={3} className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} /> : <input type={field.type || 'text'} className="w-full rounded-lg border border-[#d6c3a0] bg-white px-3 py-2 text-sm" value={values[field.key] || ''} onChange={(e) => set(field.key, e.target.value)} />}</label>)}</div><div className="p-4 border-t border-[#eadcc2] flex justify-end gap-2"><button type="button" className="px-4 py-2 rounded-xl border border-[#d6c3a0]" onClick={onClose}>Annuler</button><button type="button" disabled={saving} className="px-4 py-2 rounded-xl bg-[#c9a96a] text-white font-bold disabled:opacity-60" onClick={onSubmit}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button></div></div></div>;
}
function ActionCard({ icon: Icon, title, desc, onClick }) { return <button type="button" onClick={onClick} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left hover:border-[#c9a96a]"><Icon size={16} className="text-[#9a6b12]" /><p className="font-bold text-[#2f2415] mt-2">{title}</p><p className="text-xs text-[#8a7456] mt-1">{desc}</p></button>; }
export function getRealCultureRows(rows = []) { return arr(rows).filter((row) => !isSupportRecord(row)); }

export default function CulturesTabActionsBridge({
  tab,
  rows = [],
  stocks = [],
  stockMovements = [],
  onCreate,
  onUpdate,
  onDelete,
  onRefresh,
  onUpdateStock,
  onRefreshStock,
  onCreateStockMovement,
  onRefreshStockMovements,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
  actionsMode = 'all',
}) {
  const [modal, setModal] = useState('');
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const realCultures = useMemo(() => getRealCultureRows(rows), [rows]);
  const supportRows = useMemo(() => arr(rows).filter(isSupportRecord), [rows]);
  const parcelles = useMemo(() => supportRows.filter((row) => recordType(row) === 'parcelle'), [supportRows]);
  const campagnes = useMemo(() => supportRows.filter((row) => recordType(row) === 'campagne'), [supportRows]);
  const performances = useMemo(() => supportRows.filter((row) => recordType(row) === 'performance'), [supportRows]);
  const inputStocks = useMemo(() => arr(stocks).filter((row) => stockQty(row) > 0 && isCultureInputStock(row)), [stocks]);
  const openModal = (kind, initial = {}) => { setValues(initial); setModal(kind); };

  const createCulture = async () => {
    if (!values.nom) return toast.error('Nom culture obligatoire');
    try { setSaving(true); const id = values.id || generateSequentialId('cultures', rows); const payload = { ...values, id, record_type: 'culture', type_fiche: 'culture', statut: values.statut || 'planifiee', created_at: values.created_at || now(), updated_at: now() }; await onCreate?.(payload); await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'culture_creee', module_source: 'cultures', entity_type: 'culture', entity_id: id, title: `Culture créée: ${payload.nom}`, description: `${payload.parcelle || ''} ${payload.campagne || ''}`.trim(), event_date: today(), severity: 'info', saisies_evitees: 1 }); await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]); toast.success('Culture créée'); setModal(''); } catch (error) { toast.error(error.message || 'Création impossible'); } finally { setSaving(false); }
  };
  const createSupport = async (kind) => {
    try { setSaving(true); const id = values.id || generateSequentialId('cultures', rows); const payload = { ...values, id, record_type: kind, type_fiche: kind, statut: values.statut || 'actif', created_at: values.created_at || now(), updated_at: now() }; if (kind === 'parcelle') payload.nom = values.nom || values.parcelle || values.parcelle_nom || id; if (kind === 'campagne') payload.nom = values.nom || values.campagne || values.saison || id; if (kind === 'performance') payload.nom = values.nom || `Performance ${values.campagne || today()}`; await onCreate?.(payload); await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: `${kind}_culture_cree`, module_source: 'cultures', entity_type: kind, entity_id: id, title: `Fiche ${kind} créée`, description: payload.nom, event_date: today(), severity: 'info' }); await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]); toast.success(`Fiche ${kind} créée`); setModal(''); } catch (error) { toast.error(error.message || 'Création impossible'); } finally { setSaving(false); }
  };
  const updateSupport = async () => { if (!values.id) return toast.error('Fiche invalide'); try { setSaving(true); await onUpdate?.(values.id, { ...values, updated_at: now() }); await onRefresh?.(); toast.success('Fiche mise à jour'); setModal(''); } catch (error) { toast.error(error.message || 'Modification impossible'); } finally { setSaving(false); } };
  const deleteSupport = async (row) => { if (!row?.id) return; try { await onDelete?.(row.id); await onRefresh?.(); toast.success('Fiche supprimée'); } catch (error) { toast.error(error.message || 'Suppression impossible'); } };
  const saveInputUsage = async () => {
    const culture = realCultures.find((row) => row.id === values.culture_id);
    const stock = inputStocks.find((row) => row.id === values.stock_id);
    const workflow = buildCultureInputUsageWorkflow({ culture, stock, qty: values.quantite, motif: values.motif || 'Intrant culture', date: values.date || today() });
    if (!workflow) return toast.error('Choisis une culture, un intrant et une quantité');
    if (toNumber(values.quantite) > stockQty(stock)) return toast.error(`Stock insuffisant : ${fmtNumber(stockQty(stock))} ${stock.unite || ''} disponible(s)`);
    try {
      setSaving(true);
      await runCultureInputSideEffects({
        culture,
        stock,
        qty: values.quantite,
        motif: values.motif || 'Intrant culture',
        date: values.date || today(),
        handlers: {
          onUpdateStock,
          onUpdateCulture: onUpdate,
          onCreateBusinessEvent,
          onCreateStockMovement,
          onRefreshStockMovements,
          existingStockMovements: stockMovements,
        },
      });
      await Promise.allSettled([onRefresh?.(), onRefreshStock?.(), onRefreshStockMovements?.(), onRefreshBusinessEvents?.()]);
      toast.success('Intrant utilisé et stock mis à jour');
      setModal('');
    } catch (error) {
      toast.error(error.message || 'Utilisation intrant impossible');
    } finally {
      setSaving(false);
    }
  };
  const saveLoss = async () => {
    const culture = realCultures.find((row) => row.id === values.culture_id);
    const workflow = buildCultureLossWorkflow({ culture, qty: values.quantite_perdue, unitPrice: values.prix_unitaire, reason: values.raison || 'Perte déclarée', date: values.date || today() });
    if (!workflow) return toast.error('Choisis une culture et une quantité perdue');
    try {
      setSaving(true);
      await onUpdate?.(culture.id, workflow.culturePatch);
      await onCreateBusinessEvent?.(workflow.event);
      await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
      toast.success('Perte enregistrée et tracée');
      setModal('');
    } catch (error) {
      toast.error(error.message || 'Déclaration perte impossible');
    } finally {
      setSaving(false);
    }
  };
  const cultureOptions = realCultures.map((row) => ({ value: row.id, label: `${cultureName(row)} · ${parcelName(row)}` }));
  const stockOptions = inputStocks.map((row) => ({ value: row.id, label: `${stockName(row)} · ${fmtNumber(stockQty(row))} ${row.unite || ''}` }));
  const cultureFields = [{ key: 'nom', label: 'Nom culture' }, { key: 'type', label: 'Type culture', type: 'select', options: ['Poivrons', 'Tomates', 'Oignons', 'Piments', 'Aubergines', 'Maraîchage', 'Céréales', 'Autre'] }, { key: 'parcelle', label: 'Parcelle' }, { key: 'campagne', label: 'Campagne' }, { key: 'surface', label: 'Surface', type: 'number' }, { key: 'unite_surface', label: 'Unité surface', type: 'select', options: ['m²', 'ha'] }, { key: 'date_debut_campagne', label: 'Début campagne', type: 'date' }, { key: 'date_recolte_prevue', label: 'Récolte prévue', type: 'date' }, { key: 'budget_prevu', label: 'Budget prévu', type: 'number' }, { key: 'notes', label: 'Notes', type: 'textarea', full: true }];
  const parcelleFields = [{ key: 'nom', label: 'Nom parcelle' }, { key: 'parcelle', label: 'Code / nom parcelle' }, { key: 'surface', label: 'Surface', type: 'number' }, { key: 'unite_surface', label: 'Unité', type: 'select', options: ['m²', 'ha'] }, { key: 'statut', label: 'Statut', type: 'select', options: ['actif', 'repos', 'occupe', 'a_preparer'] }, { key: 'notes', label: 'Notes', type: 'textarea', full: true }];
  const campagneFields = [{ key: 'nom', label: 'Nom campagne' }, { key: 'campagne', label: 'Campagne / saison' }, { key: 'date_debut_campagne', label: 'Début', type: 'date' }, { key: 'date_recolte_prevue', label: 'Récolte prévue', type: 'date' }, { key: 'budget_prevu', label: 'Budget prévu', type: 'number' }, { key: 'objectif_revenu', label: 'Objectif revenu', type: 'number' }, { key: 'statut', label: 'Statut', type: 'select', options: ['planifiee', 'en_cours', 'recolte', 'termine'] }, { key: 'notes', label: 'Notes', type: 'textarea', full: true }];
  const performanceFields = [{ key: 'nom', label: 'Titre performance' }, { key: 'campagne', label: 'Campagne' }, { key: 'revenu_reel', label: 'Revenu', type: 'number' }, { key: 'cout_total_reel', label: 'Coût', type: 'number' }, { key: 'marge_reelle', label: 'Marge', type: 'number' }, { key: 'score_sante', label: 'Score santé (%)', type: 'number' }, { key: 'notes', label: 'Analyse', type: 'textarea', full: true }];
  const inputFields = [{ key: 'culture_id', label: 'Culture', type: 'select', options: cultureOptions }, { key: 'stock_id', label: 'Intrant stock', type: 'select', options: stockOptions }, { key: 'quantite', label: 'Quantité utilisée', type: 'number' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'motif', label: 'Motif', type: 'textarea', full: true }];
  const lossFields = [{ key: 'culture_id', label: 'Culture', type: 'select', options: cultureOptions }, { key: 'quantite_perdue', label: 'Quantité perdue', type: 'number' }, { key: 'prix_unitaire', label: 'Valeur unitaire estimée', type: 'number' }, { key: 'date', label: 'Date', type: 'date' }, { key: 'raison', label: 'Cause / observation terrain', type: 'textarea', full: true }];
  const showMain = actionsMode === 'all' && ['Vue d’ensemble', 'Cultures'].includes(tab);
  const showParcelles = actionsMode === 'all' && tab === 'Parcelles';
  const showCampagnes = actionsMode === 'all' && tab === 'Campagnes';
  const showPerformance = actionsMode === 'all' && tab === 'Performance';
  const showInputOnly = actionsMode === 'input';
  const showLossOnly = actionsMode === 'loss';

  return <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Actions {tab}</p><h3 className="font-black text-[#2f2415]">Fiches et actions liées à l’onglet</h3></div><div className="text-xs text-[#8a7456]">{realCultures.length} cultures · {parcelles.length} parcelles · {campagnes.length} campagnes · {performances.length} performances</div></div>{showMain ? <div className="grid grid-cols-1 md:grid-cols-3 gap-2"><ActionCard icon={Plus} title="Nouvelle culture" desc="Créer une culture liée à une parcelle et une campagne. Récolte, intrants et pertes : onglets dédiés." onClick={() => openModal('culture', { unite_surface: 'm²', statut: 'planifiee', date_debut_campagne: today() })} /></div> : null}{showInputOnly ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2"><ActionCard icon={Leaf} title="Utiliser intrant" desc="Semences, engrais, phyto ou irrigation — stock décrémenté, coût culture mis à jour." onClick={() => openModal('input', { date: today(), motif: 'Application intrant culture' })} /></div> : null}{showLossOnly ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2"><ActionCard icon={AlertTriangle} title="Déclarer perte / sinistre" desc="Maladie, ravageur ou stress — traçabilité et valeur perdue." onClick={() => openModal('loss', { date: today() })} /></div> : null}{showParcelles ? <div className="grid grid-cols-1 md:grid-cols-3 gap-2"><ActionCard icon={Leaf} title="Nouvelle parcelle" desc="Créer une fiche parcelle sans devoir créer une culture complète." onClick={() => openModal('parcelle', { unite_surface: 'm²', statut: 'actif' })} /></div> : null}{showCampagnes ? <div className="grid grid-cols-1 md:grid-cols-3 gap-2"><ActionCard icon={Sprout} title="Nouvelle campagne" desc="Créer une fiche campagne avec budget et dates." onClick={() => openModal('campagne', { date_debut_campagne: today(), statut: 'planifiee' })} /></div> : null}{showPerformance ? <div className="grid grid-cols-1 md:grid-cols-3 gap-2"><ActionCard icon={TrendingUp} title="Nouvelle performance" desc="Ajouter une analyse performance manuelle ou corrective." onClick={() => openModal('performance')} /></div> : null}{showParcelles && parcelles.length ? <SupportList rows={parcelles} onEdit={(row) => openModal('edit', row)} onDelete={deleteSupport} /> : null}{showCampagnes && campagnes.length ? <SupportList rows={campagnes} onEdit={(row) => openModal('edit', row)} onDelete={deleteSupport} /> : null}{showPerformance && performances.length ? <SupportList rows={performances} onEdit={(row) => openModal('edit', row)} onDelete={deleteSupport} /> : null}{modal === 'culture' ? <Modal title="Nouvelle culture" values={values} setValues={setValues} fields={cultureFields} onClose={() => setModal('')} onSubmit={createCulture} saving={saving} /> : null}{modal === 'parcelle' ? <Modal title="Nouvelle parcelle" values={values} setValues={setValues} fields={parcelleFields} onClose={() => setModal('')} onSubmit={() => createSupport('parcelle')} saving={saving} /> : null}{modal === 'campagne' ? <Modal title="Nouvelle campagne" values={values} setValues={setValues} fields={campagneFields} onClose={() => setModal('')} onSubmit={() => createSupport('campagne')} saving={saving} /> : null}{modal === 'performance' ? <Modal title="Nouvelle performance" values={values} setValues={setValues} fields={performanceFields} onClose={() => setModal('')} onSubmit={() => createSupport('performance')} saving={saving} /> : null}{modal === 'input' ? <Modal title="Utiliser intrant" values={values} setValues={setValues} fields={inputFields} onClose={() => setModal('')} onSubmit={saveInputUsage} saving={saving} /> : null}{modal === 'loss' ? <Modal title="Déclarer perte culture" values={values} setValues={setValues} fields={lossFields} onClose={() => setModal('')} onSubmit={saveLoss} saving={saving} /> : null}{modal === 'edit' ? <Modal title="Modifier fiche" values={values} setValues={setValues} fields={recordType(values) === 'performance' ? performanceFields : recordType(values) === 'campagne' ? campagneFields : parcelleFields} onClose={() => setModal('')} onSubmit={updateSupport} saving={saving} /> : null}</div>;
}
function SupportList({ rows, onEdit, onDelete }) { return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{rows.map((row) => <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{row.nom || row.id}</p><p className="text-xs text-[#8a7456] mt-1">{row.parcelle || row.campagne || row.statut || recordType(row)}</p><div className="flex gap-3 mt-3"><button type="button" className="text-xs font-bold text-amber-700" onClick={() => onEdit(row)}><Edit size={13} className="inline" /> Modifier</button><button type="button" className="text-xs font-bold text-red-600" onClick={() => onDelete(row)}><Trash2 size={13} className="inline" /> Supprimer</button></div></div>)}</div>; }
