export const HORIZON_COMMERCIAL_MONTHS = [
  {
    month: 1,
    label: 'Janvier',
    season: 'contre_saison_froide',
    demand: { oeufs: 'normale', poulets_chair: 'normale', bovins: 'faible', ovins: 'faible', caprins: 'faible', cultures: 'forte', stock: 'normale' },
    focus: ['cultures', 'oeufs', 'poulets_chair'],
    crops: ['oignon', 'pomme de terre', 'laitue', 'chou', 'carotte'],
    actions: ['Maximiser les cultures de contre-saison froide.', 'Préparer les ventes régulières œufs/chair.', 'Échelonner les récoltes pour éviter l’effondrement des prix.'],
    risks: ['surproduction maraîchère', 'prix bas si récoltes non échelonnées'],
  },
  {
    month: 2,
    label: 'Février',
    season: 'contre_saison_froide_ceremonies',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'faible', ovins: 'faible', caprins: 'faible', cultures: 'forte', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'cultures'],
    crops: ['oignon', 'pomme de terre', 'laitue', 'chou', 'carotte'],
    actions: ['Maintenir production maximale d’œufs.', 'Planifier bandes de chair tous les 28 jours si capacité disponible.', 'Sécuriser clients cérémonies : mariages, baptêmes.'],
    risks: ['rupture œufs', 'mauvaise planification chair', 'prix cultures variable'],
  },
  {
    month: 3,
    label: 'Mars',
    season: 'ceremonies_fin_contre_saison',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'forte', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'cultures'],
    crops: ['oignon', 'pomme de terre', 'laitue', 'chou', 'carotte'],
    actions: ['Poursuivre ventes cérémonies.', 'Préparer transition cultures résistantes chaleur.', 'Contrôler cash et créances.'],
    risks: ['fin de contre-saison', 'besoin eau', 'charges alimentation'],
  },
  {
    month: 4,
    label: 'Avril',
    season: 'saison_chaude',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'cultures'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    actions: ['Privilégier cultures résistantes chaleur.', 'Renforcer ventilation et eau en avicole.', 'Préparer mise en place bétail si Tabaski tombe dans environ 3 mois.'],
    risks: ['stress thermique', 'maladies avicoles', 'eau insuffisante'],
  },
  {
    month: 5,
    label: 'Mai',
    season: 'saison_chaude_pre_hivernage',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'forte', ovins: 'forte', caprins: 'forte', cultures: 'normale', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'bovins', 'ovins', 'caprins'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    actions: ['Vérifier deadlines Tabaski selon date réelle.', 'Ne pas acheter tardivement pour un événement trop proche.', 'Préparer fenêtres suivantes : Magal, Gamou, fin d’année.'],
    risks: ['investissement trop tardif', 'cash immobilisé', 'stress thermique'],
  },
  {
    month: 6,
    label: 'Juin',
    season: 'debut_hivernage',
    demand: { oeufs: 'normale', poulets_chair: 'normale', bovins: 'forte', ovins: 'forte', caprins: 'forte', cultures: 'normale', stock: 'normale' },
    focus: ['bovins', 'ovins', 'caprins', 'oeufs'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    actions: ['Vendre bétail uniquement si engraissement déjà réalisé.', 'Renforcer biosécurité avicole.', 'Surveiller humidité, ventilation et maladies.'],
    risks: ['maladies hivernage', 'mortalité avicole', 'vente bétail non préparée'],
  },
  {
    month: 7,
    label: 'Juillet',
    season: 'hivernage',
    demand: { oeufs: 'normale', poulets_chair: 'normale', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['oeufs', 'cultures', 'biosécurité'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    actions: ['Vendre les œufs en direct ou coopératives pour marge.', 'Maintenir biosécurité chair.', 'Préparer calendrier Magal/Gamou si dates confirmées.'],
    risks: ['chaleur et humidité', 'maladies', 'baisse marge chair'],
  },
  {
    month: 8,
    label: 'Août',
    season: 'hivernage_evenements',
    demand: { oeufs: 'normale', poulets_chair: 'normale', bovins: 'forte', ovins: 'forte', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['bovins', 'ovins', 'poulets_chair', 'oeufs'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    actions: ['Préparer ventes lots aux dahiras/restaurateurs si Magal proche.', 'Ne vendre que les animaux prêts.', 'Planifier prochaine bande de chair pour événements confirmés.'],
    risks: ['dates événement non confirmées', 'maladies hivernage', 'logistique'],
  },
  {
    month: 9,
    label: 'Septembre',
    season: 'hivernage_evenements',
    demand: { oeufs: 'normale', poulets_chair: 'forte', bovins: 'forte', ovins: 'forte', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['bovins', 'ovins', 'poulets_chair', 'oeufs'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    actions: ['Cibler dahiras, restaurateurs, commandes groupées.', 'Préparer fin d’année : chair gros calibre et œufs pâtisserie.', 'Évaluer bandes successives de chair.'],
    risks: ['humidité', 'retard livraison', 'prix aliments'],
  },
  {
    month: 10,
    label: 'Octobre',
    season: 'sortie_hivernage_pre_fin_annee',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'normale', stock: 'forte' },
    focus: ['poulets_chair', 'oeufs', 'stock'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    actions: ['Mettre en place poussins chair 6 à 8 semaines avant fin d’année.', 'Sécuriser précommandes fin d’année.', 'Préparer tablettes œufs pour pâtisserie.'],
    risks: ['mise en place tardive', 'rupture aliment', 'précommandes insuffisantes'],
  },
  {
    month: 11,
    label: 'Novembre',
    season: 'contre_saison_froide_debut_fin_annee',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'forte', stock: 'forte' },
    focus: ['poulets_chair', 'oeufs', 'cultures'],
    crops: ['oignon', 'pomme de terre', 'laitue', 'chou', 'carotte'],
    actions: ['Dernières mises en place chair pour fin d’année selon deadline.', 'Démarrer cultures de contre-saison froide.', 'Sécuriser hôtels, restaurants, supermarchés, consommateurs directs.'],
    risks: ['retard chair', 'prix cultures', 'stock emballages'],
  },
  {
    month: 12,
    label: 'Décembre',
    season: 'fin_annee_pic_commercial',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'forte', ovins: 'normale', caprins: 'normale', cultures: 'forte', stock: 'forte' },
    focus: ['poulets_chair', 'oeufs', 'bovins', 'cultures'],
    crops: ['oignon', 'pomme de terre', 'laitue', 'chou', 'carotte'],
    actions: ['Vendre chair gros calibre et œufs pâtisserie.', 'Livrer commandes groupées.', 'Éviter de lancer ce qui aurait dû être mis en place 6 à 8 semaines avant.'],
    risks: ['rupture stock', 'retards livraison', 'survente sans capacité'],
  },
];

export const HORIZON_TRANSVERSAL_STRATEGIES = [
  'Diversifier pour lisser le CA : œufs, chair, bétail, cultures et stock.',
  'Organiser les bandes de poulets de chair toutes les 4 semaines si bâtiment, aliment et clients le permettent.',
  'Transformer ou stocker les surplus maraîchers pour éviter les prix bas en récolte abondante.',
  'Utiliser les résidus de cultures pour le bétail quand c’est adapté.',
  'Valoriser les fientes et déjections comme fertilisant naturel pour les cultures.',
  'Sécuriser hôtels, restaurants, supermarchés, dahiras, bouchers et clients directs avant investissement lourd.',
];

export function getCommercialMonth(monthNumber) {
  return HORIZON_COMMERCIAL_MONTHS.find((row) => row.month === Number(monthNumber));
}

export function demandLevelToFactor(level = 'normale') {
  if (level === 'forte') return 1.35;
  if (level === 'faible') return 0.78;
  return 1;
}

export default HORIZON_COMMERCIAL_MONTHS;
