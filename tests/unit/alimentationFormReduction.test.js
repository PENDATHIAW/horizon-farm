import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alimentationFields,
  deriveAlimentationValues,
  normalizeAlimentationPayload,
} from '../../src/utils/stockForms.js';

const isFood = (row = {}) => String(row.categorie || '').includes('aliment');

test('alimentation stock form — reduces manual entry on the existing modal', () => {
  const stocks = [
    {
      id: 'STK-CHAIR-001',
      produit: 'Aliment poulet chair croissance',
      categorie: 'aliment_avicole',
      quantite: 250,
      unite: 'kg',
      prix_unitaire: 320,
      fournisseur_id: 'FOU-ALIM-001',
    },
  ];
  const fournisseurs = [{ id: 'FOU-ALIM-001', nom: 'Provenderie Horizon' }];
  const lots = [{ id: 'LOT-CHAIR-001', name: 'Chair cycle 1', type: 'Chair', status: 'actif' }];
  const animaux = [{ id: 'BOV-001', name: 'Bovin 1', type: 'Bovin', status: 'actif' }];

  const fields = alimentationFields({ stocks, animaux, lots, fournisseurs, isFood });
  assert.equal(
    fields.some((field) => field.key === 'stock_id' && field.options.some((option) => option.value === 'STK-CHAIR-001')),
    true,
  );

  const derive = deriveAlimentationValues({ stocks, fournisseurs, animaux, lots, isFood });
  const values = derive({
    id: 'ALIM-001',
    date: '2026-07-11',
    stock_id: '__manual__',
    categorie: 'bovin',
    type_cible: 'categorie_animale',
    quantite: '10',
    duree_jours: '1',
    unite: '',
  }, null, {});

  assert.equal(values.stock_id, 'STK-CHAIR-001');
  assert.equal(values.produit, 'Aliment poulet chair croissance');
  assert.equal(values.fournisseur_id, 'FOU-ALIM-001');
  assert.equal(values.fournisseur_nom, 'Provenderie Horizon');
  assert.equal(values.categorie, 'chair');
  assert.equal(values.type_cible, 'lot_avicole');
  assert.equal(values.cible_id, 'LOT-CHAIR-001');
  assert.equal(values.prix_unitaire, '320');
  assert.equal(values.montant_total, '3200');
  assert.equal(values.unite, 'kg');

  const payload = normalizeAlimentationPayload(values, { stocks, fournisseurs });
  assert.equal(payload.stock_id, 'STK-CHAIR-001');
  assert.equal(payload.source_mode, 'stock');
  assert.equal(payload.quantite, 10);
  assert.equal(payload.montant_total, 3200);
  assert.equal(payload.fournisseur_nom, 'Provenderie Horizon');
});
