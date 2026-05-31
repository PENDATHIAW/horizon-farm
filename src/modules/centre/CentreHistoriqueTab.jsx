import DecisionHistoryPanel from '../DecisionHistoryPanel.jsx';

export default function CentreHistoriqueTab({ dataMap = {}, onNavigate }) {
  return <DecisionHistoryPanel dataMap={dataMap} onNavigate={onNavigate} />;
}
