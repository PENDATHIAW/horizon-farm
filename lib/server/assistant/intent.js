import { buildSimpleDraft, detectNavigationIntent, json, readJsonBody, requirePostOrOptions } from './_utils.js';

export default async function handler(req, res) {
  if (!requirePostOrOptions(req, res)) return;

  const body = await readJsonBody(req);
  const command = body.command || body.text || '';
  const dataMap = body.dataMap || {};

  const navigation = detectNavigationIntent(command);
  const draft = buildSimpleDraft(command, dataMap);

  return json(res, 200, {
    ok: true,
    type: 'assistant_intent',
    command,
    timestamp: new Date().toISOString(),
    navigation,
    draft,
  });
}
