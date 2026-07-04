import { useMemo } from 'react';
import ElevageRecoveredModule from './ElevageRecoveredModule';

function consumeElevageSubviewIntent(initialTab) {
  if (typeof window === 'undefined') return initialTab;
  try {
    const intent = window.sessionStorage.getItem('horizon:elevage-subview-intent');
    if (!intent) return initialTab;
    window.sessionStorage.removeItem('horizon:elevage-subview-intent');
    return ['Animaux', 'Avicole'].includes(intent) ? intent : initialTab;
  } catch {
    return initialTab;
  }
}

export default function ElevageModule(props) {
  const initialTab = useMemo(() => consumeElevageSubviewIntent(props.initialTab), [props.initialTab]);
  return <ElevageRecoveredModule {...props} initialTab={initialTab} />;
}
