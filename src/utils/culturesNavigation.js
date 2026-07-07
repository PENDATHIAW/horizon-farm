import { MODULE_TARGET_TABS } from '../config/horizonVision.config.js';
import {
  navigateCulturesTab as navigateCulturesTabFromCommercial,
  resolveCulturesTab as resolveCulturesTabFromCommercial,
} from './commercialNavigation.js';

const CULTURES_TABS = MODULE_TARGET_TABS.cultures || [];
const lower = (value = '') => String(value || '').trim().toLowerCase();

/** Section repliable ciblée par un alias legacy (Intrants, Transformation…). */
export function resolveCulturesSectionIntent(tab = '') {
  const key = lower(tab);
  if (key === 'intrants & météo' || key === 'intrants') {
    return { tab: 'Parcelles & campagnes', section: 'intrants' };
  }
  if (key === 'santé & protection' || key === 'sante') {
    return { tab: 'Parcelles & campagnes', section: 'sante' };
  }
  if (key === 'cycles' || key === 'campagnes') {
    return { tab: 'Parcelles & campagnes', section: 'cycles' };
  }
  if (key === 'annexe') {
    return { tab: 'Parcelles & campagnes', section: 'annexe' };
  }
  if (key === 'transformation') {
    return { tab: 'Récoltes', section: 'transformation' };
  }
  if (key === 'graphiques') {
    return { tab: 'Économie circulaire', section: 'graphiques' };
  }
  return { tab: null, section: null };
}

export function resolveCulturesTab(tab = '') {
  return resolveCulturesTabFromCommercial(tab);
}

export function navigateCulturesTab(onNavigate, tab = '', options = {}) {
  return navigateCulturesTabFromCommercial(onNavigate, tab, options);
}

export const CULTURES_TARGET_TABS = CULTURES_TABS;
