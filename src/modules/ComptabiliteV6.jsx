import { AlertTriangle, BarChart3, CheckCircle2, FileText, Receipt, ShieldCheck, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { fmtCurrency } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import ComptabiliteV5 from './ComptabiliteV5.jsx';
import ComptabiliteEvolution from './ComptabiliteEvolution.jsx';
import ProfitabilityStatement from './ProfitabilityStatement.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isIn = (row = {}) => ['entree', 'entrée'].includes(String(row.type || '').toLowerCase());
const isMissingDoc = (row = {}) => !row.document_id && !row.linked_document_id && !row.piece_jointe && !row.file_url;

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ControlCard({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</div>
    <p className="mt-2 text-xl font-black text-[#2f2415]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function ComptabiliteV6(props) {
  const transactions = arr(props.transactions || props.finances);
  const finance = useMemo(() => consolidateFinance({
    transactions,
    salesOrders: props.salesOrders || [],
    payments: props.payments || [],
    fournisseurs: props.fournisseurs || [],
    stocks: props.stocks || [],
  }), [transactions, props.salesOrders, props.payments, props.fournisseurs, props.stocks]);

  const accounting = useMemo(() => {
    const entries = transactions.length;
    const cashIn = transactions.filter(isIn).length;
    const cashOut = transactions.filter(isOut).length;
    const missingDocs = transactions.filter(isMissingDoc).length;
    const warnings = [...(finance.warnings || [])];
    if (missingDocs) warnings.push(`${missingDocs} mouvement(s) sans justificatif lié`);
    return { entries, cashIn, cashOut, missingDocs, warnings };
  }, [transactions, finance.warnings]);

  return (
    <div className="space-y-6 compta-mobile-structured">
      <style>{`@media (max-width: 640px){.compta-mobile-structured .rounded-2xl{border-radius:18px}.compta-mobile-structured table{font-size:12px}.compta-mobile-structured th,.compta-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.compta-mobile-structured .text-2xl{font-size:1.35rem}.compta-mobile-structured .grid{gap:.75rem}.compta-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <ModuleSection
        icon={ShieldCheck}
        title="Contrôle comptable"
        subtitle="Mouvements d’argent, justificatifs, restes à encaisser et points à vérifier."
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-bold">Contrôle rapide</p>
            <h3 className="text-xl font-black text-[#2f2415]">Argent, justificatifs et vérifications</h3>
            <p className="text-sm text-[#8a7456] mt-1">On vérifie les mouvements, les preuves et les anomalies avant de lire le résultat.</p>
          </div>
          {accounting.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {accounting.warnings.length} point(s) à traiter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Tout semble à jour</div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ControlCard icon={Receipt} label="Mouvements" value={accounting.entries} hint={`${accounting.cashIn} entrée(s), ${accounting.cashOut} sortie(s)`} />
          <ControlCard icon={FileText} label="Justificatifs manquants" value={accounting.missingDocs} hint="factures, reçus, photos ou preuves" danger={accounting.missingDocs > 0} />
          <ControlCard icon={ShieldCheck} label="Reste à encaisser" value={fmtCurrency(finance.creancesReelles)} hint="montant client à suivre" danger={finance.creancesReelles > 0} />
          <ControlCard icon={AlertTriangle} label="Points à vérifier" value={accounting.warnings.length} hint="doublons, montants, preuves" danger={accounting.warnings.length > 0} />
        </div>
        {accounting.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{accounting.warnings.slice(0, 4).map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
      </ModuleSection>

      <ModuleSection
        icon={TrendingUp}
        title="Résultat de la ferme"
        subtitle="Ventes, charges, investissements, prélèvements et cash restant."
      >
        <ProfitabilityStatement
          transactions={transactions}
          salesOrders={props.salesOrders || []}
          payments={props.payments || []}
          animaux={props.animaux || []}
          lots={props.lots || []}
          cultures={props.cultures || []}
          stocks={props.stocks || []}
        />
      </ModuleSection>

      <ModuleSection
        icon={Receipt}
        title="Mouvements comptables"
        subtitle="Détail des mouvements d’argent et des écritures à préparer ou valider."
      >
        <ComptabiliteV5 {...props} />
      </ModuleSection>

      <ModuleSection
        icon={BarChart3}
        title="Évolution comptable"
        subtitle="Historique des charges, revenus, paiements et résultat."
      >
        <ComptabiliteEvolution
          transactions={props.transactions || []}
          finances={props.finances || []}
          salesOrders={props.salesOrders || []}
          payments={props.payments || []}
          onNavigate={props.onNavigate}
        />
      </ModuleSection>
    </div>
  );
}
