import ObjectifsCroissance from './ObjectifsCroissance.jsx';

export default function ObjectifsCroissanceModule({ dataMap = {}, onNavigate, ...props }) {
  return <ObjectifsCroissance dataMap={dataMap} onNavigate={onNavigate} {...props} />;
}
