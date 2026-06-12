/**
 * Phrases réelles exploitants — WhatsApp, terrain, oral sénégalais.
 * Fusionnées dans MODULE_BUSINESS_QUESTIONS pour le matcher sémantique.
 */

const F = Object.freeze({
  SALUTATION: 'SALUTATION',
  ELEVAGE: 'ELEVAGE',
  CULTURES: 'CULTURES',
  STOCK: 'STOCK',
  COMMERCIAL: 'COMMERCIAL',
  FINANCE: 'FINANCE',
  OBJECTIFS: 'OBJECTIFS',
  DECISION: 'DECISION',
  INVESTISSEUR: 'INVESTISSEUR',
  METEO: 'METEO',
});

/**
 * Bundles terrain par module ERP — formulations orales, WhatsApp, micro.
 * @type {ReadonlyArray<{ module: string, family: string, intent: string, label?: string, phrases: string[] }>}
 */
export const TERRAIN_PHRASE_BUNDLES = Object.freeze([
  {
    module: 'assistant_erp',
    family: F.SALUTATION,
    intent: 'greeting',
    label: 'Accueil terrain',
    phrases: [
      'hey horizon',
      'salut horizon',
      'bonjour horizon',
      'coucou horizon',
      'tu es la',
      'tu es là',
    ],
  },
  {
    module: 'dashboard',
    family: F.DECISION,
    intent: 'today_priorities',
    phrases: [
      'c est quoi le plan du jour',
      'par quoi je commence ce matin',
      'qu est ce qui urge sur la ferme',
      'la matinee on fait quoi',
      'priorite terrain aujourd hui',
    ],
  },
  {
    module: 'dashboard',
    family: F.INVESTISSEUR,
    intent: 'farm_overview',
    phrases: [
      'la ferme est comment',
      'situation ferme ce matin',
      'bilan rapide ferme',
      'resume exploitation',
    ],
  },
  {
    module: 'elevage',
    family: F.ELEVAGE,
    intent: 'lot_mortality',
    phrases: [
      '5 poulets sont morts aujourd hui dans le lot chair',
      'on a perdu des poulets ce matin',
      'mortalite lot chair',
      'des poulets ont cale ce matin',
      'perte dans la bande chair',
      'combien de morts dans le lot',
    ],
  },
  {
    module: 'elevage',
    family: F.ELEVAGE,
    intent: 'lots_sick',
    phrases: [
      'la bande chair est malade',
      'lot en difficulte sante',
      'mes poulets sont malades',
      'quelle bande est en alerte',
      'probleme sante sur un lot',
    ],
  },
  {
    module: 'elevage',
    family: F.ELEVAGE,
    intent: 'headcount_poulets',
    phrases: [
      'combien de poulets en chair',
      'effectif lot chair',
      'j ai encore combien de poulets',
      'les poulets de chair combien',
    ],
  },
  {
    module: 'elevage',
    family: F.ELEVAGE,
    intent: 'lots_overview',
    phrases: [
      'mes bandes avicoles',
      'quels lots en cours',
      'situation des bandes',
      'etat des lots ce matin',
    ],
  },
  {
    module: 'elevage',
    family: F.ELEVAGE,
    intent: 'elevage_status',
    phrases: [
      'l elevage tient le coup',
      'comment va le cheptel',
      'point elevage terrain',
      'situation elevage ce matin',
    ],
  },
  {
    module: 'elevage',
    family: F.ELEVAGE,
    intent: 'animals_under_treatment',
    phrases: [
      'qui est sous traitement encore',
      'animaux en traitement ce matin',
      'traitement en cours sur le lot',
    ],
  },
  {
    module: 'elevage',
    family: F.ELEVAGE,
    intent: 'stock_aliment',
    phrases: [
      'reste assez d aliment pour les lots',
      'provende pour la bande',
      'aliment chair combien de sacs',
    ],
  },
  {
    module: 'commercial',
    family: F.COMMERCIAL,
    intent: 'ventes',
    phrases: [
      'on a bien vendu cette semaine',
      'c est quoi mes ventes cette semaine',
      'ventes orange money cette semaine',
      'performance ventes terrain',
      'combien on a encaisse sur les ventes',
    ],
  },
  {
    module: 'commercial',
    family: F.COMMERCIAL,
    intent: 'ventes_today',
    phrases: [
      'ventes du matin',
      'resume ventes aujourd hui',
      'ventes orange money aujourd hui',
    ],
  },
  {
    module: 'commercial',
    family: F.COMMERCIAL,
    intent: 'receivables',
    phrases: [
      'qui me doit encore',
      'clients qui n ont pas paye',
      'argent pas recu des clients',
      'qui doit encore payer',
      'le client la ne paye jamais',
    ],
  },
  {
    module: 'commercial',
    family: F.COMMERCIAL,
    intent: 'relances',
    phrases: [
      'qui je dois relancer',
      'clients a rappeler pour paiement',
      'relance paiement clients',
      'qui n a pas encore paye',
    ],
  },
  {
    module: 'commercial',
    family: F.COMMERCIAL,
    intent: 'deliveries_overview',
    phrases: [
      'livraisons superette du jour',
      'livraisons du matin',
      'qu est ce qui part en livraison',
      'livraisons prevues aujourd hui',
    ],
  },
  {
    module: 'commercial',
    family: F.COMMERCIAL,
    intent: 'orders_overview',
    phrases: [
      'commandes hotel terminus',
      'commandes clients en attente',
      'qui a commande cette semaine',
    ],
  },
  {
    module: 'commercial',
    family: F.DECISION,
    intent: 'sell_today',
    phrases: [
      'quoi ecouler vite',
      'produits a sortir du stock aujourd hui',
      'que je peux vendre maintenant',
    ],
  },
  {
    module: 'achats_stock',
    family: F.STOCK,
    intent: 'stock_aliment',
    phrases: [
      'il reste des sacs d aliment',
      'y a encore du provender',
      'combien de sacs aliment restants',
      'stock aliment chair',
      'assez d aliment pour la semaine',
    ],
  },
  {
    module: 'achats_stock',
    family: F.STOCK,
    intent: 'stock_overview',
    phrases: [
      'magasin c est quoi',
      'etat magasin ce matin',
      'inventaire rapide',
      'qu est ce qui reste au magasin',
    ],
  },
  {
    module: 'achats_stock',
    family: F.STOCK,
    intent: 'stock_ruptures',
    phrases: [
      'on manque de quoi',
      'produits en rupture magasin',
      'stock bas alerte',
      'rupture intrants',
    ],
  },
  {
    module: 'achats_stock',
    family: F.STOCK,
    intent: 'purchases_overview',
    phrases: [
      'dernier achat aliment',
      'achats intrants cette semaine',
      'achats sacs aliment cette semaine',
    ],
  },
  {
    module: 'finance_pilotage',
    family: F.FINANCE,
    intent: 'treasury',
    phrases: [
      'il me reste combien en caisse',
      'la treso est comment',
      'combien en caisse et banque',
      'argent disponible maintenant',
      'c est quoi la tresorerie',
    ],
  },
  {
    module: 'finance_pilotage',
    family: F.FINANCE,
    intent: 'dettes',
    phrases: [
      'factures fournisseurs a payer',
      'qui je dois payer cette semaine',
      'dettes urgentes',
    ],
  },
  {
    module: 'finance_pilotage',
    family: F.FINANCE,
    intent: 'creances',
    phrases: [
      'j ai encaisse combien du client a',
      'encaissements attendus',
      'argent a recuperer clients',
    ],
  },
  {
    module: 'finance_pilotage',
    family: F.FINANCE,
    intent: 'resultat',
    phrases: [
      'la ferme est rentable ou pas',
      'on gagne ou on perd',
      'resultat du mois terrain',
    ],
  },
  {
    module: 'cultures',
    family: F.METEO,
    intent: 'weather_now',
    phrases: [
      'il fait chaud pour les poulets',
      'temperature dehors maintenant',
      'c est chaud ce matin pour l elevage',
      'meteo pour les bandes',
    ],
  },
  {
    module: 'cultures',
    family: F.METEO,
    intent: 'weather_forecast',
    phrases: [
      'va pleuvoir cette semaine',
      'pluie prevue pour les cultures',
      'meteo demain pour parcelles',
    ],
  },
  {
    module: 'cultures',
    family: F.CULTURES,
    intent: 'recoltes',
    phrases: [
      'c est pret a recolter quoi',
      'recolte dispo maintenant',
      'quoi ramasser cette semaine',
    ],
  },
  {
    module: 'cultures',
    family: F.CULTURES,
    intent: 'parcelles_status',
    phrases: [
      'mes parcelles ce matin',
      'etat parcelles terrain',
      'situation champs',
    ],
  },
  {
    module: 'objectifs_croissance',
    family: F.OBJECTIFS,
    intent: 'progress_status',
    phrases: [
      'ou j en suis sur mes objectifs ce mois',
      'j ai atteint mon objectif',
      'ecart sur objectif mensuel',
    ],
  },
  {
    module: 'rh',
    family: F.DECISION,
    intent: 'rh_personnel',
    phrases: [
      'qui est sur le terrain aujourd hui',
      'equipe presente ce matin',
      'personnel dispo',
    ],
  },
  {
    module: 'rh',
    family: F.DECISION,
    intent: 'equipment_overview',
    phrases: [
      'tracteur en panne',
      'pompe cassee ce matin',
      'materiel qui marche pas',
    ],
  },
  {
    module: 'documents_rapports',
    family: F.DECISION,
    intent: 'documents_summary',
    phrases: [
      'rapports generes cette semaine',
      'derniers documents ferme',
      'exports recents',
    ],
  },
]);

/** Regex additionnelles pour routeFarmTool (formulations orales). */
export const TERRAIN_TOOL_PATTERN_STRINGS = Object.freeze([
  'orange money',
  'lot chair',
  'bande chair',
  'superette',
  'provender',
  'provende',
  'cale',
  'hotel terminus',
  'encaisse',
  'impaye',
  'impayé',
  'relance paiement',
  'treso',
  'tréso',
  'ce matin',
  'terrain',
]);

/**
 * Fusionne les phrases terrain dans le catalogue module (copie profonde des entrées).
 */
export function mergeTerrainPhrasesIntoCatalog(catalog = {}) {
  const merged = {};
  for (const [moduleId, entries] of Object.entries(catalog)) {
    merged[moduleId] = entries.map((entry) => ({
      ...entry,
      farmer: [...entry.farmer],
      manager: [...entry.manager],
      investor: [...entry.investor],
      phrases: [...entry.phrases],
    }));
  }

  for (const bundle of TERRAIN_PHRASE_BUNDLES) {
    const moduleEntries = merged[bundle.module];
    if (!moduleEntries) continue;

    const entry = moduleEntries.find((row) => row.intent === bundle.intent);
    if (entry) {
      const extra = bundle.phrases.filter((p) => !entry.phrases.includes(p));
      entry.farmer.push(...extra);
      entry.phrases.push(...extra);
    } else {
      moduleEntries.push({
        family: bundle.family,
        intent: bundle.intent,
        label: bundle.label || bundle.intent,
        phrases: [...bundle.phrases],
        farmer: [...bundle.phrases],
        manager: [],
        investor: [],
      });
    }
  }

  return merged;
}

export default {
  TERRAIN_PHRASE_BUNDLES,
  TERRAIN_TOOL_PATTERN_STRINGS,
  mergeTerrainPhrasesIntoCatalog,
};
