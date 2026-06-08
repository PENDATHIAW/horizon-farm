import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FARM_SCOPE_CHANGED,
  normalizeFarmScope,
  readCachedAccessibleFarms,
  readFarmScope,
  writeFarmScope,
} from '../utils/farmScope';

export default function useFarmScope(accessibleFarms = readCachedAccessibleFarms()) {
  const [farmScopeRaw, setFarmScopeRaw] = useState(() => readFarmScope(accessibleFarms));

  const farmScope = useMemo(
    () => normalizeFarmScope(farmScopeRaw, accessibleFarms),
    [farmScopeRaw, accessibleFarms],
  );

  useEffect(() => {
    const handler = (event) => {
      setFarmScopeRaw(event.detail || readFarmScope(accessibleFarms));
    };
    window.addEventListener(FARM_SCOPE_CHANGED, handler);
    return () => window.removeEventListener(FARM_SCOPE_CHANGED, handler);
  }, [accessibleFarms]);

  const setFarmScope = useCallback((next) => {
    setFarmScopeRaw(writeFarmScope(next, accessibleFarms));
  }, [accessibleFarms]);

  return [farmScope, setFarmScope];
}
