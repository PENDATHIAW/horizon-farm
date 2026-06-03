import { Banknote } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../../utils/format';
import { rhPayrollOf } from '../../utils/rhWorkflows.js';
import { commitRhPayroll } from '../../utils/ressourcesWorkflow.js';

const today = () => new Date().toISOString().slice(0, 10);
const periodOf = () => today().slice(0, 7);
const inputCls = 'w-full rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#2f2415]';

export default function RessourcesPayrollPanel({
  people = [],
  context,
  handlers,
  onSuccess,
}) {
  const active = useMemo(
    () => (Array.isArray(people) ? people : []).filter((p) => ['actif', 'active'].includes(String(p.statut || '').toLowerCase())),
    [people],
  );
  const initial = {
    person_id: active[0]?.id || '',
    date: today(),
    period: periodOf(),
    amount: '',
    document_url: '',
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const person = active.find((p) => p.id === form.person_id);
  const net = person ? rhPayrollOf(person).net : 0;

  const submit = async (e) => {
    e.preventDefault();
    try {
      setBusy(true);
      await commitRhPayroll({
        form: {
          ...form,
          amount: toNumber(form.amount) || net,
        },
        context,
        handlers,
      });
      toast.success('Paie enregistrée — finance, document et coût main-d’œuvre à jour');
      setForm({ ...initial, person_id: form.person_id });
      await onSuccess?.();
    } catch (err) {
      toast.error(err.message || 'Paie impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Banknote size={20} /> Paie mensuelle</p>
        <p className="mt-1 text-sm text-[#8a7456]">RH → Coûts : charge salaire, preuve, événement métier et pilotage rentabilité.</p>
      </div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 md:grid-cols-5 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <label className="md:col-span-2 block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Personne</span>
          <select className={inputCls} value={form.person_id} onChange={(e) => update('person_id', e.target.value)} required>
            <option value="">Choisir</option>
            {active.map((p) => <option key={p.id} value={p.id}>{p.nom || p.id}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Période</span>
          <input type="month" className={inputCls} value={form.period} onChange={(e) => update('period', e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Date paiement</span>
          <input type="date" className={inputCls} value={form.date} onChange={(e) => update('date', e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">Montant net</span>
          <input type="number" min="0" className={inputCls} value={form.amount} placeholder={String(net || '')} onChange={(e) => update('amount', e.target.value)} />
        </label>
        <label className="md:col-span-2 block text-sm">
          <span className="mb-1 block text-xs font-bold text-[#8a7456]">URL reçu / contrat</span>
          <input type="url" className={inputCls} value={form.document_url} onChange={(e) => update('document_url', e.target.value)} />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy || !form.person_id} className="w-full rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {busy ? '…' : 'Enregistrer la paie'}
          </button>
        </div>
      </form>
      {person ? (
        <p className="text-sm text-[#7d6a4a]">Net calculé pour {person.nom} : <b>{fmtCurrency(net)}</b></p>
      ) : null}
    </section>
  );
}
