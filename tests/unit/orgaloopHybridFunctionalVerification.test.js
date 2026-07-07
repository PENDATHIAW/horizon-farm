/**
 * Vérification fonctionnelle — stratégie hybride Orgaloop + DER/FJ
 * Cas réaliste : effluents disponibles, cultures fertilisées, surplus Orgaloop vendu.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeGreenpreneursMetrics } from '../../src/services/greenpreneurs/greenpreneursMetrics.js';
import { computeOrgaloopEffluentMetrics } from '../../src/services/greenpreneurs/orgaloopEffluentChannel.js';

/** Jeu de données ERP — scénario Penda / Horizon Farm */
const HYBRID_SCENARIO = {
  stocks: [
    { categorie: 'fumier', quantite: 20, produit: 'Fumier bovin' },
    { categorie: 'fiente', quantite: 8, produit: 'Fientes pondeuses' },
  ],
  cultures: [
    { id: 'p1', nom: 'Parcelle tomates', fumier_utilise: 5 },
    { id: 'p2', nom: 'Parcelle poivrons', quantite_fumier: 3 },
  ],
  business_events: [
    { event_type: 'effluent_produit', quantity: 600 },
    { event_type: 'fumier_collecte', quantity: 200 },
    { event_type: 'effluent_utilise_culture', quantity: 300, entity_id: 'p1' },
    { event_type: 'parcelle_fertilisee', quantity: 1, entity_id: 'p1' },
    { event_type: 'parcelle_fertilisee', quantity: 1, entity_id: 'p2' },
    { event_type: 'engrais_chimique_evite', estimated_savings_fcfa: 85000 },
    {
      event_type: 'effluent_vendu_orgaloop',
      source_record_id: 's-org-1',
      entity_id: 's-org-1',
      quantity: 200,
      montant: 45000,
      canal: 'orgaloop',
    },
  ],
  sales_orders: [
    {
      id: 's-org-1',
      product_name: 'Fumier bovin surplus',
      canal: 'orgaloop',
      quantite: 8,
      unite: 'sac',
      montant_total: 45000,
    },
  ],
  payments: [{ sale_id: 's-org-1', montant_paye: 45000 }],
};

/** Miroir du texte annexe FinancingDossierGenerator (section DER). */
function buildDerAnnexText(gp) {
  const orgaloop = gp.circular.orgaloop || {};
  const money = (v) => `${Math.round(v).toLocaleString('fr-FR')} FCFA`;
  const hybridAnnex = gp.circular.orgaloopHybrid || gp.circular.orgaloopPrimary
    ? ` Stratégie hybride : fertilisation cultures prioritaire. Surplus ${orgaloop.platformName || 'Orgaloop'} : ${Math.round(orgaloop.soldKg || 0)} kg, ${money(orgaloop.revenueFcfa || 0)} CA, ${orgaloop.salesCount || 0} vente(s). Parcelles fertilisées : ${gp.circular.parcellesFertilisees}. Utilisé cultures : ${Math.round(gp.circular.usedOnCulturesKg || 0)} kg.${gp.circular.effluentSurplusKg > 0 ? ` Surplus effluent restant : ${Math.round(gp.circular.effluentSurplusKg)} kg.` : ''}`
    : '';
  return `Score ${gp.readiness.total}/100 — ${gp.readiness.statusLabel}.${hybridAnnex} Économies engrais : ${money(gp.circular.engraisSavingsFcfa)}. Parcelles fertilisées : ${gp.circular.parcellesFertilisees}.`;
}

function buildDerImpactSnippet(gp) {
  const orgaloop = gp.circular.orgaloop || {};
  const orgaloopLine = orgaloop.soldKg > 0
    ? ` Fertilisation cultures + surplus ${orgaloop.platformName || 'Orgaloop'} : ${Math.round(orgaloop.soldKg)} kg vendus (${orgaloop.revenueFcfa?.toLocaleString('fr-FR') || 0} FCFA).`
    : '';
  return `Score Greenpreneurs DER/FJ : ${gp.readiness.total}/100 (${gp.readiness.statusLabel}).${orgaloopLine} Impact environnemental : ${gp.circular.engraisSavingsFcfa.toLocaleString('fr-FR')} FCFA d'économies engrais estimées, ${gp.circular.parcellesFertilisees} parcelle(s) fertilisée(s)`;
}

test('VF-1 — scénario hybride : effluents + cultures fertilisées + surplus Orgaloop', () => {
  const gp = computeGreenpreneursMetrics(HYBRID_SCENARIO);

  assert.equal(gp.circular.hasRealData, true);
  assert.ok(gp.circular.fumierBovin.availableKg > 0, 'fumier disponible');
  assert.ok(gp.circular.fientesPondeuses.availableKg > 0, 'fientes disponibles');
  assert.ok(gp.circular.usedOnCulturesKg >= 300, `utilisé sur cultures (${gp.circular.usedOnCulturesKg} kg)`);
  assert.equal(gp.circular.parcellesFertilisees, 2, 'parcelles fertilisées');
  assert.equal(gp.circular.engraisSavingsFcfa, 85000);
  assert.equal(gp.circular.orgaloopHybrid, true);
  assert.equal(gp.circular.orgaloop.soldKg, 200, 'surplus vendu Orgaloop (8 sacs × 25)');
  assert.equal(gp.circular.orgaloop.revenueFcfa, 45000);
  assert.equal(gp.circular.orgaloop.salesCount, 1);
  assert.ok(gp.circular.effluentSurplusKg > 0, 'surplus résiduel après cultures + vente');
});

test('VF-2 — pas de double comptage sales_orders + business_events liés', () => {
  const orgaloop = computeOrgaloopEffluentMetrics(HYBRID_SCENARIO);

  assert.equal(orgaloop.soldKgFromSales, 200);
  assert.equal(orgaloop.soldKgFromOrphanEvents, 0);
  assert.equal(orgaloop.soldKg, 200);
  assert.equal(orgaloop.revenueFromSales, 45000);
  assert.equal(orgaloop.revenueFromOrphanEvents, 0);
  assert.equal(orgaloop.revenueFcfa, 45000);
  assert.equal(orgaloop.deduplicatedEventsCount, 1);
  assert.equal(orgaloop.orphanEventsCount, 0);
  assert.equal(orgaloop.encaisseFcfa, 45000);

  const orphanOnly = computeOrgaloopEffluentMetrics({
    business_events: [{ event_type: 'effluent_vendu_orgaloop', quantity: 75, montant: 12000 }],
  });
  assert.equal(orphanOnly.soldKg, 75);
  assert.equal(orphanOnly.revenueFcfa, 12000);
  assert.equal(orphanOnly.orphanEventsCount, 1);
});

test('VF-3 — export DER/FJ contient les 5 indicateurs clés', () => {
  const gp = computeGreenpreneursMetrics(HYBRID_SCENARIO);
  const impact = buildDerImpactSnippet(gp);
  const annex = buildDerAnnexText(gp);

  assert.match(impact, /économies engrais/i);
  assert.match(impact, /parcelle/i);
  assert.match(impact, /Orgaloop/i);
  assert.match(impact, /200/);

  assert.match(annex, /Utilisé cultures/i);
  assert.match(annex, /parcelles fertilisées/i);
  assert.match(annex, /Économies engrais/i);
  assert.match(annex, /Surplus Orgaloop/i);
  assert.match(annex, /200 kg/);
  assert.match(annex, /1 vente/);
  assert.match(annex, /Surplus effluent restant/i);
});

test('VF-4 — Centre : priorité cultures avant Orgaloop surplus', () => {
  const gp = computeGreenpreneursMetrics(HYBRID_SCENARIO);
  const alerts = gp.centreAlerts;
  const ids = alerts.map((a) => a.id);

  assert.ok(ids.includes('gp-fumier-priorite-cultures'), 'alerte fertilisation interne');
  assert.ok(ids.includes('gp-surplus-orgaloop'), 'alerte surplus Orgaloop seulement');
  assert.ok(!ids.includes('gp-effluent-a-publier-orgaloop'), 'pas vente directe totale');

  const cultureIdx = ids.indexOf('gp-fumier-priorite-cultures');
  const surplusIdx = ids.indexOf('gp-surplus-orgaloop');
  assert.ok(cultureIdx < surplusIdx, 'fertilisation recommandée avant surplus Orgaloop');

  assert.ok(ids.includes('gp-orgaloop-ventes-trackees'), 'ventes Orgaloop tracées');

  const noSurplus = computeGreenpreneursMetrics({
    ...HYBRID_SCENARIO,
    stocks: [{ categorie: 'fumier', quantite: 4 }],
    business_events: [
      { event_type: 'effluent_utilise_culture', quantity: 90, entity_id: 'p1' },
      { event_type: 'parcelle_fertilisee', entity_id: 'p1' },
    ],
    sales_orders: [],
    payments: [],
  });
  assert.ok(!noSurplus.centreAlerts.some((a) => a.id === 'gp-surplus-orgaloop'));
});

test('VF-5 — build production (équivalent Vercel)', async () => {
  const { execSync } = await import('node:child_process');
  execSync('npm run build', { cwd: new URL('../..', import.meta.url).pathname, stdio: 'pipe' });
  assert.ok(true);
});
