import useCrudModule from '../hooks/useCrudModule';
import { buildCultureHarvestWorkflow } from '../utils/cultureWorkflows';
import CulturesV4 from './CulturesV4.jsx';

export default function CulturesV5(props) {
  const stockCrud = useCrudModule('stock');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const stocks = props.stocks || stockCrud.rows || [];
  const opportunities = props.opportunities || opportunitiesCrud.rows || [];

  const syncHarvest = async (before = {}, after = {}, source = 'modification culture') => {
    const workflow = buildCultureHarvestWorkflow({ before, after, stocks, opportunities, source });
    if (!workflow) return;
    if (workflow.stockExistingId) await (props.onUpdateStock || stockCrud.update)?.(workflow.stockExistingId, workflow.stock);
    else await (props.onCreateStock || stockCrud.create)?.(workflow.stock);
    if (workflow.opportunityExistingId) await (props.onUpdateOpportunity || opportunitiesCrud.update)?.(workflow.opportunityExistingId, workflow.opportunity);
    else await (props.onCreateOpportunity || opportunitiesCrud.create)?.(workflow.opportunity);
    if (workflow.event) await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([
      props.onRefreshStock?.(), props.onRefreshStocks?.(), stockCrud.refresh?.(),
      props.onRefreshOpportunities?.(), opportunitiesCrud.refresh?.(),
      props.onRefreshBusinessEvents?.(),
    ]);
  };

  const onCreate = async (payload) => {
    await props.onCreate?.(payload);
    await syncHarvest({}, payload, 'création culture');
  };

  const onUpdate = async (id, payload) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdate?.(id, payload);
    await syncHarvest(before, after, 'modification fiche culture');
  };

  return <CulturesV4 {...props} stocks={stocks} opportunities={opportunities} onCreate={onCreate} onUpdate={onUpdate} />;
}
