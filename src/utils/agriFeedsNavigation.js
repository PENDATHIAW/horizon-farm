import { AGRI_FEEDS_TAB_ALIASES, AGRI_FEEDS_TABS } from '../config/agriFeeds.config.js';
import { resolveModuleTab } from '../config/moduleTabs/index.js';

export { AGRI_FEEDS_TABS };

export function resolveAgriFeedsTab(value = '') {
  const raw = String(value || '').trim();
  const configured = resolveModuleTab('agri_feeds', raw);
  if (configured) return configured.component;
  if (AGRI_FEEDS_TABS.includes(raw)) return resolveModuleTab('agri_feeds', raw)?.component || 'AgriFeedsOverviewView';
  const alias = AGRI_FEEDS_TAB_ALIASES[raw.toLowerCase()];
  if (alias) return resolveModuleTab('agri_feeds', alias)?.component || 'AgriFeedsOverviewView';
  const norm = raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, tab] of Object.entries(AGRI_FEEDS_TAB_ALIASES)) {
    if (norm.includes(key)) return resolveModuleTab('agri_feeds', tab)?.component || 'AgriFeedsOverviewView';
  }
  return 'AgriFeedsOverviewView';
}
