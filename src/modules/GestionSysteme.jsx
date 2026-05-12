import { AlertTriangle, CheckCircle2, Edit, Eye, EyeOff, LockKeyhole, Plus, Save, Shield, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import SectionHeader from '../components/SectionHeader';
import { ROLE_PERMISSIONS, useAuth } from '../context/AuthContext';
import { makeId } from '../utils/ids';

const MODULES = [
  ['dashboard', 'Dashboard'], ['assistant_erp', 'Assistant ERP'], ['animaux', 'Animaux'], ['avicole', 'Avicole'], ['sante', 'Santé & Vaccins'], ['finances', 'Finances'], ['comptabilite', 'Comptabilité'], ['investissements', 'Investissements'], ['impact_business', 'Impact & Valeur ERP'], ['stock', 'Stock'], ['clients', 'Clients'], ['ventes', 'Ventes'], ['fournisseurs', 'Fournisseurs'], ['tracabilite', 'Traçabilité'], ['alertes', 'Centre Alertes'], ['cultures', 'Cultures'], ['documents', 'Documents'], ['taches', 'Tâches'], ['rh', 'RH & Équipe'], ['rapports', 'Rapports'], ['equipements', 'Équipements'], ['smartfarm', 'Smart Farm'], ['audit_logs', 'Audit Logs'], ['sync', 'Sync Offline'], ['gestion_systeme', 'Gestion du système'],
];
const ACTIONS = ['voir', 'créer', 'modifier', 'supprimer', 'exporter', 'valider', 'payer', 'clôturer', 'voir_marges'];
const ROLE_LABELS = { admin: 'Super Admin', manager: 'Gestionnaire', employe: 'Employé terrain', veterinaire: 'Vétérinaire', comptable: 'Comptable' };
const DEFAULT_USERS = [
  { id: 'USR-PENDA', nom: 'penda', email: 'penda@horizonfarm.app', role: 'admin', statut: 'actif', equipe: 'Direction', modules: ['*'], actions: ['*'], notes: 'Compte propriétaire protégé' },
  { id: 'USR-MANAGER', nom: 'Responsable ferme', email: 'manager@horizonfarm.app', role: 'manager', statut: 'actif', equipe: 'Ferme', modules: ROLE_PERMISSIONS.manager || [], actions: ['voir', 'créer', 'modifier', 'exporter', 'valider'] },
  { id: 'USR-COMPTA', nom: 'Comptable', email: 'comptable@horizonfarm.app', role: 'comptable', statut: 'actif', equipe: 'Finance', modules: ROLE_PERMISSIONS.comptable || [], actions: ['voir', 'créer', 'modifier', 'exporter', 'payer'] },
];
const loadUsers = () => {
  try { const saved = JSON.parse(localStorage.getItem('horizon-system-users') || '[]'); return saved.length ? saved : DEFAULT_USERS; } catch { return DEFAULT_USERS; }
};
const saveUsers = (users) => { localStorage.setItem('horizon-system-users', JSON.stringify(users)); return users; };
const has = (list = [], key) => list.includes('*') || list.includes(key);
const roleModules = (role) => ROLE_PERMISSIONS[role]?.includes('*') ? MODULES.map(([key]) => key) : (ROLE_PERMISSIONS[role] || []);
const newUser = () => ({ id: makeId('USR'), nom: '', email: '', role: 'employe', statut: 'actif', equipe: '', modules: ROLE_PERMISSIONS.employe || [], actions: ['voir'], notes: '' });

function Field({ label, value, onChange, type = 'text' }) {
  return <label className="block text-sm"><span className="text-[#8a7456]">{label}</span><input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" /></label>;
}
function TogglePill({ active, children, onClick }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-bold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#eadcc2] bg-white text-[#8a7456]'}`}>{children}</button>;
}
function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

export default function GestionSysteme() {
  const { user, role } = useAuth();
  const [users, setUsers] = useState(loadUsers);
  const [selected, setSelected] = useState(null);
  const [filterRole, setFilterRole] = useState('tous');
  const [showMatrix, setShowMatrix] = useState(false);
  const visibleUsers = useMemo(() => users.filter((u) => filterRole === 'tous' || u.role === filterRole), [users, filterRole]);
  const stats = useMemo(() => ({ total: users.length, actifs: users.filter((u) => u.statut === 'actif').length, admins: users.filter((u) => u.role === 'admin').length, disabled: users.filter((u) => u.statut !== 'actif').length }), [users]);
  const persist = (next) => setUsers(saveUsers(next));
  const setS = (key, value) => setSelected((prev) => ({ ...prev, [key]: value }));
  const toggleModule = (key) => setSelected((prev) => { const list = prev.modules || []; return { ...prev, modules: list.includes(key) ? list.filter((x) => x !== key) : [...list, key] }; });
  const toggleAction = (key) => setSelected((prev) => { const list = prev.actions || []; return { ...prev, actions: list.includes(key) ? list.filter((x) => x !== key) : [...list, key] }; });
  const applyRole = (nextRole) => setSelected((prev) => ({ ...prev, role: nextRole, modules: roleModules(nextRole), actions: nextRole === 'admin' ? ['*'] : nextRole === 'comptable' ? ['voir', 'créer', 'modifier', 'exporter', 'payer'] : nextRole === 'manager' ? ['voir', 'créer', 'modifier', 'exporter', 'valider'] : ['voir'] }));
  const save = () => {
    if (!selected?.nom?.trim()) return toast.error('Nom obligatoire');
    if (!selected?.email?.trim()) return toast.error('Email obligatoire');
    const exists = users.some((u) => u.id === selected.id);
    const payload = { ...selected, updated_at: new Date().toISOString() };
    persist(exists ? users.map((u) => u.id === selected.id ? payload : u) : [...users, { ...payload, created_at: new Date().toISOString() }]);
    setSelected(null);
    toast.success(exists ? 'Utilisateur système mis à jour' : 'Utilisateur système ajouté');
  };
  const remove = (target) => {
    if (target.id === 'USR-PENDA' || target.role === 'admin' && users.filter((u) => u.role === 'admin' && u.statut === 'actif').length <= 1) return toast.error('Impossible de supprimer le dernier Super Admin');
    if (!window.confirm(`Supprimer ${target.nom} ?`)) return;
    persist(users.filter((u) => u.id !== target.id));
    toast.success('Utilisateur supprimé');
  };

  return <div className="space-y-6">
    <SectionHeader title="Gestion du système" sub="Administrateurs, rôles, accès modules, habilitations et sécurité" actions={<><Btn variant="outline" small onClick={() => setShowMatrix((v) => !v)}>{showMatrix ? 'Masquer matrice' : 'Voir matrice'}</Btn><Btn icon={Plus} small onClick={() => setSelected(newUser())}>Ajouter admin / utilisateur</Btn></>} />

    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><ShieldCheck size={14} /> Sécurité ERP</p>
          <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Accès, visibilité et habilitations</h2>
          <p className="mt-1 text-sm text-[#8a7456]">Utilisateur connecté : {user?.email || '—'} · rôle actuel : {ROLE_LABELS[role] || role}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-full lg:min-w-[560px]"><Mini icon={Users} label="Utilisateurs" value={stats.total} /><Mini icon={CheckCircle2} label="Actifs" value={stats.actifs} /><Mini icon={Shield} label="Admins" value={stats.admins} danger={stats.admins > 3} /><Mini icon={LockKeyhole} label="Désactivés" value={stats.disabled} danger={stats.disabled > 0} /></div>
      </div>
    </div>

    <div className="flex flex-wrap gap-2">{['tous', ...Object.keys(ROLE_LABELS)].map((r) => <TogglePill key={r} active={filterRole === r} onClick={() => setFilterRole(r)}>{r === 'tous' ? 'Tous' : ROLE_LABELS[r]}</TogglePill>)}</div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        <h3 className="font-black text-[#2f2415]">Utilisateurs & administrateurs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{visibleUsers.map((u) => <div key={u.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{u.nom}</p><p className="text-xs text-[#8a7456]">{u.email}</p><p className="mt-1 text-xs font-bold text-[#8a7456]">{ROLE_LABELS[u.role] || u.role} · {u.statut}</p></div><div className="flex gap-2"><button type="button" onClick={() => setSelected(u)} title="Modifier"><Edit size={16} /></button><button type="button" onClick={() => remove(u)} title="Supprimer" className="text-red-600"><Trash2 size={16} /></button></div></div>
          <div className="mt-3 flex flex-wrap gap-1">{has(u.modules, '*') ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Tous modules</span> : (u.modules || []).slice(0, 6).map((m) => <span key={m} className="rounded-full bg-white border border-[#eadcc2] px-2 py-1 text-xs text-[#8a7456]">{MODULES.find(([key]) => key === m)?.[1] || m}</span>)}{!has(u.modules, '*') && (u.modules || []).length > 6 ? <span className="text-xs text-[#8a7456]">+{u.modules.length - 6}</span> : null}</div>
        </div>)}</div>
      </div>

      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        {selected ? <><h3 className="font-black text-[#2f2415]">{users.some((u) => u.id === selected.id) ? 'Modifier accès' : 'Nouvel accès'}</h3><Field label="Nom" value={selected.nom} onChange={(v) => setS('nom', v)} /><Field label="Email" value={selected.email} onChange={(v) => setS('email', v)} /><Field label="Équipe / périmètre" value={selected.equipe} onChange={(v) => setS('equipe', v)} />
          <label className="block text-sm"><span className="text-[#8a7456]">Rôle</span><select value={selected.role} onChange={(e) => applyRole(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2">{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="block text-sm"><span className="text-[#8a7456]">Statut</span><select value={selected.statut} onChange={(e) => setS('statut', e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2"><option value="actif">Actif</option><option value="suspendu">Suspendu</option><option value="desactive">Désactivé</option></select></label>
          <div><p className="text-sm font-bold text-[#2f2415] mb-2">Modules visibles</p><div className="max-h-48 overflow-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 grid grid-cols-1 gap-2">{MODULES.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-2 text-sm"><span>{label}</span><input type="checkbox" checked={has(selected.modules, key)} disabled={has(selected.modules, '*')} onChange={() => toggleModule(key)} /></label>)}</div></div>
          <div><p className="text-sm font-bold text-[#2f2415] mb-2">Habilitations actions</p><div className="flex flex-wrap gap-2">{ACTIONS.map((a) => <TogglePill key={a} active={has(selected.actions, a)} onClick={() => toggleAction(a)}>{a.replace('_', ' ')}</TogglePill>)}</div></div>
          <Field label="Notes sécurité" value={selected.notes} onChange={(v) => setS('notes', v)} />
          <div className="flex gap-2"><Btn icon={Save} onClick={save}>Enregistrer</Btn><Btn variant="outline" onClick={() => setSelected(null)}>Fermer</Btn></div></> : <div className="text-sm text-[#8a7456]"><UserCog size={22} className="mb-3" /><p className="font-bold text-[#2f2415]">Sélectionne un utilisateur</p><p>Tu peux définir son rôle, ses modules visibles et ses habilitations.</p></div>}
      </div>
    </div>

    {showMatrix ? <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <h3 className="font-black text-[#2f2415]">Matrice rôles / modules</h3>
      <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Module</th>{Object.entries(ROLE_LABELS).map(([key, label]) => <th key={key} className="py-2 px-3">{label}</th>)}</tr></thead><tbody>{MODULES.map(([key, label]) => <tr key={key} className="border-b border-[#f0e5d0]"><td className="py-2 px-3 font-bold text-[#2f2415]">{label}</td>{Object.keys(ROLE_LABELS).map((roleKey) => <td key={roleKey} className="py-2 px-3">{has(ROLE_PERMISSIONS[roleKey] || [], key) ? <Eye size={16} className="text-emerald-600" /> : <EyeOff size={16} className="text-[#c0aa84]" />}</td>)}</tr>)}</tbody></table></div>
    </div> : null}

    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2"><AlertTriangle size={18} className="shrink-0" /> Cette première version pilote les habilitations côté interface et prépare la gestion complète des accès. Pour une version SaaS vendable, il faudra aussi synchroniser ces règles avec Supabase RLS côté base de données.</div>
  </div>;
}
