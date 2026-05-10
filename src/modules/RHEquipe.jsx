import { Briefcase, Edit, Plus, RefreshCw, Save, Trash2, UserCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { getRhDirectory, getRoleFunctions, RH_MODULES, RH_ROLES, RH_TEAMS, saveRhDirectory } from '../utils/rhDirectory';

const today = () => new Date().toISOString().slice(0, 10);
const makeRhId = () => `RH-${Date.now().toString(36).toUpperCase()}`;
const activeStatuses = ['actif', 'active'];
const defaultPerson = () => ({
  id: makeRhId(),
  nom: '',
  role: 'Ouvrier ferme',
  custom_role: '',
  fonction: 'Ouvrier polyvalent',
  custom_function: '',
  access_level: 'employe',
  statut: 'actif',
  equipe_id: 'TEAM-FERME',
  modules: ['avicole'],
  phone: '',
  whatsapp: '',
  email: '',
  date_entree: today(),
  remuneration: '',
  notes: '',
});

const normalizeRole = (person = {}) => person.role === 'Nouveau rôle' ? (person.custom_role || person.role) : person.role;
const normalizeFunction = (person = {}) => person.fonction === 'Nouvelle fonction' ? (person.custom_function || person.fonction) : person.fonction;
const moduleLabel = (key) => RH_MODULES.find((item) => item.key === key)?.label || key;

export default function RHEquipe({ onRefresh }) {
  const [directory, setDirectory] = useState(() => getRhDirectory());
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState(defaultPerson());
  const people = directory.people || [];
  const teams = directory.teams || RH_TEAMS;
  const selected = people.find((person) => person.id === selectedId);
  const activePeople = people.filter((person) => activeStatuses.includes(String(person.statut || '').toLowerCase()));
  const owners = people.filter((person) => ['Propriétaire', 'Chef de projet', 'Admin principal'].includes(person.role) || person.access_level === 'admin_principal');
  const functionOptions = useMemo(() => getRoleFunctions(form.role), [form.role]);
  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  useEffect(() => {
    const sync = () => setDirectory(getRhDirectory());
    window.addEventListener('horizon-farm-rh-updated', sync);
    return () => window.removeEventListener('horizon-farm-rh-updated', sync);
  }, []);

  const resetForm = () => { setSelectedId(''); setForm(defaultPerson()); };
  const editPerson = (person) => {
    setSelectedId(person.id);
    const knownRole = RH_ROLES.includes(person.role) ? person.role : 'Nouveau rôle';
    const functions = getRoleFunctions(knownRole);
    const knownFunction = functions.includes(person.fonction) ? person.fonction : 'Nouvelle fonction';
    setForm({
      ...person,
      role: knownRole,
      custom_role: knownRole === 'Nouveau rôle' ? person.role : person.custom_role || '',
      fonction: knownFunction,
      custom_function: knownFunction === 'Nouvelle fonction' ? person.fonction : person.custom_function || '',
      modules: Array.isArray(person.modules) ? person.modules : [],
    });
  };
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const changeRole = (role) => {
    const nextFunctions = getRoleFunctions(role);
    setForm((prev) => ({ ...prev, role, fonction: nextFunctions[0] || '', custom_function: '', custom_role: role === 'Nouveau rôle' ? prev.custom_role : '' }));
  };
  const toggleModule = (key) => setForm((prev) => {
    const current = Array.isArray(prev.modules) ? prev.modules : [];
    return { ...prev, modules: current.includes(key) ? current.filter((item) => item !== key) : [...current, key] };
  });

  const savePerson = () => {
    if (!String(form.nom || '').trim()) return toast.error('Nom obligatoire');
    if (form.role === 'Nouveau rôle' && !String(form.custom_role || '').trim()) return toast.error('Nom du nouveau rôle obligatoire');
    if (form.fonction === 'Nouvelle fonction' && !String(form.custom_function || '').trim()) return toast.error('Nouvelle fonction obligatoire');
    const payload = {
      ...form,
      role: normalizeRole(form),
      fonction: normalizeFunction(form),
      modules: Array.isArray(form.modules) ? form.modules : [],
      updated_at: new Date().toISOString(),
    };
    const exists = people.some((person) => person.id === payload.id);
    const nextPeople = exists ? people.map((person) => person.id === payload.id ? payload : person) : [...people, { ...payload, created_at: new Date().toISOString() }];
    const next = saveRhDirectory({ ...directory, people: nextPeople, teams });
    setDirectory(next);
    setSelectedId(payload.id);
    editPerson(payload);
    toast.success(exists ? 'Fiche RH mise à jour' : 'Personne ajoutée');
  };

  const deletePerson = (person) => {
    if (person.id === 'RH-PENDA') return toast.error('Le propriétaire principal ne peut pas être supprimé');
    if (!window.confirm(`Supprimer ${person.nom || person.id} ?`)) return;
    const next = saveRhDirectory({ ...directory, people: people.filter((item) => item.id !== person.id), teams });
    setDirectory(next);
    resetForm();
    toast.success('Personne supprimée');
  };

  const refresh = async () => {
    setDirectory(getRhDirectory());
    await onRefresh?.();
    toast.success('RH actualisé');
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="RH & Équipe" sub="Personnes, équipes, responsabilités et référentiel des responsables ERP" actions={<><Btn icon={RefreshCw} variant="outline" small onClick={refresh}>Actualiser</Btn><Btn icon={Plus} small onClick={resetForm}>Nouvelle personne</Btn></>} />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Personnes" value={people.length} />
        <KpiCard icon={UserCheck} label="Actifs" value={activePeople.length} />
        <KpiCard icon={Briefcase} label="Équipes" value={teams.length} />
        <KpiCard icon={UserCheck} label="Direction" value={owners.length} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-[#d6c3a0] rounded-2xl p-5">
          <h3 className="font-black text-[#2f2415] mb-3">Répertoire équipe</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {people.map((person) => (
              <div key={person.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#2f2415]">{person.nom || person.id}</p>
                    <p className="text-xs text-[#8a7456]">{person.role} · {person.fonction || 'fonction à préciser'}</p>
                    <p className="text-xs text-[#8a7456] mt-1">{teamById.get(person.equipe_id)?.name || person.equipe_id || 'Sans équipe'} · {person.statut || 'actif'}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" title="Modifier" className="text-[#8a7456] hover:text-[#2f2415]" onClick={() => editPerson(person)}><Edit size={16} /></button>
                    <button type="button" title="Supprimer" className="text-red-600 hover:text-red-800" onClick={() => deletePerson(person)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-xs text-[#8a7456] mt-2">Modules : {(person.modules || []).map(moduleLabel).join(', ') || 'Aucun module autorisé'}</p>
                <p className="text-xs text-[#8a7456] mt-1">WhatsApp : {person.whatsapp || person.phone || 'non renseigné'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-3">
          <h3 className="font-black text-[#2f2415]">{selected ? 'Modifier personne' : 'Nouvelle personne'}</h3>
          <Field label="Nom" value={form.nom || ''} onChange={(value) => set('nom', value)} />
          <label className="block text-sm"><span className="text-[#8a7456]">Rôle</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={form.role || ''} onChange={(e) => changeRole(e.target.value)}>{RH_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
          {form.role === 'Nouveau rôle' ? <Field label="Nom du nouveau rôle" value={form.custom_role || ''} onChange={(value) => set('custom_role', value)} /> : null}
          <label className="block text-sm"><span className="text-[#8a7456]">Fonction</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={form.fonction || ''} onChange={(e) => set('fonction', e.target.value)}>{functionOptions.map((fn) => <option key={fn} value={fn}>{fn}</option>)}</select></label>
          {form.fonction === 'Nouvelle fonction' ? <Field label="Nom de la nouvelle fonction" value={form.custom_function || ''} onChange={(value) => set('custom_function', value)} /> : null}
          <label className="block text-sm"><span className="text-[#8a7456]">Équipe</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={form.equipe_id || ''} onChange={(e) => set('equipe_id', e.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label className="block text-sm"><span className="text-[#8a7456]">Niveau d’accès</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={form.access_level || 'employe'} onChange={(e) => set('access_level', e.target.value)}><option value="admin_principal">Admin principal</option><option value="responsable">Responsable module</option><option value="employe">Employé</option><option value="prestataire">Prestataire</option></select></label>
          <label className="block text-sm"><span className="text-[#8a7456]">Statut</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={form.statut || 'actif'} onChange={(e) => set('statut', e.target.value)}><option value="actif">Actif</option><option value="inactif">Inactif</option><option value="suspendu">Suspendu</option></select></label>
          <Field label="Téléphone" value={form.phone || ''} onChange={(value) => set('phone', value)} />
          <Field label="WhatsApp" value={form.whatsapp || ''} onChange={(value) => set('whatsapp', value)} />
          <Field label="Email" value={form.email || ''} onChange={(value) => set('email', value)} />
          <Field label="Date entrée" type="date" value={form.date_entree || today()} onChange={(value) => set('date_entree', value)} />
          <div className="space-y-2">
            <p className="text-sm text-[#8a7456]">Modules autorisés</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-auto rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-2">
              {RH_MODULES.map((module) => {
                const checked = (form.modules || []).includes(module.key);
                return <label key={module.key} className="flex items-center gap-2 text-sm text-[#2f2415]"><input type="checkbox" checked={checked} onChange={() => toggleModule(module.key)} /> {module.label}</label>;
              })}
            </div>
          </div>
          <Field label="Rémunération" value={form.remuneration || ''} onChange={(value) => set('remuneration', value)} placeholder="Ex: fixe + prime assiduité + prime performance" />
          <label className="block text-sm"><span className="text-[#8a7456]">Notes</span><textarea className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 min-h-[80px]" value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} /></label>
          <Btn icon={Save} onClick={savePerson}>Enregistrer RH</Btn>
        </div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <h3 className="font-black text-[#2f2415] mb-3">Équipes opérationnelles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {teams.map((team) => <div key={team.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="font-bold text-[#2f2415]">{team.name}</p><p className="text-xs text-[#8a7456]">{team.type}</p><p className="text-xs text-[#8a7456] mt-1">Modules : {(team.modules || []).map(moduleLabel).join(', ')}</p></div>)}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return <label className="block text-sm"><span className="text-[#8a7456]">{label}</span><input type={type} className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}
