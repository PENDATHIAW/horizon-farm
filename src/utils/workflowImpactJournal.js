
import { showWorkflowImpactToast } from './workflowImpactToast.js';
import { IMPACT_STATUS } from './workflowImpactConstants.js';

export { IMPACT_STATUS } from './workflowImpactConstants.js';

export const IMPACT_KEYS = {
  STOCK_UPDATED: 'stock_updated',
  STOCK_MOVEMENT: 'stock_movement',
  FINANCE: 'finance',
  DOCUMENT: 'document',
  TASK_ALERT: 'task_alert',
  BUSINESS_EVENT: 'business_event',
  ISSUE_KEY: 'issue_key',
};

export const IMPACT_LABELS = {
  [IMPACT_KEYS.STOCK_UPDATED]: 'Stock mis à jour',
  [IMPACT_KEYS.STOCK_MOVEMENT]: 'Mouvement stock créé',
  [IMPACT_KEYS.FINANCE]: 'Finance créée',
  [IMPACT_KEYS.DOCUMENT]: 'Document lié',
  [IMPACT_KEYS.TASK_ALERT]: 'Tâche/alerte créée',
  [IMPACT_KEYS.BUSINESS_EVENT]: 'Événement métier créé',
  [IMPACT_KEYS.ISSUE_KEY]: 'issue_key',
};

export const OPERATION_TYPES = {
  ACHAT_STOCK: 'achat_stock',
  VENTE: 'vente',
  PAIEMENT: 'paiement',
  ALIMENTATION: 'alimentation',
  SOIN_VACCIN: 'soin_vaccin',
  MORTALITE: 'mortalite',
  PRODUCTION_OEUFS: 'production_oeufs',
  RECOLTE: 'recolte',
  MAINTENANCE: 'maintenance',
  PAIE: 'paie',
  LIAISON_DOCUMENT: 'liaison_document',
};

const OPERATION_LABELS = {
  [OPERATION_TYPES.ACHAT_STOCK]: 'Achat stock',
  [OPERATION_TYPES.VENTE]: 'Vente',
  [OPERATION_TYPES.PAIEMENT]: 'Paiement',
  [OPERATION_TYPES.ALIMENTATION]: 'Alimentation',
  [OPERATION_TYPES.SOIN_VACCIN]: 'Soin / vaccin',
  [OPERATION_TYPES.MORTALITE]: 'Mortalité',
  [OPERATION_TYPES.PRODUCTION_OEUFS]: 'Production œufs',
  [OPERATION_TYPES.RECOLTE]: 'Récolte',
  [OPERATION_TYPES.MAINTENANCE]: 'Maintenance',
  [OPERATION_TYPES.PAIE]: 'Paie',
  [OPERATION_TYPES.LIAISON_DOCUMENT]: 'Liaison document',
};

const HANDLER_IMPACT_MAP = {
  onCreateOrUpdateStock: IMPACT_KEYS.STOCK_UPDATED,
  onCreateStock: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateStock: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateLot: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateAnimal: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateCulture: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateSourceAsset: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateHealth: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateEquipment: IMPACT_KEYS.STOCK_UPDATED,
  onUpdateStockMovement: IMPACT_KEYS.STOCK_MOVEMENT,
  onCreateFinanceTransaction: IMPACT_KEYS.FINANCE,
  onUpdateFinanceTransaction: IMPACT_KEYS.FINANCE,
  onCreatePayment: IMPACT_KEYS.FINANCE,
  onCreateInvoice: IMPACT_KEYS.DOCUMENT,
  onCreateDocument: IMPACT_KEYS.DOCUMENT,
  onCreate: IMPACT_KEYS.DOCUMENT,
  onCreateTask: IMPACT_KEYS.TASK_ALERT,
  onCreateAlert: IMPACT_KEYS.TASK_ALERT,
  onUpdateAlert: IMPACT_KEYS.TASK_ALERT,
  onCreateBusinessEvent: IMPACT_KEYS.BUSINESS_EVENT,
  onCreateTrace: IMPACT_KEYS.BUSINESS_EVENT,
  onCreateAlimentation: IMPACT_KEYS.STOCK_MOVEMENT,
};

const NA_REASONS = {
  [IMPACT_KEYS.STOCK_UPDATED]: 'Non applicable pour cette opération',
  [IMPACT_KEYS.STOCK_MOVEMENT]: 'Aucun mouvement stock requis',
  [IMPACT_KEYS.FINANCE]: 'Aucun montant à enregistrer en finance',
  [IMPACT_KEYS.DOCUMENT]: 'Aucun document requis',
  [IMPACT_KEYS.TASK_ALERT]: 'Aucune tâche ou alerte requise',
  [IMPACT_KEYS.BUSINESS_EVENT]: 'Traçabilité non requise',
  [IMPACT_KEYS.ISSUE_KEY]: 'Identifiant non généré',
};

const clean = (value) => String(value || '').trim();
const detailOf = (payload) => {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  return clean(payload.id || payload.title || payload.libelle || payload.event_type || payload.nom || '');
};

export function createImpactJournal(operationType, issueKey = '') {
  return {
    operationType,
    operationLabel: OPERATION_LABELS[operationType] || operationType,
    title: 'Opération enregistrée',
    issueKey: clean(issueKey),
    impacts: {},
    errors: [],
  };
}

export function markImpact(journal, key, status, detail = '', reason = '') {
  if (!journal?.impacts) return journal;
  journal.impacts[key] = {
    key,
    label: IMPACT_LABELS[key] || key,
    status,
    detail: clean(detail),
    reason: clean(reason),
  };
  return journal;
}

export function markImpactCreated(journal, key, detail = '') {
  return markImpact(journal, key, IMPACT_STATUS.CREATED, detail);
}

export function markImpactNa(journal, key, reason = '') {
  return markImpact(journal, key, IMPACT_STATUS.NA, '', reason || NA_REASONS[key] || 'Non applicable');
}

export function markImpactError(journal, key, reason = 'Erreur à corriger') {
  if (journal?.errors) journal.errors.push({ key, reason });
  return markImpact(journal, key, IMPACT_STATUS.ERROR, '', reason);
}

export function instrumentHandlers(handlers = {}, journal, options = {}) {
  const wrapped = { ...handlers };
  const movementAlsoUpdatesStock = options.movementAlsoUpdatesStock !== false;

  Object.entries(HANDLER_IMPACT_MAP).forEach(([handlerName, impactKey]) => {
    const original = handlers[handlerName];
    if (typeof original !== 'function') return;

    wrapped[handlerName] = async (...args) => {
      try {
        const result = await original(...args);
        const payload = args[0];
        const detail = detailOf(payload) || detailOf(args[1]);
        markImpactCreated(journal, impactKey, detail);
        if (movementAlsoUpdatesStock && impactKey === IMPACT_KEYS.STOCK_MOVEMENT) {
          markImpactCreated(journal, IMPACT_KEYS.STOCK_UPDATED, detailOf(payload?.stock_id || payload?.id));
        }
        return result;
      } catch (error) {
        markImpactError(journal, impactKey, error?.message || 'Erreur à corriger');
        throw error;
      }
    };
  });

  return wrapped;
}

/**
 * Exécute un workflow avec journal d'impacts instrumenté (handlers tracés + finalize).
 */
export async function commitWithImpactJournal({
  operationType,
  issueKey = '',
  handlers = {},
  run,
  expectations,
  showImpactToast,
} = {}) {
  if (typeof run !== 'function') throw new Error('commitWithImpactJournal: run handler requis');
  const journal = createImpactJournal(operationType, issueKey);
  const tracked = instrumentHandlers(handlers, journal);
  const result = await run(tracked, journal);
  const exp = expectations || OPERATION_EXPECTATIONS[operationType] || {};
  const impactJournal = finalizeImpactJournal(journal, exp);
  if (showImpactToast !== false && handlers.showImpactToast !== false) {
    try {
      showWorkflowImpactToast(impactJournal);
    } catch {
      // toast optionnel (tests / environnements sans UI)
    }
  }
  return { ...(result || {}), impactJournal };
}

export function finalizeImpactJournal(journal, expectations = {}) {
  const next = { ...journal, impacts: { ...journal.impacts } };
  const applicable = expectations.applicable || Object.values(IMPACT_KEYS).filter((key) => key !== IMPACT_KEYS.ISSUE_KEY);
  const optional = new Set(expectations.optional || []);
  const required = new Set(expectations.required || applicable.filter((key) => !optional.has(key)));

  applicable.forEach((key) => {
    if (next.impacts[key]) return;
    if (optional.has(key) || !required.has(key)) {
      markImpactNa(next, key, expectations.na?.[key] || NA_REASONS[key]);
    } else {
      markImpactError(next, key, expectations.missing?.[key] || 'Impact attendu non créé - erreur à corriger');
    }
  });

  if (next.issueKey) {
    markImpactCreated(next, IMPACT_KEYS.ISSUE_KEY, next.issueKey);
  } else {
    markImpactNa(next, IMPACT_KEYS.ISSUE_KEY);
  }

  next.rows = [
    IMPACT_KEYS.STOCK_UPDATED,
    IMPACT_KEYS.STOCK_MOVEMENT,
    IMPACT_KEYS.FINANCE,
    IMPACT_KEYS.DOCUMENT,
    IMPACT_KEYS.TASK_ALERT,
    IMPACT_KEYS.BUSINESS_EVENT,
    IMPACT_KEYS.ISSUE_KEY,
  ].map((key) => next.impacts[key] || markImpactNa(createImpactJournal(next.operationType), key).impacts[key]);

  return next;
}


export const OPERATION_EXPECTATIONS = {
  [OPERATION_TYPES.ACHAT_STOCK]: {
    required: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.STOCK_MOVEMENT],
    optional: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.DOCUMENT, IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT],
    na: {
      [IMPACT_KEYS.FINANCE]: 'Réception sans montant comptable',
      [IMPACT_KEYS.DOCUMENT]: 'Justificatif non requis pour cette réception',
    },
  },
  [OPERATION_TYPES.VENTE]: {
    required: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.DOCUMENT, IMPACT_KEYS.BUSINESS_EVENT],
    optional: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.STOCK_MOVEMENT, IMPACT_KEYS.TASK_ALERT],
    na: {
      [IMPACT_KEYS.STOCK_UPDATED]: 'Vente sans sortie stock / actif',
      [IMPACT_KEYS.STOCK_MOVEMENT]: 'Aucun mouvement stock lié',
      [IMPACT_KEYS.TASK_ALERT]: 'Aucune alerte ou tâche supplémentaire',
    },
  },
  [OPERATION_TYPES.PAIEMENT]: {
    required: [IMPACT_KEYS.FINANCE],
    optional: [IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT],
    applicable: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT, IMPACT_KEYS.ISSUE_KEY],
    na: {
      [IMPACT_KEYS.TASK_ALERT]: 'Aucune alerte créance à clôturer',
      [IMPACT_KEYS.BUSINESS_EVENT]: 'Traçabilité gérée par la vente',
    },
  },
  [OPERATION_TYPES.ALIMENTATION]: {
    required: [IMPACT_KEYS.STOCK_MOVEMENT],
    optional: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.FINANCE, IMPACT_KEYS.BUSINESS_EVENT],
    na: {
      [IMPACT_KEYS.FINANCE]: 'Coût nul ou déjà comptabilisé',
    },
  },
  [OPERATION_TYPES.SOIN_VACCIN]: {
    required: [IMPACT_KEYS.BUSINESS_EVENT],
    optional: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.STOCK_MOVEMENT, IMPACT_KEYS.FINANCE, IMPACT_KEYS.TASK_ALERT],
    na: {
      [IMPACT_KEYS.STOCK_MOVEMENT]: 'Aucun produit stock consommé',
      [IMPACT_KEYS.FINANCE]: 'Intervention sans coût',
      [IMPACT_KEYS.TASK_ALERT]: 'Suivi déjà ouvert ou non requis',
    },
  },
  [OPERATION_TYPES.MORTALITE]: {
    required: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.BUSINESS_EVENT],
    optional: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.TASK_ALERT],
    applicable: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.FINANCE, IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT, IMPACT_KEYS.ISSUE_KEY],
    na: {
      [IMPACT_KEYS.FINANCE]: 'Perte non valorisée en finance',
      [IMPACT_KEYS.TASK_ALERT]: 'Seuil d’alerte non atteint',
    },
  },
  [OPERATION_TYPES.PRODUCTION_OEUFS]: {
    required: [IMPACT_KEYS.BUSINESS_EVENT],
    optional: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.TASK_ALERT],
    applicable: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT, IMPACT_KEYS.ISSUE_KEY],
    na: {
      [IMPACT_KEYS.STOCK_UPDATED]: 'Production sans entrée stock automatique',
      [IMPACT_KEYS.TASK_ALERT]: 'Opportunité vente non créée',
    },
  },
  [OPERATION_TYPES.RECOLTE]: {
    required: [IMPACT_KEYS.STOCK_UPDATED, IMPACT_KEYS.STOCK_MOVEMENT, IMPACT_KEYS.BUSINESS_EVENT],
    optional: [IMPACT_KEYS.FINANCE],
    na: {
      [IMPACT_KEYS.FINANCE]: 'Frais de récolte nuls',
    },
  },
  [OPERATION_TYPES.MAINTENANCE]: {
    required: [IMPACT_KEYS.BUSINESS_EVENT],
    optional: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.DOCUMENT, IMPACT_KEYS.TASK_ALERT],
    applicable: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.DOCUMENT, IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT, IMPACT_KEYS.ISSUE_KEY],
    na: {
      [IMPACT_KEYS.FINANCE]: 'Maintenance sans coût',
      [IMPACT_KEYS.DOCUMENT]: 'Preuve non requise',
      [IMPACT_KEYS.TASK_ALERT]: 'Intervention sans alerte/tâche',
    },
  },
  [OPERATION_TYPES.PAIE]: {
    required: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.DOCUMENT, IMPACT_KEYS.BUSINESS_EVENT],
    optional: [IMPACT_KEYS.TASK_ALERT],
    applicable: [IMPACT_KEYS.FINANCE, IMPACT_KEYS.DOCUMENT, IMPACT_KEYS.BUSINESS_EVENT, IMPACT_KEYS.ISSUE_KEY],
    na: {
      [IMPACT_KEYS.TASK_ALERT]: 'Aucune tâche RH supplémentaire',
    },
  },
  [OPERATION_TYPES.LIAISON_DOCUMENT]: {
    required: [IMPACT_KEYS.DOCUMENT],
    optional: [IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT],
    applicable: [IMPACT_KEYS.DOCUMENT, IMPACT_KEYS.TASK_ALERT, IMPACT_KEYS.BUSINESS_EVENT, IMPACT_KEYS.ISSUE_KEY],
    na: {
      [IMPACT_KEYS.TASK_ALERT]: 'Relance preuve non requise',
      [IMPACT_KEYS.BUSINESS_EVENT]: 'Traçabilité gérée par la transaction',
    },
  },
};
