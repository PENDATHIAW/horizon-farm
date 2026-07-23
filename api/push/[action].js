import subscribeHandler from '../../lib/server/push/subscribe.js';
import sendHandler from '../../lib/server/push/send.js';
import latestAlertHandler from '../../lib/server/push/latest-alert.js';
import dispatchAlertsHandler from '../../lib/server/push/dispatch-alerts.js';
import digestHandler from '../../lib/server/push/digest.js';
import sendAlertHandler from '../../lib/server/push/send-alert.js';
import checkAlertsHandler from '../../lib/server/push/check-alerts.js';
import unsubscribeHandler from '../../lib/server/push/unsubscribe.js';

const HANDLERS = {
  subscribe: subscribeHandler,
  send: sendHandler,
  test: sendHandler,
  unsubscribe: unsubscribeHandler,
  'latest-alert': latestAlertHandler,
  'dispatch-alerts': dispatchAlertsHandler,
  digest: digestHandler,
  'send-alert': sendAlertHandler,
  'check-alerts': checkAlertsHandler,
};

export default async function handler(req, res) {
  const action = String(req.query.action || '').trim();
  const fn = HANDLERS[action];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Unknown push action', action }));
    return;
  }
  return fn(req, res);
}
