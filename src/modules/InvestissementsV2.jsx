import { Beef, Bird, BookOpen, CreditCard, FileText, Landmark, Package, Plus, Receipt, ShieldAlert, Sprout, Syringe, TrendingUp, Truck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Btn from '../components/Btn';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import BaseInvestissements from './Investissements.jsx';

const safeArray = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const sum = (rows, key = 'total') => safeArray(rows).reduce((acc, row) => acc + toNumber(row[key]), 0);
const round = (value) => Math.round(Number(value || 0));

function openModule(moduleId) {
  if (typeof document === 'undefined') return;
  const labels = {
    avicole: ['avicole'], animaux: ['animaux'], cultures: ['cultures'], stock: ['stock'], sante: ['sante', 'vaccins'], finances: ['finances'], comptabilite: ['comptabilite'], ventes: ['ventes'], fournisseurs: ['fournisseurs'], documents: ['documents'], impact_business: ['impact business'], equipements: ['equipements'],
  }[moduleId] || [moduleId];
  Array.from(document.querySelectorAll('nav button')).find((button) => labels.some((label) => button.textContent?.toLowerCase().includes(label)))?.click();
}

const investmentLines = (bpId) => [
  // Pondeuses x2 base BP 2000 sujets
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Poulettes pondeuses 2 mois', categorie: 'cheptel', quantite: 4000, unite: 'sujets', prix_unitaire: 2500, total: 10000000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aliment poulette demarrage 3 mois', categorie: 'alimentation', quantite: 480, unite: 'sacs', prix_unitaire: 16150, total: 7752000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aliment pondeuse initial', categorie: 'alimentation', quantite: 240, unite: 'sacs', prix_unitaire: 17500, total: 4200000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Box / extension poulailler pondeuses', categorie: 'infrastructure', quantite: 2, unite: 'box', prix_unitaire: 2000000, total: 4000000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Pondoirs 70 x 15 cases', categorie: 'equipement', quantite: 70, unite: 'pcs', prix_unitaire: 30000, total: 2100000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Abreuvoirs automatiques', categorie: 'equipement', quantite: 60, unite: 'pcs', prix_unitaire: 14500, total: 870000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Mangeoires', categorie: 'equipement', quantite: 60, unite: 'pcs', prix_unitaire: 2700, total: 162000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Reservoirs eau 500L', categorie: 'equipement', quantite: 2, unite: 'pcs', prix_unitaire: 50000, total: 100000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccin Corymune K7 pondeuses', categorie: 'vaccins', quantite: 4000, unite: 'doses', prix_unitaire: 70, total: 280000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Lunettes anti-cannibalisme + pose', categorie: 'autre', quantite: 4200, unite: 'pcs', prix_unitaire: 100, total: 420000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Paille de riz et litiere pondeuses', categorie: 'autre', quantite: 40, unite: 'sacs', prix_unitaire: 2000, total: 80000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Main oeuvre installation avicole', categorie: 'main_oeuvre', quantite: 1, unite: 'forfait', prix_unitaire: 100000, total: 100000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Imprevus demarrage pondeuses', categorie: 'autre', quantite: 1, unite: 'forfait', prix_unitaire: 400000, total: 400000 },

  // Poulets de chair 200 sujets
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Poussins chair 1 jour', categorie: 'cheptel', quantite: 200, unite: 'sujets', prix_unitaire: 350, total: 70000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Aliment chair cycle complet', categorie: 'alimentation', quantite: 28, unite: 'sacs', prix_unitaire: 14450, total: 404600 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Equipement chair: abreuvoirs/mangeoires/litiere', categorie: 'equipement', quantite: 1, unite: 'lot', prix_unitaire: 44000, total: 44000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins chair Newcastle/Gumboro', categorie: 'vaccins', quantite: 200, unite: 'doses', prix_unitaire: 80, total: 16000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Energie chauffage chair', categorie: 'energie', quantite: 1, unite: 'forfait', prix_unitaire: 12000, total: 12000 },

  // Animaux embouche
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Achat 10 boeufs embouche', categorie: 'cheptel', quantite: 10, unite: 'tetes', prix_unitaire: 350000, total: 3500000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Alimentation boeufs 3 mois', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 90000, total: 270000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins et vermifuge boeufs', categorie: 'vaccins', quantite: 10, unite: 'tetes', prix_unitaire: 7000, total: 70000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Amenagement parc boeufs', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 150000, total: 150000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Achat 5 moutons embouche', categorie: 'cheptel', quantite: 5, unite: 'tetes', prix_unitaire: 50000, total: 250000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Alimentation moutons 3 mois', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 12000, total: 36000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins/verminfuge moutons', categorie: 'vaccins', quantite: 5, unite: 'doses', prix_unitaire: 2500, total: 12500 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Achat 5 chevres embouche', categorie: 'cheptel', quantite: 5, unite: 'tetes', prix_unitaire: 20000, total: 100000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Alimentation chevres 3 mois', categorie: 'alimentation', quantite: 3, unite: 'mois', prix_unitaire: 7000, total: 21000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Vaccins/soins chevres', categorie: 'vaccins', quantite: 5, unite: 'doses', prix_unitaire: 1500, total: 7500 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Amenagement bergerie / parc petits ruminants', categorie: 'infrastructure', quantite: 1, unite: 'forfait', prix_unitaire: 120000, total: 120000 },

  // Poivrons
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Preparation champ poivrons 0,5 ha', categorie: 'main_oeuvre', quantite: 0.5, unite: 'ha', prix_unitaire: 200000, total: 100000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Plants/semences poivrons', categorie: 'autre', quantite: 1, unite: 'lot', prix_unitaire: 125000, total: 125000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Engrais NPK + uree poivrons', categorie: 'autre', quantite: 1, unite: 'lot', prix_unitaire: 300000, total: 300000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Traitements phytosanitaires poivrons', categorie: 'autre', quantite: 1, unite: 'lot', prix_unitaire: 125000, total: 125000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Irrigation goutte-a-goutte 0,5 ha', categorie: 'equipement', quantite: 0.5, unite: 'ha', prix_unitaire: 1500000, total: 750000 },
  { id: makeId('BPLI'), business_plan_id: bpId, designation: 'Main oeuvre culture et recolte poivrons', categorie: 'main_oeuvre', quantite: 1, unite: 'forfait', prix_unitaire: 250000, total: 250000 },
];

const recurringCosts = (bpId) => [
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Alimentation pondeuses', categorie: 'alimentation', montant_mensuel: 4200000, frequence: 'mensuelle' },
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Salaires avicole / ramassage oeufs', categorie: 'salaires', montant_mensuel: 120000, frequence: 'mensuelle' },
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Energie et eau pondeuses', categorie: 'energie', montant_mensuel: 100000, frequence: 'mensuelle' },
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Imprevus pondeuses', categorie: 'imprevus', montant_mensuel: 400000, frequence: 'mensuelle' },
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Suivi chair mensuel', categorie: 'avicole_chair', montant_mensuel: 18000, frequence: 'mensuelle' },
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Ouvrier et suivi boeufs', categorie: 'animaux', montant_mensuel: 65000, frequence: 'mensuelle' },
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Suivi moutons et chevres', categorie: 'animaux', montant_mensuel: 25000, frequence: 'mensuelle' },
  { id: makeId('BPCOST'), business_plan_id: bpId, designation: 'Irrigation et surveillance poivrons', categorie: 'cultures', montant_mensuel: 60000, frequence: 'mensuelle' },
];

const revenueProjections = (bpId) => {
  const rows = [];
  const fullEggRevenue = 6960000;
  const eggRatios = [0, 0, 0, 0.30, 0.60, 0.70, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95, 0.95];
  for (let month = 1; month <= 18; month += 1) {
    const eggCa = round(fullEggRevenue * (eggRatios[month - 1] || 0));
    const chairCa = month % 2 === 0 ? 672000 : 0;
    const bovinCa = month === 3 ? 5500000 : 0;
    const moutonCa = month === 3 ? 600000 : 0;
    const chevreCa = month === 3 ? 200000 : 0;
    const poivronCa = month === 2 ? 1050000 : month === 3 ? 1950000 : 0;
    const ca = eggCa + chairCa + bovinCa + moutonCa + chevreCa + poivronCa;
    const activeExtraCharges = (month <= 3 ? 150000 : 0) + 18000 + (month <= 3 ? 60000 : 0);
    const charges = 4820000 + activeExtraCharges;
    rows.push({
      id: makeId('BPREV'), business_plan_id: bpId, mois_index: month, capacite_active: month < 4 ? 0 : 4000,
      production_estimee: ca > 0 ? 1 : 0, unite_production: 'portefeuille mensuel', prix_unitaire_estime: ca,
      ca_estime: ca, charges_estimees: charges, marge_estimee: ca - charges,
      remboursement_prevu: round(Math.max(0, ca - charges) * 0.15),
      notes: `Pondeuses ${round(eggCa / 2000)} plateaux/mois + chair/betail/poivrons selon cycle`,
    });
  }
  return rows;
};

const risks = (bpId) => [
  { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Risque sanitaire avicole et betail', probabilite: 'moyenne', impact: 'eleve', mitigation: 'Programme vaccinal, biosécurité, quarantaine, suivi vétérinaire dans Santé & Vaccins.' },
  { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Hausse du prix aliment', probabilite: 'elevee', impact: 'eleve', mitigation: 'Achats groupés, fournisseurs multiples, alerte stock/prix dans Stock et Fournisseurs.' },
  { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Mévente ou retard d’encaissement', probabilite: 'moyenne', impact: 'moyen', mitigation: 'Contrats revendeurs, suivi créances dans Ventes/Finances, relances clients.' },
  { id: makeId('BPRISK'), business_plan_id: bpId, titre: 'Risque culture poivrons', probabilite: 'moyenne', impact: 'moyen', mitigation: 'Irrigation fiable, traitements préventifs, rotation culturale dans Cultures.' },
];

function LinkCard({ icon: Icon, title, detail, metric, moduleId }) {
  return (
    <button type="button" onClick={() => openModule(moduleId)} className="text-left rounded-xl border border-[#d6c3a0] bg-[#fffdf8] p-4 hover:border-[#b6975f] transition-all">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center shrink-0"><Icon size={17} /></div>
        <div>
          <p className="font-black text-[#2f2415]">{title}</p>
          <p className="text-lg font-black text-[#2f2415] mt-1">{metric}</p>
          <p className="text-xs text-[#8a7456] mt-1">{detail}</p>
        </div>
      </div>
    </button>
  );
}

function HorizonFarmPanel(props) {
  const [creating, setCreating] = useState(false);
  const existing = useMemo(() => safeArray(props.businessPlans).find((bp) => String(bp.nom || '').toLowerCase().includes('horizon farm') && String(bp.nom || '').toLowerCase().includes('4000')), [props.businessPlans]);
  const previewLines = useMemo(() => investmentLines('PREVIEW'), []);
  const investmentTotal = sum(previewLines);
  const fundingTarget = Math.max(0, investmentTotal - 5000000);

  const createPlan = async () => {
    if (existing) {
      toast.success('Le BP Horizon Farm existe déjà');
      return;
    }
    const bpId = makeId('BP');
    const lines = investmentLines(bpId);
    const costs = recurringCosts(bpId);
    const projections = revenueProjections(bpId);
    const riskRows = risks(bpId);
    setCreating(true);
    try {
      await props.onCreateBusinessPlan?.({
        id: bpId,
        nom: 'HORIZON FARM - Ferme intégrée 4000 pondeuses + chair + ruminants + poivrons',
        activity_type: 'autre', statut: 'planifie', localisation: 'Horizon Farm', date_debut_prevue: today(),
        duree_cycle_mois: 18, capacite_initiale: 4215, nombre_tetes_prevu: 4220, unite_capacite: 'tetes + 0,5 ha', unite_calcul_cout: 'portefeuille', prix_vente_prevu_unitaire: 0,
        taux_remboursement_pct: 15,
        objectif_production: '4000 pondeuses, 200 poulets de chair, 10 boeufs, 5 moutons, 5 chevres et 0,5 ha de poivrons avec suivi multi-modules.',
        metadata: {
          pondeuses: 4000, poulets_chair: 200, boeufs: 10, moutons: 5, chevres: 5, culture: 'Poivrons', surface_poivrons_ha: 0.5,
          hypothese_oeufs: '116 plateaux/jour à pleine capacité (base BP 2000 pondeuses x2)',
          prix_plateau_oeufs: 2000, prix_poulet_chair: 3500, prix_boeuf: 550000, prix_mouton: 120000, prix_chevre: 40000, prix_poivron_kg: 400,
        },
      });
      await Promise.all(lines.map((line) => props.onCreateBpInvestmentLine?.(line)));
      await Promise.all(costs.map((cost) => props.onCreateBpRecurringCost?.(cost)));
      await Promise.all(projections.map((projection) => props.onCreateBpRevenueProjection?.(projection)));
      await Promise.all([
        props.onCreateBpFundingSource?.({ id: makeId('BPFUND'), business_plan_id: bpId, source: 'Apport promoteur', montant: 5000000, statut: 'prevu', notes: 'Apport initial proposé pour sécuriser le lancement.' }),
        props.onCreateBpFundingSource?.({ id: makeId('BPFUND'), business_plan_id: bpId, source: 'Financement recherché', montant: fundingTarget, statut: 'a_rechercher', notes: 'Solde à financer, remboursement recommandé à 15% de la marge positive mensuelle.' }),
      ]);
      await Promise.all(riskRows.map((risk) => props.onCreateBpRisk?.(risk)));
      await props.onRefreshBusinessPlans?.();
      toast.success('Business Plan Horizon Farm créé avec lignes, charges, projections, financement et risques');
    } catch (error) {
      toast.error(error.message || 'Création du BP Horizon Farm impossible');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456]">Plan intégré proposé</p>
            <h3 className="text-xl font-black text-[#2f2415] mt-1">HORIZON FARM — investissement multi-activités</h3>
            <p className="text-sm text-[#7d6a4a] mt-1">4000 pondeuses · 200 chairs · 10 bœufs · 5 moutons · 5 chèvres · poivrons. Base pondeuse reprise du BP fourni puis mise à l’échelle.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Investissement estimé</p><p className="font-black text-[#2f2415]">{fmtCurrency(investmentTotal)}</p></div>
            <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2"><p className="text-xs text-[#8a7456]">Financement à chercher</p><p className="font-black text-[#2f2415]">{fmtCurrency(fundingTarget)}</p></div>
            <Btn icon={Plus} onClick={createPlan} disabled={creating || Boolean(existing)}>{existing ? 'BP déjà créé' : 'Créer BP Horizon Farm'}</Btn>
          </div>
        </div>
      </div>
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
        <div className="mb-4"><h3 className="font-black text-[#2f2415]">Connexions investissement ↔ modules</h3><p className="text-sm text-[#8a7456]">Chaque bloc ouvre le module où suivre le réel après création du BP.</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <LinkCard icon={Bird} title="Avicole" metric="4200 sujets" detail="Pondeuses, chair, ponte, mortalité, poids, réforme." moduleId="avicole" />
          <LinkCard icon={Beef} title="Animaux" metric="20 têtes" detail="Bœufs, moutons, chèvres, santé, vente." moduleId="animaux" />
          <LinkCard icon={Sprout} title="Cultures" metric="Poivrons" detail="Parcelle, intrants, récolte et rendement." moduleId="cultures" />
          <LinkCard icon={Package} title="Stock" metric="Aliments/intrants" detail="Sacs, vaccins, engrais, seuils critiques." moduleId="stock" />
          <LinkCard icon={Syringe} title="Santé" metric="Vaccins" detail="Corymune K7, traitements, vétérinaire." moduleId="sante" />
          <LinkCard icon={Landmark} title="Finances" metric={fmtCurrency(investmentTotal)} detail="Décaissements, financement, charges, cash." moduleId="finances" />
          <LinkCard icon={BookOpen} title="Comptabilité" metric="Validation" detail="Justificatifs, écritures, clôture." moduleId="comptabilite" />
          <LinkCard icon={Receipt} title="Ventes" metric="Œufs + animaux" detail="Clients, factures, encaissements, créances." moduleId="ventes" />
          <LinkCard icon={Truck} title="Fournisseurs" metric="Achats" detail="Poulettes, aliments, engrais, matériel." moduleId="fournisseurs" />
          <LinkCard icon={FileText} title="Documents" metric="BP + preuves" detail="Factures, devis, pièces du financement." moduleId="documents" />
          <LinkCard icon={TrendingUp} title="Impact Business" metric="ROI" detail="Valeur créée, rentabilité, gains ERP." moduleId="impact_business" />
          <LinkCard icon={Wrench} title="Équipements" metric="Poulaillers" detail="Pondoirs, abreuvoirs, irrigation, maintenance." moduleId="equipements" />
        </div>
      </div>
    </div>
  );
}

export default function InvestissementsV2(props) {
  return (
    <div className="space-y-6">
      <HorizonFarmPanel {...props} />
      <BaseInvestissements {...props} />
    </div>
  );
}
