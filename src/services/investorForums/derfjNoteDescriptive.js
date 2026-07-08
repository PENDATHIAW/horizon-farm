/**
 * Générateur de la « Note descriptive du projet » DER/FJ Greenpreneurs
 * ---------------------------------------------------------------
 * Reproduit la structure officielle attendue par le formulaire DER/FJ Sénégal :
 * identification du promoteur, du projet, genèse, objectifs, produits, marché,
 * marketing, technique, organisation, impact, financier, SWOT, risques,
 * calendrier, conclusion. Les données ERP + BP officiel remplissent
 * automatiquement les champs ; l'utilisateur peut surcharger chaque section.
 */

import { HORIZON_FARM_OFFICIAL_BP } from '../horizonFarmOfficialBusinessPlan.js';
import {
  DERFJ_GREENPRENEURS_PROFILE,
  ORGALOOP_EFFLUENT_CHANNEL,
} from '../../config/derfjGreenpreneurs.config.js';
import { buildConsolidatedCommercialKpis } from '../../utils/commercialKpiConsolidated.js';
import { computeFarmHeadcount } from '../../modules/dashboard/dashboardMetrics.js';
import { summarizeStockValuation } from '../../utils/stockValuation.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value = 0) => Number(value || 0) || 0;
const fmt = (value = 0) => Math.round(n(value)).toLocaleString('fr-FR');
const fmtFcfa = (value = 0) => `${fmt(value)} FCFA`;

const DEFAULT_PROMOTEUR = {
  nom: 'THIAW DIAGNE',
  prenoms: 'Penda',
  date_naissance: '',
  lieu_naissance: '',
  nationalite: 'Sénégalaise',
  genre: 'Femme',
  situation_matrimoniale: '',
  adresse_residence: 'Thiès',
  cin: '',
  telephone: '',
  email: '',
  niveau_etude: '',
  experience: 'Entrepreneure agricole — pilotage projet Horizon Farm',
};

const DEFAULT_PROJET = {
  nom: 'HORIZON FARM',
  statut_juridique: 'Entreprise individuelle au réel IR',
  statut_creation: 'À créer / en formalisation',
  secteur: 'Agriculture, élevage et agroalimentaire',
  sous_secteur: 'Aviculture, embouche bovine, cultures maraîchères, économie circulaire',
  adresse_siege: 'Thiès, Sénégal',
  region: 'Thiès',
  departement: 'Thiès',
  commune: 'Thiès',
};

const OBJECTIFS_DEFAULTS = {
  general: 'Développer une ferme agricole intégrée et rentable à Thiès, combinant élevage avicole (pondeuses et chair), embouche bovine, cultures maraîchères et valorisation des coproduits (économie circulaire), pilotée par un ERP moderne et l\'IA Hey Horizon.',
  specifiques: [
    'Produire et commercialiser des œufs, poulets de chair, bovins d\'embouche et cultures maraîchères de qualité pour le marché local.',
    'Créer et pérenniser au moins 5 emplois directs dont une part significative de femmes et jeunes.',
    'Boucler la valorisation fumier/effluent en fertilisant les parcelles Horizon Farm et en vendant les surplus via la plateforme Orgaloop.',
    'Générer un chiffre d\'affaires annuel cible de 121 M FCFA à partir de l\'année 1 et progresser jusqu\'à 178 M FCFA en année 5.',
    'Atteindre une rentabilité positive dès l\'année 1 et rembourser le concours DER/FJ dans les délais convenus.',
  ],
};

function isCancelledSale(row = {}) {
  const raw = String(row.statut || row.status || '').toLowerCase();
  return ['annule', 'annulé', 'cancelled', 'canceled'].includes(raw);
}

function buildIdentificationPromoteur(manual = {}) {
  return { ...DEFAULT_PROMOTEUR, ...(manual.promoteur || {}) };
}

function buildIdentificationProjet(manual = {}, official = HORIZON_FARM_OFFICIAL_BP) {
  return {
    ...DEFAULT_PROJET,
    nom: manual.projet?.nom || official.identity?.projectName || DEFAULT_PROJET.nom,
    statut_juridique: manual.projet?.statut_juridique || official.identity?.legalStatus || DEFAULT_PROJET.statut_juridique,
    ...(manual.projet || {}),
  };
}

function buildGenese(manual = {}) {
  return manual.genese || `Le projet HORIZON FARM est né de la volonté de la promotrice Penda THIAW DIAGNE de bâtir à Thiès une exploitation agricole moderne, intégrée et durable, en réponse à la forte demande locale en œufs frais, viandes blanche et rouge, et légumes. La ferme combine plusieurs cycles complémentaires (œufs, poulets de chair, embouche bovine, cultures maraîchères) afin de sécuriser les revenus et de valoriser les coproduits (fumier, fientes, suif, os) via une boucle d'économie circulaire — priorité à la fertilisation des parcelles internes, puis vente des surplus sur la plateforme conjointe Orgaloop. Le programme DER/FJ Greenpreneurs correspond au positionnement du projet : innovation, impact environnemental mesurable, création d'emplois pour femmes et jeunes, et pilotage par la donnée grâce à l'ERP Horizon Farm et l'assistant IA Hey Horizon.`;
}

function buildObjectifs(manual = {}) {
  const base = { ...OBJECTIFS_DEFAULTS, ...(manual.objectifs || {}) };
  return {
    general: base.general,
    specifiques: Array.isArray(base.specifiques) && base.specifiques.length
      ? base.specifiques
      : OBJECTIFS_DEFAULTS.specifiques,
  };
}

function buildProduitsServices(manual = {}, official = HORIZON_FARM_OFFICIAL_BP) {
  if (manual.produits) return manual.produits;
  return arr(official.revenue?.byActivity).map((row) => ({
    label: row.label,
    activity: row.activity,
    quantite_annuelle: row.quantity,
    prix_unitaire: row.unitPrice,
    ca_annuel: row.annual,
  }));
}

function buildAnalyseMarche(manual = {}) {
  return manual.marche || {
    marche_national: 'Marché sénégalais des protéines animales et des légumes en croissance structurelle, portée par la démographie urbaine (Dakar, Thiès, Mbour) et la substitution progressive des importations.',
    clientele_cible: [
      'Grossistes et revendeurs marchés locaux (Thiès, Dakar).',
      'Boutiques de quartier et supérettes.',
      'Restaurants, hôtels et cantines (contrats livraison).',
      'Ménages via ventes directes et abonnements.',
      'Plateforme Orgaloop pour la vente des surplus d\'effluents.',
    ],
    concurrence: 'Concurrence essentiellement composée de petites unités informelles avec faible pilotage. Peu d\'acteurs formalisés dans l\'intégration élevage + cultures + économie circulaire dans la zone.',
    positionnement: 'Ferme intégrée pilotée par ERP + IA — traçabilité complète, qualité maîtrisée, prix compétitifs, engagement environnemental (agroécologie, économie circulaire).',
  };
}

function buildStrategieMarketing(manual = {}, official = HORIZON_FARM_OFFICIAL_BP) {
  if (manual.marketing) return manual.marketing;
  const eggs = arr(official.revenue?.byActivity).find((row) => row.activity === 'oeufs');
  const chair = arr(official.revenue?.byActivity).find((row) => row.activity === 'poulets_chair');
  const bovins = arr(official.revenue?.byActivity).find((row) => row.activity === 'bovins');
  return {
    produit: 'Œufs de consommation calibrés (tablettes de 30), poulets de chair prêts à l\'abattage, bovins d\'embouche (poids vif), légumes maraîchers et fertilisants naturels.',
    prix: `Prix alignés sur les marchés locaux : ${eggs ? `œufs ${fmtFcfa(eggs.unitPrice)} / tablette` : 'œufs marché local'}, ${chair ? `poulet chair ${fmtFcfa(chair.unitPrice)}` : 'poulet chair marché local'}, ${bovins ? `bovin ${fmtFcfa(bovins.unitPrice)} / tête` : 'bovins marché local'}. Adaptables selon volume et fidélité client.`,
    place: 'Distribution multi-canal : vente directe à la ferme, tournées revendeurs, livraisons hôtels-restaurants, boutiques de proximité, marchés hebdomadaires, plateforme Orgaloop pour effluents.',
    promotion: 'Communication de proximité (bouche à oreille, réseau relationnel), WhatsApp Business pour la clientèle fidèle, présence sur salons agricoles, partenariats avec incubateurs et médias locaux.',
  };
}

function buildAspectsTechniques(manual = {}, official = HORIZON_FARM_OFFICIAL_BP, snapshot = {}) {
  if (manual.techniques) return manual.techniques;
  const layers = official.operatingStrategy?.pondeuses;
  const broilers = official.operatingStrategy?.chair;
  const bovins = official.operatingStrategy?.bovins;
  return {
    processus: [
      layers ? `Pondeuses : bande initiale ${layers.initialBand || 3000} sujets, production quotidienne d'œufs, réforme après ${layers.reformMonths || 18} mois.` : 'Pondeuses : gestion sur bandes avec suivi taux de ponte réel.',
      broilers ? `Poulets de chair : cycle court ${broilers.cycleDays || 40} jours, bandes de ${broilers.starterBand || 500} sujets, roulement mensuel.` : 'Poulets chair : cycles courts J+40.',
      bovins ? `Embouche bovine : ${bovins.starterM1 || 5} têtes par mois, cycle ${bovins.cycleDays || 90} jours, vente en poids vif.` : 'Embouche bovine : cycles ~90 jours.',
      'Cultures maraîchères : campagnes courtes en économie circulaire (fertilisation par fumier interne).',
      'Valorisation coproduits : fumier/fientes fertilisent en priorité les parcelles Horizon Farm, surplus vendu via Orgaloop.',
    ],
    materiel: arr(official.startupNeeds?.lines).map((line) => ({
      designation: line.designation,
      quantite: line.quantity,
      unite: line.unit,
      total: line.total,
    })),
    matieres_premieres: arr(official.variableCosts?.lines).map((line) => ({
      designation: line.designation,
      monthly: line.monthly,
      annual: line.annual,
    })),
    technologies: [
      'ERP Horizon Farm : suivi complet ventes, stocks, santé, cycles, finances et documents.',
      'Assistant IA Hey Horizon : recommandations décisionnelles, saisie vocale, rapprochement automatique.',
      'Smart Farm : capteurs de température/humidité, caméras (à venir), alertes temps réel.',
      'WhatsApp Business pour la communication client et les relances.',
    ],
    infrastructures: 'Poulaillers avicoles adaptés (pondeuses et chair), enclos bovins, hangar de stockage aliments, zone de conditionnement œufs, parcelles maraîchères, point d\'eau, clôture, dispositifs de sécurité.',
    snapshot_erp: {
      effectif_actif: snapshot.headcount?.total || 0,
      lots_avicoles_actifs: snapshot.headcount?.activeLots || 0,
      valeur_stock_estimee: snapshot.stockValue || 0,
    },
  };
}

function buildAspectsOrganisationnels(manual = {}, official = HORIZON_FARM_OFFICIAL_BP) {
  if (manual.organisation) return manual.organisation;
  const payroll = arr(official.payroll?.lines);
  const total = payroll.reduce((sum, row) => sum + n(row.people), 0);
  const women = 'Objectif : au moins 40% de femmes dans l\'effectif direct.';
  const jeunes = 'Objectif : majorité de jeunes (18-35 ans) parmi les emplois créés.';
  return {
    organigramme: [
      'Coordonnatrice projet (promotrice) — supervision globale.',
      'Agent avicole & conditionnement œufs — pondeuses + emballage.',
      'Agent d\'élevage bovin — soins et alimentation embouche.',
      'Gardien — sécurité 24/7.',
      'Personnel ponctuel — récoltes, vaccinations, transformations.',
    ],
    effectif: {
      total,
      lignes: payroll.map((row) => ({
        poste: row.designation,
        nombre: row.people,
        salaire_mensuel: row.monthlySalary,
        salaire_annuel: row.annual,
      })),
    },
    femmes_jeunes: `${women} ${jeunes} La promotrice est elle-même femme entrepreneure agricole.`,
    formation: 'Formation terrain continue : biosécurité, alimentation, gestion sanitaire, saisie ERP, sécurité au travail.',
  };
}

function buildImpact(manual = {}, official = HORIZON_FARM_OFFICIAL_BP, greenpreneurs = {}) {
  if (manual.impact) return manual.impact;
  const payroll = arr(official.payroll?.lines);
  const totalEmplois = payroll.reduce((sum, row) => sum + n(row.people), 0);
  const circular = greenpreneurs.circular || {};
  const orgaloop = circular.orgaloop || {};
  return {
    emplois_directs: totalEmplois,
    emplois_indirects: 'Fournisseurs locaux d\'aliments, transporteurs, revendeurs, personnel de récolte ponctuel — estimation 10 à 20 emplois indirects supportés.',
    femmes: 'Cible ≥ 40% de femmes parmi les emplois directs. Promotrice femme.',
    jeunes: 'Cible majorité 18-35 ans parmi les emplois directs.',
    impact_economique: [
      `Chiffre d'affaires annuel projeté : ${fmtFcfa(official.revenue?.annualTotal || 0)} en année 1.`,
      'Contribution à la substitution aux importations (protéines animales, œufs).',
      'Achats locaux : aliments, intrants, services vétérinaires, transports.',
    ],
    impact_social: [
      'Sécurité alimentaire locale : œufs frais, volaille et viande bovine.',
      'Formalisation d\'une activité entrepreneuriale portée par une femme.',
      'Formation terrain pour l\'équipe (aviculture, gestion, ERP).',
      'Ancrage territorial à Thiès et zone périphérique.',
    ],
    impact_environnemental: [
      'Économie circulaire : fumier/fientes valorisés en fertilisant les parcelles internes.',
      `Économies d'engrais chimiques estimées : ${fmtFcfa(circular.engraisSavingsFcfa || 0)}.`,
      `Surplus effluents vendus via ${orgaloop.platformName || ORGALOOP_EFFLUENT_CHANNEL.platformName || 'Orgaloop'}.`,
      'Réduction empreinte carbone via production locale (moins de transport).',
      'Traçabilité sanitaire complète pour la sécurité alimentaire.',
    ],
    greenpreneurs_score: greenpreneurs.readiness?.total ?? null,
    greenpreneurs_status: greenpreneurs.readiness?.statusLabel || null,
  };
}

function buildAspectsFinanciers(manual = {}, official = HORIZON_FARM_OFFICIAL_BP, kpis = {}) {
  if (manual.financiers) return manual.financiers;
  const coutTotal = n(official.startupNeeds?.officialTotal);
  const apportPerso = arr(official.funding?.lines).find((row) => /apport/i.test(row.designation))?.amount || 0;
  const derfjTarget = n(DERFJ_GREENPRENEURS_PROFILE.requestedFunding);
  return {
    cout_total_projet: coutTotal,
    plan_financement: {
      apport_personnel: apportPerso || DERFJ_GREENPRENEURS_PROFILE.personalContribution,
      derfj_demande: derfjTarget,
      autres_financeurs: Math.max(0, coutTotal - apportPerso - derfjTarget),
      total: coutTotal,
    },
    ca_annuel_projete: n(official.revenue?.annualTotal),
    ca_par_activite: arr(official.revenue?.byActivity),
    ca_5_ans: arr(official.revenue?.annualByYear || []),
    charges_variables_annuelles: n(official.variableCosts?.correctedAnnualTotal || official.variableCosts?.workbookAnnualTotal),
    charges_fixes_annuelles: n(official.fixedCosts?.annualByYear?.[0]),
    masse_salariale_annuelle: n(official.payroll?.annualTotal),
    resultat_par_annee: arr(official.forecast?.resultByYear || []),
    kpis_erp: {
      ca_realise: kpis.ca || 0,
      encaisse_realise: kpis.collected || 0,
      creances_ouvertes: kpis.receivable || 0,
    },
  };
}

function buildSwot(manual = {}) {
  return manual.swot || {
    forces: [
      'Projet intégré multi-activités (œufs, chair, bovins, cultures).',
      'Pilotage par ERP + IA Hey Horizon.',
      'Économie circulaire boucle élevage-cultures.',
      'Promotrice engagée, formée et expérimentée.',
      'Ancrage local à Thiès (marchés, fournisseurs, main-d\'œuvre).',
    ],
    faiblesses: [
      'Besoin initial en actifs productifs important.',
      'Dépendance aux aliments (prix aliments volatile).',
      'Effectif limité au démarrage.',
      'Historique commercial encore court.',
    ],
    opportunites: [
      'Forte demande locale en protéines animales.',
      'Programmes de soutien (DER/FJ Greenpreneurs, FONGIP, ONG).',
      'Marché plateforme Orgaloop pour effluents.',
      'Digitalisation agricole en croissance au Sénégal.',
    ],
    menaces: [
      'Maladies aviaires (grippe, coccidiose).',
      'Aléas climatiques (chaleur, saison sèche).',
      'Hausse prix aliments importés.',
      'Concurrence informelle non tracée.',
      'Impayés clients.',
    ],
  };
}

function buildRisques(manual = {}, official = HORIZON_FARM_OFFICIAL_BP) {
  if (manual.risques) return manual.risques;
  const bpRisks = arr(official.risks || []);
  if (bpRisks.length) return bpRisks;
  return [
    { risque: 'Épidémie aviaire (grippe, coccidiose)', probabilite: 'Moyenne', impact: 'Élevé', mitigation: 'Biosécurité stricte, vaccinations planifiées, quarantaine des nouveaux lots, vétérinaire référent.' },
    { risque: 'Hausse prix aliments', probabilite: 'Élevée', impact: 'Moyen', mitigation: 'Achats groupés, stockage tampon, formule aliment optimisée, valorisation fumier pour cultures fourragères.' },
    { risque: 'Impayés clients', probabilite: 'Moyenne', impact: 'Moyen', mitigation: 'Encaissements à la livraison, relances automatisées via ERP, acompte pour gros clients.' },
    { risque: 'Rupture stock intrants', probabilite: 'Moyenne', impact: 'Moyen', mitigation: 'Seuils d\'alerte ERP, contrats avec 2 fournisseurs, stock minimum 15 jours.' },
    { risque: 'Panne équipement critique', probabilite: 'Faible', impact: 'Élevé', mitigation: 'Maintenance préventive planifiée, contrat SAV, générateur de secours pour couveuses.' },
    { risque: 'Aléas climatiques (chaleur, pluie)', probabilite: 'Élevée', impact: 'Moyen', mitigation: 'Ventilation, abris ombragés, brumisation, calendrier cultures adapté.' },
    { risque: 'Mortalité élevée non anticipée', probabilite: 'Faible', impact: 'Élevé', mitigation: 'Suivi santé quotidien via ERP, alertes précoces, isolement rapide.' },
  ];
}

function buildCalendrier(manual = {}) {
  return manual.calendrier || [
    { phase: 'M1 — Installation', taches: ['Formalisation juridique', 'Achats prioritaires (poulaillers, matériel)', 'Recrutement équipe démarrage'] },
    { phase: 'M2 — Démarrage', taches: ['Bande initiale pondeuses 3000 sujets', 'Première bande chair 500 sujets', 'Achat 5 premiers bovins'] },
    { phase: 'M3 — Montée en charge', taches: ['Premier ramassage œufs', 'Prospection clients revendeurs', 'Ouverture ERP en production'] },
    { phase: 'M4 — Premières ventes bovins', taches: ['Vente 5 bovins J+90', 'Renouvellement bande chair', 'Ouverture parcelles maraîchères'] },
    { phase: 'M5-M6 — Stabilisation', taches: ['Ventes régulières œufs', 'Encaissements optimisés', 'Reporting DER/FJ'] },
    { phase: 'M7-M9 — Optimisation', taches: ['Renouvellement pondeuses (réforme si nécessaire)', 'Ventes bovins mensuelles', 'Fertilisation cultures'] },
    { phase: 'M10-M12 — Consolidation', taches: ['Bilan annuel', 'Reporting complet DER/FJ', 'Préparation bande N+1', 'Vente surplus effluents Orgaloop'] },
  ];
}

function buildConclusion(manual = {}) {
  return manual.conclusion || `HORIZON FARM est un projet agricole intégré porté par une entrepreneure engagée à Thiès. Il combine plusieurs sources de revenus complémentaires, s'appuie sur un pilotage par ERP + IA innovant au Sénégal, valorise ses coproduits en économie circulaire et vise la création d'emplois durables pour les femmes et les jeunes. Le concours DER/FJ Greenpreneurs permettra de sécuriser les actifs productifs de démarrage, d'atteindre le seuil de rentabilité dès l'année 1 et de rembourser le financement dans les délais convenus. La promotrice s'engage à fournir un reporting trimestriel structuré (ventes, encaissements, dépenses, justificatifs, ratios) directement extrait de l'ERP.`;
}

function buildAnnexes(manual = {}) {
  return manual.annexes || [
    'CV et pièce d\'identité (CIN) de la promotrice',
    'Certificat de résidence',
    'Attestation d\'apport personnel / bancaire',
    'Devis / proformas des équipements et infrastructures',
    'Photos du site d\'implantation',
    'Statuts juridiques (une fois formalisés)',
    'Captures ERP Horizon Farm (données de démarrage)',
    'Lettres d\'intention client / partenaire (si disponibles)',
    'Business Plan détaillé',
    'Compte d\'exploitation prévisionnel 3 ans',
    'Plan de trésorerie prévisionnel 12 mois',
  ];
}

/** Construit le contenu complet de la Note descriptive DER/FJ. */
export function buildDerfjNoteDescriptive(rawData = {}, manual = {}) {
  const official = HORIZON_FARM_OFFICIAL_BP;
  const salesOrders = arr(rawData.sales_orders || rawData.salesOrders).filter((row) => !isCancelledSale(row));
  const payments = arr(rawData.payments);
  const clients = arr(rawData.clients);
  const stocks = arr(rawData.stocks || rawData.stock);
  const stockMovements = arr(rawData.stock_movements || rawData.stockMovements);
  const transactions = arr(rawData.finances || rawData.transactions);
  const animaux = arr(rawData.animaux);
  const lots = arr(rawData.lots || rawData.avicole);
  const cultures = arr(rawData.cultures);

  const kpis = buildConsolidatedCommercialKpis({
    orders: salesOrders,
    payments,
    clients,
    deliveries: arr(rawData.deliveries),
    invoices: arr(rawData.invoices),
    periodScope: {},
  });
  const headcount = computeFarmHeadcount({ animaux, lots, cultures });
  const stockValuation = summarizeStockValuation(stocks, stockMovements, transactions);
  const snapshot = { headcount, stockValue: stockValuation.totalValue };

  return {
    meta: {
      program: 'DER/FJ Greenpreneurs',
      documentType: 'Note descriptive du projet',
      generatedAt: new Date().toISOString(),
      version: '1.0',
      source: 'Horizon Farm ERP + Hey Horizon AI',
    },
    identificationPromoteur: buildIdentificationPromoteur(manual),
    identificationProjet: buildIdentificationProjet(manual, official),
    genese: buildGenese(manual),
    objectifs: buildObjectifs(manual),
    produits: buildProduitsServices(manual, official),
    marche: buildAnalyseMarche(manual),
    marketing: buildStrategieMarketing(manual, official),
    techniques: buildAspectsTechniques(manual, official, snapshot),
    organisation: buildAspectsOrganisationnels(manual, official),
    impact: buildImpact(manual, official, rawData.greenpreneurs || {}),
    financiers: buildAspectsFinanciers(manual, official, kpis),
    swot: buildSwot(manual),
    risques: buildRisques(manual, official),
    calendrier: buildCalendrier(manual),
    conclusion: buildConclusion(manual),
    annexes: buildAnnexes(manual),
    kpisErp: kpis,
    snapshot,
    official,
  };
}

/**
 * Score de complétude de la note descriptive (0-100).
 * Utilisé pour signaler à la promotrice les sections encore vides / à personnaliser.
 */
export function computeDerfjNoteCompleteness(note = {}, manual = {}) {
  const checks = [
    { id: 'promoteur_cin', label: 'CIN promotrice', ok: Boolean(manual.promoteur?.cin) },
    { id: 'promoteur_telephone', label: 'Téléphone promotrice', ok: Boolean(manual.promoteur?.telephone) },
    { id: 'promoteur_email', label: 'Email promotrice', ok: Boolean(manual.promoteur?.email) },
    { id: 'promoteur_date_naissance', label: 'Date et lieu de naissance', ok: Boolean(manual.promoteur?.date_naissance) },
    { id: 'promoteur_niveau_etude', label: 'Niveau d\'étude', ok: Boolean(manual.promoteur?.niveau_etude) },
    { id: 'projet_adresse', label: 'Adresse précise du siège', ok: Boolean(manual.projet?.adresse_siege) },
    { id: 'genese', label: 'Genèse & justification personnalisée', ok: Boolean(manual.genese) },
    { id: 'objectifs_specifiques', label: 'Objectifs SMART renseignés', ok: Array.isArray(note.objectifs?.specifiques) && note.objectifs.specifiques.length >= 3 },
    { id: 'marche_clientele', label: 'Clientèle cible identifiée', ok: Array.isArray(note.marche?.clientele_cible) && note.marche.clientele_cible.length >= 3 },
    { id: 'marketing_prix', label: 'Politique de prix définie', ok: Boolean(note.marketing?.prix) },
    { id: 'techniques_processus', label: 'Processus de production détaillé', ok: Array.isArray(note.techniques?.processus) && note.techniques.processus.length >= 3 },
    { id: 'organisation_effectif', label: 'Effectif détaillé', ok: n(note.organisation?.effectif?.total) > 0 },
    { id: 'impact_emplois', label: 'Emplois créés chiffrés', ok: n(note.impact?.emplois_directs) > 0 },
    { id: 'financiers_cout_total', label: 'Coût total du projet', ok: n(note.financiers?.cout_total_projet) > 0 },
    { id: 'financiers_ca', label: 'CA annuel projeté', ok: n(note.financiers?.ca_annuel_projete) > 0 },
    { id: 'swot', label: 'SWOT complète', ok: (note.swot?.forces?.length || 0) >= 3 && (note.swot?.opportunites?.length || 0) >= 3 },
    { id: 'risques', label: 'Analyse risques avec mitigation', ok: arr(note.risques).length >= 5 && note.risques.every((r) => Boolean(r.mitigation)) },
    { id: 'calendrier', label: 'Calendrier 12 mois', ok: arr(note.calendrier).length >= 5 },
    { id: 'conclusion', label: 'Conclusion et engagement', ok: Boolean(note.conclusion) && note.conclusion.length > 100 },
    { id: 'annexes', label: 'Pièces annexes listées', ok: arr(note.annexes).length >= 5 },
  ];

  const ok = checks.filter((check) => check.ok).length;
  const total = checks.length;
  const score = Math.round((ok / total) * 100);
  const missing = checks.filter((check) => !check.ok).map((check) => check.label);
  return {
    score,
    ok,
    total,
    missing,
    checks,
    ready: score >= 85,
    readyToSubmit: score >= 90 && missing.every((label) => !label.toLowerCase().includes('cin')),
  };
}

/**
 * Structure narrative complète pour rendu texte / PDF (14 sections DER/FJ).
 */
export function renderDerfjNoteSections(note = {}) {
  return [
    {
      id: 'i_promoteur',
      title: 'I. Identification du promoteur',
      body: [
        `Nom & prénoms : ${note.identificationPromoteur?.nom || ''} ${note.identificationPromoteur?.prenoms || ''}`.trim(),
        `Date & lieu de naissance : ${note.identificationPromoteur?.date_naissance || '—'} · ${note.identificationPromoteur?.lieu_naissance || '—'}`,
        `Nationalité : ${note.identificationPromoteur?.nationalite || '—'}`,
        `Genre : ${note.identificationPromoteur?.genre || '—'}`,
        `Situation matrimoniale : ${note.identificationPromoteur?.situation_matrimoniale || '—'}`,
        `Adresse : ${note.identificationPromoteur?.adresse_residence || '—'}`,
        `CIN : ${note.identificationPromoteur?.cin || '—'}`,
        `Téléphone : ${note.identificationPromoteur?.telephone || '—'}`,
        `Email : ${note.identificationPromoteur?.email || '—'}`,
        `Niveau d'étude : ${note.identificationPromoteur?.niveau_etude || '—'}`,
        `Expérience : ${note.identificationPromoteur?.experience || '—'}`,
      ].join('\n'),
    },
    {
      id: 'ii_projet',
      title: 'II. Identification du projet',
      body: [
        `Nom du projet : ${note.identificationProjet?.nom || '—'}`,
        `Statut juridique : ${note.identificationProjet?.statut_juridique || '—'}`,
        `Statut création : ${note.identificationProjet?.statut_creation || '—'}`,
        `Secteur : ${note.identificationProjet?.secteur || '—'}`,
        `Sous-secteur : ${note.identificationProjet?.sous_secteur || '—'}`,
        `Adresse siège : ${note.identificationProjet?.adresse_siege || '—'}`,
        `Région / département / commune : ${note.identificationProjet?.region || '—'} / ${note.identificationProjet?.departement || '—'} / ${note.identificationProjet?.commune || '—'}`,
      ].join('\n'),
    },
    { id: 'iii_genese', title: 'III. Genèse et justification', body: note.genese || '' },
    {
      id: 'iv_objectifs',
      title: 'IV. Objectifs',
      body: `Objectif général : ${note.objectifs?.general || ''}\n\nObjectifs spécifiques :\n${arr(note.objectifs?.specifiques).map((line, idx) => `${idx + 1}. ${line}`).join('\n')}`,
    },
    {
      id: 'v_produits',
      title: 'V. Description des produits et services',
      body: arr(note.produits).map((p) => `• ${p.label} — ${fmt(p.quantite_annuelle)} ${p.activity || 'unités'}/an à ${fmtFcfa(p.prix_unitaire)} → ${fmtFcfa(p.ca_annuel)}/an`).join('\n'),
    },
    {
      id: 'vi_marche',
      title: 'VI. Analyse du marché',
      body: [
        `Marché national/local : ${note.marche?.marche_national || ''}`,
        `\nClientèle cible :\n${arr(note.marche?.clientele_cible).map((line) => `• ${line}`).join('\n')}`,
        `\nConcurrence : ${note.marche?.concurrence || ''}`,
        `\nPositionnement : ${note.marche?.positionnement || ''}`,
      ].join('\n'),
    },
    {
      id: 'vii_marketing',
      title: 'VII. Stratégie marketing (4P)',
      body: [
        `Produit : ${note.marketing?.produit || ''}`,
        `Prix : ${note.marketing?.prix || ''}`,
        `Place (distribution) : ${note.marketing?.place || ''}`,
        `Promotion : ${note.marketing?.promotion || ''}`,
      ].join('\n\n'),
    },
    {
      id: 'viii_techniques',
      title: 'VIII. Aspects techniques',
      body: [
        `Processus :\n${arr(note.techniques?.processus).map((line) => `• ${line}`).join('\n')}`,
        `\nTechnologies :\n${arr(note.techniques?.technologies).map((line) => `• ${line}`).join('\n')}`,
        `\nInfrastructures : ${note.techniques?.infrastructures || ''}`,
      ].join('\n'),
    },
    {
      id: 'ix_organisation',
      title: 'IX. Aspects organisationnels et humains',
      body: [
        `Organigramme :\n${arr(note.organisation?.organigramme).map((line) => `• ${line}`).join('\n')}`,
        `\nEffectif prévu : ${note.organisation?.effectif?.total || 0} emploi(s) direct(s).`,
        `Femmes & jeunes : ${note.organisation?.femmes_jeunes || ''}`,
        `Formation : ${note.organisation?.formation || ''}`,
      ].join('\n'),
    },
    {
      id: 'x_impact',
      title: 'X. Impact du projet',
      body: [
        `Emplois directs : ${note.impact?.emplois_directs || 0}. Emplois indirects : ${note.impact?.emplois_indirects || '—'}.`,
        `Femmes : ${note.impact?.femmes || ''}`,
        `Jeunes : ${note.impact?.jeunes || ''}`,
        `\nImpact économique :\n${arr(note.impact?.impact_economique).map((line) => `• ${line}`).join('\n')}`,
        `\nImpact social :\n${arr(note.impact?.impact_social).map((line) => `• ${line}`).join('\n')}`,
        `\nImpact environnemental :\n${arr(note.impact?.impact_environnemental).map((line) => `• ${line}`).join('\n')}`,
      ].join('\n'),
    },
    {
      id: 'xi_financiers',
      title: 'XI. Aspects financiers',
      body: [
        `Coût total du projet : ${fmtFcfa(note.financiers?.cout_total_projet)}`,
        `Apport personnel : ${fmtFcfa(note.financiers?.plan_financement?.apport_personnel)}`,
        `Concours DER/FJ demandé : ${fmtFcfa(note.financiers?.plan_financement?.derfj_demande)}`,
        `Autres financeurs : ${fmtFcfa(note.financiers?.plan_financement?.autres_financeurs)}`,
        `\nCA annuel projeté (BP) : ${fmtFcfa(note.financiers?.ca_annuel_projete)}`,
        `Charges variables annuelles : ${fmtFcfa(note.financiers?.charges_variables_annuelles)}`,
        `Charges fixes annuelles : ${fmtFcfa(note.financiers?.charges_fixes_annuelles)}`,
        `Masse salariale annuelle : ${fmtFcfa(note.financiers?.masse_salariale_annuelle)}`,
        `\nRéalisé ERP : CA ${fmtFcfa(note.financiers?.kpis_erp?.ca_realise)} · Encaissé ${fmtFcfa(note.financiers?.kpis_erp?.encaisse_realise)} · Créances ${fmtFcfa(note.financiers?.kpis_erp?.creances_ouvertes)}`,
      ].join('\n'),
    },
    {
      id: 'xii_swot',
      title: 'XII. Analyse SWOT',
      body: [
        `Forces :\n${arr(note.swot?.forces).map((line) => `• ${line}`).join('\n')}`,
        `\nFaiblesses :\n${arr(note.swot?.faiblesses).map((line) => `• ${line}`).join('\n')}`,
        `\nOpportunités :\n${arr(note.swot?.opportunites).map((line) => `• ${line}`).join('\n')}`,
        `\nMenaces :\n${arr(note.swot?.menaces).map((line) => `• ${line}`).join('\n')}`,
      ].join('\n'),
    },
    {
      id: 'xiii_risques',
      title: 'XIII. Analyse des risques',
      body: arr(note.risques).map((r) => `• ${r.risque} — Prob. ${r.probabilite || '—'} · Impact ${r.impact || '—'} · Mitigation : ${r.mitigation || '—'}`).join('\n'),
    },
    {
      id: 'xiv_calendrier',
      title: 'XIV. Calendrier de mise en œuvre (12 mois)',
      body: arr(note.calendrier).map((p) => `${p.phase} : ${arr(p.taches).join(' ; ')}`).join('\n'),
    },
    { id: 'xv_conclusion', title: 'XV. Conclusion et engagement', body: note.conclusion || '' },
    { id: 'annexes', title: 'Annexes à joindre', body: arr(note.annexes).map((line) => `• ${line}`).join('\n') },
  ];
}

export const DERFJ_NOTE_SECTION_IDS = [
  'i_promoteur',
  'ii_projet',
  'iii_genese',
  'iv_objectifs',
  'v_produits',
  'vi_marche',
  'vii_marketing',
  'viii_techniques',
  'ix_organisation',
  'x_impact',
  'xi_financiers',
  'xii_swot',
  'xiii_risques',
  'xiv_calendrier',
  'xv_conclusion',
  'annexes',
];

export default buildDerfjNoteDescriptive;
