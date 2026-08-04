import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAGGED_MODULES } from '../../src/config/moduleFlags.js';
import {
  buildOnboardingSettings,
  getOnboardingProfile,
  isFarmOnboarded,
  listOnboardingProfiles,
  ONBOARDING_PROFILES,
  resolveOnboardingFlags,
} from '../../src/config/onboardingProfiles.js';

test('les profils de filière sont uniques et complets', () => {
  const ids = ONBOARDING_PROFILES.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants de profil uniques');
  for (const profile of ONBOARDING_PROFILES) {
    assert.ok(profile.label && profile.description, `libellés présents (${profile.id})`);
    assert.ok(Array.isArray(profile.firstSteps) && profile.firstSteps.length >= 1, `au moins un premier geste (${profile.id})`);
    for (const step of profile.firstSteps) {
      assert.ok(step.label && step.module, `geste bien formé (${profile.id})`);
    }
  }
});

test('resolveOnboardingFlags renvoie toujours un jeu complet de flags', () => {
  const flags = resolveOnboardingFlags('aviculture_chair');
  assert.deepEqual(Object.keys(flags).sort(), Object.keys(FLAGGED_MODULES).sort());
  assert.equal(flags.agri_feeds, false);
  assert.equal(flags.assistant_erp, true);
});

test('profil inconnu : flags par défaut (jeu complet, aucune exception)', () => {
  const flags = resolveOnboardingFlags('inconnu');
  assert.deepEqual(Object.keys(flags).sort(), Object.keys(FLAGGED_MODULES).sort());
  for (const [id, { actifParDefaut }] of Object.entries(FLAGGED_MODULES)) {
    assert.equal(flags[id], actifParDefaut);
  }
});

test('la filière agro-industrie active AGRI FEEDS', () => {
  assert.equal(resolveOnboardingFlags('agro_industrie').agri_feeds, true);
});

test('buildOnboardingSettings applique les flags et trace le profil sans perdre les réglages existants', () => {
  const farm = { settings: { currency: 'FCFA', modules: { smartfarm: true } } };
  const settings = buildOnboardingSettings(farm, 'culture', 0);
  assert.equal(settings.currency, 'FCFA', 'réglage existant conservé');
  assert.equal(settings.onboarding.profile, 'culture');
  assert.equal(settings.onboarding.completed_at, '1970-01-01T00:00:00.000Z');
  // le profil culture désactive smartfarm : la valeur du profil l'emporte
  assert.equal(settings.modules.smartfarm, false);
  assert.equal(settings.modules.assistant_erp, true);
});

test('buildOnboardingSettings sur profil inconnu renvoie null', () => {
  assert.equal(buildOnboardingSettings({}, 'inconnu'), null);
});

test('isFarmOnboarded reflète la présence d’un profil choisi', () => {
  assert.equal(isFarmOnboarded(null), false);
  assert.equal(isFarmOnboarded({ settings: {} }), false);
  assert.equal(isFarmOnboarded({ settings: { onboarding: { profile: 'mixte' } } }), true);
});

test('listOnboardingProfiles ne propose que pondeuses + AGRI FEEDS, getOnboardingProfile garde tout', () => {
  const visibleIds = listOnboardingProfiles().map((profile) => profile.id);
  assert.deepEqual(visibleIds, ['aviculture_ponte', 'agro_industrie']);
  // Les autres profils restent définis et récupérables (réversibilité).
  assert.ok(ONBOARDING_PROFILES.length > visibleIds.length);
  assert.equal(getOnboardingProfile('mixte').label, 'Exploitation mixte');
  assert.equal(getOnboardingProfile('aviculture_ponte').label, 'Aviculture pondeuses');
  assert.equal(getOnboardingProfile('nope'), null);
});
