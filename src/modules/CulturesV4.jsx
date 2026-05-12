import { useState } from 'react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import CulturesV3 from './CulturesV3.jsx';
import CulturesEvolution from './CulturesEvolution.jsx';

export default function CulturesV4(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div className="space-y-6">
      <CulturesV3 {...props} />
      <CollapsibleAdvancedSection
        title="Cultures : évolution, rendement et valeur"
        description="Les graphes d’évolution sont conservés ici pour garder la saisie des cultures simple."
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
      >
        <CulturesEvolution
          rows={props.rows || []}
          onNavigate={props.onNavigate}
        />
      </CollapsibleAdvancedSection>
    </div>
  );
}
