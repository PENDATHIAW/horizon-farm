import { makeId } from './ids.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();

const restrictedFields = new Set([
  'salaire',
  'salaire_mensuel',
  'prime',
  'prime_mensuelle',
  'avance',
  'avance_mois',
  'remuneration',
  'medical_notes',
  'donnees_medicales',
  'attendance',
  'pointage',
  'heures_presence',
]);

export function sanitizeTeamMember(member = {}) {
  return Object.fromEntries(Object.entries(member).filter(([key]) => !restrictedFields.has(key)));
}

export function normalizeTeamDirectory(directory = {}) {
  return {
    people: arr(directory.people).map(sanitizeTeamMember),
    teams: arr(directory.teams),
    absences: arr(directory.absences),
    updated_at: directory.updated_at || new Date().toISOString(),
  };
}

export function buildMemberRecord(payload = {}) {
  const name = clean(payload.nom || payload.name);
  if (!name) return { ok: false, error: 'Nom du membre obligatoire.' };
  if (!clean(payload.role)) return { ok: false, error: 'Rôle opérationnel obligatoire.' };
  return {
    ok: true,
    record: sanitizeTeamMember({
      id: clean(payload.id) || makeId('EMP'),
      nom: name,
      fonction: clean(payload.fonction),
      role: clean(payload.role),
      equipe_id: clean(payload.equipe_id),
      statut: clean(payload.statut) || 'actif',
      phone: clean(payload.phone),
      email: clean(payload.email),
      user_id: clean(payload.user_id),
      modules: arr(payload.modules),
      date_entree: payload.date_entree || new Date().toISOString().slice(0, 10),
    }),
  };
}

export function buildAbsenceSignal({ payload = {}, people = [], tasks = [], date = new Date().toISOString().slice(0, 10) } = {}) {
  const member = arr(people).find((row) => String(row.id) === String(payload.member_id));
  if (!member) return { ok: false, error: 'Membre obligatoire.' };
  if (!payload.start_date || !payload.end_date) return { ok: false, error: 'Dates de début et de fin obligatoires.' };
  if (String(payload.end_date) < String(payload.start_date)) return { ok: false, error: 'La date de fin doit suivre la date de début.' };

  const affectedTasks = arr(tasks).filter((task) => {
    const status = String(task.status || task.statut || '').toLowerCase();
    return String(task.assigned_to || task.responsable_id || '') === String(member.id)
      && !['termine', 'terminé', 'done', 'closed', 'annule', 'annulé'].includes(status);
  });
  const absenceId = clean(payload.id) || makeId('ABS');
  const absence = {
    id: absenceId,
    member_id: member.id,
    start_date: payload.start_date,
    end_date: payload.end_date,
    reason: clean(payload.reason),
    status: 'signalee',
    affected_task_ids: affectedTasks.map((task) => task.id),
    created_at: new Date().toISOString(),
  };

  return {
    ok: true,
    absence,
    affectedTasks,
    taskPatches: [],
    alert: affectedTasks.length ? {
      id: makeId('ALT'),
      title: `Absence signalée · ${member.nom || member.name || member.id}`,
      message: `${affectedTasks.length} tâche(s) concernée(s), sans réaffectation automatique.`,
      module_source: 'equipe',
      entity_type: 'membre',
      entity_id: member.id,
      severity: 'warning',
      status: 'nouvelle',
      affected_task_ids: affectedTasks.map((task) => task.id),
      alert_dedupe_key: `team-absence:${absenceId}`,
    } : null,
    event: {
      id: makeId('EVT'),
      event_type: 'absence_equipe_signalee',
      module_source: 'equipe',
      entity_type: 'membre',
      entity_id: member.id,
      title: `Absence · ${member.nom || member.name || member.id}`,
      description: `${payload.start_date} au ${payload.end_date} · ${affectedTasks.length} tâche(s) concernée(s)`,
      event_date: date,
      severity: affectedTasks.length ? 'warning' : 'info',
    },
  };
}
