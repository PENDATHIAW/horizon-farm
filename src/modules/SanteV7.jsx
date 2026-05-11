import HealthQualityControl from './HealthQualityControl.jsx';
import SanteV6 from './SanteV6.jsx';
import SanteEvolution from './SanteEvolution.jsx';

export default function SanteV7(props) {
  return (
    <div className="space-y-6">
      <SanteV6 {...props} />
      <HealthQualityControl
        rows={props.rows || []}
        stocks={props.stocks || []}
        transactions={props.transactions || []}
        animaux={props.animaux || []}
        lots={props.lots || []}
        onUpdate={props.onUpdate}
        onUpdateAnimal={props.onUpdateAnimal}
        onUpdateLot={props.onUpdateLot}
        onRefresh={props.onRefresh}
        onRefreshAnimals={props.onRefreshAnimals}
        onRefreshLots={props.onRefreshLots}
      />
      <SanteEvolution
        rows={props.rows || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
