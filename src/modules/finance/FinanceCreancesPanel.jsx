import { ArrowRight, Users } from 'lucide-react';
import ModuleListHub from '../../components/module/ModuleListHub.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format.js';
import { FinanceSection } from './financeUi.jsx';

export default function FinanceCreancesPanel({ data, onNavigate }) {
  const receivables = data.receivables || [];

  return (
    <div className="space-y-4">
      <FinanceSection
        title="Encaissement opérationnel"
        subtitle="Les relances et encaissements se traitent sur Commercial → Ventes · synthèse créances ici."
      >
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2f2415] px-4 py-2.5 text-sm font-black text-white"
          >
            Commercial → Ventes
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('commercial', { tab: 'Clients' })}
            className="inline-flex items-center gap-2 rounded-xl border border-[#eadcc2] bg-white px-4 py-2.5 text-sm font-black text-[#2f2415]"
          >
            <Users size={14} />
            Clients & relances
          </button>
        </div>
      </FinanceSection>

      <ModuleListHub
        title="Créances clients"
        intro="Ventes et encaissements restants à recouvrer — détail opérationnel sur Commercial."
        stats={[
          { label: 'Créances', value: fmtNumber(receivables.length), tone: receivables.length ? 'warn' : 'good' },
          { label: 'Montant', value: fmtCurrency(data.receivableAmount), tone: 'warn' },
          { label: 'Clients', value: fmtNumber(data.clients?.length || 0) },
          { label: 'Impayés finance', value: fmtNumber(data.unpaidTx?.length || 0), tone: data.unpaidTx?.length ? 'warn' : 'good' },
        ]}
        rows={receivables.map((row) => ({
          id: row.id || row.title,
          title: row.title,
          detail: row.detail,
          value: fmtCurrency(row.amount),
          onClick: () => onNavigate?.('commercial', { tab: 'Ventes' }),
        }))}
        emptyLabel="Aucune créance ouverte."
        onNavigate={onNavigate}
      />
    </div>
  );
}
