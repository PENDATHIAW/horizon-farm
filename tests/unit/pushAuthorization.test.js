import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCronAuthorization } from '../../lib/server/push/auth.js';

function withCronSecret(value, callback) {
  const previous = process.env.CRON_SECRET;
  if (value === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = value;
  try { callback(); } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
}

test('les envois automatiques sont arrêtés tant que leur protection manque', () => {
  withCronSecret(undefined, () => {
    const result = checkCronAuthorization({ headers: {} });
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
  });
});

test('seul le bon en-tête autorise un envoi automatique', () => {
  withCronSecret('secret-123', () => {
    assert.equal(checkCronAuthorization({ headers: { authorization: 'Bearer secret-123' } }).ok, true);
    assert.equal(checkCronAuthorization({ headers: { authorization: 'Bearer faux' } }).status, 401);
    assert.equal(checkCronAuthorization({ headers: {}, query: { secret: 'secret-123' } }).status, 401);
  });
});
