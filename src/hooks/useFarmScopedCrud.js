import { useMemo } from 'react';
import {
  FARM_SCOPED_CREATE_MODULES,
  buildFarmScopeCreateContext,
  wrapCrudCreatesWithFarmScope,
} from '../utils/farmScopeCreate.js';

export default function useFarmScopedCrud(crud = {}, farmScope = {}, accessibleFarms = [], activeFarm = null) {
  const farmContext = useMemo(
    () => buildFarmScopeCreateContext(farmScope, accessibleFarms, activeFarm),
    [farmScope, accessibleFarms, activeFarm],
  );

  return useMemo(() => {
    const next = { ...crud };
    FARM_SCOPED_CREATE_MODULES.forEach((moduleKey) => {
      if (next[moduleKey]) {
        next[moduleKey] = wrapCrudCreatesWithFarmScope(next[moduleKey], moduleKey, farmContext);
      }
    });
    return next;
  }, [crud, farmContext]);
}
