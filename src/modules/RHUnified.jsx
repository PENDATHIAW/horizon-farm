import { Banknote, Edit, Plus, Save, Trash2, UserCheck, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { getRhDirectory, RH_MODULES, RH_ROLES, RH_TEAMS, saveRhDirectory, loadRhDirectoryFromCloud } from '../utils/rhDirectory';

const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ id: `RH-${Date.now().toString(36).toUpperCase()}`, nom: '', role: 'Ouvrier ferme', fonction: 'Ouvrier polyvalent', statut: 'actif', equipe_id: 'TEAM-FERME', modules: ['avicole', 'stock'], phone: '', whatsapp: '', salaire_mensuel: 0, prime_mensuelle: 0, avance_mois: 0, date_entree: today() });
const teamFor = (role = '') => role.includes('avicole') ? 'TEAM-AVICOLE' : role.includes('cultures') ? 'TEAM-CULTURES' : role.includes('stock') ? 'TEAM-STOCK' : role.includes('Commercial') ? 'TEAM-COMMERCIAL' : 'TEAM-FERME';
const modulesFor = (role = '') => role.includes('avicole') ? ['avicole', 'sante', 'stock'] : role.includes('cultures') ? ['cultures', 'stock'] : role.includes('stock') ? ['stock', 'fournisseurs'] : role.includes('Commercial') ? ['ventes', 'clients'] : ['avicole', 'stock'];
const norm = (p = {}) => ({ ...blank(), ...p, role: p.role || 'Ouvrier ferme', equipe_id: p.equipe_id || teamFor(p.role || ''), modules: Array.isArray(p.modules) && p.modules.length ? p.modules : modulesFor(p.role || '') });
const money = (p = {}) => { const salaire = toNumber(p.salaire_mensuel); const prime = toNumber(p.prime_mensuelle); const avance = toNumber(p.avance_mois); return { salaire, prime, avance, brut: salaire + prime, net: Math.max(0, salaire + prime - avance) }; };
const teamName = (teams, id) => teams.find((t) => t.id === id)?.name || id || 'Équipe ferme';
const moduleName = (key) => RH_MODULES.find((m) => m.key === key)?.label || key;

function Field({ label, value, set, type = 'text' }) {
  return <label className="block text-sm"><span className="text-[#8a7456]">{label}</span><input type={type} className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={value ?? ''} onChange={(e) => set(e.target.value)} /></label>;
}

export default function RHUnified({ onRefresh, onCreateFinanceTransaction, onRefreshFinances, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [directory, setDirectory] = useState(() => { const d = getRhDirectory(); return { ...d, teams: d.teams || RH_TEAMS, people: (d.people || []).map(norm) }; });
  const [form, setForm] = useState(blank());
  const [selectedId, setSelectedId] = useState('');
  const teams = directory.teams || RH_TEAMS;
  const people = (directory.people || []).map(norm);
  const selected = people.find((p) => p.id === selectedId);
  const active = people.filter((p) => ['actif', 'active'].includes(String(p.statut || '').toLowerCase()));
  const totals = active.reduce((acc, p) => { const m = money(p); return { brut: acc.brut + m.brut, avance: acc.avance + m.avance, net: acc.net + m.net }; }, { brut: 0, avance: 0, net: 0 });

  useEffect(() => { const sync = () => { const d = getRhDirectory(); setDirectory({ ...d, teams: d.teams || RH_TEAMS, people: (d.people || []).map(norm) }); }; void loadRhDirectoryFromCloud().then(sync).catch(sync); window.addEventListener('horizon-farm-rh-updated', sync); return () => window.removeEventListener('horizon-farm-rh-updated', sync); }, []);
  const persist = (nextPeople) => { const next = saveRhDirectory({ ...directory, people: nextPeople.map(norm), teams }); setDirectory(next); };
  const reset = () => { setSelectedId(''); setForm(blank()); };
  const edit = (p) => { const n = norm(p); setSelectedId(n.id); setForm(n); };
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const changeRole = (role) => setForm((prev) => ({ ...prev, role, equipe_id: prev.equipe_id || teamFor(role), modules: prev.modules?.length ? prev.modules : modulesFor(role) }));
  const toggleModule = (key) => setForm((prev) => { const current = Array.isArray(prev.modules) ? prev.modules : []; return { ...prev, modules: current.includes(key) ? current.filter((x) => x !== key) : [...current, key] }; });
  const save = () => {
    if (!String(form.nom || '').trim()) return toast.error('Nom obligatoire');
    const payload = norm({ ...form, salaire_mensuel: toNumber(form.salaire_mensuel), prime_mensuelle: toNumber(form.prime_mensuelle), avance_mois: toNumber(form.avance_mois), updated_at: new Date().toISOString() });
    const exists = people.some((p) => p.id === payload.id);
    persist(exists ? people.map((p) => p.id === payload.id ? payload : p) : [...people, { ...payload, created_at: new Date().toISOString() }]);
    setSelectedId(payload.id); setForm(payload); toast.success(exists ? 'Fiche RH mise à jour' : 'RH ajoutée');
  };
  const remove = (p) => { if (p.id === 'RH-PENDA') return toast.error('Compte propriétaire protégé'); if (!window.confirm(`Supprimer ${p.nom} ?`)) return; persist(people.filter((x) => x.id !== p.id)); reset(); toast.success('RH supprimée'); };
  const pay = async (p) => {
    const m = money(p); if (m.net <= 0) return toast.error('Aucun net à payer');
    if (!window.confirm(`Enregistrer ${fmtCurrency(m.net)} pour ${p.nom} ?`)) return;
    try {
      const tx = { id: makeId('TRX'), type: 'sortie', libelle: `Rémunération ${p.nom}`, montant: m.net, date: today(), categorie: 'Rémunérations', module_lie: 'rh', related_id: p.id, source_module: 'rh', source_record_id: p.id, statut: 'paye' };
      await onCreateFinanceTransaction?.(tx);
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'paiement_remuneration', module_source: 'rh', entity_type: 'personne', entity_id: p.id, title: `Rémunération payée — ${p.nom}`, description: fmtCurrency(m.net), event_date: today(), severity: 'info', amount: m.net });
      persist(people.map((x) => x.id === p.id ? { ...x, avance_mois: 0, dernier_paiement: today(), last_payment_amount: m.net } : x));
      await Promise.allSettled([onRefreshFinances?.(), onRefreshBusinessEvents?.(), onRefresh?.()]);
      toast.success('Paiement RH enregistré en Finance');
    } catch (error) { toast.error(error.message || 'Paiement impossible'); }
  };

  return <div className="space-y-6">
    <SectionHeader title="RH & Équipe" sub="Personnes, équipes, rémunérations et responsabilités" actions={<><Btn variant="outline" small onClick={onRefresh}>Actualiser</Btn><Btn icon={Plus} small onClick={reset}>Nouvelle RH</Btn></>} />
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4"><KpiCard icon={Users} label="Personnes" value={people.length} /><KpiCard icon={UserCheck} label="Actifs" value={active.length} /><KpiCard icon={Banknote} label="Masse brute" value={fmtCurrency(totals.brut)} /><KpiCard icon={Banknote} label="Net à payer" value={fmtCurrency(totals.net)} sub={`Avances ${fmtCurrency(totals.avance)}`} /></div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4"><div className="xl:col-span-2 bg-white border border-[#d6c3a0] rounded-2xl p-5"><h3 className="font-black text-[#2f2415] mb-3">Répertoire RH</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{people.map((p) => { const m = money(p); return <div key={p.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex justify-between gap-3"><div><p className="font-black text-[#2f2415]">{p.nom || p.id}</p><p className="text-xs text-[#8a7456]">{p.role} · {p.fonction}</p><p className="text-xs text-[#8a7456] mt-1">{teamName(teams, p.equipe_id)} · {p.statut}</p></div><div className="flex gap-2"><button onClick={() => edit(p)} title="Modifier"><Edit size={16} /></button><button onClick={() => remove(p)} title="Supprimer" className="text-red-600"><Trash2 size={16} /></button></div></div><p className="text-xs text-[#8a7456] mt-2">Modules : {(p.modules || []).map(moduleName).join(', ')}</p><div className="mt-3 rounded-lg bg-white border border-[#eadcc2] p-2 text-xs"><b>Net à payer : {fmtCurrency(m.net)}</b><br />Salaire {fmtCurrency(m.salaire)} · Prime {fmtCurrency(m.prime)} · Avance {fmtCurrency(m.avance)}</div><div className="mt-3 flex gap-2"><button className="rounded-lg border border-[#d6c3a0] px-3 py-1 text-xs font-bold" onClick={() => edit(p)}>Modifier fiche</button><button className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white" onClick={() => pay(p)}>Payer</button></div></div>; })}</div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-3"><h3 className="font-black text-[#2f2415]">{selected ? 'Modifier RH' : 'Nouvelle RH'}</h3><Field label="Nom" value={form.nom} set={(v) => set('nom', v)} /><label className="block text-sm"><span className="text-[#8a7456]">Rôle</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={form.role} onChange={(e) => changeRole(e.target.value)}>{RH_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></label><Field label="Fonction" value={form.fonction} set={(v) => set('fonction', v)} /><label className="block text-sm"><span className="text-[#8a7456]">Équipe</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={form.equipe_id} onChange={(e) => set('equipe_id', e.target.value)}>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><Field label="Téléphone" value={form.phone} set={(v) => set('phone', v)} /><Field label="WhatsApp" value={form.whatsapp} set={(v) => set('whatsapp', v)} /><Field label="Salaire mensuel" type="number" value={form.salaire_mensuel} set={(v) => set('salaire_mensuel', v)} /><Field label="Prime mensuelle" type="number" value={form.prime_mensuelle} set={(v) => set('prime_mensuelle', v)} /><Field label="Avance du mois" type="number" value={form.avance_mois} set={(v) => set('avance_mois', v)} /><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-3 text-sm">Net calculé : <b>{fmtCurrency(money(form).net)}</b></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-auto rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-2">{RH_MODULES.map((m) => <label key={m.key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(form.modules || []).includes(m.key)} onChange={() => toggleModule(m.key)} /> {m.label}</label>)}</div><Btn icon={Save} onClick={save}>Enregistrer</Btn></div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><h3 className="font-black text-[#2f2415] mb-3">Équipes</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-3">{teams.map((t) => <div key={t.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{t.name}</p><p className="text-xs text-[#8a7456]">{t.type} · {people.filter((p) => p.equipe_id === t.id).length} personne(s)</p></div>)}</div></div>
  </div>;
}
