import DecisionAnnexeTab from '../../modules/centre/DecisionAnnexeTab.jsx';
import { annexeLabelForModule } from '../../services/annexeModuleConfig.js';

/** Onglet Annexe réutilisable — formules filtrées par moduleId. */
export default function ModuleAnnexeTab({ moduleId, dataMap = {}, onNavigate }) {
  return (
    <DecisionAnnexeTab
      moduleId={moduleId}
      moduleLabel={annexeLabelForModule(moduleId)}
      dataMap={dataMap}
      onNavigate={onNavigate}
    />
  );
}
