import { MODULE_TARGET_TABS } from '../../config/horizonVision.config.js';

const STORAGE_FORM_LOOP = 'horizon-ux-form-loop-counts';
const STORAGE_NAV_LOOP = 'horizon-ux-nav-loop-counts';

/** Enregistre une ouverture formulaire (appelé depuis formModalManager). */
export function trackFormModalOpen(module = '', formType = '') {
  if (typeof window === 'undefined') return;
  const key = `${module}:${formType || 'default'}`;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_FORM_LOOP) || '{}');
    raw[key] = (raw[key] || 0) + 1;
    window.localStorage.setItem(STORAGE_FORM_LOOP, JSON.stringify(raw));
  } catch { /* ignore */ }
}

export function trackNavOpen(moduleId = '') {
  if (typeof window === 'undefined' || !moduleId) return;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_NAV_LOOP) || '{}');
    raw[moduleId] = (raw[moduleId] || 0) + 1;
    window.localStorage.setItem(STORAGE_NAV_LOOP, JSON.stringify(raw));
  } catch { /* ignore */ }
}

function readCounts(storageKey) {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '{}');
  } catch {
    return {};
  }
}

/** Surveillance UX - récursions, boucles navigation, onglets manquants. */
export function evaluateSurveillanceUxRules() {
  const findings = [];
  const formLoops = readCounts(STORAGE_FORM_LOOP);
  const navLoops = readCounts(STORAGE_NAV_LOOP);

  Object.entries(formLoops).forEach(([key, count]) => {
    if (count >= 5) {
      const [module, formType] = key.split(':');
      findings.push({
        id: `ux-form-loop-${key}`,
        module: module || 'gestion_systeme',
        severity: count >= 8 ? 'haute' : 'moyenne',
        category: 'surveillance_ux',
        title: `Récursion UX formulaire : ${key}`,
        description: `Le formulaire "${formType || module}" a été ouvert ${count} fois sans résolution apparente.`,
        recommended_action: 'Vérifier si le bouton rouvre le même écran sans action métier.',
        confidence_score: 0.87,
        internal_diagnostic: true,
      });
    }
  });

  Object.entries(navLoops).forEach(([moduleId, count]) => {
    if (count >= 12 && !MODULE_TARGET_TABS[moduleId]) {
      findings.push({
        id: `ux-nav-unknown-${moduleId}`,
        module: 'gestion_systeme',
        severity: 'basse',
        category: 'surveillance_ux',
        title: `Module hors vision : ${moduleId}`,
        description: `${count} visites sur un module non listé dans la structure cible ERP.`,
        recommended_action: 'Fusionner ou ranger ce module dans la navigation principale.',
        confidence_score: 0.75,
      });
    }
  });

  if (typeof document !== 'undefined') {
    const deadButtons = [...document.querySelectorAll('button[type="button"]')].filter((btn) => {
      const label = (btn.textContent || '').trim();
      if (!label || label.length > 80) return false;
      return !btn.onclick && !btn.getAttribute('onClick') && btn.dataset.action !== 'bound';
    });
    if (deadButtons.length > 3) {
      findings.push({
        id: 'ux-dead-buttons-scan',
        module: 'gestion_systeme',
        severity: 'moyenne',
        category: 'surveillance_ux',
        title: `${deadButtons.length} bouton(s) sans handler détecté(s)`,
        description: 'Analyse DOM : certains boutons n\'ont pas d\'action JavaScript attachée.',
        recommended_action: 'Auditer les boutons décoratifs ou non branchés.',
        confidence_score: 0.7,
      });
    }
  }

  return findings;
}
