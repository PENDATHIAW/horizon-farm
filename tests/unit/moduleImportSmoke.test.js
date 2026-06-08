import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_ENTRY_POINTS } from '../../src/config/moduleEntryPoints.js';

for (const [name, loader] of Object.entries(MODULE_ENTRY_POINTS)) {
  test(`import smoke (entry point): ${name}`, async () => {
    const mod = await loader();
    assert.ok(mod?.default, `${name} should export a default component`);
  });
}
