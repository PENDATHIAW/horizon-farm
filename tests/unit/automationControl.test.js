import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTOMATIC_WRITE_MODES,
  resolveAutomaticWriteMode,
} from '../../src/utils/automationControl.js';
import { areServerAutomationsEnabled } from '../../lib/server/automationControl.js';

test('les anciens moteurs restent en observation sans activation explicite', () => {
  assert.equal(resolveAutomaticWriteMode(''), AUTOMATIC_WRITE_MODES.OBSERVE);
  assert.equal(resolveAutomaticWriteMode('observe'), AUTOMATIC_WRITE_MODES.OBSERVE);
  assert.equal(resolveAutomaticWriteMode('on'), AUTOMATIC_WRITE_MODES.ON);
});

test('l’interrupteur serveur peut suspendre tous les traitements concernés', () => {
  const previous = process.env.AUTOMATIONS_ENABLED;
  process.env.AUTOMATIONS_ENABLED = 'false';
  assert.equal(areServerAutomationsEnabled(), false);
  process.env.AUTOMATIONS_ENABLED = 'true';
  assert.equal(areServerAutomationsEnabled(), true);
  if (previous === undefined) delete process.env.AUTOMATIONS_ENABLED;
  else process.env.AUTOMATIONS_ENABLED = previous;
});
