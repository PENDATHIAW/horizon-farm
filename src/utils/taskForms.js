import { getRhDirectory, getResponsibleOptions, RH_MODULES } from './rhDirectory';

const today = () => new Date().toISOString().slice(0, 10);
const arr = (value) => Array.isArray(value) ? value : [];

export const TASK_STATUSES = [
  { value: 'a_faire', label: 'À faire' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'termine', label: 'Terminée' },
  { value: 'retard', label: 'En retard' },
  { value: 'annule', label: 'Annulée' },
];

export const TASK_PRIORITIES = [
  { value: 'basse', label: 'Basse' },
  { value: 'normale', label: 'Normale' },
  { value: 'moyenne', label: 'Moyenne' },
  { value: 'haute', label: 'Haute' },
  { value: 'critique', label: 'Critique' },
];

export function taskFields() {
  const directory = getRhDirectory();
  const people = arr(directory.people).filter((person) => String(person.statut || 'actif').toLowerCase() === 'actif');
  const assignees = people.length
    ? people.map((person) => ({ value: person.id, label: `${person.nom || person.id} · ${person.role || 'Équipe'}` }))
    : getResponsibleOptions('taches');
  return [
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'title', label: 'Titre', type: 'text', required: true },
    { key: 'module_lie', label: 'Module lié', type: 'select', options: RH_MODULES.map((module) => ({ value: module.key, label: module.label })) },
    { key: 'assigned_to', label: 'Responsable', type: 'select', options: assignees, emptyLabel: 'Aucun responsable RH actif' },
    { key: 'due_date', label: 'Échéance', type: 'date' },
    { key: 'priority', label: 'Priorité', type: 'select', options: TASK_PRIORITIES },
    { key: 'status', label: 'Statut', type: 'select', options: TASK_STATUSES },
    { key: 'related_id', label: 'ID fiche liée', type: 'text' },
    { key: 'checklist', label: 'Checklist', type: 'textarea', fullWidth: true, rows: 3 },
    { key: 'notes', label: 'Notes', type: 'textarea', fullWidth: true, rows: 3 },
  ];
}

export function taskInitialValues(rows = []) {
  return { status: 'a_faire', priority: 'normale', due_date: today() };
}

export function normalizeTaskPayload(payload = {}) {
  return {
    ...payload,
    due_date: payload.due_date || today(),
    status: payload.status || 'a_faire',
    priority: payload.priority || 'normale',
    source_module: payload.source_module || payload.module_lie || 'taches',
  };
}
