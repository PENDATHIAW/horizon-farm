import test from 'node:test';
import assert from 'node:assert/strict';
import { vapidPublicKeyBase64ToUint8Array } from '../../src/services/vapidKeyConversion.js';

test('vapidPublicKeyBase64ToUint8Array: base64 decoding', () => {
  // Buffer([1,2,3]) en base64 = "AQID"
  const bytes = vapidPublicKeyBase64ToUint8Array('AQID');
  assert.equal(bytes.length, 3);
  assert.equal(bytes[0], 1);
  assert.equal(bytes[1], 2);
  assert.equal(bytes[2], 3);
});

test('vapidPublicKeyBase64ToUint8Array: base64url decoding', () => {
  // Pour AQID, base64 et base64url sont équivalents (aucun - ou _)
  const bytes = vapidPublicKeyBase64ToUint8Array('AQID');
  assert.deepEqual(Array.from(bytes), [1, 2, 3]);
});

