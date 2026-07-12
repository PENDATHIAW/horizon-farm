import {
  JUSTIFIED_EXCEPTION_STORAGE_KEY,
  LEGACY_IGNORED_INTERCONNECTION_KEY,
  JUSTIFIED_EXCEPTION_TYPES,
  validateJustifiedExceptionPayload,
} from './justifiedExceptionRules.js';

const clean = (value) => String(value ?? '').trim();
const nowIso = () => new Date().toISOString();
const makeId = () => `EXC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

function readRawStore() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(JUSTIFIED_EXCEPTION_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRawStore(rows = []) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(JUSTIFIED_EXCEPTION_STORAGE_KEY, JSON.stringify(rows));
    window.dispatchEvent(new CustomEvent('horizon-farm-justified-exceptions-changed'));
  } catch {
    // localStorage indisponible.
  }
}

function migrateLegacyIgnoredIssues(rows = []) {
  if (typeof localStorage === 'undefined') return rows;
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_IGNORED_INTERCONNECTION_KEY) || '[]');
    if (!Array.isArray(legacy) || !legacy.length) return rows;
    const existingKeys = new Set(rows.map((row) => clean(row.issue_key)));
    const migrated = [...rows];
    legacy.map(String).forEach((issueKey) => {
      if (!issueKey || existingKeys.has(issueKey)) return;
      migrated.push({
        id: makeId(),
        issue_key: issueKey,
        raison: 'test_interne',
        commentaire: 'Migré depuis un masquage local précédent.',
        utilisateur: 'system',
        date: nowIso(),
        source_module: 'gestion_systeme',
        source_record_id: '',
        type_exception: JUSTIFIED_EXCEPTION_TYPES.INTERCONNECTION,
        active: true,
        created_at: nowIso(),
        revoked_at: null,
        revoked_by: null,
      });
      existingKeys.add(issueKey);
    });
    localStorage.removeItem(LEGACY_IGNORED_INTERCONNECTION_KEY);
    writeRawStore(migrated);
    return migrated;
  } catch {
    return rows;
  }
}

export function readJustifiedExceptions({ includeRevoked = true } = {}) {
  const rows = migrateLegacyIgnoredIssues(readRawStore());
  return includeRevoked ? rows : rows.filter((row) => row.active !== false);
}

export function getJustifiedException(issueKey = '') {
  const key = clean(issueKey);
  if (!key) return null;
  return readJustifiedExceptions().find((row) => clean(row.issue_key) === key) || null;
}

export function isIssueJustified(issueKey = '') {
  const row = getJustifiedException(issueKey);
  return Boolean(row && row.active !== false);
}

export function filterJustifiedIssues(items = [], keyBuilder = (item) => clean(item.issue_key || item.id)) {
  return items.filter((item) => !isIssueJustified(keyBuilder(item)));
}

export function markJustifiedException(payload = {}) {
  const error = validateJustifiedExceptionPayload(payload);
  if (error) throw new Error(error);

  const issueKey = clean(payload.issue_key);
  const rows = readJustifiedExceptions();
  const next = {
    id: payload.id || makeId(),
    issue_key: issueKey,
    raison: clean(payload.raison),
    commentaire: clean(payload.commentaire),
    utilisateur: clean(payload.utilisateur) || 'utilisateur',
    date: payload.date || nowIso(),
    source_module: clean(payload.source_module),
    source_record_id: clean(payload.source_record_id),
    type_exception: clean(payload.type_exception),
    active: true,
    created_at: payload.created_at || nowIso(),
    revoked_at: null,
    revoked_by: null,
  };

  const withoutSameKey = rows.filter((row) => clean(row.issue_key) !== issueKey);
  writeRawStore([next, ...withoutSameKey]);
  return next;
}

export function revokeJustifiedException(issueKey = '', revokedBy = '') {
  const key = clean(issueKey);
  if (!key) throw new Error('Clé issue manquante.');
  const rows = readJustifiedExceptions();
  let updated = null;
  const nextRows = rows.map((row) => {
    if (clean(row.issue_key) !== key) return row;
    updated = {
      ...row,
      active: false,
      revoked_at: nowIso(),
      revoked_by: clean(revokedBy) || 'admin',
    };
    return updated;
  });
  if (!updated) throw new Error('Exception introuvable.');
  writeRawStore(nextRows);
  return updated;
}

export function buildJustifiedExceptionAuditEvent(exception = {}, action = 'justified_exception_marked') {
  return {
    event_type: action,
    module_source: 'gestion_systeme',
    entity_type: 'justified_exception',
    entity_id: exception.issue_key,
    title: action === 'justified_exception_revoked'
      ? `Exception révoquée : ${exception.issue_key}`
      : `Exception justifiée : ${exception.issue_key}`,
    description: [exception.raison, exception.commentaire].filter(Boolean).join(' · '),
    event_date: nowIso().slice(0, 10),
    severity: 'info',
    issue_key: exception.issue_key,
    type_exception: exception.type_exception,
    source_module: exception.source_module,
    source_record_id: exception.source_record_id,
  };
}
