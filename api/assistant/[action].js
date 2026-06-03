import askHandler from '../../lib/server/assistant/ask.js';
import enhanceHandler from '../../lib/server/assistant/enhance.js';
import intentHandler from '../../lib/server/assistant/intent.js';
import summaryHandler from '../../lib/server/assistant/summary.js';
import validateHandler from '../../lib/server/assistant/validate.js';
import documentOcrHandler from '../../lib/server/assistant/documentOcr.js';

const HANDLERS = {
  ask: askHandler,
  enhance: enhanceHandler,
  intent: intentHandler,
  summary: summaryHandler,
  validate: validateHandler,
  'document-ocr': documentOcrHandler,
};

export default async function handler(req, res) {
  const action = String(req.query.action || '').trim();
  const fn = HANDLERS[action];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Unknown assistant action', action }));
    return;
  }
  return fn(req, res);
}
