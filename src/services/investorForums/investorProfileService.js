/**
 * Investisseurs & Forums — agrégation lecture seule du profil projet.
 * Réutilise Hey Horizon AI Core + composeReportData ; ne recalcule pas Finance / Rapports / Impact.
 */

import { composeReportData } from '../moduleDataComposer.js';
import {
  buildHeyHorizonCoreDataMap,
  getHeyHorizonCoreSnapshot,
  getInvestorReadySummary,
} from '../heyHorizonCore/index.js';
import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan.js';

export const HORIZON_FARM_TAGLINE = 'Horizon Farm : une ferme avicole et bovine pilotée par la donnée, pensée pour les réalités agricoles africaines.';

export const INVESTOR_FORUMS_SOURCE = 'investisseurs_forums';

const arr = (value) => (Array.isArray(value) ? value : []);
const lower = (value) => String(value || '').trim().toLowerCase();

function activityLines(snapshot = {}, official = HORIZON_FARM_OFFICIAL_BP) {
  const poultry = snapshot.poultry?.lots || {};
  const livestock = snapshot.livestock?.effectifs || {};
  const cultures = snapshot.farm?.counts?.cultures || 0;

  return [
    {
      id: 'pondeuses',
      label: 'Pondeuses',
      status: poultry.effectif_pondeuses > 0 ? 'actif' : 'planifie',
      detail: poultry.effectif_pondeuses > 0
        ? `${poultry.effectif_pondeuses.toLocaleString('fr-FR')} sujet(s) suivis dans l'ERP`
        : `Bande cible BP : ${official.operatingStrategy?.pondeuses?.initialBand?.toLocaleString('fr-FR') || 3000} sujets`,
      erp_count: poultry.effectif_pondeuses || 0,
    },
    {
      id: 'chair',
      label: 'Poulets de chair',
      status: poultry.effectif_chair > 0 ? 'actif' : 'planifie',
      detail: poultry.effectif_chair > 0
        ? `${poultry.effectif_chair.toLocaleString('fr-FR')} sujet(s) en cycle court`
        : `Roulement BP : bandes de ${official.operatingStrategy?.chair?.starterBand || 500} · cycle ~${official.operatingStrategy?.chair?.cycleDays || 40} j`,
      erp_count: poultry.effectif_chair || 0,
    },
    {
      id: 'bovins',
      label: 'Embouche bovine',
      status: livestock.actifs > 0 ? 'actif' : 'planifie',
      detail: livestock.actifs > 0
        ? `${livestock.actifs} tête(s) active(s) · cycle ~${official.operatingStrategy?.bovins?.cycleDays || 90} j`
        : `Montée en charge BP : ${official.operatingStrategy?.bovins?.starterM1 || 5} têtes/mois`,
      erp_count: livestock.actifs || 0,
    },
    {
      id: 'cultures',
      label: 'Cultures futures',
      status: cultures > 0 ? 'actif' : 'planifie',
      detail: cultures > 0
        ? `${cultures} parcelle(s) ou culture(s) suivies`
        : 'Extension cultures planifiée selon demande et trésorerie',
      erp_count: cultures,
    },
  ];
}

function buildNeeds(snapshot = {}, investorReady = {}, official = HORIZON_FARM_OFFICIAL_BP) {
  const gaps = arr(investorReady.gaps);
  const needs = [];

  if (official.startupNeeds?.officialTotal > 0) {
    needs.push({
      id: 'financement',
      label: 'Financement actifs productifs',
      detail: `Besoin structuré BP : ${Math.round(official.startupNeeds.officialTotal).toLocaleString('fr-FR')} FCFA`,
      priority: 'haute',
    });
  }
  if (gaps.some((g) => lower(g).includes('business plan'))) {
    needs.push({ id: 'bp', label: 'Business plan formalisé', detail: 'Compléter ou lier le BP dans l\'ERP', priority: 'moyenne' });
  }
  if (gaps.some((g) => lower(g).includes('justificatif'))) {
    needs.push({ id: 'preuves', label: 'Justificatifs financiers', detail: 'Rattacher pièces aux transactions ERP', priority: 'haute' });
  }
  if (snapshot.inventory?.stock?.sous_seuil > 0) {
    needs.push({
      id: 'intrants',
      label: 'Intrants & stock sécurisé',
      detail: `${snapshot.inventory.stock.sous_seuil} produit(s) sous seuil`,
      priority: 'moyenne',
    });
  }
  needs.push(
    { id: 'partenaires', label: 'Partenaires techniques', detail: 'Équipements avicoles, aliments, formation terrain', priority: 'moyenne' },
    { id: 'marche', label: 'Débouchés clients', detail: 'Lettres d\'intention, contrats réguliers, salons', priority: 'moyenne' },
  );
  return needs.slice(0, 8);
}

function buildRisks(snapshot = {}, investorReady = {}) {
  const risks = [];
  const topFindings = arr(investorReady.sections?.risk?.top_findings);

  topFindings.slice(0, 4).forEach((finding, index) => {
    risks.push({
      id: `finding-${index}`,
      label: finding.title || finding.label || 'Risque identifié',
      detail: finding.detail || finding.message || '',
      mitigation: finding.action || 'Suivi via alertes et tâches ERP',
      severity: finding.severity || 'warning',
    });
  });

  if (snapshot.inventory?.stock?.sous_seuil > 0) {
    risks.push({
      id: 'stock',
      label: 'Rupture intrants',
      detail: `${snapshot.inventory.stock.sous_seuil} produit(s) sous seuil`,
      mitigation: 'Seuils stock, commandes anticipées, fournisseurs de secours',
      severity: 'warning',
    });
  }
  if (snapshot.finance?.treasury?.creances_clients > 0) {
    risks.push({
      id: 'creances',
      label: 'Impayés clients',
      detail: `Créances ouvertes : ${Math.round(snapshot.finance.treasury.creances_clients).toLocaleString('fr-FR')} FCFA`,
      mitigation: 'Relances, acomptes, suivi encaissements ERP',
      severity: 'warning',
    });
  }

  risks.push(
    {
      id: 'sante',
      label: 'Santé animale',
      detail: 'Maladies aviaires ou bovines',
      mitigation: 'Vaccins, biosécurité, vétérinaire référent, traçabilité santé ERP',
      severity: 'info',
    },
    {
      id: 'climat',
      label: 'Aléas climatiques',
      detail: 'Chaleur, pluie, stress thermique',
      mitigation: 'Smart Farm, abris, planification alimentation',
      severity: 'info',
    },
  );

  return risks.slice(0, 8);
}

/** Normalise le dataMap via Hey Horizon Core. */
export function buildInvestorForumDataMap({ crud = {}, dataMap = {}, liveMeteo = null } = {}) {
  return buildHeyHorizonCoreDataMap({ crud, dataMap, liveMeteo });
}

/**
 * Construit le profil complet présentable (10 sections du module).
 */
export function buildInvestorForumProfile({ crud = {}, dataMap = {}, liveMeteo = null } = {}) {
  const normalizedMap = buildInvestorForumDataMap({ crud, dataMap, liveMeteo });
  const reportData = composeReportData(crud);
  const snapshot = getHeyHorizonCoreSnapshot(normalizedMap);
  const investorReady = getInvestorReadySummary(normalizedMap);
  const official = HORIZON_FARM_OFFICIAL_BP;

  const payrollJobs = arr(official.payroll?.lines).reduce((sum, row) => sum + (Number(row.people) || 0), 0);
  const documentsCount = arr(reportData.documents).length;
  const clientsCount = arr(reportData.clients).length;

  return {
    source: INVESTOR_FORUMS_SOURCE,
    readOnly: true,
    generated_at: new Date().toISOString(),
    tagline: HORIZON_FARM_TAGLINE,
    projectSummary: {
      title: official.identity?.projectName || 'HORIZON FARM',
      tagline: HORIZON_FARM_TAGLINE,
      pitch: `${HORIZON_FARM_TAGLINE} Production intégrée : œufs, poulets de chair, embouche bovine et cultures. Pilotage quotidien via ERP Horizon Farm.`,
      legalStatus: official.identity?.legalStatus || 'À préciser',
      location: normalizedMap.farm_location || 'Sénégal · site à préciser',
      activities: ['Aviculture pondeuses', 'Poulets de chair', 'Embouche bovine', 'Cultures', 'Commercialisation structurée'],
    },
    founderProfile: {
      name: official.identity?.ownerName || 'Penda THIAW',
      role: 'Fondatrice & coordinatrice projet',
      highlights: [
        'Entrepreneure agricole — projet intégré avicole et bovin',
        'Pilotage opérationnel via ERP Horizon Farm',
        payrollJobs > 0 ? `${payrollJobs} emploi(s) direct(s) prévus au BP` : 'Emplois locaux à valoriser dans le dossier',
        'Programmes femmes entrepreneures et incubateurs : parcours et légitimité à compléter',
      ],
      gaps: investorReady.gaps.filter((g) => lower(g).includes('effectif') || lower(g).includes('business plan')).slice(0, 3),
    },
    activities: activityLines(snapshot, official),
    keyFigures: {
      ca_erp: snapshot.sales?.ventes?.ca_cumul ?? investorReady.highlights?.ca_cumul ?? 0,
      ca_bp_annuel: official.revenue?.annualTotal ?? 0,
      encaissements: snapshot.finance?.treasury?.encaissements ?? 0,
      resultat_tresorerie: snapshot.finance?.treasury?.resultat ?? investorReady.highlights?.tresorerie_resultat ?? 0,
      marge_brute: snapshot.finance?.treasury?.marge_brute ?? null,
      creances: snapshot.finance?.treasury?.creances_clients ?? investorReady.highlights?.creances_clients ?? 0,
      valeur_stock: snapshot.inventory?.stock?.valeur_estimee ?? investorReady.highlights?.valeur_stock ?? 0,
      investissements: snapshot.finance?.investissements?.montant_total ?? investorReady.highlights?.investissements_montant ?? 0,
      besoin_bp: official.startupNeeds?.officialTotal ?? 0,
      resultat_bp_an1: official.forecast?.resultByYear?.[0] ?? null,
      health_score: investorReady.highlights?.health_score ?? snapshot.risk?.health_score ?? 0,
      documents: documentsCount,
      clients: clientsCount,
    },
    socialImpact: {
      emplois_prevus: payrollJobs,
      effectif_erp: snapshot.farm?.headcount?.total ?? 0,
      securite_alimentaire: 'Œufs, volaille et viande bovine pour marchés locaux',
      femmes_jeunes: 'Valoriser la part femmes/jeunes dans emplois et formation terrain',
      formalisation: `${documentsCount} preuve(s) documentée(s) · ${investorReady.highlights?.business_plans || 0} BP suivi(s)`,
      community: 'Achats intrants locaux, fournisseurs et clients de proximité',
      highlights: investorReady.gaps.length === 0
        ? ['Dossier ERP cohérent pour subventions et ONG']
        : [`${investorReady.gaps.length} point(s) à renforcer pour dossier subvention`],
    },
    aiInnovation: {
      headline: 'Hey Horizon AI Core — pilotage décisionnel intégré',
      modules: [
        'Assistant ERP & recommandations Horizon Advisor',
        'Centre décisionnel & simulateur Horizon Forecast',
        'OCR intelligent factures & traçabilité documents',
        'Smart Farm — capteurs et alertes météo',
      ],
      differentiator: 'Une ferme africaine avec ERP complet : ventes, stock, santé, finances et rapports interconnectés.',
      health_score: investorReady.highlights?.health_score ?? 0,
    },
    needsSought: buildNeeds(snapshot, investorReady, official),
    risksMitigation: buildRisks(snapshot, investorReady),
    investorReady,
    snapshot,
    reportData,
    official,
  };
}

export default buildInvestorForumProfile;
