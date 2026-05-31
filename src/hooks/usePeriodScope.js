import { useCallback, useEffect, useState } from 'react';
import { PERIOD_SCOPE_CHANGED, readPeriodScope, writePeriodScope } from '../utils/periodScope';

export default function usePeriodScope() {
  const [periodScope, setPeriodScopeState] = useState(readPeriodScope);

  useEffect(() => {
    const handler = (event) => setPeriodScopeState(event.detail || readPeriodScope());
    window.addEventListener(PERIOD_SCOPE_CHANGED, handler);
    return () => window.removeEventListener(PERIOD_SCOPE_CHANGED, handler);
  }, []);

  const setPeriodScope = useCallback((next) => {
    setPeriodScopeState(writePeriodScope(next));
  }, []);

  return [periodScope, setPeriodScope];
}
