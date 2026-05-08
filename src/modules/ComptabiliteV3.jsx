import { Beef, Bird, FileText, Landmark, Package, Receipt, Sprout, Stethoscope, TrendingUp, Truck, Wrench } from 'lucide-react';
import ComptabiliteV2 from './ComptabiliteV2';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const safeArray = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? 0);
const status = (row = {}) => String(row.statut ?? row.status ?? row.statut_paiement ?? 'paye').toLowerCase();
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isUnpaid = (row = {}) => ['impaye', 'partiel', 'en_retard'].includes(status(row));

function hasText(row = {}, words = []) {
  const text = `${row.module_lie || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`.toLowerCase();
  return words.some((word) => text.includes(word));
}
function openOrNavigate(onNavigate, moduleKey) {
  if (onNavigate) return onNavigate(moduleKey);
  if (typeof document !== 'undefined') Array.from(document.querySelectorAll('nav button')).find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}
function LinkCard({ icon: Icon, title, value, detail, moduleKey, onNavigate, active }) {
  return (
    <button type="button" onClick={() => openOrNavigate(onNavigate, moduleKey)} className={`text-left rounded-xl border p-4 transition-all hover:border-[#b6975f] ${active ? 'bg-amber-50 border-amber-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center shrink-0"><Icon size={17} /></div>
        <div>
          <p className="font-black text-[#2f2415]">{title}</p>
          <p className="text-lg font-black text-[#2f2415] mt-1">{value}</p>
          <p className="text-xs text-[#8a7456] mt-1">{detail}</p>
          <p className="text-xs font-semibold text-[#9a6b12] mt-2">Ouvrir {moduleKey}</p>
        </div>
      </div>
    </button>
  );
}
function ConnectionPanel({ transactions = [], clients = [], fournisseurs = [], stocks = [], animaux = [], lots = [], cultures = [], sante = [], investissements = [], equipements = [], onNavigate }) {
  const tx = safeArray(transactions).filter((row) => Math.abs(amount(row)) > 0);
  const creances = tx.filter((row) => isIn(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
  const dettes = tx.filter((row) => isOut(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0) + safeArray(fournisseurs).reduce((sum, row) => sum + toNumber(row.dettes), 0);
  const missingProof = tx.filter((row) => !row.justificatif_url).length;
  const stockValue = safeArray(stocks).reduce((sum, item) => sum + toNumber(item.quantite ?? item.quantity) * toNumber(item.prix_unitaire ?? item.unit_price ?? item.price), 0);
  const healthCosts = tx.filter((row) => isOut(row) && hasText(row, ['sante', 'santé', 'vaccin', 'veto', 'vétérinaire'])).reduce((sum, row) => sum + amount(row), 0);
  const animalFlows = tx.filter((row) => hasText(row, ['animal', 'bovin', 'ovin', 'caprin'])).reduce((sum, row) => sum + amount(row), 0);
  const avicoleFlows = tx.filter((row) => hasText(row, ['avicole', 'oeuf', 'œuf', 'poulet', 'pondeuse'])).reduce((sum, row) => sum + amount(row), 0);
  const cultureFlows = tx.filter((row) => hasText(row, ['culture', 'recolte', 'récolte', 'engrais', 'semence'])).reduce((sum, row) => sum + amount(row), 0);
  const investmentFlows = tx.filter((row) => hasText(row, ['invest', 'equip', 'équip', 'construction', 'terrain'])).reduce((sum, row) => sum + amount(row), 0);

  const cards = [
    { icon: Receipt, title: 'Ventes / Clients', value: fmtCurrency(creances), detail: `${safeArray(clients).length} client(s), créances à justifier ou relancer.`, moduleKey: 'Ventes', active: creances > 0 },
    { icon: Truck, title: 'Fournisseurs', value: fmtCurrency(dettes), detail: `${safeArray(fournisseurs).length} fournisseur(s), dettes et achats.`, moduleKey: 'Fournisseurs', active: dettes > 0 },
    { icon: FileText, title: 'Documents', value: fmtNumber(missingProof), detail: 'Justificatifs nécessaires avant clôture.', moduleKey: 'Documents', active: missingProof > 0 },
    { icon: Package, title: 'Stock', value: fmtCurrency(stockValue), detail: 'Valeur stock, achats, alimentation et consommables.', moduleKey: 'Stock', active: stockValue > 0 },
    { icon: Stethoscope, title: 'Santé', value: fmtCurrency(healthCosts), detail: `${safeArray(sante).length} soin(s)/vaccin(s) liés aux charges.`, moduleKey: 'Sante', active: healthCosts > 0 },
    { icon: Beef, title: 'Animaux', value: fmtCurrency(animalFlows), detail: `${safeArray(animaux).length} animal(aux), produits et charges.`, moduleKey: 'Animaux', active: animalFlows > 0 },
    { icon: Bird, title: 'Avicole', value: fmtCurrency(avicoleFlows), detail: `${safeArray(lots).length} lot(s), œufs, chair, charges.`, moduleKey: 'Avicole', active: avicoleFlows > 0 },
    { icon: Sprout, title: 'Cultures', value: fmtCurrency(cultureFlows), detail: `${safeArray(cultures).length} culture(s), intrants et ventes.`, moduleKey: 'Cultures', active: cultureFlows > 0 },
    { icon: TrendingUp, title: 'Investissements', value: fmtCurrency(investmentFlows), detail: `${safeArray(investissements).length} projet(s), immobilisations et ROI.`, moduleKey: 'Investissements', active: investmentFlows > 0 },
    { icon: Wrench, title: 'Équipements', value: fmtNumber(safeArray(equipements).length), detail: 'Achats, maintenance et immobilisations.', moduleKey: 'Equipements', active: safeArray(equipements).length > 0 },
    { icon: Landmark, title: 'Finances', value: fmtNumber(tx.length), detail: 'Source principale des écritures comptables.', moduleKey: 'Finances', active: tx.length > 0 },
  ];

  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 mb-6">
      <div className="mb-4">
        <h3 className="font-black text-[#2f2415]">Connexions comptables</h3>
        <p className="text-sm text-[#8a7456]">La comptabilité ne remplace pas les modules métier : elle contrôle leurs flux financiers, justificatifs, dettes, créances et immobilisations.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card) => <LinkCard key={card.title} {...card} onNavigate={onNavigate} />)}
      </div>
    </div>
  );
}

export default function ComptabiliteV3(props) {
  return (
    <div>
      <ConnectionPanel {...props} />
      <ComptabiliteV2 {...props} />
    </div>
  );
}
