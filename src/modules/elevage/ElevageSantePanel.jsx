import HealthOperationalPanel from '../HealthOperationalPanel.jsx';
import SanteV8 from '../SanteV8.jsx';

export default function ElevageSantePanel({ healthProps, onNavigate }) {
  return (
    <div className="space-y-5">
      <HealthOperationalPanel
        rows={healthProps.rows || []}
        stocks={healthProps.stocks || []}
        transactions={healthProps.transactions || []}
        animaux={healthProps.animaux || []}
        lots={healthProps.lots || []}
        onNavigate={onNavigate}
      />
      <SanteV8 {...healthProps} />
    </div>
  );
}
