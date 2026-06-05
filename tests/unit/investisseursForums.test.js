import test from 'node:test';
import assert from 'node:assert/strict';

import { composeDecisionDataMap } from '../../src/services/moduleDataComposer.js';
import { buildInvestorForumProfile, HORIZON_FARM_TAGLINE } from '../../src/services/investorForums/investorProfileService.js';
import { computeForumReadinessScore, PREPARATION_CHECKLIST } from '../../src/services/investorForums/forumReadinessScore.js';
import { adaptProfileForAudience, FORUM_AUDIENCES } from '../../src/services/investorForums/forumAudienceAdapter.js';
import { buildForumPack, forumPackToExportPayload, FORUM_PACK_TYPES, renderForumPackPdfBlob } from '../../src/services/investorForums/forumPackBuilder.js';
import { mergeInvestorForumProfile, EMPTY_MANUAL_CONTENT } from '../../src/services/investorForums/mergeInvestorForumProfile.js';

const emptyCrud = {};
const sampleCrud = {
  animaux: { rows: [{ id: 'A1', type: 'bovin', statut: 'actif' }] },
  avicole: { rows: [{ id: 'L1', type: 'Pondeuses', initial_count: 3000, mortality: 0, statut: 'actif' }] },
  sales_orders: { rows: [{ id: 'V1', montant_total: 500000 }] },
  payments: { rows: [{ id: 'P1', montant_paye: 200000 }] },
  documents: { rows: [{ id: 'D1' }, { id: 'D2' }, { id: 'D3' }] },
  clients: { rows: [{ id: 'C1' }] },
  business_plans: { rows: [{ id: 'BP1', nom: 'Horizon Farm' }] },
};

test('buildInvestorForumProfile expose tagline et sections', () => {
  const profile = buildInvestorForumProfile({ crud: emptyCrud, dataMap: composeDecisionDataMap({ crud: emptyCrud, dataMap: {} }) });
  assert.equal(profile.tagline, HORIZON_FARM_TAGLINE);
  assert.equal(profile.readOnly, true);
  assert.ok(profile.projectSummary?.title);
  assert.ok(Array.isArray(profile.activities) && profile.activities.length === 4);
  assert.ok(profile.founderProfile?.name);
  assert.ok(profile.investorReady?.readiness_score >= 0);
});

test('buildInvestorForumProfile lit données ERP réelles', () => {
  const dataMap = composeDecisionDataMap({ crud: sampleCrud, dataMap: {} });
  const profile = buildInvestorForumProfile({ crud: sampleCrud, dataMap });
  assert.ok(profile.keyFigures.ca_erp > 0);
  assert.ok(profile.keyFigures.documents >= 3);
  assert.ok(profile.activities.some((a) => a.id === 'pondeuses'));
});

test('adaptProfileForAudience adapte selon cible', () => {
  const profile = buildInvestorForumProfile({ crud: sampleCrud, dataMap: composeDecisionDataMap({ crud: sampleCrud, dataMap: {} }) });
  const bank = adaptProfileForAudience(profile, 'banque');
  const ong = adaptProfileForAudience(profile, 'ong_subvention');
  assert.equal(bank.audience.id, 'banque');
  assert.equal(ong.audience.id, 'ong_subvention');
  assert.notEqual(bank.executiveSummary, ong.executiveSummary);
  assert.ok(bank.highlights.length > 0);
});

test('computeForumReadinessScore produit checklist', () => {
  const profile = buildInvestorForumProfile({ crud: sampleCrud, dataMap: composeDecisionDataMap({ crud: sampleCrud, dataMap: {} }) });
  const readiness = computeForumReadinessScore(profile);
  assert.ok(readiness.score >= 0 && readiness.score <= 100);
  assert.ok(readiness.label);
  assert.ok(Array.isArray(readiness.checklist));
  assert.ok(readiness.checklist.length >= 5);
});

test('buildForumPack et payload export', () => {
  const profile = buildInvestorForumProfile({ crud: sampleCrud, dataMap: composeDecisionDataMap({ crud: sampleCrud, dataMap: {} }) });
  const pack = buildForumPack(profile, { audienceKey: 'investisseur_prive', packType: 'rapport_financier' });
  assert.equal(pack.packType.id, 'rapport_financier');
  assert.ok(pack.sections.length >= 8);
  const payload = forumPackToExportPayload(pack);
  assert.equal(payload.module, 'Investisseurs & Forums');
  assert.ok(payload.labels.length > 0);
});

test('mergeInvestorForumProfile conserve keyFigures auto', () => {
  const profile = buildInvestorForumProfile({ crud: sampleCrud, dataMap: composeDecisionDataMap({ crud: sampleCrud, dataMap: {} }) });
  const caBefore = profile.keyFigures.ca_erp;
  const merged = mergeInvestorForumProfile(profile, {
    ...EMPTY_MANUAL_CONTENT,
    project_pitch: 'Pitch personnalisé Horizon Farm pour investisseurs.',
    location: 'Thiès, Sénégal',
    vision: 'Devenir la référence avicole-bovine pilotée par la donnée au Sénégal.',
    mission: 'Produire localement avec traçabilité ERP et impact social mesurable.',
  });
  assert.equal(merged.keyFigures.ca_erp, caBefore);
  assert.ok(merged.projectSummary.pitch.includes('Pitch personnalisé'));
  assert.equal(merged.projectSummary.location, 'Thiès, Sénégal');
  assert.ok(merged.projectSummary.vision.includes('référence'));
});

test('computeForumReadinessScore inclut checklist préparation', () => {
  const profile = mergeInvestorForumProfile(
    buildInvestorForumProfile({ crud: sampleCrud, dataMap: composeDecisionDataMap({ crud: sampleCrud, dataMap: {} }) }),
    { ...EMPTY_MANUAL_CONTENT, project_pitch: 'Résumé long du projet pour les forums internationaux.' },
  );
  const readiness = computeForumReadinessScore(profile, { exportCount: 1 });
  assert.ok(readiness.preparation.length >= PREPARATION_CHECKLIST.length);
  assert.ok(readiness.prep_ok_count >= 1);
});

test('renderForumPackPdfBlob produit un blob', () => {
  const profile = buildInvestorForumProfile({ crud: sampleCrud, dataMap: composeDecisionDataMap({ crud: sampleCrud, dataMap: {} }) });
  const pack = buildForumPack(profile, { packType: 'fiche_projet' });
  const { blob, filename } = renderForumPackPdfBlob(pack);
  assert.ok(blob);
  assert.ok(filename.endsWith('.pdf'));
});

test('FORUM_AUDIENCES couvre les cibles demandées', () => {
  assert.ok(FORUM_AUDIENCES.investisseur_prive);
  assert.ok(FORUM_AUDIENCES.banque);
  assert.ok(FORUM_AUDIENCES.ong_subvention);
  assert.ok(FORUM_AUDIENCES.salon_agricole);
  assert.ok(FORUM_AUDIENCES.partenaire_technique);
  assert.ok(FORUM_PACK_TYPES.fiche_projet);
  assert.ok(FORUM_PACK_TYPES.dossier_investisseur);
  assert.ok(FORUM_PACK_TYPES.pitch_deck);
});
