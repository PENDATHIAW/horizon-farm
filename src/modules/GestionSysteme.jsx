import { CheckCircle2, Download, Edit, Eye, EyeOff, LockKeyhole, Plus, Save, Shield, ShieldCheck, Trash2, UserCog, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import SectionHeader from '../components/SectionHeader';
import { ROLE_PERMISSIONS, useAuth } from '../context/AuthContext';
import { clearAllErpData, clearLocalErpCache, clearLocalTombstones, ERP_RESET_TABLES, exportErpDataToExcel } from '../services/systemDataResetService';
import { makeId } from '../utils/ids';

const MODULES = [
  ['dashboard', 'Dashboard'], ['assistant_erp', 'Assistant ERP'], ['animaux', 'Animaux'], ['avicole', 'Avicole'], ['sante', 'Santé & Vaccins'], ['finances', 'Finances'], ['comptabilite', 'Comptabilité'], ['investissements', 'Investissements'], ['impact_business', 'Impact & Valeur ERP'], ['stock', 'Stock'], ['clients', 'Clients'], ['ventes', 'Ventes'], ['fournisseurs', 'Fournisseurs'], ['tracabilite', 'Traçabilité'], ['alertes', 'Centre Alertes'], ['cultures', 'Cultures'], ['documents', 'Documents'], ['taches', 'Tâches'], ['rh', 'RH & Équipe'], ['rapports', 'Rapports'], ['equipements', 'Équipements'], ['smartfarm', 'Smart Farm'], ['audit_logs', 'Historique'], ['sync', 'Sauvegarde'], ['sync_activity', 'Vérifications & Sync'], ['gestion_systeme', 'Gestion du système'],
];
const ACTIONS = ['voir', 'créer', 'modifier', 'supprimer', 'exporter', 'valider', 'payer', 'clôturer', 'voir_marges'];
const ROLE_LABELS = { admin: 'Super Admin', manager: 'Gestionnaire', employe: 'Employé terrain', veterinaire: 'Vétérinaire', comptable: 'Comptable', visiteur: 'Visiteur' };
const ROLE_HELP = {
  admin: 'Accès complet : gestion, données, finances, rôles et remise à zéro.',
  manager: 'Pilote l’ensemble de la ferme et suit les décisions importantes.',
  employe: 'Suit le terrain : animaux, lots, stock, cultures, tâches et alertes.',
  veterinaire: 'Suit la santé, les vaccins, les documents et les actions sanitaires.',
  comptable: 'Suit les ventes, paiements, finances, rapports et justificatifs.',
  visiteur: 'Accès de démonstration limité à l’accueil et à l’assistant.',
};
const ACTION_LABELS = { voir: 'voir', créer: 'créer', modifier: 'modifier', supprimer: 'supprimer', exporter: 'exporter', valider: 'valider', payer: 'payer', clôturer: 'clôturer', voir_marges: 'voir les marges' };
const TABLE_LABELS = Object.fromEntries(ERP_RESET_TABLES.map((table) => [table.key, table.label]));
const DEFAULT_USERS = [
  { id: 'USR-PENDA', nom: 'penda', email: 'penda@horizonfarm.app', role: 'admin', statut: 'actif', equipe: 'Direction', modules: ['*'], actions: ['*'], notes: 'Compte propriétaire protégé' },
  { id: 'USR-VISITEUR', nom: 'Visiteur test', email: 'visiteur@horizonfarm.app', role: 'visiteur', statut: 'pending', equipe: 'Test', modules: ROLE_PERMISSIONS.visiteur || [], actions: ['voir'], notes: 'Accès limité : dashboard + assistant seulement' },
  { id: 'USR-COMPTA', nom: 'Comptable', email: 'comptable@horizonfarm.app', role: 'comptable', statut: 'actif', equipe: 'Finance', modules: ROLE_PERMISSIONS.comptable || [], actions: ['voir', 'créer', 'modifier', 'exporter', 'payer'] },
];
const loadUsers = () => { try { const saved = JSON.parse(localStorage.getItem('horizon-system-users') || '[]'); return saved.length ? saved : DEFAULT_USERS; } catch { return DEFAULT_USERS; } };
const saveUsers = (users) => { localStorage.setItem('horizon-system-users', JSON.stringify(users)); return users; };
const has = (list = [], key) => list.includes('*') || list.includes(key);
const roleModules = (role) => ROLE_PERMISSIONS[role]?.includes('*') ? MODULES.map(([key]) => key) : (ROLE_PERMISSIONS[role] || []);
const roleActions = (role) => role === 'admin' ? ['*'] : role === 'visiteur' ? ['voir'] : role === 'comptable' ? ['voir', 'créer', 'modifier', 'exporter', 'payer'] : role === 'manager' ? ['voir', 'créer', 'modifier', 'exporter', 'valider'] : ['voir'];
const newUser = () => ({ id: makeId('USR'), nom: '', email: '', role: 'visiteur', statut: 'pending', equipe: '', modules: ROLE_PERMISSIONS.visiteur || [], actions: ['voir'], notes: 'Créé depuis Gestion système' });
const moduleLabel = (key) => MODULES.find(([moduleKey]) => moduleKey === key)?.[1] || key;
const actionLabel = (key) => ACTION_LABELS[key] || String(key || '').replace('_', ' ');
const tableLabel = (key) => TABLE_LABELS[key] || key;

function Field({ label, value, onChange, type = 'text' }) { return <label className="block text-sm"><span className="text-[#8a7456]">{label}</span><input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" /></label>; }
function TogglePill({ active, children, onClick }) { return <button type="button" onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-bold ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-[#eadcc2] bg-white text-[#8a7456]'}`}>{children}</button>; }
function Mini({ icon: Icon, label, value, danger = false }) { return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</p><p className={`mt-2 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>; }
function DangerResetSection({ wipeBusy, wipeProgress, onWipe }) { return <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm space-y-3"><div><p className="text-lg font-black text-red-700">Effacer les données</p><p className="mt-1 text-sm text-red-700/80">Zone sensible placée en bas volontairement. Cette action vide les données de travail de la ferme, mais ne supprime pas les comptes, les accès ni la structure de l’application.</p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><button type="button" disabled={wipeBusy} onClick={() => onWipe({ exportFirst: true })} className="rounded-2xl border border-red-200 bg-white p-4 text-left font-black text-red-700 disabled:opacity-50"><Download size={17} className="inline" /> Exporter et effacer les données</button><button type="button" disabled={wipeBusy} onClick={() => onWipe({ exportFirst: false })} className="rounded-2xl border border-red-300 bg-red-600 p-4 text-left font-black text-white disabled:opacity-50"><Trash2 size={17} className="inline" /> Effacer les données seulement</button></div><p className="text-xs text-red-700/80">L’export Excel contient un onglet par espace : ventes, paiements, santé, stock, documents, animaux, avicole, cultures, rapports, historique, etc.</p>{wipeProgress ? <p className="rounded-xl bg-white/70 p-3 text-xs font-bold text-red-700">{wipeProgress}</p> : null}</div>; }

export default function GestionSysteme() {
  const { user, role, inviteUser, updateProfileRole } = useAuth();
  const [users, setUsers] = useState(loadUsers);
  const [selected, setSelected] = useState(null);
  const [filterRole, setFilterRole] = useState('tous');
  const [showMatrix, setShowMatrix] = useState(false);
  const [wipeBusy, setWipeBusy] = useState(false);
  const [wipeProgress, setWipeProgress] = useState('');
  const visibleUsers = useMemo(() => users.filter((u) => filterRole === 'tous' || u.role === filterRole), [users, filterRole]);
  const stats = useMemo(() => ({ total: users.length, actifs: users.filter((u) => ['actif', 'active'].includes(String(u.statut || '').toLowerCase())).length, admins: users.filter((u) => u.role === 'admin').length, visiteurs: users.filter((u) => u.role === 'visiteur').length }), [users]);
  const persist = (next) => setUsers(saveUsers(next));
  const setS = (key, value) => setSelected((prev) => ({ ...prev, [key]: value }));
  const toggleModule = (key) => setSelected((prev) => { const list = prev.modules || []; return { ...prev, modules: list.includes(key) ? list.filter((x) => x !== key) : [...list, key] }; });
  const toggleAction = (key) => setSelected((prev) => { const list = prev.actions || []; return { ...prev, actions: list.includes(key) ? list.filter((x) => x !== key) : [...list, key] }; });
  const applyRole = (nextRole) => setSelected((prev) => ({ ...prev, role: nextRole, modules: roleModules(nextRole), actions: roleActions(nextRole), statut: nextRole === 'visiteur' ? 'pending' : (prev.statut || 'active') }));
  const save = async () => {
    if (!selected?.nom?.trim()) return toast.error('Nom obligatoire');
    if (!selected?.email?.trim()) return toast.error('Email obligatoire');
    const exists = users.some((u) => u.id === selected.id);
    const payload = { ...selected, updated_at: new Date().toISOString() };
    try {
      if (!exists && inviteUser) await inviteUser({ email: payload.email, fullName: payload.nom, role: payload.role });
      if (exists && payload.uuid && updateProfileRole) await updateProfileRole(payload.uuid, { role: payload.role, status: payload.statut, full_name: payload.nom });
    } catch (error) {
      toast.error(error.message || 'Profil non mis à jour');
    }
    persist(exists ? users.map((u) => u.id === selected.id ? payload : u) : [...users, { ...payload, created_at: new Date().toISOString() }]);
    setSelected(null);
    toast.success(exists ? 'Utilisateur mis à jour' : 'Utilisateur créé / invité');
  };
  const remove = (target) => {
    if (target.id === 'USR-PENDA' || target.role === 'admin' && users.filter((u) => u.role === 'admin' && ['actif', 'active'].includes(String(u.statut || '').toLowerCase())).length <= 1) return toast.error('Impossible de supprimer le dernier Super Admin');
    if (!window.confirm(`Retirer ${target.nom} de la liste système ?`)) return;
    persist(users.filter((u) => u.id !== target.id));
    toast.success('Utilisateur retiré');
  };

  const wipeData = async ({ exportFirst }) => {
    const confirmText = exportFirst ? 'Exporter tout le contenu puis effacer toutes les données ? Les comptes et accès seront conservés.' : 'Effacer toutes les données sans export ? Les comptes et accès seront conservés.';
    if (!window.confirm(confirmText)) return;
    try {
      setWipeBusy(true);
      setWipeProgress(exportFirst ? 'Export en préparation...' : 'Effacement en préparation...');
      if (exportFirst) {
        await exportErpDataToExcel();
        toast.success('Export Excel généré');
      }
      const results = await clearAllErpData({ onProgress: (result) => setWipeProgress(`${result.cleared ? 'Effacé' : 'À revoir'} : ${tableLabel(result.tableKey)}`) });
      clearLocalTombstones();
      clearLocalErpCache();
      const errors = results.filter((result) => !result.cleared);
      if (errors.length) toast.error(`${errors.length} espace(s) n’ont pas pu être effacés`);
      else toast.success('Toutes les données ont été effacées');
      setWipeProgress('Terminé. Recharge la page pour repartir proprement.');
    } catch (error) {
      toast.error(error.message || 'Action impossible');
      setWipeProgress('Action interrompue.');
    } finally {
      setWipeBusy(false);
    }
  };

  return <div className="space-y-6">
    <SectionHeader title="Gestion du système" sub="Utilisateurs, visiteurs, rôles et accès" actions={<><Btn variant="outline" small onClick={() => setShowMatrix((v) => !v)}>{showMatrix ? 'Masquer' : 'Qui voit quoi ?'}</Btn><Btn icon={Plus} small onClick={() => setSelected(newUser())}>Créer utilisateur</Btn></>} />

    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700"><ShieldCheck size={14} /> Accès protégés</p>
          <h2 className="mt-3 text-2xl font-black text-[#2f2415]">Accès, visibilité et responsabilités</h2>
          <p className="mt-1 text-sm text-[#8a7456]">Utilisateur connecté : {user?.email || '—'} · rôle actuel : {ROLE_LABELS[role] || role}</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 min-w-full lg:min-w-[560px]"><Mini icon={Users} label="Utilisateurs" value={stats.total} /><Mini icon={CheckCircle2} label="Actifs" value={stats.actifs} /><Mini icon={Shield} label="Admins" value={stats.admins} danger={stats.admins > 3} /><Mini icon={LockKeyhole} label="Visiteurs" value={stats.visiteurs} /></div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {Object.entries(ROLE_LABELS).filter(([key]) => key !== 'admin').slice(0, 3).map(([key, label]) => <div key={key} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">{label}</p><p className="mt-1 text-xs text-[#8a7456]">{ROLE_HELP[key]}</p></div>)}
    </div>

    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><b>Rôle visiteur :</b> accès volontairement limité à Dashboard + Assistant ERP. Il sert aux tests, avis, démonstrations et bêta utilisateurs sans exposer Finances, Stock, RH, Comptabilité ou données sensibles.</div>

    <div className="flex flex-wrap gap-2">{['tous', ...Object.keys(ROLE_LABELS)].map((r) => <TogglePill key={r} active={filterRole === r} onClick={() => setFilterRole(r)}>{r === 'tous' ? 'Tous' : ROLE_LABELS[r]}</TogglePill>)}</div>

    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3"><h3 className="font-black text-[#2f2415]">Utilisateurs & visiteurs</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{visibleUsers.map((u) => <div key={u.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{u.nom}</p><p className="text-xs text-[#8a7456]">{u.email}</p><p className="mt-1 text-xs font-bold text-[#8a7456]">{ROLE_LABELS[u.role] || u.role} · {u.statut}</p></div><div className="flex gap-2"><button type="button" onClick={() => setSelected(u)} title="Modifier"><Edit size={16} /></button><button type="button" onClick={() => remove(u)} title="Retirer" className="text-red-600"><Trash2 size={16} /></button></div></div><div className="mt-3 flex flex-wrap gap-1">{has(u.modules, '*') ? <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">Tous les espaces</span> : (u.modules || []).slice(0, 6).map((m) => <span key={m} className="rounded-full bg-white border border-[#eadcc2] px-2 py-1 text-xs text-[#8a7456]">{moduleLabel(m)}</span>)}{!has(u.modules, '*') && (u.modules || []).length > 6 ? <span className="text-xs text-[#8a7456]">+{u.modules.length - 6}</span> : null}</div></div>)}</div></div>

      <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        {selected ? <><h3 className="font-black text-[#2f2415]">{users.some((u) => u.id === selected.id) ? 'Modifier accès' : 'Créer / inviter'}</h3><Field label="Nom" value={selected.nom} onChange={(v) => setS('nom', v)} /><Field label="Email" value={selected.email} onChange={(v) => setS('email', v)} /><Field label="Équipe / périmètre" value={selected.equipe} onChange={(v) => setS('equipe', v)} /><label className="block text-sm"><span className="text-[#8a7456]">Rôle</span><select value={selected.role} onChange={(e) => applyRole(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2">{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><p className="mt-1 text-xs text-[#8a7456]">{ROLE_HELP[selected.role]}</p></label><label className="block text-sm"><span className="text-[#8a7456]">Statut</span><select value={selected.statut} onChange={(e) => setS('statut', e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2"><option value="active">Actif</option><option value="pending">En attente</option><option value="suspended">Suspendu</option><option value="disabled">Désactivé</option></select></label><div><p className="text-sm font-bold text-[#2f2415] mb-2">Espaces visibles</p><div className="max-h-48 overflow-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 grid grid-cols-1 gap-2">{MODULES.map(([key, label]) => <label key={key} className="flex items-center justify-between gap-2 text-sm"><span>{label}</span><input type="checkbox" checked={has(selected.modules, key)} disabled={has(selected.modules, '*')} onChange={() => toggleModule(key)} /></label>)}</div></div><div><p className="text-sm font-bold text-[#2f2415] mb-2">Actions autorisées</p><div className="flex flex-wrap gap-2">{ACTIONS.map((a) => <TogglePill key={a} active={has(selected.actions, a)} onClick={() => toggleAction(a)}>{actionLabel(a)}</TogglePill>)}</div></div><Field label="Notes" value={selected.notes} onChange={(v) => setS('notes', v)} /><div className="flex gap-2"><Btn icon={Save} onClick={save}>Enregistrer</Btn><Btn variant="outline" onClick={() => setSelected(null)}>Fermer</Btn></div></> : <div className="text-sm text-[#8a7456]"><UserCog size={22} className="mb-3" /><p className="font-bold text-[#2f2415]">Sélectionne un utilisateur</p><p>Un visiteur peut se créer seul depuis la page de connexion. Tu peux ensuite modifier son rôle et ses accès ici.</p></div>}
      </div>
    </div>

    {showMatrix ? <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><h3 className="font-black text-[#2f2415]">Qui voit quoi ?</h3><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Espace</th>{Object.entries(ROLE_LABELS).map(([key, label]) => <th key={key} className="py-2 px-3">{label}</th>)}</tr></thead><tbody>{MODULES.map(([key, label]) => <tr key={key} className="border-b border-[#f0e5d0]"><td className="py-2 px-3 font-bold text-[#2f2415]">{label}</td>{Object.keys(ROLE_LABELS).map((roleKey) => <td key={roleKey} className="py-2 px-3">{has(ROLE_PERMISSIONS[roleKey] || [], key) ? <Eye size={16} className="text-emerald-600" /> : <EyeOff size={16} className="text-[#c0aa84]" />}</td>)}</tr>)}</tbody></table></div></div> : null}

    <DangerResetSection wipeBusy={wipeBusy} wipeProgress={wipeProgress} onWipe={wipeData} />
  </div>;
}
