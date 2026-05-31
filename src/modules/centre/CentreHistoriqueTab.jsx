import DecisionHistoryPanel from '../DecisionHistoryPanel.jsx';
import AnnualCommercialCalendarPanel from '../AnnualCommercialCalendarPanel.jsx';

export default function CentreHistoriqueTab({ dataMap = {}, onNavigate }) {
  return (
    <div className="space-y-5">
      <DecisionHistoryPanel dataMap={dataMap} onNavigate={onNavigate} />
      <AnnualCommercialCalendarPanel dataMap={dataMap} />
    </div>
  );
}
