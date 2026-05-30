import { json, readJsonBody, requirePostOrOptions, summarizeDataMap } from './_utils.js';

export default async function handler(req, res) {
  if (!requirePostOrOptions(req, res)) return;

  const body = await readJsonBody(req);
  const dataMap = body.dataMap || {};

  return json(res, 200, {
    ok: true,
    type: 'assistant_summary',
    timestamp: new Date().toISOString(),
    summary: summarizeDataMap(dataMap),
  });
}
