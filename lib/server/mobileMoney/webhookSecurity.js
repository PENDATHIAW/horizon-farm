import { createHmac, timingSafeEqual } from 'node:crypto';

const clean = (value = '') => String(value || '').trim();

function secureEqual(left, right) {
  const a = Buffer.from(clean(left));
  const b = Buffer.from(clean(right));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export function verifyWaveWebhookSignature({
  rawBody = '',
  signature = '',
  secret = '',
  nowSeconds = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
} = {}) {
  if (!rawBody || !signature || !secret) return false;

  const parts = String(signature).split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) || '';
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter(Boolean);
  const timestampNumber = Number(timestamp);

  if (!Number.isFinite(timestampNumber) || signatures.length === 0) return false;
  if (Math.abs(Number(nowSeconds) - timestampNumber) > Number(toleranceSeconds)) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}${rawBody}`)
    .digest('hex');
  return signatures.some((candidate) => secureEqual(candidate, expected));
}

export function verifySharedWebhookSecret(headers = {}, secret = '') {
  if (!secret) return false;
  const authorization = headers.authorization || headers.Authorization || '';
  const bearer = String(authorization).match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const direct = headers['x-webhook-secret'] || headers['X-Webhook-Secret'] || '';
  return secureEqual(bearer || direct, secret);
}
