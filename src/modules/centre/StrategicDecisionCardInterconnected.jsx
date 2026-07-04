import StrategicDecisionCard from './StrategicDecisionCard.jsx';

const ELEVAGE_SUBVIEWS = new Set(['Animaux', 'Avicole']);

function normalizeTarget(item = {}) {
  if (item.navModule) return { module: item.navModule, tab: item.navTab };
  if (item.category === 'launch_timing') return { module: 'elevage', tab: 'Cycles & Reproduction' };
  if (item.entityType === 'animal' || item.entity_type === 'animal' || ['bovins', 'ovins', 'caprins', 'animaux'].includes(item.activity || item.type)) return { module: 'elevage', tab: 'Animaux' };
  if (item.entityType === 'bande_chair' || item.entity_type === 'bande_chair' || item.entityType === 'bande' || item.entity_type === 'bande' || ['poulets_chair', 'oeufs'].includes(item.activity || item.type)) return { module: 'elevage', tab: 'Avicole' };
  return { module: item.module || 'centre_decisionnel', tab: item.navTab };
}

function rememberElevageSubview(module, options = {}) {
  if (module !== 'elevage' || !ELEVAGE_SUBVIEWS.has(options?.tab)) return;
  try {
    window.sessionStorage.setItem('horizon:elevage-subview-intent', options.tab);
  } catch {
    // no-op: navigation still works without persisted subview intent
  }
}

export default function StrategicDecisionCardInterconnected({ item = {}, onNavigate, ...props }) {
  const target = normalizeTarget(item);
  const navigateWithSubviewIntent = (module, options = {}) => {
    rememberElevageSubview(module, options);
    onNavigate?.(module, options);
  };

  return (
    <StrategicDecisionCard
      {...props}
      onNavigate={navigateWithSubviewIntent}
      item={{ ...item, module: target.module, navModule: target.module, navTab: target.tab }}
    />
  );
}
