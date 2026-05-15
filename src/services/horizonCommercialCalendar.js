export const HORIZON_YEAR_ROUND_MARKETS = {
  bovins: ['bouchers', 'foirails', 'Touba', 'cérémonies de Berndé', 'restaurants', 'clients directs'],
  ovins: ['bouchers', 'foirails', 'Touba', 'baptêmes', 'cérémonies de Berndé', 'clients directs'],
  caprins: ['marché local', 'bouchers', 'cérémonies familiales', 'clients directs'],
  oeufs: ['consommateurs directs', 'boutiques', 'pâtisseries', 'restaurants', 'hôtels', 'revendeurs'],
  poulets_chair: ['consommateurs directs', 'restaurants', 'cérémonies', 'mariages', 'baptêmes', 'événements communautaires'],
  cultures: ['marchés locaux', 'restaurants', 'revendeurs', 'consommateurs directs'],
};

export const HORIZON_COMMERCIAL_MONTHS = [
  {
    month: 1,
    label: 'Janvier',
    season: 'contre_saison_froide_post_fetes',
    demand: { oeufs: 'forte', poulets_chair: 'normale', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'forte', stock: 'normale' },
    focus: ['cultures', 'oeufs', 'poulets_chair'],
    crops: ['salade', 'carotte', 'tomate', 'laitue', 'chou'],
    markets: { oeufs: ['pâtisseries', 'consommateurs directs'], cultures: ['marchés locaux', 'revendeurs'] },
    actions: ['Vente massive salades, carottes et tomates.', 'Maintenir forte disponibilité œufs post-fêtes et pâtisseries.', 'Échelonner les récoltes pour éviter la chute des prix.'],
    risks: ['surproduction maraîchère', 'prix bas si récoltes non échelonnées'],
  },
  {
    month: 2,
    label: 'Février',
    season: 'contre_saison_froide_ceremonies',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'forte', caprins: 'forte', cultures: 'forte', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'ovins', 'caprins', 'cultures'],
    crops: ['chou', 'pomme de terre', 'laitue', 'carotte'],
    markets: { ovins: ['baptêmes', 'cérémonies début d’année'], caprins: ['baptêmes', 'cérémonies familiales'], cultures: ['marchés locaux'] },
    actions: ['Récolter et vendre choux et pommes de terre.', 'Vendre jeunes agneaux/chevreaux pour baptêmes.', 'Planifier bandes de chair si bâtiment, aliment et clients le permettent.'],
    risks: ['rupture œufs', 'mauvaise planification chair', 'prix cultures variable'],
  },
  {
    month: 3,
    label: 'Mars',
    season: 'fin_saison_fraiche',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'forte', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'cultures'],
    crops: ['oignon local', 'pomme de terre', 'tomate'],
    markets: { poulets_chair: ['mariages fin de saison fraîche', 'cérémonies'], cultures: ['marchés locaux', 'grossistes'] },
    actions: ['Pic de vente de l’oignon local.', 'Vendre poulets de chair pour mariages de fin de saison fraîche.', 'Contrôler cash et créances.'],
    risks: ['fin de contre-saison', 'besoin eau', 'charges alimentation'],
  },
  {
    month: 4,
    label: 'Avril',
    season: 'periode_charniere_saison_chaude',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'cultures', 'ovins'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    markets: { ovins: ['préparation Tabaski', 'foirails'], cultures: ['marchés locaux'] },
    actions: ['Finir ventes des derniers stocks d’oignons.', 'Commencer sélection des béliers si Tabaski est dans environ 3 mois.', 'Renforcer ventilation, eau et biosécurité avicole.'],
    risks: ['stress thermique', 'maladies avicoles', 'eau insuffisante'],
  },
  {
    month: 5,
    label: 'Mai',
    season: 'saison_chaude_pre_hivernage',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'forte', ovins: 'forte', caprins: 'forte', cultures: 'forte', stock: 'normale' },
    focus: ['oeufs', 'poulets_chair', 'bovins', 'ovins', 'caprins', 'cultures'],
    crops: ['piment', 'gombo', 'poivron', 'tomate cerise'],
    markets: { ovins: ['pré-Tabaski si délai respecté', 'foirails'], bovins: ['bouchers', 'Touba', 'Berndé'], cultures: ['marchés locaux'] },
    actions: ['Vendre piment et gombo, les prix commencent à monter.', 'Profiter des œufs si production baisse avec chaleur.', 'Vérifier deadlines Tabaski : si trop tard, préparer Magal/Gamou/fin d’année.'],
    risks: ['investissement trop tardif pour Tabaski', 'cash immobilisé', 'stress thermique'],
  },
  {
    month: 6,
    label: 'Juin',
    season: 'debut_hivernage_tabaski_possible',
    demand: { oeufs: 'normale', poulets_chair: 'normale', bovins: 'forte', ovins: 'forte', caprins: 'forte', cultures: 'normale', stock: 'normale' },
    focus: ['ovins', 'bovins', 'caprins', 'cultures'],
    crops: ['maïs doux', 'légumes de saison des pluies', 'gombo'],
    markets: { ovins: ['Tabaski', 'vente directe ferme', 'foirail'], bovins: ['bouchers', 'foirails'], caprins: ['marché local'] },
    actions: ['Mois d’or ovins si Tabaski est positionnée en juin.', 'Vendre bétail uniquement si engraissement déjà réalisé.', 'Vendre maïs doux et légumes de saison des pluies.'],
    risks: ['maladies hivernage', 'mortalité avicole', 'vente bétail non préparée'],
  },
  {
    month: 7,
    label: 'Juillet',
    season: 'hivernage',
    demand: { oeufs: 'normale', poulets_chair: 'normale', bovins: 'forte', ovins: 'normale', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['bovins', 'cultures', 'oeufs', 'biosécurité'],
    crops: ['bissap vert', 'feuilles de niébé', 'gombo'],
    markets: { bovins: ['cérémonies hivernage', 'bouchers', 'Touba', 'Berndé'], cultures: ['marchés locaux'] },
    actions: ['Vendre bissap vert et feuilles de niébé.', 'Vendre bovins pour cérémonies de l’hivernage.', 'Maintenir biosécurité chair, chaleur et humidité.'],
    risks: ['chaleur et humidité', 'maladies', 'baisse marge chair'],
  },
  {
    month: 8,
    label: 'Août',
    season: 'hivernage_prix_oeufs',
    demand: { oeufs: 'forte', poulets_chair: 'normale', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['oeufs', 'cultures', 'poulets_chair'],
    crops: ['radis', 'herbes aromatiques', 'gombo', 'piment'],
    markets: { oeufs: ['consommateurs directs', 'boutiques', 'pâtisseries'], cultures: ['marchés locaux'] },
    actions: ['Profiter des prix élevés des œufs liés à la rareté/chaleur.', 'Vendre produits de cycle court : radis, herbes aromatiques.', 'Préparer événements confirmés Magal/Gamou.'],
    risks: ['dates événement non confirmées', 'maladies hivernage', 'logistique'],
  },
  {
    month: 9,
    label: 'Septembre',
    season: 'magal_gamou_evenements',
    demand: { oeufs: 'normale', poulets_chair: 'forte', bovins: 'forte', ovins: 'forte', caprins: 'normale', cultures: 'normale', stock: 'normale' },
    focus: ['bovins', 'ovins', 'poulets_chair', 'oeufs'],
    crops: ['piment', 'poivron', 'tomate cerise', 'gombo'],
    markets: { bovins: ['dahiras', 'restaurateurs', 'Touba', 'Berndé'], ovins: ['dahiras', 'cérémonies'], poulets_chair: ['repas communautaires'] },
    actions: ['Forte demande bovins pour grands rassemblements.', 'Vendre poulets de chair pour repas communautaires.', 'Cibler dahiras, restaurateurs, commandes groupées.'],
    risks: ['humidité', 'retard livraison', 'prix aliments'],
  },
  {
    month: 10,
    label: 'Octobre',
    season: 'sortie_hivernage_pre_fin_annee',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'forte', cultures: 'forte', stock: 'forte' },
    focus: ['poulets_chair', 'oeufs', 'cultures', 'caprins'],
    crops: ['piment fin d’hivernage', 'gombo', 'tomate cerise'],
    markets: { caprins: ['marché local'], cultures: ['marchés locaux', 'prix élevés piment'] },
    actions: ['Reprise des pépinières.', 'Vendre piments de fin d’hivernage, prix souvent élevés.', 'Mettre en place chair pour fin d’année si date de vente visée.'],
    risks: ['mise en place tardive', 'rupture aliment', 'précommandes insuffisantes'],
  },
  {
    month: 11,
    label: 'Novembre',
    season: 'contre_saison_froide_debut_fin_annee',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'normale', ovins: 'normale', caprins: 'normale', cultures: 'forte', stock: 'forte' },
    focus: ['poulets_chair', 'oeufs', 'cultures'],
    crops: ['tomate de contre-saison', 'laitue', 'chou', 'carotte'],
    markets: { poulets_chair: ['Noël', 'fin d’année'], oeufs: ['pâtisseries', 'restaurants'], cultures: ['marchés locaux'] },
    actions: ['Lancer production chair pour Noël au plus tard autour du 10 novembre pour vente à 45 jours.', 'Premières récoltes de tomates de contre-saison.', 'Sécuriser hôtels, restaurants, supermarchés, consommateurs directs.'],
    risks: ['retard chair', 'prix cultures', 'stock emballages'],
  },
  {
    month: 12,
    label: 'Décembre',
    season: 'fin_annee_pic_commercial',
    demand: { oeufs: 'forte', poulets_chair: 'forte', bovins: 'forte', ovins: 'forte', caprins: 'normale', cultures: 'forte', stock: 'forte' },
    focus: ['poulets_chair', 'oeufs', 'bovins', 'ovins', 'cultures'],
    crops: ['salade', 'tomate', 'laitue', 'chou', 'carotte'],
    markets: { poulets_chair: ['Noël', 'réveillons', 'familles'], oeufs: ['pâtisseries'], bovins: ['réveillons', 'bouchers'], ovins: ['moutons de luxe', 'Ladoum'] },
    actions: ['Mois record tablettes d’œufs et poulets de chair.', 'Vendre moutons de luxe ou bovins pour réveillons.', 'Livrer commandes groupées et éviter la survente sans capacité.'],
    risks: ['rupture stock', 'retards livraison', 'survente sans capacité'],
  },
];

export const HORIZON_TRANSVERSAL_STRATEGIES = [
  'Vendre toute l’année grâce aux carnets d’adresses : bouchers, foirails, dahiras, restaurants, Touba, Berndé, consommateurs directs.',
  'Utiliser les pics commerciaux pour maximiser volume, prix et vitesse de vente, sans considérer les autres mois comme vides.',
  'Organiser les bandes de poulets de chair toutes les 4 semaines si bâtiment, aliment et clients le permettent.',
  'Pour le poulet de chair, viser 45 jours : pour vendre en décembre, les poussins doivent arriver au plus tard autour du 10 novembre.',
  'Transformer ou stocker les surplus maraîchers pour éviter les prix bas en récolte abondante.',
  'Utiliser les résidus de cultures pour le bétail quand c’est adapté.',
  'Valoriser les fientes et déjections comme fertilisant naturel pour les cultures.',
  'Sécuriser hôtels, restaurants, supermarchés, dahiras, bouchers et clients directs avant investissement lourd.',
];

export function getCommercialMonth(monthNumber) {
  return HORIZON_COMMERCIAL_MONTHS.find((row) => row.month === Number(monthNumber));
}

export function getYearRoundMarkets(activity) {
  return HORIZON_YEAR_ROUND_MARKETS[activity] || [];
}

export function demandLevelToFactor(level = 'normale') {
  if (level === 'forte') return 1.35;
  if (level === 'faible') return 0.85;
  return 1;
}

export default HORIZON_COMMERCIAL_MONTHS;
