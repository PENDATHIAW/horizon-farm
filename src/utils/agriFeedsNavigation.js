import { AGRI_FEEDS_TAB_ALIASES, AGRI_FEEDS_TABS } from '../config/agriFeeds.config.js';

export { AGRI_FEEDS_TABS };

export function resolveAgriFeedsTab(value = '') {
  const raw = String(value || '').trim();
  if (AGRI_FEEDS_TABS.includes(raw)) return raw;
  const alias = AGRI_FEEDS_TAB_ALIASES[raw.toLowerCase()];
  if (alias) return alias;
  const norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, tab] of Object.entries(AGRI_FEEDS_TAB_ALIASES)) {
    if (norm.includes(key)) return tab;
  }
  return 'Tableau de bord';
}
