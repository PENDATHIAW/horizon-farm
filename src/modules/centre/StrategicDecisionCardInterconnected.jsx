import StrategicDecisionCard from './StrategicDecisionCard.jsx';

function normalizeTarget(item = {}) {
  if (item.navModule) return { module: item.navModule, tab: item.navTab };
  if (item.category === 'launch_timing') return { module: 'elevage', tab: 'Cycles & Reproduction' };
  if (item.entityType === 'animal' || item.entity_type === 'animal' || ['bovins', 'ovins', 'caprins', 'animaux'].includes(item.activity || item.type)) return { module: 'elevage', tab: 'Animaux' };
  if (item.entityType === 'bande_chair' || item.entity_type === 'bande_chair' || item.entityType === 'bande' || item.entity_type === 'bande' || ['poulets_chair', 'oeufs'].includes(item.activity || item.type)) return { module: 'elevage', tab: 'Avicole' };
  return { module: item.module || 'centre_decisionnel', tab: item.navTab };
}

export default function StrategicDecisionCardInterconnected({ item = {}, ...props }) {
  const target = normalizeTarget(item);
  return <StrategicDecisionCard {...props} item={{ ...item, module: target.module, navModule: target.module, navTab: target.tab }} />;
}
