import ListeTachesPartagee from '../shared/ListeTaches.jsx';
import { filtrerTaches } from '../shared/operationalFilters.js';

export { filtrerTaches } from '../shared/operationalFilters.js';

export default function ListeTaches({ taches = [], filtres = {}, onOuvrirTache, titre }) {
  return (
    <ListeTachesPartagee
      tasks={filtrerTaches(taches, filtres)}
      title={titre}
      onSelect={onOuvrirTache}
      limit={filtres.limite || 20}
    />
  );
}
