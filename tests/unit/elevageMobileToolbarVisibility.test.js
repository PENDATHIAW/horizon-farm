import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowElevageMobileToolbar } from '../../src/modules/elevage/ElevageMobileToolbar.jsx';

test('la barre mobile reste limitée aux onglets opérationnels Élevage', () => {
  for (const tab of ['Lots & animaux', 'Alimentation élevage', 'Production élevage', 'Santé & Biosécurité']) {
    assert.equal(shouldShowElevageMobileToolbar(tab), true, tab);
  }
  for (const tab of ['Vue élevage', 'Transformation', 'Coûts & performance élevage', 'Historique élevage']) {
    assert.equal(shouldShowElevageMobileToolbar(tab), false, tab);
  }
});
