import { handleCreateLink } from '../../lib/server/mobileMoney/createLink.js';
import { requireMobileMoneyUser } from '../../lib/server/mobileMoney/auth.js';
import { handlePaymentStatus, handleSimulateConfirm, handleWebhook } from '../../lib/server/mobileMoney/status.js';
import { requireServerAutomations } from '../../lib/server/automationControl.js';

export const config = { api: { bodyParser: false } };

const send = (res, status, payload) => res.status(status).json(payload);

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

function parseJson(rawBody) {
  if (!rawBody) return {};
  return JSON.parse(rawBody);
}

export default async function handler(req, res) {
  const action = String(req.query.action || '').trim();

  try {
    if (action === 'create-link' && req.method === 'POST') {
      requireServerAutomations();
      const rawBody = await readRawBody(req);
      const context = await requireMobileMoneyUser(req);
      return send(res, 200, await handleCreateLink(parseJson(rawBody), context));
    }

    if (action === 'status' && (req.method === 'GET' || req.method === 'POST')) {
      const rawBody = req.method === 'POST' ? await readRawBody(req) : '';
      const body = parseJson(rawBody);
      const context = await requireMobileMoneyUser(req);
      const ref = String(req.query.ref || body.ref || '').trim();
      return send(res, 200, await handlePaymentStatus(ref, context));
    }

    if (action === 'simulate-confirm' && req.method === 'POST') {
      requireServerAutomations();
      const rawBody = await readRawBody(req);
      const body = parseJson(rawBody);
      const context = await requireMobileMoneyUser(req);
      const ref = String(body.ref || req.query.ref || '').trim();
      return send(res, 200, await handleSimulateConfirm(ref, context));
    }

    if (action === 'webhook' && req.method === 'POST') {
      requireServerAutomations();
      const rawBody = await readRawBody(req);
      return send(res, 200, await handleWebhook(parseJson(rawBody), req.headers || {}, rawBody));
    }

    res.setHeader('Allow', 'POST, GET');
    return send(res, 404, { ok: false, error: 'Cette action est introuvable.' });
  } catch (error) {
    const status = Number(error?.statusCode || (error instanceof SyntaxError ? 400 : 500));
    console.error('mobile-money', action, error);
    const message = status >= 500
      ? 'Le paiement mobile n’est pas disponible pour le moment.'
      : (error?.message || 'Le paiement n’a pas pu être traité.');
    return send(res, status, { ok: false, error: message, code: error?.code || 'payment_error' });
  }
}
