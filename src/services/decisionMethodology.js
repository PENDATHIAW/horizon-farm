/** Textes méthodologiques affichés dans l'onglet Annexe (Centre + Objectifs). */

export const DECISION_METHODOLOGY_SECTIONS = [
  {
    id: 'calendrier',
    title: 'Calendrier marché & fêtes',
    items: [
      'Tabaski = 10 Dhu al-Hijjah · Korité = 1 Shawwal · Ramadan = 1 Ramadan · Magal = 18 Safar · Gamou = 12 Rabi al-Awwal.',
      'Conversion hijri → grégorien automatique (calendrier tabulaire). Ajustement manuel possible dans Paramètres pilotage.',
      'Pendant chaque fête, la ferme peut vendre bœufs/moutons, poulets de chair et œufs — le moteur calcule une fenêtre par produit.',
    ],
  },
  {
    id: 'quand-vendre',
    title: 'QUAND VENDRE (urgences)',
    items: [
      'Gain valeur/j = GMQ lissée (kg/j) × prix marché kg.',
      'Coût ration/j = consommation aliment réelle (kg/j) × prix aliment.',
      'Si gain < coût → vendre immédiatement (maturité économique négative).',
      'Bovin embouche ≠ bande avicole : navigation vers Animaux ou Avicole selon l\'entité concernée.',
    ],
  },
  {
    id: 'quand-lancer',
    title: 'QUAND LANCER (Cycles)',
    items: [
      'Date pivot = date fête − durée cycle produit (ex. J−90 bœufs, J−40 chair, J−30 œufs).',
      'Critique si date pivot dépassée sans stock/bande en place.',
      'ITH = Température + Humidité. Seuil stress configurable (défaut 29) → décalage ou densité −15%.',
      'Vide sanitaire minimum (défaut 10 j) + prolongation si pathologie récente.',
    ],
  },
  {
    id: 'bfr',
    title: 'Trésorerie & BFR cycle',
    items: [
      'Coût cycle estimé = effectif prochaine bande × coût aliment/j × durée cycle.',
      'Trésorerie disponible = solde + encaissements attendus + créances clients VIP.',
      'Couverture BFR = trésorerie ÷ coût cycle. Blocage si < seuil pilotage (défaut 50%).',
    ],
  },
  {
    id: 'demande',
    title: 'Demande & couverture (Objectifs)',
    items: [
      'Demande mensuelle = objectif CA activité × indice saison (calendrier commercial) × boost fête (+8 à +18%).',
      'Couverture = stock/disponible valorisé ÷ demande prévue (unités ou FCFA).',
      'Écart = demande − disponible → action vente, précommande ou lancement.',
    ],
  },
  {
    id: 'commercial',
    title: 'Recommandations commerciales',
    items: [
      'Écart CA = objectif mensuel activité − encaissements réalisés sur la période.',
      'Séparé du timing Cycles : pas de dates pivot ni lancement bande dans Recommandations.',
    ],
  },
  {
    id: 'graphiques',
    title: 'Graphiques',
    items: [
      'Centre : ponte vs aliment, IC chair, embouche, jours stock aliment, simulateur maraîcher.',
      'Objectifs G1–G7 : courbe ponte vs souche, CA vs point mort, âge lots, jauge objectif annuel, prix marché.',
    ],
  },
];

export const ENTITY_GLOSSARY = [
  { term: 'Bande / lot avicole', definition: 'Ensemble de poulets de chair ou pondeuses (module Avicole).' },
  { term: 'Bête / embouche', definition: 'Animal bovin, ovin ou caprin individuel (module Animaux).' },
  { term: 'Broutard', definition: 'Jeune bovin acheté pour embouche avant une fête.' },
  { term: 'Date pivot', definition: 'Dernier jour pour lancer ou acheter afin d\'être prêt à la fête.' },
  { term: 'GMQ', definition: 'Gain moyen quotidien de poids (kg/j), lissé sur les derniers pesages.' },
  { term: 'IC', definition: 'Indice de consommation = kg aliment ÷ kg poids vif produit.' },
  { term: 'ITH', definition: 'Indice température-humidité = T (°C) + HR (%).' },
];

export default DECISION_METHODOLOGY_SECTIONS;
