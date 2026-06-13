import { MODULE_TARGET_TABS } from '../config/horizonVision.config.js';
import { resolveCulturesTab as resolveCulturesTabFromCommercial } from './commercialNavigation.js';

const CULTURES_TABS = MODULE_TARGET_TABS.cultures || [];

export function resolveCulturesTab(tab = '') {
  return resolveCulturesTabFromCommercial(tab);
}

export const CULTURES_TARGET_TABS = CULTURES_TABS;
