import { AlertTriangle, CheckCircle2, FileText, Receipt, Scale, Wallet } from 'lucide-react';
import Btn from '../components/Btn';
import { transactionHasProof } from '../utils/accountingProof';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const isIn = (row = {}) => ['entree', 'entrée', 'income', 'in'].includes(String(row.type || '').toLowerCase());
const isOut = (row = {}) => ['sortie', 'expense', 'out', 'charge', 'depense', 'dépense'].includes(String(row.type || '').toLowerCase());
const isOpen = (row = {}) => ['impaye', 'impayé', 'partiel', 'open', 'pending'].includes(String(row.statut || row.status || '').toLowerCase());
const orderAmount = (row = {}) => amount(row);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);

function buildHealth({ transactions = [], salesOrders = [], payments = [], documents = [], clients = [], fournisseurs = [] }) {
  const txs = arr(transactions);
  const docs = arr(documents);
  const ca = arr(salesOrders).reduce((sum, row) => sum + orderAmount(row), 0);
  const cashPayments = arr(payments).reduce((sum, row) => sum + paymentAmount(row), 0);
  const cashInTx = txs.filter((row) => isIn(row) && !isOpen(row)).reduce((sum, row) => sum + amount(row), 0);
  const cashIn = Math.max(cashPayments, cashInTx);
  const charges = txs.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
  const dettesTx = txs.filter((row) => isOut(row) && isOpen(row)).reduce((sum, row) => sum + amount(row), 0);
  const dettesFournisseurs = arr(fournisseurs).reduce((sum, row) => sum + toNumber(row.dettes), 0);
  const creancesTx = txs.filter((row) => isIn(row) && isOpen(row)).reduce((sum, row) => sum + amount(row), 0);
  const creancesVentes = Math.max(0, ca - cashPayments);
  const missingProof = txs.filter((tx) => amount(tx) > 0 && !transactionHasProof(tx, docs));
  const warnings = [];
  if (missingProof.length) warnings.push(`${missingProof.length} ligne(s) finance sans preuve / facture`);
  if (cashIn > ca && ca > 0) warnings.push('Argent reçu supérieur aux ventes enregistrées : vérifier doublon paiement/ligne finance');
  if (charges > cashIn && cashIn > 0) warnings.push('Argent dépensé supérieur à l’argent reçu : surveiller trésorerie');
  if (dettesTx + dettesFournisseurs > 0) warnings.push('Reste à payer fournisseur ou dépense ouverte à régulariser');
  if (Math.max(creancesTx, creancesVentes) > 0) warnings.push('Reste à encaisser client à vérifier avec Ventes/Paiements');
  return {
    ca,
    cashIn,
    charges,
    result: cashIn - charges,
    dettes: Math.max(dettesTx, dettesFournisseurs),
    creances: Math.max(creancesTx, creancesVentes),
    missingProof,
    docsLinked: docs.filter((doc) => doc.entity_id || doc.transaction_id || doc.finance_id || doc.related_id).length,
    warnings,
    clientsCount: arr(clients).length,
    fournisseursCount: arr(fournisseurs).length,
  };
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415] break-words">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}

export default function FinanceAccountingHealth({ transactions = [], salesOrders = [], payments = [], documents = [], clients = [], fournisseurs = [], onNavigate }) {
  const health = buildHealth({ transactions, salesOrders, payments, documents, clients, fournisseurs });
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Scale size={15} /> Contrôle argent et preuves</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">Vérifier les doublons et les preuves</h3>
        <p className="text-sm text-[#8a7456] mt-1">Vue commune pour vérifier ventes, argent reçu, argent dépensé, reste à encaisser, reste à payer et preuves/factures.</p>
      </div>
      {health.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {health.warnings.length} point(s) à traiter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Cohérence correcte</div>}
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2 text-sm">
      <Mini icon={Receipt} label="Ventes enregistrées" value={fmtCurrency(health.ca)} />
      <Mini icon={Wallet} label="Argent reçu" value={fmtCurrency(health.cashIn)} danger={health.cashIn > health.ca && health.ca > 0} />
      <Mini icon={Wallet} label="Argent dépensé" value={fmtCurrency(health.charges)} danger={health.charges > health.cashIn && health.cashIn > 0} />
      <Mini icon={Scale} label="Disponible après dépenses" value={fmtCurrency(health.result)} danger={health.result < 0} />
      <Mini icon={AlertTriangle} label="Reste à encaisser" value={fmtCurrency(health.creances)} danger={health.creances > 0} />
      <Mini icon={AlertTriangle} label="Reste à payer" value={fmtCurrency(health.dettes)} danger={health.dettes > 0} />
      <Mini icon={FileText} label="Preuves manquantes" value={health.missingProof.length} danger={health.missingProof.length > 0} />
    </div>
    {health.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{health.warnings.slice(0, 6).map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
    {health.missingProof.length ? <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415]">Lignes sans preuve / facture</p><div className="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 text-sm">{health.missingProof.slice(0, 4).map((tx) => <div key={tx.id || tx.libelle} className="rounded-xl bg-white border border-[#eadcc2] px-3 py-2"><b className="text-[#2f2415]">{tx.libelle || tx.id}</b><p className="text-xs text-[#8a7456]">{fmtCurrency(amount(tx))} · {tx.type || 'mouvement'}</p></div>)}</div></div> : null}
    <div className="flex flex-wrap justify-end gap-2"><Btn small variant="outline" onClick={() => onNavigate?.('documents')}>Ouvrir documents</Btn><Btn small variant="outline" onClick={() => onNavigate?.('comptabilite')}>Ouvrir comptabilité</Btn><Btn small variant="outline" onClick={() => onNavigate?.('finances')}>Ouvrir finances</Btn></div>
  </section>;
}
