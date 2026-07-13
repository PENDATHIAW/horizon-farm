import JournalEvenementsPartage from '../shared/JournalEvenements.jsx';
import { filtrerEvenements } from '../shared/operationalFilters.js';

export { filtrerEvenements } from '../shared/operationalFilters.js';

export default function JournalEvenements({ evenements = [], filtres = {}, onNavigate, titre }) {
  return (
    <JournalEvenementsPartage
      events={filtrerEvenements(evenements, filtres)}
      title={titre}
      onNavigate={onNavigate}
      limit={filtres.limite || 30}
    />
  );
}
