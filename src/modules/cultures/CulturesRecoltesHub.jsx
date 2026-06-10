import CulturesHarvestPanel from './CulturesHarvestPanel.jsx';
import CulturesSaleOpportunityBridge from '../CulturesSaleOpportunityBridge.jsx';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

export default function CulturesRecoltesHub({
  rows = [],
  context,
  handlers,
  onSuccess,
  opportunities = [],
  ...bridgeProps
}) {
  const realRows = getRealCultureRows(rows);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <b>Centre de production</b> — une saisie récolte : stock, catalogue commercial et performance cultures (workflow <code className="text-xs">commitCultureHarvest</code>).
      </section>
      <CulturesHarvestPanel rows={rows} context={context} handlers={handlers} onSuccess={onSuccess} />
      <CulturesSaleOpportunityBridge rows={realRows} opportunities={opportunities} {...bridgeProps} />
    </div>
  );
}
