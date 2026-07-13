import { CalendarOff, Link2, Plus, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { ERP_ROLES } from '../config/moduleTabs/shared.js';
import { resolveRhTab } from '../utils/commercialNavigation.js';
import { DEFAULT_FARM_ID } from '../utils/farmScope.js';
import { getRhDirectory, loadRhDirectoryFromCloud, saveRhDirectoryToCloud } from '../utils/rhDirectory.js';
import { buildAbsenceSignal, buildMemberRecord, normalizeTeamDirectory } from '../utils/teamDirectory.js';

const ROLE_LABELS = {
  promotrice_direction: 'Direction',
  responsable_filiere: 'Responsable de filière',
  terrain: 'Équipe terrain',
  finance: 'Finance',
  veterinaire: 'Vétérinaire',
  maintenance: 'Maintenance',
  financeur_externe: 'Financeur externe',
  admin_support: 'Administration et support',
};
const today = () => new Date().toISOString().slice(0, 10);
const emptyMember = () => ({ nom: '', role: 'terrain', fonction: '', equipe_id: '', user_id: '', statut: 'actif' });
const emptyAbsence = () => ({ member_id: '', start_date: today(), end_date: today(), reason: '' });

function Panel({ title, subtitle, children, action = null }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><h2 className="font-semibold text-earth">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-slate">{subtitle}</p> : null}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value }) {
  return <div className="border-l-4 border-leaf bg-card px-4 py-3"><p className="text-xs font-semibold text-slate">{label}</p><p className="mt-1 text-xl font-semibold text-earth">{value}</p></div>;
}

export default function EquipeV1Module(props) {
  const controlled = Boolean(props.onTabChange);
  const onTabChange = props.onTabChange;
  const [tab, setInternalTab] = useState(() => resolveRhTab(props.initialTab || 'Vue d’ensemble'));
  const activeTab = controlled ? resolveRhTab(props.initialTab || 'Vue d’ensemble') : tab;
  const farmId = String(props.activeFarm?.id || props.farmId || DEFAULT_FARM_ID);
  const [directory, setDirectory] = useState(() => normalizeTeamDirectory(getRhDirectory({ farmId })));
  const [loading, setLoading] = useState(true);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [absenceForm, setAbsenceForm] = useState(emptyAbsence);

  useEffect(() => {
    let mounted = true;
    loadRhDirectoryFromCloud({ farmId }).then((value) => {
      if (mounted) setDirectory(normalizeTeamDirectory(value));
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [farmId]);

  const setTab = useCallback((value) => {
    const resolved = resolveRhTab(value);
    if (controlled) onTabChange?.(value || resolved);
    else setInternalTab(resolved);
  }, [controlled, onTabChange]);

  const persist = async (next) => {
    const normalized = normalizeTeamDirectory(next);
    setDirectory(normalized);
    const saved = await saveRhDirectoryToCloud(normalized, { farmId });
    setDirectory(normalizeTeamDirectory(saved));
  };

  const activeMembers = directory.people.filter((member) => String(member.statut || 'actif').toLowerCase() === 'actif');
  const memberById = useMemo(() => new Map(directory.people.map((member) => [String(member.id), member])), [directory.people]);
  const openTasks = (props.tasks || []).filter((task) => !['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'].includes(String(task.status || task.statut || '').toLowerCase()));
  const unassignedTasks = openTasks.filter((task) => !task.assigned_to && !task.responsable_id && !task.responsable);

  const addMember = async (event) => {
    event.preventDefault();
    const result = buildMemberRecord(memberForm);
    if (!result.ok) return toast.error(result.error);
    try {
      await persist({ ...directory, people: [...directory.people, result.record] });
      setMemberForm(emptyMember());
      setShowMemberForm(false);
      await props.onCreateBusinessEvent?.({ event_type: 'membre_equipe_ajoute', module_source: 'equipe', entity_type: 'membre', entity_id: result.record.id, title: `Membre ajouté · ${result.record.nom}`, event_date: today(), severity: 'info' });
      toast.success('Membre ajouté');
    } catch (error) {
      toast.error(error?.message || 'Enregistrement impossible');
    }
  };

  const updateMember = async (memberId, patch) => {
    await persist({ ...directory, people: directory.people.map((member) => member.id === memberId ? { ...member, ...patch } : member) });
    toast.success('Affectation mise à jour');
  };

  const addAbsence = async (event) => {
    event.preventDefault();
    const signal = buildAbsenceSignal({ payload: absenceForm, people: directory.people, tasks: props.tasks || [] });
    if (!signal.ok) return toast.error(signal.error);
    try {
      await persist({ ...directory, absences: [signal.absence, ...directory.absences] });
      if (signal.alert) await props.onCreateAlert?.(signal.alert);
      await props.onCreateBusinessEvent?.(signal.event);
      await Promise.allSettled([props.onRefreshAlertes?.(), props.onRefreshBusinessEvents?.()]);
      setAbsenceForm(emptyAbsence());
      toast.success(signal.affectedTasks.length ? `${signal.affectedTasks.length} tâche(s) signalée(s), sans réaffectation` : 'Absence enregistrée');
    } catch (error) {
      toast.error(error?.message || 'Enregistrement impossible');
    }
  };

  const overview = (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Membres actifs" value={activeMembers.length} />
        <Stat label="Équipes" value={directory.teams.length} />
        <Stat label="Absences signalées" value={directory.absences.length} />
        <Stat label="Tâches sans ressource" value={unassignedTasks.length} />
      </div>
      <Panel title="Organisation opérationnelle" subtitle="Les employés et les comptes utilisateurs restent deux objets distincts.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {directory.teams.map((team) => {
            const count = activeMembers.filter((member) => member.equipe_id === team.id).length;
            return <div key={team.id} className="border-l-4 border-horizon bg-card p-4"><p className="font-semibold text-earth">{team.name}</p><p className="mt-1 text-sm text-slate">{count} membre(s) · {(team.modules || []).join(', ') || 'Périmètre à définir'}</p></div>;
          })}
        </div>
      </Panel>
      {unassignedTasks.length ? <Panel title="Tâche sans ressource" subtitle="Ces tâches restent ouvertes jusqu’à une affectation explicite."><p className="text-sm font-semibold text-horizon-dark">{unassignedTasks.length} tâche(s) ouverte(s) sans responsable. Aucune réaffectation automatique n’a été faite.</p></Panel> : null}
    </div>
  );

  const members = (
    <Panel title="Membres" subtitle="Le rôle opérationnel appartient à la fiche employé. Le compte utilisateur lié reste optionnel." action={<button type="button" onClick={() => setShowMemberForm((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-leaf px-3 py-2 text-sm font-semibold text-earth"><Plus size={16} /> Ajouter</button>}>
      {showMemberForm ? (
        <form onSubmit={addMember} className="mb-6 grid gap-3 border-b border-line pb-6 md:grid-cols-2 xl:grid-cols-3">
          <label className="text-sm font-semibold text-slate">Nom<input required value={memberForm.nom} onChange={(event) => setMemberForm((value) => ({ ...value, nom: event.target.value }))} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
          <label className="text-sm font-semibold text-slate">Rôle opérationnel<select required value={memberForm.role} onChange={(event) => setMemberForm((value) => ({ ...value, role: event.target.value }))} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-normal">{ERP_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate">Fonction<input value={memberForm.fonction} onChange={(event) => setMemberForm((value) => ({ ...value, fonction: event.target.value }))} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
          <label className="text-sm font-semibold text-slate">Équipe<select value={memberForm.equipe_id} onChange={(event) => setMemberForm((value) => ({ ...value, equipe_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-normal"><option value="">Non affecté</option>{directory.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate">Compte utilisateur lié<input value={memberForm.user_id} onChange={(event) => setMemberForm((value) => ({ ...value, user_id: event.target.value }))} placeholder="Identifiant optionnel" className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
          <div className="flex items-end"><button type="submit" className="w-full rounded-lg bg-earth px-4 py-2 font-semibold text-white">Enregistrer</button></div>
        </form>
      ) : null}
      <div className="divide-y divide-line">
        {directory.people.map((member) => <div key={member.id} className="grid gap-2 py-3 md:grid-cols-[1fr_1fr_auto] md:items-center"><div><p className="font-semibold text-earth">{member.nom || member.name || member.id}</p><p className="text-xs text-slate">{member.fonction || ROLE_LABELS[member.role] || member.role || 'Fonction non renseignée'}</p></div><p className="text-sm text-slate"><Link2 size={14} className="mr-1 inline" />{member.user_id ? 'Compte utilisateur lié' : 'Aucun compte utilisateur lié'}</p><span className="text-xs font-semibold text-slate">{member.statut || 'actif'}</span></div>)}
        {!directory.people.length ? <p className="py-6 text-sm text-slate">Aucun membre enregistré.</p> : null}
      </div>
    </Panel>
  );

  const assignments = (
    <Panel title="Affectations" subtitle="Toute modification est explicite; aucune absence ne change ces valeurs.">
      <div className="space-y-3">
        {directory.people.map((member) => <div key={member.id} className="grid gap-3 border-b border-line pb-3 md:grid-cols-[1fr_1fr_1fr]"><div><p className="font-semibold text-earth">{member.nom || member.id}</p><p className="text-xs text-slate">{member.fonction || 'Fonction non renseignée'}</p></div><label className="text-xs font-semibold text-slate">Rôle<select value={ERP_ROLES.includes(member.role) ? member.role : 'terrain'} onChange={(event) => updateMember(member.id, { role: event.target.value })} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal">{ERP_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label><label className="text-xs font-semibold text-slate">Équipe<select value={member.equipe_id || ''} onChange={(event) => updateMember(member.id, { equipe_id: event.target.value })} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal"><option value="">Non affecté</option>{directory.teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label></div>)}
      </div>
    </Panel>
  );

  const absences = (
    <div className="space-y-6">
      <Panel title="Signaler une absence" subtitle="Les tâches concernées sont signalées mais jamais réaffectées automatiquement.">
        <form onSubmit={addAbsence} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm font-semibold text-slate xl:col-span-2">Membre<select required value={absenceForm.member_id} onChange={(event) => setAbsenceForm((value) => ({ ...value, member_id: event.target.value }))} className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-normal"><option value="">Choisir</option>{activeMembers.map((member) => <option key={member.id} value={member.id}>{member.nom || member.id}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate">Début<input required type="date" value={absenceForm.start_date} onChange={(event) => setAbsenceForm((value) => ({ ...value, start_date: event.target.value }))} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
          <label className="text-sm font-semibold text-slate">Fin<input required type="date" value={absenceForm.end_date} onChange={(event) => setAbsenceForm((value) => ({ ...value, end_date: event.target.value }))} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
          <div className="flex items-end"><button type="submit" className="w-full rounded-lg bg-earth px-4 py-2 font-semibold text-white">Signaler</button></div>
          <label className="text-sm font-semibold text-slate md:col-span-2 xl:col-span-5">Motif opérationnel<textarea value={absenceForm.reason} onChange={(event) => setAbsenceForm((value) => ({ ...value, reason: event.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-line px-3 py-2 font-normal" /></label>
        </form>
      </Panel>
      <Panel title="Absences enregistrées">
        <div className="divide-y divide-line">{directory.absences.map((absence) => { const member = memberById.get(String(absence.member_id)); return <div key={absence.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto]"><div><p className="font-semibold text-earth">{member?.nom || absence.member_id}</p><p className="text-sm text-slate">{absence.start_date} au {absence.end_date} · {absence.reason || 'Motif non renseigné'}</p></div><span className="text-xs font-semibold text-horizon-dark">{(absence.affected_task_ids || []).length} tâche(s) signalée(s)</span></div>; })}{!directory.absences.length ? <p className="py-6 text-sm text-slate">Aucune absence enregistrée.</p> : null}</div>
      </Panel>
    </div>
  );

  const content = activeTab === 'TeamMembersView' ? members : activeTab === 'TeamAssignmentsView' ? assignments : activeTab === 'TeamAbsencesView' ? absences : overview;

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-line bg-white p-6 shadow-card">
        <div className="flex items-center gap-3"><Users className="text-horizon-dark" size={24} /><div><p className="text-xs font-semibold uppercase text-horizon-dark">Organisation</p><h1 className="text-2xl font-semibold text-earth">Équipe</h1><p className="text-sm text-slate">Membres, rôles, affectations et absences opérationnelles.</p></div></div>
      </header>
      <ModuleTabsBar moduleId="equipe" active={activeTab} onChange={setTab} tabBadges={{ absences: directory.absences.length }} />
      {loading ? <div className="p-6 text-center text-sm text-slate"><CalendarOff size={18} className="mr-2 inline" />Chargement de l’équipe...</div> : content}
    </div>
  );
}
