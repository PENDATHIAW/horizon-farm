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
  onNavigate,
  ...bridgeProps
}) {
  const realRows = getRealCultureRows(rows);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <b>Centre de production</b> — une saisie récolte : stock vendable, opportunité commerciale, rentabilité culture et traçabilité.
      </section>
      <CulturesHarvestPanel rows={rows} context={context} handlers={handlers} onSuccess={onSuccess} />
      <CulturesTransformationPanel stocks={stocks} context={context} handlers={handlers} onSuccess={onSuccess} />
      <CulturesSaleOpportunityBridge rows={realRows} opportunities={opportunities} {...bridgeProps} />
      <p className="text-xs text-[#8a7456]">
        Transformation détaillée aussi disponible dans l&apos;onglet{' '}
        <button type="button" className="font-bold text-emerald-700 underline" onClick={() => onNavigate?.('cultures', { tab: 'Transformation' })}>Transformation</button>.
      </p>
    </div>
  );
}
