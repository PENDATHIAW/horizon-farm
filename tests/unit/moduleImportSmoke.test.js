import test from 'node:test';
import assert from 'node:assert/strict';
import { entryPointSource, MODULE_ENTRY_POINTS } from '../../src/config/moduleEntryPoints.js';

test('chaque entry point canonique est importable', async () => {
  const checkedSources = new Set();
  const failures = [];
  for (const [name, loader] of Object.entries(MODULE_ENTRY_POINTS)) {
    const source = entryPointSource(name);
    if (checkedSources.has(source)) continue;
    checkedSources.add(source);
    try {
      const mod = await loader();
      if (!mod?.default) failures.push(`${name}: export default absent`);
    } catch (error) {
      failures.push(`${name}: ${error.message}`);
    }
  }
  assert.ok(checkedSources.size >= 17, `Seulement ${checkedSources.size} entry points canoniques contrôlés`);
  assert.deepEqual(failures, []);
});
