import test from 'node:test';
import assert from 'node:assert/strict';
import VisionCroissanceModule from '../../src/modules/VisionCroissanceModule.jsx';
import CentreIA from '../../src/modules/CentreIA.jsx';
import ObjectifsCroissanceV2 from '../../src/modules/ObjectifsCroissanceV2.jsx';
import ElevageRecoveredModule from '../../src/modules/ElevageRecoveredModule.jsx';
import GestionSystemeUnified from '../../src/modules/GestionSystemeUnified.jsx';
import SyncActivityCenter from '../../src/modules/SyncActivityCenter.jsx';
import DocumentsV2 from '../../src/modules/DocumentsV2.jsx';
import DashboardV2 from '../../src/modules/DashboardV2.jsx';
import CommercialModule from '../../src/modules/CommercialModule.jsx';
import FinancePilotageModule from '../../src/modules/FinancePilotageModule.jsx';
import StocksV5 from '../../src/modules/StocksV5.jsx';
import RHV2 from '../../src/modules/RHV2.jsx';

const modules = [
  ['VisionCroissanceModule', VisionCroissanceModule],
  ['CentreIA', CentreIA],
  ['ObjectifsCroissanceV2', ObjectifsCroissanceV2],
  ['ElevageRecoveredModule', ElevageRecoveredModule],
  ['GestionSystemeUnified', GestionSystemeUnified],
  ['SyncActivityCenter', SyncActivityCenter],
  ['DocumentsV2', DocumentsV2],
  ['DashboardV2', DashboardV2],
  ['CommercialModule', CommercialModule],
  ['FinancePilotageModule', FinancePilotageModule],
  ['StocksV5', StocksV5],
  ['RHV2', RHV2],
];

for (const [name, mod] of modules) {
  test(`import smoke: ${name}`, () => {
    assert.ok(mod, `${name} should export a default component`);
  });
}
