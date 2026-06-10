import AvicoleSaleReadinessBridge from '../AvicoleSaleReadinessBridge.jsx';
import AnimalSaleReadinessBridge from './AnimalSaleReadinessBridge.jsx';
import { CommercialSection } from './commercialUi.jsx';

export default function CommercialSaleReadinessPanel({
  lots = [],
  animaux = [],
  opportunities = [],
  onUpdateLot,
  onRefreshLots,
  onUpdateAnimal,
  onRefreshAnimals,
  onCreateOpportunity,
  onUpdateOpportunity,
  onRefreshOpportunities,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
}) {
  const shared = {
    opportunities,
    onCreateOpportunity,
    onUpdateOpportunity,
    onRefreshOpportunities,
    onCreateBusinessEvent,
    onRefreshBusinessEvents,
  };

  return (
    <CommercialSection
      title="Prêts à vendre (production)"
      subtitle="Lots avicoles et animaux confirmés ici créent ou mettent à jour les opportunités commerciales — plus besoin de le faire depuis Élevage."
    >
      <AnimalSaleReadinessBridge rows={animaux} onUpdate={onUpdateAnimal} onRefresh={onRefreshAnimals} {...shared} />
      <AvicoleSaleReadinessBridge rows={lots} onUpdate={onUpdateLot} onRefresh={onRefreshLots} {...shared} />
    </CommercialSection>
  );
}
