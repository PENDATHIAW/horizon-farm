import JournalEvenements from '../../../components/shared/JournalEvenements.jsx';

export default function RegistreTracabiliteTab({ shared, props }) {
  return (
    <JournalEvenements
      events={shared.businessEvents}
      farmId={shared.activeFarm?.id || shared.farm?.id}
      period={props.periodScope}
      limit={150}
      onNavigate={shared.onNavigate}
    />
  );
}
