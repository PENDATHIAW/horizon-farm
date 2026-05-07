import { makeId } from './ids';

export const PROJECTION_MODES = {
  vente_fin_cycle: 'Vente en fin de cycle',
  vente_progressive: 'Vente progressive',
  manuel: 'Manuel',
  production_mensuelle: 'Production mensuelle',
  recolte_progressive: 'Recolte progressive',
  economie_mensuelle: 'Economie mensuelle',
};

export const ACTIVITY_LABELS = {
  avicole_pondeuse: 'Pondeuses',
  avicole_chair: 'Poulets de chair',
  bovin_lait: 'Bovins laitiers',
  bovin_embouche: 'Bovins embouche',
  ovin_embouche: 'Ovins Tabaski / embouche',
  ovin_lait: 'Ovins laitiers',
  caprin_embouche: 'Caprins viande',
  caprin_lait: 'Caprins lait',
  culture_maraichere: 'Cultures maraicheres',
  culture_cereale: 'Cultures cerealieres',
  culture_arboricole: 'Arboriculture',
  infrastructure: 'Infrastructure',
  equipement: 'Equipement',
  autre: 'Autre',
};

const SALES_END_CYCLE_TYPES = ['bovin_embouche', 'ovin_embouche', 'caprin_embouche', 'avicole_chair', 'bovin_lait', 'ovin_lait', 'caprin_lait'];
const CULTURE_TYPES = ['culture_maraichere', 'culture_cereale', 'culture_arboricole'];

export function getDefaultProjectionMode(activityType) {
  if (SALES_END_CYCLE_TYPES.includes(activityType)) return 'vente_fin_cycle';
  if (activityType === 'avicole_pondeuse') return 'production_mensuelle';
  if (CULTURE_TYPES.includes(activityType)) return 'recolte_progressive';
  if (activityType === 'infrastructure' || activityType === 'equipement') return 'economie_mensuelle';
  return 'manuel';
}

const durationToMonths = (duration, fallback = 12) => Math.max(1, Math.ceil(Number(duration || fallback || 12)));
const recalcProjection = (projection = {}) => {
  const production = Number(projection.production_estimee || 0);
  const unitPrice = Number(projection.prix_unitaire_estime || 0);
  const charges = Number(projection.charges_estimees || 0);
  const ca = production * unitPrice;
  return {
    ...projection,
    ca_estime: ca,
    marge_estimee: ca - charges,
  };
};

const saleUnitFor = (activityType) => {
  if (activityType === 'avicole_chair') return 'poulets';
  if (activityType.includes('bovin')) return 'bovins';
  if (activityType.includes('ovin')) return 'ovins';
  if (activityType.includes('caprin')) return 'caprins';
  return 'unites';
};

const saleQuantityFor = (activityType, capacity) => {
  const cap = Number(capacity || 0);
  if (activityType === 'avicole_chair') return Math.floor(cap * 0.96);
  return cap;
};

const generateSaleEndCycle = ({ activityType, capacity, monthlyCost, durationMonths, unitPrice }) =>
  Array.from({ length: durationMonths }, (_, i) => {
    const isSaleMonth = i === durationMonths - 1;
    return recalcProjection({
      mois_index: i + 1,
      production_estimee: isSaleMonth ? saleQuantityFor(activityType, capacity) : 0,
      unite_production: saleUnitFor(activityType),
      prix_unitaire_estime: isSaleMonth ? unitPrice : 0,
      charges_estimees: monthlyCost,
      remboursement_prevu: 0,
      notes: isSaleMonth ? 'Vente en fin de cycle' : 'Phase elevage / engraissement',
    });
  });

const generateProgressiveSale = ({ activityType, capacity, monthlyCost, durationMonths, unitPrice }) => {
  const totalQty = saleQuantityFor(activityType, capacity);
  const saleMonths = Math.max(1, Math.ceil(durationMonths / 3));
  const firstSaleMonth = durationMonths - saleMonths + 1;
  let remaining = totalQty;
  return Array.from({ length: durationMonths }, (_, i) => {
    const month = i + 1;
    const isSaleMonth = month >= firstSaleMonth;
    const qty = isSaleMonth ? Math.min(remaining, Math.ceil(totalQty / saleMonths)) : 0;
    remaining -= qty;
    return recalcProjection({
      mois_index: month,
      production_estimee: qty,
      unite_production: saleUnitFor(activityType),
      prix_unitaire_estime: qty > 0 ? unitPrice : 0,
      charges_estimees: monthlyCost,
      notes: qty > 0 ? 'Vente progressive' : 'Phase elevage / engraissement',
    });
  });
};

const generateManualBlank = ({ activityType, monthlyCost, durationMonths, unitPrice }) =>
  Array.from({ length: durationMonths }, (_, i) => recalcProjection({
    mois_index: i + 1,
    production_estimee: 0,
    unite_production: saleUnitFor(activityType),
    prix_unitaire_estime: unitPrice || 0,
    charges_estimees: monthlyCost,
    notes: 'Projection manuelle',
  }));

const generateLayerProduction = ({ capacity, monthlyCost, durationMonths, unitPrice }) => {
  const cap = Number(capacity || 2000);
  const plateauxJour = Math.round(cap * 0.80 / 30);
  const price = Number(unitPrice || 2000);
  return Array.from({ length: durationMonths }, (_, i) => {
    const ratio = i < 3 ? 0 : i === 3 ? 0.3 : i === 4 ? 0.6 : i === 5 ? 0.7 : 0.95;
    const prod = Math.round(plateauxJour * 30 * ratio);
    const projection = recalcProjection({
      mois_index: i + 1,
      capacite_active: Math.round(cap * ratio),
      production_estimee: prod,
      unite_production: 'plateaux',
      prix_unitaire_estime: price,
      charges_estimees: monthlyCost,
      notes: i < 3 ? 'Phase croissance / entree en ponte' : 'Production ponte',
    });
    return {
      ...projection,
      remboursement_prevu: Math.round(Math.max(0, projection.marge_estimee) * 0.15),
    };
  });
};

const generateCultureHarvest = ({ capacity, monthlyCost, durationMonths, unitPrice, productionTarget }) => {
  const totalProduction = Number(productionTarget || 25000);
  const price = Number(unitPrice || 150);
  let remaining = totalProduction;
  return Array.from({ length: durationMonths }, (_, i) => {
    const month = i + 1;
    const ratio = durationMonths <= 1 ? 1 : month < durationMonths - 1 ? 0 : month === durationMonths - 1 ? 0.35 : 0.65;
    const qty = Math.min(remaining, Math.round(totalProduction * ratio));
    remaining -= qty;
    return recalcProjection({
      mois_index: month,
      capacite_active: capacity,
      production_estimee: qty,
      unite_production: 'kg',
      prix_unitaire_estime: qty > 0 ? price : 0,
      charges_estimees: monthlyCost,
      notes: qty > 0 ? 'Recolte / vente' : 'Semis / croissance',
    });
  });
};

const TEMPLATES = {
  avicole_pondeuse: {
    label: 'Pondeuses',
    emoji: '🥚',
    description: '2000 poulettes — cycle 18 mois — 58 tablettes/jour a pleine capacite',
    defaults: {
      duree_cycle_mois: 18,
      mode_projection: 'production_mensuelle',
      capacite_initiale: 2000,
      nombre_tetes_prevu: 2000,
      unite_capacite: 'pondeuses',
      unite_calcul_cout: 'pondeuse',
      prix_vente_prevu_unitaire: 2000,
      taux_remboursement_pct: 15,
      objectif_production: '58 tablettes/jour a pleine capacite - bande decalee tous les 6 mois',
    },
    lines: [
      { designation: 'Achat poulettes 2 mois', categorie: 'cheptel', quantite: 2000, unite: 'sujets', prix_unitaire: 2500, total: 5000000 },
      { designation: 'Sacs aliment poulette', categorie: 'alimentation', quantite: 240, unite: 'sacs', prix_unitaire: 16150, total: 3876000 },
      { designation: 'Sacs aliment pondeuse (init.)', categorie: 'alimentation', quantite: 120, unite: 'sacs', prix_unitaire: 17500, total: 2100000 },
      { designation: 'Abreuvoirs', categorie: 'equipement', quantite: 30, unite: 'pcs', prix_unitaire: 14500, total: 435000 },
      { designation: 'Mangeoires', categorie: 'equipement', quantite: 30, unite: 'pcs', prix_unitaire: 2700, total: 81000 },
      { designation: 'Reservoir eau 500L', categorie: 'equipement', quantite: 1, unite: 'pcs', prix_unitaire: 50000, total: 50000 },
      { designation: 'Main oeuvre installation', categorie: 'main_oeuvre', quantite: 1, unite: 'forfait', prix_unitaire: 50000, total: 50000 },
      { designation: 'Lunettes anti-cannibalisme', categorie: 'autre', quantite: 2100, unite: 'pcs', prix_unitaire: 50, total: 105000 },
      { designation: 'Frais pose lunettes', categorie: 'autre', quantite: 2000, unite: 'pcs', prix_unitaire: 50, total: 100000 },
      { designation: 'Paille de riz', categorie: 'autre', quantite: 20, unite: 'sacs', prix_unitaire: 2000, total: 40000 },
      { designation: 'Box poulailler', categorie: 'infrastructure', quantite: 1, unite: 'unite', prix_unitaire: 2000000, total: 2000000 },
      { designation: 'Vaccin Corymune K7', categorie: 'vaccins', quantite: 2000, unite: 'doses', prix_unitaire: 70, total: 140000 },
      { designation: 'Pondoirs 35 x 15 cases', categorie: 'equipement', quantite: 35, unite: 'pcs', prix_unitaire: 30000, total: 1050000 },
      { designation: 'Imprevus', categorie: 'autre', quantite: 1, unite: 'forfait', prix_unitaire: 200000, total: 200000 },
    ],
    costs: [
      { designation: 'Alimentation pondeuses', categorie: 'alimentation', montant_mensuel: 2100000, frequence: 'mensuelle' },
      { designation: 'Salaire ouvrier', categorie: 'salaires', montant_mensuel: 60000, frequence: 'mensuelle' },
      { designation: 'Energie eclairage 16h', categorie: 'energie', montant_mensuel: 50000, frequence: 'mensuelle' },
      { designation: 'Imprevus', categorie: 'imprevus', montant_mensuel: 200000, frequence: 'mensuelle' },
    ],
    generateProjections: (capacite, monthlyCost) => {
      const cap = capacite || 2000;
      const plateauxJour = Math.round(cap * 0.80 / 30);
      const prixTableau = 2000;
      const charges = monthlyCost || 2410000;
      const ratios = [0, 0, 0, 0.30, 0.60, 0.70, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95];
      return Array.from({ length: 18 }, (_, i) => {
        const r = ratios[i] ?? 0.95;
        const prod = Math.round(plateauxJour * 30 * r);
        const ca = prod * prixTableau;
        return {
          mois_index: i + 1,
          capacite_active: Math.round(cap * r),
          production_estimee: prod,
          unite_production: 'tablettes',
          prix_unitaire_estime: prixTableau,
          ca_estime: ca,
          charges_estimees: charges,
          marge_estimee: ca - charges,
          remboursement_prevu: Math.round(Math.max(0, ca - charges) * 0.15),
          notes: i < 3 ? 'Phase soins poulettes' : 'Production ponte',
        };
      });
    },
  },

  avicole_chair: {
    label: 'Poulets de chair',
    emoji: '🐔',
    description: '500 poussins — cycle 45-60 jours — poids vif 1.8 kg',
    defaults: {
      duree_cycle_mois: 2,
      mode_projection: 'vente_fin_cycle',
      capacite_initiale: 500,
      nombre_tetes_prevu: 500,
      unite_capacite: 'poussins',
      unite_calcul_cout: 'poulet',
      prix_vente_prevu_unitaire: 4950,
      taux_remboursement_pct: 20,
      objectif_production: 'Bandes successives toutes les 6-8 semaines avec vide sanitaire 1 semaine',
    },
    lines: [
      { designation: 'Poussins 1 jour', categorie: 'cheptel', quantite: 500, unite: 'sujets', prix_unitaire: 350, total: 175000 },
      { designation: 'Aliment pre-starter (j1-7)', categorie: 'alimentation', quantite: 10, unite: 'sacs', prix_unitaire: 16000, total: 160000 },
      { designation: 'Aliment starter (j8-21)', categorie: 'alimentation', quantite: 20, unite: 'sacs', prix_unitaire: 15000, total: 300000 },
      { designation: 'Aliment croissance (j22-35)', categorie: 'alimentation', quantite: 25, unite: 'sacs', prix_unitaire: 14000, total: 350000 },
      { designation: 'Aliment finition (j36-45)', categorie: 'alimentation', quantite: 15, unite: 'sacs', prix_unitaire: 13500, total: 202500 },
      { designation: 'Abreuvoirs', categorie: 'equipement', quantite: 10, unite: 'pcs', prix_unitaire: 5000, total: 50000 },
      { designation: 'Mangeoires', categorie: 'equipement', quantite: 10, unite: 'pcs', prix_unitaire: 3000, total: 30000 },
      { designation: 'Vaccins Newcastle/Gumboro/IBD', categorie: 'vaccins', quantite: 500, unite: 'doses', prix_unitaire: 80, total: 40000 },
      { designation: 'Litiere', categorie: 'autre', quantite: 5, unite: 'sacs', prix_unitaire: 2000, total: 10000 },
      { designation: 'Energie chauffage premiers jours', categorie: 'autre', quantite: 1, unite: 'forfait', prix_unitaire: 30000, total: 30000 },
    ],
    costs: [
      { designation: 'Salaire eleveur', categorie: 'salaires', montant_mensuel: 30000, frequence: 'mensuelle' },
      { designation: 'Energie', categorie: 'energie', montant_mensuel: 15000, frequence: 'mensuelle' },
    ],
    generateProjections: (capacite, monthlyCost) => {
      const cap = capacite || 500;
      const effectifVendable = Math.floor(cap * 0.96);
      const caTotal = effectifVendable * 1.8 * 2750;
      const charges = monthlyCost || 45000;
      return [
        { mois_index: 1, production_estimee: 0, unite_production: 'poulets', prix_unitaire_estime: 0, ca_estime: 0, charges_estimees: charges, marge_estimee: -charges, notes: 'Phase elevage' },
        { mois_index: 2, production_estimee: effectifVendable, unite_production: 'poulets', prix_unitaire_estime: 4950, ca_estime: caTotal, charges_estimees: charges, marge_estimee: caTotal - charges, notes: 'Vente' },
      ];
    },
  },

  bovin_embouche: {
    label: 'Bovins embouche',
    emoji: '🐄',
    description: '20 bovins maigres — cycle 3 mois — +200-300 000 FCFA/animal',
    defaults: {
      duree_cycle_mois: 3,
      mode_projection: 'vente_fin_cycle',
      capacite_initiale: 20,
      nombre_tetes_prevu: 20,
      unite_capacite: 'bovins',
      unite_calcul_cout: 'tete',
      prix_vente_prevu_unitaire: 550000,
      taux_remboursement_pct: 10,
      objectif_production: 'Prise de poids 80-120 kg/animal - vente Tabaski ou continue',
    },
    lines: [
      { designation: 'Achat bovins maigres', categorie: 'cheptel', quantite: 20, unite: 'tetes', prix_unitaire: 350000, total: 7000000 },
      { designation: 'Aliment concentre (3 mois)', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 120000, total: 360000 },
      { designation: 'Foin/fourrage (3 mois)', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 60000, total: 180000 },
      { designation: 'Vaccins charbon/pasteurellose', categorie: 'vaccins', quantite: 20, unite: 'tetes', prix_unitaire: 5000, total: 100000 },
      { designation: 'Vermifuge', categorie: 'vaccins', quantite: 20, unite: 'doses', prix_unitaire: 2000, total: 40000 },
      { designation: 'Abreuvoir collectif', categorie: 'equipement', quantite: 1, unite: 'pcs', prix_unitaire: 80000, total: 80000 },
      { designation: 'Amenagement parc/abri', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 200000, total: 200000 },
      { designation: 'Sel et mineraux', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 8000, total: 24000 },
    ],
    costs: [
      { designation: 'Ouvrier gardien', categorie: 'salaires', montant_mensuel: 80000, frequence: 'mensuelle' },
      { designation: 'Energie', categorie: 'energie', montant_mensuel: 20000, frequence: 'mensuelle' },
      { designation: 'Suivi veterinaire', categorie: 'sante_veto', montant_mensuel: 30000, frequence: 'mensuelle' },
    ],
    generateProjections: (capacite, monthlyCost) => {
      const cap = capacite || 20;
      const charges = monthlyCost || 130000;
      const caTotal = cap * 550000;
      return Array.from({ length: 3 }, (_, i) => ({
        mois_index: i + 1,
        production_estimee: i === 2 ? cap : 0,
        unite_production: 'bovins',
        prix_unitaire_estime: 550000,
        ca_estime: i === 2 ? caTotal : 0,
        charges_estimees: charges,
        marge_estimee: i === 2 ? caTotal - charges : -charges,
        notes: i === 2 ? 'Vente bovins' : 'Phase embouche',
      }));
    },
  },

  ovin_embouche: {
    label: 'Ovins Tabaski / embouche',
    emoji: '🐏',
    description: '100 agneaux — cycle 3 mois avant Tabaski — prix premium',
    defaults: {
      duree_cycle_mois: 3,
      mode_projection: 'vente_fin_cycle',
      capacite_initiale: 100,
      nombre_tetes_prevu: 100,
      unite_capacite: 'agneaux',
      unite_calcul_cout: 'tete',
      prix_vente_prevu_unitaire: 120000,
      taux_remboursement_pct: 10,
      objectif_production: 'Vente concentree sur 15 jours avant Tabaski - prix premium 100-200 000 FCFA/tete',
    },
    lines: [
      { designation: 'Achat agneaux a embouche', categorie: 'cheptel', quantite: 100, unite: 'tetes', prix_unitaire: 50000, total: 5000000 },
      { designation: 'Aliment concentre (3 mois)', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 180000, total: 540000 },
      { designation: 'Fourrage/foin (3 mois)', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 80000, total: 240000 },
      { designation: 'Vermifuge', categorie: 'vaccins', quantite: 100, unite: 'doses', prix_unitaire: 1500, total: 150000 },
      { designation: 'Vaccins Pasteurellose/Clavelée', categorie: 'vaccins', quantite: 100, unite: 'doses', prix_unitaire: 1000, total: 100000 },
      { designation: 'Amenagement bergerie/parc', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 300000, total: 300000 },
    ],
    costs: [
      { designation: 'Ouvrier', categorie: 'salaires', montant_mensuel: 50000, frequence: 'mensuelle' },
      { designation: 'Suivi veterinaire', categorie: 'sante_veto', montant_mensuel: 20000, frequence: 'mensuelle' },
    ],
    generateProjections: (capacite, monthlyCost) => {
      const cap = capacite || 100;
      const charges = monthlyCost || 70000;
      const caTotal = cap * 120000;
      return Array.from({ length: 3 }, (_, i) => ({
        mois_index: i + 1,
        production_estimee: i === 2 ? cap : 0,
        unite_production: 'ovins',
        prix_unitaire_estime: 120000,
        ca_estime: i === 2 ? caTotal : 0,
        charges_estimees: charges,
        marge_estimee: i === 2 ? caTotal - charges : -charges,
        notes: i === 2 ? 'Vente Tabaski' : 'Phase embouche',
      }));
    },
  },

  caprin_embouche: {
    label: 'Caprins viande / lait',
    emoji: '🐐',
    description: '30 cabris — cycle 3 mois — 2 portees/an possibles',
    defaults: {
      duree_cycle_mois: 3,
      mode_projection: 'vente_fin_cycle',
      capacite_initiale: 30,
      nombre_tetes_prevu: 30,
      unite_capacite: 'cabris',
      unite_calcul_cout: 'tete',
      prix_vente_prevu_unitaire: 40000,
      taux_remboursement_pct: 15,
      objectif_production: 'Cycles courts - fertilite elevee (2 portees/an)',
    },
    lines: [
      { designation: 'Achat cabris a embouche', categorie: 'cheptel', quantite: 30, unite: 'tetes', prix_unitaire: 20000, total: 600000 },
      { designation: 'Aliment concentre (3 mois)', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 40000, total: 120000 },
      { designation: 'Fourrage (3 mois)', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 20000, total: 60000 },
      { designation: 'Vaccins/soins', categorie: 'vaccins', quantite: 30, unite: 'doses', prix_unitaire: 1000, total: 30000 },
      { designation: 'Amenagement parc', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 100000, total: 100000 },
    ],
    costs: [
      { designation: 'Gardien/eleveur', categorie: 'salaires', montant_mensuel: 30000, frequence: 'mensuelle' },
    ],
    generateProjections: (capacite, monthlyCost) => {
      const cap = capacite || 30;
      const charges = monthlyCost || 30000;
      const caTotal = cap * 40000;
      return Array.from({ length: 3 }, (_, i) => ({
        mois_index: i + 1,
        production_estimee: i === 2 ? cap : 0,
        unite_production: 'caprins',
        prix_unitaire_estime: 40000,
        ca_estime: i === 2 ? caTotal : 0,
        charges_estimees: charges,
        marge_estimee: i === 2 ? caTotal - charges : -charges,
        notes: i === 2 ? 'Vente caprins' : 'Phase embouche',
      }));
    },
  },

  culture_maraichere: {
    label: 'Cultures maraicheres',
    emoji: '🍅',
    description: '1 ha tomate — cycle 90 jours — rendement 25-40 t/ha',
    defaults: {
      duree_cycle_mois: 3,
      mode_projection: 'recolte_progressive',
      capacite_initiale: 10000,
      nombre_tetes_prevu: 0,
      quantite_production_prevue: 25000,
      unite_capacite: 'm2',
      unite_calcul_cout: 'm2',
      prix_vente_prevu_unitaire: 150,
      taux_remboursement_pct: 20,
      objectif_production: 'Rotation culturale obligatoire - ne pas replanter sur meme parcelle avant 3 ans',
    },
    lines: [
      { designation: 'Preparation sol / fumure organique', categorie: 'main_oeuvre', quantite: 1, unite: 'ha', prix_unitaire: 200000, total: 200000 },
      { designation: 'Semences/plants tomate', categorie: 'autre', quantite: 1, unite: 'ha', prix_unitaire: 150000, total: 150000 },
      { designation: 'Engrais NPK + uree', categorie: 'autre', quantite: 1, unite: 'ha', prix_unitaire: 500000, total: 500000 },
      { designation: 'Pesticides/fongicides', categorie: 'autre', quantite: 1, unite: 'ha', prix_unitaire: 150000, total: 150000 },
      { designation: 'Systeme irrigation goutte-a-goutte', categorie: 'equipement', quantite: 1, unite: 'ha', prix_unitaire: 1500000, total: 1500000 },
      { designation: 'Main oeuvre saisonniere', categorie: 'main_oeuvre', quantite: 1, unite: 'ha', prix_unitaire: 300000, total: 300000 },
      { designation: 'Tuteurs/piquets', categorie: 'equipement', quantite: 1, unite: 'ha', prix_unitaire: 200000, total: 200000 },
      { designation: 'Recolte/conditionnement', categorie: 'main_oeuvre', quantite: 1, unite: 'ha', prix_unitaire: 100000, total: 100000 },
    ],
    costs: [
      { designation: 'Eau/energie irrigation', categorie: 'energie', montant_mensuel: 50000, frequence: 'mensuelle' },
      { designation: 'Surveillance/traitement', categorie: 'sante_veto', montant_mensuel: 30000, frequence: 'mensuelle' },
    ],
    generateProjections: (capacite, monthlyCost) => {
      const tonnes = 25000;
      const prixKg = 150;
      const charges = monthlyCost || 80000;
      return [
        { mois_index: 1, production_estimee: 0, unite_production: 'kg', prix_unitaire_estime: prixKg, ca_estime: 0, charges_estimees: charges, marge_estimee: -charges, notes: 'Semis/croissance' },
        { mois_index: 2, production_estimee: Math.round(tonnes * 0.3), unite_production: 'kg', prix_unitaire_estime: prixKg, ca_estime: Math.round(tonnes * 0.3 * prixKg), charges_estimees: charges, marge_estimee: Math.round(tonnes * 0.3 * prixKg) - charges, notes: 'Debut recolte' },
        { mois_index: 3, production_estimee: Math.round(tonnes * 0.7), unite_production: 'kg', prix_unitaire_estime: prixKg, ca_estime: Math.round(tonnes * 0.7 * prixKg), charges_estimees: charges, marge_estimee: Math.round(tonnes * 0.7 * prixKg) - charges, notes: 'Recolte principale' },
      ];
    },
  },

  infrastructure: {
    label: 'Infrastructure',
    emoji: '🏗️',
    description: 'Forage, stockage, equipement fixe — ROI par economie eau',
    defaults: {
      duree_cycle_mois: 60,
      mode_projection: 'economie_mensuelle',
      capacite_initiale: 0,
      unite_capacite: 'unite',
      unite_calcul_cout: 'unite',
      taux_remboursement_pct: 5,
      objectif_production: 'Economie sur achat eau citerne x duree amortissement',
    },
    lines: [
      { designation: 'Etude hydrogeologique', categorie: 'autre', quantite: 1, unite: 'forfait', prix_unitaire: 200000, total: 200000 },
      { designation: 'Forage et tubage', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 3000000, total: 3000000 },
      { designation: 'Pompe immergee', categorie: 'equipement', quantite: 1, unite: 'pcs', prix_unitaire: 800000, total: 800000 },
      { designation: 'Reservoir de stockage', categorie: 'equipement', quantite: 1, unite: 'pcs', prix_unitaire: 300000, total: 300000 },
      { designation: 'Systeme solaire pompage', categorie: 'equipement', quantite: 1, unite: 'forfait', prix_unitaire: 1500000, total: 1500000 },
    ],
    costs: [
      { designation: 'Maintenance annuelle', categorie: 'autre', montant_mensuel: 20000, frequence: 'mensuelle' },
    ],
    generateProjections: (capacite, monthlyCost) => {
      const charges = monthlyCost || 20000;
      const economieEau = 150000;
      return Array.from({ length: 12 }, (_, i) => ({
        mois_index: i + 1,
        production_estimee: economieEau,
        unite_production: 'economie',
        prix_unitaire_estime: 1,
        ca_estime: economieEau,
        charges_estimees: charges,
        marge_estimee: economieEau - charges,
        notes: 'Economie eau citerne',
      }));
    },
  },

  autre: {
    label: 'Autre / Depense ponctuelle',
    emoji: '📦',
    description: 'Template vierge — categories libres',
    defaults: {
      duree_cycle_mois: 12,
      mode_projection: 'manuel',
      capacite_initiale: 0,
      unite_capacite: 'unite',
      unite_calcul_cout: 'unite',
      taux_remboursement_pct: 10,
    },
    lines: [],
    costs: [],
    generateProjections: (capacite, monthlyCost) => {
      const charges = monthlyCost || 0;
      return Array.from({ length: 12 }, (_, i) => ({
        mois_index: i + 1,
        production_estimee: 0,
        unite_production: 'unite',
        prix_unitaire_estime: 0,
        ca_estime: 0,
        charges_estimees: charges,
        marge_estimee: -charges,
      }));
    },
  },
};

const TEMPLATE_MAP = {
  avicole_pondeuse: 'avicole_pondeuse',
  avicole_chair: 'avicole_chair',
  bovin_embouche: 'bovin_embouche',
  bovin_lait: 'bovin_embouche',
  ovin_embouche: 'ovin_embouche',
  ovin_lait: 'ovin_embouche',
  caprin_embouche: 'caprin_embouche',
  caprin_lait: 'caprin_embouche',
  culture_maraichere: 'culture_maraichere',
  culture_cereale: 'culture_maraichere',
  culture_arboricole: 'culture_maraichere',
  infrastructure: 'infrastructure',
  equipement: 'infrastructure',
  autre: 'autre',
};

export function getTemplate(activityType) {
  const key = TEMPLATE_MAP[activityType] || 'autre';
  return TEMPLATES[key] || TEMPLATES.autre;
}

export function buildTemplateData(activityType, bpId) {
  const tpl = getTemplate(activityType);
  const lines = tpl.lines.map((line, i) => ({
    ...line,
    id: makeId(`BPLI${i + 1}`),
    business_plan_id: bpId,
    ordre: i + 1,
  }));
  const costs = tpl.costs.map((cost, i) => ({
    ...cost,
    id: makeId(`BPCOST${i + 1}`),
    business_plan_id: bpId,
  }));
  return { lines, costs, defaults: tpl.defaults };
}

export function generateProjectionsForBp(activityType, capacite, monthlyCost, bpId, options = {}) {
  const tpl = getTemplate(activityType);
  const capacity = Number(capacite || options.nombre_tetes_prevu || tpl.defaults.capacite_initiale || 0);
  const durationMonths = durationToMonths(options.duree_cycle_mois, tpl.defaults.duree_cycle_mois);
  const mode = options.mode_projection || tpl.defaults.mode_projection || getDefaultProjectionMode(activityType);
  const unitPrice = Number(options.prix_vente_prevu_unitaire || tpl.defaults.prix_vente_prevu_unitaire || 0);
  const cost = Number(monthlyCost || 0);

  let projections;
  if (mode === 'vente_fin_cycle') {
    projections = generateSaleEndCycle({ activityType, capacity, monthlyCost: cost, durationMonths, unitPrice });
  } else if (mode === 'vente_progressive') {
    projections = generateProgressiveSale({ activityType, capacity, monthlyCost: cost, durationMonths, unitPrice });
  } else if (mode === 'production_mensuelle') {
    projections = generateLayerProduction({ capacity, monthlyCost: cost, durationMonths, unitPrice });
  } else if (mode === 'recolte_progressive') {
    projections = generateCultureHarvest({
      capacity,
      monthlyCost: cost,
      durationMonths,
      unitPrice,
      productionTarget: options.quantite_production_prevue || tpl.defaults.quantite_production_prevue,
    });
  } else if (mode === 'economie_mensuelle') {
    projections = Array.from({ length: durationMonths }, (_, i) => recalcProjection({
      mois_index: i + 1,
      production_estimee: unitPrice || 150000,
      unite_production: 'economie',
      prix_unitaire_estime: unitPrice ? 1 : 1,
      charges_estimees: cost,
      notes: 'Economie mensuelle estimee',
    }));
  } else {
    projections = generateManualBlank({ activityType, monthlyCost: cost, durationMonths, unitPrice });
  }

  return projections.map((p, i) => ({
    ...recalcProjection(p),
    id: makeId(`BPREV${i + 1}`),
    business_plan_id: bpId,
  }));
}

export { TEMPLATES };
