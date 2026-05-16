import { isSimulatedDataModeEnabled } from '../utils/uiPreferences';
import { moduleSeedMap } from '../utils/mockData';
import { normalizeByModule } from '../utils/normalize';

const clone = (value) => JSON.parse(JSON.stringify(value || []));

export function getSimulatedRows(moduleKey) {
  return normalizeByModule(moduleKey, clone(moduleSeedMap[moduleKey] || []));
}

export function shouldUseSimulatedData() {
  return isSimulatedDataModeEnabled();
}

export function getRowsForMode(moduleKey, realRows = []) {
  if (shouldUseSimulatedData()) return getSimulatedRows(moduleKey);
  return normalizeByModule(moduleKey, Array.isArray(realRows) ? realRows : []);
}
