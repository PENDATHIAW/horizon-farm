import { AlertTriangle, BarChart3, CheckCircle2, FileText, Receipt, Scale, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { fmtCurrency } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import ComptabiliteV5 from './ComptabiliteV5.jsx';
import ComptabiliteEvolution from './ComptabiliteEvolution.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => Number(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0) || 0;
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isIn = (row = {}) => ['entree', 'entrée'].includes(String(row.type || '').toLowerCase());
const isMissingDoc = (row = {}) => !row.document_id && !row.linked_document_id && !row.piece_jointe && !row.file_url && !row.justificatif_url;
const isUnpaid = (row = {}) => ['impaye', 'partiel'].includes(String(row.statut || row.status || '').toLowerCase());

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function ControlCard({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</div><p className="mt-2 text-xl font-black text-[#2f2415]">{value}</p>{hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}</div>;
}

function AccountingLine({ label, value, hint, danger = false }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 flex items-center justify-between gap-4"><div><p className="text-sm font-bold text-[#2f2415]">{label}</p>{hint ? <p className="text-xs text-[#8a7456] mt-1">{hint}</p> : null}</div><p className={`text-sm font-black ${danger ? 'text-amber-700' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

export default function ComptabiliteV6(props) {
  const transactions = arr(props.transactions || props.finances);
  const finance = useMemo(() => consolidateFinance({ transactions, salesOrders: props.salesOrders || [], payments: props.payments || [], fournisseurs: props.fournisseurs || [], stocks: props.stocks || [] }), [transactions, props.salesOrders, props.payments, props.fournisseurs, props.stocks]);

  const accounting = useMemo(() => {
    const entries = transactions.length;
    const cashIn = transactions.filter(isIn).length;
    const cashOut = transactions.filter(isOut).length;
    const missingDocs = transactions.filter(isMissingDoc).length;
    const revenus = transactions.filter(isIn).reduce((sum, row) => sum + amount(row), 0);
    const charges = transactions.filter(isOut).reduce((sum, row) => sum + amount(row), 0);
    const dettes = transactions.filter((row) => isOut(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
    const creancesTx = transactions.filter((row) => isIn(row) && isUnpaid(row)).reduce((sum, row) => sum + amount(row), 0);
    const creances = Math.max(finance.creancesReelles || 0, creancesTx);
    const resultComptable = revenus - charges;
    const warnings = [...(finance.warnings || [])];
    if (missingDocs) warnings.push(`${missingDocs} mouvement(s) sans justificatif lie`);
    if (dettes) warnings.push(`${fmtCurrency(dettes)} de dettes a regulariser`);
    if (creances) warnings.push(`${fmtCurrency(creances)} de creances a suivre`);
    return { entries, cashIn, cashOut, missingDocs, warnings, revenus, charges, dettes, creances, resultComptable };
  }, [transactions, finance.warnings, finance.creancesReelles]);

  return <div className="space-y-6 compta-mobile-structured">
    <style>{`@media (max-width: 640px){.compta-mobile-structured .rounded-2xl{border-radius:18px}.compta-mobile-structured table{font-size:12px}.compta-mobile-structured th,.compta-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.compta-mobile-structured .text-2xl{font-size:1.35rem}.compta-mobile-structured .grid{gap:.75rem}.compta-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

    <ModuleSection icon={ShieldCheck} title="Controle comptable" subtitle="Ecritures, justificatifs, rapprochements, dettes, creances et points a regulariser.">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-bold">Role du module Comptabilite</p><h3 className="text-xl font-black text-[#2f2415]">Securiser les preuves et l'historique comptable</h3><p className="text-sm text-[#8a7456] mt-1">Le pilotage cash reste dans Finances. Ici, on controle les pieces, les ecritures, les dettes, les creances et les rapprochements.</p></div>{accounting.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {accounting.warnings.length} point(s) a traiter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Tout semble a jour</div>}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"><ControlCard icon={Receipt} label="Mouvements" value={accounting.entries} hint={`${accounting.cashIn} entree(s), ${accounting.cashOut} sortie(s)`} /><ControlCard icon={FileText} label="Justificatifs manquants" value={accounting.missingDocs} hint="factures, recus, photos ou preuves" danger={accounting.missingDocs > 0} /><ControlCard icon={ShieldCheck} label="Creances a suivre" value={fmtCurrency(accounting.creances)} hint="clients / paiements partiels" danger={accounting.creances > 0} /><ControlCard icon={AlertTriangle} label="Dettes a regulariser" value={fmtCurrency(accounting.dettes)} hint="fournisseurs / charges impayees" danger={accounting.dettes > 0} /></div>
      {accounting.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{accounting.warnings.slice(0, 4).map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
    </ModuleSection>

    <ModuleSection icon={Scale} title="Lecture comptable simplifiee" subtitle="Vue comptable : revenus, charges, creances, dettes et resultat a rapprocher. Le resultat operationnel complet reste dans Finances.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3"><AccountingLine label="Revenus comptabilises" value={fmtCurrency(accounting.revenus)} hint="Entrees enregistrees comme recettes" /><AccountingLine label="Charges comptabilisees" value={fmtCurrency(accounting.charges)} hint="Sorties enregistrees comme depenses" danger={accounting.charges > accounting.revenus} /><AccountingLine label="Resultat comptable simplifie" value={fmtCurrency(accounting.resultComptable)} hint="Revenus - charges, avant controle final" danger={accounting.resultComptable < 0} /><AccountingLine label="Rapprochement a faire" value={`${accounting.missingDocs + accounting.warnings.length} point(s)`} hint="Justificatifs, dettes, creances ou alertes" danger={(accounting.missingDocs + accounting.warnings.length) > 0} /><AccountingLine label="Creances clients" value={fmtCurrency(accounting.creances)} hint="A rapprocher avec Ventes / Paiements" danger={accounting.creances > 0} /><AccountingLine label="Dettes fournisseurs" value={fmtCurrency(accounting.dettes)} hint="A rapprocher avec Fournisseurs / Charges" danger={accounting.dettes > 0} /></div>
    </ModuleSection>

    <ModuleSection icon={Receipt} title="Mouvements comptables" subtitle="Detail des mouvements d'argent et des ecritures a preparer ou valider."><ComptabiliteV5 {...props} /></ModuleSection>
    <ModuleSection icon={BarChart3} title="Evolution comptable" subtitle="Historique des charges, revenus, paiements et resultat."><ComptabiliteEvolution transactions={props.transactions || []} finances={props.finances || []} salesOrders={props.salesOrders || []} payments={props.payments || []} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
