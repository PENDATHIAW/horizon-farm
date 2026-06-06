/**
 * Investor Room — contenus par défaut et architecture merge manuel / ERP.
 * Ne remplit que les champs vides pour ne pas écraser les données sauvegardées.
 */

export const HORIZON_INVESTOR_ROOM_POSITIONING =
  "Horizon Farm est une entreprise agricole intégrée qui combine élevage, agriculture, technologies numériques et intelligence artificielle afin de construire un modèle agricole moderne, rentable, durable et reproductible en Afrique.";

export const HORIZON_INVESTOR_ROOM_HERO_SUBTITLE =
  'Entreprise agricole intégrée pilotée par la donnée et l\'intelligence artificielle.';

export const DEFAULT_VISION =
  "Faire de Horizon Farm une référence africaine de l'agriculture intelligente, en combinant production agricole, élevage, technologies numériques et intelligence artificielle afin d'améliorer durablement la sécurité alimentaire, la rentabilité des exploitations et la création d'emplois.";

export const DEFAULT_MISSION =
  "Développer une entreprise agricole moderne, performante et durable tout en concevant des outils numériques intelligents permettant aux exploitants de mieux gérer leurs activités, anticiper les risques, optimiser leurs ressources et prendre de meilleures décisions grâce à la donnée.";

export const DEFAULT_FOUNDER_STORY = `Penda THIAW est ingénieure en Télécommunications et Informatique diplômée de l'ESMT Dakar.
Après près de neuf années chez Sonatel, elle a développé une expertise en pilotage de la performance, Business Intelligence, automatisation, stratégie analytique et création de valeur.
Animée par la volonté de contribuer au développement agricole africain, elle a choisi de quitter une carrière stable dans les télécommunications afin de consacrer pleinement son temps à la création de Horizon Farm.
Son ambition est de démontrer qu'une agriculture moderne, pilotée par la donnée et l'intelligence artificielle, peut améliorer durablement la sécurité alimentaire, la rentabilité des exploitations et la création d'emplois.`;

export const DEFAULT_FOUNDER_CV = `Ingénieure Télécommunications & Informatique — ESMT Dakar
~9 ans Sonatel — performance, BI, automatisation, stratégie analytique
Fondatrice & coordinatrice — Horizon Farm
Compétences : pilotage de la performance, ERP, data, IA appliquée à l'agriculture`;

export const DEFAULT_FOUNDER_EDUCATION = 'Diplôme ingénieur — ESMT Dakar (Télécommunications & Informatique)';

export const DEFAULT_FOUNDER_EXPERIENCE = 'Sonatel (~9 ans) — pilotage performance, BI, automatisation, stratégie analytique\nFondatrice Horizon Farm — entreprise agricole intégrée + ERP propriétaire';

export const DEFAULT_FOUNDER_SKILLS = 'Business Intelligence · Automatisation · Stratégie data · Pilotage de la performance · Gestion de projet · Agriculture intelligente';

export const DEFAULT_OBJECTIVES_6M = `- Lancement exploitation (avicole, bovin, maraîchage)
- Premiers revenus et clients récurrents
- Structuration ERP opérationnelle
- Collecte et traçabilité des données
- Dossier investisseur / data room complet`;

export const DEFAULT_OBJECTIVES_12M = `- Exploitation rentable selon trajectoire BP
- Déploiement modules IA (Brief, OCR, Forecast, Advisor)
- Premiers partenariques (intrants, débouchés, technique)
- Participation à un forum ou salon agricole`;

export const DEFAULT_OBJECTIVES_3Y = `- Exploitation agricole intégrée rentable
- Maraîchage opérationnel à l'échelle
- Élevage avicole et bovin développé
- ERP Horizon Farm commercialisable
- Partenariats internationaux
- Référence régionale agriculture intelligente`;

export const DEFAULT_WHY_INVEST = [
  { id: 'probleme', title: 'Problème', body: 'Agriculture fragmentée, peu de traçabilité, décisions au feeling, accès financement difficile.' },
  { id: 'solution', title: 'Solution', body: 'Exploitation intégrée + ERP propriétaire + IA Hey Horizon pour piloter production, finances et décisions.' },
  { id: 'marche', title: 'Marché', body: 'Demande locale forte en œufs, volaille et viande ; marchés de proximité et restauration.' },
  { id: 'differentiation', title: 'Différenciation', body: 'Double compétence fondatrice tech + agricole ; stack ERP + IA intégrée dès le jour 1.' },
  { id: 'impact', title: 'Impact', body: 'Sécurité alimentaire, emplois locaux, formalisation et preuves pour subventions.' },
  { id: 'scalabilite', title: 'Scalabilité', body: 'Modèle réplicable : production + logiciel + IA pour d\'autres fermes africaines.' },
  { id: 'technologie', title: 'Technologie', body: 'Horizon Farm ERP — ventes, stock, santé, finances, documents interconnectés.' },
  { id: 'ia', title: 'IA', body: 'Hey Horizon AI Core — brief, OCR, forecast, advisor, WhatsApp terrain.' },
  { id: 'erp', title: 'ERP propriétaire', body: 'Pas de patchwork Excel : un système unique piloté par la fondatrice.' },
  { id: 'femmes', title: 'Impact femmes', body: 'Leadership féminin tech-agri ; modèle pour femmes entrepreneures.' },
  { id: 'jeunes', title: 'Impact jeunes', body: 'Emplois et formation terrain pour jeunes ruraux.' },
  { id: 'emplois', title: 'Création d\'emplois', body: '4+ emplois directs prévus au BP (gardien, aviculture, bovins, coordination).' },
  { id: 'securite', title: 'Sécurité alimentaire', body: 'Œufs, volaille et viande bovine pour marchés locaux.' },
];

export const DEFAULT_SEEKING = {
  types: ['Investisseur', 'Banque', 'ONG', 'Subvention', 'Partenaire technique', 'Incubateur'],
  montant_recherche: '26064000',
  utilisation_fonds: 'Cheptel pondeuses · stock démarrage · matériel avicole/bovin · trésorerie de départ',
  priorite: 'Financement actifs productifs et trésorerie sécurisée',
  impact_attendu: 'Montée en charge production, emplois locaux, traçabilité ERP',
  calendrier: 'Dossiers banque / subvention / investisseur — 2026',
};

export const DEFAULT_TIMELINE = [
  {
    year: '2026',
    items: [
      { label: 'Création Horizon Farm', status: 'realise' },
      { label: 'Lancement exploitation', status: 'en_cours' },
      { label: 'ERP opérationnel', status: 'en_cours' },
      { label: 'Premières ventes', status: 'a_faire' },
    ],
  },
  {
    year: '2027',
    items: [
      { label: 'Croissance production', status: 'a_faire' },
      { label: 'Partenariats', status: 'a_faire' },
      { label: 'Forums & salons', status: 'a_faire' },
      { label: 'Financement structuré', status: 'a_faire' },
    ],
  },
  {
    year: '2028',
    items: [
      { label: 'Expansion', status: 'a_faire' },
      { label: 'Maraîchage développé', status: 'a_faire' },
      { label: 'Déploiement ERP', status: 'a_faire' },
      { label: 'Ouverture internationale', status: 'a_faire' },
    ],
  },
];

export const HERO_PILLS = [
  { id: 'location', label: '📍 Sénégal' },
  { id: 'founder', label: '👩🏽 Fondatrice : Penda THIAW' },
  { id: 'maraichage', label: '🌱 Agriculture & Maraîchage' },
  { id: 'avicole', label: '🐔 Élevage avicole' },
  { id: 'bovin', label: '🐄 Élevage bovin' },
  { id: 'erp', label: '💻 Horizon Farm ERP' },
  { id: 'ai', label: '🤖 Hey Horizon AI' },
];

/** Priorité par champ : manual | auto | manual_then_auto */
export const DEFAULT_FIELD_PRIORITIES = {
  project_pitch: 'manual_then_auto',
  vision: 'manual_then_auto',
  mission: 'manual_then_auto',
  ca_erp: 'auto',
  tresorerie: 'auto',
};

const hasText = (v) => String(v || '').trim().length > 0;

/** Applique les defaults uniquement sur champs vides — préserve données Supabase existantes. */
export function applyInvestorRoomDefaults(manual = {}) {
  const m = { ...(manual || {}) };
  const fill = (key, value) => {
    if (!hasText(m[key]) && hasText(value)) m[key] = value;
  };

  fill('project_pitch', HORIZON_INVESTOR_ROOM_POSITIONING);
  fill('vision', DEFAULT_VISION);
  fill('mission', DEFAULT_MISSION);
  fill('founder_name', 'Penda THIAW');
  fill('founder_role', 'Fondatrice · Ingénieure ESMT · ex-Sonatel');
  fill('location', 'Sénégal');
  fill('founder_story', DEFAULT_FOUNDER_STORY);
  fill('founder_cv', DEFAULT_FOUNDER_CV);
  fill('founder_education', DEFAULT_FOUNDER_EDUCATION);
  fill('founder_experience', DEFAULT_FOUNDER_EXPERIENCE);
  fill('founder_skills', DEFAULT_FOUNDER_SKILLS);
  fill('objectives_6m', DEFAULT_OBJECTIVES_6M);
  fill('objectives_12m', DEFAULT_OBJECTIVES_12M);
  fill('objectives_3y', DEFAULT_OBJECTIVES_3Y);
  fill('ai_headline', 'Hey Horizon AI — copilote décisionnel intégré à l\'ERP');
  fill('ai_differentiator', 'Une entreprise agricole avec son propre ERP et modules IA : pas seulement une ferme, un modèle reproductible.');
  fill('ai_modules', 'WhatsApp Horizon · OCR Intelligent · Brief vocal · Forecast Engine · Horizon Advisor');

  if (!m.why_invest?.length) m.why_invest = DEFAULT_WHY_INVEST;
  if (!m.seeking || typeof m.seeking !== 'object') m.seeking = { ...DEFAULT_SEEKING };
  else m.seeking = { ...DEFAULT_SEEKING, ...m.seeking };
  if (!m.timeline?.length) m.timeline = DEFAULT_TIMELINE;
  if (!m.field_priorities || typeof m.field_priorities !== 'object') {
    m.field_priorities = { ...DEFAULT_FIELD_PRIORITIES };
  }

  return m;
}

/** Résout une valeur selon priorité manual / auto. */
export function resolveInvestorField(priority = 'manual_then_auto', manualValue, autoValue) {
  const mode = priority || 'manual_then_auto';
  if (mode === 'auto') return autoValue ?? manualValue;
  if (mode === 'manual') return manualValue ?? autoValue;
  return hasText(manualValue) ? manualValue : autoValue;
}

/** KPI Investor Room — lecture ERP uniquement. */
export function buildInvestorKpiItems(profile = {}, readiness = {}) {
  const k = profile.keyFigures || {};
  const snap = profile.snapshot || {};
  const poultry = snap.poultry?.lots || {};
  const sante = snap.poultry?.sante || {};
  const sales = snap.sales?.ventes || snap.sales || {};
  const roi = k.besoin_bp > 0 && k.resultat_bp_an1 != null
    ? `${Math.round((Number(k.resultat_bp_an1) / Number(k.besoin_bp)) * 100)} %`
    : '—';

  return [
    { id: 'ca', label: 'CA', value: k.ca_erp, format: 'money', auto: true },
    { id: 'tresorerie', label: 'Trésorerie', value: k.resultat_tresorerie, format: 'money', auto: true },
    { id: 'resultat', label: 'Résultat', value: k.resultat_bp_an1 ?? k.resultat_tresorerie, format: 'money', auto: true },
    { id: 'production', label: 'Production', value: poultry.effectif_actif_total || 0, format: 'count', suffix: ' sujets', auto: true },
    { id: 'stocks', label: 'Stocks', value: k.valeur_stock, format: 'money', auto: true },
    { id: 'mortalite', label: 'Mortalité', value: sante.mortalite_cumulee ?? 0, format: 'count', auto: true },
    { id: 'roi', label: 'ROI', value: roi, format: 'text', auto: true },
    { id: 'marge', label: 'Marge', value: k.marge_brute, format: 'money', auto: true },
    { id: 'clients', label: 'Clients', value: k.clients || 0, format: 'count', auto: true },
    { id: 'commandes', label: 'Commandes', value: sales.commandes_total ?? sales.commandes_periode ?? 0, format: 'count', auto: true },
    { id: 'objectifs', label: 'Objectifs atteints', value: `${readiness.prep_ok_count || 0}/${readiness.prep_total || 0}`, format: 'text', auto: false },
  ];
}

export default applyInvestorRoomDefaults;
