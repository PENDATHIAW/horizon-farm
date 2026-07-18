/**
 * Politique unique alertes → tâches → notifications.
 *
 * UNE seule table décide, pour chaque gravité, ce qui se passe :
 *  - `task`     : une tâche corrective est-elle créée automatiquement ?
 *  - `screen`   : une notification écran (navigateur / push) est-elle envoyée ?
 *  - `whatsapp` : propose-t-on un partage WhatsApp ?
 *
 * Le centre d'alertes (cloche + panneau) affiche TOUJOURS toutes les alertes
 * ouvertes, quelle que soit la gravité — la politique ne concerne que les
 * effets secondaires (tâche, notification poussée).
 *
 * Choix retenu : seules urgence et critique déclenchent tâche + notification.
 * Warning et info restent consultables sans interrompre (anti-fatigue).
 */

const lower = (v) => String(v ?? '').trim().toLowerCase();

export const ALERT_POLICY = Object.freeze({
  urgence: Object.freeze({ task: true, screen: true, whatsapp: true }),
  critique: Object.freeze({ task: true, screen: true, whatsapp: true }),
  warning: Object.freeze({ task: false, screen: false, whatsapp: false }),
  info: Object.freeze({ task: false, screen: false, whatsapp: false }),
});

const DEFAULT_POLICY = ALERT_POLICY.info;

/** Normalise les libellés de gravité hétérogènes vers l'échelle canonique. */
export function normalizeSeverity(value = '') {
  const s = lower(value);
  if (['urgence', 'urgent', 'urgence_max'].includes(s)) return 'urgence';
  if (['critique', 'critical', 'haute', 'high', 'danger'].includes(s)) return 'critique';
  if (['warning', 'attention', 'vigilance', 'moyenne', 'medium'].includes(s)) return 'warning';
  return 'info';
}

export function alertPolicy(alert = {}) {
  const severity = normalizeSeverity(alert.severity ?? alert.gravite);
  return ALERT_POLICY[severity] || DEFAULT_POLICY;
}

/** Une tâche corrective doit-elle être créée automatiquement ? */
export function shouldCreateTask(alert = {}) {
  return alertPolicy(alert).task === true;
}

/** Une notification écran (navigateur / push) doit-elle partir ? */
export function shouldNotifyScreen(alert = {}) {
  return alertPolicy(alert).screen === true;
}

/** Propose-t-on un partage WhatsApp pour cette alerte ? */
export function shouldOfferWhatsapp(alert = {}) {
  return alertPolicy(alert).whatsapp === true;
}
