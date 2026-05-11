import useCrudModule from '../hooks/useCrudModule';
import HealthQualityControl from './HealthQualityControl.jsx';
import SanteV6 from './SanteV6.jsx';
import SanteEvolution from './SanteEvolution.jsx';

export default function SanteV7(props) {
  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const onUpdateAnimal = props.onUpdateAnimal || animauxCrud.update;
  const onUpdateLot = props.onUpdateLot || avicoleCrud.update;
  const onRefreshAnimals = props.onRefreshAnimals || animauxCrud.refresh;
  const onRefreshLots = props.onRefreshLots || avicoleCrud.refresh;

  return (
    <div className="space-y-6">
      <SanteV6 {...props} />
      <HealthQualityControl
        rows={props.rows || []}
        stocks={props.stocks || []}
        transactions={props.transactions || []}
        animaux={props.animaux || animauxCrud.rows || []}
        lots={props.lots || avicoleCrud.rows || []}
        onUpdate={props.onUpdate}
        onUpdateAnimal={onUpdateAnimal}
        onUpdateLot={onUpdateLot}
        onRefresh={props.onRefresh}
        onRefreshAnimals={onRefreshAnimals}
        onRefreshLots={onRefreshLots}
      />
      <SanteEvolution
        rows={props.rows || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
