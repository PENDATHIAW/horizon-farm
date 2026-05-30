import { makeId } from './ids';

const today = () => new Date().toISOString().slice(0, 10);
const clean = (value = '') => String(value || '').trim();

export function buildImpactImprovementTask({ indicator = 'Indicateur impact', module = 'impact_business', entityId = '', reason = '', priority = 'moyenne', date = today() } = {}) {
  const label = clean(indicator) || 'Indicateur impact';
  const key = `impact-action:${module}:${entityId || label}`;
  return {
    id: makeId('TSK'),
    title: `Améliorer impact · ${label}`,
    module_lie: module,
    source_module: 'impact_business',
    source_record_id: entityId || key,
    related_id: entityId || '',
    task_dedupe_key: key,
    due_date: date,
    priority,
    status: 'a_faire',
    checklist: 'Vérifier la donnée source; Corriger ou compléter; Ajouter une preuve si nécessaire',
    notes: reason || 'Action créée depuis Impact & Valeur.',
  };
}

export function buildImpactMissingProofWorkflow({ module = 'impact_business', entityId = '', title = 'Preuve à compléter', amount = 0, reason = '', date = today() } = {}) {
  const label = clean(title) || 'Preuve à compléter';
  const key = `impact-proof:${module}:${entityId || label}`;
  const documentId = makeId('DOC');
  const taskId = makeId('TSK');
  return {
    document: {
      id: documentId,
      title: label,
      document_category: 'preuve_impact',
      module_source: module,
      entity_type: module,
      entity_id: entityId || key,
      related_id: entityId || '',
      montant: Number(amount || 0) || 0,
      date,
      status: 'manquant',
      verification_status: 'preuve_manquante',
      notes: reason || 'Preuve demandée depuis Impact & Valeur.',
    },
    task: {
      id: taskId,
      title: `Ajouter preuve · ${label}`,
      module_lie: 'documents',
      source_module: 'impact_business',
      source_record_id: documentId,
      related_id: documentId,
      task_dedupe_key: key,
      due_date: date,
      priority: Number(amount || 0) >= 100000 ? 'haute' : 'moyenne',
      status: 'a_faire',
      checklist: 'Retrouver facture/photo/reçu; Joindre le fichier ou le lien; Marquer la preuve vérifiée',
      notes: reason || 'Preuve nécessaire pour renforcer le dossier financeur.',
    },
    event: {
      id: makeId('EVT'),
      event_type: 'preuve_impact_demandee',
      module_source: 'impact_business',
      entity_type: module,
      entity_id: entityId || documentId,
      title: `Preuve impact demandée · ${label}`,
      description: reason || 'Preuve manquante détectée dans Impact & Valeur.',
      event_date: date,
      severity: Number(amount || 0) >= 100000 ? 'warning' : 'info',
      linked_document_id: documentId,
      linked_task_id: taskId,
      amount: Number(amount || 0) || 0,
      saisies_evitees: 2,
    },
  };
}

export function buildImpactRiskFollowUp({ riskTitle = 'Risque impact', module = 'impact_business', entityId = '', severity = 'warning', date = today() } = {}) {
  const label = clean(riskTitle) || 'Risque impact';
  const key = `impact-risk:${module}:${entityId || label}`;
  const taskId = makeId('TSK');
  const alertId = makeId('ALT');
  const priority = severity === 'critique' || severity === 'critical' ? 'critique' : 'haute';
  return {
    task: {
      id: taskId,
      title: `Traiter risque impact · ${label}`,
      module_lie: module,
      source_module: 'impact_business',
      source_record_id: entityId || key,
      related_id: entityId || '',
      task_dedupe_key: key,
      due_date: date,
      priority,
      status: 'a_faire',
      checklist: 'Ouvrir la source; Décider action terrain; Clôturer après correction',
      notes: 'Risque détecté dans Impact & Valeur.',
    },
    alert: {
      id: alertId,
      title: `Risque impact · ${label}`,
      message: 'Impact & Valeur signale un risque à traiter.',
      module_source: module,
      entity_type: module,
      entity_id: entityId || key,
      alert_dedupe_key: key,
      severity,
      status: 'nouvelle',
      action_recommandee: 'Créer ou exécuter l’action terrain liée.',
      linked_task_id: taskId,
    },
    event: {
      id: makeId('EVT'),
      event_type: 'risque_impact_signale',
      module_source: 'impact_business',
      entity_type: module,
      entity_id: entityId || key,
      title: `Risque impact signalé · ${label}`,
      description: 'Alerte et tâche créées depuis Impact & Valeur.',
      event_date: date,
      severity,
      linked_task_id: taskId,
      linked_alert_id: alertId,
      saisies_evitees: 2,
    },
  };
}
