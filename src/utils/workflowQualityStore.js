const STORAGE_KEY = 'horizon_farm_workflow_quality_checks';

function safeRead() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function safeWrite(next = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage peut être indisponible.
  }
}

export function readWorkflowQualityManualChecks() {
  return safeRead();
}

export function markWorkflowQualityManual(recipeId, note = '') {
  const current = safeRead();
  current[recipeId] = {
    status: 'manual_ok',
    validatedAt: new Date().toISOString(),
    note: String(note || '').trim(),
  };
  safeWrite(current);
  return current[recipeId];
}

export function clearWorkflowQualityManual(recipeId) {
  const current = safeRead();
  delete current[recipeId];
  safeWrite(current);
}
