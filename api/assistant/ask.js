import { answerFarmQuestion, json, readJsonBody, requirePostOrOptions } from './_utils.js';

export default async function handler(req, res) {
  if (!requirePostOrOptions(req, res)) return;

  const body = await readJsonBody(req);
  const question = body.question || body.command || '';
  const dataMap = body.dataMap || {};

  const response = answerFarmQuestion(question, dataMap);

  return json(res, 200, {
    ok: true,
    type: 'assistant_answer',
    question,
    timestamp: new Date().toISOString(),
    ...response,
  });
}
