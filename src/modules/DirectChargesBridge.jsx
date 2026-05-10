import { useMemo, useState } from 'react';
import { Edit, Plus, ReceiptText, RefreshCw, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.cout ?? row.cost ?? row.cout_total ?? row.total ?? 0);
const targetId = (row = {}) => row.target_id || row.related_id || row.entity_id || row.source_record_id || row.animal_id || row.lot_id;
const isDirectCharge = (row = {}) => lower(`${row.type_evenement || ''} ${row.event_type || ''} ${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.title || ''}`).includes('charge_directe') || lower(row.type_evenement).includes('autre_charge') || lower(row.category).includes('autre_charge');

const CHARGE_OPTIONS = [
  'Transport',
  'Main-d’œuvre ponctuelle',
  'Abattage / découpe',
  'Emballage',
  'Complément alimentaire exceptionnel',
  'Traitement spécial',
  'Analyse / laboratoire',
  'Réparation liée au lot',
  'Autre charge',
  'Nouvelle charge',
];

function Field({ label, children }) {
  return <label className="space-y-1 text-xs font-bold text-[#8a7456]"><span>{label}</span>{children}</label>;
}
function Input(props) {
  return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />;
}
function Select(props) {
  return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />;
}
function Button({ children, icon: Icon, onClick, type = 'button', danger = false }) {
  return <button type={type} onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold ${danger ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-[#d6c3a0] bg-[#fffdf8] text-[#2f2415]'}`}><Icon size={14} />{children}</button>;
}

export default function DirectChargesBridge({
  title = 'Autres charges directes',
  subtitle = 'Charges exceptionnelles liées directement à un animal ou à un lot.',
  targetType = 'animaux',
  targets = [],
  businessEvents = [],
  onCreateBusinessEvent,
  onUpdateBusinessEvent,
  onDeleteBusinessEvent,
  onRefreshBusinessEvents,
}) {
  const [editing, setEditing] = useState(null);
  const initial = { id: `CHG-${Date.now()}`, target_id: targets[0]?.id || '', charge_option: 'Transport', charge_name: '', montant: '', date: today(), commentaire: '' };
  const [form, setForm] = useState(initial);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const charges = useMemo(() => arr(businessEvents).filter((row) => {
    if (!isDirectCharge(row)) return false;
    const type = lower(row.target_type || row.module_lie || row.source_module || row.activity || row.activite_liee);
    return !type || type.includes(lower(targetType)) || lower(targetType).includes(type);
  }).sort((a, b) => String(b.date || b.created_at).localeCompare(String(a.date || a.created_at))), [businessEvents, targetType]);

  const total = charges.reduce((sum, row) => sum + amount(row), 0);
  const targetLabel = (id) => targets.find((target) => String(target.id) === String(id))?.name || targets.find((target) => String(target.id) === String(id))?.tag || targets.find((target) => String(target.id) === String(id))?.id || id || '—';

  const submit = async (e) => {
    e.preventDefault();
    const selectedTarget = targets.find((target) => String(target.id) === String(form.target_id));
    if (!selectedTarget) return toast.error('Choisir une cible');
    const label = form.charge_option === 'Nouvelle charge' ? String(form.charge_name || '').trim() : form.charge_option;
    if (!label) return toast.error('Nom de charge obligatoire');
    const value = amount(form);
    if (value <= 0) return toast.error('Montant obligatoire');
    const payload = {
      ...form,
      id: form.id || `CHG-${Date.now()}`,
      target_id: selectedTarget.id,
      related_id: selectedTarget.id,
      source_record_id: selectedTarget.id,
      target_label: targetLabel(selectedTarget.id),
      target_type: targetType,
      module_lie: targetType,
      source_module: targetType,
      type_evenement: 'charge_directe',
      category: 'autre_charge_directe',
      libelle: label,
      title: `Charge directe: ${label}`,
      message: `${label} · ${fmtCurrency(value)} · ${targetLabel(selectedTarget.id)}`,
      montant: value,
      amount: value,
      cout_total: value,
      date: form.date || today(),
      status: 'genere',
    };
    if (editing && onUpdateBusinessEvent) await onUpdateBusinessEvent(editing.id, payload);
    else await onCreateBusinessEvent?.(payload);
    await onRefreshBusinessEvents?.();
    toast.success(editing ? 'Charge directe modifiée' : 'Charge directe ajoutée');
    setEditing(null);
    setForm({ ...initial, id: `CHG-${Date.now()}`, target_id: selectedTarget.id });
  };

  const startEdit = (row) => {
    const known = CHARGE_OPTIONS.includes(row.libelle) ? row.libelle : 'Nouvelle charge';
    setEditing(row);
    setForm({ ...row, target_id: targetId(row), charge_option: known, charge_name: known === 'Nouvelle charge' ? row.libelle || row.title || '' : '', montant: amount(row), date: row.date || today(), commentaire: row.commentaire || row.notes || '' });
  };
  const remove = async (row) => {
    await onDeleteBusinessEvent?.(row.id);
    await onRefreshBusinessEvents?.();
    toast.success('Charge directe supprimée');
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><ReceiptText size={20} /> {title}</p><p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p></div>
      <div className="flex items-center gap-2"><span className="rounded-xl bg-[#2f2415] px-3 py-2 text-sm font-black text-white">{fmtCurrency(total)}</span><Button icon={RefreshCw} onClick={onRefreshBusinessEvents}>Actualiser</Button></div>
    </div>

    <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-7 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3">
      <Field label="Cible"><Select value={form.target_id || ''} onChange={(e) => update('target_id', e.target.value)}><option value="">Choisir</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.name || target.tag || target.id}</option>)}</Select></Field>
      <Field label="Charge"><Select value={form.charge_option || 'Transport'} onChange={(e) => update('charge_option', e.target.value)}>{CHARGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</Select></Field>
      {form.charge_option === 'Nouvelle charge' ? <Field label="Nom nouvelle charge"><Input value={form.charge_name || ''} onChange={(e) => update('charge_name', e.target.value)} placeholder="ex: désinfection spéciale" /></Field> : null}
      <Field label="Montant"><Input type="number" min="0" value={form.montant || ''} onChange={(e) => update('montant', e.target.value)} /></Field>
      <Field label="Date"><Input type="date" value={form.date || ''} onChange={(e) => update('date', e.target.value)} /></Field>
      <Field label="Commentaire"><Input value={form.commentaire || ''} onChange={(e) => update('commentaire', e.target.value)} /></Field>
      <div className="flex items-end gap-2"><Button type="submit" icon={editing ? Save : Plus}>{editing ? 'Modifier' : 'Ajouter'}</Button>{editing ? <Button icon={X} onClick={() => { setEditing(null); setForm(initial); }}>Annuler</Button> : null}</div>
    </form>

    <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-[#eadcc2] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Cible</th><th className="py-2 pr-4">Charge</th><th className="py-2 pr-4">Montant</th><th className="py-2 pr-4">Commentaire</th><th className="py-2 pr-4">Actions</th></tr></thead><tbody>{charges.map((row) => <tr key={row.id} className="border-b border-[#f0e5d0]"><td className="py-3 pr-4">{row.date || '—'}</td><td className="py-3 pr-4 font-bold">{row.target_label || targetLabel(targetId(row))}</td><td className="py-3 pr-4">{row.libelle || row.title}</td><td className="py-3 pr-4 font-bold">{fmtCurrency(amount(row))}</td><td className="py-3 pr-4">{row.commentaire || row.notes || '—'}</td><td className="py-3 pr-4"><div className="flex gap-1"><Button icon={Edit} onClick={() => startEdit(row)}>Modifier</Button>{onDeleteBusinessEvent ? <Button icon={Trash2} danger onClick={() => remove(row)}>Supprimer</Button> : null}</div></td></tr>)}{!charges.length ? <tr><td colSpan="6" className="py-4 text-center text-[#8a7456]">Aucune charge directe enregistrée.</td></tr> : null}</tbody></table></div>
  </section>;
}
