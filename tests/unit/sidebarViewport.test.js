import test from 'node:test';
import assert from 'node:assert/strict';
import { getInitialSidebarOpen, SIDEBAR_DESKTOP_QUERY, watchSidebarViewport } from '../../src/utils/sidebarViewport.js';

function fakeViewport(initialMatches) {
  let listener = null;
  const media = {
    matches: initialMatches,
    addEventListener: (event, callback) => { if (event === 'change') listener = callback; },
    removeEventListener: (event, callback) => { if (event === 'change' && listener === callback) listener = null; },
  };
  return {
    target: { matchMedia: (query) => { assert.equal(query, SIDEBAR_DESKTOP_QUERY); return media; } },
    change: (matches) => listener?.({ matches }),
    hasListener: () => Boolean(listener),
  };
}

test('le menu est fermé au démarrage mobile et ouvert sur bureau', () => {
  assert.equal(getInitialSidebarOpen(fakeViewport(false).target), false);
  assert.equal(getInitialSidebarOpen(fakeViewport(true).target), true);
});

test('le menu suit uniquement les changements de breakpoint', () => {
  const viewport = fakeViewport(false);
  const states = [];
  const stop = watchSidebarViewport((open) => states.push(open), viewport.target);

  viewport.change(true);
  viewport.change(false);
  stop();

  assert.deepEqual(states, [true, false]);
  assert.equal(viewport.hasListener(), false);
});
