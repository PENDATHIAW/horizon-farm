import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWhatsappMessage, buildWhatsappShareUrl, normalizePhone } from '../../src/utils/whatsappShare.js';
import { shouldCreateTask, shouldNotifyScreen, shouldOfferWhatsapp, normalizeSeverity } from '../../src/config/alertPolicy.js';

test('alertPolicy — urgence et critique déclenchent tâche + écran + whatsapp', () => {
  for (const severity of ['urgence', 'critique']) {
    assert.equal(shouldCreateTask({ severity }), true);
    assert.equal(shouldNotifyScreen({ severity }), true);
    assert.equal(shouldOfferWhatsapp({ severity }), true);
  }
});

test('alertPolicy — warning et info ne déclenchent aucun effet secondaire', () => {
  for (const severity of ['warning', 'info']) {
    assert.equal(shouldCreateTask({ severity }), false);
    assert.equal(shouldNotifyScreen({ severity }), false);
    assert.equal(shouldOfferWhatsapp({ severity }), false);
  }
});

test('normalizeSeverity — mappe les libellés hétérogènes', () => {
  assert.equal(normalizeSeverity('haute'), 'critique');
  assert.equal(normalizeSeverity('critical'), 'critique');
  assert.equal(normalizeSeverity('urgent'), 'urgence');
  assert.equal(normalizeSeverity('vigilance'), 'warning');
  assert.equal(normalizeSeverity('n_importe_quoi'), 'info');
});

test('buildWhatsappMessage — inclut titre, action et module', () => {
  const msg = buildWhatsappMessage({ severity: 'critique', title: 'Mortalité élevée', message: '6% de mortalité', action_recommandee: 'Contrôle santé', module_source: 'elevage' });
  assert.match(msg, /CRITIQUE/);
  assert.match(msg, /Mortalité élevée/);
  assert.match(msg, /Action : Contrôle santé/);
  assert.match(msg, /Module : elevage/);
});

test('buildWhatsappShareUrl — avec et sans numéro', () => {
  const withPhone = buildWhatsappShareUrl({ title: 'Test' }, '+221 77 123 45 67');
  assert.match(withPhone, /^https:\/\/wa\.me\/221771234567\?text=/);
  const without = buildWhatsappShareUrl({ title: 'Test' });
  assert.match(without, /^https:\/\/wa\.me\/\?text=/);
});

test('normalizePhone — ne garde que les chiffres', () => {
  assert.equal(normalizePhone('+221 77-123-4567'), '221771234567');
  assert.equal(normalizePhone(''), '');
});
