import writeAuditRoadmap from '../../lib/server/erp-agent/write-audit-roadmap.js';
import applyCorrection from '../../lib/server/erp-agent/apply-correction.js';

const HANDLERS = {
  'write-audit-roadmap': writeAuditRoadmap,
  'apply-correction': applyCorrection,
};

export default async function handler(req, res) {
  const action = String(req.query.action || '').trim();
  const fn = HANDLERS[action];
  if (!fn) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Unknown ERP agent action', action }));
    return;
  }
  return fn(req, res);
}
