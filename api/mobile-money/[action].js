import { handleCreateLink } from '../../lib/server/mobileMoney/createLink.js';
import { handlePaymentStatus, handleSimulateConfirm, handleWebhook } from '../../lib/server/mobileMoney/status.js';

const send = (res, status, payload) => res.status(status).json(payload);

export default async function handler(req, res) {
  const action = String(req.query.action || '').trim();

  try {
    if (action === 'create-link' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const result = await handleCreateLink(body);
      return send(res, 200, result);
    }

    if (action === 'status' && (req.method === 'GET' || req.method === 'POST')) {
      const ref = String(req.query.ref || req.body?.ref || '').trim();
      const result = await handlePaymentStatus(ref);
      return send(res, 200, result);
    }

    if (action === 'simulate-confirm' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const ref = String(body.ref || req.query.ref || '').trim();
      const result = await handleSimulateConfirm(ref);
      return send(res, 200, result);
    }

    if (action === 'webhook' && req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const result = await handleWebhook(body, req.headers || {});
      return send(res, 200, result);
    }

    res.setHeader('Allow', 'POST, GET');
    return send(res, 404, { ok: false, error: 'Unknown mobile-money action', action });
  } catch (error) {
    console.error('mobile-money', action, error);
    return send(res, 500, { ok: false, error: error.message || 'Erreur mobile money' });
  }
}
