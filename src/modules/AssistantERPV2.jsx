import { useState } from 'react';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { resolveModuleTab } from '../config/moduleTabs/index.js';
import AssistantKeyActionsPanel from './assistant/AssistantKeyActionsPanel.jsx';
import HeyHorizonModule from './HeyHorizonModule.jsx';

/**
 * Module Assistant : le téléphone conversationnel « Hey Horizon » plus un
 * centre de commande « Actions clés » (deux gestes déterminants par module).
 * Les bandeaux Hey Horizon des autres modules ont été recentrés ici.
 */
export default function AssistantERPV2(props) {
  const { initialTab, onTabChange } = props;
  const controlled = Boolean(onTabChange);
  const resolve = (value) => resolveModuleTab('assistant_erp', value)?.component || 'Conversation';
  const [internalTab, setInternalTab] = useState(() => resolve(initialTab || 'Conversation'));
  const tab = controlled ? resolve(initialTab || 'Conversation') : internalTab;
  const setTab = (next) => {
    const resolved = resolve(next);
    if (controlled) onTabChange?.(resolved);
    else setInternalTab(resolved);
  };

  return (
    <div className="space-y-4">
      <ModuleTabsBar moduleId="assistant_erp" active={tab} onChange={setTab} />
      {tab === 'Actions clés'
        ? <AssistantKeyActionsPanel onNavigate={props.onNavigate} />
        : <HeyHorizonModule {...props} />}
    </div>
  );
}
