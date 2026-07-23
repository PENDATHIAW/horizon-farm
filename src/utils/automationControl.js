export const AUTOMATIC_WRITE_MODES = Object.freeze({
  OBSERVE: 'observe',
  ON: 'on',
});

export function resolveAutomaticWriteMode(value = '') {
  return String(value || '').trim().toLowerCase() === AUTOMATIC_WRITE_MODES.ON
    ? AUTOMATIC_WRITE_MODES.ON
    : AUTOMATIC_WRITE_MODES.OBSERVE;
}

export function areAutomaticWritesEnabled() {
  const value = typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_AUTOMATION_WRITE_MODE
    : '';
  return resolveAutomaticWriteMode(value) === AUTOMATIC_WRITE_MODES.ON;
}
