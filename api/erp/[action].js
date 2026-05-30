import readHandler from '../../lib/server/erp/read.js';
import actionHandler from '../../lib/server/erp/action.js';
import auditHandler from '../../lib/server/erp/audit.js';

const HANDLERS = {
  read: readHandler,
  action: actionHandler,
  audit: auditHandler,
};

export default async function handler(req, res) {
  const action = String(req.query.action || '').trim();
  const fn = HANDLERS[action];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Unknown ERP action', action }));
    return;
  }
  return fn(req, res);
}
