/** Résout un libellé « Où le trouver » vers module + onglet ERP (navigation 1 clic). */

const rules = [
  { pattern: /avicole|bande|poussin|chair|pondeuse|lot/i, module: 'elevage', tab: 'Lots & bandes', label: 'Élevage → Lots & bandes' },
  { pattern: /animaux|embouche|bovin|bête|taureau|broutard/i, module: 'elevage', tab: 'Lots & bandes', label: 'Élevage → Lots & bandes' },
  { pattern: /alimentation|distribution|ration/i, module: 'elevage', tab: 'Lots & bandes', label: 'Élevage → Alimentation (Lots & bandes)' },
  { pattern: /production|ponte|comptage.*œuf|œuf/i, module: 'elevage', tab: 'Lots & bandes', label: 'Élevage → Production (Lots & bandes)' },
  { pattern: /santé|vaccin|vétérinaire|véto/i, module: 'elevage', tab: 'Santé', label: 'Élevage → Santé' },
  { pattern: /transformation|incub|couvoir|poussin d/i, module: 'elevage', tab: 'Transformation', label: 'Élevage → Transformation' },
  { pattern: /cycle.*élevage|cycles/i, module: 'elevage', tab: 'Cycles & Reproduction', label: 'Élevage → Cycles & Reproduction' },
  { pattern: /module stock|stock(?!.*mouvement)|silo/i, module: 'achats_stock', tab: 'Stock', label: 'Achats & Stock → Stock' },
  { pattern: /achats|fournisseur|intrant|maïs|soja/i, module: 'achats_stock', tab: 'Achats', label: 'Achats & Stock → Achats' },
  { pattern: /mouvement stock/i, module: 'achats_stock', tab: 'Mouvements', label: 'Achats & Stock → Mouvements' },
  { pattern: /ventes?|commercial|commandes clients/i, module: 'commercial', tab: 'Ventes', label: 'Commercial → Ventes' },
  { pattern: /clients?|vip/i, module: 'commercial', tab: 'Clients & créances', label: 'Commercial → Clients & créances' },
  { pattern: /trésorerie|finances?|encaissement|factures?|bfr|couverture trésorerie/i, module: 'finance_pilotage', tab: 'Trésorerie', label: 'Finances → Trésorerie' },
  { pattern: /créances?|encaiss/i, module: 'finance_pilotage', tab: 'Créances', label: 'Finances → Créances' },
  { pattern: /rentabilité finance|investissement/i, module: 'finance_pilotage', tab: 'Rentabilité', label: 'Finances → Rentabilité' },
  { pattern: /objectifs|business plan|plan officiel/i, module: 'objectifs_croissance', tab: 'Suivi du Business Plan', label: 'Objectifs & Croissance' },
  { pattern: /centre.*cycles|calendrier.*centre|fêtes du mois/i, module: 'centre_ia', tab: 'Cycles', label: 'Centre → Cycles' },
  { pattern: /paramètres pilotage|pilotage|réglages/i, module: 'centre_ia', tab: 'Annexe', label: 'Centre → Paramètres (bandeau pilotage)' },
  { pattern: /prix marché|catalogue prix/i, module: 'commercial', tab: 'Ventes', label: 'Commercial → Prix / ventes' },
  { pattern: /maraîchage|cultures?|parcelle/i, module: 'cultures', tab: 'Parcelles & campagnes', label: 'Cultures → Parcelles & campagnes' },
  { pattern: /météo/i, module: 'dashboard', tab: 'Carnet Horizon', label: 'Accueil — Carnet Horizon' },
];

export function resolveAnnexeLink(whereText = '') {
  const text = String(whereText || '');
  if (!text.trim()) return null;
  const hit = rules.find((rule) => rule.pattern.test(text));
  return hit ? { module: hit.module, tab: hit.tab, label: hit.label } : null;
}

export function navigateAnnexeLink(onNavigate, whereText) {
  const link = resolveAnnexeLink(whereText);
  if (!link || !onNavigate) return false;
  onNavigate(link.module, { tab: link.tab });
  return true;
}

export default resolveAnnexeLink;
