import { Beef, Bird, BookOpen, FileText, HeartPulse, Landmark, Package, Receipt, Sprout, Truck } from 'lucide-react';
import FinancesV5 from './FinancesV5';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const safeArray = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.prix_total ?? 0);
const status = (row = {}) => String(row.statut ?? row.status ?? row.statut_paiement ?? 'paye').toLowerCase();
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';

function openModule(moduleKey) {
  if (!moduleKey || typeof document === 'undefined') return;
  const buttons = Array.from(document.querySelectorAll('nav button'));
  buttons.find((button) => button.textContent?.toLowerCase().includes(moduleKey.toLowerCase()))?.click();
}

function hasText(row = {}, words = []) {
  const text = `${row.module_lie || ''} ${row.module_source || ''} ${row.categorie || ''} ${row.category || ''} ${row.libelle || ''}`.toLowerCase();
  return words.some((word) => text.includes(word));
}

function getOrderRemaining(order = {}) {
  const explicit = toNumber(order.reste_a_payer ?? order.remaining_amount, NaN);
  if (Number.isFinite(explicit)) return Math.max(0, explicit);
  const total = amount(order) || toNumber(order.montant_total) || toNumber(order.total_ttc) || toNumber(order.total_ht);
  const paid = toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
  return Math.max(0, total - paid);
}

function LinkCard({ icon: Icon, title, value, detail, moduleKey, highlight = false }) {
  return (
    <button
      type="button"
      onClick={() => openModule(moduleKey)}
      className={`text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${highlight ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#d6c3a0]'}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center shrink-0"><Icon size={18} /></div>
        <div className="min-w-0">
          <p className="font-black text-[#2f2415]">{title}</p>
          <p className="text-lg font-black text-[#2f2415] mt-1">{value}</p>
          <p className="text-xs text-[#8a7456] mt-1">{detail}</p>
          <p className="text-xs font-semibold text-[#9a6b12] mt-3">Ouvrir {moduleKey}</p>
        </div>
      </div>
    </button>
  );
}

function FinanceLinks({ rows = [], salesOrders = [], fournisseurs = [], stocks = [], animaux = [], lots = [], cultures = [] }) {
  const transactions = safeArray(rows).filter((row) => Math.abs(amount(row)) > 0);
  const receivables = safeArray(salesOrders)
    .filter((order) => status(order) !== 'annule')
    .reduce((sum, order) => sum + getOrderRemaining(order), 0)
    + transactions.filter((row) => isIn(row) && ['impaye', 'partiel', 'en_retard'].includes(status(row))).reduce((sum, row) => sum + amount(row), 0);
  const supplierDebt = safeArray(fournisseurs).reduce((sum, item) => sum + toNumber(item.dettes), 0);
  const missingProof = transactions.filter((row) => !row.justificatif_url).length;
  const stockCritical = safeArray(stocks).filter((item) => toNumber(item.quantite ?? item.quantity) <= toNumber(item.seuil ?? item.threshold)).length;
  const healthCosts = transactions.filter((row) => isOut(row) && hasText(row, ['sante', 'santé', 'vaccin', 'veto'])).reduce((sum, row) => sum + amount(row), 0);
  const animalRevenue = transactions.filter((row) => isIn(row) && hasText(row, ['animal', 'bovin', 'ovin', 'caprin'])).reduce((sum, row) => sum + amount(row), 0);
  const avicoleRevenue = transactions.filter((row) => isIn(row) && hasText(row, ['avicole', 'oeuf', 'œuf', 'poulet', 'pondeuse'])).reduce((sum, row) => sum + amount(row), 0);
  const cultureRevenue = transactions.filter((row) => isIn(row) && hasText(row, ['culture', 'recolte', 'récolte', 'maraich'])).reduce((sum, row) => sum + amount(row), 0);

  const cards = [
    { icon: Receipt, title: 'Ventes & créances', value: fmtCurrency(receivables), detail: 'Relancer clients, vérifier commandes et paiements.', moduleKey: 'Ventes', highlight: receivables > 0 },
    { icon: FileText, title: 'Justificatifs', value: fmtNumber(missingProof), detail: 'Factures, reçus et preuves à attacher aux transactions.', moduleKey: 'Documents', highlight: missingProof > 0 },
    { icon: BookOpen, title: 'Comptabilité', value: 'Préparer', detail: 'Transformer les flux financiers propres en écritures.', moduleKey: 'Comptabilité', highlight: true },
    { icon: Truck, title: 'Fournisseurs', value: fmtCurrency(supplierDebt), detail: 'Dettes, achats et sorties fournisseur à suivre.', moduleKey: 'Fournisseurs', highlight: supplierDebt > 0 },
    { icon: Package, title: 'Stock', value: fmtNumber(stockCritical), detail: 'Stocks critiques, achats, valeur stock et alimentation.', moduleKey: 'Stock', highlight: stockCritical > 0 },
    { icon: HeartPulse, title: 'Santé', value: fmtCurrency(healthCosts), detail: 'Frais vétérinaires, vaccins et traitements liés aux charges.', moduleKey: 'Santé', highlight: healthCosts > 0 },
    { icon: Beef, title: 'Animaux', value: fmtCurrency(animalRevenue), detail: `${safeArray(animaux).length} animal(aux), ventes et charges liées.`, moduleKey: 'Animaux', highlight: animalRevenue > 0 },
    { icon: Bird, title: 'Avicole', value: fmtCurrency(avicoleRevenue), detail: `${safeArray(lots).length} lot(s), œufs, chair et réformes.`, moduleKey: 'Avicole', highlight: avicoleRevenue > 0 },
    { icon: Sprout, title: 'Cultures', value: fmtCurrency(cultureRevenue), detail: `${safeArray(cultures).length} culture(s), récoltes et ventes.`, moduleKey: 'Cultures', highlight: cultureRevenue > 0 },
    { icon: Landmark, title: 'Impact Business', value: 'Analyser', detail: 'Comparer valeur créée, cash sécurisé et décisions utiles.', moduleKey: 'Impact Business', highlight: false },
  ];

  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5 mb-6">
      <div className="mb-4">
        <h3 className="font-black text-[#2f2415]">Liens financiers pertinents</h3>
        <p className="text-sm text-[#8a7456]">Accès direct aux modules qui expliquent ou corrigent les chiffres financiers.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {cards.map((card) => <LinkCard key={card.title} {...card} />)}
      </div>
    </div>
  );
}

export default function FinancesV6(props) {
  return (
    <div>
      <FinanceLinks {...props} />
      <FinancesV5 {...props} />
    </div>
  );
}
