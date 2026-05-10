import CulturesV3 from './CulturesV3.jsx';
import CulturesEvolution from './CulturesEvolution.jsx';

export default function CulturesV4(props) {
  return (
    <div className="space-y-6">
      <CulturesV3 {...props} />
      <CulturesEvolution
        rows={props.rows || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
