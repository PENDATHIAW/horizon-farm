import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditBpLineLinkage,
  buildBpFinanceRepairPatch,
  findProbableFinanceLinks,
  resolveBpLineActions,
} from '../../src/utils/bpLineLinkage.js';
import { BP_LINE_STATUS } from '../../src/utils/bpLineConcretization.js';

describe('bpLineLinkage', () => {
  it('signale une ligne concrétisée sans linked_record_id ni finance', () => {
    const audit = auditBpLineLinkage({
      id: 'BPLI-1',
      designation: '3000 pondeuses',
      statut: BP_LINE_STATUS.CONCRETISE,
      montant_reel: 2700000,
    });
    assert.equal(audit.linkageIssue, 'missing_both');
    assert.match(audit.linkageMessage, /non liée/);
    assert.equal(audit.showRepairLink, true);
  });

  it('ne signale pas de problème quand actif et finance sont liés', () => {
    const audit = auditBpLineLinkage({
      id: 'BPLI-2',
      designation: '500 poussins chair',
      statut: BP_LINE_STATUS.CONCRETISE,
      linked_record_id: 'LOT-1',
      linked_finance_transaction_id: 'TRX-1',
      montant_reel: 350000,
    });
    assert.equal(audit.linkageIssue, null);
    assert.equal(audit.showViewOperation, true);
  });

  it('propose Concrétiser en action principale pour une ligne à concrétiser', () => {
    const { primary, repair } = resolveBpLineActions({
      id: 'BPLI-3',
      designation: 'Stock initial aliment',
      quantite: 1,
      prix_unitaire: 500000,
      statut: BP_LINE_STATUS.A_CONCRETISER,
      module_cible: 'achats_stock',
    });
    assert.ok(primary.some((a) => a.id === 'concretize'));
    assert.ok(!primary.some((a) => a.id === 'link_existing'));
    assert.ok(repair.some((a) => a.id === 'link_existing' && a.advanced));
  });

  it('cache Lier opération dans le menu Réparer, pas en action principale', () => {
    const { primary, repair } = resolveBpLineActions({
      id: 'BPLI-4',
      designation: 'Tracteur',
      quantite: 1,
      prix_unitaire: 8000000,
      statut: BP_LINE_STATUS.A_CONCRETISER,
    });
    assert.ok(!primary.some((a) => a.label?.includes('Lier')));
    const linkAction = repair.find((a) => a.id === 'link_existing');
    assert.ok(linkAction);
    assert.equal(linkAction.label, 'Lier une opération existante…');
  });

  it('trouve une transaction finance probable par montant et libellé', () => {
    const line = {
      id: 'BPLI-5',
      designation: '3000 poussins pondeuses',
      statut: BP_LINE_STATUS.CONCRETISE,
      montant_reel: 2700000,
    };
    const matches = findProbableFinanceLinks(line, [
      { id: 'TRX-A', montant: 1000, libelle: 'autre', source_module: 'commercial' },
      { id: 'TRX-B', montant: 2700000, libelle: '3000 poussins pondeuses', source_module: 'investissements', investment_line_id: 'BPLI-5' },
    ]);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 'TRX-B');
  });

  it('buildBpFinanceRepairPatch met à jour linked_finance_transaction_id', () => {
    const patch = buildBpFinanceRepairPatch(
      { id: 'BPLI-6', quantite: 1, prix_unitaire: 500000 },
      { id: 'TRX-C', montant: 500000 },
    );
    assert.equal(patch.linked_finance_transaction_id, 'TRX-C');
    assert.equal(patch.montant_reel, 500000);
    assert.equal(patch.reste_a_realiser, 0);
    assert.ok(patch.linkage_repaired_at);
  });
});
