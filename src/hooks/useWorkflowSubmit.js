import { useCallback, useRef, useState } from 'react';
import { createInFlightGuard } from '../utils/workflowDedupe.js';

export default function useWorkflowSubmit(options = {}) {
  const { guard = createInFlightGuard() } = options;
  const guardRef = useRef(guard);
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState('');

  const submit = useCallback(async (key, fn) => {
    const target = String(key || 'default');
    if (guardRef.current.isLocked(target)) {
      return { skipped: true, reason: 'in_flight' };
    }
    setBusy(true);
    setBusyKey(target);
    try {
      const result = await guardRef.current.run(target, fn);
      return result;
    } finally {
      setBusy(false);
      setBusyKey('');
    }
  }, []);

  return {
    busy,
    busyKey,
    isBusy: (key = 'default') => busy && (!key || busyKey === String(key)),
    submit,
  };
}
