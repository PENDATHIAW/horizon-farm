import { useState } from 'react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import ActivityOperatingMarginPanel from './ActivityOperatingMarginPanel.jsx';
import CulturesV3 from './CulturesV3.jsx';
import CulturesEvolution from './CulturesEvolution.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

export default function CulturesV4(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div className="space-y-6">
      <CulturesV3 {...props} />
      <CollapsibleAdvancedSection
        title="Cultures : historique, marges, évolution, rendement et valeur"
        description="L’historique de récolte/sortie, les marges nettes et graphes d’évolution sont conservés ici pour garder la saisie des cultures simple."
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
      >
        <LifecycleHistoryPanel
          mode="cultures"
          rows={props.rows || []}
          salesOrders={props.salesOrders || []}
          deliveries={props.deliveriesList || props.deliveries || []}
          businessEvents={props.businessEvents || []}
        />
        <ActivityOperatingMarginPanel
          mode="cultures"
          rows={props.rows || []}
          transactions={props.transactions || []}
          businessEvents={props.businessEvents || []}
        />
        <CulturesEvolution
          rows={props.rows || []}
          onNavigate={props.onNavigate}
        />
      </CollapsibleAdvancedSection>
    </div>
  );
}
