/**
 * Synthèses multi-modules — délègue aux moteurs dirigeant V6.1.
 */

import { buildCommentVaLaFermeAnswer, buildObjectifStatusAnswer } from './assistantDirectorEngines.js';

export function buildFarmOverviewAnswer(dataMap = {}) {
  return buildCommentVaLaFermeAnswer(dataMap);
}

export function buildAnnualOutlookAnswer(dataMap = {}, query = '') {
  return buildObjectifStatusAnswer(dataMap, query || 'objectif annuel');
}

export default {
  buildFarmOverviewAnswer,
  buildAnnualOutlookAnswer,
};
