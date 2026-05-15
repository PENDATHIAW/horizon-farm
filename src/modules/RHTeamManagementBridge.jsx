import { Edit, Plus, Save, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { getRhDirectory, RH_MODULES, RH_TEAMS, saveRhDirectory } from '../utils/rhDirectory';

const makeTeamId = () => `TEAM-${Date.now().toString(36).toUpperCase()}`;
const defaultTeam = () => ({ id: makeTeamId(), name: '', type: 'operationnelle', modules: ['avicole'] });
const moduleLabel = (key) => RH_MODULES.find((item) => item.key === key)?.label || key;
const trim = (value) => String(value || '').trim();

export default function RHTeamManagementBridge() {
  const [directory, setDirectory] = useState(() => getRhDirectory());
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamForm, setTeamForm] = useState(defaultTeam());
  const people = directory.people || [];
  const teams = directory.teams || RH_TEAMS;
  const selectedTeam = teams.find((team) => team.id === selectedTeamId);

  useEffect(() => {
    const sync = () => setDirectory(getRhDirectory());
    window.addEventListener('horizon-farm-rh-updated', sync);
    return () => window.removeEventListener('horizon-farm-rh-updated', sync);
  }, []);

  const resetTeamForm = () => {
    setSelectedTeamId('');
    setTeamForm(defaultTeam());
  };
  const editTeam = (team) => {
    setSelectedTeamId(team.id);
    setTeamForm({ ...team, modules: Array.isArray(team.modules) ? team.modules : [] });
  };
  const set = (key, value) => setTeamForm((prev) => ({ ...prev, [key]: value }));
  const toggleModule = (key) => setTeamForm((prev) => {
    const current = Array.isArray(prev.modules) ? prev.modules : [];
    return { ...prev, modules: current.includes(key) ? current.filter((item) => item !== key) : [...current, key] };
  });
  const saveTeam = () => {
    if (!trim(teamForm.name)) return toast.error('Nom équipe obligatoire');
    const modules = Array.isArray(teamForm.modules) ? teamForm.modules : [];
    if (!modules.length) return toast.error('Choisis au moins un module pour cette équipe');
    const payload = { ...teamForm, name: trim(teamForm.name), type: teamForm.type || 'operationnelle', modules, updated_at: new Date().toISOString() };
    const exists = teams.some((team) => team.id === payload.id);
    const nextTeams = exists ? teams.map((team) => team.id === payload.id ? payload : team) : [...teams, { ...payload, created_at: new Date().toISOString() }];
    const next = saveRhDirectory({ ...directory, people, teams: nextTeams });
    setDirectory(next);
    setSelectedTeamId(payload.id);
    setTeamForm(payload);
    toast.success(exists ? 'Équipe mise à jour' : 'Équipe ajoutée');
  };
  const deleteTeam = (team) => {
    const assigned = people.filter((person) => person.equipe_id === team.id).length;
    if (assigned > 0) return toast.error('Impossible : des personnes sont affectées à cette équipe');
    if (!window.confirm(`Supprimer ${team.name || team.id} ?`)) return;
    const next = saveRhDirectory({ ...directory, people, teams: teams.filter((item) => item.id !== team.id) });
    setDirectory(next);
    resetTeamForm();
    toast.success('Équipe supprimée');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456]">Équipes</p>
            <h3 className="font-black text-[#2f2415]">Gestion des équipes opérationnelles</h3>
          </div>
          <Btn icon={Plus} variant="outline" small onClick={resetTeamForm}>Nouvelle équipe</Btn>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {teams.map((team) => {
            const assigned = people.filter((person) => person.equipe_id === team.id).length;
            return (
              <div key={team.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[#2f2415]">{team.name}</p>
                    <p className="text-xs text-[#8a7456]">{team.type} · {assigned} personne(s)</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" title="Modifier" className="text-[#8a7456] hover:text-[#2f2415]" onClick={() => editTeam(team)}><Edit size={16} /></button>
                    <button type="button" title="Supprimer" className="text-red-600 hover:text-red-800" onClick={() => deleteTeam(team)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-xs text-[#8a7456] mt-2">Modules : {(team.modules || []).map(moduleLabel).join(', ') || 'Aucun module'}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-3">
        <h3 className="font-black text-[#2f2415] flex items-center gap-2"><Users size={18} /> {selectedTeam ? 'Modifier équipe' : 'Nouvelle équipe'}</h3>
        <Field label="Nom équipe" value={teamForm.name || ''} onChange={(value) => set('name', value)} />
        <label className="block text-sm"><span className="text-[#8a7456]">Type</span><select className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={teamForm.type || 'operationnelle'} onChange={(e) => set('type', e.target.value)}><option value="operationnelle">Opérationnelle</option><option value="commerciale">Commerciale</option><option value="technique">Technique</option><option value="administrative">Administrative</option><option value="externe">Externe</option></select></label>
        <div className="space-y-2"><p className="text-sm text-[#8a7456]">Modules de l’équipe</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-auto rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-2">{RH_MODULES.map((module) => { const checked = (teamForm.modules || []).includes(module.key); return <label key={module.key} className="flex items-center gap-2 text-sm text-[#2f2415]"><input type="checkbox" checked={checked} onChange={() => toggleModule(module.key)} /> {module.label}</label>; })}</div></div>
        <Btn icon={Save} onClick={saveTeam}>Enregistrer équipe</Btn>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '' }) {
  return <label className="block text-sm"><span className="text-[#8a7456]">{label}</span><input type={type} className="mt-1 w-full rounded-lg border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}
