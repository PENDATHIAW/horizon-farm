import EfficaciteTechniqueTab from './EfficaciteTechniqueTab.jsx';

export default function EfficaciteTechniqueTabInterconnected({ onNavigate, ...props }) {
  const navigate = (module, options = {}) => {
    if (module === 'elevage' && options?.tab === 'Production') {
      onNavigate?.('elevage', { ...options, tab: 'Avicole' });
      return;
    }
    onNavigate?.(module, options);
  };

  return <EfficaciteTechniqueTab {...props} onNavigate={navigate} />;
}
