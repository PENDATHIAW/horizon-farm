import test from 'node:test';
import assert from 'node:assert/strict';
import { isPushSupported } from '../../src/services/pushNotifications.js';

test('isPushSupported retourne false en environnement Node', () => {
  // En tests unitaires Node, window/navigator n’existent pas (ou sont non conformes).
  assert.equal(isPushSupported(), false);
});

