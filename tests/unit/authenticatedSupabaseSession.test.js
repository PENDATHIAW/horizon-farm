import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAuthenticatedSupabaseSession } from '../../src/services/aiRecommendationsService.js';

test('refuse une session Supabase absente', async () => {
  const authenticated = await hasAuthenticatedSupabaseSession({
    getSession: async () => ({ data: { session: null }, error: null }),
  });

  assert.equal(authenticated, false);
});

test('refuse une lecture de session Supabase en erreur', async () => {
  const authenticated = await hasAuthenticatedSupabaseSession({
    getSession: async () => ({ data: { session: null }, error: new Error('indisponible') }),
  });

  assert.equal(authenticated, false);
});

test('accepte uniquement une session portant un utilisateur', async () => {
  const authenticated = await hasAuthenticatedSupabaseSession({
    getSession: async () => ({ data: { session: { user: { id: 'user-1' } } }, error: null }),
  });

  assert.equal(authenticated, true);
});
