/** Données source — dossier investisseur Horizon Farm + Tallow & Go */
export const BRAND = {
  green: '#052e16',
  greenMid: '#15803d',
  greenLight: '#22c55e',
  ivory: '#fffdf8',
  gold: '#9a6b12',
  goldLight: '#c9a227',
  black: '#1a1a1a',
  muted: '#5c5c5c',
  border: '#d4c4a8',
};

export const IDENTITY = {
  project: 'HORIZON FARM',
  subtitle: 'Integrated Agricultural Value Chain Project',
  subtitleFr: 'Projet de chaîne de valeur agricole intégrée',
  founder: 'PENDA THIAW DIAGNE',
  legal: 'Entreprise individuelle au réel IR',
  slogan: 'De la terre à l\'horizon',
  tagline: 'Pilotez votre ferme. Anticipez vos risques. Développez votre croissance.',
  contact: 'contact@horizon-farm.app',
  location: 'Sénégal · Afrique de l\'Ouest',
  year: '2026',
};

export const FINANCE = {
  startupTotal: 26_064_000,
  fundingPersonal: 26_064_000,
  revenueY1: 121_820_000,
  revenueY5: [121_820_000, 158_366_000, 190_039_200, 218_545_080, 240_399_588],
  resultY5: [22_918_000, 33_606_400, 43_822_080, 51_426_312, 56_568_943],
  cashEndY1: 28_528_000,
  bfrY1: 3_395_178,
};

export const REVENUE_ACTIVITIES = [
  { label: 'Poulets de chair', amount: 47_520_000, pct: 39 },
  { label: 'Œufs (tablettes 30)', amount: 36_630_000, pct: 30 },
  { label: 'Embouche bovine', amount: 35_000_000, pct: 29 },
  { label: 'Fumier & co-produits', amount: 2_670_000, pct: 2 },
];

export const STARTUP_LINES = [
  { label: 'Stock matières & produits départ', amount: 17_260_000 },
  { label: 'Trésorerie de départ', amount: 4_260_000 },
  { label: '3 000 poussins pondeuses', amount: 2_700_000 },
  { label: 'Matériel avicole & bovins', amount: 1_844_000 },
];

export const TEAM = [
  { role: 'Coordonnatrice projet', name: 'PENDA THIAW DIAGNE', salary: '600 000 FCFA/mois' },
  { role: 'Gardien', count: 1, salary: '110 000 FCFA/mois' },
  { role: 'Aviculture & conditionnement', count: 2, salary: '70 000 FCFA/mois' },
  { role: 'Agent élevage bovins', count: 1, salary: '70 000 FCFA/mois' },
];

export const TALLOW_PRODUCTS = [
  {
    id: 'safaa',
    name: 'SAFAA',
    fr: 'Savon Purifiant au Tallow',
    en: 'Purifying Tallow Bar',
    size: '200 g',
    composition: ['Purified Beef Tallow', 'Cow Milk', 'Neem Oil', 'Activated Charcoal'],
    benefits: ['Nettoie en profondeur', 'Purifie et élimine les impuretés', 'Respecte l\'équilibre cutané', 'Visage & corps'],
  },
  {
    id: 'aura',
    name: 'AURA',
    fr: 'Gommage Fouetté Clarifiant',
    en: 'Clarifying Whipped Polish',
    size: '500 g',
    composition: ['Whipped Beef Tallow', 'Activated Charcoal', 'Fine Sugar', 'Black Seed Oil', 'Vitamin E'],
    benefits: ['Détoxifie en profondeur', 'Exfolie en douceur', 'Clarifie le teint', 'Ravive l\'éclat'],
  },
  {
    id: 'shiny',
    name: 'SHINY',
    fr: 'Lait Visage & Corps Éclat',
    en: 'Radiance Face & Body Milk',
    size: '500 ml',
    composition: ['Beef Tallow', 'Carrot Oil', 'Hibiscus Seed Oil', 'Niacinamide', 'Panthenol', 'Vitamin E'],
    benefits: ['Nourrit intensément', 'Hydrate durablement', 'Révèle l\'éclat naturel', 'Visage & corps'],
  },
  {
    id: 'noor',
    name: 'NOOR',
    fr: 'Crème Fouettée Réparatrice de Nuit',
    en: 'Overnight Recovery Whip',
    size: '200 g',
    composition: ['Whipped Beef Tallow', 'Moringa Oil', 'Licorice Extract', 'Vitamin E'],
    benefits: ['Répare la nuit', 'Apaise et régénère', 'Améliore l\'élasticité', 'Unifie le teint'],
  },
  {
    id: 'soft-kiss',
    name: 'SOFT KISS',
    fr: 'Baume Lèvres Nourrissant',
    en: 'Nourishing Lip Veil',
    size: '15 g',
    composition: ['Beef Tallow', 'Castor Oil', 'Beeswax', 'Shea Butter', 'Vitamin E'],
    benefits: ['Nourrit et protège', 'Adoucit et lisse', 'Répare lèvres gercées'],
  },
];

export const ROADMAP = [
  { year: '2026', phase: 'Lancement', items: ['Mise en production avicole & bovins', 'ERP Horizon Farm opérationnel', 'Formulation Tallow & Go'] },
  { year: '2027', phase: 'Consolidation', items: ['Montée en cadence commerciale', 'Lancement gamme cosmétique', 'Partenariats distribution'] },
  { year: '2028', phase: 'Extension', items: ['Capacité pondeuses + chair', 'Unité transformation alimentaire', 'Export régional'] },
  { year: '2029', phase: 'Intégration', items: ['Chaîne froid & logistique', 'Certifications qualité', 'Filière laitière (phase 2)'] },
  { year: '2030', phase: 'Leadership', items: ['Modèle réplicable Afrique de l\'Ouest', 'Marque Tallow & Go reconnue', 'Impact mesurable communautés'] },
];

export const RISKS = [
  { risk: 'Fluctuation prix aliments', level: 'Moyen', mitigation: 'Contrats fournisseurs, stock sécurité, diversification' },
  { risk: 'Mortalité avicole / sanitaire', level: 'Élevé', mitigation: 'Prophylaxie, biosécurité, suivi vétérinaire' },
  { risk: 'Trésorerie saisonnière', level: 'Moyen', mitigation: 'BP 5 ans, BFR maîtrisé, trésorerie départ 4,26 M' },
  { risk: 'Marché cosmétique', level: 'Moyen', mitigation: 'Différenciation suif purifié, traçabilité, made in Senegal' },
  { risk: 'Climat & infrastructure', level: 'Moyen', mitigation: 'Capteurs IoT, locaux adaptés, plans continuité' },
];

export function fmtFcfa(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' FCFA';
}

export function fmtM(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + ' M FCFA';
  return fmtFcfa(n);
}
