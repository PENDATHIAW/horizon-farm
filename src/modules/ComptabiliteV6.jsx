import { AlertTriangle, CheckCircle2, FileText, Receipt, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import { fmtCurrency } from '../utils/format';
import { consolidateFinance } from '../utils/financeConsolidationEngine';
import ComptabiliteV5 from './ComptabiliteV5.jsx';
import ComptabiliteEvolution from './ComptabiliteEvolution.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const isOut = (row = {}) => String(row.type || '').toLowerCase() === 'sortie';
const isIn = (row = {}) => String(row.type || '').toLowerCase() === 'entree';
const isMissingDoc = (row = {}) => !row.document_id && !row.linked_document_id && !row.piece_jointe && !row.file_url;

function ControlCard({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#8a7456]"><Icon size={14} /> {label}</div>
    <p className="mt-2 text-xl font-black text-[#2f2415]">{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function ComptabiliteV6(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
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
    if (missingDocs) warnings.push(`${missingDocs} écriture(s) sans pièce liée`);
    return { entries, cashIn, cashOut, missingDocs, warnings };
  }, [transactions, finance.warnings]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-bold">Contrôle comptable</p>
            <h3 className="text-xl font-black text-[#2f2415]">Écritures, pièces et rapprochements</h3>
            <p className="text-sm text-[#8a7456] mt-1">Contrôle rapide des mouvements, justificatifs et points à vérifier.</p>
          </div>
          {accounting.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {accounting.warnings.length} contrôle(s) à traiter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Contrôles à jour</div>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <ControlCard icon={Receipt} label="Écritures" value={accounting.entries} hint={`${accounting.cashIn} entrée(s), ${accounting.cashOut} sortie(s)`} />
          <ControlCard icon={FileText} label="Pièces manquantes" value={accounting.missingDocs} hint="factures, reçus, justificatifs" danger={accounting.missingDocs > 0} />
          <ControlCard icon={ShieldCheck} label="Créances suivies" value={fmtCurrency(finance.creancesReelles)} hint="reste client à contrôler" danger={finance.creancesReelles > 0} />
          <ControlCard icon={AlertTriangle} label="Points à vérifier" value={accounting.warnings.length} hint="doublons, orphelins, pièces" danger={accounting.warnings.length > 0} />
        </div>
        {accounting.warnings.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{accounting.warnings.slice(0, 4).map((warning) => <div key={warning} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>)}</div> : null}
      </section>
      <ComptabiliteV5 {...props} />
      <CollapsibleAdvancedSection
        title="Comptabilité : évolution et lecture historique"
        description="Les graphes restent disponibles ici, sans alourdir les écritures et les contrôles quotidiens."
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
      >
        <ComptabiliteEvolution
          transactions={props.transactions || []}
          finances={props.finances || []}
          salesOrders={props.salesOrders || []}
          payments={props.payments || []}
          onNavigate={props.onNavigate}
        />
      </CollapsibleAdvancedSection>
    </div>
  );
}
