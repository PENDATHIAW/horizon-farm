import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFundingDossierSections,
  buildProfessionalFundingDossierPdf,
  formatFundingAmount,
  sanitizeInstitutionalText,
} from '../../src/services/investorForums/fundingDossierPdf.js';
import { buildForumPack, renderForumPackPdfBlob, FORUM_PACK_TYPES } from '../../src/services/investorForums/forumPackBuilder.js';
import { mergeInvestorForumProfile, EMPTY_MANUAL_CONTENT } from '../../src/services/investorForums/mergeInvestorForumProfile.js';
import { applyInvestorRoomDefaults } from '../../src/services/investorForums/investorRoomDefaults.js';
import { buildInvestorForumProfile } from '../../src/services/investorForums/investorProfileService.js';
import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';

const sampleCrud = {
  animaux: { rows: [{ id: 'A1', type: 'bovin', statut: 'actif' }] },
  avicole: { rows: [{ id: 'L1', type: 'Pondeuses', initial_count: 3000, mortality: 0, statut: 'actif' }] },
  sales_orders: { rows: [{ id: 'V1', montant_total: 500000 }] },
  payments: { rows: [{ id: 'P1', montant_paye: 200000 }] },
  documents: { rows: [{ id: 'D1' }] },
  clients: { rows: [{ id: 'C1' }] },
};

function mergedProfile() {
  const dataMap = composeDecisionDataMap({ crud: sampleCrud, dataMap: {} });
  const auto = buildInvestorForumProfile({ crud: sampleCrud, dataMap });
  return mergeInvestorForumProfile(auto, applyInvestorRoomDefaults(EMPTY_MANUAL_CONTENT));
}

test('sanitizeInstitutionalText retire le jargon ERP et IA', () => {
  const text = sanitizeInstitutionalText('Pilotage ERP avec Hey Horizon AI, Smart Farm et agriculture intelligente.');
  assert.ok(!/\bERP\b/i.test(text));
  assert.ok(!/Hey Horizon/i.test(text));
  assert.ok(!/Smart Farm/i.test(text));
  assert.ok(!/agriculture intelligente/i.test(text));
});

test('formatFundingAmount utilise espaces insécables FCFA', () => {
  assert.equal(formatFundingAmount(0), null);
  const formatted = formatFundingAmount(26064000);
  assert.ok(formatted.includes('FCFA'));
  assert.ok(/26[\s\u00a0\u202f]?064/.test(formatted));
});

test('buildFundingDossierSections contient sections institutionnelles enrichies', () => {
  const pack = buildForumPack(mergedProfile(), { packType: 'dossier_banque', audienceKey: 'banque' });
  const sections = buildFundingDossierSections(pack);
  assert.ok(sections.length >= 17);
  assert.ok(sections.some((s) => s.title === 'Le parcours de la fondatrice'));
  assert.ok(sections.some((s) => s.title === 'Pourquoi Horizon Farm ?'));
  assert.ok(sections.some((s) => s.title === 'Pourquoi financer Horizon Farm ?'));
  assert.ok(sections.some((s) => s.title === 'Impact économique'));
  assert.ok(sections.some((s) => s.title === 'Impact social'));
  assert.ok(!sections.some((s) => s.title.includes('Innovation IA')));
});

test('sections dossier sans valeurs nulles ni jargon ERP', () => {
  const profile = mergedProfile();
  profile.keyFigures = { ...profile.keyFigures, ca_erp: 0, documents: 0, clients: 0, encaissements: 0 };
  const pack = buildForumPack(profile, { packType: 'dossier_investisseur' });
  const body = pack.sections.map((s) => s.body).join('\n');
  assert.ok(!body.includes('0 FCFA'));
  assert.ok(!/\bERP\b/.test(body));
  assert.ok(!/Tabaski|Magal|Gamou/i.test(body));
});

test('dossier banque atteint minimum 15 pages de contenu', () => {
  const pack = buildForumPack(mergedProfile(), { packType: 'dossier_banque' });
  const { doc } = buildProfessionalFundingDossierPdf(pack);
  assert.ok(doc.internal.getNumberOfPages() >= 15);
});

test('renderForumPackPdfBlob dossier banque produit un PDF volumineux', () => {
  const pack = buildForumPack(mergedProfile(), { packType: 'dossier_banque' });
  const { blob, filename } = renderForumPackPdfBlob(pack);
  assert.ok(blob);
  assert.ok(blob.size > 8000);
  assert.ok(filename.includes('dossier-banque'));
});

test('FORUM_PACK_TYPES inclut dossiers institutionnels', () => {
  assert.ok(FORUM_PACK_TYPES.dossier_banque);
  assert.ok(FORUM_PACK_TYPES.dossier_ong);
  assert.ok(FORUM_PACK_TYPES.dossier_subvention);
});
