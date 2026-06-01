import { sendPushToSubscriptions } from '../../lib/server/push/sendToSubscriptions.js';
import { buildNotificationPayloadFromAlert } from '../../src/services/notificationPayloads.js';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const {
      title = 'Test Horizon Farm',
      body: notifBody = 'Notification push de test.',
      severity = 'critique',
      module = 'alertes',
      localSubscriptions,
      module_source,
      entity_type,
      entity_id,
    } = body || {};

    // Dummy alert pour réutiliser le formatter existant.
    const payload = buildNotificationPayloadFromAlert(
      {
        id: `TEST-${Date.now()}`,
        title,
        message: notifBody,
        severity,
        status: 'nouvelle',
        module_source: module_source || module,
        entity_type,
        entity_id,
        action_recommandee: 'Ouvrir et vérifier Horizon Farm',
      },
    );

    const severityNorm = String(severity).toLowerCase().includes('urgence') ? 'urgence' : (String(severity).toLowerCase().includes('critique') ? 'critique' : severity);
    const result = await sendPushToSubscriptions({
      payload,
      severity: severityNorm,
      localSubscriptions,
    });

    return json(res, 200, result);
  } catch (error) {
    return json(res, 200, { ok: false, error: error?.message || 'push_test_failed' });
  }
}

