import { useMemo, useState } from 'react';
import { Beef, Edit, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { calculateUnifiedAnimalCost } from '../services/unifiedCostService.js';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const KEY = 'horizon_farm_animal_slaughter_journal';
const lower = (value) => String(value || '').toLowerCase();
const animalId = (row = {}) => row.animal_id || row.related_id || row.source_record_id || row.entity_id;
const isSlaughter = (row = {}) => lower(`${row.type_evenement || row.event_type || row.type || ''}`).includes('abattage') || lower(row.source_module) === 'animaux_abattage';
const slaughterWeight = (row = {}) => toNumber(row.poids_carcasse ?? row.poids_viande ?? row.poids_total_abattage ?? row.total_weight ?? row.poids_total);
const slaughterFees = (row = {}) => toNumber(row.frais_abattage) + toNumber(row.frais_decoupe) + toNumber(row.frais_emballage) + toNumber(row.frais_transport) + toNumber(row.autres_frais);

function readLocal() { if (typeof window === 'undefined') return []; try { const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
function writeLocal(rows) { if (typeof window === 'undefined') return; window.localStorage.setItem(KEY, JSON.stringify(arr(rows).slice(0, 300))); }
function Field({ label, children }) { return <label className="text-xs font-bold text-[#8a7456] space-y-1"><span>{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function Select(props) { return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function ActionButton({ children, onClick, icon: Icon, danger = false, type = 'button' }) { return <button type={type} onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${danger ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-[#fffdf8] text-[#2f2415] border border-[#d6c3a0]'}`}><Icon size={14} />{children}</button>; }

function meatProductForAnimal(animal = {}, ageClass = '') {
  const type = lower(animal.type); const sexe = lower(animal.sexe); const name = lower(`${animal.name || ''} ${animal.race || ''} ${animal.categorie || ''}`); const age = lower(ageClass || animal.age_class || animal.classe_age || '');
  if (type.includes('caprin') || name.includes('chèvre') || name.includes('chevre') || name.includes('bouc')) return { produit: 'Viande de chèvre', categorie: 'produit_fini_viande_caprine' };
  if (type.includes('ovin') || name.includes('mouton') || name.includes('agneau') || name.includes('brebis')) { if (age.includes('jeune') || age.includes('agneau') || name.includes('agneau')) return { produit: 'Viande d’agneau', categorie: 'produit_fini_viande_ovine_agneau' }; return { produit: 'Viande de mouton', categorie: 'produit_fini_viande_ovine' }; }
  if (type.includes('bovin') || name.includes('boeuf') || name.includes('bœuf') || name.includes('vache') || name.includes('veau')) { if (age.includes('veau') || age.includes('jeune') || name.includes('veau')) return { produit: 'Viande de veau', categorie: 'produit_fini_viande_bovine_veau' }; if (sexe === 'f' || sexe.includes('femelle') || name.includes('vache')) return { produit: 'Viande de vache', categorie: 'produit_fini_viande_bovine_vache' }; return { produit: 'Viande de bœuf', categorie: 'produit_fini_viande_bovine_boeuf' }; }
  return { produit: 'Viande animale', categorie: 'produit_fini_viande_animale' };
}

function stockKey({ produit, sourceRecordId }) { return `${lower(produit)}::${sourceRecordId}`; }
async function upsertMeatStock({ stockCrud, produit, categorie, quantityDelta, animal, event, unitCost = 0 }) {
  const delta = toNumber(quantityDelta); if (!delta) return;
  const existing = arr(stockCrud.rows).find((row) => stockKey({ produit: row.produit, sourceRecordId: row.source_record_id || row.origine_id }) === stockKey({ produit, sourceRecordId: animal.id }));
  const costUnit = toNumber(unitCost);
  if (existing) {
    const previousQty = toNumber(existing.quantite);
    const nextQty = Math.max(0, previousQty + delta);
    const previousUnit = toNumber(existing.cout_revient_unitaire ?? existing.prixUnit ?? existing.prixunit ?? existing.prix_unitaire);
    const weightedUnit = delta > 0 && nextQty > 0 ? ((previousQty * previousUnit) + (delta * costUnit)) / nextQty : previousUnit;
    await stockCrud.update?.(existing.id, { quantite: Number(nextQty.toFixed(2)), prixUnit: Number(weightedUnit.toFixed(2)), prixunit: Number(weightedUnit.toFixed(2)), prix_unitaire: Number(weightedUnit.toFixed(2)), cout_revient_unitaire: Number(weightedUnit.toFixed(2)), cout_unitaire_calcule: Number(weightedUnit.toFixed(2)), statut: nextQty <= 0 ? 'epuise' : 'ok', stock_status: nextQty <= 0 ? 'epuise' : 'ok', last_movement_type: delta > 0 ? 'entree_abattage_animal' : 'correction_abattage_animal', last_movement_qty: Number(delta.toFixed(2)), last_movement_at: new Date().toISOString(), linked_event_id: event.id });
    await stockCrud.refresh?.(); return;
  }
  if (delta < 0) return;
  await stockCrud.create?.({ id: makeId('STKVIANDE'), produit, categorie, activite_liee: 'animaux', quantite: Number(delta.toFixed(2)), unite: 'kg', seuil: 0, stock_max: 0, prixUnit: Number(costUnit.toFixed(2)), prixunit: Number(costUnit.toFixed(2)), prix_unitaire: Number(costUnit.toFixed(2)), cout_revient_unitaire: Number(costUnit.toFixed(2)), cout_unitaire_calcule: Number(costUnit.toFixed(2)), statut: event.destination === 'vente_directe' ? 'reserve' : 'ok', stock_status: event.destination === 'vente_directe' ? 'reserve' : 'ok', source_module: 'animaux', source_record_id: animal.id, origine_label: `${animal.type || 'Animal'} ${animal.name || animal.tag || animal.id}`, linked_event_id: event.id, date_derniere_reception: event.date || today(), last_movement_type: 'entree_abattage_animal', last_movement_qty: Number(delta.toFixed(2)), last_movement_at: new Date().toISOString(), notes: `Stock viande issu de l’abattage animal · coût ${Number(costUnit.toFixed(2))}/kg` });
  await stockCrud.refresh?.();
}

export default function AnimalSlaughterStockBridge({ rows = [], alimentationLogs = [], vaccins = [], businessEvents = [], onUpdate, onRefresh, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const stockCrud = useCrudModule('stock');
  const [localEvents, setLocalEvents] = useState(() => readLocal());
  const [editing, setEditing] = useState(null);
  const activeAnimals = useMemo(() => arr(rows).filter((animal) => !['vendu', 'mort', 'vole', 'abattu', 'abattue'].includes(lower(animal.status))), [rows]);
  const events = useMemo(() => { const merged = [...arr(businessEvents).filter(isSlaughter), ...localEvents.filter(isSlaughter)]; return merged.filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).sort((a, b) => String(b.date || b.created_at).localeCompare(String(a.date || a.created_at))); }, [businessEvents, localEvents]);
  const initial = { id: `ABAT-AN-${Date.now()}`, animal_id: activeAnimals[0]?.id || '', date: today(), age_class: '', poids_carcasse: '', destination: 'stock', frais_abattage: 0, frais_decoupe: 0, frais_emballage: 0, frais_transport: 0, autres_frais: 0, responsable: '', notes: '' };
  const [form, setForm] = useState(initial);
  const updateForm = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const saveLocal = (next) => { setLocalEvents(next); writeLocal(next); };

  const submit = async (e) => {
    e.preventDefault();
    const animal = arr(rows).find((item) => item.id === form.animal_id);
    if (!animal) return toast.error('Choisir un animal');
    const weight = slaughterWeight(form);
    if (weight <= 0) return toast.error('Saisir le poids total de viande/carcasse');
    const product = meatProductForAnimal(animal, form.age_class);
    const fees = slaughterFees(form);
    const payload = { ...form, id: form.id || `ABAT-AN-${Date.now()}`, animal_id: animal.id, related_id: animal.id, target_id: animal.id, animal_name: animal.name || animal.tag || animal.id, animal_type: animal.type, produit_stock: product.produit, categorie_stock: product.categorie, poids_carcasse: weight, poids_total_abattage: weight, montant: fees, cout: fees, cout_total: fees, type_evenement: 'abattage_animal charge_directe', event_type: 'abattage_animal', source_module: 'animaux_abattage', module_lie: 'animaux', target_type: 'animaux', title: `Abattage animal: ${animal.name || animal.id}`, message: `${product.produit}: ${weight.toFixed(2)} kg · frais ${fmtCurrency(fees)}`, status: 'genere', date: form.date || today() };
    const totalCost = calculateUnifiedAnimalCost({ animal, alimentationLogs, vaccins, healthEvents: businessEvents, directCharges: [...arr(businessEvents), payload], slaughterEvents: [...arr(businessEvents), payload] }).raw;
    const unitCost = weight > 0 ? totalCost.totalCost / weight : 0;
    if (!editing && onCreateBusinessEvent) await onCreateBusinessEvent(payload);
    const nextLocal = editing ? localEvents.map((item) => item.id === editing.id ? payload : item) : [payload, ...localEvents];
    saveLocal(nextLocal);
    const previousAnimal = editing ? arr(rows).find((item) => item.id === animalId(editing)) || animal : null;
    const previousProduct = previousAnimal ? meatProductForAnimal(previousAnimal, editing.age_class) : null;
    if (editing && previousAnimal && previousProduct) await upsertMeatStock({ stockCrud, produit: previousProduct.produit, categorie: previousProduct.categorie, quantityDelta: -slaughterWeight(editing), animal: previousAnimal, event: editing, unitCost });
    if (payload.destination !== 'perte') await upsertMeatStock({ stockCrud, produit: product.produit, categorie: product.categorie, quantityDelta: weight, animal, event: payload, unitCost });
    if (!editing) await onUpdate?.(animal.id, { status: 'abattu', statut: 'abattu', date_abattage: payload.date, poids_carcasse: weight, produit_stock: product.produit, cout_abattage: fees, cout_revient_viande_kg: Number(unitCost.toFixed(2)) });
    await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]);
    toast.success(editing ? 'Abattage modifié, stock corrigé' : 'Abattage enregistré, stock viande à jour');
    setEditing(null); setForm(initial);
  };

  const startEdit = (event) => { setEditing(event); setForm({ ...event, animal_id: animalId(event), date: event.date || today(), poids_carcasse: slaughterWeight(event), destination: event.destination || 'stock' }); };
  const remove = async (event) => { const animal = arr(rows).find((item) => item.id === animalId(event)); if (animal) { const product = meatProductForAnimal(animal, event.age_class); await upsertMeatStock({ stockCrud, produit: product.produit, categorie: product.categorie, quantityDelta: -slaughterWeight(event), animal, event, unitCost: toNumber(event.cout_revient_viande_kg) }); await onUpdate?.(animal.id, { status: 'actif', statut: 'actif', date_abattage: '', poids_carcasse: 0, produit_stock: '', cout_abattage: 0, cout_revient_viande_kg: 0 }); } saveLocal(localEvents.filter((item) => item.id !== event.id)); await Promise.allSettled([onRefresh?.(), onRefreshBusinessEvents?.()]); toast.success('Abattage supprimé, stock corrigé'); };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Beef size={20} /> Journal d’abattage animaux</p><p className="mt-1 text-sm text-[#8a7456]">Viande produite, frais d’abattage, coût/kg et stock associé.</p></div><ActionButton icon={RefreshCw} onClick={() => { setLocalEvents(readLocal()); stockCrud.refresh?.(); onRefreshBusinessEvents?.(); }}>Actualiser</ActionButton></div>
    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-6 xl:grid-cols-12 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Field label="Animal"><Select value={form.animal_id || ''} onChange={(e) => updateForm('animal_id', e.target.value)}><option value="">Choisir</option>{activeAnimals.map((animal) => <option key={animal.id} value={animal.id}>{animal.type} · {animal.name || animal.tag || animal.id}</option>)}</Select></Field><Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => updateForm('date', e.target.value)} /></Field><Field label="Catégorie viande"><Select value={form.age_class || ''} onChange={(e) => updateForm('age_class', e.target.value)}><option value="">Auto</option><option value="veau">Veau</option><option value="agneau">Agneau</option><option value="adulte">Adulte</option></Select></Field><Field label="Poids viande (kg)"><Input type="number" step="0.01" min="0" value={form.poids_carcasse || ''} onChange={(e) => updateForm('poids_carcasse', e.target.value)} /></Field><Field label="Destination"><Select value={form.destination || 'stock'} onChange={(e) => updateForm('destination', e.target.value)}><option value="stock">Stock viande</option><option value="vente_directe">Vente directe / réservé</option><option value="consommation_interne">Consommation interne</option><option value="perte">Perte / réforme</option></Select></Field><Field label="Frais abattage"><Input type="number" min="0" value={form.frais_abattage || ''} onChange={(e) => updateForm('frais_abattage', e.target.value)} /></Field><Field label="Découpe"><Input type="number" min="0" value={form.frais_decoupe || ''} onChange={(e) => updateForm('frais_decoupe', e.target.value)} /></Field><Field label="Emballage"><Input type="number" min="0" value={form.frais_emballage || ''} onChange={(e) => updateForm('frais_emballage', e.target.value)} /></Field><Field label="Transport"><Input type="number" min="0" value={form.frais_transport || ''} onChange={(e) => updateForm('frais_transport', e.target.value)} /></Field><Field label="Autres frais"><Input type="number" min="0" value={form.autres_frais || ''} onChange={(e) => updateForm('autres_frais', e.target.value)} /></Field><Field label="Responsable"><Input value={form.responsable || ''} onChange={(e) => updateForm('responsable', e.target.value)} /></Field><div className="flex items-end gap-2"><ActionButton type="submit" icon={editing ? Save : Plus}>{editing ? 'Modifier' : 'Ajouter'}</ActionButton>{editing ? <ActionButton icon={X} onClick={() => { setEditing(null); setForm(initial); }}>Annuler</ActionButton> : null}</div></form>
    <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="text-left text-xs uppercase text-[#8a7456] border-b border-[#eadcc2]"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Animal</th><th className="py-2 pr-4">Produit stock</th><th className="py-2 pr-4">Poids</th><th className="py-2 pr-4">Frais</th><th className="py-2 pr-4">Coût/kg</th><th className="py-2 pr-4">Destination</th><th className="py-2 pr-4">Actions</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b border-[#f0e5d0]"><td className="py-3 pr-4">{event.date || '—'}</td><td className="py-3 pr-4 font-bold">{event.animal_name || animalId(event)}</td><td className="py-3 pr-4 font-bold text-emerald-700">{event.destination === 'perte' ? 'Non stocké' : event.produit_stock}</td><td className="py-3 pr-4">{slaughterWeight(event).toFixed(2)} kg</td><td className="py-3 pr-4">{fmtCurrency(slaughterFees(event))}</td><td className="py-3 pr-4">{event.cout_revient_viande_kg ? fmtCurrency(event.cout_revient_viande_kg) : 'auto'}</td><td className="py-3 pr-4">{event.destination || 'stock'}</td><td className="py-3 pr-4"><div className="flex gap-1"><ActionButton icon={Edit} onClick={() => startEdit(event)}>Modifier</ActionButton><ActionButton icon={Trash2} danger onClick={() => remove(event)}>Supprimer</ActionButton></div></td></tr>)}{!events.length ? <tr><td colSpan="8" className="py-4 text-center text-[#8a7456]">Aucun abattage animal enregistré.</td></tr> : null}</tbody></table></div>
  </section>;
}
