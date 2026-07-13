import { Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const today = () => new Date().toISOString().slice(0, 10);
const initial = () => ({ name: '', type: 'machine', purchase_cost: '', date_achat: today(), fournisseur_id: '', funding_source_id: 'autofinancement', justificatif_url: '' });

export default function EquipementAcquisitionForm({ suppliers = [], fundingSources = [], onSubmit }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (Number(form.purchase_cost || 0) <= 0) return toast.error('Montant d’acquisition obligatoire');
    if (!String(form.fournisseur_id || '').trim()) return toast.error('Fournisseur obligatoire');
    if (!String(form.funding_source_id || '').trim()) return toast.error('Source de financement obligatoire');
    if (!String(form.justificatif_url || '').trim()) return toast.error('Preuve documentaire obligatoire');
    setSaving(true);
    try {
      await onSubmit?.({ ...form, purchase_cost: Number(form.purchase_cost) });
      setForm(initial());
      toast.success('Acquisition enregistrée');
    } catch (error) {
      toast.error(error?.message || 'Acquisition impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4"><h2 className="font-semibold text-earth">Nouvelle acquisition</h2><p className="mt-1 text-sm text-slate">Crée une fiche équipement, une dépense validée et une preuve liée.</p></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-semibold text-slate">Équipement<input required value={form.name} onChange={(event) => set('name', event.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
        <label className="text-sm font-semibold text-slate">Type<select value={form.type} onChange={(event) => set('type', event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-normal"><option value="machine">Machine</option><option value="incubateur">Incubateur</option><option value="pompe">Pompe</option><option value="groupe_electrogene">Groupe électrogène</option><option value="vehicule">Véhicule</option><option value="outil">Outil</option><option value="autre">Autre</option></select></label>
        <label className="text-sm font-semibold text-slate">Montant<input required min="1" type="number" value={form.purchase_cost} onChange={(event) => set('purchase_cost', event.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
        <label className="text-sm font-semibold text-slate">Date<input required type="date" value={form.date_achat} onChange={(event) => set('date_achat', event.target.value)} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
        <label className="text-sm font-semibold text-slate">Fournisseur<select required value={form.fournisseur_id} onChange={(event) => set('fournisseur_id', event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-normal"><option value="">Choisir</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.nom || supplier.name || supplier.id}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate">Source de financement<select required value={form.funding_source_id} onChange={(event) => set('funding_source_id', event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-normal"><option value="autofinancement">Autofinancement</option>{fundingSources.map((source) => <option key={source.id} value={source.id}>{source.nom || source.name || source.libelle || source.id}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate">Lien de la preuve<input required type="url" value={form.justificatif_url} onChange={(event) => set('justificatif_url', event.target.value)} placeholder="https://..." className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
      </div>
      <div className="mt-4 flex justify-end"><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-leaf px-4 py-2 font-semibold text-earth disabled:opacity-50"><Plus size={16} />{saving ? 'Enregistrement...' : 'Enregistrer l’acquisition'}</button></div>
    </form>
  );
}
