import ListeAlertesPartagee from '../shared/ListeAlertes.jsx';
import { filtrerAlertes } from '../shared/operationalFilters.js';

export { filtrerAlertes } from '../shared/operationalFilters.js';

export default function ListeAlertes({ alertes = [], filtres = {}, onCreerTache, onNavigate, titre }) {
  return (
    <ListeAlertesPartagee
      alerts={filtrerAlertes(alertes, filtres)}
      title={titre}
      onAction={onCreerTache}
      onNavigate={onNavigate}
      limit={filtres.limite || 20}
    />
  );
}
