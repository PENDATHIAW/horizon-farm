import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveContractPrefill,
  buildQuickEntryFields,
} from '../../src/utils/formContract20sPrefill.js';
import { REGISTRE_PAR_ID } from '../../src/config/formulaires20s.config.js';

test('date et utilisateur préremplis (contrat standard)', () => {
  const { values, provenance } = resolveContractPrefill({ formId: 'ponte', context: { user: 'Awa' } });
  assert.ok(values.date, 'date du jour préremplie');
  assert.equal(values.responsable, 'Awa');
  assert.equal(provenance.responsable, 'utilisateur_connecte');
});

test('lot unique auto : préselectionné si un seul lot ouvert', () => {
  const data = { avicole: [{ id: 'HF-PO-001', type: 'Pondeuse', status: 'en_ponte' }] };
  const { values } = resolveContractPrefill({ formId: 'ponte', data, context: {} });
  assert.equal(values.lot, 'HF-PO-001');
});

test('lot unique auto : PAS de préselection si plusieurs lots ouverts', () => {
  const data = { avicole: [{ id: 'A', status: 'en_ponte' }, { id: 'B', status: 'en_ponte' }] };
  const { values } = resolveContractPrefill({ formId: 'ponte', data, context: {} });
  assert.equal('lot' in values, false, 'ambigu = on ne devine pas');
});

test('lot unique auto : ignore les lots clos', () => {
  const data = { avicole: [{ id: 'A', status: 'vendu' }, { id: 'B', status: 'en_ponte' }] };
  const { values } = resolveContractPrefill({ formId: 'ponte', data, context: {} });
  assert.equal(values.lot, 'B', 'seul le lot actif compte');
});

test('vente : dernier client et dernier prix hérités', () => {
  const data = {
    sales_orders: [
      { id: 'V1', client_id: 'C1', prix_vente_unitaire: 2000, date: '2026-07-01' },
      { id: 'V2', client_id: 'C2', prix_vente_unitaire: 2600, date: '2026-07-10' },
    ],
  };
  const { values } = resolveContractPrefill({ formId: 'vente', data, context: {} });
  assert.equal(values.client, 'C2', 'dernier client');
  assert.equal(values.prix, 2600, 'dernier prix');
});

test('réception : dernier fournisseur et dernier prix hérités', () => {
  const data = {
    fournisseurs: [{ id: 'F1', nom: 'Sedima' }, { id: 'F2', nom: 'NMA' }],
    sales_orders: [{ id: 'V', prix_vente_unitaire: 12500, date: '2026-07-05' }],
  };
  const { values } = resolveContractPrefill({ formId: 'reception', data, context: {} });
  assert.equal(values.fournisseur, 'F2', 'dernier fournisseur sur un formulaire qui le déclare');
  assert.equal(values.prix, 12500);
});

test('on ne remplit jamais un champ hors du contrat du formulaire', () => {
  // 'ponte' ne déclare ni fournisseur ni client dans champsRequis/champsReplies
  const data = { fournisseurs: [{ id: 'F1' }], sales_orders: [{ id: 'V', client_id: 'C', date: '2026-07-01' }] };
  const { values } = resolveContractPrefill({ formId: 'ponte', data, context: {} });
  assert.equal('fournisseur' in values, false);
  assert.equal('client' in values, false);
});

test('buildQuickEntryFields : fusionne sans écraser la base', () => {
  const data = { avicole: [{ id: 'L1', status: 'en_ponte' }] };
  const { fields } = buildQuickEntryFields({ formId: 'ponte', data, context: { user: 'Awa' }, base: { source: 'test', lot: 'DEJA' } });
  assert.equal(fields.lot, 'DEJA', 'la base (saisie) prime');
  assert.equal(fields.responsable, 'Awa');
  assert.equal(fields.source, 'test');
});

test('formId inconnu : aucun préremplissage, pas de crash', () => {
  const { values, appliedStrategies } = resolveContractPrefill({ formId: 'inexistant', data: {}, context: {} });
  assert.deepEqual(values, {});
  assert.equal(appliedStrategies.length, 0);
});

test('chaque formulaire du registre est résoluble sans erreur', () => {
  for (const formId of Object.keys(REGISTRE_PAR_ID)) {
    assert.doesNotThrow(() => resolveContractPrefill({ formId, data: {}, context: { user: 'X' } }));
  }
});
