function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function baseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

function authorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  return token === secret || req.query?.secret === secret;
}

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'Method not allowed' });
  if (!authorized(req)) return json(res, 401, { ok: false, error: 'Unauthorized' });

  try {
    const root = baseUrl(req);
    const latestResponse = await fetch(`${root}/api/push/latest-alert`, { cache: 'no-store' });
    const latest = latestResponse.ok ? await latestResponse.json() : null;

    if (!latest?.ok) {
      return json(res, 200, { ok: true, sent: 0, reason: latest?.reason || 'no_active_alert' });
    }

    const sendResponse = await fetch(`${root}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: latest.title,
        body: latest.body,
        message: latest.body,
        severity: latest.severity || 'critique',
        module: latest.module || 'alertes',
        action: latest.action || '',
        focus: latest.focus || '',
        alert_id: latest.alert_id || latest.id || '',
        entity_id: latest.entity_id || '',
        tag: latest.tag || latest.alert_id || latest.id || 'horizon-farm-alert',
        requireInteraction: latest.requireInteraction !== false,
        url: latest.url || `/?module=${latest.module || 'alertes'}`,
      }),
    });
    const sent = sendResponse.ok ? await sendResponse.json() : { ok: false, error: 'send_failed' };

    return json(res, 200, {
      ok: true,
      dispatched: true,
      latest: { title: latest.title, module: latest.module, severity: latest.severity, alert_id: latest.alert_id || latest.id },
      send: sent,
    });
  } catch (error) {
    return json(res, 200, { ok: true, dispatched: false, sent: 0, error: error.message || 'dispatch_failed' });
  }
}
