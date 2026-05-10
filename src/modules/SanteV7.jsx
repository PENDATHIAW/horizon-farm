import SanteV6 from './SanteV6.jsx';
import SanteEvolution from './SanteEvolution.jsx';

export default function SanteV7(props) {
  return (
    <div className="space-y-6">
      <SanteV6 {...props} />
      <SanteEvolution
        rows={props.rows || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
