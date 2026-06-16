import { getRhDirectory, getResponsibleOptions, RH_MODULES } from './rhDirectory';
import { normalizeTaskChecklist } from './taskWorkflows';

const today = () => new Date().toISOString().slice(0, 10);
const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();

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

export const TASK_TITLE_TEMPLATES = [
  { value: 'avicole_ramassage_oeufs', module: 'avicole', label: 'Avicole · Ramasser et compter les œufs', title: 'Ramasser et compter les œufs' },
  { value: 'avicole_mortalite', module: 'avicole', label: 'Avicole · Vérifier mortalité', title: 'Vérifier mortalité avicole' },
  { value: 'avicole_eau_aliment', module: 'avicole', label: 'Avicole · Vérifier eau et aliment', title: 'Vérifier eau et aliment volailles' },
  { value: 'animaux_tour_sante', module: 'animaux', label: 'Animaux · Tour santé', title: 'Faire le tour santé des animaux' },
  { value: 'animaux_pesee', module: 'animaux', label: 'Animaux · Pesée / croissance', title: 'Peser ou contrôler la croissance' },
  { value: 'sante_vaccin', module: 'sante', label: 'Santé · Vaccin / soin', title: 'Réaliser vaccin ou soin prévu' },
  { value: 'stock_inventaire', module: 'stock', label: 'Stock · Inventaire rapide', title: 'Faire un inventaire rapide du stock' },
  { value: 'stock_commande_aliment', module: 'stock', label: 'Stock · Commander aliment', title: 'Commander aliment ou intrant' },
  { value: 'ventes_relance', module: 'ventes', label: 'Ventes · Relancer client', title: 'Relancer client à encaisser' },
  { value: 'ventes_livraison', module: 'ventes', label: 'Ventes · Préparer livraison', title: 'Préparer livraison client' },
  { value: 'cultures_intrants', module: 'cultures', label: 'Cultures · Vérifier intrants', title: 'Vérifier intrants culture' },
  { value: 'equipements_maintenance', module: 'equipements', label: 'Équipements · Maintenance', title: 'Vérifier équipements critiques' },
  { value: 'biosecurite', module: 'sante', label: 'Ferme · Contrôle biosécurité', title: 'Contrôler biosécurité entrée ferme' },
  { value: 'libre', module: '', label: 'Nouvelle tâche libre', title: '' },
];

export const TASK_CHECKLIST_TEMPLATES = {
  avicole_ramassage_oeufs: ['Ramasser les œufs', 'Compter les œufs', 'Retirer œufs cassés', 'Nettoyer zone ponte', 'Saisir production'],
  avicole_mortalite: ['Compter les sujets', 'Noter morts/blessés', 'Isoler cas suspect', 'Nettoyer zone concernée', 'Informer responsable'],
  avicole_eau_aliment: ['Vérifier abreuvoirs', 'Vérifier mangeoires', 'Contrôler consommation', 'Contrôler stock aliment', 'Noter anomalie'],
  animaux_tour_sante: ['Observer appétit', 'Vérifier eau/aliment', 'Repérer toux/boiterie', 'Isoler animal suspect', 'Prévenir vétérinaire si besoin'],
  animaux_pesee: ['Préparer contention', 'Peser animal', 'Noter poids', 'Comparer objectif', 'Signaler retard croissance'],
  sante_vaccin: ['Identifier cible', 'Vérifier produit/dose', 'Administrer soin', 'Noter date', 'Joindre la preuve si elle manque'],
  stock_inventaire: ['Compter quantité disponible', 'Comparer seuil', 'Repérer produits expirés', 'Mettre à jour stock', 'Déclencher commande si besoin'],
  stock_commande_aliment: ['Vérifier besoin', 'Contacter fournisseur', 'Comparer prix', 'Confirmer livraison', 'Enregistrer l’achat avec sa preuve'],
  ventes_relance: ['Identifier client', 'Appeler client', 'Noter promesse paiement', 'Fixer date encaissement', 'Mettre à jour vente'],
  ventes_livraison: ['Vérifier commande', 'Préparer quantité', 'Vérifier facture/reçu', 'Confirmer client', 'Marquer livrée'],
  cultures_intrants: ['Vérifier semences/engrais', 'Comparer seuil', 'Contrôler météo', 'Planifier application', 'Saisir utilisation'],
  equipements_maintenance: ['Vérifier état', 'Nettoyer', 'Tester fonctionnement', 'Noter panne', 'Joindre la preuve si réparation payée'],
  biosecurite: ['Vérifier pédiluve', 'Contrôler lavage mains', 'Limiter visiteurs', 'Vérifier tenues propres', 'Noter anomalie'],
};

const titleTemplate = (key) => TASK_TITLE_TEMPLATES.find((item) => item.value === key);
const checklistText = (key) => arr(TASK_CHECKLIST_TEMPLATES[key]).join('\n');

import { resolveEntityLinkedFields } from '../components/EntityLinkedSelect.jsx';

export function taskFields(context = {}) {
  const directory = getRhDirectory();
  const people = arr(directory.people).filter((person) => String(person.statut || 'actif').toLowerCase() === 'actif');
  const assignees = people.length
    ? people.map((person) => ({ value: person.id, label: `${person.nom || person.id} · ${person.role || 'Équipe'}` }))
    : getResponsibleOptions('taches');
  return [
    { key: 'id', label: 'ID', type: 'text', required: true },
    { key: 'module_lie', label: 'Module lié', type: 'select', clearOnChange: ['entity_id', 'related_id'], options: RH_MODULES.map((module) => ({ value: module.key, label: module.label })) },
    { key: 'entity_linked', label: 'Fiche liée (lot, animal, culture…)', type: 'entity_linked', fullWidth: true, context },
    { key: 'title_template', label: 'Modèle de tâche', type: 'select', options: TASK_TITLE_TEMPLATES.map(({ value, label }) => ({ value, label })), emptyLabel: 'Choisir un modèle ou tâche libre' },
    { key: 'title', label: 'Titre libre ou ajusté', type: 'text', required: true },
    { key: 'assigned_to', label: 'Responsable', type: 'select', options: assignees, emptyLabel: 'Aucun responsable RH actif' },
    { key: 'due_date', label: 'Échéance', type: 'date' },
    { key: 'due_time', label: 'Heure', type: 'time' },
    { key: 'frequency', label: 'Fréquence', type: 'select', options: [
      { value: 'ponctuelle', label: 'Ponctuelle' },
      { value: 'quotidienne', label: 'Quotidienne' },
      { value: 'hebdomadaire', label: 'Hebdomadaire' },
      { value: 'mensuelle', label: 'Mensuelle' },
    ] },
    { key: 'priority', label: 'Priorité', type: 'select', options: TASK_PRIORITIES },
    { key: 'status', label: 'Statut', type: 'select', options: TASK_STATUSES },
    { key: 'related_id', label: 'ID fiche liée (manuel)', type: 'text', showWhen: (form) => !form.entity_id },
    { key: 'checklist', label: 'Checklist automatique ou ajustée', type: 'textarea', fullWidth: true, rows: 5 },
    { key: 'notes', label: 'Notes', type: 'textarea', fullWidth: true, rows: 3 },
  ];
}

export function taskInitialValues(rows = []) {
  return { status: 'a_faire', priority: 'normale', due_date: today(), due_time: '08:00', frequency: 'ponctuelle', title_template: '' };
}

export function normalizeTaskPayload(payload = {}) {
  const template = titleTemplate(payload.title_template);
  const checklist = clean(payload.checklist) || checklistText(payload.title_template);
  const title = clean(payload.title) || template?.title || 'Nouvelle tâche';
  const normalizedChecklist = normalizeTaskChecklist(checklist, title).join('\n');
  return resolveEntityLinkedFields({
    ...payload,
    title,
    module_lie: payload.module_lie || template?.module || 'taches',
    due_date: payload.due_date || today(),
    due_time: payload.due_time || '',
    frequency: payload.frequency || 'ponctuelle',
    status: payload.status || 'a_faire',
    priority: payload.priority || 'normale',
    checklist: normalizedChecklist,
    source_module: payload.source_module || payload.module_lie || template?.module || 'taches',
  });
}
