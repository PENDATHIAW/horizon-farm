import { makeId } from './ids';

export const HORIZON_FARM_BP_NAME = 'Business Plan Horizon Farm';

const withId = (prefix, row) => ({ id: makeId(prefix), ...row });

export function buildHorizonFarmBusinessPlanDraft() {
  const bpId = makeId('BP');
  const plan = {
    id: bpId,
    nom: HORIZON_FARM_BP_NAME,
    activity_type: 'autre',
    description: 'Business Plan projet Horizon Farm : 4 000 pondeuses, 200 poulets de chair, 10 bovins, 5 ovins et 5 caprins.',
    localisation: 'Horizon Farm',
    date_debut: new Date().toISOString().slice(0, 10),
    duree_cycle_mois: 18,
    mode_projection: 'manuel',
    capacite_initiale: 4220,
    unite_capacite: 'sujets / têtes',
    unite_calcul_cout: 'multi-activités',
    nombre_tetes_prevu: 4220,
    prix_vente_prevu_unitaire: 0,
    apport_personnel: 0,
    financement_recherche: 0,
    taux_remboursement_pct: 15,
    objectif_production: 'Démarrer et piloter les activités avicoles, animales et commerciales Horizon Farm.',
    notes: 'BP réel projet, créé comme brouillon et modifiable dans Investissements.',
    statut: 'brouillon',
  };

  const lines = [
    { categorie: 'cheptel', designation: '4 000 poules pondeuses', quantite: 4000, unite: 'sujets', prix_unitaire: 900, total: 3600000, commentaire: 'Hypothèse projet : 4 000 pondeuses à 900 FCFA.' },
    { categorie: 'cheptel', designation: '200 poulets de chair', quantite: 200, unite: 'sujets', prix_unitaire: 650, total: 130000, commentaire: 'Premier cycle chair à ajuster selon prix fournisseur.' },
    { categorie: 'cheptel', designation: '10 bovins', quantite: 10, unite: 'têtes', prix_unitaire: 250000, total: 2500000, commentaire: 'Embouche / vente continue ou périodes fortes.' },
    { categorie: 'cheptel', designation: '5 ovins', quantite: 5, unite: 'têtes', prix_unitaire: 60000, total: 300000, commentaire: 'Ovins pour embouche et périodes événementielles.' },
    { categorie: 'cheptel', designation: '5 caprins', quantite: 5, unite: 'têtes', prix_unitaire: 45000, total: 225000, commentaire: 'Diversification caprine.' },
    { categorie: 'infrastructure', designation: 'Aménagement poulailler pondeuses', quantite: 1, unite: 'lot', prix_unitaire: 3500000, total: 3500000, commentaire: 'Bâtiment, ventilation, sécurité, éclairage.' },
    { categorie: 'infrastructure', designation: 'Espace poulets de chair', quantite: 1, unite: 'lot', prix_unitaire: 650000, total: 650000, commentaire: 'Zone chair séparée.' },
    { categorie: 'infrastructure', designation: 'Enclos bovins / ovins / caprins', quantite: 1, unite: 'lot', prix_unitaire: 1800000, total: 1800000, commentaire: 'Aires, clôtures, abreuvoirs.' },
    { categorie: 'equipement', designation: 'Mangeoires, abreuvoirs, pondoirs', quantite: 1, unite: 'lot', prix_unitaire: 1250000, total: 1250000, commentaire: 'Équipements avicoles et accessoires.' },
    { categorie: 'alimentation', designation: 'Stock initial aliments', quantite: 1, unite: 'lot', prix_unitaire: 1800000, total: 1800000, commentaire: 'Pondeuses, chair et bétail.' },
    { categorie: 'vaccins', designation: 'Vaccins, produits vétérinaires et biosécurité', quantite: 1, unite: 'lot', prix_unitaire: 650000, total: 650000, commentaire: 'Prévention et pharmacie de démarrage.' },
    { categorie: 'autre', designation: 'Fonds de roulement initial', quantite: 1, unite: 'lot', prix_unitaire: 2500000, total: 2500000, commentaire: 'Trésorerie de sécurité.' },
  ].map((row) => withId('BPLI', { ...row, business_plan_id: bpId }));

  const costs = [
    { categorie: 'alimentation', designation: 'Aliment pondeuses mensuel', montant_mensuel: 4200000, frequence: 'mensuelle', commentaire: 'À ajuster selon ration et prix fournisseur.' },
    { categorie: 'alimentation', designation: 'Aliment poulets de chair par cycle', montant_mensuel: 240000, frequence: 'ponctuelle', commentaire: 'Base premier lot 200 sujets.' },
    { categorie: 'alimentation', designation: 'Aliment bovins / ovins / caprins', montant_mensuel: 850000, frequence: 'mensuelle', commentaire: 'Embouche et entretien.' },
    { categorie: 'salaires', designation: 'Main-d’œuvre ferme', montant_mensuel: 450000, frequence: 'mensuelle', commentaire: 'Agents terrain, gardiennage, suivi.' },
    { categorie: 'sante_veto', designation: 'Suivi vétérinaire et vaccins', montant_mensuel: 180000, frequence: 'mensuelle', commentaire: 'Prévention et interventions.' },
    { categorie: 'energie', designation: 'Eau, électricité, carburant', montant_mensuel: 220000, frequence: 'mensuelle', commentaire: 'Charges d’exploitation.' },
    { categorie: 'logistique', designation: 'Transport, emballages, livraison', montant_mensuel: 250000, frequence: 'mensuelle', commentaire: 'Ventes et approvisionnements.' },
    { categorie: 'imprevus', designation: 'Entretien et imprévus', montant_mensuel: 150000, frequence: 'mensuelle', commentaire: 'Maintenance et consommables.' },
  ].map((row) => withId('BPCOST', { ...row, business_plan_id: bpId }));

  const projections = [
    { mois_index: 1, unite_production: 'Tablettes œufs', production_estimee: 2400, prix_unitaire_estime: 3000, charges_estimees: 6250000, notes: 'Ponte mensuelle estimée.' },
    { mois_index: 2, unite_production: 'Tablettes œufs', production_estimee: 2500, prix_unitaire_estime: 3000, charges_estimees: 6250000, notes: 'Ponte stabilisée estimée.' },
    { mois_index: 2, unite_production: 'Poulets de chair', production_estimee: 190, prix_unitaire_estime: 3500, charges_estimees: 400000, notes: 'Vente premier lot chair.' },
    { mois_index: 3, unite_production: 'Tablettes œufs', production_estimee: 2550, prix_unitaire_estime: 3000, charges_estimees: 6250000, notes: 'Ponte mensuelle.' },
    { mois_index: 4, unite_production: 'Animaux embouche', production_estimee: 5, prix_unitaire_estime: 320000, charges_estimees: 950000, notes: 'Vente animaux selon opportunités.' },
  ].map((row) => {
    const ca = Number(row.production_estimee || 0) * Number(row.prix_unitaire_estime || 0);
    return withId('BPREV', { ...row, business_plan_id: bpId, ca_estime: ca, marge_estimee: ca - Number(row.charges_estimees || 0) });
  });

  const fundings = [
    { nom_source: 'Apport promoteur', source_type: 'apport_personnel', montant: 0, statut: 'demande' },
    { nom_source: 'Financement à rechercher', source_type: 'investisseur_prive', montant: 0, statut: 'demande' },
  ].map((row) => withId('BPFUND', { ...row, business_plan_id: bpId }));

  return { plan, lines, costs, projections, fundings };
}

export async function createHorizonFarmBusinessPlanDraft(handlers = {}) {
  const { plan, lines, costs, projections, fundings } = buildHorizonFarmBusinessPlanDraft();
  await handlers.onCreateBusinessPlan?.(plan);
  await Promise.all([
    ...lines.map((line) => handlers.onCreateBpInvestmentLine?.(line)),
    ...costs.map((cost) => handlers.onCreateBpRecurringCost?.(cost)),
    ...projections.map((projection) => handlers.onCreateBpRevenueProjection?.(projection)),
    ...fundings.map((funding) => handlers.onCreateBpFundingSource?.(funding)),
  ]);
  return plan;
}
