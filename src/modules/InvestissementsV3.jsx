import { Beef, Bird, BookOpen, CreditCard, FileText, Landmark, Package, Plus, Receipt, ShieldAlert, Sprout, Syringe, TrendingUp, Truck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import BaseInvestissements from './Investissements.jsx';

const safeArray = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const round = (value) => Math.round(Number(value || 0));
const sum = (rows, key = 'total') => safeArray(rows).reduce((acc, row) => acc + toNumber(row[key]), 0);
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.total_amount ?? 0);
const status = (row = {}) => String(row.statut ?? row.status ?? '').toLowerCase();

const ASSUMPTIONS = {
  pondeuses: 4000,
  prixPoussinPondeuse: 900,
  moisDebutPonte: 6,
  ageDebutPonteMois: 5,
  plateauxJourPleineCapacite: 116,
  prixPlateauOeufs: 2000,
  chairs: 200,
  boeufs: 10,
  moutons: 5,
  chevres: 5,
  surfacePoivronsHa: 0.5,
  apportPromoteur: 5000000,
};

function navigate(moduleId) {
  if (typeof document === 'undefined') return;
  const labels = {
    avicole: ['avicole'], animaux: ['animaux'], cultures: ['cultures'], stock: ['stock'], sante: ['sante', 'vaccins'], finances: ['finances'], comptabilite: ['comptabilite'], ventes: ['ventes'], fournisseurs: ['fournisseurs'], documents: ['documents'], impact_business: ['impact business'], equipements: ['equipements'],
  }[moduleId] || [moduleId];
  Array.from(document.querySelectorAll('nav button')).find((button) => labels.some((label) => button.textContent?.toLowerCase().includes(label)))?.click();
}

function investmentLines(bpId) {
  return [
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Poussins pondeuses 1 jour', categorie: 'cheptel', quantite: 4000, unite: 'sujets', prix_unitaire: 900, total: 3600000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aliment demarrage pondeuses 0-8 semaines', categorie: 'alimentation', quantite: 160, unite: 'sacs', prix_unitaire: 16150, total: 2584000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aliment croissance pondeuses 9-20 semaines', categorie: 'alimentation', quantite: 420, unite: 'sacs', prix_unitaire: 16500, total: 6930000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aliment pré-ponte et ponte initial', categorie: 'alimentation', quantite: 240, unite: 'sacs', prix_unitaire: 17500, total: 4200000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Poulailler poussinière + bâtiment pondeuses', categorie: 'infrastructure', quantite: 1, unite: 'ensemble', prix_unitaire: 5200000, total: 5200000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Chauffage poussinière, lampes et énergie démarrage', categorie: 'energie', quantite: 1, unite: 'lot', prix_unitaire: 450000, total: 450000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Pondoirs 70 x 15 cases', categorie: 'equipement', quantite: 70, unite: 'pcs', prix_unitaire: 30000, total: 2100000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Abreuvoirs automatiques pondeuses', categorie: 'equipement', quantite: 60, unite: 'pcs', prix_unitaire: 14500, total: 870000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Mangeoires pondeuses', categorie: 'equipement', quantite: 60, unite: 'pcs', prix_unitaire: 2700, total: 162000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Réservoirs eau 500L', categorie: 'equipement', quantite: 2, unite: 'pcs', prix_unitaire: 50000, total: 100000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins et protocole sanitaire pondeuses 0-20 semaines', categorie: 'vaccins', quantite: 4000, unite: 'sujets', prix_unitaire: 180, total: 720000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Litière, désinfection, biosécurité pondeuses', categorie: 'autre', quantite: 1, unite: 'forfait', prix_unitaire: 450000, total: 450000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Main d’œuvre élevage avant ponte 5 mois', categorie: 'main_oeuvre', quantite: 5, unite: 'mois', prix_unitaire: 120000, total: 600000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Imprévus démarrage pondeuses', categorie: 'imprevus', quantite: 1, unite: 'forfait', prix_unitaire: 650000, total: 650000 },

    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Poussins chair 1 jour', categorie: 'cheptel', quantite: 200, unite: 'sujets', prix_unitaire: 350, total: 70000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aliment chair cycle complet', categorie: 'alimentation', quantite: 28, unite: 'sacs', prix_unitaire: 14450, total: 404600 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Équipement chair: abreuvoirs, mangeoires, litière', categorie: 'equipement', quantite: 1, unite: 'lot', prix_unitaire: 44000, total: 44000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins chair Newcastle/Gumboro', categorie: 'vaccins', quantite: 200, unite: 'doses', prix_unitaire: 80, total: 16000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Énergie chauffage chair', categorie: 'energie', quantite: 1, unite: 'forfait', prix_unitaire: 12000, total: 12000 },

    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Achat 10 bœufs embouche', categorie: 'cheptel', quantite: 10, unite: 'têtes', prix_unitaire: 350000, total: 3500000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Alimentation bœufs 3 mois', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 90000, total: 270000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins et vermifuge bœufs', categorie: 'vaccins', quantite: 10, unite: 'têtes', prix_unitaire: 7000, total: 70000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aménagement parc bœufs', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 150000, total: 150000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Achat 5 moutons embouche', categorie: 'cheptel', quantite: 5, unite: 'têtes', prix_unitaire: 50000, total: 250000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Alimentation moutons 3 mois', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 12000, total: 36000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins/vermifuge moutons', categorie: 'vaccins', quantite: 5, unite: 'doses', prix_unitaire: 2500, total: 12500 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Achat 5 chèvres embouche', categorie: 'cheptel', quantite: 5, unite: 'têtes', prix_unitaire: 20000, total: 100000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Alimentation chèvres 3 mois', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 7000, total: 21000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins/soins chèvres', categorie: 'vaccins', quantite: 5, unite: 'doses', prix_unitaire: 1500, total: 7500 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aménagement bergerie / parc petits ruminants', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 120000, total: 120000 },

    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Préparation champ poivrons 0,5 ha', categorie: 'main_oeuvre', quantite: 0.5, unite: 'ha', prix_unitaire: 200000, total: 100000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Plants/semences poivrons', categorie: 'intrants', quantite: 1, unite: 'lot', prix_unitaire: 125000, total: 125000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Engrais NPK + urée poivrons', categorie: 'intrants', quantite: 1, unite: 'lot', prix_unitaire: 300000, total: 300000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Traitements phytosanitaires poivrons', categorie: 'intrants', quantite: 1, unite: 'lot', prix_unitaire: 125000, total: 125000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Irrigation goutte-à-goutte 0,5 ha', categorie: 'equipement', quantite: 0.5, unite: 'ha', prix_unitaire: 1500000, total: 750000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Main d’œuvre culture et récolte poivrons', categorie: 'main_oeuvre', quantite: 1, unite: 'forfait', prix_unitaire: 250000, total: 250000 },

    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Clôture, sécurité et portail ferme', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 1200000, total: 1200000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Magasin stock aliments et intrants', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 800000, total: 800000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Forage/pompe ou sécurisation eau', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 1200000, total: 1200000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Matériel agricole et manutention', categorie: 'equipement', quantite: 1, unite: 'lot', prix_unitaire: 500000, total: 500000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Transport initial, installation et divers', categorie: 'logistique', quantite: 1, unite: 'forfait', prix_unitaire: 600000, total: 600000 },
    { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Fonds de roulement initial', categorie: 'fonds_roulement', quantite: 1, unite: 'forfait', prix_unitaire: 2000000, total: 2000000 },
  ];
}

function recurringCosts(bpId) {
  return [
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Alimentation pondeuses en production', categorie: 'alimentation', montant_mensuel: 4200000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Salaires avicole / ramassage œufs', categorie: 'salaires', montant_mensuel: 120000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Énergie, eau et nettoyage', categorie: 'energie', montant_mensuel: 150000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Santé, vaccins, vétérinaire, biosécurité', categorie: 'sante', montant_mensuel: 180000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Entretien bâtiments et équipements', categorie: 'maintenance', montant_mensuel: 120000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Transport, commercialisation et emballages', categorie: 'logistique', montant_mensuel: 150000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Administration, téléphone, internet et documents', categorie: 'administratif', montant_mensuel: 70000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Imprévus exploitation', categorie: 'imprevus', montant_mensuel: 400000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Suivi chair mensuel', categorie: 'avicole_chair', montant_mensuel: 18000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Ouvrier et suivi bœufs', categorie: 'animaux', montant_mensuel: 65000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Suivi moutons et chèvres', categorie: 'animaux', montant_mensuel: 25000, frequence: 'mensuelle' },
    { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Irrigation et surveillance poivrons', categorie: 'cultures', montant_mensuel: 60000, frequence: 'mensuelle' },
  ];
}

function revenueProjections(bpId) {
  const rows = [];
  const fullEggRevenue = ASSUMPTIONS.plateauxJourPleineCapacite * 30 * ASSUMPTIONS.prixPlateauOeufs;
  const eggRatios = [0, 0, 0, 0, 0, 0.25, 0.55, 0.75, 0.90, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95];
  for (let month = 1; month <= 18; month += 1) {
    const eggCa = round(fullEggRevenue * (eggRatios[month - 1] || 0));
    const chairCa = month % 2 === 0 ? 672000 : 0;
    const bovinCa = month === 3 ? 5500000 : 0;
    const moutonCa = month === 3 ? 600000 : 0;
    const chevreCa = month === 3 ? 200000 : 0;
    const poivronCa = month === 2 ? 1050000 : month === 3 ? 1950000 : 0;
    const ca = eggCa + chairCa + bovinCa + moutonCa + chevreCa + poivronCa;
    const charges = month < ASSUMPTIONS.moisDebutPonte ? 1950000 : 5568000;
    rows.push({
      id: makeId('BPREV'), business_plan_id: bpId, mois_index: month, capacite_active: month < ASSUMPTIONS.moisDebutPonte ? 0 : 4000,
      production_estimee: ca > 0 ? 1 : 0, unite_production: 'portefeuille mensuel', prix_unitaire_estime: ca,
      ca_estime: ca, charges_estimees: charges, marge_estimee: ca - charges,
      remboursement_prevu: round(Math.max(0, ca - charges) * 0.15),
      notes: month < 6 ? `Poussins/pondeuses en croissance, âge ${month - 1}-${month} mois, pas de ponte commerciale.` : `Ponte progressive à partir de 5 mois d'âge + autres activités selon cycle.`,
    });
  }
  return rows;
}

function risks(bpId) {
  return [
    { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Mortalité poussins pondeuses avant ponte', probabilite: 'moyenne', impact: 'eleve', mitigation: 'Poussinière, chauffage, protocole vaccinal, biosécurité et alertes Santé & Vaccins.' },
    { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Hausse du prix aliment', probabilite: 'elevee', impact: 'eleve', mitigation: 'Stock de sécurité, fournisseurs multiples, suivi coût/kg et alertes Stock.' },
    { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Mévente ou retard d’encaissement', probabilite: 'moyenne', impact: 'moyen', mitigation: 'Contrats revendeurs, suivi créances dans Ventes/Finances, relances clients.' },
    { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Risque culture poivrons', probabilite: 'moyenne', impact: 'moyen', mitigation: 'Irrigation fiable, traitements préventifs, rotation culturale et suivi Cultures.' },
  ];
}

function LinkCard({ icon: Icon, title, detail, metric, moduleId }) {
  return <button type="button" onClick={() => navigate(moduleId)} className="text-left rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-4 hover:border-[#b6975f] transition-all"><div className="flex gap-3"><div className="w-9 h-9 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center shrink-0"><Icon size={17} /></div><div><p className="font-black text-[#2f2415]">{title}</p><p className="text-lg font-black text-[#2f2415] mt-1">{metric}</p><p className="text-xs text-[#8a7456] mt-1">{detail}</p></div></div></button>;
}

function opportunities(props, investmentTotal) {
  const plans = safeArray(props.businessPlans);
  const tx = safeArray(props.transactions);
  const lots = safeArray(props.lots);
  const animaux = safeArray(props.animaux);
  const cultures = safeArray(props.cultures);
  const cashNet = tx.filter((row) => String(row.type).toLowerCase() === 'entree' && status(row) !== 'annule').reduce((acc, row) => acc + amount(row), 0) - tx.filter((row) => String(row.type).toLowerCase() === 'sortie' && status(row) !== 'annule').reduce((acc, row) => acc + amount(row), 0);
  const hasHorizon = plans.some((bp) => String(bp.nom || '').toLowerCase().includes('horizon farm'));
  const layers = lots.filter((lot) => String(lot.type || '').toLowerCase().includes('pondeuse')).reduce((acc, lot) => acc + toNumber(lot.initial_count ?? lot.current_count), 0);
  const broilers = lots.filter((lot) => String(lot.type || '').toLowerCase().includes('chair')).reduce((acc, lot) => acc + toNumber(lot.initial_count ?? lot.current_count), 0);
  const activeCultures = cultures.filter((culture) => !['termine', 'perdu', 'vendu'].includes(status(culture))).length;
  return [
    { title: 'Sécuriser le BP Horizon Farm', score: Math.min(100, (hasHorizon ? 45 : 10) + (cashNet > 0 ? 20 : 0) + 25), amount: investmentTotal, moduleId: 'finances', detail: hasHorizon ? 'BP créé: vérifier vrais devis, justificatifs et financement.' : 'Créer le BP puis ajuster les vrais prix.', basis: 'BP + trésorerie + financement.' },
    { title: 'Pondeuses poussins → ponte 5 mois', score: Math.min(100, Math.round((layers / 4000) * 70) + 20), amount: 22566000, moduleId: 'avicole', detail: `${fmtNumber(layers)} pondeuse(s) suivie(s) / objectif 4000.`, basis: 'Lots avicoles + âge + projection ponte.' },
    { title: 'Chair: cycles courts', score: Math.min(100, Math.round((broilers / 200) * 70) + 20), amount: 546600, moduleId: 'avicole', detail: `${fmtNumber(broilers)} chair(s) suivis / objectif 200.`, basis: 'Lots chair + âge + poids moyen.' },
    { title: 'Embouche bœufs/moutons/chèvres', score: Math.min(100, Math.round((animaux.length / 20) * 70) + 20), amount: 4537000, moduleId: 'animaux', detail: `${fmtNumber(animaux.length)} animal(aux) suivis / objectif 20.`, basis: 'Animaux + santé + vente fin cycle.' },
    { title: 'Poivrons', score: activeCultures ? 80 : 45, amount: 1650000, moduleId: 'cultures', detail: activeCultures ? 'Culture active: suivre intrants et rendement.' : 'Créer la parcelle poivrons.', basis: 'Cultures + stock intrants + rendement.' },
  ].sort((a, b) => b.score - a.score);
}

function OpportunityCard({ item }) {
  return <button type="button" onClick={() => navigate(item.moduleId)} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-4 text-left hover:border-[#b6975f] transition-all"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{item.title}</p><p className="text-xs text-[#8a7456] mt-1">{item.detail}</p><p className="text-xs text-[#9a6b12] mt-2">Base: {item.basis}</p></div><span className="shrink-0 rounded-full border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black text-[#2f2415]">{item.score}%</span></div><div className="mt-3 flex items-center justify-between gap-3"><span className="text-sm font-black text-[#2f2415]">{fmtCurrency(item.amount)}</span><span className="text-xs rounded-full bg-[#eadcc2] text-[#7d6a4a] px-2 py-1">à suivre</span></div></button>;
}

function HorizonFarmPanel(props) {
  const [creating, setCreating] = useState(false);
  const linesPreview = useMemo(() => investmentLines('PREVIEW'), []);
  const costsPreview = useMemo(() => recurringCosts('PREVIEW'), []);
  const investmentTotal = sum(linesPreview);
  const monthlyCosts = sum(costsPreview, 'montant_mensuel');
  const fundingTarget = Math.max(0, investmentTotal - ASSUMPTIONS.apportPromoteur);
  const existing = useMemo(() => safeArray(props.businessPlans).find((bp) => String(bp.nom || '').toLowerCase().includes('horizon farm') && String(bp.nom || '').toLowerCase().includes('4000')), [props.businessPlans]);
  const opps = useMemo(() => opportunities(props, investmentTotal), [props, investmentTotal]);

  const createPlan = async () => {
    if (existing) { toast.success('Le BP Horizon Farm existe déjà'); return; }
    const bpId = makeId('BP');
    const lines = investmentLines(bpId);
    const costs = recurringCosts(bpId);
    const projections = revenueProjections(bpId);
    const riskRows = risks(bpId);
    setCreating(true);
    try {
      await props.onCreateBusinessPlan?.({
        id: bpId,
        nom: 'HORIZON FARM - 4000 poussins pondeuses + chair + ruminants + poivrons',
        activity_type: 'autre', statut: 'planifie', localisation: 'Horizon Farm', date_debut_prevue: today(), duree_cycle_mois: 18,
        capacite_initiale: 4215, nombre_tetes_prevu: 4220, unite_capacite: 'têtes + 0,5 ha', unite_calcul_cout: 'portefeuille', prix_vente_prevu_unitaire: 0,
        taux_remboursement_pct: 15,
        objectif_production: '4000 poussins pondeuses à 900F/unité, ponte à partir de 5 mois, 200 poulets de chair, 10 bœufs, 5 moutons, 5 chèvres et poivrons.',
        metadata: { ...ASSUMPTIONS, hypothese_oeufs: '116 plateaux/jour à pleine capacité, ponte progressive à partir de 5 mois d’âge.' },
      });
      await Promise.all(lines.map((line) => props.onCreateBpInvestmentLine?.(line)));
      await Promise.all(costs.map((cost) => props.onCreateBpRecurringCost?.(cost)));
      await Promise.all(projections.map((projection) => props.onCreateBpRevenueProjection?.(projection)));
      await Promise.all([
        props.onCreateBpFundingSource?.({ id: makeId('BPFUND'), business_plan_id: bpId, source: 'Apport promoteur', montant: ASSUMPTIONS.apportPromoteur, statut: 'prevu', notes: 'Apport initial.' }),
        props.onCreateBpFundingSource?.({ id: makeId('BPFUND'), business_plan_id: bpId, source: 'Financement recherché', montant: fundingTarget, statut: 'a_rechercher', notes: 'Solde à financer, remboursement conseillé sur marge positive.' }),
      ]);
      await Promise.all(riskRows.map((risk) => props.onCreateBpRisk?.(risk)));
      await props.onRefreshBusinessPlans?.();
      toast.success('BP Horizon Farm créé avec poussins pondeuses à 900F et ponte à 5 mois');
    } catch (error) { toast.error(error.message || 'Création du BP Horizon Farm impossible'); } finally { setCreating(false); }
  };

  return <div className="space-y-4">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Plan intégré proposé</p><h3 className="text-xl font-black text-[#2f2415] mt-1">HORIZON FARM — investissement modifiable</h3><p className="text-sm text-[#7d6a4a] mt-1">4000 poussins pondeuses à 900F · ponte à partir de 5 mois · 200 chairs · 20 ruminants · poivrons. Après création, chaque ligne du BP reste modifiable dans les tableaux du module.</p></div><div className="flex gap-2 flex-wrap"><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Investissement estimé</p><p className="font-black text-[#2f2415]">{fmtCurrency(investmentTotal)}</p></div><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Charges mensuelles prod.</p><p className="font-black text-[#2f2415]">{fmtCurrency(monthlyCosts)}</p></div><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Financement à chercher</p><p className="font-black text-[#2f2415]">{fmtCurrency(fundingTarget)}</p></div><Btn icon={Plus} onClick={createPlan} disabled={creating || Boolean(existing)}>{existing ? 'BP déjà créé' : 'Créer BP Horizon Farm'}</Btn></div></div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-4"><div><h3 className="font-black text-[#2f2415]">Opportunités d’investissement</h3><p className="text-sm text-[#8a7456]">Le score évolue avec les BP, les lots réels, les animaux, les cultures et la trésorerie. Il sert à prioriser le financement, pas à décider à ta place.</p></div><div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Moteur</p><p className="text-sm font-black text-[#2f2415]">BP + Réel + Cash</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{opps.map((item) => <OpportunityCard key={item.title} item={item} />)}</div><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex gap-2"><ShieldAlert size={16} className="text-amber-600 mt-0.5" /><p className="text-xs text-[#7d6a4a]">Les prix sont des hypothèses. Il faut les remplacer par devis/factures réels dans les lignes du BP, puis Finances et Comptabilité suivront le réel.</p></div></div></div>
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><div className="mb-4"><h3 className="font-black text-[#2f2415]">Connexions investissement ↔ modules</h3><p className="text-sm text-[#8a7456]">Chaque carte ouvre le module où suivre le réel après création du BP.</p></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"><LinkCard icon={Bird} title="Avicole" metric="4200 sujets" detail="Poussins pondeuses, chair, ponte, mortalité, poids." moduleId="avicole" /><LinkCard icon={Beef} title="Animaux" metric="20 têtes" detail="Bœufs, moutons, chèvres, santé, vente." moduleId="animaux" /><LinkCard icon={Sprout} title="Cultures" metric="Poivrons" detail="Parcelle, intrants, récolte et rendement." moduleId="cultures" /><LinkCard icon={Package} title="Stock" metric="Aliments/intrants" detail="Sacs, vaccins, engrais, seuils critiques." moduleId="stock" /><LinkCard icon={Syringe} title="Santé" metric="Vaccins" detail="Poussins, chair et ruminants." moduleId="sante" /><LinkCard icon={Landmark} title="Finances" metric={fmtCurrency(investmentTotal)} detail="Décaissements, financement, charges, cash." moduleId="finances" /><LinkCard icon={BookOpen} title="Comptabilité" metric="Validation" detail="Justificatifs, écritures, clôture." moduleId="comptabilite" /><LinkCard icon={Receipt} title="Ventes" metric="Œufs + animaux" detail="Clients, factures, encaissements, créances." moduleId="ventes" /><LinkCard icon={Truck} title="Fournisseurs" metric="Achats" detail="Poussins, aliments, engrais, matériel." moduleId="fournisseurs" /><LinkCard icon={FileText} title="Documents" metric="BP + preuves" detail="Factures, devis, pièces du financement." moduleId="documents" /><LinkCard icon={TrendingUp} title="Impact Business" metric="ROI" detail="Valeur créée, rentabilité, gains ERP." moduleId="impact_business" /><LinkCard icon={Wrench} title="Équipements" metric="Bâtiments" detail="Pondoirs, abreuvoirs, irrigation, maintenance." moduleId="equipements" /></div></div>
  </div>;
}

export default function InvestissementsV3(props) {
  return <div className="space-y-6"><HorizonFarmPanel {...props} /><BaseInvestissements {...props} /></div>;
}
