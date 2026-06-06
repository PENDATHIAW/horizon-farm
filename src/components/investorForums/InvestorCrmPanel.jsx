import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Save, Trash2, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../../utils/format.js';
import {
  CONTACT_STATUS,
  CONTACT_TYPES,
  contactStatusLabel,
  contactTypeLabel,
  deleteInvestorForumContact,
  EMPTY_CONTACT,
  listInvestorForumContacts,
  saveInvestorForumContact,
} from '../../services/investorForums/investorForumCrmService.js';

function FieldInput({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
      {type === 'textarea' ? (
        <textarea className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" rows={2} value={value || ''} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={value || ''} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

export default function InvestorCrmPanel() {
  const [contacts, setContacts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ ...EMPTY_CONTACT });
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const rows = await listInvestorForumContacts();
    setContacts(rows);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startCreate = () => {
    setDraft({ ...EMPTY_CONTACT });
    setEditingId(null);
    setShowForm(true);
  };

  const startEdit = (row) => {
    setDraft({
      ...EMPTY_CONTACT,
      ...row,
      potential_amount: row.potential_amount ?? '',
      last_exchange_at: row.last_exchange_at ? row.last_exchange_at.slice(0, 10) : '',
      follow_up_at: row.follow_up_at ? row.follow_up_at.slice(0, 10) : '',
    });
    setEditingId(row.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      await saveInvestorForumContact({ ...draft, id: editingId || undefined });
      setShowForm(false);
      setEditingId(null);
      await load();
      toast.success('Contact enregistré');
    } catch (error) {
      toast.error(error.message || 'Enregistrement impossible');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    await deleteInvestorForumContact(id);
    await load();
    toast.success('Contact supprimé');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 font-black text-slate-900">
              <Users size={18} />
              CRM investisseurs & partenaires
            </p>
            <p className="mt-1 text-sm text-slate-600">Investisseurs, banques, ONG, incubateurs, forums, salons et partenaires techniques.</p>
          </div>
          <button type="button" onClick={startCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white">
            <Plus size={14} />
            Ajouter
          </button>
        </div>
      </section>

      {showForm ? (
        <section className="rounded-3xl border border-teal-200 bg-teal-50/30 p-5 space-y-3">
          <p className="font-black text-slate-900">{editingId ? 'Modifier le contact' : 'Nouveau contact'}</p>
          <div className="grid md:grid-cols-2 gap-3">
            <FieldInput label="Nom" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
            <FieldInput label="Organisation" value={draft.organization} onChange={(v) => setDraft((d) => ({ ...d, organization: v }))} />
            <FieldInput label="Pays" value={draft.country} onChange={(v) => setDraft((d) => ({ ...d, country: v }))} />
            <FieldInput label="Email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
            <FieldInput label="Téléphone" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-500">Type</span>
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={draft.contact_type} onChange={(e) => setDraft((d) => ({ ...d, contact_type: e.target.value }))}>
                {CONTACT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </label>
            <FieldInput label="Montant potentiel (FCFA)" value={draft.potential_amount} onChange={(v) => setDraft((d) => ({ ...d, potential_amount: v }))} />
            <label className="block">
              <span className="text-[10px] font-black uppercase text-slate-500">Statut</span>
              <select className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                {CONTACT_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </label>
            <FieldInput label="Dernier échange" value={draft.last_exchange_at} onChange={(v) => setDraft((d) => ({ ...d, last_exchange_at: v }))} type="date" />
            <FieldInput label="Relance prévue" value={draft.follow_up_at} onChange={(v) => setDraft((d) => ({ ...d, follow_up_at: v }))} type="date" />
            <div className="md:col-span-2"><FieldInput label="Notes" value={draft.notes} onChange={(v) => setDraft((d) => ({ ...d, notes: v }))} type="textarea" /></div>
            <div className="md:col-span-2"><FieldInput label="Documents envoyés" value={draft.documents_sent} onChange={(v) => setDraft((d) => ({ ...d, documents_sent: v }))} type="textarea" /></div>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              <Save size={14} />
              Enregistrer
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold">
              <X size={14} />
              Annuler
            </button>
          </div>
        </section>
      ) : null}

      {contacts.length === 0 ? (
        <p className="text-sm text-slate-500 italic text-center rounded-2xl border border-dashed border-slate-200 p-8">Aucun contact — ajoutez investisseurs, banques, ONG ou forums.</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                {['Nom', 'Organisation', 'Pays', 'Type', 'Montant', 'Statut', 'Relance', 'Actions'].map((h) => (
                  <th key={h} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contacts.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-3 py-3 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-3 py-3 text-slate-600">{row.organization || '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{row.country || '—'}</td>
                  <td className="px-3 py-3"><span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">{contactTypeLabel(row.contact_type)}</span></td>
                  <td className="px-3 py-3 text-slate-600">{row.potential_amount ? fmtCurrency(row.potential_amount) : '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{contactStatusLabel(row.status)}</td>
                  <td className="px-3 py-3 text-slate-600">{row.follow_up_at ? new Date(row.follow_up_at).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => startEdit(row)} className="rounded-lg border border-slate-200 p-1.5"><Pencil size={12} /></button>
                      <button type="button" onClick={() => handleDelete(row.id)} className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-700"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
