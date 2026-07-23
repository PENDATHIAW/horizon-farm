export function areServerAutomationsEnabled() {
  const value = String(process.env.AUTOMATIONS_ENABLED ?? 'true').trim().toLowerCase();
  return !['0', 'false', 'off', 'paused'].includes(value);
}

export class AutomationPausedError extends Error {
  constructor() {
    super('Les actions automatiques sont temporairement suspendues.');
    this.name = 'AutomationPausedError';
    this.statusCode = 503;
    this.code = 'automations_paused';
  }
}

export function requireServerAutomations() {
  if (!areServerAutomationsEnabled()) throw new AutomationPausedError();
}
