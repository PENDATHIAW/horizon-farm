import { buildManureCollectionWorkflow, resolveManureProfile } from './manureWorkflows';
import { enhanceManureWorkflowForOrgaloop } from '../services/greenpreneurs/orgaloopEffluentWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);

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
  let workflow = buildManureCollectionWorkflow({
    intervention,
    target,
    sacs,
    profileMeta,
    stocks,
    opportunities,
    date,
  });
  if (!workflow) return null;

  workflow = enhanceManureWorkflowForOrgaloop(workflow, { profileMeta });

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

  if (workflow.task && handlers.onCreateTask) {
    await handlers.onCreateTask({ ...workflow.task, side_effects_managed: true });
  }

  if (workflow.alert && handlers.onCreateAlert) {
    await handlers.onCreateAlert({ ...workflow.alert, side_effects_managed: true });
  }

  for (const extraEvent of arr(workflow.extraEvents)) {
    if (extraEvent && handlers.onCreateBusinessEvent) {
      await handlers.onCreateBusinessEvent({ ...extraEvent, side_effects_managed: true });
    }
  }

  return workflow;
}
