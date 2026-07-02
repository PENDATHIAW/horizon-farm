import BaseAccueil from '../DashboardV2.jsx';
import AccueilCommercialCard from './AccueilCommercialCard.jsx';

export default function AccueilRefinedEntry(props) {
  return (
    <div className="space-y-3">
      <BaseAccueil {...props} />
      <AccueilCommercialCard onNavigate={props.onNavigate} />
    </div>
  );
}
