import { checkCronAuthorization } from './auth.js';

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

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return json(res, 405, { ok: false, error: 'Method not allowed' });
  const authorization = checkCronAuthorization(req);
  if (!authorization.ok) return json(res, authorization.status, { ok: false, error: authorization.error });

  try {
    const response = await fetch(`${baseUrl(req)}/api/push/check-alerts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result?.ok) {
      return json(res, 502, { ok: false, dispatched: false, error: 'Les alertes n’ont pas pu être envoyées.' });
    }
    return json(res, 200, {
      ...result,
      dispatched: Number(result.sent || 0) > 0,
    });
  } catch (error) {
    console.error('dispatch-alerts', error);
    return json(res, 500, { ok: false, dispatched: false, sent: 0, error: 'Les alertes n’ont pas pu être envoyées.' });
  }
}
