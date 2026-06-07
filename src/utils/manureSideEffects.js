import { buildManureCollectionWorkflow, resolveManureProfile } from './manureWorkflows';

export async function runManureCollectionSideEffects({
  intervention = {},
  target = {},
  sacs = 0,
  lots = [],
  animaux = [],
  stocks = [],
  opportunities = [],
  date = '',
  handlers = {},
} = {}) {
  const profileMeta = resolveManureProfile(target, lots, animaux);
  const workflow = buildManureCollectionWorkflow({
    intervention,
    target,
    sacs,
    profileMeta,
    stocks,
    opportunities,
    date,
  });
  if (!workflow) return null;

  if (workflow.stockExistingId) {
    await handlers.onUpdateStock?.(workflow.stockExistingId, workflow.stock);
  } else if (handlers.onCreateStock) {
    await handlers.onCreateStock({ ...workflow.stock, side_effects_managed: true });
  }

  if (workflow.opportunityExistingId) {
    await handlers.onUpdateOpportunity?.(workflow.opportunityExistingId, workflow.opportunity);
  } else if (handlers.onCreateOpportunity) {
    await handlers.onCreateOpportunity({ ...workflow.opportunity, side_effects_managed: true });
  }

  if (workflow.event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({ ...workflow.event, side_effects_managed: true });
  }

  return workflow;
}
