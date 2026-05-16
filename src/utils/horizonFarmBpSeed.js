export const HORIZON_BP_ID = 'BP-HORIZON-FARM';

export const horizonFarmBusinessPlanSeed = {
  id: HORIZON_BP_ID,
  titre: 'Business Plan Horizon Farm',
  title: 'Business Plan Horizon Farm',
  activity_type: 'multi_activites',
  statut: 'brouillon',
  status: 'brouillon',
  description: 'BP multi-activités adapté Horizon Farm : 4 000 pondeuses, 200 poulets de chair, 10 bovins, 5 ovins et 5 caprins.',
  periode: 'Démarrage ferme',
  date_creation: '2026-05-15',
  horizon_mois: 18,
  devise: 'FCFA',
  objectif: 'Piloter les investissements initiaux, les charges et la rentabilité prévisionnelle Horizon Farm.',
  source: 'business_plan_horizon_farm_simule',
};

export const horizonFarmBpInvestmentLinesSeed = [
  { id: 'BP-HF-L01', business_plan_id: HORIZON_BP_ID, categorie: 'Cheptel avicole', designation: '4 000 poules pondeuses', quantite: 4000, unite: 'sujet', prix_unitaire: 900, total: 3600000, commentaire: 'Hypothèse utilisateur : 4 000 pondeuses à 900 FCFA.' },
  { id: 'BP-HF-L02', business_plan_id: HORIZON_BP_ID, categorie: 'Cheptel avicole', designation: '200 poulets de chair', quantite: 200, unite: 'sujet', prix_unitaire: 650, total: 130000, commentaire: 'Démarrage cycle chair test commercial.' },
  { id: 'BP-HF-L03', business_plan_id: HORIZON_BP_ID, categorie: 'Cheptel animal', designation: '10 bovins', quantite: 10, unite: 'tête', prix_unitaire: 250000, total: 2500000, commentaire: 'Embouche bovine.' },
  { id: 'BP-HF-L04', business_plan_id: HORIZON_BP_ID, categorie: 'Cheptel animal', designation: '5 ovins', quantite: 5, unite: 'tête', prix_unitaire: 60000, total: 300000, commentaire: 'Embouche ovine / événements.' },
  { id: 'BP-HF-L05', business_plan_id: HORIZON_BP_ID, categorie: 'Cheptel animal', designation: '5 caprins', quantite: 5, unite: 'tête', prix_unitaire: 45000, total: 225000, commentaire: 'Diversification caprine.' },
  { id: 'BP-HF-L06', business_plan_id: HORIZON_BP_ID, categorie: 'Infrastructure', designation: 'Aménagement poulailler pondeuses', quantite: 1, unite: 'lot', prix_unitaire: 3500000, total: 3500000, commentaire: 'Bâtiment, ventilation, sécurité et installation.' },
  { id: 'BP-HF-L07', business_plan_id: HORIZON_BP_ID, categorie: 'Infrastructure', designation: 'Espace poulets de chair', quantite: 1, unite: 'lot', prix_unitaire: 650000, total: 650000, commentaire: 'Zone séparée chair.' },
  { id: 'BP-HF-L08', business_plan_id: HORIZON_BP_ID, categorie: 'Infrastructure', designation: 'Enclos bovins / ovins / caprins', quantite: 1, unite: 'lot', prix_unitaire: 1800000, total: 1800000, commentaire: 'Aires, abreuvoirs et clôtures.' },
  { id: 'BP-HF-L09', business_plan_id: HORIZON_BP_ID, categorie: 'Équipement', designation: 'Mangeoires, abreuvoirs, pondoirs', quantite: 1, unite: 'lot', prix_unitaire: 1250000, total: 1250000, commentaire: 'Équipement avicole de base.' },
  { id: 'BP-HF-L10', business_plan_id: HORIZON_BP_ID, categorie: 'Stock initial', designation: 'Aliments de démarrage', quantite: 1, unite: 'lot', prix_unitaire: 1800000, total: 1800000, commentaire: 'Pondeuses, chair et bétail.' },
  { id: 'BP-HF-L11', business_plan_id: HORIZON_BP_ID, categorie: 'Santé', designation: 'Vaccins, produits vétérinaires et biosécurité', quantite: 1, unite: 'lot', prix_unitaire: 650000, total: 650000, commentaire: 'Prévention, désinfection, pharmacie de base.' },
  { id: 'BP-HF-L12', business_plan_id: HORIZON_BP_ID, categorie: 'Trésorerie', designation: 'Fonds de roulement initial', quantite: 1, unite: 'lot', prix_unitaire: 2500000, total: 2500000, commentaire: 'Cash de sécurité pour charges courantes.' },
];

export const horizonFarmBpRecurringCostsSeed = [
  { id: 'BP-HF-C01', business_plan_id: HORIZON_BP_ID, categorie: 'Alimentation', designation: 'Aliment pondeuses mensuel', montant_mensuel: 4200000, frequence: 'mensuelle', commentaire: 'Base 4 000 pondeuses, à ajuster selon ration réelle.' },
  { id: 'BP-HF-C02', business_plan_id: HORIZON_BP_ID, categorie: 'Alimentation', designation: 'Aliment poulets de chair par cycle', montant_mensuel: 240000, frequence: 'cycle', commentaire: 'Base 200 sujets chair.' },
  { id: 'BP-HF-C03', business_plan_id: HORIZON_BP_ID, categorie: 'Alimentation', designation: 'Aliment bovins / ovins / caprins', montant_mensuel: 850000, frequence: 'mensuelle', commentaire: 'Embouche et entretien.' },
  { id: 'BP-HF-C04', business_plan_id: HORIZON_BP_ID, categorie: 'Personnel', designation: 'Main-d’œuvre ferme', montant_mensuel: 450000, frequence: 'mensuelle', commentaire: 'Agents terrain, suivi, gardiennage.' },
  { id: 'BP-HF-C05', business_plan_id: HORIZON_BP_ID, categorie: 'Santé', designation: 'Suivi vétérinaire et vaccins', montant_mensuel: 180000, frequence: 'mensuelle', commentaire: 'Prévention et interventions.' },
  { id: 'BP-HF-C06', business_plan_id: HORIZON_BP_ID, categorie: 'Eau / énergie', designation: 'Eau, électricité, carburant', montant_mensuel: 220000, frequence: 'mensuelle', commentaire: 'Charges d’exploitation.' },
  { id: 'BP-HF-C07', business_plan_id: HORIZON_BP_ID, categorie: 'Logistique', designation: 'Transport, emballages, livraison', montant_mensuel: 250000, frequence: 'mensuelle', commentaire: 'Ventes et approvisionnements.' },
  { id: 'BP-HF-C08', business_plan_id: HORIZON_BP_ID, categorie: 'Maintenance', designation: 'Entretien bâtiments et équipements', montant_mensuel: 150000, frequence: 'mensuelle', commentaire: 'Réparations et consommables.' },
];

export const horizonFarmBpRevenueProjectionsSeed = [
  { id: 'BP-HF-P01', business_plan_id: HORIZON_BP_ID, mois_index: 1, unite_production: 'Tablettes œufs', production_estimee: 2400, prix_unitaire_estime: 3000, charges_estimees: 6250000, ca_estime: 7200000, marge_estimee: 950000 },
  { id: 'BP-HF-P02', business_plan_id: HORIZON_BP_ID, mois_index: 2, unite_production: 'Tablettes œufs', production_estimee: 2500, prix_unitaire_estime: 3000, charges_estimees: 6250000, ca_estime: 7500000, marge_estimee: 1250000 },
  { id: 'BP-HF-P03', business_plan_id: HORIZON_BP_ID, mois_index: 2, unite_production: 'Poulets de chair vendus', production_estimee: 190, prix_unitaire_estime: 3500, charges_estimees: 400000, ca_estime: 665000, marge_estimee: 265000 },
  { id: 'BP-HF-P04', business_plan_id: HORIZON_BP_ID, mois_index: 3, unite_production: 'Tablettes œufs', production_estimee: 2550, prix_unitaire_estime: 3000, charges_estimees: 6250000, ca_estime: 7650000, marge_estimee: 1400000 },
  { id: 'BP-HF-P05', business_plan_id: HORIZON_BP_ID, mois_index: 4, unite_production: 'Vente animaux embouche', production_estimee: 5, prix_unitaire_estime: 320000, charges_estimees: 950000, ca_estime: 1600000, marge_estimee: 650000 },
];

export const horizonFarmBpFundingSourcesSeed = [
  { id: 'BP-HF-F01', business_plan_id: HORIZON_BP_ID, nom_source: 'Apport promoteur', source_type: 'apport', montant: 5000000, statut: 'prévu' },
  { id: 'BP-HF-F02', business_plan_id: HORIZON_BP_ID, nom_source: 'Financement à rechercher', source_type: 'financement', montant: 14000000, statut: 'à négocier' },
];

export const horizonFarmBpRisksSeed = [
  { id: 'BP-HF-R01', business_plan_id: HORIZON_BP_ID, titre: 'Hausse prix aliments', probabilite: 'moyenne', impact: 'élevé', mitigation: 'Sécuriser fournisseurs et stock tampon.' },
  { id: 'BP-HF-R02', business_plan_id: HORIZON_BP_ID, titre: 'Baisse taux de ponte', probabilite: 'moyenne', impact: 'élevé', mitigation: 'Suivi ponte quotidien, alimentation et santé.' },
  { id: 'BP-HF-R03', business_plan_id: HORIZON_BP_ID, titre: 'Mortalité chair / animaux', probabilite: 'faible à moyenne', impact: 'moyen', mitigation: 'Biosécurité, vétérinaire, suivi mortalité.' },
];

export const horizonFarmBpSeedMap = {
  business_plans: [horizonFarmBusinessPlanSeed],
  bp_investment_lines: horizonFarmBpInvestmentLinesSeed,
  bp_recurring_costs: horizonFarmBpRecurringCostsSeed,
  bp_revenue_projections: horizonFarmBpRevenueProjectionsSeed,
  bp_funding_sources: horizonFarmBpFundingSourcesSeed,
  bp_risks: horizonFarmBpRisksSeed,
};
