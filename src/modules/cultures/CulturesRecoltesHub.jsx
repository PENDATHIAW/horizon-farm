import CulturesHarvestPanel from './CulturesHarvestPanel.jsx';
import CulturesTransformationPanel from './CulturesTransformationPanel.jsx';
import CulturesSaleOpportunityBridge from '../CulturesSaleOpportunityBridge.jsx';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

export default function CulturesRecoltesHub({
  rows = [],
  stocks = [],
  context,
  handlers,
  onSuccess,
  opportunities = [],
  ...bridgeProps
}) {
  const realRows = getRealCultureRows(rows);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-positive bg-positive-bg p-4 text-sm text-positive">
        <b>Centre de production</b> - une saisie récolte : stock vendable, opportunité commerciale, rentabilité culture et traçabilité.
      </section>
      <CulturesHarvestPanel rows={rows} context={context} handlers={handlers} onSuccess={onSuccess} />
      <CulturesTransformationPanel stocks={stocks} context={context} handlers={handlers} onSuccess={onSuccess} />
      <CulturesSaleOpportunityBridge rows={realRows} opportunities={opportunities} {...bridgeProps} />
    </div>
  );
}
