import Animaux from './Animaux.jsx';
import AnimauxEvolution from './AnimauxEvolution.jsx';

export default function AnimauxV2(props) {
  return (
    <div className="space-y-6">
      <Animaux {...props} />
      <AnimauxEvolution
        rows={props.rows || []}
        opportunities={props.opportunities || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
