/**
 * Questions ultra-courtes — porte d'entrée universelle Horizon Farm V6.
 * ventes ? · stock ? · clients ? · lots ? · animaux ? · parcelles ? · objectifs ?
 */

import { normalizeAgriculturalText } from './assistantUniversalIntents.js';

const ULTRA_SHORT_MAP = Object.freeze({
  ventes: { intent: 'ventes', family: 'COMMERCIAL', label: 'Ventes' },
  vente: { intent: 'ventes', family: 'COMMERCIAL', label: 'Ventes' },
  ca: { intent: 'ventes', family: 'COMMERCIAL', label: 'Chiffre d\'affaires' },
  stock: { intent: 'stock_overview', family: 'STOCK', label: 'Stock' },
  magasin: { intent: 'stock_remain', family: 'STOCK', label: 'Magasin' },
  inventaire: { intent: 'stock_overview', family: 'STOCK', label: 'Inventaire' },
  clients: { intent: 'commercial_summary', family: 'COMMERCIAL', label: 'Clients' },
  client: { intent: 'top_client', family: 'COMMERCIAL', label: 'Client' },
  lots: { intent: 'lots_overview', family: 'ELEVAGE', label: 'Lots' },
  lot: { intent: 'lots_overview', family: 'ELEVAGE', label: 'Lot' },
  bandes: { intent: 'lots_overview', family: 'ELEVAGE', label: 'Bandes' },
  animaux: { intent: 'my_animals', family: 'ELEVAGE', label: 'Animaux' },
  animal: { intent: 'my_animals', family: 'ELEVAGE', label: 'Animal' },
  cheptel: { intent: 'my_animals', family: 'ELEVAGE', label: 'Cheptel' },
  parcelles: { intent: 'parcelles_status', family: 'CULTURES', label: 'Parcelles' },
  parcelle: { intent: 'parcelles_status', family: 'CULTURES', label: 'Parcelle' },
  cultures: { intent: 'parcelles_status', family: 'CULTURES', label: 'Cultures' },
  objectifs: { intent: 'progress_status', family: 'OBJECTIFS', label: 'Objectifs' },
  objectif: { intent: 'progress_status', family: 'OBJECTIFS', label: 'Objectif' },
  tresorerie: { intent: 'treasury', family: 'FINANCE', label: 'Trésorerie' },
  finance: { intent: 'treasury', family: 'FINANCE', label: 'Finance' },
  dettes: { intent: 'dettes', family: 'FINANCE', label: 'Dettes' },
  creances: { intent: 'creances', family: 'FINANCE', label: 'Créances' },
  rapports: { intent: 'documents_summary', family: 'DECISION', label: 'Rapports' },
  documents: { intent: 'documents_summary', family: 'DECISION', label: 'Documents' },
  personnel: { intent: 'rh_personnel', family: 'DECISION', label: 'Personnel' },
  equipes: { intent: 'rh_personnel', family: 'DECISION', label: 'Équipes' },
  bovins: { intent: 'headcount_bovins', family: 'ELEVAGE', label: 'Bovins' },
  bovin: { intent: 'headcount_bovins', family: 'ELEVAGE', label: 'Bovin' },
  ovins: { intent: 'headcount_ovins', family: 'ELEVAGE', label: 'Ovins' },
  ovin: { intent: 'headcount_ovins', family: 'ELEVAGE', label: 'Ovin' },
  poulets: { intent: 'headcount_poulets', family: 'ELEVAGE', label: 'Poulets' },
  pondeuses: { intent: 'headcount_pondeuses', family: 'ELEVAGE', label: 'Pondeuses' },
  caprins: { intent: 'headcount_caprins', family: 'ELEVAGE', label: 'Caprins' },
  relances: { intent: 'relances', family: 'COMMERCIAL', label: 'Relances' },
  marges: { intent: 'resultat', family: 'FINANCE', label: 'Marges' },
  rentabilite: { intent: 'resultat', family: 'FINANCE', label: 'Rentabilité' },
  achats: { intent: 'purchases_overview', family: 'STOCK', label: 'Achats' },
  fournisseurs: { intent: 'suppliers_overview', family: 'STOCK', label: 'Fournisseurs' },
  aliment: { intent: 'stock_aliment', family: 'STOCK', label: 'Aliment' },
  activite: { intent: 'activity_journal', family: 'DECISION', label: 'Activité' },
  journal: { intent: 'activity_journal', family: 'DECISION', label: 'Journal' },
  meteo: { intent: 'weather_now', family: 'METEO', label: 'Météo' },
  bonjour: { intent: 'greeting', family: 'SALUTATION', label: 'Bonjour' },
  salut: { intent: 'greeting', family: 'SALUTATION', label: 'Salut' },
  coucou: { intent: 'greeting', family: 'SALUTATION', label: 'Coucou' },
  bonsoir: { intent: 'greeting', family: 'SALUTATION', label: 'Bonsoir' },
  hello: { intent: 'greeting', family: 'SALUTATION', label: 'Hello' },
});

const POSSESSIVE_MAP = Object.freeze({
  ventes: { intent: 'ventes', family: 'COMMERCIAL', label: 'Mes ventes' },
  animaux: { intent: 'my_animals', family: 'ELEVAGE', label: 'Mes animaux' },
  lots: { intent: 'lots_overview', family: 'ELEVAGE', label: 'Mes lots' },
  bandes: { intent: 'lots_overview', family: 'ELEVAGE', label: 'Mes bandes' },
  parcelles: { intent: 'parcelles_status', family: 'CULTURES', label: 'Mes parcelles' },
  clients: { intent: 'commercial_summary', family: 'COMMERCIAL', label: 'Mes clients' },
  commandes: { intent: 'orders_overview', family: 'COMMERCIAL', label: 'Mes commandes' },
  livraisons: { intent: 'deliveries_overview', family: 'COMMERCIAL', label: 'Mes livraisons' },
  dettes: { intent: 'dettes', family: 'FINANCE', label: 'Mes dettes' },
  creances: { intent: 'creances', family: 'FINANCE', label: 'Mes créances' },
  achats: { intent: 'purchases_overview', family: 'STOCK', label: 'Mes achats' },
  fournisseurs: { intent: 'suppliers_overview', family: 'STOCK', label: 'Mes fournisseurs' },
  objectifs: { intent: 'progress_status', family: 'OBJECTIFS', label: 'Mes objectifs' },
  rapports: { intent: 'documents_summary', family: 'DECISION', label: 'Mes rapports' },
  documents: { intent: 'documents_summary', family: 'DECISION', label: 'Mes documents' },
});

/**
 * Résout une question ultra-courte (1–2 tokens) en intention métier.
 * @returns {{ intent: string, family: string, label: string, score: number } | null}
 */
export function resolveUltraShortIntent(text = '') {
  const raw = String(text || '').trim();
  const q = normalizeAgriculturalText(raw.replace(/\?+/g, '').trim());
  if (!q) return null;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 3) return null;

  if (tokens.length === 1 && ULTRA_SHORT_MAP[tokens[0]]) {
    return { ...ULTRA_SHORT_MAP[tokens[0]], score: 1 };
  }

  if (tokens.length === 2 && (tokens[0] === 'mes' || tokens[0] === 'mon' || tokens[0] === 'ma')) {
    const hit = POSSESSIVE_MAP[tokens[1]];
    if (hit) return { ...hit, score: 1 };
  }

  if (tokens.length === 2 && tokens[0] === 'quoi' && tokens[1] === 'vendre') {
    return { intent: 'sell_today', family: 'DECISION', label: 'Que vendre', score: 1 };
  }

  return null;
}

export default {
  resolveUltraShortIntent,
  ULTRA_SHORT_MAP,
};
